/* ============================================================
   KEROTION — app.js  (v2.1 — BUG-FREE EDITION)
   Kişisel İşletim Sistemi: YKS Takibi, Günlük, Odak Merkezi
   Vanilla JS · No Framework · Tüm modüller KerotionDB üzerinden
   ============================================================ */

/* ──────────────────────────────────────────────────────────────
   1. VERİ KATMANI — KerotionDB
   Tek kaynak (single source of truth). Tüm modüller sadece
   DB.state üzerinden okur/yazar; localStorage doğrudan kullanılmaz.
   ────────────────────────────────────────────────────────────── */
class KerotionDB {
  constructor() {
    this.keys = {
      pages:       'kerotion_data',
      journal:     'kerotion_journal',
      routines:    'kerotion_routines',
      todo:        'kerotion_todo',
      kanban:      'kerotion_kanban',
      yks:         'kerotion_yks',
      yksMistakes: 'kerotion_yks_mistakes',
      yksProgress: 'kerotion_yks_syllabus',
      pomoLog:     'kerotion_pomo_log',
      links:       'kerotion_links',
      inbox:       'kerotion_inbox',
      streak:      'kerotion_streak'
    };
    this.state = {};
    this.saveTimer = null;
  }

  init() {
    Object.keys(this.keys).forEach(key => {
      try {
        const raw = localStorage.getItem(this.keys[key]);
        this.state[key] = raw ? JSON.parse(raw) : this._defaults(key);
      } catch (e) {
        console.warn('KerotionDB: "' + key + '" parse hatasi, varsayilan yuklendi.', e);
        this.state[key] = this._defaults(key);
      }
    });
  }

  _defaults(key) {
    const map = {
      pages: [{
        id: 'page-1', title: 'Ilk Sayfam', parentId: null, isOpen: true,
        blocks: [
          { id: 'b1', type: 'h1',  content: "Kerotion'a Hos Geldiniz!" },
          { id: 'b2', type: 'p',   content: 'Burasi blok tabanli dijital calisma alaniniz.' },
          { id: 'b3', type: 'todo', content: "Slash (/) komutunu kullanmayi deneyin.", isChecked: false }
        ]
      }],
      journal:     [],
      routines:    {
        routines: ['TYT Paragraf/Problem Cozuldu', 'Gunun Konu Tekrari Yapildi', 'Kitap Okundu', 'Kodlama/Proje Gelistirildi'],
        habits:   {}
      },
      todo:        [],
      kanban:      { ideas: [], inProgress: [], done: [] },
      yks:         [],
      yksMistakes: [],
      yksProgress: {},
      pomoLog:     [],
      links:       [],
      inbox:       [],
      streak:      { current: 0, longest: 0, lastDate: null, history: [] }
    };
    return map[key] !== undefined ? map[key] : [];
  }

  save() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      Object.keys(this.keys).forEach(key => {
        try { localStorage.setItem(this.keys[key], JSON.stringify(this.state[key])); }
        catch (e) { console.error('KerotionDB save error:', key, e); }
      });
    }, 400);
  }
}

const DB = new KerotionDB();
DB.init();

/* ──────────────────────────────────────────────────────────────
   2. YKS MUFREDATI (11. Sinif)
   ────────────────────────────────────────────────────────────── */
const YKS_SYLLABUS = {
  'Matematik':  ['Trigonometri','Analitik Geometri','Fonksiyonlarda Uygulamalar','Denklem ve Esitsizlik Sistemleri','Cember ve Daire','Uzay Geometri','Olasilik'],
  'Fizik':      ['Vektorler','Bagil Hareket',"Newton'in Hareket Yasalari",'Bir Boyutta Sabit Ivmeli Hareket','Iki Boyutta Hareket','Enerji ve Hareket','Itme ve Cizgisel Momentum','Tork','Denge','Elektriksel Kuvvet ve Alan'],
  'Kimya':      ['Modern Atom Teorisi','Gazlar','Sivi Cozeltiler ve Cozunurluk','Kimyasal Tepkimelerde Enerji','Kimyasal Tepkimelerde Hiz','Kimyasal Tepkimelerde Denge'],
  'Biyoloji':   ['Denetleyici ve Duzenleyici Sistemler','Duyu Organlari','Destek ve Hareket Sistemi','Sindirim Sistemi','Dolasim Sistemleri','Solunum Sistemi','Uriner Sistem','Ureme Sistemi ve Embriyonik Gelisim'],
  'Turkce':     ['Paragrafta Anlam','Cumlenin Ogeleri','Yazim Kurallari','Noktalama Isaretleri','Sozcuk Turleri','Fiiller','Anlatim Bozukluklari']
};

/* ──────────────────────────────────────────────────────────────
   3. UYGULAMA DURUMU
   ────────────────────────────────────────────────────────────── */
let activePageId      = DB.state.pages.length > 0 ? DB.state.pages[0].id : null;
let currentView       = 'pages';
let activeJournalDate = null;

// Pomodoro (volatile — DB'ye kaydedilmez)
let pomoTimer      = null;
let pomoWorkMins   = 25;
let pomoBreakMins  = 5;
let pomoTimeLeft   = 25 * 60;
let pomoIsRunning  = false;
let pomoState      = 'idle';
let pomoCycleCount = 0;

let activeContextBlockId = null;
const slashMenuState = { active: false, blockId: null, selectedIndex: 0 };

/* ──────────────────────────────────────────────────────────────
   4. YARDIMCILAR
   ────────────────────────────────────────────────────────────── */
const generateId    = () => Math.random().toString(36).substr(2, 9);
const scheduleSave  = ()  => DB.save();
const getActivePage = ()  => DB.state.pages.find(p => p.id === activePageId);

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

/* ──────────────────────────────────────────────────────────────
   5. DOM REFERANSLARI
   Tamamı refreshDOM() içinde toplanir — parse aninda HICBIR
   DOM erisimi yapilmaz; null-reference crash imkansizdir.
   ────────────────────────────────────────────────────────────── */
const DOM = {};

function refreshDOM() {
  const g = id => document.getElementById(id);

  DOM.sidebar        = g('sidebar');
  DOM.sidebarToggle  = g('sidebarToggle');
  DOM.sidebarOpenBtn = g('sidebarOpenBtn');
  DOM.btnAddRootPage = g('btnAddRootPage');
  DOM.pageTree       = g('pageTree');

  DOM.pageTitle       = g('pageTitle');
  DOM.blocksContainer = g('blocksContainer');
  DOM.slashMenu       = g('slashMenu');
  DOM.slashMenuList   = g('slashMenuList');

  DOM.pageView     = g('pageView');
  DOM.journalView  = g('journalView');
  DOM.routinesView = g('routinesView');
  DOM.inboxView    = g('inboxView');
  DOM.todoView     = g('todoView');
  DOM.kanbanView   = g('kanbanView');
  DOM.yksView      = g('yksView');
  DOM.linksView    = g('linksView');

  DOM.btnShowPages    = g('btnShowPages');
  DOM.btnShowJournal  = g('btnShowJournal');
  DOM.btnShowRoutines = g('btnShowRoutines');
  DOM.btnShowInbox    = g('btnShowInbox');
  DOM.btnShowTodo     = g('btnShowTodo');
  DOM.btnShowKanban   = g('btnShowKanban');
  DOM.btnShowYks      = g('btnShowYks');
  DOM.btnShowMistakes = g('btnShowMistakes');
  DOM.btnShowSyllabus = g('btnShowSyllabus');
  DOM.btnShowLinks    = g('btnShowLinks');

  DOM.yksTabBtns     = document.querySelectorAll('.yks-tab-btn');
  DOM.yksTabContents = document.querySelectorAll('.yks-tab-content');
  DOM.btnMistakeAdd  = g('btnMistakeAdd');
  DOM.mistakeList    = g('mistakeList');
  DOM.syllabusGrid   = g('syllabusGrid');

  /* FIX: Tüm pomodoro ID'leri HTML ile eslestirildi */
  DOM.pomoTimeDisplay   = g('pomoTimeDisplay');
  DOM.pomoStatusText    = g('pomoStatusText');
  DOM.pomoPlayPause     = g('pomoPlayPause');
  DOM.pomoReset         = g('pomoReset');
  DOM.btnPomoSettings   = g('btnPomoSettings');
  DOM.pomoSettingsPanel = g('pomoSettingsPanel');
  DOM.pomoCustomWork    = g('pomoCustomWork');
  DOM.pomoCustomBreak   = g('pomoCustomBreak');
  DOM.pomoApplyCustom   = g('btnPomoApplyCustom');
  DOM.pomoFocusTarget   = g('pomoFocusTarget');  /* FIX: dogru ID */
  DOM.pomoModes         = document.querySelectorAll('.pomo-mode');
  DOM.pomoZoneBtn       = g('btnPomoZone');

  /* FIX: Zone elementleri refreshDOM'a eklendi */
  DOM.theZone          = g('theZone');
  DOM.btnZoneExit      = g('btnZoneExit');
  DOM.zoneTimerDisplay = g('zoneTimerDisplay');
  DOM.zoneStatusText   = g('zoneStatusText');
  DOM.zoneCycleDisplay = g('zoneCycleDisplay');

  DOM.blockContextMenu = g('blockContextMenu');
  DOM.btnDeleteBlock   = g('btnDeleteBlock');
  DOM.contextColors    = document.querySelectorAll('.color-badge');

  /* FIX: brain dump, todo, kanban inputlari artik burada tanimlaniyor */
  DOM.bdModal      = g('brainDumpModal');
  DOM.bdInput      = g('brainDumpInput');
  DOM.todoInput    = g('todoInput');
  DOM.kanbanInput  = g('kanbanInput');
  DOM.btnKanbanAdd = g('btnKanbanAdd');

  if (!DOM.sidebar || !DOM.pageView || !DOM.blocksContainer) {
    console.error('refreshDOM: Kritik UI elementleri eksik!');
  }
}

