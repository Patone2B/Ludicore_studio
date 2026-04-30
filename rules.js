// =============================
// INIT
// =============================
document.addEventListener("DOMContentLoaded", () => {
  initRules();
  initLogic();
  initExport();
  initWriterPanel();
});

// =============================
// OUTILS
// =============================
function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textToHTML(value) {
  return escapeHTML(value).replace(/\n/g, "<br>");
}

// =============================
// RÈGLES
// =============================
function initRules() {
  const template = document.getElementById("ruleBlockTemplate");

  document.querySelectorAll(".add-section-block").forEach(btn => {
    btn.addEventListener("click", () => {
      const section = btn.closest(".section-card");
      const list = section.querySelector(".rule-list");
      addRuleBlock(list);
    });
  });

  function addRuleBlock(container) {
    const clone = template.content.cloneNode(true);
    const block = clone.querySelector(".rule-block");

    block.querySelector(".delete-rule").onclick = () => block.remove();

    block.querySelector(".move-up").onclick = () => {
      if (block.previousElementSibling) {
        container.insertBefore(block, block.previousElementSibling);
      }
    };

    block.querySelector(".move-down").onclick = () => {
      if (block.nextElementSibling) {
        container.insertBefore(block.nextElementSibling, block);
      }
    };

    container.appendChild(block);
  }
}

// =============================
// LOGIQUE
// =============================
function initLogic() {
  const flow = document.getElementById("logicFlow");
  const template = document.getElementById("logicBlockTemplate");

  document.getElementById("addConditionBtn").onclick = () => addLogicBlock("condition");
  document.getElementById("addActionBtn").onclick = () => addLogicBlock("action");

  function addLogicBlock(type) {
    const clone = template.content.cloneNode(true);
    const block = clone.querySelector(".logic-block");

    block.classList.add(type);
    block.querySelector(".logic-type-badge").textContent = type === "condition" ? "SI" : "ALORS";

    block.querySelector(".delete-logic").onclick = () => block.remove();

    block.querySelector(".move-up").onclick = () => {
      if (block.previousElementSibling) {
        flow.insertBefore(block, block.previousElementSibling);
      }
    };

    block.querySelector(".move-down").onclick = () => {
      if (block.nextElementSibling) {
        flow.insertBefore(block.nextElementSibling, block);
      }
    };

    flow.appendChild(block);
  }
}

// =============================
// EXPORT PDF
// =============================
function initExport() {
  const pdfBtn = document.getElementById("exportPdfBtn");
  if (!pdfBtn) return;

  pdfBtn.onclick = () => {
    const element = buildExportHTML();
    const renderArea = document.getElementById("pdfRenderArea");

    renderArea.innerHTML = "";
    renderArea.appendChild(element);

    const opt = {
      margin: 12,
      filename: "regles-jeu.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        backgroundColor: "#ffffff"
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] }
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        renderArea.innerHTML = "";
      });
  };
}

