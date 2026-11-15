// Loads the 3D stage only where it can run. Browsers too old for modules skip
// this file, and the page shows still pictures of the stage instead.
if (document.documentElement.classList.contains('stage-pending')) {
  import('./stage3d.js')
    .then((api) => { window.SD_STAGE = api; })
    .catch((err) => {
      window.SD_STAGE = null;
      if (window.console) console.warn('The 3D stage could not load.', err);
    })
    .then(() => document.dispatchEvent(new Event('sd-stage')));
} else {
  window.SD_STAGE = null;
}
