const STAGE_WIDTH = 1400;
const STAGE_HEIGHT = 850;

const stage = new Konva.Stage({
  container: "stageContainer",
  width: STAGE_WIDTH,
  height: STAGE_HEIGHT
});

const backgroundLayer = new Konva.Layer();
const gridLayer = new Konva.Layer();
const zonesLayer = new Konva.Layer();
const uiLayer = new Konva.Layer();

stage.add(backgroundLayer);
stage.add(gridLayer);
stage.add(zonesLayer);
stage.add(uiLayer);

let selectedNode = null;
let backgroundImageNode = null;
let currentBackgroundSrc = null;
let zoneIdCounter = 1;

const transformer = new Konva.Transformer({
  rotateEnabled: false,
  anchorSize: 10,
  borderStroke: "#2563eb",
  anchorStroke: "#1d4ed8",
  anchorFill: "#ffffff",
  anchorCornerRadius: 4,
  anchorStrokeWidth: 2,
  keepRatio: false,
  enabledAnchors: [
    "top-left",
    "top-center",
    "top-right",
    "middle-left",
    "middle-right",
    "bottom-left",
    "bottom-center",
    "bottom-right"
  ]
});

uiLayer.add(transformer);
uiLayer.draw();

const gridTypeInput = document.getElementById("gridType");
const gridSizeInput = document.getElementById("gridSize");
const showGridInput = document.getElementById("showGrid");
const snapToGridInput = document.getElementById("snapToGrid");
const applyGridBtn = document.getElementById("applyGridBtn");
const gridSizeValue = document.getElementById("gridSizeValue");

const bgUpload = document.getElementById("bgUpload");
const bgUrl = document.getElementById("bgUrl");
const loadBgUrlBtn = document.getElementById("loadBgUrlBtn");
const clearBgBtn = document.getElementById("clearBgBtn");

const zoneNameInput = document.getElementById("zoneName");
const zoneTypeInput = document.getElementById("zoneType");
const addRectZoneBtn = document.getElementById("addRectZoneBtn");
const addCircleZoneBtn = document.getElementById("addCircleZoneBtn");

const selectionEmpty = document.getElementById("selectionEmpty");
const selectionEditor = document.getElementById("selectionEditor");
const selectedZoneNameInput = document.getElementById("selectedZoneName");
const selectedZoneTypeInput = document.getElementById("selectedZoneType");
const selectedZoneShapeInput = document.getElementById("selectedZoneShape");

const duplicateSelectedBtn = document.getElementById("duplicateSelectedBtn");
const bringForwardBtn = document.getElementById("bringForwardBtn");
const sendBackwardBtn = document.getElementById("sendBackwardBtn");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");

const saveProjectBtn = document.getElementById("saveProjectBtn");
const loadProjectInput = document.getElementById("loadProjectInput");
const exportBtn = document.getElementById("exportBtn");

const zoneStyles = {
  combat: {
    fill: "rgba(220, 38, 38, 0.22)",
    stroke: "#b91c1c",
    pill: "#7f1d1d",
    label: "Combat"
  },
  draw: {
    fill: "rgba(37, 99, 235, 0.20)",
    stroke: "#1d4ed8",
    pill: "#1e3a8a",
    label: "Pioche"
  },
  objective: {
    fill: "rgba(22, 163, 74, 0.20)",
    stroke: "#15803d",
    pill: "#166534",
    label: "Objectif"
  },
  spawn: {
    fill: "rgba(124, 58, 237, 0.20)",
    stroke: "#7c3aed",
    pill: "#5b21b6",
    label: "Apparition"
  },
  danger: {
    fill: "rgba(245, 158, 11, 0.22)",
    stroke: "#d97706",
    pill: "#92400e",
    label: "Danger"
  },
  custom: {
    fill: "rgba(100, 116, 139, 0.20)",
    stroke: "#475569",
    pill: "#334155",
    label: "Personnalisée"
  }
};

function getGridSettings() {
  return {
    type: gridTypeInput.value,
    size: parseInt(gridSizeInput.value, 10),
    show: showGridInput.checked,
    snap: snapToGridInput.checked
  };
}

