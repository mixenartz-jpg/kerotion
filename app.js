/* ============================================================
   KEROTION — app.js
   Modern, Blok Tabanlı Çalışma Alanı
   Vanilla JS, No-Framework
   ============================================================ */

/* ---------- 1. STATE & STORAGE ---------- */
const LS_KEY = "kerotion_data";
const LS_JOURNAL = "kerotion_journal";
const LS_ROUTINES = "kerotion_routines";

const DEFAULT_DATA = [
  {
    id: "page-1",
    title: "İlk Sayfam",
    parentId: null,
    isOpen: true,
    blocks: [
      { id: "b1", type: "h1", content: "Kerotion'a Hoş Geldiniz!" },
      { id: "b2", type: "p", content: "Burası sizin blok tabanlı yeni dijital çalışma alanınız." },
      { id: "b3", type: "todo", content: "Slash (/) komutunu kullanarak yeni bloklar eklemeyi deneyin.", isChecked: false }
    ]
  }
];

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

let pages = [];
let activePageId = null;
let saveTimer = null;

let journalData = [];
let routinesData = {
  routines: ["YKS Paragraf & Problem", "Fitness / Antrenman", "Kodlama / Proje Geliştirme"],
  habits: {}
};
let currentView = "pages";
let activeJournalDate = null;

/* ---------- POMODORO STATE ---------- */
let pomoTimer = null;
let pomoWorkMins = 25;
let pomoBreakMins = 5;
let pomoTimeLeft = 25 * 60;
let pomoIsRunning = false;
let pomoState = "idle"; // "idle", "work", "break"
let pomoCycleCount = 0;

function loadData() {
  const data = localStorage.getItem(LS_KEY);
  pages = data ? JSON.parse(data) : DEFAULT_DATA;
  if (!activePageId && pages.length > 0) {
    activePageId = pages[0].id;
  }
  
  const jData = localStorage.getItem(LS_JOURNAL);
  if (jData) journalData = JSON.parse(jData);
  
  const rData = localStorage.getItem(LS_ROUTINES);
  if (rData) routinesData = JSON.parse(rData);
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(pages));
    localStorage.setItem(LS_JOURNAL, JSON.stringify(journalData));
    localStorage.setItem(LS_ROUTINES, JSON.stringify(routinesData));
  }, 400);
}

function getActivePage() {
  return pages.find(p => p.id === activePageId);
}

/* ---------- 2. DOM ELEMENTS ---------- */
const DOM = {
  sidebarToggle: document.getElementById("sidebarToggle"),
  sidebarOpenBtn: document.getElementById("sidebarOpenBtn"),
  sidebar: document.getElementById("sidebar"),
  btnAddRootPage: document.getElementById("btnAddRootPage"),
  pageTree: document.getElementById("pageTree"),
  pageTitle: document.getElementById("pageTitle"),
  blocksContainer: document.getElementById("blocksContainer"),
  slashMenu: document.getElementById("slashMenu"),
  slashMenuList: document.getElementById("slashMenuList"),
  
  // YENI DOM ELEMENTLERI
  pageView: document.getElementById("pageView"),
  journalView: document.getElementById("journalView"),
  routinesView: document.getElementById("routinesView"),
  btnShowPages: document.getElementById("btnShowPages"),
  btnShowJournal: document.getElementById("btnShowJournal"),
  btnShowRoutines: document.getElementById("btnShowRoutines"),
  
  // POMODORO DOM
  pomoZoneBtn: document.getElementById("btnPomoZone"),
  pomoTimeDisplay: document.getElementById("pomoTimeDisplay"),
  pomoStatusText: document.getElementById("pomoStatusText"),
  pomoModes: document.querySelectorAll(".pomo-mode"),
  pomoCustomWork: document.getElementById("pomoCustomWork"),
  pomoCustomBreak: document.getElementById("pomoCustomBreak"),
  pomoApplyCustom: document.getElementById("btnPomoApplyCustom"),
  pomoPlayPause: document.getElementById("pomoPlayPause"),
  pomoReset: document.getElementById("pomoReset"),
  
  // THE ZONE
  theZone: document.getElementById("theZone"),
  btnZoneExit: document.getElementById("btnZoneExit"),
  zoneStatusText: document.getElementById("zoneStatusText"),
  zoneTimerDisplay: document.getElementById("zoneTimerDisplay"),
  zoneCycleDisplay: document.getElementById("zoneCycleDisplay"),
  
  // CONTEXT MENU
  blockContextMenu: document.getElementById("blockContextMenu"),
  btnDeleteBlock: document.getElementById("btnDeleteBlock"),
  contextColors: document.querySelectorAll(".color-badge")
};

