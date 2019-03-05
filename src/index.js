const { dirname } = require('path');

// const codeFrame = require('@babel/code-frame');
// const generator = require('@babel/generator');
// const parser = require('@babel/parser');
// const traverse = require('@babel/traverse');
const t = require('@babel/types');
const template = require('@babel/template');
const getNodejsLibsBrowser = require('nodejs-libs-browser');
const slash = require('slash');

let nodejsLibsBrowser = null;

const { patchPackageJson } = require('./util');

const nodeModuleNameList = [
  'assert', 'buffer', 'child_process', 'cluster', 'console', 'constants', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs',
  'http', 'https', 'module', 'net', 'os', 'path', 'punycode', 'process', 'querystring', 'readline', 'repl', 'stream', '_stream_duplex',
  '_stream_passthrough', '_stream_readable', '_stream_transform', '_stream_writable', 'string_decoder', 'sys', 'timers', 'tls', 'tty',
  'url', 'util', 'vm', 'zlib',
];

// todo support global console
const nodeGlobalObjectList = [
  'process', 'Buffer', 'buffer',
];

const nodeGlobalVariableList = [
  '__dirname', '__filename',
];

const patchGlobalObjectAsAlias = template.default`
  var GLOBALALIASNAME = GLOBALNAME;
`;

const patchGlobalObject = template.default`
  var GLOBALNAME = require(GLOBALVALUE);
`;

const patchGlobalObjectMember = template.default`
  var GLOBALNAME = require(GLOBALVALUE)['MEMBERNAME'];
`;

const patchGlobalVariable = template.default`
  var VARIABLENAME = VARIABLEVALUE;
`;

function shimGlobalObject(globals) {
  return Object.keys(globals).filter(i => nodeGlobalObjectList.indexOf(i) > -1);
}

function shimGlobalVariable(globals) {
  return Object.keys(globals).filter(i => nodeGlobalVariableList.indexOf(i) > -1);
}

function shimGlobal(path, state) {
  const { node } = path;
  const { globals } = path.scope;
  if (!Object.keys(globals).length) {
    return;
  }
  const objList = shimGlobalObject(globals);
  const varList = shimGlobalVariable(globals);
  if (objList.length > 0) {
    objList.forEach((v) => {
      const value = slash(nodejsLibsBrowser[v]);
      if (v === 'buffer' || v === 'Buffer') {
        node.body.unshift(patchGlobalObjectAsAlias({
          GLOBALNAME: t.identifier('buffer'),
          GLOBALALIASNAME: t.identifier('Buffer'),
        }));
        node.body.unshift(patchGlobalObjectMember({
          GLOBALNAME: t.identifier('buffer'),
          GLOBALVALUE: t.stringLiteral(value),
          MEMBERNAME: t.stringLiteral('Buffer'),
        }));

        return;
      }

      node.body.unshift(patchGlobalObject({
        GLOBALNAME: t.identifier(v),
        GLOBALVALUE: t.stringLiteral(value),
      }));
    });
  }
  if (varList.length > 0) {
    varList.forEach((v) => {
      let value;
      switch (v) {
        case '__dirname':
          value = dirname(state.file.opts.filename);
          break;
        case '__filename':
          value = state.file.opts.filename;
          break;
        default:
          value = '';
          break;
      }
      node.body.unshift(patchGlobalVariable({
        VARIABLENAME: t.identifier(v),
        VARIABLEVALUE: t.stringLiteral(value),
      }));
    });
  }
}

function shimModule(t, path, state) {
  const { node, parent, parentPath } = path;
  // filter nodejs buildin module
  if (nodeModuleNameList.indexOf(node.value) < 0) return;

  // filter no shim buildin module
  if (nodejsLibsBrowser[node.value] === null) {
    if (
      (
        t.isCallExpression(parent)
        && parent.callee.name === 'require'
        && !parentPath.scope.hasBinding('require')
      ) || t.isImportDeclaration(parent)
    ) {
      throw new Error(`${node.value} is not support in browser.`);
    }
    return;
  }

  // filter module that be specified in pkg
  if (!patchPackageJson(state.file.opts.filename, node.value)) return;

  // s1. const util = require('util')
  // require and require never be defined
  if (
    t.isCallExpression(parent)
    && parent.callee.name === 'require'
    && !parentPath.scope.hasBinding('require')
  ) {
    node.value = slash(nodejsLibsBrowser[node.value]);
    return;
  }
  // s2. import util from 'util'
  // import
  if (t.isImportDeclaration(parent)) {
    node.value = slash(nodejsLibsBrowser[node.value]);
  }
}

export default function ({ types: t }, options) {
  let shimOpts = {
    prefix: '',
  };
  if (typeof options === 'object' && typeof options.prefix === 'string') {
    shimOpts = Object.assign(shimOpts, { prefix: options.prefix });
  }

  nodejsLibsBrowser = getNodejsLibsBrowser(shimOpts.prefix);

  return {
    visitor: {
      Program: {
        exit(path, state) {
          shimGlobal(path, state);
        },
      },
      StringLiteral(path, state) {
        shimModule(t, path, state);
      },
    },
  };
}