function updateGridSizeLabel() {
  gridSizeValue.textContent = `${gridSizeInput.value} px`;
}

function clearSelection() {
  selectedNode = null;
  transformer.nodes([]);
  updateSelectionPanel();
  uiLayer.draw();
}

function selectNode(node) {
  selectedNode = node;
  transformer.nodes([node]);
  updateSelectionPanel();
  uiLayer.draw();
}

function updateSelectionPanel() {
  if (!selectedNode) {
    selectionEmpty.classList.remove("hidden");
    selectionEditor.classList.add("hidden");
    selectedZoneNameInput.value = "";
    selectedZoneTypeInput.value = "combat";
    selectedZoneShapeInput.value = "";
    return;
  }

  selectionEmpty.classList.add("hidden");
  selectionEditor.classList.remove("hidden");
  selectedZoneNameInput.value = selectedNode.getAttr("zoneName") || "";
  selectedZoneTypeInput.value = selectedNode.getAttr("zoneType") || "custom";
  selectedZoneShapeInput.value = selectedNode.getAttr("zoneShape") || "";
}

function makeSelectable(node) {
  node.on("click tap", (e) => {
    e.cancelBubble = true;
    selectNode(node);
  });

  node.on("dragstart transformstart", () => {
    selectNode(node);
  });

  node.on("dragmove", () => {
    applySnapToNode(node);
  });

  node.on("dragend", () => {
    applySnapToNode(node, true);
  });

  node.on("transformend", () => {
    normalizeGroupChildren(node);
    applySnapToNode(node, true);
  });
}

function snapValue(value, step) {
  return Math.round(value / step) * step;
}

function applySnapToNode(node, forceDraw = false) {
  const settings = getGridSettings();

  if (!settings.snap || settings.type === "free") {
    return;
  }

  if (settings.type === "square") {
    node.x(snapValue(node.x(), settings.size));
    node.y(snapValue(node.y(), settings.size));
  }

  if (settings.type === "hex") {
    const stepX = Math.max(20, Math.round((Math.sqrt(3) * (settings.size / 2))));
    const stepY = Math.max(20, Math.round((2 * (settings.size / 2)) * 0.75));
    node.x(snapValue(node.x(), stepX));
    node.y(snapValue(node.y(), stepY));
  }

  if (forceDraw) {
    zonesLayer.draw();
  }
}

function normalizeGroupChildren(group) {
  if (!(group instanceof Konva.Group)) return;

  const scaleX = group.scaleX();
  const scaleY = group.scaleY();

  if (scaleX === 1 && scaleY === 1) return;

  const shapeType = group.getAttr("zoneShape");
  const frame = group.findOne(".zone-frame");
  const nameText = group.findOne(".zone-name");
  const badgeText = group.findOne(".zone-badge");

  if (frame && shapeType === "rect") {
    frame.width(Math.max(80, frame.width() * scaleX));
    frame.height(Math.max(60, frame.height() * scaleY));
  }

  if (frame && shapeType === "circle") {
    const avgScale = (scaleX + scaleY) / 2;
    frame.radius(Math.max(30, frame.radius() * avgScale));
  }

  if (nameText) {
    nameText.fontSize(Math.max(12, nameText.fontSize() * Math.min(scaleX, scaleY)));
  }

  if (badgeText) {
    badgeText.fontSize(Math.max(10, badgeText.fontSize() * Math.min(scaleX, scaleY)));
  }

  relayoutZone(group);

  group.scale({ x: 1, y: 1 });
  zonesLayer.draw();
}