let slashMenuState = {
  active: false,
  blockId: null,
  selectedIndex: 0,
  searchQuery: ""
};

/* ---------- 3. SIDEBAR & PAGE TREE ---------- */
function toggleSidebar() {
  const isHidden = DOM.sidebar.classList.contains("hidden");
  if (isHidden) {
    DOM.sidebar.classList.remove("hidden");
    DOM.sidebarOpenBtn.classList.remove("visible");
  } else {
    DOM.sidebar.classList.add("hidden");
    DOM.sidebarOpenBtn.classList.add("visible");
  }
}

function createPage(parentId = null) {
  const newPage = {
    id: generateId(),
    title: "",
    parentId,
    isOpen: true,
    blocks: [{ id: generateId(), type: "p", content: "" }]
  };
  pages.push(newPage);
  if (parentId) {
    const parent = pages.find(p => p.id === parentId);
    if (parent) parent.isOpen = true;
  }
  scheduleSave();
  openPage(newPage.id);
  renderTree();
}

function renderTree(parentId = null, container = DOM.pageTree) {
  if (parentId === null) container.innerHTML = "";
  
  const children = pages.filter(p => p.parentId === parentId);
  if (children.length === 0) return;

  children.forEach(page => {
    const node = document.createElement("div");
    node.className = "tree-node";
    
    const content = document.createElement("div");
    content.className = "tree-node-content" + (page.id === activePageId ? " active" : "");
    content.addEventListener("click", (e) => {
      // eğer toggle veya ekle butonuna tıklanmadıysa sayfayı aç
      if (e.target.closest(".tree-toggle") || e.target.closest(".tree-add-sub")) return;
      openPage(page.id);
    });

    const hasChildren = pages.some(p => p.parentId === page.id);
    
    const toggle = document.createElement("span");
    toggle.className = "tree-toggle" + (page.isOpen ? " open" : "");
    if (!hasChildren) toggle.classList.add("hidden-arrow");
    toggle.innerHTML = "▶";
    toggle.addEventListener("click", () => {
      if (!hasChildren) return;
      page.isOpen = !page.isOpen;
      scheduleSave();
      renderTree();
    });

    const icon = document.createElement("span");
    icon.className = "tree-icon";
    icon.textContent = "📄";

    const title = document.createElement("span");
    title.className = "tree-title-span";
    title.textContent = page.title || "İsimsiz";

    const addSub = document.createElement("button");
    addSub.className = "tree-add-sub";
    addSub.textContent = "+";
    addSub.title = "Alt sayfa ekle";
    addSub.addEventListener("click", () => createPage(page.id));

    content.appendChild(toggle);
    content.appendChild(icon);
    content.appendChild(title);
    content.appendChild(addSub);
    node.appendChild(content);

    const childrenContainer = document.createElement("div");
    childrenContainer.className = "tree-children" + (page.isOpen ? " open" : "");
    node.appendChild(childrenContainer);

    container.appendChild(node);

    if (hasChildren) {
      renderTree(page.id, childrenContainer);
    }
  });
}

function openPage(pageId) {
  activePageId = pageId;
  const page = getActivePage();
  if (!page) return;
  
  DOM.pageTitle.value = page.title;
  autoResize(DOM.pageTitle);
  renderBlocks();
  renderTree(); // refresh active state in sidebar
  
  if (currentView !== "pages") {
    switchView("pages");
  }
}

DOMAIN_TITLE_EVENTS: {
  DOM.pageTitle.addEventListener("input", () => {
    const page = getActivePage();
    if (page) {
      page.title = DOM.pageTitle.value;
      autoResize(DOM.pageTitle);
      scheduleSave();
      renderTree(); // Update title in sidebar live
    }
  });
  DOM.pageTitle.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const page = getActivePage();
      if (page && page.blocks.length > 0) {
        focusBlock(page.blocks[0].id);
      }
    }
  });
}

