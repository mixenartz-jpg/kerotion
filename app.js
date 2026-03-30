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
  routines: ["TYT Paragraf/Problem Çözüldü", "Günün Konu Tekrarı Yapıldı", "Kitap Okundu", "Kodlama/Proje Geliştirildi"],
  habits: {}
};

// --- SECOND BRAIN DATA ---
const LS_TODO = "kerotion_todo";
const LS_KANBAN = "kerotion_kanban";
const LS_YKS = "kerotion_yks";
const LS_YKS_MISTAKES = "kerotion_yks_mistakes";
const LS_YKS_SYLLABUS = "kerotion_yks_syllabus";
const LS_LINKS = "kerotion_links";
const LS_INBOX = "kerotion_inbox";

let todoData = [];
let kanbanData = { ideas: [], inProgress: [], done: [] };
let yksData = [];
let yksMistakesData = [];
let yksSyllabusData = {
  "TYT Matematik": ["Sayılar", "Bölünebilme", "Rasyonel Sayılar", "Denklemler", "Mutlak Değer", "Üslü Sayılar", "Köklü Sayılar", "Çarpanlara Ayırma", "Oran Orantı", "Problemler", "Mantık", "Kümeler", "Fonksiyonlar"],
  "TYT Türkçe": ["Sözcük Anlamı", "Cümle Anlamı", "Paragraf", "Ses Bilgisi", "Yazım Kuralları", "Noktalama", "Sözcük Yapısı", "Cümle Ögeleri", "Fiiller"],
  "AYT Matematik": ["Polinomlar", "2. Dereceden Denklemler", "Karmaşık Sayılar", "Trigonometri", "Logaritma", "Diziler", "Limit", "Türev", "İntegral"],
  "TYT/AYT Fizik": ["Fizik Bilimine Giriş", "Madde ve Özellikleri", "Hareket ve Kuvvet", "Enerji", "Isı ve Sıcaklık", "Elektrostatik", "Optik", "Dalgalar", "Modern Fizik"]
};
let yksProgress = {}; // { "TYT Matematik": ["Sayılar"] }
let pomoLog = [];
let linksData = [];
let inboxData = [];

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
  if (!activePageId && pages.length > 0) activePageId = pages[0].id;
  
  const jData = localStorage.getItem(LS_JOURNAL);
  if (jData) journalData = JSON.parse(jData);
  
  const rData = localStorage.getItem(LS_ROUTINES);
  if (rData) routinesData = JSON.parse(rData);

  // Load Second Brain
  const tData = localStorage.getItem(LS_TODO);
  if (tData) todoData = JSON.parse(tData);

  const kData = localStorage.getItem(LS_KANBAN);
  if (kData) kanbanData = JSON.parse(kData);

  const yData = localStorage.getItem(LS_YKS);
  if (yData) yksData = JSON.parse(yData);

  const ymData = localStorage.getItem(LS_YKS_MISTAKES);
  if (ymData) yksMistakesData = JSON.parse(ymData);

  const ysData = localStorage.getItem(LS_YKS_SYLLABUS);
  if (ysData) yksProgress = JSON.parse(ysData);

  const pmLogData = localStorage.getItem("kerotion_pomo_log");
  if (pmLogData) pomoLog = JSON.parse(pmLogData);

  const lData = localStorage.getItem(LS_LINKS);
  if (lData) linksData = JSON.parse(lData);

  const iData = localStorage.getItem(LS_INBOX);
  if (iData) inboxData = JSON.parse(iData);
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(pages));
    localStorage.setItem(LS_JOURNAL, JSON.stringify(journalData));
    localStorage.setItem(LS_ROUTINES, JSON.stringify(routinesData));
    
    // Save Second Brain
    localStorage.setItem(LS_TODO, JSON.stringify(todoData));
    localStorage.setItem(LS_KANBAN, JSON.stringify(kanbanData));
    localStorage.setItem(LS_YKS, JSON.stringify(yksData));
    localStorage.setItem(LS_YKS_MISTAKES, JSON.stringify(yksMistakesData));
    localStorage.setItem(LS_YKS_SYLLABUS, JSON.stringify(yksProgress));
    localStorage.setItem("kerotion_pomo_log", JSON.stringify(pomoLog));
    localStorage.setItem(LS_LINKS, JSON.stringify(linksData));
    localStorage.setItem(LS_INBOX, JSON.stringify(inboxData));
  }, 400);
}