function drawGrid() {
  gridLayer.destroyChildren();

  const { type, size, show } = getGridSettings();

  if (!show || type === "free") {
    gridLayer.draw();
    return;
  }

  if (type === "square") {
    for (let x = 0; x <= STAGE_WIDTH; x += size) {
      gridLayer.add(new Konva.Line({
        points: [x, 0, x, STAGE_HEIGHT],
        stroke: "rgba(15, 23, 42, 0.14)",
        strokeWidth: 1
      }));
    }

    for (let y = 0; y <= STAGE_HEIGHT; y += size) {
      gridLayer.add(new Konva.Line({
        points: [0, y, STAGE_WIDTH, y],
        stroke: "rgba(15, 23, 42, 0.14)",
        strokeWidth: 1
      }));
    }
  }

  if (type === "hex") {
    const hexRadius = size / 2;
    const hexWidth = Math.sqrt(3) * hexRadius;
    const hexHeight = 2 * hexRadius;
    const verticalSpacing = hexHeight * 0.75;

    for (let row = 0; row < STAGE_HEIGHT / verticalSpacing + 2; row++) {
      for (let col = 0; col < STAGE_WIDTH / hexWidth + 2; col++) {
        const offsetX = row % 2 ? hexWidth / 2 : 0;
        const x = col * hexWidth + offsetX;
        const y = row * verticalSpacing;

        const points = [];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 180) * (60 * i - 30);
          points.push(x + hexRadius * Math.cos(angle));
          points.push(y + hexRadius * Math.sin(angle));
        }

        gridLayer.add(new Konva.Line({
          points,
          closed: true,
          stroke: "rgba(15, 23, 42, 0.14)",
          strokeWidth: 1
        }));
      }
    }
  }

  gridLayer.draw();
}

function addBackgroundImage(src) {
  const imageObj = new Image();
  imageObj.crossOrigin = "anonymous";

  imageObj.onload = () => {
    if (backgroundImageNode) {
      backgroundImageNode.destroy();
      backgroundImageNode = null;
    }

    currentBackgroundSrc = src;

    const scale = Math.max(STAGE_WIDTH / imageObj.width, STAGE_HEIGHT / imageObj.height);
    const width = imageObj.width * scale;
    const height = imageObj.height * scale;
    const x = (STAGE_WIDTH - width) / 2;
    const y = (STAGE_HEIGHT - height) / 2;

    backgroundImageNode = new Konva.Image({
      image: imageObj,
      x,
      y,
      width,
      height,
      listening: false
    });

    backgroundLayer.add(backgroundImageNode);
    backgroundLayer.draw();
  };

  imageObj.src = src;
}

function getZoneStyle(type) {
  return zoneStyles[type] || zoneStyles.custom;
}

function createZoneGroup(config) {
  const {
    zoneName = "Nouvelle zone",
    zoneType = "custom",
    zoneShape = "rect",
    x = 180,
    y = 140,
    width = 240,
    height = 150,
    radius = 90
  } = config;

  const style = getZoneStyle(zoneType);

  const group = new Konva.Group({
    x,
    y,
    draggable: true,
    name: "smart-zone"
  });

  group.setAttr("zoneId", config.zoneId || `zone-${zoneIdCounter++}`);
  group.setAttr("zoneName", zoneName);
  group.setAttr("zoneType", zoneType);
  group.setAttr("zoneShape", zoneShape);

  let frame;

  if (zoneShape === "rect") {
    frame = new Konva.Rect({
      width,
      height,
      fill: style.fill,
      stroke: style.stroke,
      strokeWidth: 3,
      cornerRadius: 18,
      shadowColor: "rgba(15, 23, 42, 0.14)",
      shadowBlur: 12,
      shadowOffsetY: 4,
      name: "zone-frame"
    });
  } else {
    frame = new Konva.Circle({
      radius,
      fill: style.fill,
      stroke: style.stroke,
      strokeWidth: 3,
      shadowColor: "rgba(15, 23, 42, 0.14)",
      shadowBlur: 12,
      shadowOffsetY: 4,
      name: "zone-frame"
    });
  }

  const nameText = new Konva.Text({
    text: zoneName,
    fontSize: 18,
    fontFamily: "Inter",
    fontStyle: "700",
    fill: "#0f172a",
    align: "center",
    name: "zone-name"
  });

  const badgeText = new Konva.Text({
    text: style.label.toUpperCase(),
    fontSize: 12,
    fontFamily: "Inter",
    fontStyle: "700",
    fill: style.pill,
    align: "center",
    name: "zone-badge"
  });

  group.add(frame);
  group.add(nameText);
  group.add(badgeText);

  relayoutZone(group);
  makeSelectable(group);
  zonesLayer.add(group);
  applySnapToNode(group, true);

  return group;
}