/* ---------- 4. BLOK MİMARİSİ ---------- */
function renderBlocks() {
  DOM.blocksContainer.innerHTML = "";
  const page = getActivePage();
  if (!page) return;

  if (page.blocks.length === 0) {
    page.blocks.push({ id: generateId(), type: "p", content: "" });
    scheduleSave();
  }

  page.blocks.forEach((block, index) => {
    DOM.blocksContainer.appendChild(createBlockElement(block));
  });
}

const PLACEHOLDERS = {
  h1: "Başlık 1",
  h2: "Başlık 2",
  h3: "Başlık 3",
  p: "Yazmak için tıklayın veya komutlar için '/' tuşuna basın",
  todo: "Yapılacak",
  ul: "Liste öğesi"
};

function createBlockElement(block) {
  const wrap = document.createElement("div");
  wrap.className = `kerotion-block-wrap ${block.type}`;
  if (block.type === "todo" && block.isChecked) {
    wrap.classList.add("checked");
  }
  wrap.dataset.id = block.id;

  // Sidebar kontrolleri (plus / sürükle mock)
  const controls = document.createElement("div");
  controls.className = "block-controls";
  const btnPlus = document.createElement("div");
  btnPlus.className = "block-btn";
  btnPlus.textContent = "+";
  btnPlus.addEventListener("click", () => insertNewBlockAfter(block.id));
  const btnDrag = document.createElement("div");
  btnDrag.className = "block-btn";
  btnDrag.innerHTML = "⋮⋮"; // drag handle icon
  btnDrag.draggable = true;
  
  btnDrag.addEventListener("click", (e) => {
    e.stopPropagation();
    showContextMenu(e.pageX + 10, e.pageY + 10, block.id);
  });
  
  // Drag & Drop
  btnDrag.addEventListener("dragstart", (e) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", block.id);
    setTimeout(() => wrap.classList.add("dragging"), 0);
  });
  
  btnDrag.addEventListener("dragend", () => {
    wrap.classList.remove("dragging");
    document.querySelectorAll(".kerotion-block-wrap").forEach(el => {
      el.classList.remove("drag-over", "drag-over-bottom");
    });
  });

  wrap.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    const rect = wrap.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    wrap.classList.remove("drag-over", "drag-over-bottom");
    if (e.clientY < midY) {
      wrap.classList.add("drag-over");
    } else {
      wrap.classList.add("drag-over-bottom");
    }
  });

  wrap.addEventListener("dragleave", () => {
    wrap.classList.remove("drag-over", "drag-over-bottom");
  });

  wrap.addEventListener("drop", (e) => {
    e.preventDefault();
    wrap.classList.remove("drag-over", "drag-over-bottom");
    
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId === block.id) return;
    
    const page = getActivePage();
    const draggedIdx = page.blocks.findIndex(b => b.id === draggedId);
    const targetIdx = page.blocks.findIndex(b => b.id === block.id);
    if (draggedIdx < 0 || targetIdx < 0) return;
    
    const rect = wrap.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const isBottom = e.clientY >= midY;
    
    const [draggedBlock] = page.blocks.splice(draggedIdx, 1);
    
    const newTargetIdx = page.blocks.findIndex(b => b.id === block.id);
    const insertIdx = isBottom ? newTargetIdx + 1 : newTargetIdx;
    
    page.blocks.splice(insertIdx, 0, draggedBlock);
    scheduleSave();
    renderBlocks();
  });

  controls.appendChild(btnPlus);
  controls.appendChild(btnDrag);

  // Todo Checkbox logic
  if (block.type === "todo") {
    const checkbox = document.createElement("div");
    checkbox.className = "todo-checkbox";
    checkbox.dataset.checked = !!block.isChecked;
    checkbox.addEventListener("click", () => {
      block.isChecked = !block.isChecked;
      checkbox.dataset.checked = block.isChecked;
      if (block.isChecked) wrap.classList.add("checked");
      else wrap.classList.remove("checked");
      scheduleSave();
    });
    wrap.appendChild(checkbox);
  }

  const el = document.createElement("div");
  el.className = `kerotion-block ${block.type}`;
  el.contentEditable = "true";
  el.id = `block-${block.id}`;
  el.textContent = block.content || "";
  el.dataset.placeholder = PLACEHOLDERS[block.type] || "Bir şeyler yazın...";

  // Event Listeners for blocks
  el.addEventListener("input", (e) => {
    block.content = el.textContent;
    scheduleSave();
    
    if (slashMenuState.active) {
      handleSlashSearch(el);
    } else if (el.textContent.endsWith("/")) {
      openSlashMenu(block.id, el);
    }
  });

  el.addEventListener("keydown", (e) => handleBlockKeydown(e, block, el));
  el.addEventListener("blur", () => {
    // delay slash closing so clicks register
    setTimeout(() => {
      if (slashMenuState.active) closeSlashMenu();
    }, 150);
  });

  wrap.appendChild(controls);
  wrap.appendChild(el);
  
  if (block.color && block.color !== "#f4f4f5") {
    el.style.color = block.color;
  }
  
  return wrap;
}

