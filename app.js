/* ------------------------------------------------------------------
   app.js — read and code what people wrote under local coverage of
   solar projects.

   Comments come from data/comments.json, which the weekly workflow
   writes. Your coding is kept in this browser and survives a comment
   aging out of storage; the comment text does not, so export before
   you need it.
------------------------------------------------------------------ */

const SAVE_KEY = 'solar_yt_codes_v1';

let BOOK = null, ALL = [], VIDEOS = {}, RUNS = [], META = {};
let CODES = loadCodes();
let SELECTED = null;
let STATE_TOTALS = {}, CUE_TOTALS = {};

const F = {
  q: '', states: new Set(), counties: new Set(), topics: new Set(),
  channels: new Set(), marks: new Set(), showGone: false
};

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc4 = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function loadCodes() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; }
  catch (e) { return {}; }
}
function saveCodes() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(CODES)); } catch (e) {}
}
function codeOf(c) {
  if (!CODES[c.id]) CODES[c.id] = { tags: [], star: false, note: '', read: false };
  return CODES[c.id];
}

/* ============================= startup =========================== */

start();

async function start() {
  let book, comments, videos, runs;
  try {
    [book, comments, videos, runs] = await Promise.all([
      fetch('codebook.json').then(r => r.json()),
      fetch('data/comments.json').then(r => r.json()),
      fetch('data/videos.json').then(r => r.json()),
      fetch('data/runs.json').then(r => r.json()).catch(() => ({ runs: [] }))
    ]);
  } catch (err) {
    return showOpening('This page needs a web server',
      '<p>It reads its data from files in this repository, and a browser will not '
      + 'load those from a <code>file://</code> address. Open it at its published '
      + 'address, or run <code>python3 -m http.server</code> in the repository '
      + 'folder.</p><p class="quiet">' + esc4(err.message) + '</p>');
  }

  BOOK = book;
  ALL = comments.comments || [];
  for (const v of videos.videos || []) VIDEOS[v.id] = v;
  META = { updated: comments.updated, expire: comments.expire_days || 30 };
  RUNS = runs.runs || [];

  if (!ALL.length) return showEmpty();

  computeTotals();
  wire();
  $('#opening').hidden = true; $('#top').hidden = false; $('#wrap').hidden = false;
  render();
}

function showOpening(title, html) {
  $('#opentitle').textContent = title;
  $('#openbody').innerHTML = html;
}

function showEmpty() {
  showOpening('Nothing collected yet',
    '<p>The collector has not run. It searches YouTube for local coverage of solar '
    + 'projects, keeps the videos that look like a county hearing rather than a '
    + 'product review, and pulls the comments underneath.</p>'
    + '<h3>Starting it</h3><ol class="steps">'
    + '<li>Add your YouTube API key under <b>Settings, Secrets and variables, '
    + 'Actions</b>, named <b>YOUTUBE_API_KEY</b>.</li>'
    + '<li><b>Actions</b> tab, <b>Collect comments</b>, <b>Run workflow</b>.</li>'
    + '<li>Reload this page when it finishes.</li></ol>'
    + '<p class="quiet">YouTube requires stored comments to be refreshed or deleted '
    + 'every 30 days, so the weekly run is what keeps them readable. Anything not '
    + 'refreshed loses its text and keeps only its link.</p>');
}

function videoOf(c) { return VIDEOS[c.video] || {}; }
function placesOf(c) {
  const v = videoOf(c);
  return Array.from(new Set((v.states || []).concat(v.via_states || [])));
}

function computeTotals() {
  STATE_TOTALS = {}; CUE_TOTALS = {};
  for (const c of ALL) {
    for (const s of placesOf(c)) STATE_TOTALS[s] = (STATE_TOTALS[s] || 0) + 1;
    for (const q of c.cues || []) CUE_TOTALS[q] = (CUE_TOTALS[q] || 0) + 1;
  }
}

