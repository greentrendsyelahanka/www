/**
 * leads.js — Green Trends Lead Capture v3.0
 * ─────────────────────────────────────────────────────────────────
 * Drop-in script for any landing page. Include after bundlejs.
 *
 * CONFIGURE per page (before <script src="leads.js">):
 *   <script>
 *     window.GT_CONFIG = {
 *       sheetUrl  : 'https://script.google.com/macros/s/YOUR_ID/exec',
 *       salonName : 'Green Trends Yelahanka',
 *       phone     : '08040965666'
 *     };
 *   </script>
 *
 * FORM HTML (any landing page):
 *   Add data-gt-* attributes — see form-snippet.html
 *
 * CHATBOT: auto-injected as floating widget, no extra HTML needed.
 * ─────────────────────────────────────────────────────────────────
 */
(function (win, doc) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════
     § 1  CONFIG
  ═══════════════════════════════════════════════════════════════════ */
  var CFG = Object.assign({
    sheetUrl: '',
    salonName: 'Green Trends',
    phone: '08040965666',
    services: ['Hair Services', 'Bridal', 'Skin Care', 'Nail Art', 'Hair Colour', 'Other'],
    chatGreeting: 'Hi! Welcome to Green Trends \u2728 How can I help you today?'
  }, win.GT_CONFIG || {});

  /* ═══════════════════════════════════════════════════════════════════
     § 2  SESSION · UTM · IP TRACKING
  ═══════════════════════════════════════════════════════════════════ */
  var SESSION = (function () {
    var stored = {};
    try { stored = JSON.parse(sessionStorage.getItem('_gt_sess') || '{}'); } catch (e) { }

    var qs = new URLSearchParams(win.location.search);
    var get = function (k) { return qs.get(k) || stored[k] || ''; };

    var s = {
      utm_source: get('utm_source'),
      utm_medium: get('utm_medium'),
      utm_campaign: get('utm_campaign'),
      utm_term: get('utm_term'),
      utm_content: get('utm_content'),
      referral_url: doc.referrer || stored.referral_url || '',
      landing_page: win.location.href,
      visit_time: stored.visit_time || _now(),
      ip_address: stored.ip_address || ''
    };

    function _save() {
      try { sessionStorage.setItem('_gt_sess', JSON.stringify(s)); } catch (e) { }
    }
    _save();

    /* Fetch IP async — persists across pages in same session */
    if (!s.ip_address) {
      fetch('https://api.ipify.org?format=json')
        .then(function (r) { return r.json(); })
        .then(function (d) { s.ip_address = d.ip || ''; _save(); })
        .catch(function () { });
    }

    return s;
  }());

  function _now() {
    return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  }

  /** Map utm_source → sheet tab name */
  function _sheetTab() {
    var src = (SESSION.utm_source || '').toLowerCase();
    if (/google|goog|pmax|g_ads|googleads/.test(src)) return 'Google Leads';
    if (/facebook|fb|meta|instagram|ig|insta/.test(src)) return 'Meta Leads';
    return 'Other Leads';
  }

  /* ═══════════════════════════════════════════════════════════════════
      § 3  LEAD SUBMISSION  (GET → Apps Script → correct sheet tab)
   ═══════════════════════════════════════════════════════════════════ */
function _submitLead(data, onSuccess, onError) {
  if (!CFG.sheetUrl) { onError(new Error('GT_CONFIG.sheetUrl not set')); return; }

  var mobile = (data.mobile || '').replace(/\D/g, '').slice(-10);

  var params = new URLSearchParams({
    Name         : data.name         || '',
    Mobile       : '+91' + mobile,
    Service      : data.service      || '',
    Source       : data.source       || 'Website Form',
    SheetTab     : _sheetTab(),
    UTM_Source   : SESSION.utm_source || '',
    UTM_Medium   : SESSION.utm_medium || '',
    UTM_Campaign : SESSION.utm_campaign || '',
    UTM_Term     : SESSION.utm_term || '',
    UTM_Content  : SESSION.utm_content || '',
    Referral_URL : SESSION.referral_url || '',
    Landing_Page : SESSION.landing_page || '',
    Visit_Time   : SESSION.visit_time || '',
    Submit_Time  : _now(),
    IP_Address   : SESSION.ip_address || ''
  });

  // Using 'no-cors' mode to bypass Google's redirect-CORS trap.
  // Note: We won't be able to read the JSON response, but since it's 200 OK,
  // we know the data hit the script successfully.
  fetch(CFG.sheetUrl + '?' + params.toString(), {
    method: 'GET',
    mode: 'no-cors', 
    cache: 'no-cache'
  })
  .then(function () {
    // With no-cors, we assume success if the promise resolves
    onSuccess({ status: 'success' });
  })
  .catch(function (err) {
    console.error('Fetch Error:', err);
    onError(err);
  });
}
  /* ═══════════════════════════════════════════════════════════════════
     § 4  GENERIC FORM HANDLER  (data-gt-* attributes)
         <form data-gt-form>
           <input data-gt-name    ...>
           <input data-gt-mobile  ...>
           <select data-gt-service...>
           <span  data-gt-err="name">Name required</span>
           <span  data-gt-err="mobile">Valid mobile required</span>
           <span  data-gt-err="service">Please select a service</span>
           <div   data-gt-fields>   (wraps all fields — hidden on success)
           <div   data-gt-success>  (shown on success)
           <button data-gt-submit>Submit</button>
           <p data-gt-error-msg></p>
         </form>
  ═══════════════════════════════════════════════════════════════════ */
  function _initForms() {
    doc.querySelectorAll('[data-gt-form]').forEach(function (form) {
      var btn = form.querySelector('[data-gt-submit]');
      var errMsg = form.querySelector('[data-gt-error-msg]');
      if (!btn) return;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        _handleFormSubmit(form, btn, errMsg);
      });
    });
  }

  function _fv(form, attr) {
    var el = form.querySelector('[data-gt-' + attr + ']');
    return el ? el.value.trim() : '';
  }
  function _showErr(form, field) {
    var el = form.querySelector('[data-gt-err="' + field + '"]');
    if (el) { el.style.display = 'block'; }
  }
  function _hideErr(form, field) {
    var el = form.querySelector('[data-gt-err="' + field + '"]');
    if (el) { el.style.display = 'none'; }
  }
  function _setBtnState(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? 'Submitting\u2026' : 'Submit';
  }

  function _handleFormSubmit(form, btn, errMsg) {
    var name = _fv(form, 'name');
    var mobile = _fv(form, 'mobile');
    var service = _fv(form, 'service');
    var digits = mobile.replace(/\D/g, '').slice(-10);
    var ok = true;

    ['name', 'mobile', 'service'].forEach(function (f) { _hideErr(form, f); });
    if (errMsg) errMsg.style.display = 'none';

    if (!name) { _showErr(form, 'name'); ok = false; }
    if (!digits || digits.length < 10) { _showErr(form, 'mobile'); ok = false; }
    if (!service) { _showErr(form, 'service'); ok = false; }
    if (!ok) return;

    _setBtnState(btn, true);

    _submitLead(
      { name: name, mobile: digits, service: service, source: 'Website Form' },
      function () {
        _setBtnState(btn, false);
        /* clear */
        form.querySelectorAll('[data-gt-name],[data-gt-mobile],[data-gt-service]').forEach(function (el) {
          el.value = '';
        });
        /* show success state */
        var fields = form.querySelector('[data-gt-fields]');
        var success = form.querySelector('[data-gt-success]');
        if (fields) fields.style.display = 'none';
        if (success) success.style.display = 'block';
      },
      function (err) {
        _setBtnState(btn, false);
        if (errMsg) {
          errMsg.textContent = 'Something went wrong. Please try again.';
          errMsg.style.display = 'block';
        }
        console.error('[GT Form]', err);
      }
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     § 5  LEGACY FORM COMPAT  (existing index.html field IDs)
         Called by: onclick="submitToGoogleSheets('main', this)"
  ═══════════════════════════════════════════════════════════════════ */
  win.submitToGoogleSheets = function (formType, btn) {
    var isPopup = (formType === 'popup');
    var sfx = isPopup ? '_1' : '';

    function gv(id) { var e = doc.getElementById(id); return e ? e.value.trim() : ''; }
    function showSpan(id) { var e = doc.getElementById(id); if (e) { e.style.display = 'block'; e.classList.add('sk-show'); } }
    function hideSpan(id) { var e = doc.getElementById(id); if (e) { e.style.display = ''; e.classList.remove('sk-show'); } }

    var name = gv('txtName' + sfx);
    var contact = gv('txtContact' + sfx);
    var product = gv('hdnProduct' + sfx);
    var ok = true;

    if (!name) { showSpan('txtNameReq' + sfx); ok = false; } else { hideSpan('txtNameReq' + sfx); }
    if (!contact || contact.length < 10) { showSpan('txtContactReq' + sfx); ok = false; } else { hideSpan('txtContactReq' + sfx); }
    if (!product) { showSpan('txtProductReq' + sfx); ok = false; } else { hideSpan('txtProductReq' + sfx); }
    if (!ok) return;

    _setBtnState(btn, true);
    var errEl = doc.getElementById(isPopup ? 'gs-err-popup' : 'gs-err-main');
    if (errEl) errEl.style.display = 'none';

    _submitLead(
      { name: name, mobile: contact, service: product, source: 'Website Form' },
      function () {
        _setBtnState(btn, false);
        /* clear fields */
        ['txtName', 'txtContact', 'hdnProduct'].forEach(function (id) {
          var e = doc.getElementById(id + sfx); if (e) e.value = '';
        });
        var ps = doc.getElementById('ProductSelected' + sfx);
        if (ps) ps.innerHTML = 'Select product';
        /* show existing success UI */
        var hdr = doc.getElementById('eotp_emp'); if (hdr) hdr.innerHTML = '';
        var otp = doc.getElementById('otpWrapper'); if (otp) otp.classList.add('sk-hide');
        var msg = doc.getElementById('pmsgid'); if (msg) msg.classList.add('sk-show');
        var panel = doc.getElementById('Contact'); if (panel) panel.classList.add('sk-show');
        if (isPopup) {
          var popup = doc.getElementById('dvaMenuContactpopup');
          if (popup) { popup.classList.remove('sk-show'); popup.classList.remove('sk-contact'); }
          doc.body.classList.remove('sk-no-scroll');
        }
      },
      function (err) {
        _setBtnState(btn, false);
        if (errEl) { errEl.textContent = 'Something went wrong. Please try again.'; errEl.style.display = 'block'; }
        console.error('[GT Legacy Form]', err);
      }
    );
  };

  /* ═══════════════════════════════════════════════════════════════════
     § 6  STUB legacy OTP / ProManage / analytics functions
  ═══════════════════════════════════════════════════════════════════ */
  function _stubLegacy() {
    var noop = function () { };
    [
      'sendOTP', 'sendOTP_1', 'sendwithoutOTP', 'sendwithoutOTP_1',
      'submitContact', 'submitContact_sundaram', 'fncallclientapi',
      'onresendOTP', 'verifyOtpIfFilled', 'fnchangeno', 'closeOtp',
      'gaclicktrack', 'gtag', 'fbq'
    ].forEach(function (fn) { win[fn] = noop; });

    /* Redirect legacy sendOTP_gt callers */
    win.sendOTP_gt = function () { win.submitToGoogleSheets('main', doc.getElementById('gs-btn-main')); };
    win.sendOTP_gt_1 = function () { win.submitToGoogleSheets('popup', doc.getElementById('gs-btn-popup')); };

    /* Intercept any remaining ProManage / OTP fetch calls */
    if (!win._gt_patched) {
      win._gt_patched = true;
      var _orig = win.fetch;
      win.fetch = function (url, opts) {
        var u = String(typeof url === 'string' ? url : ((url && url.url) || ''));
        var fakeOk = function (body) {
          return Promise.resolve({
            ok: true, status: 200,
            json: function () { return Promise.resolve(body); },
            text: function () { return Promise.resolve(JSON.stringify(body)); }
          });
        };
        if (u.indexOf('inboxapi.promanage.biz') !== -1) return fakeOk({ status: 'ok', errormgs: 'success' });
        if (u.indexOf('/API/verifiedOTP') !== -1) return fakeOk({ errormgs: 'success' });
        if (u.indexOf('/API/verifiedOTPEncrypted') !== -1) return fakeOk({ errormgs: 'success' });
        if (u.indexOf('/API/sendOTP') !== -1) return fakeOk({ errormgs: 'success', Status: 'true' });
        if (u.indexOf('/Process/sendotp') !== -1) return fakeOk({ errormgs: 'success', Status: 'true' });
        return _orig.apply(this, arguments);
      };
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     § 7  CHATBOT WIDGET
  ═══════════════════════════════════════════════════════════════════ */

  /* ── Conversation flow ── */
  var FLOW = {
    GREETING: 0,
    SERVICE: 1,
    NAME: 2,
    MOBILE: 3,
    DONE: 4,
    CALLBACK: 5   /* "call me back" branch */
  };

  var chat = {
    step: -1,
    open: false,
    lead: { name: '', mobile: '', service: '' }
  };

  function _injectChatCSS() {
    var s = doc.createElement('style');
    s.textContent = [
      /* Widget wrapper */
      '#gtcw{position:fixed;bottom:24px;right:24px;z-index:99999;font-family:Arial,sans-serif;font-size:14px}',
      /* Toggle button */
      '#gtcw-btn{width:58px;height:58px;border-radius:50%;background:#028c36;border:none;cursor:pointer;',
      'box-shadow:0 4px 16px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;',
      'transition:transform .2s;position:relative}',
      '#gtcw-btn:hover{transform:scale(1.08)}',
      '#gtcw-btn svg{fill:#fff;width:26px;height:26px}',
      /* Notification dot */
      '#gtcw-dot{position:absolute;top:4px;right:4px;width:13px;height:13px;border-radius:50%;',
      'background:#ff3b30;border:2.5px solid #fff;display:none}',
      /* Chat box */
      '#gtcw-box{width:330px;background:#fff;border-radius:18px;',
      'box-shadow:0 10px 40px rgba(0,0,0,.18);display:none;flex-direction:column;',
      'overflow:hidden;position:absolute;bottom:70px;right:0;max-height:520px}',
      '#gtcw-box.open{display:flex}',
      /* Header */
      '#gtcw-hd{background:linear-gradient(135deg,#028c36,#04b347);padding:14px 16px;',
      'display:flex;align-items:center;justify-content:space-between;flex-shrink:0}',
      '#gtcw-hd-info{display:flex;align-items:center;gap:10px}',
      '#gtcw-av{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.2);',
      'display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}',
      '#gtcw-hd h4{color:#fff;margin:0;font-size:14px;font-weight:700;line-height:1.3}',
      '#gtcw-hd p{color:rgba(255,255,255,.82);margin:0;font-size:11px}',
      '#gtcw-close{background:none;border:none;color:rgba(255,255,255,.85);font-size:22px;',
      'cursor:pointer;line-height:1;padding:0 2px}',
      /* Messages */
      '#gtcw-msgs{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;',
      'gap:9px;scroll-behavior:smooth}',
      '.gtm{max-width:82%;padding:9px 13px;border-radius:14px;line-height:1.5;font-size:13px;',
      'animation:gtFade .22s ease}',
      '.gtm.bot{background:#f1f1f1;color:#222;align-self:flex-start;border-bottom-left-radius:3px}',
      '.gtm.usr{background:#028c36;color:#fff;align-self:flex-end;border-bottom-right-radius:3px}',
      '.gtm.err{background:#fdecea;color:#c0392b;align-self:flex-start;font-size:12px;border-radius:10px}',
      '.gtm.sys{background:#fff8e1;color:#795548;align-self:center;font-size:11px;border-radius:8px;padding:5px 10px}',
      /* Quick replies */
      '.gtqr{display:flex;flex-wrap:wrap;gap:7px;padding:2px 0 0 0;align-self:flex-start}',
      '.gtqr button{padding:7px 13px;border:1.5px solid #028c36;border-radius:20px;background:#fff;',
      'color:#028c36;font-size:12px;cursor:pointer;transition:all .15s;font-weight:500}',
      '.gtqr button:hover{background:#028c36;color:#fff}',
      /* Typing indicator */
      '.gt-typ{display:flex;align-items:center;gap:5px;padding:10px 14px;background:#f1f1f1;',
      'border-radius:14px;align-self:flex-start;border-bottom-left-radius:3px}',
      '.gt-typ span{width:7px;height:7px;border-radius:50%;background:#bbb;animation:gtBounce 1.1s infinite}',
      '.gt-typ span:nth-child(2){animation-delay:.18s}',
      '.gt-typ span:nth-child(3){animation-delay:.36s}',
      /* Input row */
      '#gtcw-inp-row{padding:10px 12px;border-top:1px solid #eee;display:flex;gap:8px;',
      'align-items:center;flex-shrink:0}',
      '#gtcw-inp{flex:1;border:1.5px solid #ddd;border-radius:22px;padding:9px 15px;font-size:13px;',
      'outline:none;transition:border .2s;background:#fff}',
      '#gtcw-inp:focus{border-color:#028c36}',
      '#gtcw-inp:disabled{background:#f8f8f8;color:#aaa}',
      '#gtcw-send{width:36px;height:36px;min-width:36px;border-radius:50%;background:#028c36;',
      'border:none;cursor:pointer;display:flex;align-items:center;justify-content:center}',
      '#gtcw-send:disabled{background:#ccc;cursor:not-allowed}',
      '#gtcw-send svg{fill:#fff;width:16px;height:16px}',
      '@keyframes gtFade{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}',
      '@keyframes gtBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}}',
      /* Mobile adjustments */
      '@media(max-width:400px){#gtcw-box{width:calc(100vw - 32px);right:-8px}}'
    ].join('');
    doc.head.appendChild(s);
  }

  function _injectChatHTML() {
    var w = doc.createElement('div');
    w.id = 'gtcw';
    w.innerHTML = (
      '<button id="gtcw-btn" aria-label="Chat with us">' +
      '<span id="gtcw-dot"></span>' +
      '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>' +
      '</button>' +
      '<div id="gtcw-box" role="dialog" aria-label="Chat">' +
      '<div id="gtcw-hd">' +
      '<div id="gtcw-hd-info">' +
      '<div id="gtcw-av">\u2702\uFE0F</div>' +
      '<div><h4>' + CFG.salonName + '</h4><p>&#128172; Replies instantly</p></div>' +
      '</div>' +
      '<button id="gtcw-close" aria-label="Close">\u2715</button>' +
      '</div>' +
      '<div id="gtcw-msgs" aria-live="polite"></div>' +
      '<div id="gtcw-inp-row">' +
      '<input id="gtcw-inp" type="text" placeholder="Type a message\u2026" autocomplete="off" disabled>' +
      '<button id="gtcw-send" aria-label="Send" disabled>' +
      '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
      '</button>' +
      '</div>' +
      '</div>'
    );
    doc.body.appendChild(w);

    doc.getElementById('gtcw-btn').addEventListener('click', _chatToggle);
    doc.getElementById('gtcw-close').addEventListener('click', function () { _chatOpen(false); });
    doc.getElementById('gtcw-send').addEventListener('click', _chatSend);
    doc.getElementById('gtcw-inp').addEventListener('keydown', function (e) { if (e.key === 'Enter') _chatSend(); });
  }

  /* ── Open / close ── */
  function _chatToggle() { _chatOpen(!chat.open); }
  function _chatOpen(state) {
    chat.open = state;
    var box = doc.getElementById('gtcw-box');
    if (box) box.classList.toggle('open', state);
    if (state) {
      doc.getElementById('gtcw-dot').style.display = 'none';
      if (chat.step === -1) _chatStart();
    }
  }

  /* ── Append a bubble ── */
  function _bubble(text, cls) {
    var msgs = doc.getElementById('gtcw-msgs');
    var el = doc.createElement('div');
    el.className = 'gtm ' + cls;
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }

  /* ── Bot says (with typing delay) ── */
  function _botSay(text, delay, callback) {
    delay = delay || 700;
    var msgs = doc.getElementById('gtcw-msgs');
    /* typing indicator */
    var typ = doc.createElement('div');
    typ.className = 'gt-typ';
    typ.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(typ);
    msgs.scrollTop = msgs.scrollHeight;

    setTimeout(function () {
      typ.remove();
      _bubble(text, 'bot');
      if (callback) callback();
    }, delay);
  }

  /* ── Quick reply buttons ── */
  function _quickReplies(options, onPick) {
    var msgs = doc.getElementById('gtcw-msgs');
    var qr = doc.createElement('div');
    qr.className = 'gtqr';
    options.forEach(function (opt) {
      var btn = doc.createElement('button');
      btn.textContent = opt;
      btn.addEventListener('click', function () { qr.remove(); onPick(opt); });
      qr.appendChild(btn);
    });
    msgs.appendChild(qr);
    msgs.scrollTop = msgs.scrollHeight;
  }

  /* ── Enable / disable text input ── */
  function _inputEnable(placeholder) {
    var inp = doc.getElementById('gtcw-inp');
    var send = doc.getElementById('gtcw-send');
    if (inp) { inp.disabled = false; inp.placeholder = placeholder || 'Type here\u2026'; inp.focus(); }
    if (send) send.disabled = false;
  }
  function _inputDisable(placeholder) {
    var inp = doc.getElementById('gtcw-inp');
    var send = doc.getElementById('gtcw-send');
    if (inp) { inp.disabled = true; inp.value = ''; inp.placeholder = placeholder || ''; }
    if (send) send.disabled = true;
  }

  /* ── Conversation start ── */
  function _chatStart() {
    chat.step = FLOW.GREETING;
    _botSay(CFG.chatGreeting, 500, function () {
      _quickReplies(
        ['Book Appointment', 'Know Our Services', 'Offers & Packages', 'Call Me Back'],
        _chatOnGreeting
      );
    });
  }

  /* ── Step handlers ── */
  function _chatOnGreeting(choice) {
    _bubble(choice, 'usr');
    if (choice === 'Call Me Back') {
      chat.step = FLOW.CALLBACK;
      _botSay('Sure! May I know your name?', 700, function () { _inputEnable('Your name'); });
      return;
    }
    if (choice === 'Know Our Services') {
      _botSay('We offer: ' + CFG.services.slice(0, -1).join(', ') + ' and more! Which interests you?', 700, function () {
        chat.step = FLOW.SERVICE;
        _quickReplies(CFG.services, _chatOnService);
      });
      return;
    }
    if (choice === 'Offers & Packages') {
      _botSay('We have great packages! Let me help you book. Which service are you looking for?', 700, function () {
        chat.step = FLOW.SERVICE;
        _quickReplies(CFG.services, _chatOnService);
      });
      return;
    }
    /* Book Appointment */
    chat.step = FLOW.SERVICE;
    _botSay('Great! Which service would you like to book?', 700, function () {
      _quickReplies(CFG.services, _chatOnService);
    });
  }

  function _chatOnService(service) {
    _bubble(service, 'usr');
    chat.lead.service = service;
    chat.step = FLOW.NAME;
    _botSay('Perfect! May I know your name?', 700, function () { _inputEnable('Your full name'); });
  }

  function _chatHandleText(text) {
    switch (chat.step) {

      case FLOW.NAME:
      case FLOW.CALLBACK:
        if (!text || text.trim().length < 2) {
          _bubble('Please enter your name (at least 2 characters).', 'err'); return;
        }
        chat.lead.name = text.trim();
        chat.step = FLOW.MOBILE;
        _botSay('Thanks, ' + chat.lead.name + '! What\'s your mobile number?', 700, function () {
          _inputEnable('10-digit mobile number');
        });
        break;

      case FLOW.MOBILE:
        var digits = text.replace(/\D/g, '').slice(-10);
        if (!digits || digits.length < 10 || !/^[6-9]/.test(digits)) {
          _bubble('Please enter a valid 10-digit mobile number.', 'err'); return;
        }
        chat.lead.mobile = digits;
        _chatSubmit();
        break;

      default:
        /* Restart if user types after completion */
        if (chat.step === FLOW.DONE) {
          _bubble('Type anything to start again or close the chat.', 'sys');
        }
        break;
    }
  }

  function _chatSubmit() {
    _inputDisable('Please wait\u2026');
    _bubble(chat.lead.mobile, 'usr');

    /* typing while waiting for API */
    var msgs = doc.getElementById('gtcw-msgs');
    var typ = doc.createElement('div');
    typ.className = 'gt-typ';
    typ.id = 'gtcw-waiting';
    typ.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(typ);
    msgs.scrollTop = msgs.scrollHeight;

    _submitLead(
      {
        name: chat.lead.name,
        mobile: chat.lead.mobile,
        service: chat.lead.service || 'Chat Enquiry',
        source: 'Chatbot'
      },
      function () {
        var w = doc.getElementById('gtcw-waiting'); if (w) w.remove();
        chat.step = FLOW.DONE;
        _bubble(
          'Thank you, ' + chat.lead.name + '! \uD83C\uDF89 Our team will call you at +91' +
          chat.lead.mobile + ' shortly.',
          'bot'
        );
        setTimeout(function () {
          _quickReplies(['Book Another Service', 'No Thanks, Bye!'], function (opt) {
            _bubble(opt, 'usr');
            if (opt === 'Book Another Service') {
              chat.lead = { name: chat.lead.name, mobile: chat.lead.mobile, service: '' };
              chat.step = FLOW.SERVICE;
              _botSay('Sure! Which service would you like?', 600, function () {
                _quickReplies(CFG.services, _chatOnService);
              });
            } else {
              _botSay('Thank you for visiting ' + CFG.salonName + '! Have a great day! \uD83D\uDE0A', 600);
              _inputDisable('Chat ended');
            }
          });
        }, 800);
      },
      function (err) {
        var w = doc.getElementById('gtcw-waiting'); if (w) w.remove();
        _bubble('Sorry, something went wrong. Please call us at ' + CFG.phone + ' directly.', 'err');
        /* retry — go back to mobile step */
        chat.step = FLOW.MOBILE;
        setTimeout(function () { _inputEnable('Re-enter mobile to retry'); }, 500);
        console.error('[GT Chat]', err);
      }
    );
  }

  /* ── Send button / Enter key ── */
  function _chatSend() {
    var inp = doc.getElementById('gtcw-inp');
    if (!inp || inp.disabled) return;
    var val = inp.value.trim();
    if (!val) return;
    inp.value = '';
    _chatHandleText(val);
  }

  /* ── Show notification dot after delay ── */
  function _chatInitNotif() {
    setTimeout(function () {
      var dot = doc.getElementById('gtcw-dot');
      if (dot && !chat.open) dot.style.display = 'block';
    }, 4000);
  }

  /* ═══════════════════════════════════════════════════════════════════
     § 8  INIT
  ═══════════════════════════════════════════════════════════════════ */
  function _init() {
    _stubLegacy();
    _initForms();
    _injectChatCSS();
    _injectChatHTML();
    _chatInitNotif();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

}(window, document));
