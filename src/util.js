const path = require('path');

const readPkgUp = require('read-pkg-up');

// todo enhance cache
// /a/b/c/d/x.js -> /a/package.json => /a /a/b /a/b/c /a/b/c/d should be cached
let packageCache = {};

function patchPackageJson(currentFile, name) {
  let isPatched = true;
  const cwd = path.dirname(currentFile);
  if (packageCache[cwd]) {
    return isPatched = !!!packageCache[cwd][name];
  }
  const { pkg } = readPkgUp.sync({ cwd });
  if (!pkg) {
    return isPatched;
  }
  if (pkg && pkg.dependencies) {
    packageCache[cwd] = pkg.dependencies;
    if (pkg.dependencies[name]) {
      isPatched = false;
    }
  }

  return isPatched;
}

export { patchPackageJson };