/* =========================== filtering =========================== */

function passes(c) {
  if (c.expired && !F.showGone) return false;
  const v = videoOf(c);
  if (F.states.size && !placesOf(c).some(s => F.states.has(s))) return false;
  if (F.counties.size && !(v.counties || []).some(x => F.counties.has(x))) return false;
  if (F.topics.size && !(v.topics || []).some(t => F.topics.has(t))) return false;
  if (F.channels.size && !F.channels.has(v.channel)) return false;

  if (F.marks.size) {
    const k = CODES[c.id];
    let ok = false;
    if (F.marks.has('unread') && !(k && k.read)) ok = true;
    if (F.marks.has('star') && k && k.star) ok = true;
    if (F.marks.has('coded') && k && k.tags.length) ok = true;
    if (F.marks.has('noted') && k && k.note) ok = true;
    if (!ok) return false;
  }
  if (F.q) {
    const hay = ((c.text || '') + ' ' + (v.title || '') + ' '
                 + (v.counties || []).join(' ')).toLowerCase();
    if (!hay.includes(F.q.toLowerCase())) return false;
  }
  return true;
}
const current = () => ALL.filter(passes);

/* ============================ controls =========================== */

function chip(label, count, on, onClick, cls) {
  const b = document.createElement('button');
  b.className = 'chip' + (cls ? ' ' + cls : '');
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  b.innerHTML = esc4(label) + (count != null ? ' <span class="n">' + count + '</span>' : '');
  b.addEventListener('click', onClick);
  return b;
}
const toggle = (set, v) => set.has(v) ? set.delete(v) : set.add(v);

function wire() {
  $('#q').addEventListener('input', e => { F.q = e.target.value.trim(); render(); });
  $('#exCoded').addEventListener('click', exportCoded);
  $('#exVideos').addEventListener('click', exportVideos);
  $('#exSess').addEventListener('click', exportSession);
  $('#imSess').addEventListener('click', () => $('#sessfile').click());
  $('#sessfile').addEventListener('change', importSession);
}

const TOPIC_LABEL = { solar_siting: 'Siting and opposition',
  agrivoltaics: 'Agrivoltaics', solar_on_water: 'Canals and reservoirs' };
const topicLabel = id => TOPIC_LABEL[id] || id;
const MARK_LABEL = { unread: 'Not read yet', star: 'To follow up',
  coded: 'Coded', noted: 'With a note' };

function tallyBy(fn) {
  const out = {};
  for (const c of ALL) for (const k of fn(c)) out[k] = (out[k] || 0) + 1;
  return out;
}