function getActivePage() {
  return pages.find(p => p.id === activePageId);
}

/* ---------- 2. DOM ELEMENTS ---------- */
const DOM = {
  contextColors: [] // Will be populated in init
};

function refreshDOM() {
  DOM.sidebarToggle = document.getElementById("sidebarToggle");
  DOM.sidebarOpenBtn = document.getElementById("sidebarOpenBtn");
  DOM.sidebar = document.getElementById("sidebar");
  DOM.btnAddRootPage = document.getElementById("btnAddRootPage");
  DOM.pageTree = document.getElementById("pageTree");
  DOM.pageTitle = document.getElementById("pageTitle");
  DOM.blocksContainer = document.getElementById("blocksContainer");
  DOM.slashMenu = document.getElementById("slashMenu");
  DOM.slashMenuList = document.getElementById("slashMenuList");
  DOM.pageView = document.getElementById("pageView");
  DOM.journalView = document.getElementById("journalView");
  DOM.routinesView = document.getElementById("routinesView");
  DOM.btnShowPages = document.getElementById("btnShowPages");
  DOM.btnShowJournal = document.getElementById("btnShowJournal");
  DOM.btnShowRoutines = document.getElementById("btnShowRoutines");
  DOM.inboxView = document.getElementById("inboxView");
  DOM.todoView = document.getElementById("todoView");
  DOM.kanbanView = document.getElementById("kanbanView");
  DOM.yksView = document.getElementById("yksView");
  DOM.linksView = document.getElementById("linksView");
  DOM.btnShowInbox = document.getElementById("btnShowInbox");
  DOM.btnShowTodo = document.getElementById("btnShowTodo");
  DOM.btnShowKanban = document.getElementById("btnShowKanban");
  DOM.btnShowYks = document.getElementById("btnShowYks");
  DOM.btnShowLinks = document.getElementById("btnShowLinks");
  DOM.yksTabBtns = document.querySelectorAll(".yks-tab-btn");
  DOM.yksTabContents = document.querySelectorAll(".yks-tab-content");
  DOM.btnMistakeAdd = document.getElementById("btnMistakeAdd");
  DOM.mistakeList = document.getElementById("mistakeList");
  DOM.syllabusGrid = document.getElementById("syllabusGrid");
  DOM.pomoZoneBtn = document.getElementById("btnPomoZone");
  DOM.pomoTimeDisplay = document.getElementById("pomoTimeDisplay");
  DOM.pomoStatusText = document.getElementById("pomoStatusText");
  DOM.pomoModes = document.querySelectorAll(".pomo-mode");
  DOM.pomoCustomWork = document.getElementById("pomoCustomWork");
  DOM.pomoCustomBreak = document.getElementById("pomoCustomBreak");
  DOM.pomoApplyCustom = document.getElementById("btnPomoApplyCustom");
  DOM.pomoPlayPause = document.getElementById("pomoPlayPause");
  DOM.pomoReset = document.getElementById("pomoReset");
  DOM.theZone = document.getElementById("theZone");
  DOM.btnZoneExit = document.getElementById("btnZoneExit");
  DOM.blockContextMenu = document.getElementById("blockContextMenu");
  DOM.btnDeleteBlock = document.getElementById("btnDeleteBlock");
  DOM.contextColors = document.querySelectorAll(".color-badge");
}

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