function insertNewBlockAfter(currentBlockId, newType = "p") {
  const page = getActivePage();
  const idx = page.blocks.findIndex(b => b.id === currentBlockId);
  const newBlock = { id: generateId(), type: newType, content: "" };
  
  // Eğer listeysek aynı tipte devam et
  if (newType === "p" && idx >= 0) {
    const currType = page.blocks[idx].type;
    if (currType === "ul" || currType === "todo") {
      newBlock.type = currType;
    }
  }

  page.blocks.splice(idx + 1, 0, newBlock);
  scheduleSave();
  
  const currentWrap = DOM.blocksContainer.querySelector(`[data-id="${currentBlockId}"]`);
  const newEl = createBlockElement(newBlock);
  currentWrap.after(newEl);
  
  focusBlock(newBlock.id);
  return newBlock;
}

function handleBlockKeydown(e, block, el) {
  if (slashMenuState.active) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      navigateSlashMenu(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      navigateSlashMenu(-1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      applySlashMenuSelection();
      return;
    }
    if (e.key === "Escape") {
      closeSlashMenu();
      return;
    }
  }

  if (e.key === "Enter") {
    e.preventDefault();
    insertNewBlockAfter(block.id);
  } 
  else if (e.key === "Backspace") {
    const sel = window.getSelection();
    if (sel.anchorOffset === 0 && el.textContent === "") {
      e.preventDefault();
      if (block.type !== "p") {
        // Blok boşken backspace normal paragrafa çevirir
        changeBlockType(block.id, "p");
      } else {
        // Blok boş paragrafsa sil ve öncekine odaklan
        deleteBlock(block.id);
      }
    }
  }
}

function deleteBlock(id) {
  const page = getActivePage();
  if (page.blocks.length <= 1) return; // Son bloğu silme
  
  const idx = page.blocks.findIndex(b => b.id === id);
  if (idx < 0) return;

  page.blocks.splice(idx, 1);
  scheduleSave();

  const wrap = DOM.blocksContainer.querySelector(`[data-id="${id}"]`);
  if (wrap) wrap.remove();

  // Öncekine odaklan
  if (idx > 0) {
    focusBlock(page.blocks[idx - 1].id, true);
  } else {
    DOM.pageTitle.focus();
  }
}