function renderControls(hits) {
  const strip = $('#strip'); strip.innerHTML = '';
  const names = Object.keys(STATE_TOTALS).sort();
  const maxState = Math.max(1, ...Object.values(STATE_TOTALS));
  const live = {};
  for (const c of hits) for (const s of placesOf(c)) live[s] = (live[s] || 0) + 1;
  const few = names.length <= 16;

  $('#striplab').textContent = hits.length === ALL.length
    ? 'Comments per state. Click one to filter.'
    : 'Bar height is each state\u2019s full total; the solid part is what the filters leave.';

  for (const s of names) {
    const total = STATE_TOTALS[s], now = live[s] || 0;
    const b = document.createElement('button');
    b.className = 'stbar';
    b.setAttribute('aria-pressed', F.states.has(s) ? 'true' : 'false');
    b.title = s + ' \u2014 ' + now + ' shown of ' + total;
    const outline = Math.max(2, Math.round(34 * total / maxState));
    const fill = Math.round(outline * now / total);
    b.innerHTML = '<span class="bar"><span class="fill" style="height:' + outline + 'px">'
      + '<span class="fill live" style="display:block;height:' + fill + 'px;margin-top:'
      + (outline - fill) + 'px"></span></span></span><span class="lbl">'
      + esc4(s.length > 9 ? s.slice(0, 8) + '.' : s)
      + (few ? '<span class="cnt">' + now + '</span>' : '') + '</span>';
    b.addEventListener('click', () => { toggle(F.states, s); render(); });
    strip.appendChild(b);
  }

  const sp = $('#statepick'); sp.innerHTML = '';
  for (const s of names) sp.appendChild(chip(s, STATE_TOTALS[s], F.states.has(s),
    () => { toggle(F.states, s); render(); }));
  const guessed = ALL.filter(c => !(videoOf(c).states || []).length
    && (videoOf(c).via_states || []).length).length;
  $('#statenote').textContent = guessed
    ? guessed + ' of these sit under a video that names no state, and are placed by '
      + 'which search found it. The export keeps the two apart.' : '';

  const cp = $('#countypick'); cp.innerHTML = '';
  const counties = tallyBy(c => videoOf(c).counties || []);
  for (const [name, n] of Object.entries(counties).sort((a, b) => b[1] - a[1]).slice(0, 14))
    cp.appendChild(chip(name, n, F.counties.has(name),
      () => { toggle(F.counties, name); render(); }, 'g'));

  const tp = $('#topicpick'); tp.innerHTML = '';
  const topics = tallyBy(c => videoOf(c).topics || []);
  for (const t of Object.keys(topics).sort())
    tp.appendChild(chip(topicLabel(t), topics[t], F.topics.has(t),
      () => { toggle(F.topics, t); render(); }));

  const hp = $('#chanpick'); hp.innerHTML = '';
  const chans = tallyBy(c => videoOf(c).channel ? [videoOf(c).channel] : []);
  for (const [name, n] of Object.entries(chans).sort((a, b) => b[1] - a[1]).slice(0, 12))
    hp.appendChild(chip(name, n, F.channels.has(name),
      () => { toggle(F.channels, name); render(); }));

  const mp = $('#markpick'); mp.innerHTML = '';
  const cnt = fn => ALL.filter(fn).length;
  mp.appendChild(chip('Not read yet', cnt(c => !(CODES[c.id] && CODES[c.id].read)),
    F.marks.has('unread'), () => { toggle(F.marks, 'unread'); render(); }, 'g'));
  mp.appendChild(chip('To follow up', cnt(c => CODES[c.id] && CODES[c.id].star),
    F.marks.has('star'), () => { toggle(F.marks, 'star'); render(); }, 'g'));
  mp.appendChild(chip('Coded', cnt(c => CODES[c.id] && CODES[c.id].tags.length),
    F.marks.has('coded'), () => { toggle(F.marks, 'coded'); render(); }, 'g'));
  mp.appendChild(chip('With a note', cnt(c => CODES[c.id] && CODES[c.id].note),
    F.marks.has('noted'), () => { toggle(F.marks, 'noted'); render(); }, 'g'));

  const gp = $('#gonepick'); gp.innerHTML = '';
  const gone = ALL.filter(c => c.expired).length;
  gp.appendChild(chip(F.showGone ? 'Showing them' : 'Hidden', gone, F.showGone,
    () => { F.showGone = !F.showGone; render(); }, 'g'));
  $('#gonenote').textContent = gone
    ? 'YouTube requires stored comments to be refreshed or deleted every '
      + META.expire + ' days. These were not refreshed, so the text is gone. Your '
      + 'codes and notes on them survive, and the link still opens the comment on '
      + 'YouTube.'
    : 'Nothing has aged out yet. Export your coding regularly so the text is kept '
      + 'somewhere of your own before it does.';
}

