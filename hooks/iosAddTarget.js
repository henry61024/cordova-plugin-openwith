//
//  iosAddTarget.js
//  This hook runs for the iOS platform when the plugin or platform is added.
//
// Source: https://github.com/DavidStrausz/cordova-plugin-today-widget
//

//
// The MIT License (MIT)
//
// Copyright (c) 2017 DavidStrausz
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

const PLUGIN_ID = 'cc.fovea.cordova.openwith';
const BUNDLE_SUFFIX = '.shareextension';

const fs = require('fs');
const path = require('path');
const PluginVariable = require('./utils/PluginVariable');
let pluginVariable;

function redError(message) {
  return new Error('"' + PLUGIN_ID + '" \x1b[1m\x1b[31m' + message + '\x1b[0m');
}

function replacePreferencesInFile(filePath, preferences) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (let i = 0; i < preferences.length; i++) {
    const pref = preferences[i];
    const regexp = new RegExp(pref.key, 'g');
    content = content.replace(regexp, pref.value);
  }
  fs.writeFileSync(filePath, content);
}

// Determine the full path to the app's xcode project file.
function findXCodeproject(context, callback) {
  fs.readdir(iosFolder(context), function(err, data) {
    let projectFolder;
    let projectName;
    // Find the project folder by looking for *.xcodeproj
    if (data && data.length) {
      data.forEach(function(folder) {
        if (folder.match(/\.xcodeproj$/)) {
          projectFolder = path.join(iosFolder(context), folder);
          projectName = path.basename(folder, '.xcodeproj');
        }
      });
    }

    if (!projectFolder || !projectName) {
      throw redError('Could not find an .xcodeproj folder in: ' + iosFolder(context));
    }

    if (err) {
      throw redError(err);
    }

    callback(projectFolder, projectName);
  });
}

// Determine the full path to the ios platform
function iosFolder(context) {
  return context.opts.cordova.project ?
    context.opts.cordova.project.root :
    path.join(context.opts.projectRoot, 'platforms/ios/');
}

function parsePbxProject(context, pbxProjectPath) {
  const xcode = require('xcode');
  console.log('    Parsing existing project at location: ' + pbxProjectPath + '...');
  let pbxProject;
  if (context.opts.cordova.project) {
    pbxProject = context.opts.cordova.project.parseProjectFile(context.opts.projectRoot).xcode;
  } else {
    pbxProject = xcode.project(pbxProjectPath);
    pbxProject.parseSync();
  }
  return pbxProject;
}

function forEachShareExtensionFile(context, callback) {
  const shareExtensionFolder = path.join(iosFolder(context), 'ShareExtension');
  fs.readdirSync(shareExtensionFolder).forEach(function(name) {
    // Ignore junk files like .DS_Store
    if (!/^\..*/.test(name)) {
      callback({
        name: name,
        path: path.join(shareExtensionFolder, name),
        extension: path.extname(name),
      });
    }
  });
}

function projectPlistPath(context, projectName) {
  return path.join(iosFolder(context), projectName, projectName + '-Info.plist');
}

function projectPlistJson(context, projectName) {
  const plist = require('plist');
  const path = projectPlistPath(context, projectName);
  return plist.parse(fs.readFileSync(path, 'utf8'));
}

function getPreferences(context, projectName) {
  const plist = projectPlistJson(context, projectName);
  let group = 'group.' + plist.CFBundleIdentifier + BUNDLE_SUFFIX;
  if (pluginVariable.get('GROUP_IDENTIFIER') !== '') {
    group = pluginVariable.get('IOS_GROUP_IDENTIFIER');
  }
  return [{
    key: '__DISPLAY_NAME__',
    value: projectName,
  }, {
    key: '__GROUP_IDENTIFIER__',
    value: group,
  }, {
    key: '__BUNDLE_SHORT_VERSION_STRING__',
    value: plist.CFBundleShortVersionString,
  }, {
    key: '__BUNDLE_VERSION__',
    value: plist.CFBundleVersion,
  }, {
    key: '__URL_SCHEME__',
    value: pluginVariable.get('IOS_URL_SCHEME'),
  }, {
    key: '__UNIFORM_TYPE_IDENTIFIER__',
    value: pluginVariable.get('IOS_UNIFORM_TYPE_IDENTIFIER'),
  }];
}

// Return the list of files in the share extension project, organized by type
function getShareExtensionFiles(context) {
  const files = { source: [], plist: [], resource: [] };
  const FILE_TYPES = { '.h': 'source', '.m': 'source', '.plist': 'plist' };
  forEachShareExtensionFile(context, function(file) {
    const fileType = FILE_TYPES[file.extension] || 'resource';
    files[fileType].push(file);
  });
  return files;
}

function printShareExtensionFiles(files) {
  console.log('    Found following files in your ShareExtension folder:');
  console.log('    Source files:');
  files.source.forEach(function(file) {
    console.log('     - ', file.name);
  });

  console.log('    Plist files:');
  files.plist.forEach(function(file) {
    console.log('     - ', file.name);
  });

  console.log('    Resource files:');
  files.resource.forEach(function(file) {
    console.log('     - ', file.name);
  });
}