/* ──────────────────────────────────────────────────────────────
   6. SIDEBAR
   ────────────────────────────────────────────────────────────── */
function toggleSidebar() {
  const hidden = DOM.sidebar.classList.toggle('hidden');
  DOM.sidebarOpenBtn.classList.toggle('visible', hidden);
}

/* ──────────────────────────────────────────────────────────────
   7. SAYFA AGACI
   ────────────────────────────────────────────────────────────── */
function deletePage(pageId) {
  function collectIds(id) {
    const ids = [id];
    DB.state.pages.filter(p => p.parentId === id).forEach(child => {
      collectIds(child.id).forEach(cid => ids.push(cid));
    });
    return ids;
  }
  const toDelete = collectIds(pageId);
  DB.state.pages = DB.state.pages.filter(p => !toDelete.includes(p.id));

  if (toDelete.includes(activePageId)) {
    activePageId = DB.state.pages.length > 0 ? DB.state.pages[0].id : null;
    if (activePageId) openPage(activePageId);
    else {
      DOM.pageTitle.value = '';
      DOM.blocksContainer.innerHTML = '';
    }
  }
  scheduleSave();
  renderTree();
}

function createPage(parentId = null) {
  const page = {
    id: generateId(), title: '', parentId, isOpen: true,
    blocks: [{ id: generateId(), type: 'p', content: '' }]
  };
  DB.state.pages.push(page);
  if (parentId) {
    const parent = DB.state.pages.find(p => p.id === parentId);
    if (parent) parent.isOpen = true;
  }
  scheduleSave();
  openPage(page.id);
  renderTree();
}

function renderTree(parentId = null, container = DOM.pageTree) {
  if (!container) return;
  if (parentId === null) container.innerHTML = '';

  const children = DB.state.pages.filter(p => p.parentId === parentId);
  if (!children.length) return;

  children.forEach(page => {
    const node    = document.createElement('div');
    node.className = 'tree-node';

    const content = document.createElement('div');
    content.className = 'tree-node-content' + (page.id === activePageId ? ' active' : '');
    content.addEventListener('click', e => {
      if (e.target.closest('.tree-toggle') || e.target.closest('.tree-add-sub')) return;
      openPage(page.id);
    });

    const hasChildren = DB.state.pages.some(p => p.parentId === page.id);

    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle' + (page.isOpen ? ' open' : '') + (!hasChildren ? ' hidden-arrow' : '');
    toggle.innerHTML = '▶';
    toggle.addEventListener('click', () => {
      if (!hasChildren) return;
      page.isOpen = !page.isOpen;
      scheduleSave();
      renderTree();
    });

    const icon  = document.createElement('span');
    icon.className = 'tree-icon';
    icon.textContent = '📄';

    const title = document.createElement('span');
    title.className = 'tree-title-span';
    title.textContent = page.title || 'Isimsiz';

    const addSub = document.createElement('button');
    addSub.className = 'tree-add-sub';
    addSub.textContent = '+';
    addSub.title = 'Alt sayfa ekle';
    addSub.addEventListener('click', () => createPage(page.id));

    const delBtn = document.createElement('button');
    delBtn.className = 'tree-delete-btn';
    delBtn.innerHTML = '🗑';
    delBtn.title = 'Sayfayı sil';
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      deletePage(page.id);
    });

    content.appendChild(toggle);
    content.appendChild(icon);
    content.appendChild(title);
    content.appendChild(addSub);
    content.appendChild(delBtn);
    node.appendChild(content);

    if (hasChildren) {
      const wrap = document.createElement('div');
      wrap.className = 'tree-children' + (page.isOpen ? ' open' : '');
      node.appendChild(wrap);
      renderTree(page.id, wrap);
    }

    container.appendChild(node);
  });
}

function openPage(pageId) {
  activePageId = pageId;
  const page = getActivePage();
  if (!page) return;
  DOM.pageTitle.value = page.title;
  autoResize(DOM.pageTitle);
  renderBlocks();
  renderTree();
  if (currentView !== 'pages') switchView('pages');
}

/* ──────────────────────────────────────────────────────────────
   8. ROUTER — GORUNUM YONETIMI
   FIX: Tum .editor-container gizlenir, sadece hedef active olur.
   Overlap sorunu kokten cozuldu.
   ────────────────────────────────────────────────────────────── */
const VIEW_MAP = {
  pages: 'pageView', journal: 'journalView', routines: 'routinesView',
  inbox: 'inboxView', todo: 'todoView', kanban: 'kanbanView',
  yks: 'yksView', mistakes: 'yksView', syllabus: 'yksView', links: 'linksView',
  dashboard: 'dashboardView'
};

function switchView(viewName) {
  /* 1. Tum goruntuleri gizle */
  document.querySelectorAll('.editor-container').forEach(el => {
    el.classList.remove('view-active');
    el.classList.add('view-hidden');
  });

  /* 2. Hedefi goster */
  const targetId = VIEW_MAP[viewName] || viewName;
  const target   = document.getElementById(targetId);
  if (target) {
    target.classList.remove('view-hidden');
    target.classList.add('view-active');
  }

  currentView = viewName;

  /* 3. Sidebar aktif buton */
  document.querySelectorAll('.menu-item').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById('btnShow' + viewName.charAt(0).toUpperCase() + viewName.slice(1));
  if (activeBtn) activeBtn.classList.add('active');

  /* 4. YKS ic sekme */
  if (viewName === 'mistakes') {
    switchYksTab('mistakes');
    // Revizyon panelini hata defterinin altında göster
    const rw = document.getElementById('revisionWrapper');
    if (rw) { rw.classList.remove('view-hidden'); renderRevisionPanel(); }
  } else {
    const rw = document.getElementById('revisionWrapper');
    if (rw) rw.classList.add('view-hidden');
    if (viewName === 'syllabus') switchYksTab('syllabus');
    else if (viewName === 'yks') switchYksTab('analiz');
  }

  /* 5. Modul render */
  const renderMap = {
    yks:      () => { renderYksBar(); renderMistakeVault(); renderSyllabusTracker(); },
    mistakes: () => { renderYksBar(); renderMistakeVault(); renderSyllabusTracker(); },
    syllabus: () => { renderYksBar(); renderMistakeVault(); renderSyllabusTracker(); },
    journal:  renderJournalList,
    routines: renderRoutinesGrid,
    inbox:    renderInbox,
    todo:     renderTodo,
    kanban:   renderKanban,
    links:    renderLinks,
    dashboard: renderDashboard
  };
  if (renderMap[viewName]) renderMap[viewName]();
}

/* ──────────────────────────────────────────────────────────────
   9. BLOK MIMARISI
   ────────────────────────────────────────────────────────────── */