/* ---------- 6. UTILS & INIT ---------- */
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function attachGlobalListeners() {
  if (DOM.sidebarToggle) DOM.sidebarToggle.addEventListener("click", toggleSidebar);
  if (DOM.sidebarOpenBtn) DOM.sidebarOpenBtn.addEventListener("click", toggleSidebar);
  if (DOM.btnAddRootPage) DOM.btnAddRootPage.addEventListener("click", () => createPage(null));
  
  // TITLE EVENTS
  if (DOM.pageTitle) {
    DOM.pageTitle.addEventListener("input", () => {
      const page = getActivePage();
      if (page) {
        page.title = DOM.pageTitle.value;
        autoResize(DOM.pageTitle);
        scheduleSave();
        renderTree();
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

  // SLASH MENU EVENTS
  if (DOM.slashMenuList) {
    DOM.slashMenuList.addEventListener("click", (e) => {
      const li = e.target.closest(".slash-menu-item");
      if (!li) return;
      const newType = li.dataset.type;
      if (slashMenuState.blockId) {
        changeBlockType(slashMenuState.blockId, newType);
      }
      closeSlashMenu();
    });
  }
  
  // MENU EVENTS
  if (DOM.btnShowPages) DOM.btnShowPages.addEventListener("click", () => switchView("pages"));
  if (DOM.btnShowJournal) DOM.btnShowJournal.addEventListener("click", () => switchView("journal"));
  if (DOM.btnShowRoutines) DOM.btnShowRoutines.addEventListener("click", () => switchView("routines"));
  if (DOM.btnShowInbox) DOM.btnShowInbox.addEventListener("click", () => switchView("inbox"));
  if (DOM.btnShowTodo) DOM.btnShowTodo.addEventListener("click", () => switchView("todo"));
  if (DOM.btnShowKanban) DOM.btnShowKanban.addEventListener("click", () => switchView("kanban"));
  if (DOM.btnShowYks) DOM.btnShowYks.addEventListener("click", () => switchView("yks"));
  if (DOM.btnShowLinks) DOM.btnShowLinks.addEventListener("click", () => switchView("links"));
  
  // YKS TAB EVENTS
  DOM.yksTabBtns.forEach(btn => {
    btn.addEventListener("click", () => switchYksTab(btn.dataset.tab));
  });
  
  DOM.btnMistakeAdd.addEventListener("click", addMistakeLog);
  
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
  if (DOM.pomoZoneBtn) DOM.pomoZoneBtn.addEventListener("click", toggleZone);
  if (DOM.btnZoneExit) DOM.btnZoneExit.addEventListener("click", toggleZone);
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

  // YKS & LINK ADD EVENTS (Restored and moved inside listeners for safety)
  document.getElementById("btnYksAdd").addEventListener("click", () => {
    const n = document.getElementById("yksNameInput").value.trim();
    const v = parseFloat(document.getElementById("yksNetInput").value);
    if (n && !isNaN(v)) {
      yksData.push({ name: n, net: v });
      document.getElementById("yksNameInput").value = "";
      document.getElementById("yksNetInput").value = "";
      scheduleSave();
      renderYksBar();
    }
  });

  document.getElementById("btnLinkAdd").addEventListener("click", () => {
    const title = document.getElementById("linkTitleInput").value.trim();
    const urlEl = document.getElementById("linkUrlInput");
    let url = urlEl.value.trim();
    if (title && url) {
      if(!url.startsWith("http")) url = "https://" + url;
      linksData.push({ title, url });
      document.getElementById("linkTitleInput").value = "";
      urlEl.value = "";
      scheduleSave();
      renderLinks();
    }
  });
}

function init() {
  try {
    console.log("Initializing Kerotion...");
    refreshDOM();
    loadData();
    attachGlobalListeners();
    renderTree();
    if (activePageId) {
      openPage(activePageId);
    }
    console.log("Kerotion initialized successfully.");
  } catch (err) {
    console.error("CRITICAL: Kerotion initialization failed:", err);
  }
}

/* ---------- 7. VIEW NAVIGATION ---------- */
function switchView(viewName) {
  console.log("Switching view to:", viewName);
  currentView = viewName;
  
  const viewMap = {
    "pages": "pageView",
    "journal": "journalView",
    "routines": "routinesView",
    "inbox": "inboxView",
    "todo": "todoView",
    "kanban": "kanbanView",
    "yks": "yksView",
    "links": "linksView"
  };

  const btnMap = {
    "pages": "btnShowPages",
    "journal": "btnShowJournal",
    "routines": "btnShowRoutines",
    "inbox": "btnShowInbox",
    "todo": "btnShowTodo",
    "kanban": "btnShowKanban",
    "yks": "btnShowYks",
    "links": "btnShowLinks"
  };

  Object.keys(viewMap).forEach(v => {
    const btn = DOM[btnMap[v]];
    const container = DOM[viewMap[v]];
    
    if (btn) btn.classList.toggle("active", viewName === v);
    if (container) {
      if (viewName === v) {
        container.classList.remove("view-hidden");
        container.style.display = "block";
      } else {
        container.classList.add("view-hidden");
        container.style.display = "none";
      }
    }
  });

  // Render Specific Views
  if (viewName === "yks") {
    renderYksBar();
    renderMistakes();
    renderSyllabusTracker();
  }
  if (viewName === "links") renderLinks();
  if (viewName === "routines") renderRoutines();
  if (viewName === "journal") renderJournalList();
  if (viewName === "inbox") renderInbox();
  if (viewName === "todo") renderTodo();
  if (viewName === "kanban") renderKanban();
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
    
    // YKS Özel Log
    const target = document.getElementById("pomoFocusTarget").value;
    pomoLog.push({ date: today, time: new Date().toLocaleTimeString(), target: target });
    
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

/* ---------- 12. SECOND BRAIN (MODULES) ---------- */

// --- 12.1 INBOX / BRAIN DUMP ---
function renderInbox() {
  const listEl = document.getElementById("inboxList");
  listEl.innerHTML = "";
  if (inboxData.length === 0) {
    listEl.innerHTML = "<p style='color:var(--text-muted);'>Zihin çöplüğü temiz.</p>";
    return;
  }
  [...inboxData].reverse().forEach((note, idx) => {
    const item = document.createElement("div");
    item.className = "todo-item";
    
    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = note;
    
    const btnDel = document.createElement("button");
    btnDel.className = "todo-trash";
    btnDel.innerHTML = "🗑";
    btnDel.onclick = () => {
      inboxData.splice(inboxData.length - 1 - idx, 1);
      scheduleSave();
      renderInbox();
    };
    
    item.appendChild(text);
    item.appendChild(btnDel);
    listEl.appendChild(item);
  });
}

const bdModal = document.getElementById("brainDumpModal");
const bdInput = document.getElementById("brainDumpInput");

document.addEventListener("keydown", (e) => {
  // Ctrl + Space
  if (e.ctrlKey && e.code === "Space") {
    e.preventDefault();
    bdModal.classList.remove("hidden");
    bdInput.value = "";
    bdInput.focus();
  }
  // ESC to close
  if (e.key === "Escape" && !bdModal.classList.contains("hidden")) {
    bdModal.classList.add("hidden");
    const p = document.getElementById("pageTitle");
    if(p) p.focus();
  }
});

bdInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && bdInput.value.trim() !== "") {
    e.preventDefault();
    inboxData.push(bdInput.value.trim());
    scheduleSave();
    bdModal.classList.add("hidden");
    if(currentView === "inbox") renderInbox();
  }
});

// --- 12.2 GÜNLÜK GÖREVLER (TODO) ---
const todoInput = document.getElementById("todoInput");
function renderTodo() {
  const listEl = document.getElementById("todoList");
  listEl.innerHTML = "";
  if(todoData.length === 0) {
    listEl.innerHTML = "<p style='color:var(--text-muted);'>Bugün için planlanan görev yok.</p>";
    return;
  }
  todoData.forEach((td, idx) => {
    const item = document.createElement("div");
    item.className = "todo-item" + (td.done ? " checked" : "");
    
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = td.done;
    chk.onchange = () => {
      todoData[idx].done = chk.checked;
      scheduleSave();
      renderTodo();
    };
    
    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = td.text;
    
    const btnDel = document.createElement("button");
    btnDel.className = "todo-trash";
    btnDel.innerHTML = "🗑";
    btnDel.onclick = () => {
      todoData.splice(idx, 1);
      scheduleSave();
      renderTodo();
    };
    
    item.appendChild(chk);
    item.appendChild(text);
    item.appendChild(btnDel);
    listEl.appendChild(item);
  });
}
todoInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter" && todoInput.value.trim() !== "") {
    todoData.push({ text: todoInput.value.trim(), done: false });
    todoInput.value = "";
    scheduleSave();
    renderTodo();
  }
});

