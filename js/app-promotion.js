/* The app-first layout is built ahead of launch. All changes fail closed when
   the bootstrap/config is missing or off; normal web booking remains usable. */
(function(){
  'use strict';
  const root = new URL('../', document.currentScript.src);
  const landing = new URL('app/', root).href;
  const $ = selector => document.querySelector(selector);
  const appPage = $('[data-app-page]');
  // This page's web fallback follows the booking config even while app
  // promotion is off. Static HTML still works if either script is blocked.
  if (appPage && window.BAS_CONFIG){
    const web = appPage.querySelector('[data-book]'), url = window.BAS_CONFIG.bookingUrl;
    if (url) web.href = url;
    else { web.href = new URL('#build', root).href; web.removeAttribute('target'); }
  }
  const app = window.BAS_APP;
  if (!app) return;
  const makeLink = (text, href, className) => {
    const a = document.createElement('a'); a.textContent = text; a.href = href;
    if (className) a.className = className;
    return a;
  };
  const trademark = 'Apple and the Apple logo are trademarks of Apple Inc. App Store is a service mark of Apple Inc., registered in the U.S. and other countries.';
  function badge(){
    const a = makeLink('', app.storeUrl, 'store-badge');
    const img = document.createElement('img');
    img.src = new URL('img/badges/app-store.svg', root).href;
    img.width = 120; img.height = 40; img.alt = 'Download on the App Store';
    a.appendChild(img); return a;
  }
  function qr(){
    const div = document.createElement('div'); div.className = 'app-qr';
    const img = document.createElement('img'); img.src = new URL('img/app-qr.svg', root).href;
    img.width = 140; img.height = 140; img.alt = 'QR code for the Bay Area Shine app page';
    const copy = document.createElement('div'), p = document.createElement('p');
    p.textContent = 'Scan the code with your camera to get the app.';
    copy.append(p, makeLink('bayareashinecleaners.com/app', landing, 'app-address'));
    div.append(img, copy); return div;
  }
  function screenshot(){
    const figure = document.createElement('figure'); figure.className = 'app-screen';
    const capture = app.screenshot;
    let url;
    try { if (capture && capture.src) url = new URL(capture.src, root); } catch { /* keep the reserved slot */ }
    if (url && url.origin === root.origin && url.pathname.startsWith(root.pathname + 'img/')
        && Number.isInteger(capture.width) && capture.width > 0 && Number.isInteger(capture.height) && capture.height > 0 && capture.alt){
      const img = document.createElement('img'); img.src = url.href;
      img.width = capture.width; img.height = capture.height; img.alt = capture.alt; img.decoding = 'async';
      img.className = 'app-capture';
      const preview = makeLink('', url.href, 'app-preview-open');
      preview.target = '_blank'; preview.rel = 'noopener';
      preview.setAttribute('aria-label', 'View full-size app screen (opens in a new tab)');
      const device = document.createElement('div'); device.className = 'app-iphone';
      const display = document.createElement('div'); display.className = 'app-iphone-display';
      const status = document.createElement('div'); status.className = 'app-iphone-status'; status.setAttribute('aria-hidden', 'true');
      status.innerHTML = '<span>9:41</span><svg viewBox="0 0 68 16" width="68" height="16" fill="currentColor"><path d="M0 11h3v5H0zm5-3h3v8H5zm5-4h3v12h-3zm5-4h3v16h-3z"/><path d="M23 5a14 14 0 0 1 20 0l-2 2a11 11 0 0 0-16 0zm4 4a8 8 0 0 1 12 0l-2 2a5 5 0 0 0-8 0zm4 4a3 3 0 0 1 4 0l-2 3z"/><rect x="48" y="2" width="17" height="12" rx="3" fill="none" stroke="currentColor"/><rect x="50" y="4" width="13" height="8" rx="1"/><rect x="66" y="6" width="2" height="4" rx="1"/></svg>';
      const home = document.createElement('span'); home.className = 'app-iphone-home'; home.setAttribute('aria-hidden', 'true');
      display.append(img, status, home);
      const frame = document.createElement('img'); frame.className = 'app-iphone-frame';
      frame.src = new URL('img/iphone-portrait.png', root).href;
      frame.width = 1350; frame.height = 2760; frame.alt = ''; frame.setAttribute('aria-hidden', 'true'); frame.decoding = 'async';
      device.append(display, frame);
      const caption = document.createElement('span'); caption.className = 'app-preview-label';
      caption.textContent = 'View full-size app screen ↗'; caption.setAttribute('aria-hidden', 'true');
      preview.append(device, caption); figure.append(preview);
    } else {
      // Deliberate internal-preview slot. The owner must approve a real capture
      // before switching promotion on for a public website release.
      figure.classList.add('app-screen-slot');
      const title = document.createElement('b'), note = document.createElement('p');
      title.textContent = 'App screenshot slot'; note.textContent = 'Approved app capture required before launch.';
      figure.append(title, note);
    }
    return figure;
  }
  function legal(){
    const p = document.createElement('p'); p.className = 'app-legal'; p.textContent = trademark; return p;
  }
  if (appPage){
    const title = $('#appTitle'), intro = $('#appIntro');
    title.textContent = 'Get the Bay Area Shine app';
    intro.textContent = 'Download from the App Store®, or book on the web.';
    $('#appDownload').append(badge(), qr());
    appPage.appendChild(legal());
    document.title = 'Bay Area Shine Cleaners · Get the app';
    $('[rel="canonical"]').href = new URL('app/', 'https://www.bayareashinecleaners.com/').href;
    document.documentElement.classList.add('app-promotion');
    // App Store only. Android and computers keep the web-booking option. iPads
    // that identify as Macs are recognised by their touch support.
    const appleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent)
      || (/Mac/.test(navigator.platform) && navigator.maxTouchPoints > 1);
    if (appleMobile) location.replace(app.storeUrl);
    return;
  }
  const hero = $('.hero'), left = $('.hero-left');
  if (!hero || !left) return;
  // Check these existing app features against the public build before release.
  left.querySelector('p').textContent = 'Book your clean, see who’s coming and follow your visit in the Bay Area Shine app.';
  const actions = document.createElement('div'); actions.className = 'app-actions';
  actions.append(badge(), makeLink('Or book on the web ↓', '#web-booking', 'app-web-link'));
  left.append(actions, qr());
  $('.note').hidden = true;
  $('.hero-grid').appendChild(screenshot());
  const booking = $('.hero .book'); booking.id = 'web-booking';
  const label = document.createElement('p'); label.className = 'app-web-label'; label.textContent = 'Or book on the web';
  booking.prepend(label);

  // Retain the existing node so its request-form fallback and focus return keep working.
  const webBook = $('.nav [data-book]');
  webBook.className = 'app-web-nav'; webBook.removeAttribute('data-book'); webBook.textContent = 'Book online';
  webBook.after(makeLink('Get the app', landing, 'btn btn-ink app-get'));

  const close = $('.close .acts'), closeBook = $('.close [data-book]');
  closeBook.textContent = 'Book on the web'; closeBook.className = 'btn btn-ghost';
  close.prepend(makeLink('Get the app', landing, 'btn btn-ink app-get'));
  const firstAnswer = $('.faq details p');
  firstAnswer.replaceChildren('Get the Bay Area Shine app from the App Store® and choose your clean and time, or ',
    makeLink('book on the web', '#web-booking', 'app-web-link'), '.');
  const optional = document.createElement('details'), summary = document.createElement('summary'), text = document.createElement('span'), answer = document.createElement('p');
  text.className = 't'; text.textContent = 'Do I need the app?'; summary.appendChild(text);
  answer.textContent = 'No. You can book on the web or email us for help.';
  optional.append(summary, answer); $('.faq').appendChild(optional);
  const steps = document.querySelectorAll('.howrow .step p');
  const stepCopy = [
    ['Choose your clean and time', 'Use the app, or pick an open window on the web.'],
    ['Hold it with a deposit', 'Your deposit comes off the cleaning total.'],
    ['Check your booking details', 'See your booking in the app, or use your web booking confirmation.']
  ];
  steps.forEach((p, i) => { const b = document.createElement('b'); b.textContent = stepCopy[i][0]; p.replaceChildren(b, stepCopy[i][1]); });
  const footer = $('footer');
  footer.append(makeLink('Get the app', landing, 'mail app-footer-link'), legal());
  document.documentElement.classList.add('app-promotion');
})();
