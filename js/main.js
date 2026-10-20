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
    let id = location.hash.slice(1);
    try { id = decodeURIComponent(id); } catch { /* an incomplete shared fragment should not break the page */ }
    const t = id && document.getElementById(id);
    if (t && !moved && Math.abs(t.getBoundingClientRect().top) > 2) t.scrollIntoView();
    document.documentElement.classList.add('loaded');
  });

  const FALLBACK_CONFIG = {
    email: 'hello@bayareashinecleaners.com',
    depositAmount: 40,
    quoteEndpoint: 'https://formsubmit.co/ajax/bayareashinecleaners@gmail.com',
    windows: [
      {id:'morning', part:'Morning', label:'8–11 AM'},
      {id:'midday', part:'Midday', label:'11 AM–2 PM'},
      {id:'afternoon', part:'Afternoon', label:'2–5 PM'}
    ],
    services: {
      standard: {from:150, includes:[]},
      deep: {from:230, includes:['baseboards','windows']},
      move: {from:280, includes:['oven','fridge','cabinets','baseboards','windows'], oneTimeOnly:true}
    },
    sizes: {
      labels: ['Studio / 1 bed','2 bed','3 bed','4 bed','5 bed','6+ bed'],
      standard: [150,185,235,280,340,400],
      deep: [230,315,405,490,595,700],
      move: [280,380,480,580,705,830],
      bathsIncluded: [1,2,2,3,3,4],
      extraBath: {standard:20, deep:35, move:40},
      maxBaths: 6
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
      {id:'weekly', label:'Weekly', off:0.10},
      {id:'biweekly', label:'Every 2 weeks', off:0.07},
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
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = motionPreference.matches;
  /* iPhone Safari only shows the :active press styles when the page listens for touches */
  document.addEventListener('touchstart', () => {}, {passive: true});

  const SVC_IDS = ['standard','deep','move'];
  const SVC_NAME = {standard:'Standard clean', deep:'Deep clean', move:'Move-in or move-out'};
  const SVC_LINE = {standard:'Standard clean', deep:'Deep clean', move:'Move-in/out clean'};
  const svc = id => C.services[id] || {from:0, includes:[]};
  const incl = id => (svc(id).includes || []).filter(k => C.extras[k]);
  const sizeLabels = (C.sizes && C.sizes.labels) || [];
  /* Bathrooms: each size includes some; every one beyond that adds extraBath[service]. Missing in config = no bathroom pricing. */
  const bathsIncl = (C.sizes && C.sizes.bathsIncluded) || [];
  const maxBaths = (C.sizes && C.sizes.maxBaths) || 6;
  const hasBaths = bathsIncl.length > 0;
  const inclBaths = size => (bathsIncl[size] != null ? bathsIncl[size] : 1);
  const bathRate = id => ((C.sizes && C.sizes.extraBath) || {})[id] || 0;
  const bathCount = n => Math.min(Math.max(Math.round(n) || 1, 1), maxBaths);
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
  st.baths = inclBaths(st.size); st.bathsPicked = false;
  let sizeEdits = 0, windowEdits = 0, serviceEdits = 0;
  // Only nonpersonal picker choices, for this tab. Never persist form fields or quoted prices.
  const DRAFT_KEY = 'bas-estimate-v1';
  function saveEstimate(){
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        svc:st.svc, size:st.size, baths:st.baths, bathsPicked:st.bathsPicked === true, freq:st.freq, room:st.room,
        win:st.win, winPicked:st.winPicked === true, picked:Array.from(st.picked)
      }));
    } catch { /* Storage can be unavailable in private/locked-down browsers. The picker still works. */ }
  }
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
    b.addEventListener('click', () => { st.win = w.id; st.winPicked = true; windowEdits++; renderWins(); saveEstimate(); });
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
  let played = false, timers = [], sweepRaf = 0;
  function play(){
    timers.forEach(clearTimeout); timers = [];
    cancelAnimationFrame(sweepRaf);
    box.classList.remove('go', 'done'); reveal.classList.remove('on'); void box.offsetWidth;
    if (reduce){ box.classList.add('go', 'done'); reveal.classList.add('on'); return; }
    sweepRaf = requestAnimationFrame(() => box.classList.add('go'));
    timers.push(setTimeout(() => {
      box.classList.add('done'); reveal.classList.add('on');
      const r = box.getBoundingClientRect();
      for (let i = 0; i < 6; i++) timers.push(setTimeout(() => sparkAt(box, r.width * (0.25 + Math.random() * 0.65), r.height * (0.2 + Math.random() * 0.55)), i * 110));
    }, 1900));
  }
  if (reduce) play();
  else if ('IntersectionObserver' in window){
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting && !played){ played = true; timers.push(setTimeout(play, 350)); io.disconnect(); }
    }), {threshold: .55});
    io.observe(box);
  } else play();
  $('#again').addEventListener('click', play);

  /* ---------- build your clean ---------- */
  const ROOMS = [
    {id:'kitchen', name:'Kitchen', img:'room-kitchen', alt:'Kitchen with oven, fridge, cabinets and a window', hs:[['oven',24,64],['fridge',54,47],['cabinets',30,13],['windows',85,30,1],['baseboards',76,80,1]]},
    {id:'bath', name:'Bathroom', img:'room-bath', alt:'Clean bathroom with a glass shower and blue towels', hs:[['windows',72,22,1],['laundry',44,42],['baseboards',62,90]]},
    {id:'bed', name:'Bedroom', img:'room-bed', alt:'Made bed with a royal blue throw and a yellow pillow', hs:[['laundry',58,58],['windows',86,30,1],['baseboards',82,75,1]]},
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

  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    const draft = raw && raw.length <= 4096 ? JSON.parse(raw) : null;
    if (isObj(draft)){
      if (SVC_IDS.includes(draft.svc)) st.svc = draft.svc;
      if (Number.isInteger(draft.size) && draft.size >= 0 && draft.size < sizeLabels.length) st.size = draft.size;
      st.baths = inclBaths(st.size);
      if (draft.bathsPicked === true && Number.isInteger(draft.baths) && draft.baths >= 1 && draft.baths <= maxBaths) { st.baths = draft.baths; st.bathsPicked = true; }
      if (!oneTime(st.svc) && C.frequencies.some(f => f.id === draft.freq)) st.freq = draft.freq;
      if (ROOMS.some(r => r.id === draft.room)) st.room = draft.room;
      if (C.windows.some(w => w.id === draft.win)) { st.win = draft.win; st.winPicked = draft.winPicked === true; }
      if (Array.isArray(draft.picked)) st.picked = new Set(draft.picked.filter(k => typeof k === 'string' && Object.prototype.hasOwnProperty.call(C.extras, k)));
    }
  } catch { /* Old/corrupt data must never stop booking. */ }
  renderWins();

  function estimate(id, size, freqId, picked, baths){
    const base = basePrice(id, size), inc = incl(id);
    const extraBaths = hasBaths && baths != null ? Math.max(0, bathCount(baths) - inclBaths(size)) : 0;
    const bathCost = extraBaths * bathRate(id);
    const f = oneTime(id) ? C.frequencies[0] : (C.frequencies.find(x => x.id === freqId) || C.frequencies[0]);
    const extras = Object.keys(C.extras).filter(k => picked.has(k) && !inc.includes(k));
    const sub = base + bathCost + extras.reduce((t, k) => t + C.extras[k].price, 0);
    const off = Math.round(sub * (f.off || 0));
    return {base, extraBaths, bathCost, inc, extras, f, off, total: sub - off};
  }

  const tabs = $('#tabs'), room = $('#room'), roomImg = $('#roomImg');
  const roomStatus = $('#roomStatus');
  const extraHint = () => room.classList.contains('photo-loading') || room.classList.contains('photo-failed') || room.classList.contains('photo-list')
    ? 'Choose an extra from the list.' : 'Tap a yellow dot on the photo to add an extra.';
  function showPhotoState(){
    const loading = !roomImg.complete, failed = !loading && !roomImg.naturalWidth;
    room.classList.toggle('photo-loading', loading);
    room.classList.toggle('photo-failed', failed);
    roomImg.setAttribute('aria-busy', String(loading));
    fitLabels();
    roomStatus.textContent = loading ? 'Loading room photo… Choose extras below.'
      : failed ? 'Photo unavailable. Extras still work.'
      : room.classList.contains('photo-list') ? 'Optional extras · choose from the list.' : 'Optional extras · teal dots are included.';
    if (loading && room.scrollHeight > room.clientHeight) roomStatus.textContent = 'Loading room photo… Scroll for all extras.';
    if (room.classList.contains('photo-list') && room.scrollHeight > room.clientHeight) roomStatus.textContent = 'Optional extras · scroll for all options.';
    const empty = $('#lines .empty'); if (empty) empty.textContent = extraHint();
  }
  roomImg.addEventListener('load', showPhotoState);
  roomImg.addEventListener('error', showPhotoState);
  ROOMS.forEach((r, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tab'; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'room');
    b.id = 'room-tab-' + r.id;
    b.textContent = r.name; b.dataset.id = r.id;
    b.addEventListener('click', () => { st.room = r.id; renderRoom(); });
    b.addEventListener('keydown', e => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const n = e.key === 'Home' ? ROOMS[0] : e.key === 'End' ? ROOMS[ROOMS.length - 1]
        : ROOMS[(i + (e.key === 'ArrowRight' ? 1 : ROOMS.length - 1)) % ROOMS.length];
      st.room = n.id; renderRoom(); $('[data-id="' + n.id + '"]', tabs).focus();
    });
    tabs.appendChild(b);
  });
  function renderRoom(){
    const r = ROOMS.find(x => x.id === st.room);
    room.setAttribute('aria-labelledby', 'room-tab-' + r.id);
    $$('.tab', tabs).forEach(t => { const on = t.dataset.id === r.id; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    const src = 'img/' + r.img + '.jpg';
    // Hide the old photo immediately so the new room's dots never describe it.
    if (roomImg.src !== new URL(src, document.baseURI).href){
      room.classList.add('photo-loading'); room.classList.remove('photo-failed');
      roomImg.src = src;
    }
    roomImg.alt = r.alt;
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
    showPhotoState(); renderPicks();
  }

  function seg(el, list, onPick){
    el.replaceChildren(...list.map(([id, html]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.id = id; b.innerHTML = html;
      b.addEventListener('click', () => onPick(id));
      return b;
    }));
  }
  const svcSeg = $('#svcSeg'), sizeSeg = $('#sizeSeg'), bathSeg = $('#bathSeg'), freqSeg = $('#freqSeg');
  $$('button', svcSeg).forEach(b => b.addEventListener('click', () => {
    st.svc = b.dataset.svc; serviceEdits++; if (oneTime(st.svc)) st.freq = 'once';
    renderSeg(); renderPicks();
  }));
  if (sizeLabels.length) seg(sizeSeg, sizeLabels.map((l, i) => [String(i), '']), id => {
    st.size = +id; sizeEdits++;
    if (!st.bathsPicked) st.baths = inclBaths(st.size);
    renderSeg(); renderPicks();
  });
  else $('#sizeBox').hidden = true;
  if (hasBaths && sizeLabels.length){
    seg(bathSeg, Array.from({length:maxBaths}, (_, i) => [String(i + 1), '']), id => { st.baths = +id; st.bathsPicked = true; sizeEdits++; renderSeg(); renderPicks(); });
  } else { $('#bathLbl').hidden = true; bathSeg.hidden = true; }
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
    $$('button', bathSeg).forEach((b, i) => {
      const n = i + 1, extra = Math.max(0, n - inclBaths(st.size)) * bathRate(st.svc);
      b.setAttribute('aria-pressed', n === st.baths);
      b.textContent = n === maxBaths ? n + '+' : String(n);
      b.setAttribute('aria-label', n + (n === maxBaths ? ' or more' : '') + (n === 1 ? ' bathroom' : ' bathrooms') + (extra ? ', adds ' + money(extra) : ', included'));
      const s = document.createElement('small'); s.textContent = extra ? '+' + money(extra) : 'included'; b.appendChild(s);
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
    const est = estimate(st.svc, st.size, st.freq, st.picked, st.baths);
    const lines = [row('', SVC_LINE[st.svc] + (sizeLabels[st.size] ? ', ' + sizeLabels[st.size] : ''), money(est.base))];
    if (est.extraBaths) lines.push(row('x extra', '+ ' + est.extraBaths + ' extra ' + (est.extraBaths === 1 ? 'bathroom' : 'bathrooms'), money(est.bathCost)));
    est.inc.forEach(k => lines.push(row('inc', '✓ ' + C.extras[k].label, 'Included')));
    est.extras.forEach(k => {
      const d = row('x extra', '+ ' + C.extras[k].label, extraPrice(C.extras[k]));
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'remove-extra'; remove.dataset.removeExtra = k;
      remove.textContent = 'Remove'; remove.setAttribute('aria-label', 'Remove ' + C.extras[k].label.toLowerCase());
      d.appendChild(remove); lines.push(d);
    });
    if (!est.extras.length){ const d = document.createElement('div'); d.className = 'empty'; d.textContent = extraHint(); lines.push(d); }
    if (est.off) lines.push(row('x', est.f.label + ' discount', '−' + money(est.off)));
    /* lines that weren't there a moment ago (an extra, what's included, the discount) ease in */
    const key = d => d.firstChild.textContent;
    if (lastLines) lines.forEach((d, i) => { if (i && !lastLines.has(key(d))) d.classList.add('new'); });
    lastLines = new Set(lines.map(key));
    $('#lines').replaceChildren(...lines);
    showTotal(est.total);
    $('#estCopy').hidden = !C.bookingUrl;
    $('#bookNote').textContent = bookNote(est);
    clearTimeout(copyTimer);
    $('#copyStatus').textContent = copying ? 'Copying booking notes…' : '';
    $('#copyNote').textContent = copying ? 'Copying…' : 'Copy';
    showPhotoState();
    saveEstimate();
  }
  $('#lines').addEventListener('click', event => {
    const button = event.target.closest('[data-remove-extra]');
    if (!button || isInc(button.dataset.removeExtra)) return;
    const buttons = $$('[data-remove-extra]', $('#lines')), index = buttons.indexOf(button);
    const focused = document.activeElement === button;
    st.picked.delete(button.dataset.removeExtra); renderPicks();
    if (focused){
      const remaining = $$('[data-remove-extra]', $('#lines'));
      (remaining[Math.min(index, remaining.length - 1)] || $('#total')).focus({preventScroll:true});
    }
  });
  /* the total rolls to its new price. #total gets the real price at once (screen readers and QA read it);
     the rolling numbers are drawn on .roll on top of it */
  let lastLines = null, shown = null, rollRaf = 0, rollEnd = 0;
  const tot = $('#tot'), rollEl = $('.roll', tot);
  function showTotal(n){
    const total = $('#total'), text = money(n);
    // Room tabs and repeated choices must not announce an unchanged price again.
    if (total.textContent !== text) total.textContent = text;
    const from = shown; shown = n;
    cancelAnimationFrame(rollRaf); clearTimeout(rollEnd);
    if (reduce || from === null || from === n){ tot.classList.remove('rolling'); return; }
    const t0 = performance.now(), D = 380;
    const step = now => {
      const p = Math.min(1, (now - t0) / D);
      shown = Math.round(from + (n - from) * (1 - Math.pow(1 - p, 3)));
      rollEl.textContent = money(shown);
      if (p < 1) rollRaf = requestAnimationFrame(step); else tot.classList.remove('rolling');
    };
    rollEl.textContent = money(from); tot.classList.add('rolling');
    rollRaf = requestAnimationFrame(step);
    rollEnd = setTimeout(() => { shown = n; tot.classList.remove('rolling'); }, D + 300);
  }
  /* Google's booking page can't take our build, so we hand the customer a line to paste into its notes */
  function bookNote(est){
    const parts = [SVC_LINE[st.svc], (sizeLabels[st.size] || '').toLowerCase()]
      .concat(hasBaths ? [st.baths + (st.baths === maxBaths ? '+' : '') + (st.baths === 1 ? ' bath' : ' baths')] : [])
      .concat(est.extras.map(k => C.extras[k].label.toLowerCase().replace(/, (.+)$/, ' ($1)')))
      .concat(est.f.label.toLowerCase());
    return parts.filter(Boolean).join(', ') + ', estimate ' + money(est.total) + '.';
  }
  let copying = false, copyTimer = 0;
  function selectNote(){
    $('#bookNote').focus({preventScroll:true});
    const r = document.createRange(); r.selectNodeContents($('#bookNote'));
    const s = getSelection(); if (s){ s.removeAllRanges(); s.addRange(r); }
    $('#copyStatus').textContent = s ? "Text selected. Use your device's Copy command."
      : "Select the booking notes above, then use your device's Copy command.";
  }
  $('#copyNote').addEventListener('click', () => {
    if (copying) return;
    const b = $('#copyNote'), text = $('#bookNote').textContent;
    clearTimeout(copyTimer);
    copying = true; b.disabled = true; b.textContent = 'Copying…'; b.setAttribute('aria-busy', 'true');
    $('#copyStatus').textContent = 'Copying booking notes…';
    const release = () => { copying = false; b.disabled = false; b.textContent = 'Copy'; b.removeAttribute('aria-busy'); };
    const failed = () => {
      // Permission may fail after the customer has moved to another field or opened the form.
      const active = document.activeElement;
      const chosen = getSelection(), book = $('#bookNote');
      const selectedElsewhere = chosen && !chosen.isCollapsed && !(book.contains(chosen.anchorNode) && book.contains(chosen.focusNode));
      const select = !selectedElsewhere && !$('#quote').open && (active === b || active === document.body);
      release();
      if (select) selectNote();
      else $('#copyStatus').textContent = "Copy didn't work. Select the booking notes above, then use your device's Copy command.";
    };
    const done = () => {
      release();
      if ($('#bookNote').textContent !== text){
        $('#copyStatus').textContent = 'Earlier notes copied. Copy again for your updated estimate.';
        return;
      }
      b.textContent = 'Copied'; $('#copyStatus').textContent = 'Booking notes copied.';
      copyTimer = setTimeout(() => { b.textContent = 'Copy'; }, 2000);
    };
    // Call inside the click's user activation; some browsers throw instead of rejecting.
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') Promise.resolve(navigator.clipboard.writeText(text)).then(done, failed);
      else failed();
    } catch { failed(); }
  });
  /* keep every label inside the photo: use the preferred side, switch sides if it would be cut off */
  function fitLabels(){
    const listScroll = room.classList.contains('photo-list') ? room.scrollTop : 0;
    room.classList.remove('photo-list');
    if (room.classList.contains('photo-failed') || room.classList.contains('photo-loading')) return;
    room.scrollTop = 0;
    const R = room.getBoundingClientRect();
    $$('.hs', room).forEach(h => {
      h.classList.toggle('flip', h.dataset.flip === '1');
      const r = h.getBoundingClientRect();
      if (r.right > R.right - 4) h.classList.add('flip');
      else if (r.left < R.left + 4) h.classList.remove('flip');
    });
    // Keep larger text and narrow screens usable without shrinking labels or moving photo dots.
    const labels = $$('.lab', room).filter(el => getComputedStyle(el).display !== 'none');
    const dots = $$('.dot', room).map(el => el.getBoundingClientRect());
    const rects = labels.map(el => el.getBoundingClientRect());
    const overlaps = (a,b) => a.left < b.right - .5 && a.right > b.left + .5 && a.top < b.bottom - .5 && a.bottom > b.top + .5;
    if (rects.some((r,i) => r.left < R.left || r.right > R.right || r.top < R.top || r.bottom > R.bottom
        || rects.slice(i+1).some(other => overlaps(r,other)) || dots.some(dot => overlaps(r,dot)))) {
      room.classList.add('photo-list'); room.scrollTop = listScroll;
    }
  }
  addEventListener('resize', showPhotoState);
  if (document.fonts) {
    document.fonts.ready.then(showPhotoState);
    // Optional font CSS can arrive after the first render; keep photo labels fitted.
    document.fonts.addEventListener('loadingdone', showPhotoState);
  }
  renderSeg(); renderRoom();

  // Device preferences can change without reloading. Stop active and queued effects immediately.
  function updateMotion(event){
    reduce = event.matches;
    if (!reduce) return;
    played = true;
    timers.forEach(clearTimeout); timers = [];
    cancelAnimationFrame(sweepRaf);
    box.classList.add('go', 'done'); reveal.classList.add('on');
    $$('.burst').forEach(s => s.remove());
    showTotal(estimate(st.svc, st.size, st.freq, st.picked, st.baths).total);
  }
  if (motionPreference.addEventListener) motionPreference.addEventListener('change', updateMotion);
  else if (motionPreference.addListener) motionPreference.addListener(updateMotion);

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
  const cityValue = value => value.trim().replace(/\s+/g, ' ')
    .replace(/(?:,\s*|\s+)(?:ca|california)(?:\s*,?\s*(?:usa|united states))?$/i, '').trim().toLowerCase();
  $('#cityList').replaceChildren(...cityEls.map(c => { const o = document.createElement('option'); o.value = c.textContent; return o; }));
  let checkedCity = null, cityEdits = 0;
  function checkCity(){
    if (checkedCity === q.value) return;
    checkedCity = q.value;
    const v = cityValue(q.value);
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
      ask.href = 'mailto:' + C.email + '?subject=Service%20area&body=' + encodeURIComponent('Do you offer cleaning in ' + q.value.trim() + '?');
      ask.hidden = false;
    }
  }
  q.addEventListener('input', () => { cityEdits++; checkCity(); });
  // Browser history can restore form values without input events, after pageshow/popstate.
  ['pageshow', 'popstate'].forEach(event => addEventListener(event, () => setTimeout(checkCity, 0)));
  ask.addEventListener('click', e => {
    if (typeof dlg.showModal !== 'function') return;
    e.preventDefault(); openForm('quote', {service: st.svc, builder: true, city: q.value.trim(), opener: ask});
  });

  /* ---------- booking: the Google booking page when config has it, otherwise the request form ---------- */
  $$('[data-book]').forEach(a => {
    if (C.bookingUrl){ a.href = C.bookingUrl; a.target = '_blank'; a.rel = 'noopener'; }
    else {
      a.href = 'mailto:' + C.email + '?subject=Cleaning%20request'; a.removeAttribute('target');
      a.addEventListener('click', e => {
        if (typeof dlg.showModal !== 'function') return;
        e.preventDefault(); openForm('book', {service: st.svc, builder: true, opener: a});
      });
    }
  });
  $$('[data-quote]').forEach(b => b.addEventListener('click', e => {
    if (typeof dlg.showModal !== 'function') return;
    e.preventDefault(); openForm('quote', {service: b.dataset.quote, opener: b});
  }));
  $$('[data-ask]').forEach(a => a.addEventListener('click', e => {
    if (typeof dlg.showModal !== 'function') return;
    e.preventDefault(); openForm('quote', {service: 'question', opener: a});
  }));

  /* ---------- quote / request form (FormSubmit, with an email-app fallback) ---------- */
  const dlg = $('#quote'), form = $('#quoteForm'), f = id => document.getElementById(id);
  const note = f('qNote'), sendBtn = f('qSend');
  // Replacing identical text can queue another screen-reader live announcement on every keystroke.
  const liveText = (el, text) => { if (el.textContent !== text) el.textContent = text; };
  const OTHER = {airbnb:'Airbnb turnover', organizing:'Organizing', office:'Office cleaning', other:'Something else'};
  const NOTES_HINT = {airbnb:'Checkout and check-in times, how often, laundry', organizing:'Which space, and how full it is', office:'Size, how often, best times', other:'Tell us what you need'};
  const svcName = id => SVC_NAME[id] || OTHER[id] || id;
  /* "Just a question" turns the same form into a plain question: no sizes, dates or estimate */
  const isQ = () => f('qService').value === 'question';
  const sendLabel = () => isQ() ? 'Send question' : 'Send request';
  const noteDefault = () => isQ() ? 'Your question goes straight to our inbox.' : 'Send request goes straight to our inbox.';
  /* Bedrooms in the form set the home size it prices (Studio and 1 → first size, 6+ → last; baths 1 to 5, 6+) */
  const BEDS_TO_SIZE = [0, 0, 1, 2, 3, 4, 5];
  const formSize = () => Math.min(BEDS_TO_SIZE[f('qBeds').selectedIndex] ?? st.size, Math.max(sizeLabels.length - 1, 0));
  const formBaths = () => bathCount(f('qBaths').selectedIndex + 1);
  let mode = 'quote', opener = null, sending = false, sentSig = null, sentWho = '', backdropPress = false;
  let seededSize = -1, seededWindow = -1;
  let seededService = null, seededCity = null;
  let feedbackSig = null;
  let formBuild = {freq:st.freq, picked:new Set(st.picked)};
  f('qWin').replaceChildren(...C.windows.map(w => { const o = document.createElement('option'); o.value = w.id; o.textContent = w.label; return o; }));

  // Only nonpersonal prefill markers go in this history entry. The browser owns
  // restored form values; never copy contacts, cities, notes or prices into state.
  const FORM_HISTORY_KEY = 'bas-form-v1';
  addEventListener('pagehide', () => {
    if (seededService === null) return;
    try {
      history.replaceState({...history.state, [FORM_HISTORY_KEY]: {
        source:seededService, serviceEdits,
        sizeCurrent:seededSize === sizeEdits, windowCurrent:seededWindow === windowEdits,
        cityCurrent:seededCity !== null && seededCity === q.value.trim()
      }}, '');
    } catch { /* History state can be denied. Ordinary booking still works. */ }
  });
  function adoptHistoryDraft(){
    if (seededService !== null || document.readyState !== 'complete') return;
    try {
      if (performance.getEntriesByType('navigation')[0]?.type !== 'back_forward') return;
      const saved = history.state && history.state[FORM_HISTORY_KEY];
      if (!saved || !/^(quote|book):(builder:\d+|link):(standard|deep|move|airbnb|organizing|office|other|question)$/.test(saved.source)
          || !Number.isSafeInteger(saved.serviceEdits) || saved.serviceEdits < 0
          || !['sizeCurrent','windowCurrent','cityCurrent'].every(key => typeof saved[key] === 'boolean')) return;
      seededService = saved.source; serviceEdits += saved.serviceEdits;
      seededSize = saved.sizeCurrent ? 0 : -1;
      seededWindow = saved.windowCurrent ? 0 : -1;
      if (saved.cityCurrent && cityEdits === 0) seededCity = q.value.trim();
    } catch { /* Missing/old history metadata leaves the normal prefill path. */ }
  }
  addEventListener('pageshow', () => setTimeout(adoptHistoryDraft, 0));
  function openForm(m, o){
    adoptHistoryDraft();
    opener = o.opener || null;
    if (sending){ dlg.showModal(); return; }
    // Keep the open request's estimate stable if the builder is edited while a send is pending.
    formBuild = {freq:st.freq, picked:new Set(st.picked)};
    mode = m;
    clearValidation();
    // Reopening must not silently replace a draft's size/window or re-enable an identical sent request.
    // A fresh builder choice (including tapping its current value) explicitly seeds the form again.
    if (seededWindow !== windowEdits){ f('qWin').value = st.win; seededWindow = windowEdits; }
    // Resume this service draft; a different service link or explicit builder tap starts a new choice.
    const service = o.service || st.svc;
    const source = m + ':' + (o.builder ? 'builder:' + serviceEdits : 'link') + ':' + service;
    if (seededService !== source){ f('qService').value = service; seededService = source; }
    // A changed search prefills its new city; reopening the same search keeps any form correction.
    if (o.city != null && seededCity !== o.city){ f('qCity').value = o.city; seededCity = o.city; }
    if (SVC_IDS.includes(f('qService').value) && seededSize !== sizeEdits){
      f('qBeds').selectedIndex = Math.min(st.size + 1, f('qBeds').options.length - 1);
      f('qBaths').selectedIndex = Math.min(st.baths - 1, f('qBaths').options.length - 1); seededSize = sizeEdits;
    }
    note.className = 'form-note'; note.textContent = ''; delete note.dataset.state; feedbackSig = null;
    renderForm();
    dlg.showModal();
  }
  function closeForm(){
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
  }
  dlg.addEventListener('close', () => { backdropPress = false; if (opener) opener.focus(); });
  $$('[data-close]', dlg).forEach(b => b.addEventListener('click', closeForm));
  const outsideDialog = e => {
    const r = dlg.getBoundingClientRect();
    return e.clientX < r.left || e.clientX >= r.right || e.clientY < r.top || e.clientY >= r.bottom;
  };
  dlg.addEventListener('pointerdown', e => {
    backdropPress = e.isPrimary && e.button === 0 && e.target === dlg && outsideDialog(e);
  });
  dlg.addEventListener('pointercancel', () => { backdropPress = false; });
  dlg.addEventListener('click', e => {
    const dismiss = backdropPress && e.target === dlg && outsideDialog(e);
    backdropPress = false;
    if (dismiss) closeForm();
  });

  function formEstimate(){
    const id = f('qService').value;
    if (SVC_IDS.includes(id)){
      const size = formSize(), est = estimate(id, size, formBuild.freq, formBuild.picked, formBaths());
      const bits = [SVC_LINE[id] + (sizeLabels[size] ? ', ' + sizeLabels[size] : '') + ' ' + money(est.base)];
      if (est.extraBaths) bits.push(est.extraBaths + ' extra ' + (est.extraBaths === 1 ? 'bathroom' : 'bathrooms') + ' ' + money(est.bathCost));
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
    f('qCity').required = !q;
    f('qNotes').required = q; f('qNotes').rows = q ? 5 : 3;
    f('qNotes').placeholder = q ? 'Ask about our services, your city, scheduling, anything.' : NOTES_HINT[id] || 'Pets, parking, how to get in';
    const e = formEstimate();
    liveText(f('qEstPrice'), e.price); liveText(f('qEstNote'), e.note);
    f('qMail').href = 'mailto:' + C.email + '?subject=' + encodeURIComponent(subject()) + '&body=' + encodeURIComponent(requestText());
    syncSent();
  }
  /* after a good send, stay "Sent" until something in the request changes, so a second tap can't send it twice */
  const sig = () => JSON.stringify([mode, fields()]);
  function syncSent(){
    if (sending) return;
    const done = sentSig !== null && sentSig === sig();
    sendBtn.disabled = done; sendBtn.textContent = done ? 'Sent' : sendLabel();
    if (done){ note.className = 'form-note sent'; note.dataset.state = 'ok'; liveText(note, 'Sent. We got your ' + (isQ() ? 'question' : 'request') + ' and will reply to ' + sentWho + '.'); }
    else if (note.dataset.state === 'ok' || note.className === 'form-note'){ note.className = 'form-note'; liveText(note, noteDefault()); delete note.dataset.state; }
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
    if (SVC_IDS.includes(id)){ out.how_often = oneTime(id) ? 'One time' : (C.frequencies.find(x => x.id === formBuild.freq) || {}).label; }
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
  function clearValidation(){
    $$('.field-error', form).forEach(el => el.remove());
    $$('[aria-invalid]', form).forEach(el => {
      el.removeAttribute('aria-invalid');
      const ids = (el.getAttribute('aria-describedby') || '').split(' ').filter(id => id && id !== 'qNote');
      if (ids.length) el.setAttribute('aria-describedby', ids.join(' ')); else el.removeAttribute('aria-describedby');
    });
    if (note.dataset.state === 'validation'){
      note.className = 'form-note'; note.textContent = noteDefault(); delete note.dataset.state;
    }
  }
  function ready(){
    clearValidation();
    const em = f('qEmail').value.trim(), rawPhone = f('qPhone').value.trim(), ph = rawPhone.replace(/\D/g, '');
    note.className = 'form-note err';
    const invalid = (id, message) => {
      const el = f(id);
      // Moving focus can dispatch change on the previous field. Let that render
      // finish before attaching this error, so it cannot erase the new message.
      el.focus(); note.className = 'form-note err';
      note.dataset.state = 'validation'; note.textContent = message;
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', [el.getAttribute('aria-describedby'), 'qNote'].filter(Boolean).join(' '));
      // Keep the explanation beside the field on short screens. qNote remains
      // the live announcement/description; hide this matching visual copy from AT.
      const hint = document.createElement('p'); hint.className = 'form-note err field-error';
      hint.textContent = message; hint.setAttribute('aria-hidden', 'true');
      el.insertAdjacentElement('afterend', hint);
      el.parentElement.scrollIntoView({block:'nearest'});
      return false;
    };
    const q = isQ(), miss = !f('qName').value.trim() ? 'qName' : q ? (!f('qNotes').value.trim() ? 'qNotes' : null) : (!f('qCity').value.trim() ? 'qCity' : null);
    if (miss) return invalid(miss, q ? 'Add your name and your question first.' : 'Add your name and city first so we can quote the right job.');
    if (!em && !rawPhone) return invalid('qEmail', 'Add an email or a mobile number so we can ' + (q ? 'reply.' : 'send your price.'));
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return invalid('qEmail', "That email doesn't look right. Check it and try again.");
    if (rawPhone && (ph.length < 10 || ph.length > 15 || !/^\+?[\d\s().-]+$/.test(rawPhone))) return invalid('qPhone', 'Check your mobile number, including the area code.');
    note.className = 'form-note'; note.textContent = ''; delete note.dataset.state; feedbackSig = null;
    return true;
  }
  function editForm(event){
    if (event.target === f('qBeds') || event.target === f('qBaths')) seededSize = sizeEdits;
    if (event.target === f('qWin')) seededWindow = windowEdits;
    clearValidation();
    // Delivery/email guidance describes the old request, not an edited draft.
    if (['delivery','email'].includes(note.dataset.state) && feedbackSig !== sig()){
      note.className = 'form-note'; delete note.dataset.state; feedbackSig = null;
    }
    renderForm();
  }
  form.addEventListener('input', editForm);
  form.addEventListener('change', editForm);
  f('qMail').addEventListener('click', e => {
    if (sending){ e.preventDefault(); return; }
    if (!ready()){ e.preventDefault(); return; }
    renderForm();
    note.className = 'form-note sent';
    note.textContent = 'If your email app opened, press send there. Otherwise, email us at ' + C.email + '. Your details are still here.';
    note.dataset.state = 'email'; feedbackSig = sig();
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (sending || sentSig === sig() || !ready() || f('qHoney').value) return;
    const o = fields(), who = o.email || o.phone, s = sig();
    const payload = Object.assign({_subject: subject(), _template: 'table', _honey: ''}, o);
    sending = true; sendBtn.disabled = true; sendBtn.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    f('qMail').setAttribute('aria-disabled', 'true');
    const controls = $$('input,select,textarea', form).map(el => [el, el.disabled]);
    controls.forEach(([el]) => { el.disabled = true; });
    note.className = 'form-note'; note.textContent = 'Sending your ' + (isQ() ? 'question' : 'request') + '…';
    const ctrl = window.AbortController ? new AbortController() : null;
    let settled = false;
    const release = () => {
      clearTimeout(timer); sending = false;
      controls.forEach(([el, disabled]) => { el.disabled = disabled; });
      form.removeAttribute('aria-busy'); f('qMail').removeAttribute('aria-disabled');
    };
    const failed = () => {
      if (settled) return;
      settled = true; release();
      sendBtn.disabled = false; sendBtn.textContent = sendLabel();
      note.className = 'form-note err';
      note.textContent = "We couldn't confirm delivery. Your details are still here. Tap Email it instead, or write to " + C.email + '.';
      note.dataset.state = 'delivery'; feedbackSig = s;
    };
    // Always end the wait, even when AbortController is unavailable or a response
    // arrives after the deadline. A late response must never change a retry's state.
    const timer = setTimeout(() => { failed(); if (ctrl) ctrl.abort(); }, 12000);
    Promise.resolve().then(() => fetch(C.quoteEndpoint, {method: 'POST', headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}, body: JSON.stringify(payload), signal: ctrl ? ctrl.signal : undefined}))
      .then(r => { if (!r.ok) throw new Error('Delivery failed'); return r.json(); })
      .then(r => {
        if (settled) return;
        if (!r || !(r.success === true || r.success === 'true')) return failed();
        settled = true; release();
        sentSig = s; sentWho = who;
        syncSent();
      })
      .catch(failed);
  });
  /* Keep the static booking/email paths until every enhancement is ready. */
  $$('button', svcSeg).forEach(b => { b.disabled = false; });
  document.documentElement.classList.replace('no-js', 'js');
  showPhotoState(); // Measure the loading list only after the enhanced builder is visible.
})();
