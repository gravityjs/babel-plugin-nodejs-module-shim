const path = require('path');

const pluginPath = path.resolve(process.cwd(), 'lib/index.js');

module.exports = {
  plugins: [
    [path.relative(__dirname, pluginPath), { empty: ['fs'] }],
  ],
};