// =============================
// BUILD HTML EXPORT
// =============================
function buildExportHTML() {
  const container = document.createElement("div");
  container.className = "pdf-document";
  container.style.cssText = `
    width: 190mm;
    padding: 12mm;
    background: #ffffff;
    color: #111827;
    font-family: Arial, Helvetica, sans-serif;
    line-height: 1.5;
  `;

  const title = document.getElementById("gameTitle").value.trim() || "Règles du jeu";
  const intro = document.getElementById("gameIntro").value.trim();

  container.innerHTML = `
    <style>
      .pdf-document, .pdf-document * {
        color: #111827 !important;
        background-color: transparent !important;
        box-shadow: none !important;
      }
      .pdf-document h1 {
        font-size: 28px;
        margin: 0 0 12px;
        border-bottom: 2px solid #111827;
        padding-bottom: 8px;
      }
      .pdf-document h2 {
        font-size: 20px;
        margin: 24px 0 10px;
        color: #0f172a !important;
      }
      .pdf-document h3 {
        font-size: 16px;
        margin: 14px 0 6px;
      }
      .pdf-document p {
        margin: 0 0 10px;
      }
      .pdf-document .pdf-block {
        border: 1px solid #d1d5db;
        border-radius: 8px;
        padding: 10px;
        margin: 10px 0;
        page-break-inside: avoid;
      }
      .pdf-document .pdf-muted {
        color: #374151 !important;
      }
    </style>
    <h1>${escapeHTML(title)}</h1>
    ${intro ? `<p class="pdf-muted">${textToHTML(intro)}</p>` : ""}
  `;

  const sections = [
    ["setup", "Mise en place"],
    ["turn", "Tour de jeu"],
    ["victory", "Victoire"]
  ];

  sections.forEach(([sectionId, label]) => {
    const list = document.getElementById(sectionId + "List");
    container.innerHTML += `<h2>${label}</h2>`;

    const blocks = list.querySelectorAll(".rule-block");
    if (!blocks.length) {
      container.innerHTML += `<p class="pdf-muted">Aucune règle ajoutée.</p>`;
      return;
    }

    blocks.forEach(block => {
      const t = block.querySelector(".rule-title").value.trim() || "Bloc de règle";
      const txt = block.querySelector(".rule-text").value.trim();
      const card = block.querySelector(".rule-card-link").value.trim();
      const board = block.querySelector(".rule-board-link").value.trim();

      container.innerHTML += `
        <div class="pdf-block">
          <h3>${escapeHTML(t)}</h3>
          ${txt ? `<p>${textToHTML(txt)}</p>` : ""}
          ${card ? `<p><strong>Carte liée :</strong> ${escapeHTML(card)}</p>` : ""}
          ${board ? `<p><strong>Plateau lié :</strong> ${escapeHTML(board)}</p>` : ""}
        </div>
      `;
    });
  });

  const logic = document.getElementById("logicFlow");
  container.innerHTML += `<h2>Logique simple</h2>`;

  const logicBlocks = logic.querySelectorAll(".logic-block");
  if (!logicBlocks.length) {
    container.innerHTML += `<p class="pdf-muted">Aucune logique ajoutée.</p>`;
  } else {
    logicBlocks.forEach(block => {
      const type = block.classList.contains("condition") ? "SI" : "ALORS";
      const txt = block.querySelector(".logic-text").value.trim();
      const detail = block.querySelector(".logic-detail").value.trim();

      container.innerHTML += `
        <div class="pdf-block">
          <p><strong>${type}</strong> ${escapeHTML(txt || "Bloc logique")}</p>
          ${detail ? `<p>${textToHTML(detail)}</p>` : ""}
        </div>
      `;
    });
  }

  const writerPanel = document.getElementById("writerPanel");
  const notes = document.getElementById("writerEditor");
  if (writerPanel && notes && !writerPanel.hidden && notes.innerText.trim()) {
    container.innerHTML += `<h2>Notes de rédaction</h2><div class="pdf-block">${notes.innerHTML}</div>`;
  }

  return container;
}

// =============================
// ÉDITEUR DE NOTES INTÉGRÉ
// =============================
function initWriterPanel() {
  const toggleBtn = document.getElementById("toggleWriterBtn");
  const writerPanel = document.getElementById("writerPanel");
  const editor = document.getElementById("writerEditor");

  if (!toggleBtn || !writerPanel || !editor) return;

  toggleBtn.addEventListener("click", () => {
    writerPanel.hidden = !writerPanel.hidden;
    toggleBtn.setAttribute("aria-expanded", String(!writerPanel.hidden));
    toggleBtn.textContent = writerPanel.hidden ? "Ouvrir l’éditeur de notes" : "Fermer l’éditeur de notes";
  });

  document.querySelectorAll(".mini-tool[data-cmd]").forEach(btn => {
    btn.addEventListener("click", () => {
      editor.focus();
      document.execCommand(btn.dataset.cmd, false, null);
    });
  });

  document.querySelectorAll(".mini-tool[data-block]").forEach(btn => {
    btn.addEventListener("click", () => {
      editor.focus();
      document.execCommand("formatBlock", false, btn.dataset.block);
    });
  });

  const undoBtn = document.getElementById("undoWriterBtn");
  const redoBtn = document.getElementById("redoWriterBtn");
  const clearBtn = document.getElementById("clearWriterBtn");

  if (undoBtn) undoBtn.onclick = () => document.execCommand("undo", false, null);
  if (redoBtn) redoBtn.onclick = () => document.execCommand("redo", false, null);
  if (clearBtn) clearBtn.onclick = () => document.execCommand("removeFormat", false, null);
}
