(() => {
  "use strict";

  const PDF_URL = "./manqoos_moulid.pdf";
  const PDFJS_VERSION = "3.11.174";
  const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;
  const THEME_KEY = "alhamdulillah-reader-theme";

  const root = document.documentElement;
  const readerCard = document.getElementById("reader-card");
  const themeToggle = document.getElementById("theme-toggle");
  const themeToggleText = document.getElementById("theme-toggle-text");
  const fullscreenToggle = document.getElementById("fullscreen-toggle");
  const fullscreenToggleText = document.getElementById("fullscreen-toggle-text");
  const readerStatus = document.getElementById("reader-status");
  const readerStatusText = document.getElementById("reader-status-text");
  const readerScroll = document.getElementById("reader-scroll");
  const readerError = document.getElementById("reader-error");
  const pdfPages = document.getElementById("pdf-pages");
  const pageCount = document.getElementById("page-count");

  function readSavedTheme() {
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      return saved === "light" || saved === "dark" ? saved : "dark";
    } catch (_error) {
      return "dark";
    }
  }

  function applyTheme(theme) {
    const nextTheme = theme === "light" ? "light" : "dark";
    root.dataset.theme = nextTheme;
    themeToggle.setAttribute("aria-pressed", String(nextTheme === "light"));
    themeToggleText.textContent = nextTheme === "dark" ? "Light theme" : "Dark theme";

    try {
      window.localStorage.setItem(THEME_KEY, nextTheme);
    } catch (_error) {
      // The selected theme still works for this visit if storage is unavailable.
    }
  }

  applyTheme(readSavedTheme());
  themeToggle.addEventListener("click", () => {
    applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
  });

  function syncFullscreenControl() {
    const active = document.fullscreenElement === readerCard;
    fullscreenToggle.setAttribute("aria-pressed", String(active));
    fullscreenToggleText.textContent = active ? "Exit fullscreen" : "Enter fullscreen";
  }

  fullscreenToggle.addEventListener("click", async () => {
    if (document.fullscreenElement === readerCard) {
      try {
        await document.exitFullscreen();
      } catch (_error) {
        readerStatusText.textContent = "Fullscreen mode could not be closed in this browser.";
      }
      return;
    }

    if (!document.fullscreenEnabled || typeof readerCard.requestFullscreen !== "function") {
      readerStatusText.textContent = "Fullscreen mode is not available in this browser.";
      return;
    }

    try {
      await readerCard.requestFullscreen();
    } catch (_error) {
      readerStatusText.textContent = "Fullscreen could not start. Try again after interacting with the page.";
    }
  });

  document.addEventListener("fullscreenchange", syncFullscreenControl);
  document.addEventListener("fullscreenerror", () => {
    readerStatusText.textContent = "Fullscreen mode is not available in this browser.";
  });
  syncFullscreenControl();

  function showReaderError(message) {
    readerStatus.hidden = true;
    readerScroll.hidden = true;
    readerError.hidden = false;
    readerError.textContent = message;
  }

  function updateLoadingStatus(message) {
    readerStatusText.textContent = message;
  }

  function createSkeleton() {
    const skeleton = document.createElement("div");
    skeleton.className = "page-skeleton";
    skeleton.setAttribute("aria-hidden", "true");
    return skeleton;
  }

  function createPageCard(pageNumber, totalPages, pageRatio) {
    const card = document.createElement("article");
    card.className = "pdf-page";
    card.dataset.pageNumber = String(pageNumber);
    card.style.aspectRatio = pageRatio;

    const heading = document.createElement("h3");
    heading.className = "visually-hidden";
    heading.textContent = `Page ${pageNumber} of ${totalPages}`;

    const accessibleText = document.createElement("div");
    accessibleText.className = "pdf-page-text visually-hidden";
    accessibleText.lang = "ar";
    accessibleText.dir = "auto";
    accessibleText.dataset.pageText = String(pageNumber);
    accessibleText.textContent = "Preparing accessible page text.";

    const visual = document.createElement("div");
    visual.className = "page-visual";
    visual.append(createSkeleton());

    card.append(heading, accessibleText, visual);
    return card;
  }

  function extractPageText(items) {
    return items
      .map((item) => typeof item.str === "string" ? item.str : "")
      .filter(Boolean)
      .join(" ")
      .replace(/[\t ]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .trim();
  }

  let pdfDocument = null;
  let pageObserver = null;
  let renderCount = 0;
  const renderingPages = new Set();
  const renderTasks = new Map();
  const pageCache = new Map();

  function releasePageCanvas(card) {
    const visual = card.querySelector(".page-visual");
    const canvas = visual && visual.querySelector("canvas");
    if (!canvas) {
      return;
    }

    const pageNumber = Number(card.dataset.pageNumber);
    const task = renderTasks.get(pageNumber);
    if (task && typeof task.cancel === "function") {
      task.cancel();
    }
    renderTasks.delete(pageNumber);
    canvas.width = 0;
    canvas.height = 0;
    visual.replaceChildren(createSkeleton());
    delete card.dataset.rendered;
    delete card.dataset.renderedWidth;
  }

  async function renderPage(card) {
    const pageNumber = Number(card.dataset.pageNumber);
    if (!pdfDocument || !pageNumber || renderingPages.has(pageNumber)) {
      return;
    }

    renderingPages.add(pageNumber);
    card.dataset.rendering = "true";

    try {
      const page = pageCache.get(pageNumber) || await pdfDocument.getPage(pageNumber);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(1, card.clientWidth);
      const scale = availableWidth / unscaledViewport.width;
      const viewport = page.getViewport({ scale });
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { alpha: false });

      if (!context) {
        throw new Error("Canvas is unavailable in this browser.");
      }

      canvas.width = Math.max(1, Math.ceil(viewport.width * outputScale));
      canvas.height = Math.max(1, Math.ceil(viewport.height * outputScale));
      canvas.setAttribute("aria-hidden", "true");
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      card.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
      card.querySelector(".page-visual").replaceChildren(canvas);

      const task = page.render({
        canvasContext: context,
        viewport,
        transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0],
        background: "#fffefa"
      });
      renderTasks.set(pageNumber, task);
      await task.promise;
      renderTasks.delete(pageNumber);
      card.dataset.rendered = "true";
      card.dataset.renderedWidth = String(availableWidth);
      renderCount += 1;

      if (renderCount === 1) {
        readerStatus.hidden = false;
        readerStatus.querySelector(".loading-mark").hidden = true;
        updateLoadingStatus("The first page is ready. Scroll to continue reading.");
      }

      if (pageObserver && card.dataset.nearby !== "true") {
        releasePageCanvas(card);
      }
    } catch (error) {
      if (error && error.name !== "RenderingCancelledException") {
        updateLoadingStatus(`Page ${pageNumber} could not be rendered. Scroll to try again.`);
      }
    } finally {
      renderingPages.delete(pageNumber);
      delete card.dataset.rendering;
    }
  }

  function watchPages() {
    const cards = pdfPages.querySelectorAll(".pdf-page");
    if (!("IntersectionObserver" in window)) {
      cards.forEach((card) => {
        card.dataset.nearby = "true";
        void renderPage(card);
      });
      return;
    }

    pageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const card = entry.target;
        if (entry.isIntersecting) {
          card.dataset.nearby = "true";
          if (card.dataset.rendered !== "true") {
            void renderPage(card);
          }
        } else {
          card.dataset.nearby = "false";
          if (card.dataset.rendered === "true") {
            releasePageCanvas(card);
          }
        }
      });
    }, {
      root: readerScroll,
      rootMargin: "500px 0px"
    });

    cards.forEach((card) => pageObserver.observe(card));
  }

  async function prepareAccessibleText(totalPages) {
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const card = pdfPages.querySelector(`[data-page-number="${pageNumber}"]`);
      const textNode = card.querySelector("[data-page-text]");
      try {
        const page = pageCache.get(pageNumber) || await pdfDocument.getPage(pageNumber);
        pageCache.set(pageNumber, page);
        const content = await page.getTextContent();
        const text = extractPageText(content.items || []);
        textNode.textContent = text || "No selectable text could be extracted from this page.";
      } catch (_error) {
        textNode.textContent = "The text on this page could not be extracted. The original page is shown visually below.";
      }
      updateLoadingStatus(`Preparing accessible reading text… ${pageNumber} of ${totalPages}`);
    }
  }

  async function loadPdf() {
    if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument !== "function") {
      showReaderError("The PDF reader library could not be loaded. Check your connection and reload the page to try again.");
      return;
    }

    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    updateLoadingStatus("Loading Manqoos Moulid…");

    try {
      const loadingTask = window.pdfjsLib.getDocument({ url: PDF_URL });
      loadingTask.onProgress = ({ loaded, total }) => {
        if (total > 0 && loaded < total) {
          const percent = Math.min(99, Math.round((loaded / total) * 100));
          updateLoadingStatus(`Loading the reading pages… ${percent}%`);
        }
      };

      pdfDocument = await loadingTask.promise;
      if (!pdfDocument.numPages) {
        throw new Error("The PDF has no pages.");
      }

      const firstPage = await pdfDocument.getPage(1);
      pageCache.set(1, firstPage);
      const firstSize = firstPage.getViewport({ scale: 1 });
      const pageRatio = `${firstSize.width} / ${firstSize.height}`;
      const fragment = document.createDocumentFragment();

      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        fragment.append(createPageCard(pageNumber, pdfDocument.numPages, pageRatio));
      }

      pdfPages.replaceChildren(fragment);
      readerScroll.hidden = false;
      readerStatus.hidden = false;
      readerStatus.querySelector(".loading-mark").hidden = false;
      pageCount.hidden = false;
      pageCount.textContent = `${pdfDocument.numPages} pages`;
      updateLoadingStatus("Preparing accessible reading text…");

      await prepareAccessibleText(pdfDocument.numPages);
      watchPages();
    } catch (_error) {
      showReaderError("The reading pages could not be loaded. Check your connection and reload the page to try again.");
    }
  }

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      pdfPages.querySelectorAll('.pdf-page[data-rendered="true"]').forEach((card) => {
        const oldWidth = Number(card.dataset.renderedWidth || 0);
        if (Math.abs(card.clientWidth - oldWidth) > 24) {
          delete card.dataset.rendered;
          void renderPage(card);
        }
      });
    }, 220);
  }, { passive: true });

  void loadPdf();
})();