// --- 12.3 PROJE PANOSU (KANBAN) ---
const kInput = document.getElementById("kanbanInput");
const btnKanbanAdd = document.getElementById("btnKanbanAdd");

function renderKanban() {
  ["ideas", "inProgress", "done"].forEach(colId => {
    const colEl = document.getElementById(colId === "ideas" ? "kanbanIdeas" : colId === "inProgress" ? "kanbanProgress" : "kanbanDone");
    colEl.innerHTML = "";
    
    kanbanData[colId].forEach((task, idx) => {
      const card = document.createElement("div");
      card.className = "kanban-card";
      card.draggable = true;
      card.innerHTML = `<span>${task}</span> <button class="todo-trash" style="font-size:12px;">🗑</button>`;
      
      card.querySelector("button").onclick = () => {
        kanbanData[colId].splice(idx, 1);
        scheduleSave();
        renderKanban();
      };
      
      card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({ colId, idx }));
      });
      
      colEl.appendChild(card);
    });
  });
}

function addKanbanCard() {
  const val = kInput.value.trim();
  if(val !== "") {
    kanbanData.ideas.push(val);
    kInput.value = "";
    scheduleSave();
    renderKanban();
  }
}
kInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addKanbanCard(); });
btnKanbanAdd.addEventListener("click", addKanbanCard);