const PLACEHOLDERS = {
  h1: 'Baslik 1', h2: 'Baslik 2', h3: 'Baslik 3',
  p:  "Yazmak icin tiklayin veya '/' tusuna basin",
  todo: 'Yapilacak', ul: 'Liste ogesi'
};

function renderBlocks() {
  DOM.blocksContainer.innerHTML = '';
  const page = getActivePage();
  if (!page) return;
  if (!page.blocks.length) {
    page.blocks.push({ id: generateId(), type: 'p', content: '' });
    scheduleSave();
  }
  page.blocks.forEach(block => DOM.blocksContainer.appendChild(createBlockElement(block)));
}

function createBlockElement(block) {
  const wrap = document.createElement('div');
  wrap.className = 'kerotion-block-wrap ' + block.type;
  if (block.type === 'todo' && block.isChecked) wrap.classList.add('checked');
  wrap.dataset.id = block.id;

  const controls = document.createElement('div');
  controls.className = 'block-controls';

  const btnPlus = document.createElement('div');
  btnPlus.className = 'block-btn';
  btnPlus.textContent = '+';
  btnPlus.addEventListener('click', () => insertNewBlockAfter(block.id));

  const btnDrag = document.createElement('div');
  btnDrag.className = 'block-btn';
  btnDrag.innerHTML = '⋮⋮';
  btnDrag.draggable = true;
  btnDrag.addEventListener('click', e => {
    e.stopPropagation();
    showContextMenu(e.pageX + 10, e.pageY + 10, block.id);
  });
  btnDrag.addEventListener('dragstart', e => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', block.id);
    setTimeout(() => wrap.classList.add('dragging'), 0);
  });
  btnDrag.addEventListener('dragend', () => {
    wrap.classList.remove('dragging');
    document.querySelectorAll('.kerotion-block-wrap').forEach(el =>
      el.classList.remove('drag-over', 'drag-over-bottom'));
  });

  wrap.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = wrap.getBoundingClientRect();
    const mid  = rect.top + rect.height / 2;
    wrap.classList.toggle('drag-over',        e.clientY < mid);
    wrap.classList.toggle('drag-over-bottom', e.clientY >= mid);
  });
  wrap.addEventListener('dragleave', () => wrap.classList.remove('drag-over', 'drag-over-bottom'));
  wrap.addEventListener('drop', e => {
    e.preventDefault();
    wrap.classList.remove('drag-over', 'drag-over-bottom');
    const dragId = e.dataTransfer.getData('text/plain');
    if (dragId === block.id) return;
    const pg = getActivePage();
    const di = pg.blocks.findIndex(b => b.id === dragId);
    const ti = pg.blocks.findIndex(b => b.id === block.id);
    if (di < 0 || ti < 0) return;
    const [moved] = pg.blocks.splice(di, 1);
    const newTi   = pg.blocks.findIndex(b => b.id === block.id);
    const rect    = wrap.getBoundingClientRect();
    pg.blocks.splice(e.clientY >= rect.top + rect.height / 2 ? newTi + 1 : newTi, 0, moved);
    scheduleSave();
    renderBlocks();
  });

  controls.appendChild(btnPlus);
  controls.appendChild(btnDrag);

  if (block.type === 'todo') {
    const cb = document.createElement('div');
    cb.className = 'todo-checkbox';
    cb.dataset.checked = !!block.isChecked;
    cb.addEventListener('click', () => {
      block.isChecked = !block.isChecked;
      cb.dataset.checked = block.isChecked;
      wrap.classList.toggle('checked', block.isChecked);
      scheduleSave();
    });
    wrap.appendChild(cb);
  }

  const el = document.createElement('div');
  el.className = 'kerotion-block ' + block.type;
  el.contentEditable = 'true';
  el.id = 'block-' + block.id;
  el.textContent = block.content || '';
  el.dataset.placeholder = PLACEHOLDERS[block.type] || 'Bir seyler yazin...';

  el.addEventListener('input', () => {
    block.content = el.textContent;
    scheduleSave();
    if (slashMenuState.active) {
      if (!el.textContent.includes('/')) closeSlashMenu();
    } else if (el.textContent.endsWith('/')) {
      openSlashMenu(block.id, el);
    }
  });
  el.addEventListener('keydown', e => handleBlockKeydown(e, block, el));
  el.addEventListener('blur',   () => setTimeout(() => { if (slashMenuState.active) closeSlashMenu(); }, 150));

  if (block.color && block.color !== '#f4f4f5') el.style.color = block.color;
  if (block.fontSize) el.style.fontSize = block.fontSize + 'px';
  if (block.fontWeight) el.style.fontWeight = block.fontWeight;
  if (block.fontStyle)  el.style.fontStyle  = block.fontStyle;
  if (block.textAlign)  el.style.textAlign  = block.textAlign;

  wrap.appendChild(controls);
  wrap.appendChild(el);
  return wrap;
}

function insertNewBlockAfter(currentId, newType = 'p') {
  const page  = getActivePage();
  const idx   = page.blocks.findIndex(b => b.id === currentId);
  const nb    = { id: generateId(), type: newType, content: '' };
  if (newType === 'p' && idx >= 0) {
    const ct = page.blocks[idx].type;
    if (ct === 'ul' || ct === 'todo') nb.type = ct;
  }
  page.blocks.splice(idx + 1, 0, nb);
  scheduleSave();
  const cw  = DOM.blocksContainer.querySelector('[data-id="' + currentId + '"]');
  const nEl = createBlockElement(nb);
  if (cw) cw.after(nEl); else DOM.blocksContainer.appendChild(nEl);
  focusBlock(nb.id);
  return nb;
}

function handleBlockKeydown(e, block, el) {
  if (slashMenuState.active) {
    if (e.key === 'ArrowDown') { e.preventDefault(); navigateSlashMenu(1);  return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); navigateSlashMenu(-1); return; }
    if (e.key === 'Enter')     { e.preventDefault(); applySlashMenuSelection(); return; }
    if (e.key === 'Escape')    { closeSlashMenu(); return; }
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    insertNewBlockAfter(block.id);
  } else if (e.key === 'Backspace') {
    const sel = window.getSelection();
    if (sel.anchorOffset === 0 && el.textContent === '') {
      e.preventDefault();
      if (block.type !== 'p') changeBlockType(block.id, 'p');
      else deleteBlock(block.id);
    }
  }
}

function deleteBlock(id) {
  const page = getActivePage();
  if (page.blocks.length <= 1) return;
  const idx = page.blocks.findIndex(b => b.id === id);
  if (idx < 0) return;
  page.blocks.splice(idx, 1);
  scheduleSave();
  const wrap = DOM.blocksContainer.querySelector('[data-id="' + id + '"]');
  if (wrap) wrap.remove();
  if (idx > 0) focusBlock(page.blocks[idx - 1].id, true);
  else DOM.pageTitle.focus();
}

function focusBlock(id, atEnd = false) {
  const el = document.getElementById('block-' + id);
  if (!el) return;
  el.focus();
  if (atEnd) {
    const r = document.createRange();
    const s = window.getSelection();
    r.selectNodeContents(el);
    r.collapse(false);
    s.removeAllRanges();
    s.addRange(r);
  }
}

function changeBlockType(id, newType) {
  const page  = getActivePage();
  const block = page.blocks.find(b => b.id === id);
  if (!block) return;
  block.type = newType;
  if (block.content.endsWith('/')) block.content = block.content.slice(0, -1);
  scheduleSave();
  const old = DOM.blocksContainer.querySelector('[data-id="' + id + '"]');
  const nw  = createBlockElement(block);
  if (old) DOM.blocksContainer.replaceChild(nw, old);
  focusBlock(id, true);
}

function getDefaultFontSize(type) {
  const map = { h1: 32, h2: 26, h3: 20, p: 16, ul: 16, todo: 16 };
  return map[type] || 16;
}

function changeBlockColor(id, color) {
  const page  = getActivePage();
  const block = page.blocks.find(b => b.id === id);
  if (!block) return;
  block.color = color;
  scheduleSave();
  renderBlocks();
}

/* ──────────────────────────────────────────────────────────────
   10. SLASH MENU
   ────────────────────────────────────────────────────────────── */
