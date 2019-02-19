var process = require("<CWD>/process/browser.js");

function processs(__filename) {
  const process = {
    a: 1
  };
  return process.a;
}

if (process.env.NODE_ENV === 'TEST') {}