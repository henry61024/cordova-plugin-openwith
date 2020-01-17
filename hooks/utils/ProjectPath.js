const path = require('path');

class ProjectPath {
  constructor(context) {
    this.root = getRootPath(context);
    this.packageJson = getPackageJsonPath(context);
    this.configXml = getConfigXmlPath(context);
    this.iosRoot = getIosRootPath(context);
    this.androidRoot = getAndroidRootPath(context);
    this.androidManifest = getAndroidManifestPath(context);
  }
}

function getRootPath(context) {
  return context.opts.projectRoot;
}

function getPackageJsonPath(context) {
  return path.join(getRootPath(context), 'package.json');
}

function getConfigXmlPath(context) {
  return path.join(getRootPath(context), 'config.xml');
}

function getIosRootPath(context) {
  return path.join(getRootPath(context), 'platforms/ios');
}

function getAndroidRootPath(context) {
  return path.join(getRootPath(context), 'platforms/android');
}

function getAndroidManifestPath(context) {
  return path.join(getAndroidRootPath(context), 'app/src/main/AndroidManifest.xml');
}

module.exports = ProjectPath;
