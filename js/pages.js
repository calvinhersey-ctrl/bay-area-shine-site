/* Bay Area Shine: service pages (/regular-house-cleaning/, /deep-cleaning/, /move-out-cleaning/).
   The HTML already holds today's prices and policies; this refreshes them from config.js (the same
   source as the home page), so a price change there reaches these pages too. No config = HTML as is. */
(function(){
  'use strict';
  const C = window.BAS_CONFIG;
  if (!C) return;
  const money = n => '$' + n;
  const pct = off => Math.round(off * 100) + '%';
  const freqs = C.frequencies || [];
  const discounts = freqs.filter(f => f.off > 0).map((f, i) => (i ? f.label.toLowerCase() : f.label + ' visits save') + ' ' + pct(f.off));
  const P = C.policies || {};
  const text = {
    deposit: C.depositAmount != null ? money(C.depositAmount) : null,
    windows: (C.windows || []).length ? C.windows.map(w => w.label).join(', ').replace(/, ([^,]*)$/, ' or $1') : null,
    discounts: discounts.length > 2 ? discounts.slice(0, -1).join(', ') + ', and ' + discounts[discounts.length - 1] : discounts.join(' and ') || null
  };
  Object.keys(C.services || {}).forEach(id => { text['from.' + id] = money(C.services[id].from); });
  Object.keys(C.extras || {}).forEach(k => {
    const e = C.extras[k];
    text['extra.' + k] = (e.from ? 'from ' : '') + money(e.price) + (k === 'laundry' ? ' a load' : '');
  });
  Object.keys(P).forEach(k => { if (typeof P[k] === 'number') text['policy.' + k] = String(P[k]); });

  document.querySelectorAll('[data-cfg]').forEach(el => { const v = text[el.dataset.cfg]; if (v) el.textContent = v; });
  document.querySelectorAll('[data-policy]').forEach(el => { el.hidden = !P[el.dataset.policy]; });
  document.querySelectorAll('[data-size-price]').forEach(el => {
    const [svc, i] = el.dataset.sizePrice.split('.'), row = C.sizes && C.sizes[svc];
    if (row && row[i] != null) el.textContent = money(row[i]);
  });
  document.querySelectorAll('[data-size-label]').forEach(el => {
    const label = C.sizes && C.sizes.labels && C.sizes.labels[el.dataset.sizeLabel];
    if (label) el.textContent = label;
  });
  document.querySelectorAll('[data-off]').forEach(el => {
    const f = freqs.find(x => x.id === el.dataset.off);
    if (f) el.textContent = pct(f.off);
  });
  if (C.bookingUrl) document.querySelectorAll('[data-book]').forEach(a => { a.href = C.bookingUrl; });
})();
