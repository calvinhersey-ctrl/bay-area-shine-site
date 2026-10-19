/* Parser-time bootstrap: the config switches also gate Safari's native banner.
   Keep this synchronous in <head>, after config.js. enabled = show the app design;
   storeLive = the listing is public. No public listing, no banner and no store link. */
(function(){
  'use strict';
  const settings = window.BAS_CONFIG && window.BAS_CONFIG.appPromotion;
  if (!settings || settings.enabled !== true) return;
  if (settings.storeLive !== true){ window.BAS_APP = {live:false, screenshot:settings.screenshot}; return; }
  let store;
  try { store = new URL(settings.storeUrl); } catch { return; }
  const id = store.pathname.match(/\/id(\d{8,12})\/?$/);
  if (store.protocol !== 'https:' || store.hostname !== 'apps.apple.com' || !id) return;
  window.BAS_APP = {live:true, storeUrl:store.href, id:id[1], screenshot:settings.screenshot};
  // This is a validated numeric identifier, never visitor input. Write while the
  // head is being parsed; adding the tag after page load is too late for Safari.
  document.write('<meta name="apple-itunes-app" content="app-id=' + id[1] + '">');
})();