function openSlashMenu(blockId, el) {
  slashMenuState.active = true;
  slashMenuState.blockId = blockId;
  slashMenuState.selectedIndex = 0;
  const rect = el.getBoundingClientRect();
  DOM.slashMenu.style.display = 'block';
  DOM.slashMenu.style.top  = (rect.bottom + window.scrollY + 5) + 'px';
  DOM.slashMenu.style.left = (rect.left + window.scrollX) + 'px';
  updateSlashMenuSelection();
}
function closeSlashMenu() {
  slashMenuState.active = false;
  DOM.slashMenu.style.display = 'none';
}
function navigateSlashMenu(dir) {
  const items = DOM.slashMenuList.querySelectorAll('.slash-menu-item');
  slashMenuState.selectedIndex = (slashMenuState.selectedIndex + dir + items.length) % items.length;
  updateSlashMenuSelection();
}
function updateSlashMenuSelection() {
  DOM.slashMenuList.querySelectorAll('.slash-menu-item').forEach((item, idx) =>
    item.classList.toggle('active', idx === slashMenuState.selectedIndex));
}
function applySlashMenuSelection() {
  if (!slashMenuState.active) return;
  const items    = DOM.slashMenuList.querySelectorAll('.slash-menu-item');
  const selected = items[slashMenuState.selectedIndex];
  if (selected && slashMenuState.blockId) changeBlockType(slashMenuState.blockId, selected.dataset.type);
  closeSlashMenu();
}

/* ──────────────────────────────────────────────────────────────
   11. BLOCK CONTEXT MENU
   ────────────────────────────────────────────────────────────── */
function showContextMenu(x, y, blockId) {
  activeContextBlockId = blockId;
  const block = getActivePage()?.blocks.find(b => b.id === blockId);

  // Position
  DOM.blockContextMenu.style.cssText = 'display:block; left:' + x + 'px; top:' + y + 'px;';

  if (!block) return;

  // Highlight active turn-into type
  DOM.blockContextMenu.querySelectorAll('.ctx-turn-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === block.type);
  });

  // Highlight active font size
  const currentSize = block.fontSize || getDefaultFontSize(block.type);
  DOM.blockContextMenu.querySelectorAll('.ctx-size-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.size) === currentSize);
  });

  // Highlight active format buttons
  document.getElementById('ctxBtnBold')?.classList.toggle('active', block.fontWeight === 'bold');
  document.getElementById('ctxBtnItalic')?.classList.toggle('active', block.fontStyle === 'italic');
  document.getElementById('ctxBtnAlignLeft')?.classList.toggle('active', block.textAlign === 'left');
  document.getElementById('ctxBtnAlignCenter')?.classList.toggle('active', block.textAlign === 'center');
  document.getElementById('ctxBtnAlignRight')?.classList.toggle('active', block.textAlign === 'right');
}
function hideContextMenu() {
  DOM.blockContextMenu.style.display = 'none';
  activeContextBlockId = null;
}

/* ──────────────────────────────────────────────────────────────
   12. POMODORO
   ────────────────────────────────────────────────────────────── */
function formatPomoTime(s) {
  return Math.floor(s/60).toString().padStart(2,'0') + ':' + (s%60).toString().padStart(2,'0');
}

function updatePomoDisplay() {
  const tStr = formatPomoTime(pomoTimeLeft);
  let label  = 'Bekliyor';
  if (pomoState === 'work')  label = 'CALISMA';
  if (pomoState === 'break') label = 'MOLA';

  if (DOM.pomoTimeDisplay)  DOM.pomoTimeDisplay.textContent  = tStr;
  if (DOM.pomoStatusText)   DOM.pomoStatusText.textContent   = 'Durum: ' + label + ' (Seans: ' + pomoCycleCount + ')';
  if (DOM.zoneTimerDisplay) DOM.zoneTimerDisplay.textContent = tStr;
  if (DOM.zoneStatusText)   DOM.zoneStatusText.textContent   =
    pomoState === 'work' ? 'ODAK: CALISMA' : pomoState === 'break' ? 'ZiHiN: MOLA' : 'ODAK MERKEZi';
  if (DOM.zoneCycleDisplay) DOM.zoneCycleDisplay.textContent = 'Tamamlanan Seans: ' + pomoCycleCount;

  document.title = pomoIsRunning
    ? (pomoState === 'work' ? '🧠' : '☕') + ' [' + tStr + '] Kerotion'
    : 'Kerotion — Workspace';
}

function playPomoSound() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.7);
  } catch(e) { /* Ses desteklenmiyor */ }
}

function notifyPomoEnd(isWork) {
  playPomoSound();
  if (Notification.permission === 'granted') {
    new Notification(isWork ? '☕ Odak Seansı Bitti' : '🧠 Mola Bitti', {
      body: isWork ? 'Gerçekten iyi odaklandın. Dinlen.' : 'Zinciri kırmıyoruz. Sonraki adıma!'
    });
  }
}

function endPomodoro() {
  clearInterval(pomoTimer);
  pomoIsRunning = false;
  if (DOM.pomoPlayPause) DOM.pomoPlayPause.textContent = '▶';

  if (pomoState === 'work') {
    notifyPomoEnd(true);
    pomoCycleCount++;
    const today  = getTodayDateStr();
    const target = DOM.pomoFocusTarget ? DOM.pomoFocusTarget.value : 'Genel';
    DB.state.pomoLog.push({ date: today, time: new Date().toLocaleTimeString(), target, duration: pomoWorkMins });
    if (!DB.state.routines.habits[today]) DB.state.routines.habits[today] = {};
    DB.state.routines.habits[today]['Pomodoro_Sayisi'] =
      (DB.state.routines.habits[today]['Pomodoro_Sayisi'] || 0) + 1;
    updateStreak(today);
    scheduleSave();
    if (currentView === 'routines') renderRoutinesGrid();
    pomoState    = 'break';
    pomoTimeLeft = pomoBreakMins * 60;
  } else {
    notifyPomoEnd(false);
    pomoState    = 'work';
    pomoTimeLeft = pomoWorkMins * 60;
  }
  updatePomoDisplay();
}

function startPomoTimer() {
  if (Notification.permission !== 'granted' && Notification.permission !== 'denied')
    Notification.requestPermission();
  if (pomoTimeLeft <= 0) return;
  if (pomoState === 'idle') { pomoState = 'work'; pomoTimeLeft = pomoWorkMins * 60; }
  pomoIsRunning = true;
  if (DOM.pomoPlayPause) DOM.pomoPlayPause.textContent = '⏸';
  updatePomoDisplay();
  pomoTimer = setInterval(() => { pomoTimeLeft--; updatePomoDisplay(); if (pomoTimeLeft <= 0) endPomodoro(); }, 1000);
}

function togglePomoTimer() {
  if (pomoIsRunning) {
    clearInterval(pomoTimer); pomoIsRunning = false;
    if (DOM.pomoPlayPause) DOM.pomoPlayPause.textContent = '▶';
    updatePomoDisplay();
  } else { startPomoTimer(); }
}

function setPomoMode(w, b) {
  pomoWorkMins = w; pomoBreakMins = b; pomoCycleCount = 0; resetPomoTimer();
  DOM.pomoModes.forEach(btn =>
    btn.classList.toggle('active', parseInt(btn.dataset.w) === w && parseInt(btn.dataset.b) === b));
}

function resetPomoTimer() {
  clearInterval(pomoTimer); pomoIsRunning = false; pomoState = 'idle';
  pomoTimeLeft = pomoWorkMins * 60;
  if (DOM.pomoPlayPause) DOM.pomoPlayPause.textContent = '▶';
  if (DOM.pomoModes) DOM.pomoModes.forEach(btn => btn.classList.remove('active'));
  updatePomoDisplay();
}

function toggleZone() { if (DOM.theZone) DOM.theZone.classList.toggle('zone-hidden'); }

/* ──────────────────────────────────────────────────────────────
   13. GUNLUK (JOURNAL)
   ────────────────────────────────────────────────────────────── */
function getTodayDateStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function renderJournalList() {
  const listEl     = document.getElementById('journalList');
  const editorEl   = document.getElementById('journalEditor');
  const controlsEl = document.querySelector('.journal-controls');
  if (!listEl) return;
  listEl.classList.remove('view-hidden');
  if (controlsEl) controlsEl.classList.remove('view-hidden');
  if (editorEl)   editorEl.classList.add('view-hidden');
  listEl.innerHTML = '';

  if (!DB.state.journal.length) {
    listEl.innerHTML = "<p style='color:var(--text-muted);'>Henüz günlük kaydı yok. Bugün yazmaya başla!</p>";
    return;
  }
  [...DB.state.journal].sort((a,b) => b.date.localeCompare(a.date)).forEach(entry => {
    const card = document.createElement('div');
    card.className = 'journal-card';
    card.innerHTML = '<div class="journal-card-header"><span class="journal-card-title">' + entry.date + '</span></div>' +
      '<div class="journal-card-preview">' + (entry.notes ? entry.notes.slice(0,100) + '...' : 'Boş kayıt...') + '</div>';
    card.addEventListener('click', () => openJournalEditor(entry.date));
    listEl.appendChild(card);
  });
}

