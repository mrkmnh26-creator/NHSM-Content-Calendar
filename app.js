/* =========================================================
   NH Content Calendar — Frontend (GitHub Pages)
   Backend: Google Apps Script (JSON API) → config.js এ API_URL
   ========================================================= */
(function () {
  'use strict';

  var CFG = window.APP_CONFIG || {};

  /* ---------- constants ---------- */
  var LS = { cache: 'nh_cache_v2', key: 'nh_key', notif: 'nh_notif_on', notifDay: 'nh_notif_day', bannerDay: 'nh_banner_day', calMode: 'nh_cal_mode' };
  var TAGS = [
    { name: 'Poultry Feed', cls: 'green' },
    { name: 'Fish Feed', cls: 'blue' },
    { name: 'Cattle Feed', cls: 'orange' },
    { name: 'Others', cls: 'gray' }
  ];
  var PLATFORMS = ['Facebook', 'Instagram', 'LinkedIn', 'YouTube', 'TikTok', 'Others'];
  var DSTATUS = [{ k: 'Draft', l: 'ড্রাফট' }, { k: 'Ready', l: 'প্রস্তুত' }, { k: 'Used', l: 'ব্যবহৃত' }];
  var PSTATUS = ['Pending', 'Done', 'Postpone'];
  var DOW = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
  var DOWFULL = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  var MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- tiny helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var icon = function (n) { return '<svg class="i" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var dk = function (y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); };
  var ymd = function (dt) { return dk(dt.getFullYear(), dt.getMonth(), dt.getDate()); };
  var parseKey = function (k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  var todayKey = function () { return ymd(new Date()); };
  var addDays = function (k, n) { var d = parseKey(k); d.setDate(d.getDate() + n); return ymd(d); };
  var diffDays = function (a, b) { return Math.round((parseKey(a) - parseKey(b)) / 86400000); };
  var uid = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  };
  var nowStr = function () { var d = new Date(); return ymd(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); };
  var lsGet = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } };
  var lsDel = function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };
  var fmtShort = function (k) { var d = parseKey(k); return d.getDate() + ' ' + MONTHS[d.getMonth()]; };
  var rel = function (k) {
    var n = diffDays(k, todayKey());
    if (n === 0) return 'আজ';
    if (n === 1) return 'আগামীকাল';
    if (n === -1) return 'গতকাল';
    return n > 0 ? n + ' দিন পরে' : (-n) + ' দিন আগে';
  };
  var tagCls = function (name) { var t = TAGS.filter(function (x) { return x.name === name; })[0]; return t ? t.cls : 'gray'; };
  var tagPills = function (tags) {
    return (tags || []).map(function (t) { return '<span class="tag t-' + tagCls(t) + '">' + esc(t) + '</span>'; }).join('');
  };
  var statusLabel = function (s) { return PSTATUS.indexOf(s) > -1 ? s : 'Pending'; };
  var sCls = function (s) { return 's-' + statusLabel(s).toLowerCase(); };
  var sIcon = function (s) { s = statusLabel(s); return s === 'Done' ? '✓' : (s === 'Postpone' ? '✕' : '•'); };
  var hasText = function (s) { return !!(s && String(s).trim()); };
  var truthy = function (v) { return v !== undefined && v !== null; };

  function toast(msg, type, action) {
    var el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.innerHTML = icon(type === 'err' ? 'x' : 'check') + '<span>' + esc(msg) + '</span>' +
      (action ? '<button type="button" class="toast-act">' + esc(action.label) + '</button>' : '');
    if (action) $('.toast-act', el).addEventListener('click', function () { el.remove(); action.fn(); });
    $('#toasts').appendChild(el);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 300); }, type === 'err' ? 7000 : (action ? 5500 : 2200));
  }

  function countTo(el, n) {
    var from = +el.dataset.v || 0;
    el.dataset.v = n;
    if (REDUCED || from === n || typeof requestAnimationFrame !== 'function') { el.textContent = n; return; }
    var t0 = performance.now(), dur = 450;
    (function step(t) {
      var p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(from + (n - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  function autosize(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.min(Math.max(ta.scrollHeight + 2, 66), 320) + 'px';
  }

  function copyText(text, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast(okMsg); } catch (e) { toast('কপি করা যায়নি', 'err'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }).catch(fallback);
    } else fallback();
  }

  function downloadCSV(name, rows) {
    var csv = '\uFEFF' + rows.map(function (r) {
      return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- state ---------- */
  var store = { posts: {}, drafts: [], settings: { enabled: false, email: '', daysBefore: 3, hour: 9, includeOverdue: true }, loaded: false };
  var ui = {
    view: 'calendar',
    calMode: lsGet(LS.calMode) === 'list' ? 'list' : 'grid',
    cur: (function () { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })(),
    tagFilter: [],
    day: { key: null, editing: null, tags: [], capEdit: null, capText: '' },
    lib: { q: '', from: '', to: '', preset: 'month', cap: 'all', status: 'all', tags: [] },
    dirty: {},
    dr: { q: '', product: 'all', cat: 'all', platform: 'all', status: 'all', fav: false, sort: 'new', open: {} },
    dform: { id: null, cat: '' },
    sched: { id: null },
    cfDone: null
  };

  /* ---------- data helpers ---------- */
  function allPosts() {
    var out = [];
    Object.keys(store.posts).forEach(function (k) {
      store.posts[k].forEach(function (p) { out.push(Object.assign({ date: k }, p)); });
    });
    return out;
  }
  function findPost(id) {
    for (var k in store.posts) {
      var p = store.posts[k].filter(function (x) { return x.id === id; })[0];
      if (p) return { post: p, date: k };
    }
    return null;
  }
  function sortDay(date) { store.posts[date].sort(function (a, b) { return String(a.time).localeCompare(String(b.time)); }); }
  function putPost(date, post) { (store.posts[date] = store.posts[date] || []).push(post); sortDay(date); }
  function dropPost(id) {
    for (var k in store.posts) {
      var i = store.posts[k].findIndex(function (x) { return x.id === id; });
      if (i > -1) {
        var p = store.posts[k].splice(i, 1)[0];
        if (!store.posts[k].length) delete store.posts[k];
        return { post: p, date: k };
      }
    }
    return null;
  }
  function persist() {
    lsSet(LS.cache, JSON.stringify({ posts: store.posts, drafts: store.drafts, settings: store.settings }));
  }
  function visibleItems(key) {
    var arr = store.posts[key] || [];
    if (!ui.tagFilter.length) return arr;
    return arr.filter(function (it) { return (it.tags || []).some(function (t) { return ui.tagFilter.indexOf(t) > -1; }); });
  }

  /* ---------- API ---------- */
  var inflight = 0;
  function sync(delta, failed) {
    inflight += delta;
    var d = $('#syncDot');
    d.classList.toggle('busy', inflight > 0);
    if (inflight <= 0) { d.classList.toggle('err', !!failed); d.classList.toggle('ok', !failed); }
  }
  function api(action, payload, write) {
    payload = payload || {};
    sync(1);
    var key = lsGet(LS.key) || '';
    var req;
    if (write) {
      req = fetch(CFG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action: action, key: key }, payload))
      });
    } else {
      req = fetch(CFG.API_URL + '?' + new URLSearchParams(Object.assign({ action: action, key: key }, payload)).toString());
    }
    return req.then(function (res) { return res.text(); })
      .then(function (txt) {
        var json;
        try { json = JSON.parse(txt); } catch (pe) {
          var be = new Error(/accounts\.google|ServiceLogin|signin/i.test(txt)
            ? 'ব্যাকেন্ড লগইন চাইছে — Deploy-এ "Who has access" = Anyone দিন'
            : 'ব্যাকেন্ড থেকে ডেটা আসছে না — নতুন Code.gs পেস্ট করে Deploy → Manage deployments → Edit → New version দিয়েছেন কি?');
          be.code = 'badresponse'; throw be;
        }
        if (!json.ok) { var e = new Error(json.error === 'unauthorized' ? 'অ্যাক্সেস কী সঠিক নয়' : (json.error || 'Error')); e.code = json.error; throw e; }
        sync(-1, false);
        return json.data;
      })
      .catch(function (err) {
        sync(-1, true);
        if (err.code === 'unauthorized') showLock(!!key);
        else if (err.name === 'TypeError') err = new Error('সার্ভারের সাথে সংযোগ হচ্ছে না — ইন্টারনেট/ডিপ্লয়মেন্ট চেক করুন');
        throw err;
      });
  }
  function mutate(action, payload, apply, rollback, okMsg, okAction) {
    if (apply) apply();
    return api(action, payload, true).then(function (r) {
      if (okMsg) toast(okMsg, '', okAction);
      persist();
      return r;
    }).catch(function (e) {
      if (rollback) rollback();
      toast(e.message, 'err');
    });
  }

  /* ---------- modals ---------- */
  function openModal(id) {
    $('#' + id).hidden = false;
    document.body.classList.add('noscroll');
  }
  function closeModal(id) {
    $('#' + id).hidden = true;
    if (!$$('.backdrop:not([hidden])').length) document.body.classList.remove('noscroll');
  }
  function dismiss(el) {
    if (el.id === 'm-confirm') { if (ui.cfDone) ui.cfDone(false); return; }
    if (el.id === 'm-lock') return;
    closeModal(el.id);
  }
  function confirmBox(o) {
    return new Promise(function (res) {
      $('#cfTitle').textContent = o.title || 'নিশ্চিত করুন';
      $('#cfText').textContent = o.text || '';
      var ok = $('#cfOk');
      ok.textContent = o.ok || 'হ্যাঁ';
      ok.className = 'btn ' + (o.danger ? 'danger' : 'primary');
      var done = function (v) { closeModal('m-confirm'); ui.cfDone = null; res(v); };
      ui.cfDone = done;
      ok.onclick = function () { done(true); };
      $('#cfCancel').onclick = function () { done(false); };
      openModal('m-confirm');
    });
  }
  function showLock(wrong) {
    $('#lockMsg').textContent = wrong ? 'কী সঠিক নয় — আবার চেষ্টা করুন।' : 'এই ক্যালেন্ডার খুলতে পাসকোড প্রয়োজন।';
    $('#lockInput').value = '';
    openModal('m-lock');
    setTimeout(function () { $('#lockInput').focus(); }, 60);
  }

  /* =========================================================
     VIEW SWITCHING
     ========================================================= */
  function setView(v, push) {
    if (['calendar', 'captions', 'drafts'].indexOf(v) < 0) v = 'calendar';
    ui.view = v;
    ['calendar', 'captions', 'drafts'].forEach(function (n) { $('#view-' + n).hidden = n !== v; });
    $$('[data-view]').forEach(function (b) { b.classList.toggle('active', b.dataset.view === v); });
    $('#fab').hidden = v === 'captions';
    $('#bellPanel').hidden = true;
    if (push !== false && location.hash !== '#' + v) { try { history.replaceState(null, '', '#' + v); } catch (e) { location.hash = v; } }
    if (v === 'captions') { syncLibControls(); renderCaptions(); }
    if (v === 'drafts') renderDrafts();
    if (v === 'calendar') renderCalendar();
    window.scrollTo(0, 0);
  }

  /* =========================================================
     CALENDAR
     ========================================================= */
  function renderStats() {
    var now = new Date();
    var mp = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-', yp = now.getFullYear() + '-';
    var m = 0, y = 0, done = 0;
    Object.keys(store.posts).forEach(function (k) {
      var a = store.posts[k];
      if (k.indexOf(yp) === 0) y += a.length;
      if (k.indexOf(mp) === 0) { m += a.length; a.forEach(function (p) { if (statusLabel(p.status) === 'Done') done++; }); }
    });
    var r = getReminders();
    var up = r.today.length + r.tomorrow.length + r.soon.length;
    countTo($('#sMonth'), m); countTo($('#sYear'), y); countTo($('#sDone'), done); countTo($('#sUp'), up);
    $('#sMonthSub').textContent = MONTHS[now.getMonth()] + ' ' + now.getFullYear();
    $('#sYearSub').textContent = String(now.getFullYear());
    $('#sDoneSub').textContent = m ? Math.round(done / m * 100) + '% সম্পন্ন' : '—';
    $('#sUpSub').textContent = 'পরবর্তী ' + (Number(store.settings.daysBefore) || 3) + ' দিনের মধ্যে';
  }

  function renderCalTagChips() {
    var h = '<button class="chip' + (ui.tagFilter.length ? '' : ' active') + '" data-all="1">সব</button>';
    TAGS.forEach(function (t) {
      var on = ui.tagFilter.indexOf(t.name) > -1;
      h += '<button class="tchip t-' + t.cls + (on ? ' on' : '') + '" data-tag="' + esc(t.name) + '">' + esc(t.name) + '</button>';
    });
    $('#calTagChips').innerHTML = h;
  }

  function renderCalendar() {
    var y = ui.cur.getFullYear(), m = ui.cur.getMonth();
    $('#monthLabel').textContent = MONTHS[m] + ' ' + y;
    $$('#modeSeg button').forEach(function (b) { b.classList.toggle('active', b.dataset.mode === ui.calMode); });
    renderCalTagChips();
    renderStats();
    renderBell();
    if (ui.calMode === 'grid') {
      $('#gridWrap').hidden = false; $('#agenda').hidden = true;
      buildGrid(y, m);
    } else {
      $('#gridWrap').hidden = true; $('#agenda').hidden = false;
      buildAgenda(y, m);
    }
  }

  function miniCard(it) {
    return '<div class="mc"><div class="tags">' + tagPills(it.tags) + '</div><div class="mc-line"><span class="sdot ' + sCls(it.status) + '">' + sIcon(it.status) + '</span><span class="mc-title">' + esc(it.title) + '</span></div></div>';
  }

  function buildGrid(y, m) {
    $('#dowRow').innerHTML = DOW.map(function (d) { return '<div class="dow">' + d + '</div>'; }).join('');
    var grid = $('#calGrid');
    var frag = document.createDocumentFragment();
    var first = new Date(y, m, 1).getDay();
    var days = new Date(y, m + 1, 0).getDate();
    var tk = todayKey();
    var i, d;

    for (i = 0; i < first; i++) {
      var e = document.createElement('div'); e.className = 'cell empty'; frag.appendChild(e);
    }
    for (d = 1; d <= days; d++) {
      var key = dk(y, m, d);
      var items = store.loaded ? visibleItems(key) : [];
      var dow = new Date(y, m, d).getDay();
      var pend = items.some(function (it) { return statusLabel(it.status) === 'Pending'; });
      var cell = document.createElement('div');
      cell.className = 'cell' + (key === tk ? ' today' : '') + (dow === 5 ? ' fri' : '') + (!store.loaded ? ' skel' : '') + (key < tk && pend ? ' overdue' : '');
      cell.dataset.key = key;
      cell.style.setProperty('--i', d);
      cell.tabIndex = 0;
      cell.setAttribute('role', 'button');

      var cards = items.slice(0, 2).map(miniCard).join('');
      if (items.length > 2) cards += '<div class="more">+' + (items.length - 2) + ' আরও</div>';

      var withCap = items.filter(function (it) { return hasText(it.caption); }).length;
      var capBadge = items.length ? '<button class="cap-badge' + (withCap ? ' has' : '') + '" data-capkey="' + key + '" title="এই দিনের ক্যাপশন">' + icon('message') + withCap + '/' + items.length + '</button>' : '';
      var cnt = items.length ? '<span class="cnt">' + items.length + '</span>' : '';
      var dots = items.slice(0, 6).map(function (it) {
        return '<span class="dot d-' + tagCls((it.tags || [])[0]) + (statusLabel(it.status) === 'Done' ? ' done' : '') + '"></span>';
      }).join('');

      var tip = '<div class="tip"><div class="t-date">' + d + ' ' + MONTHS[m] + '</div>';
      if (!items.length) tip += '<div class="t-empty">কোনো content যোগ করা হয়নি</div>';
      else items.forEach(function (it) {
        tip += '<div class="t-item"><div class="t-title">' + esc(it.title) + '</div><div class="t-meta">' + esc(it.time) + ' · ' + statusLabel(it.status) + (it.tags && it.tags.length ? ' · ' + esc(it.tags.join(', ')) : '') + '</div></div>';
      });
      tip += '</div>';

      cell.innerHTML = '<div class="cell-top"><span class="dnum">' + d + '</span><div class="cell-badges">' + capBadge + cnt + '</div></div>' +
        '<div class="cell-cards">' + cards + '</div><div class="cell-dots">' + dots + '</div>' + tip;
      frag.appendChild(cell);
    }
    grid.innerHTML = '';
    grid.appendChild(frag);
  }

  function buildAgenda(y, m) {
    var days = new Date(y, m + 1, 0).getDate(), tk = todayKey(), html = '', n = 0;
    for (var d = 1; d <= days; d++) {
      var key = dk(y, m, d), items = visibleItems(key);
      if (!items.length) continue;
      var dow = new Date(y, m, d).getDay();
      html += '<div class="ag-day" style="--i:' + Math.min(n++, 12) + '"><div class="ag-head"><span class="ag-date' + (dow === 5 ? ' fri' : '') + (key === tk ? ' today' : '') + '">' + d + ' ' + MONTHS[m] + '</span><span>' + DOWFULL[dow] + ' · ' + rel(key) + '</span></div>';
      items.forEach(function (it) {
        html += '<div class="ag-row" data-open="' + key + '"><button class="sdot ' + sCls(it.status) + '" data-toggle="' + esc(it.id) + '" title="স্ট্যাটাস বদলান">' + sIcon(it.status) + '</button>' +
          '<div class="ag-main"><div class="ag-title">' + esc(it.title) + '</div><div class="ag-meta"><span>' + icon('clock') + ' ' + esc(it.time) + '</span><span class="tags">' + tagPills(it.tags) + '</span></div></div>' +
          (hasText(it.caption) ? '<span class="cap-flag" title="ক্যাপশন আছে">' + icon('message') + '</span>' : '') + '</div>';
      });
      html += '</div>';
    }
    $('#agenda').innerHTML = html || '<div class="empty"><div class="big">🗓️</div>এই মাসে কোনো কনটেন্ট নেই।<br><span style="font-size:12px">"নতুন কনটেন্ট" বাটনে ক্লিক করে যোগ করুন।</span></div>';
  }

  function toggleQuick(id) {
    var f = findPost(id); if (!f) return;
    setPostStatus(id, statusLabel(f.post.status) === 'Done' ? 'Pending' : 'Done');
  }

  /* month popover */
  function buildMonthPop() {
    var cy = ui.cur.getFullYear(), cm = ui.cur.getMonth(), now = new Date().getFullYear();
    $('#selMonth').innerHTML = MONTHS.map(function (n, i) { return '<option value="' + i + '"' + (i === cm ? ' selected' : '') + '>' + n + '</option>'; }).join('');
    var ys = '';
    for (var y = now - 5; y <= now + 5; y++) ys += '<option value="' + y + '"' + (y === cy ? ' selected' : '') + '>' + y + '</option>';
    $('#selYear').innerHTML = ys;
  }

  /* =========================================================
     DAY MODAL (add / edit / status / delete)
     ========================================================= */
  function openDay(key) {
    ui.day = { key: key, editing: null, tags: [], capEdit: null, capText: '' };
    resetDayForm();
    renderDay();
    openModal('m-day');
    if (window.matchMedia && window.matchMedia('(pointer:fine)').matches) setTimeout(function () { $('#fTitle').focus(); }, 80);
  }

  function resetDayForm() {
    ui.day.editing = null; ui.day.tags = [];
    $('#fTitle').value = ''; $('#fDate').value = ui.day.key; $('#fTime').value = '10:00';
    $('#fNotes').value = ''; $('#fCaption').value = '';
    $('#formTitle').textContent = 'নতুন কনটেন্ট';
    $('#saveDayBtn').textContent = 'Content যোগ করুন';
    $('#cancelEdit').hidden = true;
    renderDayTags();
  }

  function renderDayTags() {
    $('#fTags').innerHTML = TAGS.map(function (t) {
      return '<button type="button" class="tchip t-' + t.cls + (ui.day.tags.indexOf(t.name) > -1 ? ' on' : '') + '" data-tag="' + esc(t.name) + '">' + esc(t.name) + '</button>';
    }).join('');
  }

  function renderDay() {
    var key = ui.day.key; if (!key) return;
    var p = parseKey(key);
    $('#dayTitle').textContent = p.getDate() + ' ' + MONTHS[p.getMonth()] + ' ' + p.getFullYear();
    $('#daySub').textContent = DOWFULL[p.getDay()] + ' · ' + rel(key);
    var items = store.posts[key] || [];
    $('#dayList').innerHTML = items.map(function (it, i) {
      var st = statusLabel(it.status);
      return '<div class="pi" data-id="' + esc(it.id) + '" style="--i:' + i + '">' +
        '<div class="pi-top"><span class="sdot ' + sCls(st) + '">' + sIcon(st) + '</span><div class="pi-title">' + esc(it.title) + '</div><span class="pi-time">' + icon('clock') + esc(it.time) + '</span></div>' +
        (it.tags && it.tags.length ? '<div class="tags">' + tagPills(it.tags) + '</div>' : '') +
        (it.notes ? '<div class="pi-note">' + esc(it.notes) + '</div>' : '') +
        capBlock(it) +
        '<div class="pi-act"><div class="seg sm">' + PSTATUS.map(function (s) { return '<button type="button" data-st="' + s + '" class="' + (s === st ? 'active' : '') + '">' + s + '</button>'; }).join('') + '</div>' +
        '<span class="spacer"></span>' +
        (hasText(it.caption) ? '<button type="button" class="ibtn" data-act="copycap" title="ক্যাপশন কপি">' + icon('copy') + '</button>' : '') +
        '<button type="button" class="ibtn" data-act="edit" title="এডিট">' + icon('pen') + '</button>' +
        '<button type="button" class="ibtn" data-act="dup" title="ডুপ্লিকেট">' + icon('calendar-plus') + '</button>' +
        '<button type="button" class="ibtn del" data-act="del" title="মুছুন">' + icon('trash') + '</button></div></div>';
    }).join('');
  }

  function capBlock(it) {
    if (ui.day.capEdit === it.id) {
      return '<div class="pi-capedit"><textarea class="pi-capta" rows="4" placeholder="ক্যাপশন লিখুন…">' + esc(ui.day.capText || '') + '</textarea>' +
        '<div class="pi-capbtns"><span class="hint">Ctrl+Enter = সেভ</span><button type="button" class="btn sm ghost" data-act="capcancel">বাতিল</button><button type="button" class="btn sm primary" data-act="capsave">সেভ</button></div></div>';
    }
    if (hasText(it.caption)) {
      return '<div class="pi-cap" data-act="capedit" title="এডিট করতে ক্লিক করুন">' + esc(it.caption) + '<span class="pi-cap-edit">' + icon('pen') + 'এডিট</span></div>';
    }
    return '<button type="button" class="pi-capadd" data-act="capedit">' + icon('plus') + 'ক্যাপশন যোগ করুন</button>';
  }

  function editPost(id) {
    var f = findPost(id); if (!f) return;
    ui.day.editing = id; ui.day.tags = (f.post.tags || []).slice();
    $('#fTitle').value = f.post.title || ''; $('#fDate').value = f.date; $('#fTime').value = f.post.time || '10:00';
    $('#fNotes').value = f.post.notes || ''; $('#fCaption').value = f.post.caption || '';
    $('#formTitle').textContent = 'কনটেন্ট এডিট';
    $('#saveDayBtn').textContent = 'পরিবর্তন সংরক্ষণ';
    $('#cancelEdit').hidden = false;
    renderDayTags();
    $('#dayForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function () { $('#fTitle').focus(); }, 250);
  }

  function dupPost(id) {
    var f = findPost(id); if (!f) return;
    ui.day.editing = null; ui.day.tags = (f.post.tags || []).slice();
    $('#fTitle').value = f.post.title || ''; $('#fDate').value = f.date; $('#fTime').value = f.post.time || '10:00';
    $('#fNotes').value = f.post.notes || ''; $('#fCaption').value = f.post.caption || '';
    $('#formTitle').textContent = 'ডুপ্লিকেট — নতুন কনটেন্ট';
    $('#saveDayBtn').textContent = 'Content যোগ করুন';
    $('#cancelEdit').hidden = false;
    renderDayTags();
    $('#dayForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast('তারিখ/টাইটেল বদলে সেভ করুন');
  }

  function saveDayForm(e) {
    e.preventDefault();
    var title = $('#fTitle').value.trim();
    if (!title) { var f0 = $('#fTitle'); f0.classList.remove('shake'); void f0.offsetWidth; f0.classList.add('shake'); f0.focus(); return; }
    var date = $('#fDate').value; if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = ui.day.key;
    var time = $('#fTime').value || '10:00', notes = $('#fNotes').value.trim(), caption = $('#fCaption').value.trim(), tags = ui.day.tags.slice();

    if (ui.day.editing) {
      var id = ui.day.editing, f = findPost(id); if (!f) return;
      var snap = JSON.parse(JSON.stringify({ post: f.post, date: f.date }));
      mutate('updatePost', { id: id, date: date, title: title, tags: tags, time: time, notes: notes, caption: caption },
        function () { dropPost(id); putPost(date, Object.assign({}, snap.post, { title: title, tags: tags, time: time, notes: notes, caption: caption })); renderAll(); },
        function () { dropPost(id); putPost(snap.date, snap.post); renderAll(); },
        'পরিবর্তন সংরক্ষিত হয়েছে');
    } else {
      var nid = uid();
      var post = { id: nid, title: title, tags: tags, time: time, notes: notes, status: 'Pending', caption: caption };
      mutate('addPost', { id: nid, date: date, title: title, tags: tags, time: time, notes: notes, caption: caption },
        function () { putPost(date, post); renderAll(); },
        function () { dropPost(nid); renderAll(); },
        'কনটেন্ট যোগ হয়েছে', { label: 'এডিট', fn: function () { openDay(date); editPost(nid); } });
    }
    resetDayForm();
  }

  function saveDayCaption(id, item) {
    var text = $('.pi-capta', item).value.trim();
    saveCaption(id, text).then(function (ok) {
      if (!ok) return;
      ui.day.capEdit = null; ui.day.capText = '';
      renderCalendar(); renderDay();
      if (ui.view === 'captions') renderCaptions();
      toast('ক্যাপশন সেভ হয়েছে');
    });
  }

  function setPostStatus(id, status) {
    var f = findPost(id); if (!f) return;
    var prev = f.post.status;
    if (statusLabel(prev) === status) return;
    mutate('setStatus', { id: id, status: status },
      function () { f.post.status = status; renderAll(); },
      function () { f.post.status = prev; renderAll(); });
  }

  function deletePost(id) {
    var f = findPost(id); if (!f) return;
    confirmBox({ title: 'কনটেন্টটি মুছবেন?', text: '"' + f.post.title + '" স্থায়ীভাবে মুছে যাবে।', ok: 'মুছুন', danger: true }).then(function (yes) {
      if (!yes) return;
      var removed = null;
      mutate('deletePost', { id: id },
        function () { removed = dropPost(id); renderAll(); },
        function () { if (removed) putPost(removed.date, removed.post); renderAll(); },
        'মুছে ফেলা হয়েছে');
    });
  }

  function saveCaption(id, text) {
    var f = findPost(id); if (!f) return Promise.resolve(false);
    var prev = f.post.caption || '';
    f.post.caption = text;
    return api('setCaption', { id: id, caption: text }, true).then(function () { persist(); return true; })
      .catch(function (e) { f.post.caption = prev; toast(e.message, 'err'); return false; });
  }

  /* =========================================================
     POST CAPTIONS (library view)
     ========================================================= */
  function applyPreset(p) {
    var now = new Date(), L = ui.lib;
    L.preset = p;
    if (p === 'today') { L.from = L.to = ymd(now); }
    else if (p === 'week') {
      var s = new Date(now); s.setDate(now.getDate() - now.getDay());
      var e = new Date(s); e.setDate(s.getDate() + 6);
      L.from = ymd(s); L.to = ymd(e);
    } else if (p === 'month') {
      var y = ui.cur.getFullYear(), m = ui.cur.getMonth();
      L.from = dk(y, m, 1); L.to = dk(y, m, new Date(y, m + 1, 0).getDate());
    } else if (p === 'all') { L.from = ''; L.to = ''; }
  }

  function goCaptions(key) {
    ui.lib.from = ui.lib.to = key; ui.lib.preset = 'day'; ui.lib.q = ''; ui.lib.cap = 'all'; ui.lib.status = 'all'; ui.lib.tags = [];
    $('#libSearch').value = '';
    setView('captions');
  }

  function syncLibControls() {
    var L = ui.lib;
    $('#libFrom').value = L.from; $('#libTo').value = L.to; $('#libStatus').value = L.status;
    $$('#libPresets .chip').forEach(function (c) { c.classList.toggle('active', c.dataset.preset === L.preset); });
    $$('#libCapSeg button').forEach(function (b) { b.classList.toggle('active', b.dataset.cap === L.cap); });
    $('#libTagChips').innerHTML = TAGS.map(function (t) {
      return '<button class="tchip t-' + t.cls + (L.tags.indexOf(t.name) > -1 ? ' on' : '') + '" data-tag="' + esc(t.name) + '">' + esc(t.name) + '</button>';
    }).join('');
  }

  function getLibGroups() {
    var L = ui.lib, q = L.q.trim().toLowerCase(), out = [];
    Object.keys(store.posts).sort().forEach(function (key) {
      if (L.from && key < L.from) return;
      if (L.to && key > L.to) return;
      var arr = store.posts[key].slice().sort(function (a, b) { return String(a.time).localeCompare(String(b.time)); });
      var kept = arr.filter(function (it) {
        var has = hasText(it.caption);
        if (L.cap === 'has' && !has) return false;
        if (L.cap === 'missing' && has) return false;
        if (L.status !== 'all' && statusLabel(it.status) !== L.status) return false;
        if (L.tags.length && !(it.tags || []).some(function (t) { return L.tags.indexOf(t) > -1; })) return false;
        if (q && (it.title + ' ' + (it.caption || '') + ' ' + (it.notes || '')).toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      if (kept.length) out.push({ key: key, items: kept });
    });
    return out;
  }

  function dayHead(key) {
    var d = parseKey(key), dow = d.getDay(), isT = key === todayKey();
    return '<div class="ag-head"><span class="ag-date' + (dow === 5 ? ' fri' : '') + (isT ? ' today' : '') + '">' + d.getDate() + ' ' + MONTHS[d.getMonth()] + '</span><span>' + DOWFULL[dow] + (isT ? ' · আজ' : '') + '</span></div>';
  }

  function renderCaptions() {
    var groups = getLibGroups(), total = 0, withCap = 0, html = '', n = 0;
    groups.forEach(function (g) {
      html += '<div class="lib-day">' + dayHead(g.key);
      g.items.forEach(function (it) {
        total++;
        var has = hasText(it.caption); if (has) withCap++;
        var dirty = truthy(ui.dirty[it.id]);
        var val = dirty ? ui.dirty[it.id] : (it.caption || '');
        html += '<div class="lib-card' + (has ? ' has-cap' : '') + (dirty ? ' dirty' : '') + '" data-id="' + esc(it.id) + '" style="--i:' + Math.min(n++, 14) + '">' +
          '<div class="lib-top"><span class="sdot ' + sCls(it.status) + '" title="' + statusLabel(it.status) + '">' + sIcon(it.status) + '</span><div class="lib-title">' + esc(it.title) + '</div><span class="lib-time">' + esc(it.time) + '</span></div>' +
          (it.tags && it.tags.length ? '<div class="tags">' + tagPills(it.tags) + '</div>' : '<div style="height:8px"></div>') +
          '<textarea class="lib-ta" placeholder="এই পোস্টের ক্যাপশন লিখুন…">' + esc(val) + '</textarea>' +
          '<div class="lib-act"><span class="hint' + (dirty ? ' dirty' : '') + '">' + (dirty ? 'সেভ করা হয়নি' : (has ? 'সেভ করা আছে' : 'ক্যাপশন নেই')) + '</span>' +
          '<button class="btn sm ghost" data-act="copy"' + (hasText(val) ? '' : ' disabled') + '>' + icon('copy') + 'Copy</button>' +
          '<button class="btn sm primary" data-act="save"' + (dirty ? '' : ' disabled') + '>সেভ</button></div></div>';
      });
      html += '</div>';
    });
    if (!total) html = '<div class="empty"><div class="big">📭</div>এই ফিল্টারে কোনো পোস্ট পাওয়া যায়নি।<br><span style="font-size:12px">তারিখ বা ফিল্টার বদলে দেখুন।</span></div>';
    $('#libList').innerHTML = html;
    $$('#libList .lib-ta').forEach(autosize);
    setLibSummary(total, withCap);
  }

  function setLibSummary(total, withCap) {
    $('#libSummary').innerHTML = '<span><b>' + total + '</b> টি পোস্ট · <b>' + withCap + '</b> টিতে ক্যাপশন আছে · <b>' + (total - withCap) + '</b> টি বাকি</span>';
    $('#copyAllBtn').disabled = withCap === 0;
  }

  function updateLibSummaryLive() {
    var cards = $$('#libList .lib-card'), w = cards.filter(function (c) { return c.classList.contains('has-cap'); }).length;
    setLibSummary(cards.length, w);
  }

  function saveLibCard(card) {
    var id = card.dataset.id, ta = $('.lib-ta', card), btn = $('[data-act="save"]', card), hint = $('.hint', card);
    var caption = ta.value.trim();
    btn.disabled = true; hint.className = 'hint'; hint.textContent = 'সেভ হচ্ছে…';
    saveCaption(id, caption).then(function (ok) {
      if (ok) {
        delete ui.dirty[id];
        ta.value = caption;
        card.classList.remove('dirty'); card.classList.toggle('has-cap', !!caption);
        $('[data-act="copy"]', card).disabled = !caption;
        hint.className = 'hint ok'; hint.textContent = caption ? '✓ সেভ হয়েছে' : 'ক্যাপশন মুছে ফেলা হয়েছে';
        renderCalendar(); updateLibSummaryLive();
      } else {
        btn.disabled = false; hint.className = 'hint dirty'; hint.textContent = 'সেভ ব্যর্থ — আবার চেষ্টা করুন';
      }
    });
  }

  /* =========================================================
     DRAFTS (product-wise)
     ========================================================= */
  var pKey = function (p) { return String(p || '').trim().toLowerCase(); };
  var draftFull = function (d) { return (d.caption || '') + (d.hashtags ? '\n\n' + d.hashtags : ''); };
  var normTags = function (s) {
    var seen = {}, out = [];
    String(s || '').split(/[\s,]+/).forEach(function (t) {
      t = t.replace(/^#+/, ''); if (!t) return;
      var k = t.toLowerCase(); if (seen[k]) return; seen[k] = 1; out.push('#' + t);
    });
    return out.join(' ');
  };
  var dStatusLabel = function (k) { var s = DSTATUS.filter(function (x) { return x.k === k; })[0]; return s ? s.l : 'ড্রাফট'; };

  function getProducts() {
    var map = {};
    store.drafts.forEach(function (d) {
      var k = pKey(d.product);
      if (!map[k]) map[k] = { key: k, name: d.product.trim() || 'প্রোডাক্ট ছাড়া', count: 0 };
      map[k].count++;
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name); });
  }

  function getDraftList() {
    var D = ui.dr, q = D.q.trim().toLowerCase();
    var list = store.drafts.filter(function (d) {
      if (D.product !== 'all' && pKey(d.product) !== D.product) return false;
      if (D.cat !== 'all' && d.category !== D.cat) return false;
      if (D.platform !== 'all' && d.platform !== D.platform) return false;
      if (D.status !== 'all' && d.status !== D.status) return false;
      if (D.fav && !d.fav) return false;
      if (q && (d.title + ' ' + d.caption + ' ' + d.hashtags + ' ' + d.product).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    list.sort(function (a, b) {
      if (D.sort === 'az') return (a.product || '~').toLowerCase().localeCompare((b.product || '~').toLowerCase()) || String(a.title).localeCompare(String(b.title));
      var r = String(b.updatedAt).localeCompare(String(a.updatedAt));
      return D.sort === 'old' ? -r : r;
    });
    return list;
  }

  function renderDraftControls() {
    var D = ui.dr;
    var prods = getProducts();
    var h = '<button class="prod' + (D.product === 'all' ? ' active' : '') + '" data-prod="all"><span>সব প্রোডাক্ট</span><em>' + store.drafts.length + '</em></button>';
    prods.forEach(function (p) {
      h += '<button class="prod' + (D.product === p.key ? ' active' : '') + '" data-prod="' + esc(p.key) + '"><span>' + esc(p.name) + '</span><em>' + p.count + '</em></button>';
    });
    $('#prodList').innerHTML = h;

    var c = '<button class="chip' + (D.cat === 'all' ? ' active' : '') + '" data-cat="all">সব ক্যাটাগরি</button>';
    TAGS.forEach(function (t) { c += '<button class="tchip t-' + t.cls + (D.cat === t.name ? ' on' : '') + '" data-cat="' + esc(t.name) + '">' + esc(t.name) + '</button>'; });
    $('#drCatChips').innerHTML = c;

    $('#drPlatform').innerHTML = '<option value="all">সব প্ল্যাটফর্ম</option>' + PLATFORMS.map(function (p) { return '<option value="' + p + '">' + p + '</option>'; }).join('');
    $('#drPlatform').value = D.platform;
    $('#drStatus').innerHTML = '<option value="all">সব স্ট্যাটাস</option>' + DSTATUS.map(function (s) { return '<option value="' + s.k + '">' + s.l + '</option>'; }).join('');
    $('#drStatus').value = D.status;
    $('#drSort').value = D.sort;
    $('#drFav').classList.toggle('active', D.fav);
    $('#productList').innerHTML = prods.filter(function (p) { return p.key; }).map(function (p) { return '<option value="' + esc(p.name) + '">'; }).join('');
  }

  function renderDrafts() {
    renderDraftControls();
    var list = getDraftList();
    $('#drSummary').innerHTML = '<span><b>' + list.length + '</b> টি ড্রাফট' + (list.length !== store.drafts.length ? ' (মোট ' + store.drafts.length + ')' : '') + '</span>';
    if (!list.length) {
      $('#drList').style.display = 'block';
      $('#drList').innerHTML = '<div class="empty"><div class="big">✍️</div>' + (store.drafts.length ? 'এই ফিল্টারে কোনো ড্রাফট নেই।' : 'এখনো কোনো ড্রাফট নেই।<br><span style="font-size:12px">"নতুন ড্রাফট" বাটনে ক্লিক করে প্রথম ক্যাপশন লিখুন।</span>') + '</div>';
      return;
    }
    $('#drList').style.display = '';
    $('#drList').innerHTML = list.map(function (d, i) {
      var cat = d.category ? tagCls(d.category) : 'gray';
      var long = (d.caption || '').length > 220 || (d.caption || '').split('\n').length > 5;
      var opened = !!ui.dr.open[d.id];
      return '<article class="dcard" data-id="' + esc(d.id) + '" style="--i:' + Math.min(i, 14) + '">' +
        '<div class="dc-top"><span class="dc-prod t-' + cat + '">' + esc(d.product || 'প্রোডাক্ট ছাড়া') + '</span>' +
        '<button class="star' + (d.fav ? ' on' : '') + '" data-act="fav" title="ফেভারিট">' + icon('star') + '</button></div>' +
        (d.title ? '<div class="dc-title">' + esc(d.title) + '</div>' : '') +
        '<div class="dc-cap' + (opened ? ' open' : '') + '" data-act="edit" title="এডিট করতে ক্লিক করুন">' + esc(d.caption) + '</div>' +
        (long ? '<button class="dc-more" data-act="more">' + (opened ? 'কম দেখুন' : 'আরও দেখুন') + '</button>' : '') +
        (d.hashtags ? '<div class="dc-tags">' + esc(d.hashtags) + '</div>' : '') +
        '<div class="dc-meta"><span class="pill ' + d.status.toLowerCase() + '">' + dStatusLabel(d.status) + '</span>' +
        (d.platform ? '<span>' + esc(d.platform) + '</span>' : '') + '<span>' + (d.caption || '').length + ' অক্ষর</span>' +
        (d.usedDate ? '<span>শিডিউল: ' + fmtShort(d.usedDate) + '</span>' : '') + '</div>' +
        '<div class="dc-act"><button class="btn sm primary" data-act="copy">' + icon('copy') + 'Copy</button>' +
        '<button class="btn sm ghost" data-act="sched">' + icon('calendar-plus') + 'শিডিউল</button>' +
        '<button class="btn sm ghost" data-act="edit">' + icon('pen') + 'এডিট</button><span class="spacer"></span>' +
        '<button class="ibtn" data-act="dup" title="ডুপ্লিকেট">' + icon('plus') + '</button>' +
        '<button class="ibtn del" data-act="del" title="মুছুন">' + icon('trash') + '</button></div></article>';
    }).join('');
  }

  function renderDraftCats() {
    var cur = ui.dform.cat;
    $('#dCats').innerHTML = TAGS.map(function (t) {
      return '<button type="button" class="tchip t-' + t.cls + (cur === t.name ? ' on' : '') + '" data-cat="' + esc(t.name) + '">' + esc(t.name) + '</button>';
    }).join('');
  }

  function openDraftForm(id, preset) {
    var d = id ? store.drafts.filter(function (x) { return x.id === id; })[0] : (preset || null);
    ui.dform = { id: id || null, cat: d ? d.category : '' };
    $('#draftTitle').textContent = id ? 'ড্রাফট এডিট' : 'নতুন ড্রাফট';
    $('#saveDraftBtn').textContent = id ? 'পরিবর্তন সংরক্ষণ' : 'ড্রাফট সেভ করুন';
    $('#dPlatform').innerHTML = '<option value="">— বাছাই করুন —</option>' + PLATFORMS.map(function (p) { return '<option value="' + p + '">' + p + '</option>'; }).join('');
    $('#dStatus').innerHTML = DSTATUS.map(function (s) { return '<option value="' + s.k + '">' + s.l + '</option>'; }).join('');
    var prodSel = ui.dr.product !== 'all' ? (getProducts().filter(function (p) { return p.key === ui.dr.product; })[0] || {}).name : '';
    $('#dProduct').value = d ? d.product : (prodSel && prodSel !== 'প্রোডাক্ট ছাড়া' ? prodSel : '');
    $('#dTitle').value = d ? d.title : '';
    $('#dCaption').value = d ? d.caption : '';
    $('#dTags').value = d ? d.hashtags : '';
    $('#dPlatform').value = d ? d.platform : '';
    $('#dStatus').value = d ? (id ? d.status : 'Draft') : 'Draft';
    renderDraftCats(); updateDCount();
    openModal('m-draft');
    if (window.matchMedia && window.matchMedia('(pointer:fine)').matches) setTimeout(function () { $('#dProduct').focus(); }, 80);
  }
  function updateDCount() { $('#dCount').textContent = $('#dCaption').value.length + ' অক্ষর'; }

  function saveDraftForm(e) {
    e.preventDefault();
    var title = $('#dTitle').value.trim(), caption = $('#dCaption').value.trim();
    if (!title && !caption) { var f0 = $('#dCaption'); f0.classList.remove('shake'); void f0.offsetWidth; f0.classList.add('shake'); f0.focus(); return; }
    var data = {
      product: $('#dProduct').value.trim(), category: ui.dform.cat || '', title: title, caption: caption,
      hashtags: normTags($('#dTags').value), platform: $('#dPlatform').value, status: $('#dStatus').value || 'Draft'
    };
    closeModal('m-draft');
    if (ui.dform.id) {
      var d = store.drafts.filter(function (x) { return x.id === ui.dform.id; })[0]; if (!d) return;
      var snap = JSON.parse(JSON.stringify(d));
      mutate('updateDraft', Object.assign({ id: d.id }, data),
        function () { Object.assign(d, data, { updatedAt: nowStr() }); renderDrafts(); },
        function () { Object.assign(d, snap); renderDrafts(); },
        'ড্রাফট আপডেট হয়েছে');
    } else {
      var nd = Object.assign({ id: uid(), fav: false, createdAt: nowStr(), updatedAt: nowStr(), usedDate: '' }, data);
      mutate('addDraft', Object.assign({ id: nd.id }, data),
        function () { store.drafts.unshift(nd); renderDrafts(); },
        function () { store.drafts = store.drafts.filter(function (x) { return x.id !== nd.id; }); renderDrafts(); },
        'ড্রাফট সেভ হয়েছে', { label: 'এডিট', fn: function () { openDraftForm(nd.id); } });
    }
  }

  function deleteDraft(id) {
    var d = store.drafts.filter(function (x) { return x.id === id; })[0]; if (!d) return;
    confirmBox({ title: 'ড্রাফটটি মুছবেন?', text: 'এই ক্যাপশন ড্রাফট স্থায়ীভাবে মুছে যাবে।', ok: 'মুছুন', danger: true }).then(function (yes) {
      if (!yes) return;
      var idx = store.drafts.indexOf(d);
      mutate('deleteDraft', { id: id },
        function () { store.drafts.splice(idx, 1); renderDrafts(); },
        function () { store.drafts.splice(idx, 0, d); renderDrafts(); },
        'ড্রাফট মুছে ফেলা হয়েছে');
    });
  }

  function toggleFav(id) {
    var d = store.drafts.filter(function (x) { return x.id === id; })[0]; if (!d) return;
    var prev = d.fav;
    mutate('toggleFav', { id: id, fav: !prev },
      function () { d.fav = !prev; renderDrafts(); },
      function () { d.fav = prev; renderDrafts(); });
  }

  function dupDraft(id) {
    var d = store.drafts.filter(function (x) { return x.id === id; })[0]; if (!d) return;
    var nd = Object.assign({}, d, { id: uid(), title: (d.title ? d.title + ' ' : '') + '(কপি)', status: 'Draft', fav: false, usedDate: '', createdAt: nowStr(), updatedAt: nowStr() });
    var data = { product: nd.product, category: nd.category, title: nd.title, caption: nd.caption, hashtags: nd.hashtags, platform: nd.platform, status: 'Draft' };
    mutate('addDraft', Object.assign({ id: nd.id }, data),
      function () { store.drafts.unshift(nd); renderDrafts(); },
      function () { store.drafts = store.drafts.filter(function (x) { return x.id !== nd.id; }); renderDrafts(); },
      'ডুপ্লিকেট তৈরি হয়েছে', { label: 'এডিট', fn: function () { openDraftForm(nd.id); } });
  }

  function openSchedule(id) {
    var d = store.drafts.filter(function (x) { return x.id === id; })[0]; if (!d) return;
    ui.sched.id = id;
    $('#sTitle').value = (d.product && d.title) ? d.product + ' - ' + d.title : (d.title || d.product || '');
    $('#sDate').value = addDays(todayKey(), 1);
    $('#sTime').value = '10:00';
    openModal('m-sched');
  }

  function submitSchedule(e) {
    e.preventDefault();
    var d = store.drafts.filter(function (x) { return x.id === ui.sched.id; })[0]; if (!d) return;
    var title = $('#sTitle').value.trim(), date = $('#sDate').value, time = $('#sTime').value || '10:00';
    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast('টাইটেল ও তারিখ দিন', 'err'); return; }
    var tags = d.category ? [d.category] : [];
    var caption = draftFull(d);
    var post = { id: uid(), title: title, tags: tags, time: time, notes: 'ক্যাপশন ড্রাফট থেকে', status: 'Pending', caption: caption };
    var prevStatus = d.status, prevUsed = d.usedDate;
    closeModal('m-sched');
    mutate('scheduleDraft', { draftId: d.id, postId: post.id, date: date, title: title, tags: tags, time: time, notes: post.notes, caption: caption },
      function () { putPost(date, post); d.status = 'Used'; d.usedDate = date; renderAll(); },
      function () { dropPost(post.id); d.status = prevStatus; d.usedDate = prevUsed; renderAll(); },
      fmtShort(date) + '-এ শিডিউল হয়েছে', { label: 'দেখুন', fn: function () { var d0 = parseKey(date); ui.cur = new Date(d0.getFullYear(), d0.getMonth(), 1); setView('calendar'); openDay(date); } });
  }

  /* =========================================================
     REMINDERS
     ========================================================= */
  function getReminders() {
    var tk = todayKey(), n = Math.max(1, Number(store.settings.daysBefore) || 3);
    var out = { overdue: [], today: [], tomorrow: [], soon: [] };
    allPosts().forEach(function (p) {
      if (statusLabel(p.status) !== 'Pending') return;
      var d = diffDays(p.date, tk);
      if (d < 0 && d >= -14) out.overdue.push(p);
      else if (d === 0) out.today.push(p);
      else if (d === 1) out.tomorrow.push(p);
      else if (d > 1 && d <= n) out.soon.push(p);
    });
    var cmp = function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); };
    Object.keys(out).forEach(function (k) { out[k].sort(cmp); });
    return out;
  }

  function renderBell() {
    var r = getReminders();
    var total = r.overdue.length + r.today.length + r.tomorrow.length + r.soon.length;
    var b = $('#bellBadge');
    b.hidden = !total; b.textContent = total;
    $('#bellSub').textContent = total ? total + 'টি বাকি' : '';
    var secs = [['overdue', 'ওভারডিউ'], ['today', 'আজ'], ['tomorrow', 'আগামীকাল'], ['soon', 'আসন্ন']];
    var h = '';
    secs.forEach(function (s) {
      var arr = r[s[0]]; if (!arr.length) return;
      h += '<div class="bell-sec ' + s[0] + '">' + s[1] + ' · ' + arr.length + '</div>';
      arr.forEach(function (p) {
        h += '<div class="bell-item" data-open="' + p.date + '"><button class="sdot s-pending" data-toggle="' + esc(p.id) + '" title="Done করুন">•</button>' +
          '<div class="bi-main"><div class="bi-title">' + esc(p.title) + '</div><div class="bi-meta">' + fmtShort(p.date) + ' · ' + esc(p.time) + ' · ' + rel(p.date) + '</div></div></div>';
      });
    });
    $('#bellBody').innerHTML = h || '<div class="bell-empty"><div class="big">✅</div>কোনো আসন্ন বা বাকি পোস্ট নেই</div>';
    renderBanner(r);
  }

  function renderBanner(r) {
    var urgent = r.overdue.length + r.today.length + r.tomorrow.length;
    var sig = todayKey() + ':' + r.overdue.length + '/' + r.today.length + '/' + r.tomorrow.length;
    if (!urgent || lsGet(LS.bannerDay) === sig) { $('#remindBanner').hidden = true; return; }
    var parts = [];
    if (r.today.length) parts.push('আজ ' + r.today.length + 'টি');
    if (r.tomorrow.length) parts.push('আগামীকাল ' + r.tomorrow.length + 'টি');
    if (r.overdue.length) parts.push(r.overdue.length + 'টি ওভারডিউ');
    $('#bannerText').textContent = 'পোস্ট বাকি আছে: ' + parts.join(' · ');
    $('#remindBanner').hidden = false;
    $('#remindBanner').dataset.sig = sig;
  }

  function maybeNotify() {
    if (!('Notification' in window) || Notification.permission !== 'granted' || lsGet(LS.notif) !== '1') return;
    var r = getReminders(), n = r.today.length + r.overdue.length;
    var day = todayKey();
    if (!n || lsGet(LS.notifDay) === day) return;
    lsSet(LS.notifDay, day);
    try {
      new Notification('Content Calendar', {
        body: (r.today.length ? 'আজ ' + r.today.length + 'টি পোস্ট শিডিউল করা আছে' : '') + (r.today.length && r.overdue.length ? ' · ' : '') + (r.overdue.length ? r.overdue.length + 'টি ওভারডিউ' : ''),
        icon: 'assets/logo.png'
      });
    } catch (e) { /* ignore */ }
  }

  /* =========================================================
     SETTINGS
     ========================================================= */
  function openSettings() {
    var s = store.settings;
    $('#setDays').innerHTML = [1, 2, 3, 4, 5, 7, 10, 14].map(function (n) { return '<option value="' + n + '">' + n + ' দিন আগে</option>'; }).join('');
    var hs = '';
    for (var h = 6; h <= 22; h++) hs += '<option value="' + h + '">' + (h % 12 || 12) + ':00 ' + (h < 12 ? 'AM' : 'PM') + '</option>';
    $('#setHour').innerHTML = hs;
    $('#setEnabled').checked = !!s.enabled;
    $('#setEmail').value = s.email || '';
    $('#setDays').value = String(s.daysBefore || 3);
    $('#setHour').value = String(s.hour || 9);
    $('#setOverdue').checked = s.includeOverdue !== false;
    $('#setNotif').checked = lsGet(LS.notif) === '1' && ('Notification' in window) && Notification.permission === 'granted';
    $('#setAccess').hidden = !lsGet(LS.key);
    syncSettingsUI();
    openModal('m-settings');
  }
  function syncSettingsUI() {
    var on = $('#setEnabled').checked;
    $('#setFields').classList.toggle('off', !on);
    $('#setTrig').textContent = store.settings.triggerActive ? '✓ অটো-রিমাইন্ডার চালু আছে' : (on ? 'সেভ করলে অটো-রিমাইন্ডার চালু হবে' : 'অটো-রিমাইন্ডার বন্ধ');
  }
  function collectSettings() {
    return {
      enabled: $('#setEnabled').checked, email: $('#setEmail').value.trim(),
      daysBefore: Number($('#setDays').value) || 3, hour: Number($('#setHour').value) || 9,
      includeOverdue: $('#setOverdue').checked, appUrl: location.href.split('#')[0]
    };
  }
  function saveSettings(silent) {
    var btn = $('#saveSetBtn'); btn.disabled = true;
    return api('saveSettings', { settings: collectSettings() }, true).then(function (s) {
      store.settings = s; persist(); renderCalendar(); syncSettingsUI();
      if (!silent) { toast('সেটিংস সেভ হয়েছে'); closeModal('m-settings'); }
      return true;
    }).catch(function (e) { toast(e.message, 'err'); return false; })
      .then(function (ok) { btn.disabled = false; return ok; });
  }

  /* =========================================================
     RENDER ALL
     ========================================================= */
  function renderAll() {
    renderCalendar();
    if (ui.view === 'captions') renderCaptions();
    if (ui.view === 'drafts') renderDrafts();
    if (!$('#m-day').hidden) renderDay();
  }

  function loadAll(manual) {
    var btn = $('#refreshBtn');
    btn.classList.add('spin');
    return api('bootstrap').then(function (d) {
      store.posts = d.posts || {}; store.drafts = d.drafts || [];
      store.settings = Object.assign(store.settings, d.settings || {});
      store.loaded = true;
      persist(); renderAll(); maybeNotify();
      if (manual) toast('আপডেট হয়েছে');
    }).catch(function (e) {
      store.loaded = true; renderAll();
      toast(e.message, 'err');
    }).then(function () { btn.classList.remove('spin'); });
  }

  /* =========================================================
     EVENTS
     ========================================================= */
  function bind() {
    /* nav */
    $$('[data-view]').forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.view); }); });
    window.addEventListener('hashchange', function () { setView(location.hash.replace('#', ''), false); });
    $('#refreshBtn').addEventListener('click', function () { loadAll(true); });
    $('#settingsBtn').addEventListener('click', openSettings);
    $('#fab').addEventListener('click', function () { if (ui.view === 'drafts') openDraftForm(); else openDay(todayKey()); });

    /* bell */
    $('#bellBtn').addEventListener('click', function (e) { e.stopPropagation(); $('#bellPanel').hidden = !$('#bellPanel').hidden; $('#monthPop').hidden = true; });
    $('#bellBody').addEventListener('click', function (e) {
      var tg = e.target.closest('[data-toggle]');
      if (tg) { e.stopPropagation(); toggleQuick(tg.dataset.toggle); return; }
      var it = e.target.closest('[data-open]');
      if (it) { $('#bellPanel').hidden = true; setView('calendar'); var d = parseKey(it.dataset.open); ui.cur = new Date(d.getFullYear(), d.getMonth(), 1); renderCalendar(); openDay(it.dataset.open); }
    });
    $('#bannerView').addEventListener('click', function () { $('#bellPanel').hidden = false; });
    $('#bannerClose').addEventListener('click', function () { lsSet(LS.bannerDay, $('#remindBanner').dataset.sig || ''); $('#remindBanner').hidden = true; });
    document.addEventListener('click', function (e) {
      if (!$('#bellPanel').hidden && !e.target.closest('#bellPanel') && !e.target.closest('#bellBtn') && !e.target.closest('#bannerView')) $('#bellPanel').hidden = true;
      if (!$('#monthPop').hidden && !e.target.closest('#monthPop') && !e.target.closest('#monthBtn')) $('#monthPop').hidden = true;
    });

    /* calendar toolbar */
    $('#prevBtn').addEventListener('click', function () { ui.cur = new Date(ui.cur.getFullYear(), ui.cur.getMonth() - 1, 1); renderCalendar(); });
    $('#nextBtn').addEventListener('click', function () { ui.cur = new Date(ui.cur.getFullYear(), ui.cur.getMonth() + 1, 1); renderCalendar(); });
    $('#todayBtn').addEventListener('click', function () { var d = new Date(); ui.cur = new Date(d.getFullYear(), d.getMonth(), 1); renderCalendar(); });
    $('#monthBtn').addEventListener('click', function (e) { e.stopPropagation(); var p = $('#monthPop'); if (p.hidden) buildMonthPop(); p.hidden = !p.hidden; $('#bellPanel').hidden = true; });
    $('#monthApply').addEventListener('click', function () { ui.cur = new Date(+$('#selYear').value, +$('#selMonth').value, 1); $('#monthPop').hidden = true; renderCalendar(); });
    $('#monthToday').addEventListener('click', function () { var d = new Date(); ui.cur = new Date(d.getFullYear(), d.getMonth(), 1); $('#monthPop').hidden = true; renderCalendar(); });
    $('#modeSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; ui.calMode = b.dataset.mode; lsSet(LS.calMode, ui.calMode); renderCalendar(); });
    $('#addPostBtn').addEventListener('click', function () { openDay(todayKey()); });
    $('#calTagChips').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.all) ui.tagFilter = [];
      else { var i = ui.tagFilter.indexOf(b.dataset.tag); if (i > -1) ui.tagFilter.splice(i, 1); else ui.tagFilter.push(b.dataset.tag); }
      renderCalendar();
    });
    $('#calGrid').addEventListener('click', function (e) {
      var cb = e.target.closest('.cap-badge');
      if (cb) { e.stopPropagation(); goCaptions(cb.dataset.capkey); return; }
      var c = e.target.closest('.cell'); if (c && !c.classList.contains('empty') && !c.classList.contains('skel')) openDay(c.dataset.key);
    });
    $('#calGrid').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var c = e.target.closest('.cell'); if (c && !c.classList.contains('empty')) openDay(c.dataset.key);
    });
    $('#agenda').addEventListener('click', function (e) {
      var tg = e.target.closest('[data-toggle]');
      if (tg) { e.stopPropagation(); toggleQuick(tg.dataset.toggle); return; }
      var r = e.target.closest('[data-open]'); if (r) openDay(r.dataset.open);
    });
    $('#exportPostsBtn').addEventListener('click', function () {
      var rows = [['Date', 'Time', 'Title', 'Tags', 'Status', 'Notes', 'Caption']];
      allPosts().sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); }).forEach(function (p) {
        rows.push([p.date, p.time, p.title, (p.tags || []).join(', '), statusLabel(p.status), p.notes, p.caption]);
      });
      downloadCSV('content-calendar.csv', rows);
    });

    /* modal generic */
    $$('.backdrop').forEach(function (bd) {
      bd.addEventListener('mousedown', function (e) { if (e.target === bd) dismiss(bd); });
      $$('[data-close]', bd).forEach(function (b) { b.addEventListener('click', function () { dismiss(bd); }); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = $$('.backdrop:not([hidden])');
      if (open.length) { dismiss(open[open.length - 1]); return; }
      $('#bellPanel').hidden = true; $('#monthPop').hidden = true;
    });

    /* day modal */
    $('#dayForm').addEventListener('submit', saveDayForm);
    $('#cancelEdit').addEventListener('click', resetDayForm);
    $('#fTags').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tag]'); if (!b) return;
      var i = ui.day.tags.indexOf(b.dataset.tag); if (i > -1) ui.day.tags.splice(i, 1); else ui.day.tags.push(b.dataset.tag);
      b.classList.toggle('on');
    });
    $('#dayList').addEventListener('click', function (e) {
      var item = e.target.closest('.pi'); if (!item) return;
      var id = item.dataset.id;
      var st = e.target.closest('[data-st]');
      if (st) { setPostStatus(id, st.dataset.st); return; }
      var a = e.target.closest('[data-act]'); if (!a) return;
      var f = findPost(id); if (!f) return;
      if (a.dataset.act === 'capedit') {
        if (window.getSelection && String(window.getSelection()).trim() && a.classList.contains('pi-cap')) return;
        ui.day.capEdit = id; ui.day.capText = f.post.caption || ''; renderDay();
        var ta = $('.pi-capta', $('#dayList .pi[data-id="' + id + '"]')); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
      }
      else if (a.dataset.act === 'capcancel') { ui.day.capEdit = null; renderDay(); }
      else if (a.dataset.act === 'capsave') { saveDayCaption(id, item); }
      else if (a.dataset.act === 'copycap') copyText(f.post.caption || '', 'ক্যাপশন কপি হয়েছে ✓');
      else if (a.dataset.act === 'edit') editPost(id);
      else if (a.dataset.act === 'dup') dupPost(id);
      else if (a.dataset.act === 'del') deletePost(id);
    });

    $('#dayList').addEventListener('input', function (e) { if (e.target.classList.contains('pi-capta')) ui.day.capText = e.target.value; });
    $('#dayList').addEventListener('keydown', function (e) {
      if (e.target.classList.contains('pi-capta') && (e.ctrlKey || e.metaKey) && e.key === 'Enter') saveDayCaption(e.target.closest('.pi').dataset.id, e.target.closest('.pi'));
      if (e.target.classList.contains('pi-capta') && e.key === 'Escape') { e.stopPropagation(); ui.day.capEdit = null; renderDay(); }
    });

    /* captions view */
    $('#libSearch').addEventListener('input', function (e) { ui.lib.q = e.target.value; renderCaptions(); });
    $('#libPresets').addEventListener('click', function (e) { var c = e.target.closest('.chip'); if (!c) return; applyPreset(c.dataset.preset); syncLibControls(); renderCaptions(); });
    ['libFrom', 'libTo'].forEach(function (id) {
      $('#' + id).addEventListener('change', function () {
        ui.lib.from = $('#libFrom').value; ui.lib.to = $('#libTo').value; ui.lib.preset = 'custom';
        $$('#libPresets .chip').forEach(function (c) { c.classList.remove('active'); });
        renderCaptions();
      });
    });
    $('#libCapSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; ui.lib.cap = b.dataset.cap; syncLibControls(); renderCaptions(); });
    $('#libStatus').addEventListener('change', function (e) { ui.lib.status = e.target.value; renderCaptions(); });
    $('#libTagChips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tag]'); if (!b) return;
      var i = ui.lib.tags.indexOf(b.dataset.tag); if (i > -1) ui.lib.tags.splice(i, 1); else ui.lib.tags.push(b.dataset.tag);
      syncLibControls(); renderCaptions();
    });
    var libList = $('#libList');
    libList.addEventListener('input', function (e) {
      if (!e.target.classList.contains('lib-ta')) return;
      var card = e.target.closest('.lib-card'), id = card.dataset.id, f = findPost(id);
      var changed = e.target.value.trim() !== ((f && f.post.caption) || '').trim();
      if (changed) ui.dirty[id] = e.target.value; else delete ui.dirty[id];
      card.classList.toggle('dirty', changed);
      $('[data-act="save"]', card).disabled = !changed;
      $('[data-act="copy"]', card).disabled = !hasText(e.target.value);
      var h = $('.hint', card); h.className = 'hint' + (changed ? ' dirty' : ''); h.textContent = changed ? 'সেভ করা হয়নি' : 'সেভ করা আছে';
      autosize(e.target);
    });
    libList.addEventListener('keydown', function (e) {
      if (e.target.classList.contains('lib-ta') && (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        var card = e.target.closest('.lib-card');
        if (!$('[data-act="save"]', card).disabled) saveLibCard(card);
      }
    });
    libList.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]'); if (!b) return;
      var card = b.closest('.lib-card');
      if (b.dataset.act === 'copy') { var t = $('.lib-ta', card).value; if (hasText(t)) copyText(t, 'ক্যাপশন কপি হয়েছে ✓'); }
      else if (b.dataset.act === 'save') saveLibCard(card);
    });
    $('#copyAllBtn').addEventListener('click', function () {
      var parts = [];
      getLibGroups().forEach(function (g) { g.items.forEach(function (it) { if (hasText(it.caption)) parts.push('📌 ' + g.key + ' · ' + it.title + '\n' + it.caption.trim()); }); });
      if (parts.length) copyText(parts.join('\n\n━━━━━━━━━━\n\n'), parts.length + 'টি ক্যাপশন কপি হয়েছে ✓');
    });

    /* drafts view */
    $('#newDraftBtn').addEventListener('click', function () { openDraftForm(); });
    $('#prodList').addEventListener('click', function (e) { var b = e.target.closest('[data-prod]'); if (!b) return; ui.dr.product = b.dataset.prod; renderDrafts(); });
    $('#drSearch').addEventListener('input', function (e) { ui.dr.q = e.target.value; renderDrafts(); });
    $('#drCatChips').addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (!b) return; ui.dr.cat = (ui.dr.cat === b.dataset.cat && b.dataset.cat !== 'all') ? 'all' : b.dataset.cat; renderDrafts(); });
    $('#drPlatform').addEventListener('change', function (e) { ui.dr.platform = e.target.value; renderDrafts(); });
    $('#drStatus').addEventListener('change', function (e) { ui.dr.status = e.target.value; renderDrafts(); });
    $('#drSort').addEventListener('change', function (e) { ui.dr.sort = e.target.value; renderDrafts(); });
    $('#drFav').addEventListener('click', function () { ui.dr.fav = !ui.dr.fav; renderDrafts(); });
    $('#drList').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var card = b.closest('.dcard'), id = card.dataset.id;
      var d = store.drafts.filter(function (x) { return x.id === id; })[0]; if (!d) return;
      var act = b.dataset.act;
      if (act === 'edit' && b.classList.contains('dc-cap') && window.getSelection && String(window.getSelection()).trim()) return;
      if (act === 'copy') copyText(draftFull(d), 'ক্যাপশন কপি হয়েছে ✓');
      else if (act === 'edit') openDraftForm(id);
      else if (act === 'dup') dupDraft(id);
      else if (act === 'del') deleteDraft(id);
      else if (act === 'fav') toggleFav(id);
      else if (act === 'sched') openSchedule(id);
      else if (act === 'more') { ui.dr.open[id] = !ui.dr.open[id]; renderDrafts(); }
    });
    $('#exportDraftsBtn').addEventListener('click', function () {
      var rows = [['Product', 'Category', 'Title', 'Platform', 'Status', 'Caption', 'Hashtags', 'Favorite', 'Updated']];
      store.drafts.forEach(function (d) { rows.push([d.product, d.category, d.title, d.platform, d.status, d.caption, d.hashtags, d.fav ? 'Yes' : '', d.updatedAt]); });
      downloadCSV('caption-drafts.csv', rows);
    });
    $('#draftForm').addEventListener('submit', saveDraftForm);
    $('#dCaption').addEventListener('input', updateDCount);
    $('#dCats').addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]'); if (!b) return;
      ui.dform.cat = ui.dform.cat === b.dataset.cat ? '' : b.dataset.cat; renderDraftCats();
    });
    $('#schedForm').addEventListener('submit', submitSchedule);

    /* settings */
    $('#setEnabled').addEventListener('change', syncSettingsUI);
    $('#setForm').addEventListener('submit', function (e) { e.preventDefault(); saveSettings(false); });
    $('#setNotif').addEventListener('change', function (e) {
      if (!('Notification' in window)) { toast('এই ব্রাউজারে নোটিফিকেশন সাপোর্ট নেই', 'err'); e.target.checked = false; return; }
      if (e.target.checked) {
        Notification.requestPermission().then(function (p) {
          if (p === 'granted') { lsSet(LS.notif, '1'); toast('নোটিফিকেশন চালু হয়েছে'); }
          else { e.target.checked = false; lsSet(LS.notif, '0'); toast('ব্রাউজারে নোটিফিকেশন অনুমতি দেওয়া হয়নি', 'err'); }
        });
      } else lsSet(LS.notif, '0');
    });
    $('#testMailBtn').addEventListener('click', function () {
      var btn = $('#testMailBtn'); btn.disabled = true;
      saveSettings(true).then(function (ok) {
        if (!ok) return;
        return api('testReminder', {}, true).then(function () { toast('টেস্ট ইমেইল পাঠানো হয়েছে'); }).catch(function (er) { toast(er.message, 'err'); });
      }).then(function () { btn.disabled = false; });
    });
    $('#logoutBtn').addEventListener('click', function () { lsDel(LS.key); closeModal('m-settings'); showLock(false); });

    /* lock */
    $('#lockForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = $('#lockInput').value.trim(); if (!v) return;
      lsSet(LS.key, v); closeModal('m-lock'); loadAll();
    });

    /* periodic */
    setInterval(function () { renderBell(); maybeNotify(); }, 30 * 60 * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && store.loaded) { renderBell(); } });
  }

  /* ---------- init ---------- */
  function init() {
    applyPreset('month');
    bind();
    try {
      var c = JSON.parse(lsGet(LS.cache) || 'null');
      if (c && c.posts) { store.posts = c.posts; store.drafts = c.drafts || []; store.settings = Object.assign(store.settings, c.settings || {}); store.loaded = true; }
    } catch (e) { /* ignore */ }
    setView(location.hash.replace('#', '') || 'calendar', false);
    loadAll();
  }
  init();
})();
