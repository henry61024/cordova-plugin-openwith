const AndroidIntentFilterMime = require('./utils/AndroidIntentFilterMime');
const PluginVariable = require('./utils/PluginVariable');
let androidIntentFilterMime;

function addShareMime(ANDROID_MIME_TYPE) {
  if (ANDROID_MIME_TYPE.startsWith('image/') || ANDROID_MIME_TYPE.startsWith('video/') || ANDROID_MIME_TYPE.startsWith('text/plain')) {
    androidIntentFilterMime.add(ANDROID_MIME_TYPE);
  } else if (ANDROID_MIME_TYPE === '*/*') {
    androidIntentFilterMime.add('image/*');
    androidIntentFilterMime.add('video/*');
    androidIntentFilterMime.add('text/plain');
  } else {
    console.error(`Unsupported ANDROID_MIME_TYPE, should be [image/* | video/* | text/plain | */*], but get ${ANDROID_MIME_TYPE} instead`);
  }
}

module.exports = function(context) {
  const pluginVariable = new PluginVariable(context);
  androidIntentFilterMime = new AndroidIntentFilterMime(context);
  addShareMime(pluginVariable.get('ANDROID_MIME_TYPE'));
};