function openJournalEditor(dateStr) {
  activeJournalDate = dateStr;
  let entry = DB.state.journal.find(j => j.date === dateStr);
  if (!entry) {
    entry = { date: dateStr, notes: '', learned: '', better: '' };
    DB.state.journal.push(entry);
    scheduleSave();
  }
  const dateEl = document.getElementById('journalCurrentDate');
  if (dateEl) dateEl.textContent = dateStr;
  const n = document.getElementById('journalNotes');   if (n) n.value = entry.notes   || '';
  const l = document.getElementById('journalLearned'); if (l) l.value = entry.learned || '';
  const b = document.getElementById('journalBetter');  if (b) b.value = entry.better  || '';
  document.getElementById('journalList')?.classList.add('view-hidden');
  document.querySelector('.journal-controls')?.classList.add('view-hidden');
  document.getElementById('journalEditor')?.classList.remove('view-hidden');
}

function saveJournalEntry() {
  if (!activeJournalDate) return;
  const entry = DB.state.journal.find(j => j.date === activeJournalDate);
  if (entry) {
    entry.notes   = document.getElementById('journalNotes')?.value   || '';
    entry.learned = document.getElementById('journalLearned')?.value || '';
    entry.better  = document.getElementById('journalBetter')?.value  || '';
    scheduleSave();
    const btn = document.getElementById('btnSaveJournal');
    if (btn) { btn.textContent = 'Kaydedildi!'; setTimeout(() => btn.textContent = 'Kaydet', 2000); }
  }
}

/* ──────────────────────────────────────────────────────────────
   14. RUTiN TAKiBi
   ────────────────────────────────────────────────────────────── */
function renderRoutinesGrid() {
  const container = document.getElementById('routinesTableWrapper');
  if (!container) return;
  container.innerHTML = '';
  const routines = DB.state.routines.routines;
  if (!routines.length) {
    container.innerHTML = "<p style='color:var(--text-muted);'>Hiç rutin eklenmemiş.</p>"; return;
  }
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return {
      date: d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'),
      name: d.toLocaleDateString('tr-TR', { weekday: 'short' }),
      num:  d.getDate()
    };
  });
  const grid = document.createElement('div');
  grid.className = 'routines-grid';
  grid.style.gridTemplateColumns = '200px repeat(' + days.length + ', minmax(60px, 1fr))';

  const emptyH = document.createElement('div');
  emptyH.className = 'rt-cell rt-header-habit';
  emptyH.textContent = 'Hedefler';
  grid.appendChild(emptyH);

  days.forEach(d => {
    const cell = document.createElement('div');
    cell.className = 'rt-cell rt-header-date';
    cell.innerHTML = '<span>' + d.name + '</span><span class="day">' + d.num + '</span>';
    grid.appendChild(cell);
  });

  routines.forEach(routine => {
    const nameCell = document.createElement('div');
    nameCell.className = 'rt-cell rt-habit-name';
    const ns = document.createElement('span');
    ns.textContent = routine;
    const del = document.createElement('button');
    del.className = 'rt-habit-delete'; del.innerHTML = '×'; del.title = 'Rutini Sil';
    del.onclick = () => {
      if (confirm('"' + routine + '" silinecek, emin misiniz?')) {
        DB.state.routines.routines = DB.state.routines.routines.filter(r => r !== routine);
        scheduleSave(); renderRoutinesGrid();
      }
    };
    nameCell.appendChild(ns); nameCell.appendChild(del); grid.appendChild(nameCell);

    days.forEach(d => {
      const cell = document.createElement('div');
      cell.className = 'rt-cell';
      const isChecked = DB.state.routines.habits[d.date] && DB.state.routines.habits[d.date][routine];
      const cb = document.createElement('div');
      cb.className = 'rt-checkbox' + (isChecked ? ' checked' : '');
      cb.onclick = () => {
        if (!DB.state.routines.habits[d.date]) DB.state.routines.habits[d.date] = {};
        DB.state.routines.habits[d.date][routine] = !DB.state.routines.habits[d.date][routine];
        scheduleSave(); cb.classList.toggle('checked');
      };
      cell.appendChild(cb); grid.appendChild(cell);
    });
  });
  container.appendChild(grid);
}

function addRoutine() {
  const input = document.getElementById('newRoutineInput');
  const val   = input?.value.trim();
  if (!val || DB.state.routines.routines.includes(val)) return;
  DB.state.routines.routines.push(val);
  scheduleSave(); renderRoutinesGrid();
  if (input) input.value = '';
}

/* ──────────────────────────────────────────────────────────────
   15. INBOX
   ────────────────────────────────────────────────────────────── */
function renderInbox() {
  const listEl = document.getElementById('inboxList');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (!DB.state.inbox.length) { listEl.innerHTML = "<p style='color:var(--text-muted);'>Zihin çöplüğü temiz.</p>"; return; }
  [...DB.state.inbox].reverse().forEach((note, ri) => {
    const realIdx = DB.state.inbox.length - 1 - ri;
    const item = document.createElement('div');
    item.className = 'todo-item';
    const text = document.createElement('span');
    text.className = 'todo-text'; text.textContent = note;
    const del = document.createElement('button');
    del.className = 'todo-trash'; del.innerHTML = '🗑';
    del.onclick = () => { DB.state.inbox.splice(realIdx, 1); scheduleSave(); renderInbox(); };
    item.appendChild(text); item.appendChild(del); listEl.appendChild(item);
  });
}

/* ──────────────────────────────────────────────────────────────
   16. TODO
   ────────────────────────────────────────────────────────────── */
function renderTodo() {
  const listEl = document.getElementById('todoList');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (!DB.state.todo.length) { listEl.innerHTML = "<p style='color:var(--text-muted);'>Bugün için görev yok.</p>"; return; }
  DB.state.todo.forEach((td, idx) => {
    const item = document.createElement('div');
    item.className = 'todo-item' + (td.done ? ' checked' : '');
    const chk = document.createElement('input');
    chk.type = 'checkbox'; chk.checked = td.done;
    chk.onchange = () => { DB.state.todo[idx].done = chk.checked; scheduleSave(); renderTodo(); };
    const text = document.createElement('span');
    text.className = 'todo-text'; text.textContent = td.text;
    const del = document.createElement('button');
    del.className = 'todo-trash'; del.innerHTML = '🗑';
    del.onclick = () => { DB.state.todo.splice(idx, 1); scheduleSave(); renderTodo(); };
    item.appendChild(chk); item.appendChild(text); item.appendChild(del);
    listEl.appendChild(item);
  });
}

/* ──────────────────────────────────────────────────────────────
   17. KANBAN
   ────────────────────────────────────────────────────────────── */
function renderKanban() {
  const map = { ideas: 'kanbanIdeas', inProgress: 'kanbanProgress', done: 'kanbanDone' };
  Object.entries(map).forEach(([colId, elId]) => {
    const colEl = document.getElementById(elId);
    if (!colEl) return;
    colEl.innerHTML = '';
    DB.state.kanban[colId].forEach((task, idx) => {
      const card = document.createElement('div');
      card.className = 'kanban-card'; card.draggable = true;
      card.innerHTML = '<span>' + task + '</span><button class="todo-trash" style="font-size:12px">🗑</button>';
      card.querySelector('button').onclick = () => {
        DB.state.kanban[colId].splice(idx, 1); scheduleSave(); renderKanban();
      };
      card.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', JSON.stringify({ colId, idx })));
      colEl.appendChild(card);
    });
  });
}

function addKanbanCard() {
  const val = DOM.kanbanInput?.value.trim();
  if (!val) return;
  DB.state.kanban.ideas.push(val);
  DOM.kanbanInput.value = '';
  scheduleSave(); renderKanban();
}