function focusBlock(id, atEnd = false) {
  const el = document.getElementById(`block-${id}`);
  if (!el) return;
  el.focus();
  if (atEnd) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function changeBlockType(id, newType) {
  const page = getActivePage();
  const block = page.blocks.find(b => b.id === id);
  if (!block) return;

  block.type = newType;
  // Temizle " /" aramasını
  if (block.content.endsWith("/")) {
    block.content = block.content.slice(0, -1);
  }

  scheduleSave();

  const oldWrap = DOM.blocksContainer.querySelector(`[data-id="${id}"]`);
  const newWrap = createBlockElement(block);
  if (oldWrap) {
    DOM.blocksContainer.replaceChild(newWrap, oldWrap);
    focusBlock(id, true);
  }
}

/* ---------- 5. SLASH (/) MENÜ ---------- */
function openSlashMenu(blockId, el) {
  slashMenuState.active = true;
  slashMenuState.blockId = blockId;
  slashMenuState.selectedIndex = 0;
  
  // Imleç pozisyonunu yaklaşık bul
  const rect = el.getBoundingClientRect();
  DOM.slashMenu.style.display = "block";
  DOM.slashMenu.style.top = (rect.bottom + window.scrollY + 5) + "px";
  DOM.slashMenu.style.left = (rect.left + window.scrollX) + "px";

  updateSlashMenuSelection();
}

function closeSlashMenu() {
  slashMenuState.active = false;
  DOM.slashMenu.style.display = "none";
}

function handleSlashSearch(el) {
  const text = el.textContent;
  const slashPos = text.lastIndexOf("/");
  if (slashPos === -1) {
    closeSlashMenu();
    return;
  }
  // Basit filtreleme eklenebilir (şu an sadece açık tutuyor)
}

function navigateSlashMenu(dir) {
  const items = DOM.slashMenuList.querySelectorAll(".slash-menu-item");
  slashMenuState.selectedIndex += dir;
  
  if (slashMenuState.selectedIndex < 0) slashMenuState.selectedIndex = items.length - 1;
  else if (slashMenuState.selectedIndex >= items.length) slashMenuState.selectedIndex = 0;
  
  updateSlashMenuSelection();
}

function updateSlashMenuSelection() {
  const items = DOM.slashMenuList.querySelectorAll(".slash-menu-item");
  items.forEach((item, idx) => {
    if (idx === slashMenuState.selectedIndex) item.classList.add("active");
    else item.classList.remove("active");
  });
}

function applySlashMenuSelection() {
  if (!slashMenuState.active) return;
  const items = DOM.slashMenuList.querySelectorAll(".slash-menu-item");
  const selected = items[slashMenuState.selectedIndex];
  if (selected && slashMenuState.blockId) {
    const newType = selected.dataset.type;
    changeBlockType(slashMenuState.blockId, newType);
  }
  closeSlashMenu();
}

DOM.slashMenuList.addEventListener("click", (e) => {
  const li = e.target.closest(".slash-menu-item");
  if (!li) return;
  const newType = li.dataset.type;
  if (slashMenuState.blockId) {
    changeBlockType(slashMenuState.blockId, newType);
  }
  closeSlashMenu();
});

/* ---------- 6. UTILS & INIT ---------- */
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function attachGlobalListeners() {
  DOM.sidebarToggle.addEventListener("click", toggleSidebar);
  DOM.sidebarOpenBtn.addEventListener("click", toggleSidebar);
  DOM.btnAddRootPage.addEventListener("click", () => createPage(null));
  
  // MENU EVENTS
  DOM.btnShowPages.addEventListener("click", () => switchView("pages"));
  DOM.btnShowJournal.addEventListener("click", () => switchView("journal"));
  DOM.btnShowRoutines.addEventListener("click", () => switchView("routines"));
  
  // JOURNAL EVENTS
  document.getElementById("btnNewJournalDay").addEventListener("click", () => {
    openJournalEditor(getTodayDateStr());
  });
  document.getElementById("btnBackToJournalList").addEventListener("click", () => {
    renderJournalList();
  });
  document.getElementById("btnSaveJournal").addEventListener("click", saveJournalEntry);
  
  // ROUTINES EVENTS
  document.getElementById("btnAddRoutine").addEventListener("click", addRoutine);
  document.getElementById("newRoutineInput").addEventListener("keydown", (e) => {
    if(e.key === "Enter") addRoutine();
  });
  
  // POMODORO EVENTS
  DOM.pomoPlayPause.addEventListener("click", togglePomoTimer);
  DOM.pomoReset.addEventListener("click", resetPomoTimer);
  DOM.pomoModes.forEach(btn => {
    btn.addEventListener("click", () => setPomoMode(parseInt(btn.dataset.w), parseInt(btn.dataset.b)));
  });
  DOM.pomoApplyCustom.addEventListener("click", () => {
    const w = parseInt(DOM.pomoCustomWork.value) || 25;
    const b = parseInt(DOM.pomoCustomBreak.value) || 5;
    setPomoMode(w, b);
  });
  
  // THE ZONE EVENTS
  DOM.pomoZoneBtn.addEventListener("click", toggleZone);
  DOM.btnZoneExit.addEventListener("click", toggleZone);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !DOM.theZone.classList.contains("zone-hidden")) {
      toggleZone();
    }
  });
  
  // CONTEXT MENU GLOBAL CLOSE
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".block-context-menu") && !e.target.closest(".block-btn")) {
      hideContextMenu();
    }
  });
  DOM.btnDeleteBlock.addEventListener("click", () => {
    if (activeContextBlockId) {
      deleteBlock(activeContextBlockId);
      hideContextMenu();
    }
  });
  DOM.contextColors.forEach(btn => {
    btn.addEventListener("click", (e) => {
      if (activeContextBlockId) {
        changeBlockColor(activeContextBlockId, e.target.dataset.color);
        hideContextMenu();
      }
    });
  });
}

