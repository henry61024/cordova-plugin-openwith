const AndroidIntentFilterMime = require('./utils/AndroidIntentFilterMime');
const PluginVariable = require('./utils/PluginVariable');
let androidIntentFilterMime;

function removeShareMime(ANDROID_MIME_TYPE) {
  if (ANDROID_MIME_TYPE === '*/*') {
    androidIntentFilterMime.remove('image/*');
    androidIntentFilterMime.remove('video/*');
    androidIntentFilterMime.remove('text/plain');
  } else {
    androidIntentFilterMime.remove(ANDROID_MIME_TYPE);
  }
}

module.exports = function(context) {
  const pluginVariable = new PluginVariable(context);
  androidIntentFilterMime = new AndroidIntentFilterMime(context);
  removeShareMime(pluginVariable.get('ANDROID_MIME_TYPE'));
};