document.querySelectorAll(".kanban-col").forEach(col => {
  col.addEventListener("dragover", e => {
    e.preventDefault();
    col.classList.add("drag-over-kanban");
  });
  col.addEventListener("dragleave", e => {
    col.classList.remove("drag-over-kanban");
  });
  col.addEventListener("drop", e => {
    e.preventDefault();
    col.classList.remove("drag-over-kanban");
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      const targetColId = col.dataset.col;
      if (data.colId === targetColId) return;
      const taskText = kanbanData[data.colId].splice(data.idx, 1)[0];
      kanbanData[targetColId].push(taskText);
      scheduleSave();
      renderKanban();
    } catch(err){}
  });
});

// --- 12.4 YKS ANALIZ BARS (CSS) ---
function switchYksTab(tabName) {
  DOM.yksTabBtns.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  DOM.yksTabContents.forEach(content => {
    const isTarget = content.id === "yksTab" + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    content.classList.toggle("view-hidden", !isTarget);
  });
}

function renderYksBar() {
  const chartEl = document.getElementById("yksChartArea");
  chartEl.innerHTML = "";
  if(yksData.length === 0) {
    chartEl.innerHTML = "<p style='color:var(--text-muted); padding: 20px;'>Net verisi bekleniyor...</p>";
    return;
  }
  const maxNet = 120; // TYT Maximum
  
  yksData.forEach((entry, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "yks-bar-wrap";
    
    const bar = document.createElement("div");
    bar.className = "yks-bar";
    const heightPct = Math.min((entry.net / maxNet) * 100, 100);
    setTimeout(() => { bar.style.height = heightPct + "%"; }, 50);
    bar.style.height = "0%";
    
    bar.title = `${entry.name}:\n${entry.net} Net (Çift tıkla sil)`;
    
    const val = document.createElement("div");
    val.className = "yks-value";
    val.textContent = entry.net;
    
    const label = document.createElement("div");
    label.className = "yks-label";
    label.textContent = entry.name;
    
    wrap.ondblclick = () => {
      if(confirm(`"${entry.name}" denemesini silmek istiyor musunuz?`)){
        yksData.splice(idx, 1);
        scheduleSave();
        renderYksBar();
      }
    };
    
    bar.appendChild(val);
    bar.appendChild(label);
    wrap.appendChild(bar);
    chartEl.appendChild(wrap);
  });
}

function addMistakeLog() {
  const lesson = document.getElementById("mistakeLesson").value.trim();
  const subject = document.getElementById("mistakeSubject").value.trim();
  const reason = document.getElementById("mistakeReason").value;
  const note = document.getElementById("mistakeNote").value.trim();
  
  if(!lesson || !subject) { alert("Ders ve Konu alanları zorunludur!"); return; }
  
  yksMistakesData.push({
    id: generateId(),
    date: getTodayDateStr(),
    lesson,
    subject,
    reason,
    note
  });
  
  document.getElementById("mistakeLesson").value = "";
  document.getElementById("mistakeSubject").value = "";
  document.getElementById("mistakeNote").value = "";
  
  scheduleSave();
  renderMistakeVault();
}