function renderActive() {
  const box = $('#active'); box.innerHTML = '';
  const items = [];
  for (const v of F.states) items.push([v, () => F.states.delete(v)]);
  for (const v of F.counties) items.push([v, () => F.counties.delete(v)]);
  for (const v of F.topics) items.push([topicLabel(v), () => F.topics.delete(v)]);
  for (const v of F.channels) items.push([v, () => F.channels.delete(v)]);
  for (const v of F.marks) items.push([MARK_LABEL[v] || v, () => F.marks.delete(v)]);
  if (F.showGone) items.push(['including aged out', () => { F.showGone = false; }]);
  if (F.q) items.push(['contains "' + F.q + '"', () => { F.q = ''; $('#q').value = ''; }]);
  if (!items.length) return;

  for (const [label, drop] of items) {
    const b = document.createElement('button');
    b.className = 'pill'; b.title = 'Remove this filter';
    b.innerHTML = esc4(label) + '<span class="x" aria-hidden="true">\u00d7</span>';
    b.addEventListener('click', () => { drop(); render(); });
    box.appendChild(b);
  }
  if (items.length > 1) {
    const c = document.createElement('button');
    c.className = 'pill clear'; c.textContent = 'Clear all';
    c.addEventListener('click', () => {
      F.q = ''; $('#q').value = ''; F.showGone = false;
      F.states.clear(); F.counties.clear(); F.topics.clear();
      F.channels.clear(); F.marks.clear(); render();
    });
    box.appendChild(c);
  }
}

/* ============================ rendering ========================== */

function render() {
  const hits = current();
  renderControls(hits);
  renderActive();

  const live = ALL.filter(c => !c.expired).length;
  $('#counts').innerHTML = '<b>' + live + '</b> comments · '
    + Object.keys(VIDEOS).length + ' videos';
  $('#updated').textContent = META.updated
    ? 'collected through ' + META.updated.slice(0, 10) : '';
  const read = hits.filter(c => CODES[c.id] && CODES[c.id].read).length;
  $('#hits').textContent = hits.length + ' comment' + (hits.length === 1 ? '' : 's')
    + (hits.length ? ' · ' + read + ' read' : '');

  if (SELECTED && hits.some(c => c.id === SELECTED)) renderDetail(hits);
  else { SELECTED = null; renderList(hits); }

  renderWork(); renderTally(hits);

  const r = RUNS[0];
  $('#runinfo').textContent = r
    ? r.when.slice(0, 10) + ' — ' + r.new_videos + ' new videos, '
      + r.new_comments + ' new comments, ' + r.refreshed_comments + ' refreshed, '
      + r.expired_comments + ' aged out'
    : 'No run recorded yet.';
}

function renderList(hits) {
  const list = $('#list'); list.innerHTML = '';
  if (!hits.length) {
    list.innerHTML = '<p class="empty">Nothing matches that combination. Widen the '
      + 'states, or clear the search box.</p>';
    return;
  }
  const frag = document.createDocumentFragment();
  for (const c of hits.slice(0, 400)) {
    const v = videoOf(c), k = CODES[c.id];
    const d = document.createElement('div');
    d.className = 'cmt' + (c.expired ? ' gone' : '') + (k && k.read ? ' seen' : '');
    d.tabIndex = 0;
    d.innerHTML =
      '<div class="txt">' + (c.expired
        ? '<span class="quiet">Text no longer stored. Your coding and the link remain.</span>'
        : esc4(c.text)) + '</div>' +
      '<div class="src">' + (c.reply_to ? '<span class="rep">reply</span>' : '') +
        esc4(v.title || 'unknown video').slice(0, 90) +
        ' · ' + esc4(v.channel || '') +
        (c.published ? ' · ' + esc4(c.published) : '') +
        (c.likes ? ' · ' + c.likes + ' likes' : '') + '</div>' +
      ((v.counties || []).length
        ? '<div>' + v.counties.map(x => '<span class="tag place">' + esc4(x)
          + '</span>').join('') + '</div>' : '') +
      (k && k.star ? '<span class="tag star">to follow up</span>' : '') +
      (k && k.tags.length ? '<span class="tag">' + k.tags.length + ' coded</span>' : '');
    const open = () => { SELECTED = c.id; render(); window.scrollTo(0, 0); };
    d.addEventListener('click', open);
    d.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
    frag.appendChild(d);
  }
  list.appendChild(frag);
  if (hits.length > 400) {
    const p = document.createElement('p');
    p.className = 'quiet';
    p.textContent = 'Showing the first 400. Narrow the filter to see the rest.';
    list.appendChild(p);
  }
}