function setShareUti(context, preferences) {
  const json = sharePlistJson(context);
  const uti = preferences.find(function(preference) {
    return preference.key === '__UNIFORM_TYPE_IDENTIFIER__';
  });

  if (uti.value === 'public.image') {
    json.NSExtension.NSExtensionAttributes.NSExtensionActivationRule.NSExtensionActivationSupportsImageWithMaxCount = 1;
  } else if (uti.value === 'public.video') {
    // json.NSExtension.NSExtensionAttributes.NSExtensionActivationRule.NSExtensionActivationSupportsMovieWithMaxCount = 1;
  } else if (uti.value === 'public.url') {
    // json.NSExtension.NSExtensionAttributes.NSExtensionActivationRule.NSExtensionActivationSupportsWebURLWithMaxCount = 1;
  } else if (uti.value === 'public.plain-text') {
    json.NSExtension.NSExtensionAttributes.NSExtensionActivationRule.NSExtensionActivationSupportsText = true;
  } else if (uti.value === 'public.item') {
    json.NSExtension.NSExtensionAttributes.NSExtensionActivationRule.NSExtensionActivationSupportsImageWithMaxCount = 1;
    // json.NSExtension.NSExtensionAttributes.NSExtensionActivationRule.NSExtensionActivationSupportsMovieWithMaxCount = 1;
    // json.NSExtension.NSExtensionAttributes.NSExtensionActivationRule.NSExtensionActivationSupportsWebURLWithMaxCount = 1;
    json.NSExtension.NSExtensionAttributes.NSExtensionActivationRule.NSExtensionActivationSupportsText = true;
  } else {
    console.error(`Unsupported IOS_UNIFORM_TYPE_IDENTIFIER, should be [public.image | public.video | public.url | pulic.item], but get ${uti.value} instead`);
  }

  setSharePlist(context, json);
}

function sharePlistJson(context) {
  const path = sharePlistPath(context);
  return plistJson(path);
}

function plistJson(path) {
  const plist = require('plist');
  return plist.parse(fs.readFileSync(path, 'utf8'));
}

function setSharePlist(context, json) {
  const plist = require('plist');
  const path = sharePlistPath(context);
  fs.writeFileSync(path, plist.build(json));
}

function sharePlistPath(context) {
  return path.join(iosFolder(context), 'ShareExtension', 'ShareExtension-Info.plist');
}

console.log('Adding target "' + PLUGIN_ID + '/ShareExtension" to XCode project');