function init() {
  loadData();
  attachGlobalListeners();
  renderTree();
  if (activePageId) {
    openPage(activePageId);
  }
}

/* ---------- 7. VIEW NAVIGATION ---------- */
function switchView(viewName) {
  currentView = viewName;
  
  DOM.btnShowPages.classList.toggle("active", viewName === "pages");
  DOM.btnShowJournal.classList.toggle("active", viewName === "journal");
  DOM.btnShowRoutines.classList.toggle("active", viewName === "routines");
  
  DOM.pageView.classList.toggle("view-hidden", viewName !== "pages");
  DOM.pageView.classList.toggle("view-active", viewName === "pages");
  
  DOM.journalView.classList.toggle("view-hidden", viewName !== "journal");
  DOM.journalView.classList.toggle("view-active", viewName === "journal");
  
  DOM.routinesView.classList.toggle("view-hidden", viewName !== "routines");
  DOM.routinesView.classList.toggle("view-active", viewName === "routines");
  
  if (viewName === "journal") renderJournalList();
  if (viewName === "routines") renderRoutinesGrid();
}

/* ---------- 8. JOURNAL MODULE ---------- */
function getTodayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function renderJournalList() {
  const listEl = document.getElementById("journalList");
  const editorEl = document.getElementById("journalEditor");
  const controlsEl = document.querySelector(".journal-controls");
  
  listEl.classList.remove("view-hidden");
  controlsEl.classList.remove("view-hidden");
  editorEl.classList.add("view-hidden");
  
  listEl.innerHTML = "";
  
  if (journalData.length === 0) {
    listEl.innerHTML = "<p style='color: var(--text-muted);'>Henüz bir günlük kaydı yok. Bugün yazmaya başla!</p>";
    return;
  }
  
  const sorted = [...journalData].sort((a,b) => b.date.localeCompare(a.date));
  
  sorted.forEach(entry => {
    const card = document.createElement("div");
    card.className = "journal-card";
    card.innerHTML = `
      <div class="journal-card-header">
        <span class="journal-card-title">${entry.date}</span>
      </div>
      <div class="journal-card-preview">${entry.notes ? entry.notes.slice(0, 100) + '...' : 'Boş kayıt...'}</div>
    `;
    card.addEventListener("click", () => openJournalEditor(entry.date));
    listEl.appendChild(card);
  });
}

function openJournalEditor(dateStr) {
  activeJournalDate = dateStr;
  
  let entry = journalData.find(j => j.date === dateStr);
  if (!entry) {
    entry = { date: dateStr, notes: "", learned: "", better: "" };
    journalData.push(entry);
    scheduleSave();
  }
  
  document.getElementById("journalCurrentDate").textContent = dateStr;
  document.getElementById("journalNotes").value = entry.notes || "";
  document.getElementById("journalLearned").value = entry.learned || "";
  document.getElementById("journalBetter").value = entry.better || "";
  
  document.getElementById("journalList").classList.add("view-hidden");
  document.querySelector(".journal-controls").classList.add("view-hidden");
  document.getElementById("journalEditor").classList.remove("view-hidden");
}

function saveJournalEntry() {
  if (!activeJournalDate) return;
  const entry = journalData.find(j => j.date === activeJournalDate);
  if (entry) {
    entry.notes = document.getElementById("journalNotes").value;
    entry.learned = document.getElementById("journalLearned").value;
    entry.better = document.getElementById("journalBetter").value;
    scheduleSave();
    
    const btn = document.getElementById("btnSaveJournal");
    btn.textContent = "Kaydedildi!";
    setTimeout(() => { btn.textContent = "Kaydet"; }, 2000);
  }
}