function renderDetail(hits) {
  const c = ALL.find(x => x.id === SELECTED);
  const v = videoOf(c), k = codeOf(c);
  const idx = hits.findIndex(x => x.id === c.id);
  const list = $('#list');

  const box = cat => '<label class="code" title="' + esc4(cat.hint) + '">'
    + '<input type="checkbox" data-code="' + cat.id + '"'
    + (k.tags.includes(cat.id) ? ' checked' : '') + '><span>'
    + esc4(cat.label) + '</span></label>';

  const upFront = BOOK.categories.filter(
    x => (c.cues || []).includes(x.id) || k.tags.includes(x.id));
  const rest = BOOK.categories.filter(x => !upFront.includes(x));

  const sug = upFront.length
    ? '<div class="sugbox"><div class="codegroup">Words in this comment point at '
      + 'these. Unlike a headline, a comment is long enough that these are usually '
      + 'close — still read it and decide.</div><div class="codegrid">'
      + upFront.map(box).join('') + '</div></div>' : '';

  const all = '<details class="allcodes"' + (upFront.length ? '' : ' open')
    + '><summary>All ' + BOOK.categories.length + ' categories</summary>'
    + '<div class="codegrid">' + BOOK.groups.map(g => {
        const cats = rest.filter(x => x.group === g.id);
        if (!cats.length) return '';
        return '<div><div class="codegroup">' + esc4(g.label) + '</div>'
             + cats.map(box).join('') + '</div>';
      }).join('') + '</div></details>';

  list.innerHTML =
    '<div class="navrow">' +
      '<button class="btn ghost" id="back">All comments</button>' +
      '<span class="spacer"></span>' +
      '<span class="kbd">' + (idx + 1) + ' of ' + hits.length + '</span>' +
      '<button class="btn ghost" id="prev"' + (idx > 0 ? '' : ' disabled') + '>Previous</button>' +
      '<button class="btn ghost" id="next"' + (idx < hits.length - 1 ? '' : ' disabled') +
        '>Next</button></div>' +
    '<div class="detail">' +
      '<div class="where">' + (c.reply_to ? 'A reply · ' : '') +
        esc4(c.published || '') + (c.likes ? ' · ' + c.likes + ' likes' : '') +
        ((v.counties || []).length ? ' · ' + esc4(v.counties.join(', ')) : '') +
        ((v.states || []).length ? ' · ' + esc4(v.states.join(', '))
          : (v.via_states || []).length
            ? ' · likely ' + esc4(v.via_states.join('/')) : '') + '</div>' +
      (c.expired
        ? '<div class="gonebox">The text of this comment is no longer stored here. '
          + 'YouTube requires stored comments to be refreshed or deleted every '
          + META.expire + ' days and this one was not refreshed. Your codes and '
          + 'note below are intact, and the link still opens it on YouTube.</div>'
        : '<p class="full">' + esc4(c.text) + '</p>') +
      '<h4>Where it came from</h4>' +
      '<p style="margin:0 0 10px;font-family:var(--serif);font-size:15px">'
        + esc4(v.title || 'unknown video') + '</p>' +
      '<p class="quiet" style="margin:0 0 12px">' + esc4(v.channel || '')
        + (v.published ? ' · ' + esc4(v.published) : '') + '</p>' +
      '<a class="btn" href="' + esc4(c.url) + '" target="_blank" rel="noopener">'
        + 'Open this comment on YouTube</a> ' +
      '<a class="btn ghost" href="' + esc4(v.url || '#') + '" target="_blank" '
        + 'rel="noopener">Watch the video</a>' +
      '<h4>Follow up</h4>' +
      '<button class="btn' + (k.star ? '' : ' ghost') + '" id="star">' +
        (k.star ? 'On your follow-up list' : 'Add to follow-up list') + '</button>' +
      '<h4>What this person raised</h4>' + sug + all +
      '<h4>Your note</h4>' +
      '<textarea class="note" id="note" placeholder="Worth quoting? Who is this '
        + 'person speaking as \u2014 neighbor, landowner, official?">'
        + esc4(k.note) + '</textarea>' +
    '</div>';

  if (!k.read) { k.read = true; saveCodes(); }
  $('#back').addEventListener('click', () => { SELECTED = null; render(); });
  const go = d => {
    const j = idx + d;
    if (j >= 0 && j < hits.length) { SELECTED = hits[j].id; render(); window.scrollTo(0, 0); }
  };
  $('#prev').addEventListener('click', () => go(-1));
  $('#next').addEventListener('click', () => go(1));
  $('#star').addEventListener('click', () => { k.star = !k.star; saveCodes(); render(); });
  $$('#list input[data-code]').forEach(bx => {
    bx.addEventListener('change', () => {
      const id = bx.dataset.code;
      if (bx.checked) { if (!k.tags.includes(id)) k.tags.push(id); }
      else k.tags = k.tags.filter(t => t !== id);
      saveCodes(); renderTally(current()); renderWork();
    });
  });
  $('#note').addEventListener('input', e => { k.note = e.target.value; saveCodes(); });
}

