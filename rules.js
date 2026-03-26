const setupList = document.getElementById("setupList");
const turnList = document.getElementById("turnList");
const victoryList = document.getElementById("victoryList");
const logicFlow = document.getElementById("logicFlow");

const gameTitle = document.getElementById("gameTitle");
const gameIntro = document.getElementById("gameIntro");
const exportOutput = document.getElementById("exportOutput");

const ruleTemplate = document.getElementById("ruleBlockTemplate");
const logicTemplate = document.getElementById("logicBlockTemplate");

const addRuleBlockBtn = document.getElementById("addRuleBlockBtn");
const addConditionBtn = document.getElementById("addConditionBtn");
const addActionBtn = document.getElementById("addActionBtn");
const exportBtn = document.getElementById("exportBtn");
const copyExportBtn = document.getElementById("copyExportBtn");
const resetBtn = document.getElementById("resetBtn");

function createRuleBlock(section, values = {}) {
  const node = ruleTemplate.content.firstElementChild.cloneNode(true);

  node.dataset.section = section;
  node.querySelector(".rule-title").value = values.title || "";
  node.querySelector(".rule-text").value = values.text || "";
  node.querySelector(".rule-card-link").value = values.card || "";
  node.querySelector(".rule-board-link").value = values.board || "";

  bindCommonMoveDelete(node, "rule");
  bindAutoExport(node);

  return node;
}

function createLogicBlock(type, values = {}) {
  const node = logicTemplate.content.firstElementChild.cloneNode(true);
  node.classList.add(type);
  node.dataset.type = type;

  const badge = node.querySelector(".logic-type-badge");
  badge.textContent = type === "condition" ? "Si" : "Alors";

  node.querySelector(".logic-text").value = values.text || "";
  node.querySelector(".logic-detail").value = values.detail || "";

  bindCommonMoveDelete(node, "logic");
  bindAutoExport(node);

  return node;
}

function bindCommonMoveDelete(node, kind) {
  const moveUpBtn = node.querySelector(".move-up");
  const moveDownBtn = node.querySelector(".move-down");

  moveUpBtn.addEventListener("click", () => {
    const prev = node.previousElementSibling;
    if (prev) {
      node.parentElement.insertBefore(node, prev);
      updateExport();
      updateEmptyStates();
    }
  });

  moveDownBtn.addEventListener("click", () => {
    const next = node.nextElementSibling;
    if (next) {
      node.parentElement.insertBefore(next, node);
      updateExport();
      updateEmptyStates();
    }
  });

  if (kind === "rule") {
    node.querySelector(".delete-rule").addEventListener("click", () => {
      node.remove();
      updateExport();
      updateEmptyStates();
    });
  }

  if (kind === "logic") {
    node.querySelector(".delete-logic").addEventListener("click", () => {
      node.remove();
      updateExport();
      updateEmptyStates();
    });
  }
}

function bindAutoExport(container) {
  const fields = container.querySelectorAll("input, textarea");
  fields.forEach((field) => {
    field.addEventListener("input", updateExport);
  });
}

function getSectionContainer(section) {
  if (section === "setup") return setupList;
  if (section === "turn") return turnList;
  return victoryList;
}

function addRuleToSection(section, values = {}) {
  const container = getSectionContainer(section);
  container.appendChild(createRuleBlock(section, values));
  updateExport();
  updateEmptyStates();
}

function addLogic(type, values = {}) {
  logicFlow.appendChild(createLogicBlock(type, values));
  updateExport();
  updateEmptyStates();
}

function collectRulesFromContainer(container) {
  return [...container.querySelectorAll(".rule-block")].map((block) => ({
    title: block.querySelector(".rule-title").value.trim(),
    text: block.querySelector(".rule-text").value.trim(),
    card: block.querySelector(".rule-card-link").value.trim(),
    board: block.querySelector(".rule-board-link").value.trim()
  }));
}

function collectLogic() {
  return [...logicFlow.querySelectorAll(".logic-block")].map((block) => ({
    type: block.dataset.type,
    text: block.querySelector(".logic-text").value.trim(),
    detail: block.querySelector(".logic-detail").value.trim()
  }));
}

function formatRuleSection(title, rules) {
  let output = `=== ${title.toUpperCase()} ===\n`;

  if (!rules.length) {
    output += "Aucune règle dans cette section.\n";
    return output;
  }

  rules.forEach((rule, index) => {
    output += `\n${index + 1}. ${rule.title || "Bloc sans titre"}\n`;

    if (rule.text) {
      output += `${rule.text}\n`;
    }

    if (rule.card) {
      output += `Carte liée : ${rule.card}\n`;
    }

    if (rule.board) {
      output += `Plateau lié : ${rule.board}\n`;
    }
  });

  return output;
}

function formatLogic(logicBlocks) {
  let output = `=== LOGIQUE SIMPLE ===\n`;

  if (!logicBlocks.length) {
    output += "Aucune logique définie.\n";
    return output;
  }

  logicBlocks.forEach((block, index) => {
    const typeLabel = block.type === "condition" ? "SI" : "ALORS";
    output += `\n${index + 1}. ${typeLabel} : ${block.text || "Bloc sans texte"}\n`;

    if (block.detail) {
      output += `${block.detail}\n`;
    }
  });

  return output;
}

function updateExport() {
  const title = gameTitle.value.trim() || "Jeu sans titre";
  const intro = gameIntro.value.trim();

  const setupRules = collectRulesFromContainer(setupList);
  const turnRules = collectRulesFromContainer(turnList);
  const victoryRules = collectRulesFromContainer(victoryList);
  const logicBlocks = collectLogic();

  let output = `# ${title}\n\n`;

  if (intro) {
    output += `${intro}\n\n`;
  }

  output += formatRuleSection("Mise en place", setupRules);
  output += `\n`;
  output += formatRuleSection("Tour de jeu", turnRules);
  output += `\n`;
  output += formatRuleSection("Victoire", victoryRules);
  output += `\n`;
  output += formatLogic(logicBlocks);

  exportOutput.value = output;
}