function relayoutZone(group) {
  const frame = group.findOne(".zone-frame");
  const nameText = group.findOne(".zone-name");
  const badgeText = group.findOne(".zone-badge");
  const zoneShape = group.getAttr("zoneShape");

  if (!frame || !nameText || !badgeText) return;

  const zoneType = group.getAttr("zoneType");
  const zoneName = group.getAttr("zoneName");
  const style = getZoneStyle(zoneType);

  nameText.text(zoneName);
  badgeText.text(style.label.toUpperCase());

  if (zoneShape === "rect") {
    const width = frame.width();
    const height = frame.height();

    frame.fill(style.fill);
    frame.stroke(style.stroke);

    nameText.width(Math.max(80, width - 24));
    nameText.x(12);
    nameText.y(Math.max(14, height / 2 - 26));
    nameText.align("center");

    badgeText.width(Math.max(80, width - 24));
    badgeText.x(12);
    badgeText.y(nameText.y() + 28);
    badgeText.align("center");
    badgeText.fill(style.pill);
  }

  if (zoneShape === "circle") {
    const radius = frame.radius();
    const diameter = radius * 2;

    frame.fill(style.fill);
    frame.stroke(style.stroke);

    nameText.width(diameter - 24);
    nameText.x(-radius + 12);
    nameText.y(-10);
    nameText.align("center");

    badgeText.width(diameter - 24);
    badgeText.x(-radius + 12);
    badgeText.y(18);
    badgeText.align("center");
    badgeText.fill(style.pill);
  }

  zonesLayer.draw();
}

function createRectZone() {
  const zoneName = zoneNameInput.value.trim() || "Nouvelle zone";
  const zoneType = zoneTypeInput.value;

  const group = createZoneGroup({
    zoneName,
    zoneType,
    zoneShape: "rect",
    x: 180,
    y: 140,
    width: 240,
    height: 150
  });

  selectNode(group);
}

function createCircleZone() {
  const zoneName = zoneNameInput.value.trim() || "Nouvelle zone";
  const zoneType = zoneTypeInput.value;

  const group = createZoneGroup({
    zoneName,
    zoneType,
    zoneShape: "circle",
    x: 360,
    y: 260,
    radius: 90
  });

  selectNode(group);
}

function updateSelectedZoneFromInputs() {
  if (!selectedNode) return;

  selectedNode.setAttr("zoneName", selectedZoneNameInput.value.trim() || "Nouvelle zone");
  selectedNode.setAttr("zoneType", selectedZoneTypeInput.value);

  relayoutZone(selectedNode);
  updateSelectionPanel();
}

function duplicateSelectedZone() {
  if (!selectedNode) return;

  const zoneShape = selectedNode.getAttr("zoneShape");
  const frame = selectedNode.findOne(".zone-frame");

  const config = {
    zoneName: `${selectedNode.getAttr("zoneName")} copie`,
    zoneType: selectedNode.getAttr("zoneType"),
    zoneShape,
    x: selectedNode.x() + 40,
    y: selectedNode.y() + 40
  };

  if (zoneShape === "rect") {
    config.width = frame.width();
    config.height = frame.height();
  } else {
    config.radius = frame.radius();
  }

  const copy = createZoneGroup(config);
  selectNode(copy);
}

function deleteSelectedZone() {
  if (!selectedNode) return;
  selectedNode.destroy();
  clearSelection();
  zonesLayer.draw();
}

function moveSelectedForward() {
  if (!selectedNode) return;
  selectedNode.moveUp();
  zonesLayer.draw();
  uiLayer.draw();
}

function moveSelectedBackward() {
  if (!selectedNode) return;
  selectedNode.moveDown();
  zonesLayer.draw();
  uiLayer.draw();
}

