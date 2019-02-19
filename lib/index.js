"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

function _templateObject3() {
  var data = _taggedTemplateLiteral(["\n  var VARIABLENAME = VARIABLEVALUE;\n"]);

  _templateObject3 = function _templateObject3() {
    return data;
  };

  return data;
}

function _templateObject2() {
  var data = _taggedTemplateLiteral(["\n  var GLOBALNAME = require(GLOBALVALUE);\n"]);

  _templateObject2 = function _templateObject2() {
    return data;
  };

  return data;
}

function _templateObject() {
  var data = _taggedTemplateLiteral(["\n  var GLOBALNAME = GLOBALALIASNAME = require(GLOBALVALUE);\n"]);

  _templateObject = function _templateObject() {
    return data;
  };

  return data;
}

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var _require = require('path'),
    dirname = _require.dirname;

var codeFrame = require('@babel/code-frame');

var generator = require('@babel/generator');

var parser = require('@babel/parser');

var traverse = require('@babel/traverse');

var t = require('@babel/types');

var template = require('@babel/template');

var nodejsLibsBrowser = require("nodejs-libs-browser");

var _require2 = require('./util'),
    patchPackageJson = _require2.patchPackageJson;

var nodeModuleNameList = ['assert', 'buffer', 'child_process', 'cluster', 'console', 'constants', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'https', 'module', 'net', 'os', 'path', 'punycode', 'process', 'querystring', 'readline', 'repl', 'stream', '_stream_duplex', '_stream_passthrough', '_stream_readable', '_stream_transform', '_stream_writable', 'string_decoder', 'sys', 'timers', 'tls', 'tty', 'url', 'util', 'vm', 'zlib']; // todo support global console

var nodeGlobalObjectList = ['process', 'Buffer', 'buffer'];
var nodeGlobalVariableList = ['__dirname', '__filename'];
var patchGlobalObjectAsAlias = template.default(_templateObject());
var patchGlobalObject = template.default(_templateObject2());
var patchGlobalVariable = template.default(_templateObject3());

function shimGlobal(path, state) {
  var node = path.node;
  var globals = path.scope.globals;

  if (!Object.keys(globals).length) {
    return;
  }

  var objList = shimGlobalObject(globals);
  var varList = shimGlobalVariable(globals);

  if (objList.length > 0) {
    objList.forEach(function (v) {
      if (v === 'buffer' || v === 'Buffer') {
        node.body.unshift(patchGlobalObjectAsAlias({
          GLOBALNAME: t.identifier('buffer'),
          GLOBALALIASNAME: t.identifier('Buffer'),
          GLOBALVALUE: t.stringLiteral(nodejsLibsBrowser[v])
        }));
        return;
      }

      var value = nodejsLibsBrowser[v];
      node.body.unshift(patchGlobalObject({
        GLOBALNAME: t.identifier(v),
        GLOBALVALUE: t.stringLiteral(value)
      }));
    });
  }

  if (varList.length > 0) {
    varList.forEach(function (v) {
      var value;

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
        VARIABLEVALUE: t.stringLiteral(value)
      }));
    });
  }
}

function shimGlobalObject(globals) {
  return Object.keys(globals).filter(function (i) {
    return nodeGlobalObjectList.indexOf(i) > -1;
  });
}

function shimGlobalVariable(globals) {
  return Object.keys(globals).filter(function (i) {
    return nodeGlobalVariableList.indexOf(i) > -1;
  });
}

function shimModule(t, path, state) {
  var node = path.node,
      parent = path.parent,
      parentPath = path.parentPath; // filter nodejs buildin module

  if (nodeModuleNameList.indexOf(node.value) < 0) return; // filter module that be specified in pkg

  if (!patchPackageJson(state.file.opts.filename, node.value)) return; // s1. const util = require('util')
  // require and require never be defined

  if (t.isCallExpression(parent) && parent.callee.name === 'require' && !parentPath.scope.hasBinding('require')) {
    node.value = nodejsLibsBrowser[node.value];
    return;
  } // s2. import util from 'util'
  // import


  if (t.isImportDeclaration(parent)) {
    node.value = nodejsLibsBrowser[node.value];
  }
}

function _default(_ref) {
  var t = _ref.types;
  return {
    visitor: {
      Program: {
        enter: function enter(path, state) {// todo custom opts - e.x. mock empty
        },
        exit: function exit(path, state) {
          shimGlobal(path, state);
        }
      },
      StringLiteral: function StringLiteral(path, state) {
        shimModule(t, path, state);
      }
    }
  };
}