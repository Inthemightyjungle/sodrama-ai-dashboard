// Fetches the 3D stage when the page asks for it: straight away on a first
// visit, and otherwise only when someone opens "How it works".
// Browsers too old for modules skip this file, and the page shows still
// pictures of the stage instead.
window.SD_LOAD_STAGE = function () {
  return import('./stage3d.js');
};
document.dispatchEvent(new Event('sd-stage-loader'));