document.addEventListener('keydown', e => {
  if (!SELECTED) return;
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowRight') { const b = $('#next'); if (b && !b.disabled) b.click(); }
  if (e.key === 'ArrowLeft') { const b = $('#prev'); if (b && !b.disabled) b.click(); }
  if (e.key === 'Escape') { SELECTED = null; render(); }
});

function renderWork() {
  const ul = $('#work'); ul.innerHTML = '';
  const starred = ALL.filter(c => CODES[c.id] && CODES[c.id].star);
  if (!starred.length) {
    $('#worknote').textContent = 'Add a comment here when it is worth quoting or '
      + 'coming back to.';
    return;
  }
  $('#worknote').textContent = starred.length + ' set aside.';
  for (const c of starred) {
    const li = document.createElement('li');
    const k = CODES[c.id];
    li.innerHTML = '<div class="wnm">'
      + esc4((c.text || '(text aged out)').slice(0, 70)) + '</div>'
      + '<div class="wmeta">' + esc4(videoOf(c).channel || '') + ' · '
      + esc4(c.published || '')
      + (k.tags.length ? ' · ' + k.tags.length + ' coded' : ' · not yet coded')
      + '</div>';
    li.addEventListener('click', () => { SELECTED = c.id; render(); window.scrollTo(0, 0); });
    ul.appendChild(li);
  }
}

function renderTally(hits) {
  const ul = $('#tally'); ul.innerHTML = '';
  const confirmed = {}, suggested = {};
  for (const c of hits) {
    const k = CODES[c.id];
    if (k) for (const t of k.tags) confirmed[t] = (confirmed[t] || 0) + 1;
    for (const s of c.cues || []) suggested[s] = (suggested[s] || 0) + 1;
  }
  const own = Object.keys(confirmed).length > 0;
  const src = own ? confirmed : suggested;
  const denom = Math.max(1, ...Object.values(CUE_TOTALS), ...Object.values(confirmed));
  const rows = BOOK.categories.map(c => ({ c, n: src[c.id] || 0 }))
    .filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 14);
  if (!rows.length) { $('#tallynote').textContent = 'Nothing to count yet.'; return; }
  for (const { c, n } of rows) {
    const li = document.createElement('li');
    li.innerHTML = '<span class="tn">' + n + '</span><span class="tbar" style="width:'
      + Math.max(2, Math.round(70 * n / denom)) + 'px"></span><span class="tl" title="'
      + esc4(c.hint) + '">' + esc4(c.label) + '</span>';
    ul.appendChild(li);
  }
  $('#tallynote').textContent = own
    ? 'Counting the categories you confirmed after reading.'
    : 'Counting word matches in the comments. Comments run long enough that these '
    + 'are a fair first pass, but they are replaced by your own codes as soon as '
    + 'you confirm any.';
}