function setupKanbanDrop() {
  document.querySelectorAll('.kanban-col').forEach(col => {
    col.addEventListener('dragover',  e => { e.preventDefault(); col.classList.add('drag-over-kanban'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over-kanban'));
    col.addEventListener('drop', e => {
      e.preventDefault(); col.classList.remove('drag-over-kanban');
      try {
        const { colId, idx } = JSON.parse(e.dataTransfer.getData('text/plain'));
        const target = col.dataset.col;
        if (colId === target) return;
        const task = DB.state.kanban[colId].splice(idx, 1)[0];
        DB.state.kanban[target].push(task);
        scheduleSave(); renderKanban();
      } catch(_) {}
    });
  });
}

/* ──────────────────────────────────────────────────────────────
   18. YKS MODULLERI
   ────────────────────────────────────────────────────────────── */
function switchYksTab(tabName) {
  DOM.yksTabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
  DOM.yksTabContents.forEach(c => {
    const isTarget = c.id === 'yksTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    c.classList.toggle('view-hidden', !isTarget);
  });
}

function renderYksBar() {
  const chartEl = document.getElementById('yksChartArea');
  if (!chartEl) return;
  chartEl.innerHTML = '';
  if (!DB.state.yks.length) {
    chartEl.innerHTML = "<p style='color:var(--text-muted); padding:20px;'>Net verisi bekleniyor...</p>"; return;
  }
  const maxNet = 120;
  DB.state.yks.forEach((entry, idx) => {
    const wrap  = document.createElement('div'); wrap.className  = 'yks-bar-wrap';
    const bar   = document.createElement('div'); bar.className   = 'yks-bar';
    bar.style.height = '0%';
    bar.title = entry.name + ': ' + entry.net + ' Net (Çift tıkla sil)';
    setTimeout(() => { bar.style.height = Math.min((entry.net / maxNet) * 100, 100) + '%'; }, 50);
    const val   = document.createElement('div'); val.className   = 'yks-value'; val.textContent = entry.net;
    const label = document.createElement('div'); label.className = 'yks-label'; label.textContent = entry.name;
    wrap.ondblclick = () => {
      if (confirm('"' + entry.name + '" silinsin mi?')) { DB.state.yks.splice(idx, 1); scheduleSave(); renderYksBar(); }
    };
    bar.appendChild(val); bar.appendChild(label); wrap.appendChild(bar); chartEl.appendChild(wrap);
  });
}

function addMistakeLog() {
  const lesson  = document.getElementById('mistakeLesson')?.value.trim();
  const subject = document.getElementById('mistakeSubject')?.value.trim();
  const reason  = document.getElementById('mistakeReason')?.value || 'Bilgi';
  const note    = document.getElementById('mistakeNote')?.value.trim() || '';
  if (!lesson || !subject) { alert('Ders ve Konu alanları zorunludur!'); return; }
  DB.state.yksMistakes.push({ id: generateId(), date: getTodayDateStr(), lesson, subject, reason, note });
  document.getElementById('mistakeLesson').value  = '';
  document.getElementById('mistakeSubject').value = '';
  document.getElementById('mistakeNote').value    = '';
  scheduleSave(); renderMistakeVault();
}

function renderMistakeVault() {
  const list = document.getElementById('mistakeList');
  if (!list) return;
  list.innerHTML = '';
  if (!DB.state.yksMistakes.length) {
    list.innerHTML = "<tr><td colspan='6' style='text-align:center; color:var(--text-muted);'>Henüz hata loglanmadı.</td></tr>"; return;
  }
  [...DB.state.yksMistakes].reverse().forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + m.date + '</td>' +
      '<td style="font-weight:700">' + m.lesson + '</td>' +
      '<td>' + m.subject + '</td>' +
      '<td><span class="badge-reason ' + m.reason.toLowerCase() + '">' + m.reason + '</span></td>' +
      '<td style="font-size:12px; color:var(--text-secondary)">' + m.note + '</td>' +
      '<td><button class="todo-trash" onclick="window.deleteMistake(\'' + m.id + '\')">🗑</button></td>';
    list.appendChild(tr);
  });
}
window.deleteMistake = id => {
  DB.state.yksMistakes = DB.state.yksMistakes.filter(m => m.id !== id);
  scheduleSave(); renderMistakeVault();
};

function renderSyllabusTracker() {
  const grid = document.getElementById('syllabusGrid');
  if (!grid) return;
  grid.innerHTML = '';
  Object.keys(YKS_SYLLABUS).forEach(lesson => {
    const topics   = YKS_SYLLABUS[lesson];
    const finished = DB.state.yksProgress[lesson] || [];
    const percent  = topics.length ? Math.round((finished.length / topics.length) * 100) : 0;
    const card = document.createElement('div');
    card.className = 'syllabus-card';
    card.innerHTML = '<div class="syllabus-header"><span class="syllabus-lesson-name">' + lesson + '</span>' +
      '<span class="syllabus-percentage">%' + percent + '</span></div>' +
      '<div class="progress-container"><div class="progress-bar-fill" style="width:' + percent + '%"></div></div>' +
      '<div class="syllabus-topics">' +
      topics.map(topic => {
        const done = finished.includes(topic);
        const safe = topic.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        return '<label class="topic-item' + (done ? ' done' : '') + '">' +
          '<input type="checkbox" ' + (done ? 'checked' : '') + ' onchange="window.toggleTopic(\'' + lesson + "','" + safe + '\')">' +
          '<span>' + topic + '</span></label>';
      }).join('') + '</div>';
    grid.appendChild(card);
  });
}
window.toggleTopic = (lesson, topic) => {
  if (!DB.state.yksProgress[lesson]) DB.state.yksProgress[lesson] = [];
  const idx = DB.state.yksProgress[lesson].indexOf(topic);
  if (idx > -1) DB.state.yksProgress[lesson].splice(idx, 1);
  else DB.state.yksProgress[lesson].push(topic);
  scheduleSave(); renderSyllabusTracker();
};

/* ──────────────────────────────────────────────────────────────
   19. LiNK KASASI
   ────────────────────────────────────────────────────────────── */
function renderLinks() {
  const grid = document.getElementById('linksGrid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!DB.state.links.length) { grid.innerHTML = "<p style='color:var(--text-muted);'>Kasa boş.</p>"; return; }
  DB.state.links.forEach((link, idx) => {
    const card = document.createElement('a');
    card.className = 'link-card'; card.href = link.url; card.target = '_blank';
    card.innerHTML = '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px">' +
      '<span class="link-title">' + link.title + '</span>' +
      '<button class="todo-trash" style="font-size:12px; flex-shrink:0" onclick="event.preventDefault();window.deleteLink(' + idx + ')">🗑</button>' +
      '</div><span class="link-url">' + link.url + '</span>';
    grid.appendChild(card);
  });
}
window.deleteLink = idx => { DB.state.links.splice(idx, 1); scheduleSave(); renderLinks(); };

/* ──────────────────────────────────────────────────────────────
   20. GLOBAL EVENT LISTENERS
   FIX: Tüm listener'lar DOMContentLoaded içinde. Parse anında
   hiçbir DOM erişimi gerçekleşmez.
   ────────────────────────────────────────────────────────────── */
function attachGlobalListeners() {
  DOM.sidebarToggle?.addEventListener('click', toggleSidebar);
  DOM.sidebarOpenBtn?.addEventListener('click', toggleSidebar);
  DOM.btnAddRootPage?.addEventListener('click', () => createPage(null));

  DOM.pageTitle?.addEventListener('input', () => {
    const page = getActivePage();
    if (page) { page.title = DOM.pageTitle.value; autoResize(DOM.pageTitle); scheduleSave(); renderTree(); }
  });
  DOM.pageTitle?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const page = getActivePage();
      if (page?.blocks.length) focusBlock(page.blocks[0].id);
    }
  });

  DOM.slashMenuList?.addEventListener('click', e => {
    const li = e.target.closest('.slash-menu-item');
    if (!li) return;
    if (slashMenuState.blockId) changeBlockType(slashMenuState.blockId, li.dataset.type);
    closeSlashMenu();
  });

  /* ACCORDION — details/summary yerine div tabanlı toggle */
  document.querySelectorAll('.sidebar-group-header[data-accordion]').forEach(header => {
    header.addEventListener('click', e => {
      /* btn-add-page gibi iç butonlara tıklanınca toggle etme */
      if (e.target.closest('.btn-add-page')) return;
      const group = header.closest('.sidebar-group');
      const content = group.querySelector('.sidebar-group-content, .page-tree');
      const isOpen = group.classList.toggle('open');
      if (content) content.style.display = isOpen ? '' : 'none';
    });
  });

  /* NAVİGASYON — Her butona doğrudan listener eklendi */
  const navMap = {
    btnShowPages: 'pages', btnShowJournal: 'journal', btnShowRoutines: 'routines',
    btnShowInbox: 'inbox', btnShowTodo: 'todo', btnShowKanban: 'kanban',
    btnShowYks: 'yks', btnShowMistakes: 'mistakes', btnShowSyllabus: 'syllabus',
    btnShowLinks: 'links', btnShowDashboard: 'dashboard'
  };
  Object.entries(navMap).forEach(([id, view]) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        switchView(view);
      });
    }
  });

  DOM.yksTabBtns.forEach(btn => btn.addEventListener('click', () => switchYksTab(btn.dataset.tab)));
  DOM.btnMistakeAdd?.addEventListener('click', addMistakeLog);

  document.getElementById('btnNewJournalDay')?.addEventListener('click', () => openJournalEditor(getTodayDateStr()));
  document.getElementById('btnBackToJournalList')?.addEventListener('click', renderJournalList);
  document.getElementById('btnSaveJournal')?.addEventListener('click', saveJournalEntry);
  document.getElementById('btnAddRoutine')?.addEventListener('click', addRoutine);
  document.getElementById('newRoutineInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') addRoutine(); });

  DOM.pomoPlayPause?.addEventListener('click', togglePomoTimer);
  DOM.pomoReset?.addEventListener('click', resetPomoTimer);
  DOM.btnPomoSettings?.addEventListener('click', () => DOM.pomoSettingsPanel?.classList.toggle('view-hidden'));
  DOM.pomoModes.forEach(btn =>
    btn.addEventListener('click', () => setPomoMode(parseInt(btn.dataset.w), parseInt(btn.dataset.b))));
  DOM.pomoApplyCustom?.addEventListener('click', () => {
    setPomoMode(parseInt(DOM.pomoCustomWork?.value) || 25, parseInt(DOM.pomoCustomBreak?.value) || 5);
  });
  DOM.pomoZoneBtn?.addEventListener('click', toggleZone);
  DOM.btnZoneExit?.addEventListener('click', toggleZone);

  document.getElementById('btnYksAdd')?.addEventListener('click', () => {
    const n = document.getElementById('yksNameInput')?.value.trim();
    const v = parseFloat(document.getElementById('yksNetInput')?.value);
    if (n && !isNaN(v)) {
      DB.state.yks.push({ name: n, net: v });
      document.getElementById('yksNameInput').value = '';
      document.getElementById('yksNetInput').value  = '';
      scheduleSave(); renderYksBar();
    }
  });

  document.getElementById('btnLinkAdd')?.addEventListener('click', () => {
    const title = document.getElementById('linkTitleInput')?.value.trim();
    const urlEl = document.getElementById('linkUrlInput');
    let url     = urlEl?.value.trim();
    if (!title || !url) return;
    if (!url.startsWith('http')) url = 'https://' + url;
    DB.state.links.push({ title, url });
    document.getElementById('linkTitleInput').value = ''; urlEl.value = '';
    scheduleSave(); renderLinks();
  });

  DOM.todoInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && DOM.todoInput.value.trim()) {
      DB.state.todo.push({ text: DOM.todoInput.value.trim(), done: false });
      DOM.todoInput.value = ''; scheduleSave(); renderTodo();
    }
  });

  DOM.kanbanInput?.addEventListener('keydown',  e => { if (e.key === 'Enter') addKanbanCard(); });
  DOM.btnKanbanAdd?.addEventListener('click', addKanbanCard);
  setupKanbanDrop();

  /* Brain Dump — Ctrl+Space */
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.code === 'Space') {
      e.preventDefault();
      if (DOM.bdModal) { DOM.bdModal.classList.remove('hidden'); DOM.bdInput.value = ''; DOM.bdInput.focus(); }
    }
    if (e.key === 'Escape') {
      if (DOM.bdModal && !DOM.bdModal.classList.contains('hidden')) {
        DOM.bdModal.classList.add('hidden'); DOM.pageTitle?.focus();
      }
      if (DOM.theZone && !DOM.theZone.classList.contains('zone-hidden')) toggleZone();
    }
  });

  DOM.bdInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && DOM.bdInput.value.trim()) {
      e.preventDefault();
      DB.state.inbox.push(DOM.bdInput.value.trim()); scheduleSave();
      DOM.bdModal.classList.add('hidden');
      if (currentView === 'inbox') renderInbox();
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.block-context-menu') && !e.target.closest('.block-btn')) hideContextMenu();
  });

  DOM.btnDeleteBlock?.addEventListener('click', () => {
    if (activeContextBlockId) { deleteBlock(activeContextBlockId); hideContextMenu(); }
  });

  DOM.contextColors.forEach(btn =>
    btn.addEventListener('click', e => {
      if (activeContextBlockId) { changeBlockColor(activeContextBlockId, e.target.dataset.color); hideContextMenu(); }
    }));

  // Turn into buttons
  document.querySelectorAll('.ctx-turn-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (activeContextBlockId) {
        changeBlockType(activeContextBlockId, btn.dataset.type);
        hideContextMenu();
      }
    });
  });

  // Font size buttons
  document.querySelectorAll('.ctx-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!activeContextBlockId) return;
      const page  = getActivePage();
      const block = page?.blocks.find(b => b.id === activeContextBlockId);
      if (!block) return;
      block.fontSize = parseInt(btn.dataset.size);
      const el = document.getElementById('block-' + activeContextBlockId);
      if (el) el.style.fontSize = block.fontSize + 'px';
      scheduleSave();
      // update active highlight
      document.querySelectorAll('.ctx-size-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  // Bold
  document.getElementById('ctxBtnBold')?.addEventListener('click', () => {
    if (!activeContextBlockId) return;
    const page  = getActivePage();
    const block = page?.blocks.find(b => b.id === activeContextBlockId);
    if (!block) return;
    block.fontWeight = block.fontWeight === 'bold' ? '' : 'bold';
    const el = document.getElementById('block-' + activeContextBlockId);
    if (el) el.style.fontWeight = block.fontWeight;
    document.getElementById('ctxBtnBold')?.classList.toggle('active', block.fontWeight === 'bold');
    scheduleSave();
  });

  // Italic
  document.getElementById('ctxBtnItalic')?.addEventListener('click', () => {
    if (!activeContextBlockId) return;
    const page  = getActivePage();
    const block = page?.blocks.find(b => b.id === activeContextBlockId);
    if (!block) return;
    block.fontStyle = block.fontStyle === 'italic' ? '' : 'italic';
    const el = document.getElementById('block-' + activeContextBlockId);
    if (el) el.style.fontStyle = block.fontStyle;
    document.getElementById('ctxBtnItalic')?.classList.toggle('active', block.fontStyle === 'italic');
    scheduleSave();
  });

  // Align
  ['Left','Center','Right'].forEach(dir => {
    document.getElementById('ctxBtnAlign' + dir)?.addEventListener('click', () => {
      if (!activeContextBlockId) return;
      const page  = getActivePage();
      const block = page?.blocks.find(b => b.id === activeContextBlockId);
      if (!block) return;
      const val = dir.toLowerCase();
      block.textAlign = block.textAlign === val ? '' : val;
      const el = document.getElementById('block-' + activeContextBlockId);
      if (el) el.style.textAlign = block.textAlign;
      ['Left','Center','Right'].forEach(d =>
        document.getElementById('ctxBtnAlign' + d)?.classList.toggle('active', block.textAlign === d.toLowerCase())
      );
      scheduleSave();
    });
  });
}

/* ──────────────────────────────────────────────────────────────
   21. UYGULAMA BASLANGICI
   Tek giriş noktası. Her şey DOMContentLoaded sonrası çalışır.
   ────────────────────────────────────────────────────────────── */
function init() {
  try {
    console.log('Kerotion baslatiliyor...');
    refreshDOM();
    attachGlobalListeners();
    renderTree();
    if (activePageId) openPage(activePageId);
    updatePomoDisplay();
    renderStreakBadge();
    renderQuoteOfDay();
    renderRevisionPanel();
    console.log('Kerotion hazir.');
  } catch (err) {
    console.error('Kerotion baslama hatasi:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);

/* ══════════════════════════════════════════════════════════════
   22. STREAK SİSTEMİ
   Pomodoro tamamlanınca günlük streak güncellenir.
   ══════════════════════════════════════════════════════════════ */
function updateStreak(today) {
  const s = DB.state.streak;
  if (s.lastDate === today) return; // Zaten bugün sayıldı

  const yesterday = (() => {
    const d = new Date(today); d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();

  if (s.lastDate === yesterday) {
    s.current++;
  } else {
    s.current = 1;
  }
  s.longest  = Math.max(s.longest, s.current);
  s.lastDate = today;
  if (!s.history.includes(today)) s.history.push(today);
  renderStreakBadge();
}

function renderStreakBadge() {
  const s   = DB.state.streak;
  const el  = document.getElementById('streakBadge');
  if (!el) return;
  const fire = s.current >= 7 ? '🔥🔥' : s.current >= 3 ? '🔥' : '🌱';
  el.innerHTML = `${fire} <span class="streak-count">${s.current}</span> <span class="streak-label">gün</span>`;
  el.title = `En uzun seri: ${s.longest} gün`;
}

/* ══════════════════════════════════════════════════════════════
   23. ÇALIŞMA İSTATİSTİKLERİ DASHBOARD
   ══════════════════════════════════════════════════════════════ */
function renderDashboard() {
  const container = document.getElementById('dashboardView');
  if (!container) return;

  const today = getTodayDateStr();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  // Günlük pomodoro sayıları
  const dailyCounts = last7.map(date => ({
    date,
    label: new Date(date).toLocaleDateString('tr-TR', { weekday: 'short' }),
    count: DB.state.pomoLog.filter(l => l.date === date).length,
    mins:  DB.state.pomoLog.filter(l => l.date === date).reduce((s, l) => s + (l.duration || 25), 0)
  }));

  const totalPomos   = DB.state.pomoLog.length;
  const totalMins    = DB.state.pomoLog.reduce((s, l) => s + (l.duration || 25), 0);
  const todayPomos   = DB.state.pomoLog.filter(l => l.date === today).length;
  const maxCount     = Math.max(...dailyCounts.map(d => d.count), 1);

  // Konu dağılımı
  const targetMap = {};
  DB.state.pomoLog.forEach(l => { targetMap[l.target || 'Genel'] = (targetMap[l.target || 'Genel'] || 0) + 1; });
  const topTargets = Object.entries(targetMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  container.innerHTML = `
    <header class="page-header">
      <h1 class="page-title">📊 Çalışma İstatistikleri</h1>
      <p class="view-subtitle">Geçmiş performansın ve alışkanlıkların.</p>
    </header>

    <div class="dash-stats-row">
      <div class="dash-stat-card">
        <div class="dash-stat-value">${todayPomos}</div>
        <div class="dash-stat-label">Bugün Pomodoro</div>
      </div>
      <div class="dash-stat-card accent">
        <div class="dash-stat-value">${DB.state.streak.current}</div>
        <div class="dash-stat-label">🔥 Günlük Seri</div>
      </div>
      <div class="dash-stat-card">
        <div class="dash-stat-value">${Math.round(totalMins / 60)}</div>
        <div class="dash-stat-label">Toplam Saat</div>
      </div>
      <div class="dash-stat-card">
        <div class="dash-stat-value">${totalPomos}</div>
        <div class="dash-stat-label">Toplam Pomodoro</div>
      </div>
    </div>

    <div class="dash-section">
      <h3 class="dash-section-title">Son 7 Gün — Günlük Pomodoro</h3>
      <div class="dash-bar-chart">
        ${dailyCounts.map(d => `
          <div class="dash-bar-col">
            <div class="dash-bar-wrap">
              <div class="dash-bar" style="height:${Math.round((d.count / maxCount) * 100)}%" title="${d.count} pomodoro, ${d.mins} dk">
                ${d.count > 0 ? `<span class="dash-bar-val">${d.count}</span>` : ''}
              </div>
            </div>
            <div class="dash-bar-label">${d.label}</div>
          </div>
        `).join('')}
      </div>
    </div>

    ${topTargets.length ? `
    <div class="dash-section">
      <h3 class="dash-section-title">Konu Dağılımı</h3>
      <div class="dash-topics">
        ${topTargets.map(([name, cnt]) => `
          <div class="dash-topic-row">
            <span class="dash-topic-name">${name}</span>
            <div class="dash-topic-bar-wrap">
              <div class="dash-topic-bar" style="width:${Math.round((cnt / topTargets[0][1]) * 100)}%"></div>
            </div>
            <span class="dash-topic-cnt">${cnt} pomo</span>
          </div>
        `).join('')}
      </div>
    </div>` : ''}
  `;
}

/* ══════════════════════════════════════════════════════════════
   24. GÜNLÜK MOTİVASYON QUOTE
   ══════════════════════════════════════════════════════════════ */
const QUOTES = [
  { text: "Disiplin, motivasyon kaybolduğunda devreye girer.", author: "Anonymous" },
  { text: "Büyük başarılar küçük adımların birikmesiyle olur.", author: "Anonymous" },
  { text: "Bugün yapabileceğini yarına bırakma.", author: "Benjamin Franklin" },
  { text: "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.", author: "Robert Collier" },
  { text: "Zor olan doğru olandır.", author: "Anonymous" },
  { text: "Konfor alanın dışında büyüme başlar.", author: "Anonymous" },
  { text: "Sabır, gizli bir disiplindir.", author: "Anonymous" },
  { text: "Hata yapmak öğreniyor olmaktır.", author: "Anonymous" },
  { text: "Kararlılık, yeteneği geçer.", author: "Anonymous" },
  { text: "Her gün biraz daha iyi olmak yeterli.", author: "Anonymous" },
  { text: "Çalışmak bir seçim değil, bir kimlik meselesidir.", author: "Anonymous" },
  { text: "Yorgunluk zayıflık değil, gelişimin kanıtıdır.", author: "Anonymous" },
  { text: "Yarın olmaz. Bugün başlar.", author: "Anonymous" },
  { text: "Kendinle yarış, başkasıyla değil.", author: "Anonymous" },
  { text: "Bir saatlik odak, bir günlük dağınıklıktan değerlidir.", author: "Anonymous" }
];

function renderQuoteOfDay() {
  const el = document.getElementById('quoteOfDay');
  if (!el) return;
  // Tarihe göre sabit quote (her gün aynı, her yeni gün farklı)
  const dayIndex = Math.floor(Date.now() / 86400000) % QUOTES.length;
  const q = QUOTES[dayIndex];
  el.innerHTML = `
    <div class="quote-text">"${q.text}"</div>
    <div class="quote-author">— ${q.author}</div>
  `;
}

/* ══════════════════════════════════════════════════════════════
   25. REVİZYON HATIRLATICI
   Hata defterine eklenen konular 3, 7 ve 14 gün sonra hatırlatılır.
   ══════════════════════════════════════════════════════════════ */
const REVISION_INTERVALS = [3, 7, 14];

function getDaysDiff(dateStr) {
  const then = new Date(dateStr);
  const now  = new Date();
  return Math.floor((now - then) / 86400000);
}

function getRevisionAlerts() {
  const alerts = [];
  DB.state.yksMistakes.forEach(m => {
    if (!m.date) return;
    const diff = getDaysDiff(m.date);
    REVISION_INTERVALS.forEach(interval => {
      if (diff === interval) {
        alerts.push({ ...m, daysAgo: diff, interval });
      }
    });
  });
  return alerts;
}

function renderRevisionPanel() {
  const el = document.getElementById('revisionPanel');
  if (!el) return;
  const alerts = getRevisionAlerts();
  if (!alerts.length) {
    el.innerHTML = '<p class="revision-empty">Bugün revize edilecek konu yok. 🎉</p>';
    return;
  }
  el.innerHTML = alerts.map(a => `
    <div class="revision-card">
      <div class="revision-badge">${a.interval}. gün</div>
      <div class="revision-info">
        <span class="revision-lesson">${a.lesson}</span>
        <span class="revision-subject">${a.subject}</span>
      </div>
      <div class="revision-note">${a.note || ''}</div>
    </div>
  `).join('');

  // Sidebar badge
  const badge = document.getElementById('revisionBadge');
  if (badge) {
    badge.textContent = alerts.length;
    badge.style.display = alerts.length ? 'inline-flex' : 'none';
  }
}
