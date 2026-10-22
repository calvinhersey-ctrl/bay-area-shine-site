/* Bay Area Shine site settings: links, prices, policies and reviews.
   main.js reads these keys, so the page never hard-codes them. Load this file first. */
window.BAS_CONFIG = {
  email: "hello@bayareashinecleaners.com",

  // App promotion stays OFF until the public listing, approved screenshot and
  // release copy are checked and the owner approves the website release.
  // One switch controls the hero, app links, /app and Safari banner together.
  appPromotion: {
    enabled: true,
    // false until the app is public in the App Store: the launch design shows, but every badge, QR code,
    // Safari banner and store link becomes "Get early access" → /beta/. true = badge, QR and banner point at storeUrl.
    storeLive: false,
    storeUrl: "https://apps.apple.com/app/id6822942016",
    // Actual Cleaning now UI with the owner-approved real cleaner profile.
    // Fictional job/home only; no customer details or sample portraits.
    screenshot: {
      src: "img/app-cleaning-profile.webp?v=2026-10-22-flip",
      width: 1206,
      height: 2622,
      alt: "Bay Area Shine app showing Cleaning now with your cleaner’s photo, rating and message and call buttons"
    }
  },

  // Launch-day switch for the Book buttons. false = every Book button opens the Calendar page below, worded "Request a time".
  // true = Book buttons open the web app (Android and computers), or the App Store on iPhone once appPromotion.storeLive is true.
  // Flip to true only at the live-payments cutover, on the owner's OK (notes/booking-launch.md, "Web app launch").
  webApp: {
    live: true,
    url: "https://app.bayareashinecleaners.com/"
  },

  // Google Calendar booking page. Empty = Book buttons open the request form.
  // Google's booking page can't open on a chosen window; the visitor taps the matching start time there.
  bookingUrl: "https://calendar.google.com/calendar/appointments/schedules/AcZssZ2Wwjx2FFDg3RgHEk2cQYq_syutLqoAJwA_ZfKUwuwO08z3pgCuJb4vVCWDGLgxNbFf8F5uq_d3",

  depositAmount: 40,
  depositUrl: "https://buy.stripe.com/6oUcN77PZ596cV55XDdjO0d",

  // FormSubmit: POST JSON with Content-Type and Accept set to application/json.
  // The first real submission triggers a one-time activation email to the inbox;
  // nothing is delivered until that link is clicked.
  quoteEndpoint: "https://formsubmit.co/ajax/bayareashinecleaners@gmail.com",

  windows: [
    { id: "morning", part: "Morning", label: "8–11 AM" },
    { id: "midday", part: "Midday", label: "11 AM–2 PM" },
    { id: "afternoon", part: "Afternoon", label: "2–5 PM" }
  ],

  // "from" prices for Step 1. Included extras show as included and are never charged.
  services: {
    standard: { from: 150, includes: [] },
    deep: { from: 230, includes: ["baseboards", "windows"] },
    move: { from: 280, includes: ["oven", "fridge", "cabinets", "baseboards", "windows"], oneTimeOnly: true }
  },

  // Home-size prices, one per label. Bathrooms, extras and recurring discounts apply on top.
  sizes: {
    labels: ["Studio / 1 bed", "2 bed", "3 bed", "4 bed", "5 bed", "6+ bed"],
    standard: [150, 185, 235, 280, 340, 400],
    deep: [230, 315, 405, 490, 595, 700],
    move: [280, 380, 480, 580, 705, 830],
    // Bathrooms included in each size's price; each one beyond that adds extraBath[service]. 6+ baths is priced as 6.
    bathsIncluded: [1, 2, 2, 3, 3, 4],
    extraBath: { standard: 20, deep: 35, move: 40 },
    maxBaths: 6
  },


  extras: {
    oven: { label: "Inside oven", price: 35 },
    fridge: { label: "Inside fridge", price: 35 },
    cabinets: { label: "Inside cabinets", price: 40 },
    baseboards: { label: "Baseboards", price: 30 },
    windows: { label: "Windows", price: 40, from: true },
    laundry: { label: "Laundry, 1 load", price: 25 }
  },

  // Move-in/move-out is one time only (services.move.oneTimeOnly).
  frequencies: [
    { id: "once", label: "One time", off: 0 },
    { id: "weekly", label: "Weekly", off: 0.10 },
    { id: "biweekly", label: "Every 2 weeks", off: 0.07 },
    { id: "monthly", label: "Monthly", off: 0.05 }
  ],

  organizing: { hourly: 55, minHours: 3 },
  referralCredit: 25,

  policies: {
    rescheduleHours: 48,
    recleanHours: 24,
    unpaidReleaseHours: 24,
    depositNonRefundable: true,
    depositCredited: true
  },

  // Client reviews, copied exactly, never edited or invented: { quote: "...", byline: "First L. · City" }.
  // Empty = no review cards are shown.
  reviews: [
    { quote: "The quality of work and attention to detail is unmatched. I definitely will use Bay Area Shine in the future.", byline: "Raymeshia W. · Antioch" },
    { quote: "Amazing service! Super reliable, detail-oriented, and my place has never looked better. Highly recommend!", byline: "Vanessa P. · Berkeley" },
    { quote: "This company is amazing! I'm definitely hiring them again! Highly recommend 👌", byline: "Karen M. · Walnut Creek" }
  ]
};

/* Where the Book buttons go (see webApp above). main.js and pages.js set every [data-book] link from bookingUrl, so
   when the web app is live this file swaps bookingUrl for the app address and sets bookingIsCalendar false (main.js then
   hides the Calendar-only "tap the ... start" hints). Before launch the Calendar page stays and the buttons say "Request a time". */
(function (C) {
  var W = C.webApp, A = C.appPromotion, live = !!(W && W.live === true && W.url);
  C.bookingIsCalendar = !live;
  if (live) {
    var iphone = /iPhone|iPod/.test(navigator.userAgent || '');
    C.bookingUrl = (iphone && A && A.enabled === true && A.storeLive === true && A.storeUrl) ? A.storeUrl : W.url;
  }
  function relabel() {
    document.querySelectorAll('[data-book]').forEach(function (a) {
      var arrow = a.querySelector('[aria-hidden="true"]'), lg = a.querySelector('.lg-only');
      if (live && /on the web/i.test(a.textContent)) a.href = W.url; // the app-first layout's web option stays the web app, even on iPhone
      if (lg && !live) {
        var s = document.createElement('span'), l = document.createElement('span');
        l.className = 'lg-only'; l.textContent = ' a time'; s.append('Request', l); a.replaceChildren(s);
      } else if (!lg && !live) {
        a.replaceChildren('Request a time' + (arrow ? ' ' : ''), arrow || '');
      } else if (!lg && /^\s*See open times/.test(a.textContent)) {
        a.replaceChildren('Book a cleaning' + (arrow ? ' ' : ''), arrow || '');
      }
    });
  }
  if (typeof document === 'undefined') return; // the app repo's price test loads this file outside a browser
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', relabel); else relabel();
})(window.BAS_CONFIG);
