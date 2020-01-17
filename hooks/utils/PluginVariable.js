const ProjectPath = require('./ProjectPath');
const fs = require('fs');

class PluginVariable {
  constructor(context) {
    const projectPath = new ProjectPath(context);
    this.configXmlPath = projectPath.configXml;
    this.packageJsonPath = projectPath.packageJson;
  }

  get(variableName) {
    return getProcessVariable(variableName) ||
      getConfigXmlValue(this.configXmlPath, variableName) ||
      getPackageJsonVariable(this.packageJsonPath, variableName);
  }
}

function getProcessVariable(variableName) {
  const arg = process.argv.filter(function(arg) {
    return arg.indexOf(variableName + '=') === 0;
  });
  if (arg.length >= 1) {
    return arg[0].split('=')[1];
  } else {
    return null;
  }
}

function getConfigXmlValue(path, name) {
  const configXml = readConfigXml(path);
  const value = configXml.match(new RegExp('name="' + name + '" value="(.*?)"', 'i'));
  if (value && value[1]) {
    return value[1];
  } else {
    return null;
  }
}

function getPackageJsonVariable(path, variableName) {
  const packageJson = readPackageJson(path);
  return packageJson.cordova.plugins['cc.fovea.cordova.openwith'][variableName] || null;
}

function readConfigXml(path) {
  return fs.readFileSync(path, 'utf-8');
}

function readPackageJson(path) {
  return require(path);
}

module.exports = PluginVariable;
