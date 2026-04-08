// =============================
// INIT
// =============================
document.addEventListener("DOMContentLoaded", () => {
  initRules();
  initLogic();
  initExport();
  initMiniEditor();
});

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

    // supprimer
    block.querySelector(".delete-rule").onclick = () => block.remove();

    // monter
    block.querySelector(".move-up").onclick = () => {
      if (block.previousElementSibling) {
        container.insertBefore(block, block.previousElementSibling);
      }
    };

    // descendre
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

  document.getElementById("addConditionBtn").onclick = () => {
    addLogicBlock("condition");
  };

  document.getElementById("addActionBtn").onclick = () => {
    addLogicBlock("action");
  };

  function addLogicBlock(type) {
    const clone = template.content.cloneNode(true);
    const block = clone.querySelector(".logic-block");

    block.classList.add(type);
    block.querySelector(".logic-type-badge").textContent =
      type === "condition" ? "SI" : "ALORS";

    // delete
    block.querySelector(".delete-logic").onclick = () => block.remove();

    // move up
    block.querySelector(".move-up").onclick = () => {
      if (block.previousElementSibling) {
        flow.insertBefore(block, block.previousElementSibling);
      }
    };

    // move down
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
  document.getElementById("exportPdfBtn").onclick = () => {
    const element = buildExportHTML();

    const opt = {
      margin: 10,
      filename: "regles-jeu.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

    html2pdf().set(opt).from(element).save();
  };
}

// =============================
// BUILD HTML EXPORT
// =============================
function buildExportHTML() {
  const container = document.createElement("div");

  const title = document.getElementById("gameTitle").value;
  const intro = document.getElementById("gameIntro").value;

  container.innerHTML += `<h1>${title}</h1>`;
  container.innerHTML += `<p>${intro}</p>`;

  ["setup", "turn", "victory"].forEach(sectionId => {
    const list = document.getElementById(sectionId + "List");
    container.innerHTML += `<h2>${sectionId.toUpperCase()}</h2>`;

    list.querySelectorAll(".rule-block").forEach(block => {
      const t = block.querySelector(".rule-title").value;
      const txt = block.querySelector(".rule-text").value;

      container.innerHTML += `<h3>${t}</h3><p>${txt}</p>`;
    });
  });

  // LOGIQUE
  const logic = document.getElementById("logicFlow");
  container.innerHTML += `<h2>LOGIQUE</h2>`;

  logic.querySelectorAll(".logic-block").forEach(block => {
    const txt = block.querySelector(".logic-text").value;
    const detail = block.querySelector(".logic-detail").value;

    container.innerHTML += `<p><strong>${txt}</strong> : ${detail}</p>`;
  });

  // NOTES (mini éditeur)
  const notes = document.getElementById("miniEditorContent");
  if (notes) {
    container.innerHTML += `<h2>NOTES</h2>`;
    container.innerHTML += `<div>${notes.innerHTML}</div>`;
  }

  return container;
}

// =============================
// MINI ÉDITEUR (type Word)
// =============================
function initMiniEditor() {
  const btn = document.createElement("button");
  btn.textContent = "Ouvrir l’éditeur de notes";
  btn.className = "btn btn-secondary";
  btn.style.margin = "20px";
  document.body.appendChild(btn);

  const editor = document.createElement("div");
  editor.style.display = "none";
  editor.innerHTML = `
    <div style="background:#111;padding:10px;border-top:1px solid #333;">
      <div id="toolbar">
        <button onclick="exec('bold')">B</button>
        <button onclick="exec('italic')">I</button>
        <button onclick="exec('underline')">U</button>
        <button onclick="exec('insertUnorderedList')">•</button>
        <button onclick="exec('justifyLeft')">⬅</button>
        <button onclick="exec('justifyCenter')">⬍</button>
        <button onclick="exec('justifyRight')">➡</button>
        <button onclick="exec('undo')">↶</button>
        <button onclick="exec('redo')">↷</button>
        <button onclick="exec('removeFormat')">✖</button>
      </div>
      <div id="miniEditorContent" contenteditable="true"
        style="min-height:200px;background:#fff;color:#000;padding:10px;">
      </div>
    </div>
  `;

  document.body.appendChild(editor);

  btn.onclick = () => {
    editor.style.display = editor.style.display === "none" ? "block" : "none";
  };
}

// =============================
// COMMANDES ÉDITEUR
// =============================
function exec(cmd) {
  document.execCommand(cmd, false, null);
}