module.exports = function(context) {
  const Q = require('q');
  const deferral = new Q.defer();
  pluginVariable = new PluginVariable(context);

  // if (context.opts.cordova.platforms.indexOf('ios') < 0) {
  //   log('You have to add the ios platform before adding this plugin!', 'error');
  // }

  findXCodeproject(context, function(projectFolder, projectName) {
    console.log('  - Folder containing your iOS project: ' + iosFolder(context));

    const pbxProjectPath = path.join(projectFolder, 'project.pbxproj');
    const pbxProject = parsePbxProject(context, pbxProjectPath);

    const files = getShareExtensionFiles(context);
    // printShareExtensionFiles(files);

    const preferences = getPreferences(context, projectName);
    files.plist.concat(files.source).forEach(function(file) {
      replacePreferencesInFile(file.path, preferences);
      // console.log('    Successfully updated ' + file.name);
    });

    // Find if the project already contains the target and group
    let target = pbxProject.pbxTargetByName('ShareExt');
    console.log('target', target);
    if (target) {
      console.log('    ShareExt target already exists.');
    }

    if (!target) {
      setShareUti(context, preferences);

      // Add PBXNativeTarget to the project
      target = pbxProject.addTarget('ShareExt', 'app_extension', 'ShareExtension');
      console.log('added target', target);
      // Add a new PBXSourcesBuildPhase for our ShareViewController
      // (we can't add it to the existing one because an extension is kind of an extra app)
      pbxProject.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', target.uuid);

      // Add a new PBXResourcesBuildPhase for the Resources used by the Share Extension
      // (MainInterface.storyboard)
      pbxProject.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
    }

    // Create a separate PBXGroup for the shareExtensions files, name has to be unique and path must be in quotation marks
    let pbxGroupKey = pbxProject.findPBXGroupKey({ name: 'ShareExtension' });
    if (pbxProject) {
      console.log('    ShareExtension group already exists.');
    }
    if (!pbxGroupKey) {
      pbxGroupKey = pbxProject.pbxCreateGroup('ShareExtension', 'ShareExtension');

      // Add the PbxGroup to cordovas "CustomTemplate"-group
      const customTemplateKey = pbxProject.findPBXGroupKey({ name: 'CustomTemplate' });
      pbxProject.addToPbxGroup(pbxGroupKey, customTemplateKey);
    }

    // Add files which are not part of any build phase (config)
    files.plist.forEach(function(file) {
      pbxProject.addFile(file.name, pbxGroupKey);
    });

    // Add source files to our PbxGroup and our newly created PBXSourcesBuildPhase
    files.source.forEach(function(file) {
      pbxProject.addSourceFile(file.name, { target: target.uuid }, pbxGroupKey);
    });

    //  Add the resource file and include it into the targest PbxResourcesBuildPhase and PbxGroup
    files.resource.forEach(function(file) {
      pbxProject.addResourceFile(file.name, { target: target.uuid }, pbxGroupKey);
    });

    // Add development team and provisioning profile
    const PROVISIONING_PROFILE = pluginVariable.get('SHAREEXT_PROVISIONING_PROFILE');
    const DEVELOPMENT_TEAM = pluginVariable.get('SHAREEXT_DEVELOPMENT_TEAM');
    const CODE_SIGN_IDENTITY = pluginVariable.get('IOS_CODE_SIGN_IDENTITY') || "iPhone Developer";
    console.log('Adding team', DEVELOPMENT_TEAM, 'and provisoning profile', PROVISIONING_PROFILE);
    if (PROVISIONING_PROFILE && DEVELOPMENT_TEAM) {
      const configurations = pbxProject.pbxXCBuildConfigurationSection();
      for (const key in configurations) {
        if (typeof configurations[key].buildSettings !== 'undefined') {
          const buildSettingsObj = configurations[key].buildSettings;
          if (typeof buildSettingsObj['PRODUCT_NAME'] !== 'undefined') {
            const productName = buildSettingsObj['PRODUCT_NAME'];
            if (productName.indexOf('ShareExt') >= 0) {
              buildSettingsObj['PRODUCT_BUNDLE_IDENTIFIER'] = `"$(PRODUCT_BUNDLE_IDENTIFIER)${BUNDLE_SUFFIX}"`;
              buildSettingsObj['PROVISIONING_PROFILE'] = `"${PROVISIONING_PROFILE}"`;
              buildSettingsObj['DEVELOPMENT_TEAM'] = DEVELOPMENT_TEAM;
              buildSettingsObj['CODE_SIGN_IDENTITY'] = `"${CODE_SIGN_IDENTITY}"`;
              buildSettingsObj['TARGETED_DEVICE_FAMILY'] = '"1,2"';
              console.log('Added signing identities for extension!');
            }
          }
        }
      }
    }

    // Add a new PBXFrameworksBuildPhase for the Frameworks used by the Share Extension
    // (NotificationCenter.framework, libCordova.a)
    // var frameworksBuildPhase = pbxProject.addBuildPhase(
    //   [],
    //   'PBXFrameworksBuildPhase',
    //   'Frameworks',
    //   target.uuid
    // );
    // if (frameworksBuildPhase) {
    //   log('Successfully added PBXFrameworksBuildPhase!', 'info');
    // }

    // Add the frameworks needed by our shareExtension, add them to the existing Frameworks PbxGroup and PBXFrameworksBuildPhase
    // var frameworkFile1 = pbxProject.addFramework(
    //   'NotificationCenter.framework',
    //   { target: target.uuid }
    // );
    // var frameworkFile2 = pbxProject.addFramework('libCordova.a', {
    //   target: target.uuid,
    // }); // seems to work because the first target is built before the second one
    // if (frameworkFile1 && frameworkFile2) {
    //   log('Successfully added frameworks needed by the share extension!', 'info');
    // }

    // Add build settings for Swift support, bridging header and xcconfig files
    // var configurations = pbxProject.pbxXCBuildConfigurationSection();
    // for (var key in configurations) {
    //   if (typeof configurations[key].buildSettings !== 'undefined') {
    //     var buildSettingsObj = configurations[key].buildSettings;
    //     if (typeof buildSettingsObj['PRODUCT_NAME'] !== 'undefined') {
    //       var productName = buildSettingsObj['PRODUCT_NAME'];
    //       if (productName.indexOf('ShareExtension') >= 0) {
    //         if (addXcconfig) {
    //           configurations[key].baseConfigurationReference =
    //             xcconfigReference + ' /* ' + xcconfigFileName + ' */';
    //           log('Added xcconfig file reference to build settings!', 'info');
    //         }
    //         if (addEntitlementsFile) {
    //           buildSettingsObj['CODE_SIGN_ENTITLEMENTS'] = '"' + 'ShareExtension' + '/' + entitlementsFileName + '"';
    //           log('Added entitlements file reference to build settings!', 'info');
    //         }
    //       }
    //     }
    //   }
    // }

    // Write the modified project back to disc
    // console.log('    Writing the modified project back to disk...');
    fs.writeFileSync(pbxProjectPath, pbxProject.writeSync());
    console.log('Added ShareExtension to XCode project');

    deferral.resolve();
  });

  return deferral.promise;
};