function renderMistakeVault() {
  const list = document.getElementById("mistakeList");
  list.innerHTML = "";
  
  if (yksMistakesData.length === 0) {
    list.innerHTML = "<tr><td colspan='6' style='text-align:center; color:var(--text-muted);'>Henüz bir hata loglanmadı.</td></tr>";
    return;
  }
  
  [...yksMistakesData].reverse().forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.date}</td>
      <td style="font-weight:700;">${m.lesson}</td>
      <td>${m.subject}</td>
      <td><span class="badge-reason ${m.reason.toLowerCase()}">${m.reason}</span></td>
      <td style="font-size:12px; color:var(--text-secondary);">${m.note}</td>
      <td><button class="todo-trash" onclick="deleteMistake('${m.id}')">🗑</button></td>
    `;
    list.appendChild(tr);
  });
}

window.deleteMistake = function(id) {
  yksMistakesData = yksMistakesData.filter(m => m.id !== id);
  scheduleSave();
  renderMistakeVault();
};

function renderSyllabusTracker() {
  const grid = document.getElementById("syllabusGrid");
  grid.innerHTML = "";
  
  Object.keys(yksSyllabusData).forEach(lesson => {
    const topics = yksSyllabusData[lesson];
    const finished = yksProgress[lesson] || [];
    const percent = topics.length > 0 ? Math.round((finished.length / topics.length) * 100) : 0;
    
    const card = document.createElement("div");
    card.className = "syllabus-card";
    
    card.innerHTML = `
      <div class="syllabus-header">
        <span class="syllabus-lesson-name">${lesson}</span>
        <span class="syllabus-percentage">%${percent}</span>
      </div>
      <div class="progress-container">
        <div class="progress-bar-fill" style="width: ${percent}%"></div>
      </div>
      <div class="syllabus-topics">
        ${topics.map(topic => {
          const isDone = finished.includes(topic);
          return `
            <label class="topic-item ${isDone ? 'done' : ''}">
              <input type="checkbox" ${isDone ? 'checked' : ''} onchange="toggleTopic('${lesson}', '${topic}')" />
              <span>${topic}</span>
            </label>
          `;
        }).join('')}
      </div>
    `;
    grid.appendChild(card);
  });
}

window.toggleTopic = function(lesson, topic) {
  if (!yksProgress[lesson]) yksProgress[lesson] = [];
  const idx = yksProgress[lesson].indexOf(topic);
  if (idx > -1) yksProgress[lesson].splice(idx, 1);
  else yksProgress[lesson].push(topic);
  scheduleSave();
  renderSyllabusTracker();
};
/* ---------- 8. YKS LOGIC ---------- */
function switchYksTab(tabName) {
  DOM.yksTabBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabName));
  DOM.yksTabContents.forEach(content => {
    const isTarget = content.id === "yksTab" + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    content.classList.toggle("view-hidden", !isTarget);
  });
  if(tabName === "analiz") renderYksBar();
  if(tabName === "syllabus") renderSyllabusTracker();
  if(tabName === "mistakes") renderMistakes();
}

function renderYksBar() {
  const area = document.getElementById("yksChartArea");
  if(!area) return;
  area.innerHTML = "";
  if(yksData.length === 0) {
    area.innerHTML = "<p style='color:var(--text-muted);'>Deneme verisi yok.</p>";
    return;
  }
  yksData.forEach(d => {
    const barWrap = document.createElement("div");
    barWrap.className = "yks-bar-wrap";
    barWrap.innerHTML = `
      <div class="yks-bar" style="height: ${Math.min(d.net, 120)}px" title="${d.name}: ${d.net}"></div>
      <span class="yks-bar-label">${d.name}</span>
    `;
    area.appendChild(barWrap);
  });
}

function addMistakeLog() {
  const lesson = document.getElementById("mistakeLesson").value.trim();
  const subject = document.getElementById("mistakeSubject").value.trim();
  const reason = document.getElementById("mistakeReason").value;
  const note = document.getElementById("mistakeNote").value.trim();
  
  if(lesson && subject) {
    yksMistakesData.unshift({
      id: generateId(),
      lesson,
      subject,
      reason,
      note,
      date: getTodayDateStr()
    });
    document.getElementById("mistakeLesson").value = "";
    document.getElementById("mistakeSubject").value = "";
    document.getElementById("mistakeNote").value = "";
    scheduleSave();
    renderMistakes();
  }
}

function renderMistakes() {
  const list = document.getElementById("mistakeList");
  if(!list) return;
  list.innerHTML = "";
  if(yksMistakesData.length === 0) {
    list.innerHTML = "<tr><td colspan='5' style='text-align:center; color:var(--text-muted);'>Kayıt yok.</td></tr>";
    return;
  }
  yksMistakesData.forEach((m, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.date}</td>
      <td>${m.lesson}</td>
      <td>${m.subject}</td>
      <td><span class="mistake-tag tag-${m.reason.toLowerCase()}">${m.reason}</span></td>
      <td><button class="todo-trash" onclick="window.deleteMistake(${idx})">🗑</button></td>
    `;
    list.appendChild(tr);
  });
}