function addEmptyState(container, text) {
  if (container.querySelector(".empty-state")) return;

  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = text;
  container.appendChild(empty);
}

function removeEmptyState(container) {
  const empty = container.querySelector(".empty-state");
  if (empty) empty.remove();
}

function updateEmptyStates() {
  const lists = [
    {
      container: setupList,
      selector: ".rule-block",
      text: "Aucun bloc dans Mise en place."
    },
    {
      container: turnList,
      selector: ".rule-block",
      text: "Aucun bloc dans Tour de jeu."
    },
    {
      container: victoryList,
      selector: ".rule-block",
      text: "Aucun bloc dans Victoire."
    },
    {
      container: logicFlow,
      selector: ".logic-block",
      text: "Ajoute un bloc “Si” ou “Alors”."
    }
  ];

  lists.forEach((item) => {
    const hasItems = item.container.querySelector(item.selector);
    if (hasItems) {
      removeEmptyState(item.container);
    } else {
      addEmptyState(item.container, item.text);
    }
  });
}

function copyExportText() {
  exportOutput.select();
  exportOutput.setSelectionRange(0, exportOutput.value.length);
  navigator.clipboard.writeText(exportOutput.value)
    .then(() => {
      copyExportBtn.textContent = "Copié";
      setTimeout(() => {
        copyExportBtn.textContent = "Copier le texte";
      }, 1400);
    })
    .catch(() => {
      alert("Impossible de copier automatiquement. Copie le texte manuellement.");
    });
}

function resetEditor() {
  gameTitle.value = "";
  gameIntro.value = "";

  setupList.innerHTML = "";
  turnList.innerHTML = "";
  victoryList.innerHTML = "";
  logicFlow.innerHTML = "";

  loadDefaultContent();
  updateExport();
  updateEmptyStates();
}

function loadDefaultContent() {
  addRuleToSection("setup", {
    title: "Préparer le plateau",
    text: "Place le plateau au centre de la table et mélange les cartes nécessaires.",
    card: "Cartes Terrain",
    board: "Plateau principal"
  });

  addRuleToSection("turn", {
    title: "Déroulement du tour",
    text: "Le joueur actif pioche une carte, se déplace puis résout son action.",
    card: "Carte Action",
    board: "Cases de déplacement"
  });

  addRuleToSection("victory", {
    title: "Condition de victoire",
    text: "La partie se termine lorsqu’un joueur atteint l’objectif final ou que le boss est vaincu.",
    card: "Carte Boss",
    board: "Zone finale"
  });

  addLogic("condition", {
    text: "Un joueur meurt",
    detail: "Ses points de vie tombent à 0 ou moins."
  });

  addLogic("action", {
    text: "Retirer ses cartes actives",
    detail: "Défausser les cartes équipées et ses effets temporaires."
  });

  addLogic("action", {
    text: "Vérifier la fin de partie",
    detail: "Si tous les joueurs sont éliminés, la partie est perdue."
  });
}

document.querySelectorAll(".add-section-block").forEach((button) => {
  button.addEventListener("click", () => {
    const section = button.closest(".section-card").dataset.section;
    addRuleToSection(section);
  });
});

addRuleBlockBtn.addEventListener("click", () => addRuleToSection("turn"));
addConditionBtn.addEventListener("click", () => addLogic("condition"));
addActionBtn.addEventListener("click", () => addLogic("action"));
exportBtn.addEventListener("click", updateExport);
copyExportBtn.addEventListener("click", copyExportText);
resetBtn.addEventListener("click", resetEditor);

gameTitle.addEventListener("input", updateExport);
gameIntro.addEventListener("input", updateExport);

loadDefaultContent();
updateExport();
updateEmptyStates();
function exportJSON() {
  const data = {
    title: gameTitle.value,
    intro: gameIntro.value,
    setup: collectRulesFromContainer(setupList),
    turn: collectRulesFromContainer(turnList),
    victory: collectRulesFromContainer(victoryList),
    logic: collectLogic()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "regles-jeu.json";
  a.click();

  URL.revokeObjectURL(url);
}

function importJSON(file) {
  const reader = new FileReader();

  reader.onload = function (e) {
    const data = JSON.parse(e.target.result);

    resetEditor();

    gameTitle.value = data.title || "";
    gameIntro.value = data.intro || "";

    data.setup?.forEach(r => addRuleToSection("setup", r));
    data.turn?.forEach(r => addRuleToSection("turn", r));
    data.victory?.forEach(r => addRuleToSection("victory", r));
    data.logic?.forEach(l => addLogic(l.type, l));

    updateExport();
  };

  reader.readAsText(file);
}

document.getElementById("exportJsonBtn").addEventListener("click", exportJSON);

document.getElementById("importJsonBtn").addEventListener("click", () => {
  document.getElementById("importJsonFile").click();
});

document.getElementById("importJsonFile").addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    importJSON(e.target.files[0]);
  }
});

<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<button id="exportPdfBtn" class="btn btn-primary">Exporter PDF</button>
function exportPDF() {
  const element = document.createElement("div");
  element.style.padding = "20px";
  element.style.background = "white";
  element.style.color = "black";

  element.innerText = exportOutput.value;

  html2pdf()
    .set({
      margin: 10,
      filename: "regles-jeu.pdf",
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    })
    .from(element)
    .save();
}
document.getElementById("exportPdfBtn").addEventListener("click", exportPDF);
