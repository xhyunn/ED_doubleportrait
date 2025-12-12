// ================================
// script.js — ULTRA FINAL VERSION
// (Center-Reference Camera + Smooth Lerp)
// ================================

document.addEventListener("DOMContentLoaded", () => {

  // ------------------------------
  // DOM CACHE
  // ------------------------------
  const canvasView = document.getElementById("canvas-view");
  const canvasContent = document.getElementById("canvas-content");
  const panelOpenBtn = document.getElementById("panel-open-btn");
  const editorialPanel = document.getElementById("editorial-panel");
  const panelContent = editorialPanel.querySelector(".panel-content");
  const dayNightToggle = document.getElementById("day-night-toggle");
  const overlay = document.getElementById("canvas-overlay");
  const zoomInBtn = document.getElementById("zoom-in");
  const zoomOutBtn = document.getElementById("zoom-out");

  // ------------------------------
  // STATE
  // ------------------------------
  let currentMode = "day";
  let currentPanel = "intro";
  let panelOpen = false;

  // CAMERA STATE (Center-Reference System)
  // camX, camY: The point in the content (0-100%) that is at the center of the viewport.
  // camZoom: The scale factor.

  // Current (Rendered)
  let curCamX = 50;
  let curCamY = 50;
  let curCamZoom = 1;

  // Target (Input)
  let tarCamX = 50;
  let tarCamY = 50;
  let tarCamZoom = 1;

  const minZoom = 0.4;
  const maxZoom = 3.0;
  const lerpFactor = 0.25; // 0.1 = smooth, 1.0 = instant

  // Drag State
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartCamX = 0;
  let dragStartCamY = 0;

  let lastTileData = null;
  let lastChapterKey = null;
  let lastPanelType = null;


  // ================================================================
  // ICON UPDATE
  // ================================================================
  function updateOnboardingIcons() {
    const set = (id, day, night) => {
      const el = document.getElementById(id);
      if (el) el.src = currentMode === "day" ? day : night;
    };

    set("icon-panel-open", "./icons/day_openpanel.svg", "./icons/night_openpanel.svg");
    set("icon-day-night", "./icons/day_toggle.svg", "./icons/night_toggle.svg");
    set("icon-zoom-in", "./icons/day_zoomin.svg", "./icons/night_zoomin.svg");
    set("icon-zoom-out", "./icons/day_zoomout.svg", "./icons/night_zoomout.svg");
  }


  // ================================================================
  // TILE RENDERING (GRID + JITTER)
  // ================================================================
  function renderTiles() {
    canvasContent.innerHTML = "";

    // 1. Shuffle Data (Fisher-Yates)
    const shuffled = [...tilesData];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 2. Grid Calculation
    const total = shuffled.length;
    const cols = Math.ceil(Math.sqrt(total * 1.5));
    const rows = Math.ceil(total / cols);

    const cellW = 100 / cols; // percentage
    const cellH = 100 / rows; // percentage

    shuffled.forEach((tile, index) => {
      const t = document.createElement("div");
      t.className = `tile tile-${tile.type}`;
      t.dataset.id = tile.id;

      // Grid Position
      const r = Math.floor(index / cols);
      const c = index % cols;

      // Jitter
      const jitterX = (Math.random() - 0.5) * (cellW * 0.6);
      const jitterY = (Math.random() - 0.5) * (cellH * 0.6);

      const left = (c * cellW) + (cellW / 2) + jitterX;
      const top = (r * cellH) + (cellH / 2) + jitterY;

      t.style.left = `${left}%`;
      t.style.top = `${top}%`;

      if (tile.type === "image") {
        const img = document.createElement("img");
        img.src = tile.content;
        t.appendChild(img);
      }

      const caption = document.createElement("p");
      caption.textContent = tile.caption;
      t.appendChild(caption);

      t.addEventListener("click", () => {
        if (!t.classList.contains("filtered-out")) {
          // Special handling for Author Note / Interview tiles
          if (tile.id === "author_note") {
            lastPanelType = "chapter";
            lastChapterKey = "knh";
            openPanel("chapter");
            applyChapterContent("knh");
          } else if (tile.id === "interview") {
            lastPanelType = "chapter";
            lastChapterKey = "csh";
            openPanel("chapter");
            applyChapterContent("csh");
          } else {
            openTilePanel(tile);
          }
        }
      });

      canvasContent.appendChild(t);
    });
  }


  // ================================================================
  // TILE → PANEL OPEN (SIMPLE OVERLAY)
  // ================================================================
  function openTilePanel(tile) {
    lastTileData = tile;
    lastPanelType = "tile";
    lastChapterKey = null;

    // 1. Dim the Map
    canvasView.classList.add("is-dimmed");

    // 2. Show the Simple Overlay
    const overlayEl = document.getElementById("simple-photo-overlay");
    const simpleImg = document.getElementById("simple-detail-image");
    const simpleTitle = document.getElementById("simple-photo-title");
    const simpleChapter = document.getElementById("simple-chapter-title");
    const simpleDesc = document.getElementById("simple-photo-description");
    const closeBtn = document.getElementById("simple-close-btn");

    if (!overlayEl) return;

    overlayEl.classList.remove("hidden");

    // 3. Set Content
    if (tile.type === "image") {
      simpleImg.src = tile.content;
      simpleImg.style.display = "block";

      simpleTitle.textContent = tile.caption || "";
      // Use section or chapter as the "Book Chapter Title"
      simpleChapter.textContent = tile.section || tile.chapter || "";
      simpleDesc.textContent = tile.description || ""; // Populate description

    } else {
      // Message card behavior
      // Hide image, show text in title/desc?
      simpleImg.style.display = "none";
      simpleTitle.textContent = tile.caption || "";
      simpleChapter.textContent = tile.section || "";
      simpleDesc.textContent = tile.description || "";
    }

    panelOpen = true;
  }

  // Updated applyTileData to accept a container
  function applyTileData(tile, type, container = panelContent) {
    const panel = container.querySelector(".panel");
    if (!panel) return;

    panel.querySelector(".panel-title h3").textContent = tile.caption;

    if (type === "photo") {
      const m = panel.querySelectorAll(".meta-value");
      // 0: Category, 1: Date, 2: Film, 3: Info
      if (m[0]) m[0].textContent = tile.section || "-";
      if (m[1]) m[1].textContent = tile.date || "2025.00.00. MON";
      if (m[2]) m[2].textContent = tile.meta || "-";
      if (m[3]) m[3].textContent = tile.description || "";
    } else {
      const m = panel.querySelectorAll(".meta-value");
      // Message card (keep existing logic or update if needed)
      if (m[0]) m[0].innerHTML = `${tile.section}<br>${tile.date}`;
      if (m[1]) m[1].textContent = tile.fullContent;
    }
  }


  // ================================================================
  // OVERLAY CLOSE
  // ================================================================
  const simpleOverlay = document.getElementById("simple-photo-overlay");
  const simpleCloseBtn = document.getElementById("simple-close-btn");

  function closeSimpleOverlay() {
    if (simpleOverlay) simpleOverlay.classList.add("hidden");
    if (canvasView) canvasView.classList.remove("is-dimmed");
    panelOpen = false;
  }

  if (simpleCloseBtn) {
    simpleCloseBtn.addEventListener("click", closeSimpleOverlay);
  }

  // Also close on background click? User said "Clicking the X closes this simple popup".
  // But usually background click is expected.
  // "The screen returns to the normal map/grid view."
  // Let's add background click close for better UX, but ensure content click doesn't close.
  if (simpleOverlay) {
    simpleOverlay.addEventListener("click", (e) => {
      if (e.target === simpleOverlay) {
        closeSimpleOverlay();
      }
    });
  }


  // ================================================================
  // DRAG (Pan)
  // ================================================================
  canvasView.addEventListener("mousedown", e => {
    if (e.button !== 0) return;
    if (panelOpen) return; // Disable drag if panel is open

    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    dragStartCamX = tarCamX;
    dragStartCamY = tarCamY;

    canvasView.classList.add("dragging");
  });

  window.addEventListener("mousemove", e => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    // Convert pixel delta to percentage delta
    // 1. Scale down by zoom (moving 100px at 2x zoom moves 50px in content)
    // 2. Convert to % of content size

    const contentW = canvasView.clientWidth;
    const contentH = canvasView.clientHeight;

    // Note: Dragging RIGHT (positive dx) means moving camera LEFT (decreasing camX)
    const dPctX = (dx / tarCamZoom / contentW) * 100;
    const dPctY = (dy / tarCamZoom / contentH) * 100;

    tarCamX = dragStartCamX - dPctX;
    tarCamY = dragStartCamY - dPctY;
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
    canvasView.classList.remove("dragging");
  });


  // ================================================================
  // WHEEL ZOOM (Focus on Cursor)
  // ================================================================
  canvasView.addEventListener("wheel", e => {
    if (panelOpen) return; // Disable zoom if panel is open
    e.preventDefault();

    const delta = Math.sign(e.deltaY);
    const sensitivity = 0.05;

    const oldZoom = tarCamZoom;
    let newZoom = delta > 0
      ? Math.max(minZoom, tarCamZoom - sensitivity)
      : Math.min(maxZoom, tarCamZoom + sensitivity);

    // Clamp
    newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
    tarCamZoom = newZoom;

    // --- ZOOM TOWARDS CURSOR MATH ---
    // 1. Get mouse position relative to viewport center (in pixels)
    const rect = canvasView.getBoundingClientRect();
    const vw = rect.width;
    const vh = rect.height;

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const mouseFromCenterX = mx - (vw / 2);
    const mouseFromCenterY = my - (vh / 2);

    // 2. Calculate the "shift" in content percentage needed to keep the point under mouse stable
    // The logic: The point under the mouse in World Space should remain under the mouse.
    // WorldPoint = CameraCenter + (MouseFromCenter / Zoom)
    // We want WorldPoint to be same before and after.
    // NewCam = OldCam + M * (1/OldZ - 1/NewZ)

    // Convert M to percentage
    const mPctX = (mouseFromCenterX / vw) * 100;
    const mPctY = (mouseFromCenterY / vh) * 100;

    const shiftX = mPctX * (1 / oldZoom - 1 / newZoom);
    const shiftY = mPctY * (1 / oldZoom - 1 / newZoom);

    tarCamX += shiftX;
    tarCamY += shiftY;

  }, { passive: false });


  // ================================================================
  // BUTTON ZOOM (Center)
  // ================================================================
  function zoomFromCenter(delta) {
    if (panelOpen) return;
    let newZoom = delta > 0
      ? Math.min(maxZoom, tarCamZoom + 0.2)
      : Math.max(minZoom, tarCamZoom - 0.2);

    tarCamZoom = newZoom;
    // No camX/Y adjustment needed because we are zooming into the center
  }

  zoomInBtn.addEventListener("click", () => zoomFromCenter(+1));
  zoomOutBtn.addEventListener("click", () => zoomFromCenter(-1));


  // ================================================================
  // ANIMATION LOOP (Lerp)
  // ================================================================
  function update() {
    // Lerp
    curCamX += (tarCamX - curCamX) * lerpFactor;
    curCamY += (tarCamY - curCamY) * lerpFactor;
    curCamZoom += (tarCamZoom - curCamZoom) * lerpFactor;

    // Stop if close (optional optimization)
    // For now, just run always for simplicity

    applyTransform();
    requestAnimationFrame(update);
  }

  function applyTransform() {
    // Transform Origin is 0 0 (Top-Left)
    // We want (curCamX%, curCamY%) to be at (50vw, 50vh)

    const vw = canvasView.clientWidth;
    const vh = canvasView.clientHeight;

    // Convert Camera % to Pixels
    const cx_px = (curCamX / 100) * vw;
    const cy_px = (curCamY / 100) * vh;

    // Calculate Translate
    // translate = CenterOfScreen - (CameraInPixels * Zoom)
    const tx = (vw / 2) - (cx_px * curCamZoom);
    const ty = (vh / 2) - (cy_px * curCamZoom);

    canvasContent.style.transformOrigin = "0 0";
    canvasContent.style.transform =
      `translate(${tx}px, ${ty}px) scale(${curCamZoom})`;
  }


  // ================================================================
  // PANEL OPEN / CLOSE / CHAPTER
  // ================================================================
  function openPanel(panelKey = "intro") {
    currentPanel = panelKey;

    const tpl = document.getElementById(`panel-${currentMode}-${panelKey}`);
    if (!tpl) return;

    panelContent.innerHTML = "";
    panelContent.appendChild(tpl.content.cloneNode(true));
    editorialPanel.classList.add("panel-open");
    panelOpen = true;

    const closeBtn = panelContent.querySelector(".panel-close-icon");
    if (closeBtn) closeBtn.addEventListener("click", closePanel);

    const toggleBtn = panelContent.querySelector(".panel-toggle-btn");
    if (toggleBtn) toggleBtn.addEventListener("click", toggleDayNight);

    if (panelKey === "intro") attachIntroHandlers();
  }


  function closePanel() {
    editorialPanel.classList.remove("panel-open");
    panelOpen = false;

    // Hide Overlay & Undim Map
    const overlayEl = document.getElementById("photo-detail-overlay");
    if (overlayEl) overlayEl.classList.add("hidden");

    if (canvasView) canvasView.classList.remove("is-dimmed");


  }

  panelOpenBtn.addEventListener("click", () => {
    overlay.classList.add("hidden");
    openPanel("intro");
  });


  function applyChapterContent(key) {
    const panel = panelContent.querySelector(".panel");
    if (!panel) return;

    const h3 = panel.querySelector(".panel-title h3");
    const label = panel.querySelector(".chapter-label");
    const text = panel.querySelector(".chapter-text");

    const data = chapterTexts[key];

    if (h3) h3.textContent = data.head;

    if (label) {
      const span = label.querySelector("span");
      if (span) span.textContent = data.label;
      else label.textContent = data.label;
    }

    if (text) text.innerHTML = data.content;
  }


  // ================================================================
  // INTRO HANDLERS
  // ================================================================
  function attachIntroHandlers() {
    const intro = panelContent.querySelector(".intro-panel");
    if (!intro) return;

    intro.querySelectorAll("[data-chapter]").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.chapter;

        lastTileData = null;

        if (key === "credits") {
          lastPanelType = "credit";   // 🔥 chapter 취급 X
          lastChapterKey = null;
          openPanel("credits");
          return;
        }

        lastPanelType = "chapter";
        lastChapterKey = key;

        openPanel("chapter");
        applyChapterContent(key);
      });
    });

    intro.querySelectorAll("[data-section]").forEach(btn => {
      btn.addEventListener("click", () => {
        filterTiles(btn.dataset.section);
        closePanel();
      });
    });
  }


  // ================================================================
  // FILTER
  // ================================================================
  function filterTiles(k) {
    document.querySelectorAll(".tile").forEach(tile => {
      const d = tilesData.find(x => x.id === tile.dataset.id);
      if (!d) return;

      if (k === "intro" || d.filterKey === k) {
        tile.classList.remove("filtered-out");
        tile.style.pointerEvents = "auto";
      } else {
        tile.classList.add("filtered-out");
        tile.style.pointerEvents = "none";
      }
    });
  }


  // ================================================================
  // DAY ↔ NIGHT
  // ================================================================
  function toggleDayNight() {
    currentMode = currentMode === "day" ? "night" : "day";
    document.body.className = `mode-${currentMode}`;
    updateOnboardingIcons();

    if (panelOpen) {
      openPanel(currentPanel);

      if (lastPanelType === "tile" && lastTileData) {
        const type = lastTileData.type === "image" ? "photo" : "message";
        applyTileData(lastTileData, type);
      }

      if (lastPanelType === "chapter" && lastChapterKey) {
        applyChapterContent(lastChapterKey);
      }

      // 🔥 credit은 html 고정이라 텍스트 주입 금지
      // lastPanelType === "credit" 일 때는 아무 것도 하지 않음
    }

    if (!overlay.classList.contains("hidden")) {
      overlay.style.background =
        currentMode === "day"
          ? "rgba(252, 252, 244, 0.8)"
          : "rgba(19, 18, 18, 0.8)";
    }
  }

  dayNightToggle.addEventListener("click", toggleDayNight);


  // ================================================================
  // INIT
  // ================================================================
  function init() {
    renderTiles();
    updateOnboardingIcons();
    openPanel("intro");

    // Start Loop
    requestAnimationFrame(update);
  }

  init();

});