window.deleteMistake = function(idx) {
  yksMistakesData.splice(idx, 1);
  scheduleSave();
  renderMistakes();
};

function renderSyllabusTracker() {
  const grid = document.getElementById("syllabusGrid");
  if(!grid) return;
  grid.innerHTML = "";
  
  const subjects = {
    "TYT Matematik": ["Sayılar", "Problemler", "Geometri"],
    "TYT Türkçe": ["Paragraf", "Dil Bilgisi", "Yazım Kuralları"],
    "AYT Matematik": ["Limit", "Türev", "İntegral", "Logaritma"]
  };

  Object.keys(subjects).forEach(lesson => {
    const topics = subjects[lesson];
    const finished = yksProgress[lesson] || [];
    const percent = topics.length > 0 ? Math.round((finished.length / topics.length) * 100) : 0;
    
    const card = document.createElement("div");
    card.className = "syllabus-card";
    card.innerHTML = `
      <div class="syllabus-header">
        <span class="syllabus-lesson-name">${lesson}</span>
        <span class="syllabus-percentage">%${percent}</span>
      </div>
      <div class="progress-container">
        <div class="progress-bar-fill" style="width: ${percent}%"></div>
      </div>
      <div class="syllabus-topics">
        ${topics.map(t => {
          const isDone = finished.includes(t);
          return `
            <label class="topic-item ${isDone ? 'done' : ''}">
              <input type="checkbox" ${isDone ? 'checked' : ''} onchange="window.toggleTopic('${lesson}', '${t}')" />
              <span>${t}</span>
            </label>
          `;
        }).join('')}
      </div>
    `;
    grid.appendChild(card);
  });
}

window.toggleTopic = function(lesson, topic) {
  if(!yksProgress[lesson]) yksProgress[lesson] = [];
  const idx = yksProgress[lesson].indexOf(topic);
  if(idx > -1) yksProgress[lesson].splice(idx, 1);
  else yksProgress[lesson].push(topic);
  scheduleSave();
  renderSyllabusTracker();
};

/* ---------- 9. JOURNAL LOGIC ---------- */
function renderJournalList() {
  document.getElementById("journalList").classList.remove("view-hidden");
  document.getElementById("journalEditor").classList.add("view-hidden");
  const grid = document.getElementById("journalGrid");
  grid.innerHTML = "";
  
  const sorted = Object.keys(journalData).sort().reverse();
  sorted.forEach(date => {
    const card = document.createElement("div");
    card.className = "journal-card";
    card.innerHTML = `<h3>${date}</h3><p>${journalData[date].substring(0, 50)}...</p>`;
    card.onclick = () => openJournalEditor(date);
    grid.appendChild(card);
  });
}

function openJournalEditor(date) {
  activeJournalDate = date;
  document.getElementById("journalList").classList.add("view-hidden");
  document.getElementById("journalEditor").classList.remove("view-hidden");
  document.getElementById("journalDateTitle").innerText = date;
  document.getElementById("journalTextarea").value = journalData[date] || "";
}

function saveJournalEntry() {
  if(!activeJournalDate) return;
  journalData[activeJournalDate] = document.getElementById("journalTextarea").value;
  scheduleSave();
  renderJournalList();
}

/* ---------- 10. ROUTINES & POMO ---------- */
function addRoutine() {
  const input = document.getElementById("newRoutineInput");
  const val = input.value.trim();
  if(val) {
    routinesData.push({ id: generateId(), text: val, completed: false });
    input.value = "";
    scheduleSave();
    renderRoutines();
  }
}

