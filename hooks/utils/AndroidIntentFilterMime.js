const fs = require('fs');
const cheerio = require('cheerio');
const formatXml = require('xml-beautifier');
const ProjectPath = require('./ProjectPath');

class AndroidIntentFilterMime {
  constructor(context) {
    const projectPath = new ProjectPath(context);
    this.manifestPath = projectPath.androidManifest;
    fs.readFileSync(this.manifestPath).toString();
  }

  add(mime) {
    const xmlString = readAndroidManifest(this.manifestPath);
    const $ = load$(xmlString);
    $('activity').first().append(`
      <intent-filter>
          <data android:mimeType="${mime}" />
          <action android:name="android.intent.action.SEND" />
          <category android:name="android.intent.category.DEFAULT" />
      </intent-filter>
    `);
    writeAndroidManifest(this.manifestPath, $.xml());
  }

  remove(mime) {
    const xmlString = readAndroidManifest(this.manifestPath);
    const $ = load$(xmlString);
    $('intent-filter').has(`data[android\\:mimeType='${mime}']`).remove();
    writeAndroidManifest(this.manifestPath, $.xml());
  }
}

function readAndroidManifest(path) {
  return fs.readFileSync(path).toString();
}

function writeAndroidManifest(path, xmlString) {
  fs.writeFileSync(path, formatXml(xmlString));
}

function load$(xmlString) {
  return cheerio.load(xmlString, {
    xmlMode: true,
  });
}

module.exports = AndroidIntentFilterMime;