/* ============================ exporting ========================== */

const csvCell = v => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
function download(name, text, mime) {
  const blob = new Blob([text], { type: (mime || 'text/csv') + ';charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const stamp = () => new Date().toISOString().slice(0, 10);

function exportCoded() {
  const use = current();
  const head = ['comment_id', 'comment_text', 'published', 'likes', 'is_reply',
                'comment_url', 'video_title', 'channel', 'video_url', 'topics',
                'counties', 'state_in_video', 'state_from_search', 'text_aged_out',
                'read', 'follow_up', 'n_codes', 'note']
    .concat(BOOK.categories.map(c => 'code_' + c.id));
  const body = use.map(c => {
    const v = videoOf(c);
    const k = CODES[c.id] || { tags: [], note: '', star: false, read: false };
    return [c.id, c.text, c.published, c.likes, c.reply_to ? 1 : 0, c.url,
            v.title, v.channel, v.url, (v.topics || []).join(';'),
            (v.counties || []).join(';'), (v.states || []).join(';'),
            (v.via_states || []).join(';'), c.expired ? 1 : 0,
            k.read ? 1 : 0, k.star ? 1 : 0, k.tags.length, k.note]
      .concat(BOOK.categories.map(x => k.tags.includes(x.id) ? 1 : 0));
  });
  download('coded_comments_' + stamp() + '.csv',
    [head, ...body].map(r => r.map(csvCell).join(',')).join('\n'));
}

function exportVideos() {
  const head = ['video_id', 'title', 'channel', 'published', 'url', 'topics',
                'counties', 'state_in_video', 'state_from_search', 'score',
                'comments_collected', 'comments_disabled'];
  const body = Object.values(VIDEOS).map(v => [v.id, v.title, v.channel, v.published,
    v.url, (v.topics || []).join(';'), (v.counties || []).join(';'),
    (v.states || []).join(';'), (v.via_states || []).join(';'), v.score,
    v.comments || 0, v.comments_off ? 1 : 0]);
  download('videos_' + stamp() + '.csv',
    [head, ...body].map(r => r.map(csvCell).join(',')).join('\n'));
}

function exportSession() {
  const out = {};
  for (const c of ALL) {
    const k = CODES[c.id];
    if (!k) continue;
    if (!k.star && !k.note && !k.tags.length && !k.read) continue;
    out[c.id] = { tags: k.tags, star: k.star, note: k.note, read: k.read };
  }
  download('coding_backup_' + stamp() + '.json',
    JSON.stringify({ saved: new Date().toISOString(), codes: out }, null, 2),
    'application/json');
}

async function importSession(e) {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    const incoming = data.codes || {};
    let matched = 0;
    for (const c of ALL) {
      const hit = incoming[c.id];
      if (!hit) continue;
      const k = codeOf(c);
      k.tags = Array.from(new Set(k.tags.concat(hit.tags || [])));
      k.star = k.star || !!hit.star;
      k.read = k.read || !!hit.read;
      k.note = k.note ? k.note + (hit.note ? '\n' + hit.note : '') : (hit.note || '');
      matched++;
    }
    saveCodes(); render();
    alert('Restored ' + matched + ' of ' + Object.keys(incoming).length + ' comments.');
  } catch (err) {
    alert('That file could not be read: ' + err.message);
  }
  e.target.value = '';
}
