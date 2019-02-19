const { dirname } = require('path');

// const codeFrame = require('@babel/code-frame');
// const generator = require('@babel/generator');
// const parser = require('@babel/parser');
// const traverse = require('@babel/traverse');
const t = require('@babel/types');
const template = require('@babel/template');
const nodejsLibsBrowser = require('nodejs-libs-browser');

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
  var GLOBALNAME = GLOBALALIASNAME = require(GLOBALVALUE);
`;

const patchGlobalObject = template.default`
  var GLOBALNAME = require(GLOBALVALUE);
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
      if (v === 'buffer' || v === 'Buffer') {
        node.body.unshift(patchGlobalObjectAsAlias({
          GLOBALNAME: t.identifier('buffer'),
          GLOBALALIASNAME: t.identifier('Buffer'),
          GLOBALVALUE: t.stringLiteral(nodejsLibsBrowser[v]),
        }));

        return;
      }
      const value = nodejsLibsBrowser[v];
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

  // filter module that be specified in pkg
  if (!patchPackageJson(state.file.opts.filename, node.value)) return;

  // s1. const util = require('util')
  // require and require never be defined
  if (
    t.isCallExpression(parent)
    && parent.callee.name === 'require'
    && !parentPath.scope.hasBinding('require')
  ) {
    node.value = nodejsLibsBrowser[node.value];
    return;
  }
  // s2. import util from 'util'
  // import
  if (t.isImportDeclaration(parent)) {
    node.value = nodejsLibsBrowser[node.value];
  }
}

export default function ({ types: t }) {
  return {
    visitor: {
      Program: {
        // enter(path, state) {
        //   // todo custom opts - e.x. mock empty
        // },
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