function renderRoutines() {
  const list = document.getElementById("routinesList");
  if(!list) return;
  list.innerHTML = "";
  routinesData.forEach(r => {
    const item = document.createElement("div");
    item.className = "routine-item" + (r.completed ? " completed" : "");
    item.innerHTML = `
      <input type="checkbox" ${r.completed ? "checked" : ""} onchange="window.toggleRoutine('${r.id}')" />
      <span>${r.text}</span>
      <button class="todo-trash" onclick="window.deleteRoutine('${r.id}')">🗑</button>
    `;
    list.appendChild(item);
  });
}

window.toggleRoutine = function(id) {
  const r = routinesData.find(x => x.id === id);
  if(r) r.completed = !r.completed;
  scheduleSave();
  renderRoutines();
};

window.deleteRoutine = function(id) {
  routinesData = routinesData.filter(x => x.id !== id);
  scheduleSave();
  renderRoutines();
};

function togglePomoTimer() {
  if(pomoIsRunning) {
    clearInterval(pomoInterval);
    pomoIsRunning = false;
    DOM.pomoPlayPause.innerText = "▶";
  } else {
    pomoIsRunning = true;
    DOM.pomoPlayPause.innerText = "⏸";
    pomoInterval = setInterval(pomoTick, 1000);
  }
}

function resetPomoTimer() {
  clearInterval(pomoInterval);
  pomoIsRunning = false;
  pomoTimeLeft = 25 * 60;
  pomoState = "idle";
  updatePomoUI();
  DOM.pomoPlayPause.innerText = "▶";
}

function setPomoMode(work, rest) {
  clearInterval(pomoInterval);
  pomoIsRunning = false;
  pomoTimeLeft = work * 60;
  pomoState = "work";
  updatePomoUI();
  DOM.pomoPlayPause.innerText = "▶";
}

function pomoTick() {
  if(pomoTimeLeft > 0) {
    pomoTimeLeft--;
    updatePomoUI();
  } else {
    endPomodoro();
  }
}

function updatePomoUI() {
  const m = Math.floor(pomoTimeLeft / 60);
  const s = pomoTimeLeft % 60;
  const timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;
  DOM.pomoTimeDisplay.innerText = timeStr;
  document.title = `${timeStr} - Kerotion`;
  
  if(DOM.zoneTimerDisplay) DOM.zoneTimerDisplay.innerText = timeStr;
  
  let status = "Bekliyor";
  if(pomoState === "work") status = "ÇALIŞMA 🔥";
  else if(pomoState === "break") status = "MOLA ☕";
  DOM.pomoStatusText.innerText = status;
}

function endPomodoro() {
  clearInterval(pomoInterval);
  pomoIsRunning = false;
  DOM.pomoPlayPause.innerText = "▶";
  
  const target = document.getElementById("pomoFocusTarget").value;
  pomoLog.unshift({ id: generateId(), target, date: new Date().toLocaleString() });
  scheduleSave();

  if(pomoState === "work") {
    pomoState = "break";
    pomoTimeLeft = 5 * 60;
    alert("Pomodoro bitti! Mola vakti.");
  } else {
    pomoState = "work";
    pomoTimeLeft = 25 * 60;
    alert("Mola bitti! Odaklanma vakti.");
  }
  updatePomoUI();
}

function toggleZone() {
  DOM.theZone.classList.toggle("zone-hidden");
  if(!DOM.theZone.classList.contains("zone-hidden")) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "auto";
  }
}

// --- 12.6 LINK VAULT (Restored) ---
function renderLinks() {
  const grid = document.getElementById("linksGrid");
  if (!grid) return;
  grid.innerHTML = "";
  if(linksData.length === 0) {
    grid.innerHTML = "<p style='color:var(--text-muted);'>Kasa boş.</p>";
    return;
  }
  linksData.forEach((link, idx) => {
    const card = document.createElement("a");
    card.className = "link-card";
    card.href = link.url;
    card.target = "_blank";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between;">
        <span class="link-title">${link.title}</span>
        <button class="todo-trash" style="font-size:12px; z-index:10;" onclick="event.preventDefault(); window.deleteLink(${idx});">🗑</button>
      </div>
      <span class="link-url">${link.url}</span>
    `;
    grid.appendChild(card);
  });
}

window.deleteLink = function(idx) {
  linksData.splice(idx, 1);
  scheduleSave();
  renderLinks();
};

document.addEventListener("DOMContentLoaded", init);

