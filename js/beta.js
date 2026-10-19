/* /beta/: the temporary sign-up for the app beta (owner decision, 2026-10-18: "a temp screen to apply for the beta").
   Sends through the same FormSubmit endpoint as the home page's form (config.js quoteEndpoint), subject "Beta request".
   The owners then email each person the TestFlight link. Without JavaScript the page offers email instead. */
(function(){
  'use strict';
  const C = window.BAS_CONFIG || {};
  const form = document.getElementById('betaForm');
  if (!form) return;
  const $ = id => document.getElementById(id);
  const email = C.email || 'bayareashinecleaners@gmail.com';
  const note = $('bNote'), send = $('bSend'), mail = $('bMail'), done = $('bDone');
  const SEND = 'Join the beta';
  let sending = false, sentSig = null;
  form.hidden = false; $('bNoJs').hidden = true;

  const iphone = () => (form.querySelector('[name="iphone"]:checked') || {}).value || '';
  const fields = () => ({request: 'Beta request', first_name: $('bName').value.trim(), email: $('bEmail').value.trim(), iphone: iphone(), zip: $('bZip').value.trim()});
  const sig = () => JSON.stringify(fields());
  const LABEL = {request: 'Request', first_name: 'Your first name', email: 'Email', iphone: 'Has an iPhone', zip: 'ZIP code'};
  const text = o => Object.keys(o).filter(k => o[k]).map(k => LABEL[k] + ': ' + o[k]).join('\n');
  function say(cls, msg){ note.className = 'form-note' + (cls ? ' ' + cls : ''); note.textContent = msg; }
  function invalid(el, msg){
    form.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
    el.setAttribute('aria-invalid', 'true'); say('err', msg); el.focus(); return false;
  }
  function ready(){
    const f = fields();
    if (!f.first_name) return invalid($('bName'), 'Add your first name.');
    if (!f.email) return invalid($('bEmail'), 'Add your email so we can send your invite.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return invalid($('bEmail'), "That email doesn't look right. Check it and try again.");
    if (!f.iphone) return invalid(form.querySelector('[name="iphone"]'), 'Tell us if you have an iPhone.');
    if (f.zip && !/^\d{5}$/.test(f.zip)) return invalid($('bZip'), 'A ZIP code is 5 digits. You can also leave it empty.');
    form.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
    return true;
  }
  function update(){
    mail.href = 'mailto:' + email + '?subject=' + encodeURIComponent('Beta request') + '&body=' + encodeURIComponent(text(fields()));
    $('bNoPhone').hidden = iphone() !== 'no';
    // after a good send, stay "Sent" until something changes, so a second tap can't send it twice
    if (sentSig !== null && sentSig !== sig()){ sentSig = null; send.disabled = false; send.textContent = SEND; done.hidden = true; say('', ''); }
  }
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (sending || sentSig === sig() || $('bHoney').value || !ready()) return;
    if (!C.quoteEndpoint){ say('err', 'Sending is switched off right now. Tap Email it instead.'); return; }
    const s = sig(), payload = Object.assign({_subject: 'Beta request', _template: 'table', _honey: ''}, fields());
    sending = true; send.disabled = true; send.textContent = 'Sending…'; say('', '');
    const ctrl = window.AbortController ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 12000);
    const failed = () => {
      clearTimeout(timer); sending = false; send.disabled = false; send.textContent = SEND;
      say('err', "That didn't go through. Tap Email it instead, or write to " + email + '.');
    };
    fetch(C.quoteEndpoint, {method: 'POST', headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}, body: JSON.stringify(payload), signal: ctrl ? ctrl.signal : undefined})
      .then(r => r.json())
      .then(r => {
        if (!r || !(r.success === true || r.success === 'true')) return failed();
        clearTimeout(timer); sending = false; sentSig = s;
        send.textContent = 'Sent'; done.hidden = false; done.focus();
      })
      .catch(failed);
  });
})();
