/* Parser-time bootstrap: the one config switch also gates Safari's native banner.
   Keep this synchronous in <head>, after config.js. No public app, no banner. */
(function(){
  'use strict';
  const settings = window.BAS_CONFIG && window.BAS_CONFIG.appPromotion;
  if (!settings || settings.enabled !== true) return;
  let store;
  try { store = new URL(settings.storeUrl); } catch { return; }
  const id = store.pathname.match(/\/id(\d{8,12})\/?$/);
  if (store.protocol !== 'https:' || store.hostname !== 'apps.apple.com' || !id) return;
  window.BAS_APP = {storeUrl:store.href, id:id[1], screenshot:settings.screenshot};
  // This is a validated numeric identifier, never visitor input. Write while the
  // head is being parsed; adding the tag after page load is too late for Safari.
  document.write('<meta name="apple-itunes-app" content="app-id=' + id[1] + '">');
})();
