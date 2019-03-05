[![NPM version](https://img.shields.io/npm/v/babel-plugin-nodejs-module-shim.svg?style=flat)](https://npmjs.org/package/babel-plugin-nodejs-module-shim) [![Build Status](https://travis-ci.org/offgravity/babel-plugin-nodejs-module-shim.svg?branch=master)](https://travis-ci.org/offgravity/babel-plugin-nodejs-module-shim)
 [![Coverage Status](https://coveralls.io/repos/github/offgravity/babel-plugin-nodejs-module-shim/badge.svg?branch=master)](https://coveralls.io/github/offgravity/babel-plugin-nodejs-module-shim?branch=master)
# babel-plugin-nodejs-module-shim

A babel plugin to shim Node.js build-in modules and global objects.


## Example

```javascript
function processs(__filename){
  const process = {
    a:1
  }
  return process.a;
}

if (process.env.NODE_ENV === 'TEST') {

}

      ↓ ↓ ↓ ↓ ↓ ↓
      
var process = require("<CWD>/process/browser.js");

function processs(__filename) {
  const process = {
    a: 1
  };
  return process.a;
}

if (process.env.NODE_ENV === 'TEST') {}
```

## Notice

Polyfills for Node.js core libraries from [node-libs-browser](https://github.com/offgravity/nodejs-libs-browser#nodejs-libs-browser) are used if available.

By default, this plugin will polyfill each library if there is a known polyfill.

The following modules `child_process`、`cluster`、`dgram`、`dns`、`fs`、`module`、`net`、`readline`、`repl`、`tls` are not supported polyfill.

But you could use `empty` option as below mentioned to provide an empty object.

## Install

```sh
npm install --save babel-plugin-nodejs-module-shim
```

## Usage

Via `.babelrc` or babel-loader.

```js
{
  "plugins": [["nodejs-module-shim"]]
}
```


## Options

| Option             | Defaults | Description                                                                                                                                                                                                                              |
| ------------------ | :------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| prefix |  ''   | prefix + shimModulePath. See example below. |                                                                                                                     |
| empty |  []   | provide an empty object for the module that is not supported by polyfill. See example below. |                                                                                                                     |
## More examples

`["nodejs-module-shim", { prefix: 'PREFIX' }]`

```javascript
process;

      ↓ ↓ ↓ ↓ ↓ ↓
    
var process = require("PREFIX<CWD>/process/browser.js");

process;

```

  `["nodejs-module-shim", { emprty: ['fs'] }]`

  ```javascript
var fs = require('fs');

      ↓ ↓ ↓ ↓ ↓ ↓
    
var fs = {};

```