function serializeZones() {
  return zonesLayer
    .getChildren(node => node instanceof Konva.Group)
    .map(group => {
      const frame = group.findOne(".zone-frame");
      const shape = group.getAttr("zoneShape");

      const base = {
        zoneId: group.getAttr("zoneId"),
        zoneName: group.getAttr("zoneName"),
        zoneType: group.getAttr("zoneType"),
        zoneShape: shape,
        x: group.x(),
        y: group.y()
      };

      if (shape === "rect") {
        base.width = frame.width();
        base.height = frame.height();
      } else {
        base.radius = frame.radius();
      }

      return base;
    });
}

function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function saveProject() {
  const payload = {
    version: 1,
    stage: {
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT
    },
    grid: getGridSettings(),
    background: currentBackgroundSrc,
    zones: serializeZones()
  };

  downloadJSON("plateau-projet.json", payload);
}

function clearAllZones() {
  zonesLayer.destroyChildren();
  clearSelection();
  zonesLayer.draw();
}

function loadProject(project) {
  if (!project || typeof project !== "object") {
    alert("Fichier JSON invalide.");
    return;
  }

  clearAllZones();

  if (project.grid) {
    if (project.grid.type) gridTypeInput.value = project.grid.type;
    if (typeof project.grid.size === "number") gridSizeInput.value = String(project.grid.size);
    if (typeof project.grid.show === "boolean") showGridInput.checked = project.grid.show;
    if (typeof project.grid.snap === "boolean") snapToGridInput.checked = project.grid.snap;
    updateGridSizeLabel();
    drawGrid();
  }

  if (project.background) {
    addBackgroundImage(project.background);
  } else {
    if (backgroundImageNode) {
      backgroundImageNode.destroy();
      backgroundImageNode = null;
    }
    currentBackgroundSrc = null;
    backgroundLayer.draw();
  }

  if (Array.isArray(project.zones)) {
    project.zones.forEach(zone => {
      createZoneGroup(zone);
    });
    zonesLayer.draw();
  }

  clearSelection();
}

function exportPNG() {
  clearSelection();

  const dataURL = stage.toDataURL({
    pixelRatio: 2
  });

  const link = document.createElement("a");
  link.href = dataURL;
  link.download = "plateau.png";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

stage.on("click tap", (e) => {
  if (e.target === stage) {
    clearSelection();
  }
});

applyGridBtn.addEventListener("click", drawGrid);

gridSizeInput.addEventListener("input", () => {
  updateGridSizeLabel();
});

bgUpload.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => addBackgroundImage(e.target.result);
  reader.readAsDataURL(file);
});

loadBgUrlBtn.addEventListener("click", () => {
  const url = bgUrl.value.trim();
  if (!url) return;
  addBackgroundImage(url);
});

clearBgBtn.addEventListener("click", () => {
  if (backgroundImageNode) {
    backgroundImageNode.destroy();
    backgroundImageNode = null;
  }
  currentBackgroundSrc = null;
  backgroundLayer.draw();
});

addRectZoneBtn.addEventListener("click", createRectZone);
addCircleZoneBtn.addEventListener("click", createCircleZone);

selectedZoneNameInput.addEventListener("input", updateSelectedZoneFromInputs);
selectedZoneTypeInput.addEventListener("change", updateSelectedZoneFromInputs);

duplicateSelectedBtn.addEventListener("click", duplicateSelectedZone);
bringForwardBtn.addEventListener("click", moveSelectedForward);
sendBackwardBtn.addEventListener("click", moveSelectedBackward);
deleteSelectedBtn.addEventListener("click", deleteSelectedZone);

saveProjectBtn.addEventListener("click", saveProject);

loadProjectInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const project = JSON.parse(e.target.result);
      loadProject(project);
    } catch (error) {
      alert("Impossible de lire ce fichier JSON.");
      console.error(error);
    }
  };
  reader.readAsText(file);
});

exportBtn.addEventListener("click", exportPNG);

updateGridSizeLabel();
drawGrid();
updateSelectionPanel();