/* ---------- 9. ROUTINES MODULE ---------- */
function renderRoutinesGrid() {
  const container = document.getElementById("routinesTableWrapper");
  container.innerHTML = "";
  
  const routines = routinesData.routines;
  if (routines.length === 0) {
    container.innerHTML = "<p style='color: var(--text-muted);'>Hiç rutin eklenmemiş. Önce yukarıdan rutin ekleyin.</p>";
    return;
  }
  
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const dayStr = d.toLocaleDateString("tr-TR", { weekday: 'short' });
    const dayNum = d.getDate();
    days.push({ date: dateStr, name: dayStr, num: dayNum });
  }
  
  const grid = document.createElement("div");
  grid.className = "routines-grid";
  grid.style.gridTemplateColumns = `200px repeat(${days.length}, minmax(60px, 1fr))`;
  
  const headerEmpty = document.createElement("div");
  headerEmpty.className = "rt-cell rt-header-habit";
  headerEmpty.textContent = "Hedefler";
  grid.appendChild(headerEmpty);
  
  days.forEach(d => {
    const headerCell = document.createElement("div");
    headerCell.className = "rt-cell rt-header-date";
    headerCell.innerHTML = `<span>${d.name}</span><span class="day">${d.num}</span>`;
    grid.appendChild(headerCell);
  });
  
  routines.forEach(routine => {
    const nameCell = document.createElement("div");
    nameCell.className = "rt-cell rt-habit-name";
    
    const nameSpan = document.createElement("span");
    nameSpan.textContent = routine;
    
    const delBtn = document.createElement("button");
    delBtn.className = "rt-habit-delete";
    delBtn.innerHTML = "×";
    delBtn.title = "Rutini Sil";
    delBtn.onclick = () => {
      if(confirm(`"${routine}" silinecek, emin misiniz?`)) {
        routinesData.routines = routinesData.routines.filter(r => r !== routine);
        scheduleSave();
        renderRoutinesGrid();
      }
    };
    
    nameCell.appendChild(nameSpan);
    nameCell.appendChild(delBtn);
    grid.appendChild(nameCell);
    
    days.forEach(d => {
      const cell = document.createElement("div");
      cell.className = "rt-cell";
      
      const isChecked = routinesData.habits[d.date] && routinesData.habits[d.date][routine];
      
      const cb = document.createElement("div");
      cb.className = "rt-checkbox" + (isChecked ? " checked" : "");
      cb.onclick = () => {
        if (!routinesData.habits[d.date]) routinesData.habits[d.date] = {};
        routinesData.habits[d.date][routine] = !routinesData.habits[d.date][routine];
        scheduleSave();
        cb.classList.toggle("checked");
      };
      
      cell.appendChild(cb);
      grid.appendChild(cell);
    });
  });
  
  container.appendChild(grid);
}

function addRoutine() {
  const val = document.getElementById("newRoutineInput").value.trim();
  if (!val) return;
  if (!routinesData.routines.includes(val)) {
    routinesData.routines.push(val);
    scheduleSave();
    renderRoutinesGrid();
  }
  document.getElementById("newRoutineInput").value = "";
}

/* ---------- 10. BLOCK CONTEXT MENU ---------- */
let activeContextBlockId = null;

function showContextMenu(x, y, blockId) {
  activeContextBlockId = blockId;
  DOM.blockContextMenu.style.display = "block";
  DOM.blockContextMenu.style.left = `${x}px`;
  DOM.blockContextMenu.style.top = `${y}px`;
}

function hideContextMenu() {
  DOM.blockContextMenu.style.display = "none";
  activeContextBlockId = null;
}

function changeBlockColor(id, color) {
  const page = getActivePage();
  const block = page.blocks.find(b => b.id === id);
  if(block) {
    block.color = color;
    scheduleSave();
    // Render blocks to show the applied style safely
    renderBlocks();
  }
}

