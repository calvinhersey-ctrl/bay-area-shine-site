/* Bay Area Shine: page behaviour.
   Every price, link, window, policy and review comes from window.BAS_CONFIG (site/js/config.js, owned by
   Booking & Launch). FALLBACK_CONFIG below only fills keys config.js leaves out; links it doesn't
   know (bookingUrl) are left out, and the page falls back to the request form. */
(function(){
  'use strict';
  /* Arriving on a link like /#reviews (the QR card): make sure we end up there even if photos moved the page
     while loading, unless the visitor already started scrolling. Smooth scrolling only switches on after this. */
  let moved = false;
  ['wheel', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, () => { moved = true; }, {once: true, passive: true}));
  addEventListener('load', () => {
    const id = decodeURIComponent(location.hash.slice(1)), t = id && document.getElementById(id);
    if (t && !moved && Math.abs(t.getBoundingClientRect().top) > 2) t.scrollIntoView();
    document.documentElement.classList.add('loaded');
  });

  const FALLBACK_CONFIG = {
    email: 'bayareashinecleaners@gmail.com',
    depositAmount: 40,
    quoteEndpoint: 'https://formsubmit.co/ajax/bayareashinecleaners@gmail.com',
    windows: [
      {id:'morning', part:'Morning', label:'8–11 AM'},
      {id:'midday', part:'Midday', label:'11 AM–2 PM'},
      {id:'afternoon', part:'Afternoon', label:'2–5 PM'}
    ],
    services: {
      standard: {from:140, includes:[]},
      deep: {from:230, includes:['baseboards','windows']},
      move: {from:280, includes:['oven','fridge','cabinets','baseboards','windows'], oneTimeOnly:true}
    },
    sizes: {
      labels: ['Studio / 1 bed','2 bed','3 bed','4+ bed'],
      standard: [140,185,235,280],
      deep: [230,315,405,490],
      move: [280,380,480,580]
    },
    extras: {
      oven: {label:'Inside oven', price:35},
      fridge: {label:'Inside fridge', price:35},
      cabinets: {label:'Inside cabinets', price:40},
      baseboards: {label:'Baseboards', price:30},
      windows: {label:'Windows', price:40, from:true},
      laundry: {label:'Laundry, 1 load', price:25}
    },
    frequencies: [
      {id:'once', label:'One time', off:0},
      {id:'weekly', label:'Weekly', off:0.15},
      {id:'biweekly', label:'Every 2 weeks', off:0.10},
      {id:'monthly', label:'Monthly', off:0.05}
    ],
    organizing: {hourly:55, minHours:3},
    referralCredit: 25,
    policies: {rescheduleHours:48, recleanHours:24, unpaidReleaseHours:24, depositNonRefundable:true, depositCredited:true},
    reviews: []
  };

  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  /* config.js wins key by key, two levels deep (so services.deep.includes can change on its own) */
  function merge(base, over){
    const out = Object.assign({}, base);
    Object.keys(over || {}).forEach(k => {
      const v = over[k];
      if (v === undefined || v === null) return;
      if (isObj(v) && isObj(base[k])){
        out[k] = Object.assign({}, base[k]);
        Object.keys(v).forEach(s => { out[k][s] = isObj(v[s]) && isObj(base[k][s]) ? Object.assign({}, base[k][s], v[s]) : v[s]; });
      } else out[k] = v;
    });
    return out;
  }
  const C = merge(FALLBACK_CONFIG, window.BAS_CONFIG);
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const money = n => '$' + n;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SVC_IDS = ['standard','deep','move'];
  const SVC_NAME = {standard:'Standard clean', deep:'Deep clean', move:'Move-in or move-out'};
  const SVC_LINE = {standard:'Standard clean', deep:'Deep clean', move:'Move-in/out clean'};
  const svc = id => C.services[id] || {from:0, includes:[]};
  const incl = id => (svc(id).includes || []).filter(k => C.extras[k]);
  const sizeLabels = (C.sizes && C.sizes.labels) || [];
  function basePrice(id, size){
    const row = C.sizes && C.sizes[id];
    return row && row[size] != null ? row[size] : svc(id).from;
  }
  const extraPrice = e => (e.from ? 'from ' : '') + money(e.price);
  function listJoin(a, last){ return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' ' + (last || 'and') + ' ' + a[a.length - 1]; }

  /* ---------- fill config-driven text ---------- */
  const P = C.policies || {};
  const discounts = C.frequencies.filter(f => f.off > 0).map((f, i) => (i ? f.label.toLowerCase() : f.label + ' visits save') + ' ' + Math.round(f.off * 100) + '%');
  const CFG_TEXT = {
    'deposit': money(C.depositAmount),
    'organizing': money(C.organizing.hourly) + ' an hour, ' + C.organizing.minHours + '-hour minimum',
    'referral': money(C.referralCredit),
    'windows': listJoin(C.windows.map(w => w.label), 'or'),
    'discounts': discounts.length > 2 ? discounts.slice(0, -1).join(', ') + ', and ' + discounts[discounts.length - 1] : discounts.join(' and ')
  };
  SVC_IDS.forEach(id => { CFG_TEXT['from.' + id] = money(svc(id).from); });
  Object.keys(C.extras).forEach(k => { CFG_TEXT['extra.' + k] = money(C.extras[k].price); });
  Object.keys(P).forEach(k => { if (typeof P[k] === 'number') CFG_TEXT['policy.' + k] = String(P[k]); });
  $$('[data-cfg]').forEach(el => { const v = CFG_TEXT[el.dataset.cfg]; if (v != null) el.textContent = v; });
  $$('[data-policy]').forEach(el => { el.hidden = !P[el.dataset.policy]; });
  $$('[data-mail]').forEach(a => { a.href = 'mailto:' + C.email; if (a.textContent.includes('@')) a.textContent = C.email; });
  $$('[data-inc]').forEach(el => {
    const ks = incl(el.dataset.inc);
    el.textContent = ks.length ? 'Includes ' + listJoin(ks.map(k => C.extras[k].label.toLowerCase())) : 'Add any extra you need';
  });

  /* ---------- state ---------- */
  const st = {
    win: (C.windows[1] || C.windows[0] || {}).id,
    svc: 'standard', size: 0, freq: 'once', room: 'kitchen',
    picked: new Set()
  };
  const winLabel = id => (C.windows.find(w => w.id === id) || {}).label || '';
  /* Google's booking page can't open on a chosen window, so we say which start time to tap there */
  const START = {morning:'8:00am', midday:'11:00am', afternoon:'2:00pm'};
  const winStart = w => w.start || START[w.id] || '';

  /* ---------- time windows (hero booking card) ---------- */
  const WIN_ICONS = [
    '<path d="M4 18h16M7 14a5 5 0 0 1 10 0M12 4v4M9 6l3-3 3 3"/>',
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
    '<path d="M4 18h16M7 14a5 5 0 0 1 10 0M12 3v5M9 6l3 3 3-3"/>'
  ];
  const winBox = $('#windows');
  winBox.replaceChildren(...C.windows.map((w, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'win'; b.dataset.win = w.id;
    b.innerHTML = '<span class="ic" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + WIN_ICONS[i % 3] + '</svg></span><span><small></small><b></b></span>';
    $('small', b).textContent = (w.part || '').toUpperCase();
    $('b', b).textContent = w.label;
    b.addEventListener('click', () => { st.win = w.id; st.winPicked = true; renderWins(); });
    return b;
  }));
  function renderWins(){
    $$('.win', winBox).forEach(b => b.setAttribute('aria-pressed', b.dataset.win === st.win));
    const w = C.windows.find(x => x.id === st.win) || {}, starts = C.windows.map(winStart).filter(Boolean);
    $$('[data-hint]').forEach(el => {
      el.hidden = !C.bookingUrl || !starts.length;
      el.textContent = (el.dataset.hint === 'est' ? ' ' : '') + (el.dataset.hint === 'hero' || st.winPicked
        ? 'On the next page, tap the ' + winStart(w) + ' start.'
        : 'On the next page, tap the ' + listJoin(starts, 'or') + ' start.');
    });
  }
  renderWins();

  /* ---------- sparkles ---------- */
  function sparkAt(parent, x, y){
    if (reduce) return;
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', 'burst'); s.setAttribute('aria-hidden', 'true');
    s.style.left = (x - 13) + 'px'; s.style.top = (y - 13) + 'px';
    s.innerHTML = '<use href="#sp"/>';
    parent.appendChild(s); setTimeout(() => s.remove(), 950);
  }

  /* ---------- sweep to shine (plays by itself, no dragging) ---------- */
  const box = $('#wipe'), reveal = $('#reveal');
  let played = false, timers = [];
  function play(){
    timers.forEach(clearTimeout); timers = [];
    box.classList.remove('go', 'done'); reveal.classList.remove('on'); void box.offsetWidth;
    if (reduce){ box.classList.add('go', 'done'); reveal.classList.add('on'); return; }
    requestAnimationFrame(() => box.classList.add('go'));
    timers.push(setTimeout(() => {
      box.classList.add('done'); reveal.classList.add('on');
      const r = box.getBoundingClientRect();
      for (let i = 0; i < 6; i++) timers.push(setTimeout(() => sparkAt(box, r.width * (0.25 + Math.random() * 0.65), r.height * (0.2 + Math.random() * 0.55)), i * 110));
    }, 1900));
  }
  if (reduce) play();
  else if ('IntersectionObserver' in window){
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting && !played){ played = true; setTimeout(play, 350); io.disconnect(); }
    }), {threshold: .55});
    io.observe(box);
  } else play();
  $('#again').addEventListener('click', play);

  /* ---------- build your clean ---------- */
  const ROOMS = [
    {id:'kitchen', name:'Kitchen', img:'room-kitchen', alt:'Kitchen with oven, fridge, cabinets and a window', hs:[['oven',24,72],['fridge',52,50],['cabinets',30,13],['windows',85,30,1],['baseboards',76,80,1]]},
    {id:'bath', name:'Bathroom', img:'room-bath', alt:'Clean bathroom with a glass shower and blue towels', hs:[['windows',72,22,1],['laundry',44,28],['baseboards',62,90]]},
    {id:'bed', name:'Bedroom', img:'room-bed', alt:'Made bed with a royal blue throw and a yellow pillow', hs:[['laundry',58,58],['windows',86,30,1],['baseboards',82,72,1]]},
    {id:'bnb', name:'Airbnb setup', img:'room-airbnb', alt:'Guest-ready rental bedroom with rolled towels on the bed', hs:[['laundry',42,66],['windows',76,28,1]]}
  ];
  /* what's-included checklists; extras a clean includes are added from config so the two never disagree */
  const CHECK = {
    standard: {items:['Kitchen counters, sink and stovetop','Microwave, inside and out','Outside of fridge, oven and dishwasher','Bathrooms: toilet, tub or shower, sink and mirrors','Bedrooms and living areas dusted and tidied','Floors vacuumed and mopped','Trash taken out']},
    deep: {lead:'Everything in a Standard clean, plus:', base:'standard', items:['Door frames, light switches and vents','Cabinet and drawer fronts','Tile and grout scrubbed']},
    move: {lead:'Everything in a Deep clean, plus:', base:'deep', items:['Closets and shelves wiped out','Bathrooms sanitized, ready for first use','Ready for the final walkthrough']}
  };
  const isInc = k => incl(st.svc).includes(k);
  const oneTime = id => !!svc(id).oneTimeOnly;

  function estimate(id, size, freqId, picked){
    const base = basePrice(id, size), inc = incl(id);
    const f = oneTime(id) ? C.frequencies[0] : (C.frequencies.find(x => x.id === freqId) || C.frequencies[0]);
    const extras = Object.keys(C.extras).filter(k => picked.has(k) && !inc.includes(k));
    const sub = base + extras.reduce((t, k) => t + C.extras[k].price, 0);
    const off = Math.round(sub * (f.off || 0));
    return {base, inc, extras, f, off, total: sub - off};
  }

  const tabs = $('#tabs'), room = $('#room'), roomImg = $('#roomImg');
  ROOMS.forEach((r, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tab'; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'room');
    b.textContent = r.name; b.dataset.id = r.id;
    b.addEventListener('click', () => { st.room = r.id; renderRoom(); });
    b.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const n = ROOMS[(i + (e.key === 'ArrowRight' ? 1 : ROOMS.length - 1)) % ROOMS.length];
      st.room = n.id; renderRoom(); $('[data-id="' + n.id + '"]', tabs).focus();
    });
    tabs.appendChild(b);
  });
  function renderRoom(){
    const r = ROOMS.find(x => x.id === st.room);
    $$('.tab', tabs).forEach(t => { const on = t.dataset.id === r.id; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    roomImg.srcset = 'img/' + r.img + '-1200.jpg 1200w, img/' + r.img + '.jpg 2400w';
    roomImg.src = 'img/' + r.img + '.jpg'; roomImg.alt = r.alt;
    $$('.hs', room).forEach(h => h.remove());
    r.hs.forEach(([k, x, y, flip]) => {
      if (!C.extras[k]) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'hs'; b.style.left = x + '%'; b.style.top = y + '%'; b.dataset.k = k; b.dataset.flip = flip ? '1' : '';
      b.innerHTML = '<span class="dot" aria-hidden="true"></span><span class="lab" aria-hidden="true"></span>';
      b.addEventListener('click', () => {
        if (isInc(k)) return;
        if (st.picked.has(k)) st.picked.delete(k);
        else { st.picked.add(k); sparkAt(room, b.offsetLeft, b.offsetTop); }
        renderPicks();
      });
      room.appendChild(b);
    });
    renderPicks();
  }

  function seg(el, list, onPick){
    el.replaceChildren(...list.map(([id, html]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.id = id; b.innerHTML = html;
      b.addEventListener('click', () => onPick(id));
      return b;
    }));
  }
  const svcSeg = $('#svcSeg'), sizeSeg = $('#sizeSeg'), freqSeg = $('#freqSeg');
  $$('button', svcSeg).forEach(b => b.addEventListener('click', () => {
    st.svc = b.dataset.svc; if (oneTime(st.svc)) st.freq = 'once';
    renderSeg(); renderPicks();
  }));
  if (sizeLabels.length) seg(sizeSeg, sizeLabels.map((l, i) => [String(i), '']), id => { st.size = +id; renderSeg(); renderPicks(); });
  else $('#sizeBox').hidden = true;
  seg(freqSeg, C.frequencies.map(f => [f.id, '']), id => { st.freq = id; renderSeg(); renderPicks(); });
  $$('button', freqSeg).forEach((b, i) => {
    const f = C.frequencies[i]; b.textContent = f.label;
    const s = document.createElement('small'); s.textContent = f.off ? Math.round(f.off * 100) + '% off' : 'no discount'; b.appendChild(s);
  });

  function renderSeg(){
    $$('button', svcSeg).forEach(b => b.setAttribute('aria-pressed', b.dataset.svc === st.svc));
    $$('button', sizeSeg).forEach((b, i) => {
      b.setAttribute('aria-pressed', i === st.size);
      b.textContent = sizeLabels[i];
      const s = document.createElement('small'); s.textContent = money(basePrice(st.svc, i)); b.appendChild(s);
    });
    $$('button', freqSeg).forEach(b => { b.setAttribute('aria-pressed', b.dataset.id === st.freq); b.disabled = oneTime(st.svc) && b.dataset.id !== 'once'; });
    renderChecklist();
  }

  function renderChecklist(){
    const c = CHECK[st.svc], ul = $('#inclList');
    $('#inclName').textContent = SVC_NAME[st.svc];
    const lis = [];
    if (c.lead){ const li = document.createElement('li'); li.className = 'lead'; li.textContent = c.lead; lis.push(li); }
    const baseInc = c.base ? incl(c.base) : [];
    incl(st.svc).filter(k => !baseInc.includes(k)).map(k => C.extras[k].label).concat(c.items).forEach(t => { const li = document.createElement('li'); li.textContent = t; lis.push(li); });
    ul.replaceChildren(...lis);
  }

  function row(cls, a, b){
    const d = document.createElement('div'); if (cls) d.className = cls;
    const x = document.createElement('span'), y = document.createElement('span');
    x.textContent = a; y.textContent = b; d.append(x, y); return d;
  }
  function renderPicks(){
    $$('.hs', room).forEach(h => {
      const k = h.dataset.k, e = C.extras[k], inc = isInc(k), on = inc || st.picked.has(k);
      h.classList.toggle('inc', inc);
      h.setAttribute('aria-pressed', on);
      if (inc) h.setAttribute('aria-disabled', 'true'); else h.removeAttribute('aria-disabled');
      $('.dot', h).textContent = on ? '✓' : '+';
      $('.lab', h).textContent = inc ? e.label + ' · included' : e.label + ' ' + (e.from ? 'from $' : '+$') + e.price;
      h.setAttribute('aria-label', inc ? e.label + ', included in a ' + SVC_LINE[st.svc] : e.label + ', add ' + extraPrice(e));
    });
    const est = estimate(st.svc, st.size, st.freq, st.picked);
    const lines = [row('', SVC_LINE[st.svc] + (sizeLabels[st.size] ? ', ' + sizeLabels[st.size] : ''), money(est.base))];
    est.inc.forEach(k => lines.push(row('inc', '✓ ' + C.extras[k].label, 'Included')));
    est.extras.forEach(k => lines.push(row('x', '+ ' + C.extras[k].label, extraPrice(C.extras[k]))));
    if (!est.extras.length){ const d = document.createElement('div'); d.className = 'empty'; d.textContent = 'Tap a yellow dot on the photo to add an extra.'; lines.push(d); }
    if (est.off) lines.push(row('x', est.f.label + ' discount', '−' + money(est.off)));
    $('#lines').replaceChildren(...lines);
    $('#total').textContent = money(est.total);
    $('#estCopy').hidden = !C.bookingUrl;
    $('#bookNote').textContent = bookNote(est);
    fitLabels();
  }
  /* Google's booking page can't take our build, so we hand the customer a line to paste into its notes */
  function bookNote(est){
    const parts = [SVC_LINE[st.svc], (sizeLabels[st.size] || '').toLowerCase()]
      .concat(est.extras.map(k => C.extras[k].label.toLowerCase().replace(/, (.+)$/, ' ($1)')))
      .concat(est.f.label.toLowerCase());
    return parts.filter(Boolean).join(', ') + ', estimate ' + money(est.total) + '.';
  }
  function selectNote(){ const r = document.createRange(); r.selectNodeContents($('#bookNote')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  $('#copyNote').addEventListener('click', () => {
    const b = $('#copyNote'), done = () => { b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy'; }, 2000); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText($('#bookNote').textContent).then(done, selectNote);
    else selectNote();
  });
  /* keep every label inside the photo: use the preferred side, switch sides if it would be cut off */
  function fitLabels(){
    const R = room.getBoundingClientRect();
    $$('.hs', room).forEach(h => {
      h.classList.toggle('flip', h.dataset.flip === '1');
      const r = h.getBoundingClientRect();
      if (r.right > R.right - 4) h.classList.add('flip');
      else if (r.left < R.left + 4) h.classList.remove('flip');
    });
  }
  addEventListener('resize', fitLabels);
  renderSeg(); renderRoom();

  /* ---------- reviews: real ones only, from config; nothing shown until config has some ---------- */
  const rv = $('#rv'), reviews = (C.reviews || []).filter(r => r && r.quote);
  rv.dataset.n = reviews.length;
  reviews.slice().reverse().forEach(r => {
    const d = document.createElement('figure'); d.className = 'rcard';
    const s = document.createElement('span'); s.className = 'stars'; s.setAttribute('role', 'img'); s.setAttribute('aria-label', '5 stars'); s.textContent = '★★★★★';
    const q = document.createElement('q'); q.textContent = r.quote;
    d.append(s, q);
    if (r.byline){ const by = document.createElement('figcaption'); by.className = 'by'; by.textContent = r.byline; d.append(by); }
    rv.prepend(d);
  });

  /* ---------- service area checker ---------- */
  const q = $('#cityq'), res = $('#cityres'), ask = $('#cityAsk'), cityEls = $$('.grp .chips span');
  $('#cityList').replaceChildren(...cityEls.map(c => { const o = document.createElement('option'); o.value = c.textContent; return o; }));
  q.addEventListener('input', () => {
    const v = q.value.trim().toLowerCase();
    cityEls.forEach(c => c.classList.remove('hit')); res.className = ''; res.textContent = ''; ask.hidden = true;
    if (v.length < 3) return;
    const m = cityEls.filter(c => c.textContent.toLowerCase().startsWith(v));
    if (m.length){
      m.forEach(c => c.classList.add('hit'));
      const exact = m.find(c => c.textContent.toLowerCase() === v) || m[0];
      res.className = 'yes';
      res.textContent = m.length === 1 || exact.textContent.toLowerCase() === v ? 'Yes, we clean in ' + exact.textContent + '.' : 'Matches: ' + m.map(c => c.textContent).join(', ');
    } else {
      res.className = 'no';
      res.textContent = "Not on our list yet. Ask us and we'll let you know.";
      ask.hidden = false;
    }
  });
  ask.addEventListener('click', () => openForm('quote', {service: st.svc, city: q.value.trim(), opener: ask}));

  /* ---------- booking: the Google booking page when config has it, otherwise the request form ---------- */
  $$('[data-book]').forEach(a => {
    if (C.bookingUrl){ a.href = C.bookingUrl; a.target = '_blank'; a.rel = 'noopener'; }
    else a.addEventListener('click', e => { e.preventDefault(); openForm('book', {service: st.svc, opener: a}); });
  });
  $$('[data-quote]').forEach(b => b.addEventListener('click', () => openForm('quote', {service: b.dataset.quote, opener: b})));
  $$('[data-ask]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openForm('quote', {service: 'question', opener: a}); }));

  /* ---------- quote / request form (FormSubmit, with an email-app fallback) ---------- */
  const dlg = $('#quote'), form = $('#quoteForm'), f = id => document.getElementById(id);
  const note = f('qNote'), sendBtn = f('qSend');
  const OTHER = {airbnb:'Airbnb turnover', organizing:'Organizing', office:'Office cleaning', other:'Something else'};
  const NOTES_HINT = {airbnb:'Checkout and check-in times, how often, laundry', organizing:'Which space, and how full it is', office:'Size, how often, best times', other:'Tell us what you need'};
  const svcName = id => SVC_NAME[id] || OTHER[id] || id;
  /* "Just a question" turns the same form into a plain question: no sizes, dates or estimate */
  const isQ = () => f('qService').value === 'question';
  const sendLabel = () => isQ() ? 'Send question' : 'Send request';
  const noteDefault = () => isQ() ? 'Your question goes straight to our inbox.' : 'Send request goes straight to our inbox.';
  /* Bedrooms in the form set the home size it prices (Studio and 1 → first size, 4 and 5+ → last) */
  const BEDS_TO_SIZE = [0, 0, 1, 2, 3, 3];
  const formSize = () => Math.min(BEDS_TO_SIZE[f('qBeds').selectedIndex] ?? st.size, Math.max(sizeLabels.length - 1, 0));
  let mode = 'quote', opener = null, sending = false, sentSig = null, sentWho = '';
  f('qWin').replaceChildren(...C.windows.map(w => { const o = document.createElement('option'); o.value = w.id; o.textContent = w.label; return o; }));

  function openForm(m, o){
    mode = m; opener = o.opener || null;
    f('qWin').value = st.win;
    f('qService').value = o.service || st.svc;
    if (o.city != null) f('qCity').value = o.city;
    if (SVC_IDS.includes(f('qService').value)) f('qBeds').selectedIndex = Math.min(st.size + 1, f('qBeds').options.length - 1);
    note.className = 'form-note'; note.textContent = ''; delete note.dataset.state;
    renderForm();
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function closeForm(){
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
  }
  dlg.addEventListener('close', () => { if (opener) opener.focus(); });
  $$('[data-close]', dlg).forEach(b => b.addEventListener('click', closeForm));
  dlg.addEventListener('click', e => { if (e.target === dlg) closeForm(); });

  function formEstimate(){
    const id = f('qService').value;
    if (SVC_IDS.includes(id)){
      const size = formSize(), est = estimate(id, size, st.freq, st.picked);
      const bits = [SVC_LINE[id] + (sizeLabels[size] ? ', ' + sizeLabels[size] : '') + ' ' + money(est.base)];
      est.extras.forEach(k => bits.push(C.extras[k].label + ' ' + extraPrice(C.extras[k])));
      if (est.off) bits.push(est.f.label + ' −' + money(est.off));
      return {price: 'Starting at ' + money(est.total), note: bits.join(' + ').replace('+ ' + est.f.label, '· ' + est.f.label) + '. We confirm your exact price before we clean.'};
    }
    if (id === 'organizing') return {price: money(C.organizing.hourly) + ' an hour', note: C.organizing.minHours + '-hour minimum (' + money(C.organizing.hourly * C.organizing.minHours) + '). Tell us about the space and we estimate the hours.'};
    return {price: 'Priced per job', note: 'Send the request and we reply with your price.'};
  }
  function renderForm(){
    const id = f('qService').value, q = id === 'question', home = SVC_IDS.includes(id) || id === 'airbnb';
    f('qTitle').textContent = q ? 'Ask us a question' : mode === 'book' ? 'Request a cleaning' : 'Get a free quote';
    f('qLede').textContent = q ? 'Ask us anything. We reply by email or text.'
      : mode === 'book' ? 'Send this and we text or email to confirm your window and price.'
      : 'Tell us about the job. We reply by email or text with your price.';
    f('qWinField').hidden = mode !== 'book' || q;
    $$('[data-home]', form).forEach(el => { el.hidden = !home; });
    f('qDateField').hidden = q; f('qEst').hidden = q;
    f('qNotesLbl').textContent = q ? 'Your question' : 'Anything else we should know';
    f('qCityLbl').textContent = q ? 'City (optional)' : 'City';
    f('qNotes').required = q; f('qNotes').rows = q ? 5 : 3;
    f('qNotes').placeholder = q ? 'Ask about our services, your city, scheduling, anything.' : NOTES_HINT[id] || 'Pets, parking, how to get in';
    const e = formEstimate();
    f('qEstPrice').textContent = e.price; f('qEstNote').textContent = e.note;
    f('qMail').href = 'mailto:' + C.email + '?subject=' + encodeURIComponent(subject()) + '&body=' + encodeURIComponent(requestText());
    syncSent();
  }
  /* after a good send, stay "Sent" until something in the request changes, so a second tap can't send it twice */
  const sig = () => JSON.stringify([mode, fields()]);
  function syncSent(){
    if (sending) return;
    const done = sentSig !== null && sentSig === sig();
    sendBtn.disabled = done; sendBtn.textContent = done ? 'Sent' : sendLabel();
    if (done){ note.className = 'form-note sent'; note.dataset.state = 'ok'; note.textContent = 'Sent. We got your ' + (isQ() ? 'question' : 'request') + ' and will reply to ' + sentWho + '.'; }
    else if (note.dataset.state === 'ok' || note.className === 'form-note'){ note.className = 'form-note'; note.textContent = noteDefault(); delete note.dataset.state; }
  }
  function fields(){
    const id = f('qService').value, home = SVC_IDS.includes(id) || id === 'airbnb';
    if (id === 'question') return {
      request: 'Question',
      name: f('qName').value.trim(),
      email: f('qEmail').value.trim(),
      phone: f('qPhone').value.trim(),
      city: f('qCity').value.trim(),
      question: f('qNotes').value.trim()
    };
    const e = formEstimate();
    const out = {
      request: mode === 'book' ? 'Booking request' : 'Quote request',
      service: svcName(id),
      name: f('qName').value.trim(),
      email: f('qEmail').value.trim(),
      phone: f('qPhone').value.trim(),
      city: f('qCity').value.trim()
    };
    if (mode === 'book') out.window = winLabel(f('qWin').value);
    if (home){ out.bedrooms = f('qBeds').value; out.bathrooms = f('qBaths').value; }
    if (SVC_IDS.includes(id)){ out.how_often = oneTime(id) ? 'One time' : (C.frequencies.find(x => x.id === st.freq) || {}).label; }
    out.estimate_shown = e.price + ' (' + e.note + ')';
    out.preferred_date = f('qDate').value.trim();
    out.notes = f('qNotes').value.trim();
    return out;
  }
  const subject = () => isQ() ? 'Question from ' + (f('qName').value.trim() || 'the website')
    : (mode === 'book' ? 'Booking request: ' : 'Quote request: ') + svcName(f('qService').value) + (f('qCity').value.trim() ? ' in ' + f('qCity').value.trim() : '');
  function requestText(){
    const o = fields();
    return Object.keys(o).filter(k => o[k]).map(k => k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) + ': ' + o[k]).join('\n');
  }
  function ready(){
    const em = f('qEmail').value.trim(), ph = f('qPhone').value.replace(/\D/g, '');
    note.className = 'form-note err';
    const q = isQ(), miss = !f('qName').value.trim() ? 'qName' : q ? (!f('qNotes').value.trim() ? 'qNotes' : null) : (!f('qCity').value.trim() ? 'qCity' : null);
    if (miss){ note.textContent = q ? 'Add your name and your question first.' : 'Add your name and city first so we can quote the right job.'; f(miss).focus(); return false; }
    if (!em && ph.length < 10){ note.textContent = 'Add an email or a mobile number so we can ' + (q ? 'reply.' : 'send your price.'); f('qEmail').focus(); return false; }
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){ note.textContent = "That email doesn't look right. Check it and try again."; f('qEmail').focus(); return false; }
    note.className = 'form-note'; note.textContent = '';
    return true;
  }
  form.addEventListener('input', renderForm);
  form.addEventListener('change', renderForm);
  f('qMail').addEventListener('click', e => {
    if (!ready()){ e.preventDefault(); return; }
    renderForm();
    note.className = 'form-note sent';
    note.textContent = 'Your email app is opening with your request filled in. Press send there to reach us.';
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (sending || sentSig === sig() || !ready() || f('qHoney').value) return;
    const o = fields(), who = o.email || o.phone, s = sig();
    const payload = Object.assign({_subject: subject(), _template: 'table', _honey: ''}, o);
    sending = true; sendBtn.disabled = true; sendBtn.textContent = 'Sending…';
    const ctrl = window.AbortController ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 12000);
    const failed = () => {
      clearTimeout(timer); sending = false;
      sendBtn.disabled = false; sendBtn.textContent = sendLabel();
      note.className = 'form-note err';
      note.textContent = "That didn't go through. Tap Email it instead, or write to " + C.email + '.';
    };
    fetch(C.quoteEndpoint, {method: 'POST', headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}, body: JSON.stringify(payload), signal: ctrl ? ctrl.signal : undefined})
      .then(r => r.json())
      .then(r => {
        if (!r || !(r.success === true || r.success === 'true')) return failed();
        clearTimeout(timer); sending = false;
        sentSig = s; sentWho = who;
        syncSent();
      })
      .catch(failed);
  });
})();