/* ---------- 11. POMODORO TIMER ---------- */
function formatPomoTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function updatePomoDisplay() {
  const tStr = formatPomoTime(pomoTimeLeft);
  
  // Sidebar UI
  DOM.pomoTimeDisplay.textContent = tStr;
  let statusText = "Bekliyor";
  if (pomoState === "work") statusText = "ÇALIŞMA";
  else if (pomoState === "break") statusText = "MOLA";
  DOM.pomoStatusText.textContent = `Durum: ${statusText} (Seans: ${pomoCycleCount})`;
  
  // The Zone UI
  DOM.zoneTimerDisplay.textContent = tStr;
  DOM.zoneStatusText.textContent = pomoState === "work" ? "ODAK: ÇALIŞMA" : pomoState === "break" ? "ZİHİN: MOLA" : "ODAK MERKEZİ";
  DOM.zoneCycleDisplay.textContent = `Tamamlanan Seans: ${pomoCycleCount}`;
  
  // Doc Title
  if(pomoIsRunning) {
    const prefix = pomoState === "work" ? "🧠" : "☕";
    document.title = `${prefix} [${tStr}] Kerotion`;
  } else {
    document.title = "Kerotion — Workspace";
  }
}

function playPomoSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.7);
  } catch(e) { console.log("Audio not supported"); }
}

function notifyPomoEnd(isWork) {
  playPomoSound();
  if (Notification.permission === "granted") {
    new Notification(isWork ? "☕ Odak Seansı Bitti - Mola Zamanı" : "🧠 Mola Bitti - Çalışma Zamanı", {
      body: isWork ? "Gerçekten iyi bir odaklandın, arkanı yaslan ve dinlen." : "Zinciri kırmıyoruz. Sonraki adıma geçelim."
    });
  }
}

function endPomodoro() {
  clearInterval(pomoTimer);
  pomoIsRunning = false;
  DOM.pomoPlayPause.textContent = "▶";
  
  if (pomoState === "work") {
    notifyPomoEnd(true);
    pomoCycleCount++;
    const today = getTodayDateStr();
    if(!routinesData.habits[today]) routinesData.habits[today] = {};
    routinesData.habits[today]["Pomodoro_Sayisi"] = (routinesData.habits[today]["Pomodoro_Sayisi"] || 0) + 1;
    scheduleSave();
    if(currentView === "routines") renderRoutinesGrid();
    
    pomoState = "break";
    pomoTimeLeft = pomoBreakMins * 60;
  } else if (pomoState === "break") {
    notifyPomoEnd(false);
    pomoState = "work";
    pomoTimeLeft = pomoWorkMins * 60;
  }
  
  updatePomoDisplay();
}

function startPomoTimer() {
  if (Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
  }
  
  if(pomoTimeLeft <= 0) return;
  
  if (pomoState === "idle") {
    pomoState = "work";
    pomoTimeLeft = pomoWorkMins * 60;
  }
  
  pomoIsRunning = true;
  DOM.pomoPlayPause.textContent = "⏸";
  updatePomoDisplay();
  
  pomoTimer = setInterval(() => {
    pomoTimeLeft--;
    updatePomoDisplay();
    if (pomoTimeLeft <= 0) endPomodoro();
  }, 1000);
}

function togglePomoTimer() {
  if(pomoIsRunning) {
    clearInterval(pomoTimer);
    pomoIsRunning = false;
    DOM.pomoPlayPause.textContent = "▶";
    updatePomoDisplay();
  } else {
    startPomoTimer();
  }
}

function setPomoMode(w, b) {
  pomoWorkMins = w;
  pomoBreakMins = b;
  pomoCycleCount = 0;
  resetPomoTimer();
  DOM.pomoModes.forEach(btn => {
    const isMatch = parseInt(btn.dataset.w) === w && parseInt(btn.dataset.b) === b;
    btn.classList.toggle("active", isMatch);
  });
}

function resetPomoTimer() {
  clearInterval(pomoTimer);
  pomoIsRunning = false;
  pomoState = "idle";
  pomoTimeLeft = pomoWorkMins * 60;
  DOM.pomoPlayPause.textContent = "▶";
  DOM.pomoModes.forEach(btn => btn.classList.remove("active"));
  updatePomoDisplay();
}

function toggleZone() {
  DOM.theZone.classList.toggle("zone-hidden");
}

document.addEventListener("DOMContentLoaded", init);

