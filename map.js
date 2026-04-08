const STAGE_WIDTH = 2000;
const STAGE_HEIGHT = 1400;

const $ = (id) => document.getElementById(id);

const stage = new Konva.Stage({
  container: "stageContainer",
  width: STAGE_WIDTH,
  height: STAGE_HEIGHT,
  draggable: false
});

const backgroundLayer = new Konva.Layer();
const terrainLayer = new Konva.Layer();
const decoLayer = new Konva.Layer();
const objectsLayer = new Konva.Layer();
const gridLayer = new Konva.Layer({ listening: false });
const uiLayer = new Konva.Layer();

stage.add(backgroundLayer);
stage.add(terrainLayer);
stage.add(decoLayer);
stage.add(objectsLayer);
stage.add(gridLayer);
stage.add(uiLayer);

const layersMap = {
  terrain: terrainLayer,
  deco: decoLayer,
  objects: objectsLayer
};

let backgroundImageNode = null;
let currentTool = "select";
let activeLayerKey = "terrain";
let selectedNode = null;
let activeTilesetImage = null;
let activeTiles = [];
let selectedTile = null;
let tileInstanceCounter = 1;
let isPanning = false;
let panLastPointer = null;
let spacePressed = false;

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

const gridTypeInput = $("gridType");
const gridSizeInput = $("gridSize");
const gridSizeValue = $("gridSizeValue");
const showGridInput = $("showGrid");
const snapToGridInput = $("snapToGrid");
const applyGridBtn = $("applyGridBtn");

const bgUpload = $("bgUpload");
const clearBgBtn = $("clearBgBtn");

const tilesetUpload = $("tilesetUpload");
const tileWidthInput = $("tileWidth");
const tileHeightInput = $("tileHeight");
const tileMarginInput = $("tileMargin");
const tileSpacingInput = $("tileSpacing");
const sliceTilesetBtn = $("sliceTilesetBtn");
const clearTilesetBtn = $("clearTilesetBtn");
const tilesPalette = $("tilesPalette");
const tilesetInfo = $("tilesetInfo");
const selectedTileCard = $("selectedTileCard");

const layersList = $("layersList");
const activeLayerBadge = $("activeLayerBadge");
const activeToolBadge = $("activeToolBadge");

const toolSelectBtn = $("toolSelectBtn");
const toolStampBtn = $("toolStampBtn");
const resetViewBtn = $("resetViewBtn");

const selectionEmpty = $("selectionEmpty");
const selectionEditor = $("selectionEditor");
const selectedTileNameInput = $("selectedTileName");
const selectedTileLayerInput = $("selectedTileLayer");
const duplicateSelectedBtn = $("duplicateSelectedBtn");
const bringForwardBtn = $("bringForwardBtn");
const sendBackwardBtn = $("sendBackwardBtn");
const deleteSelectedBtn = $("deleteSelectedBtn");
const exportBtn = $("exportBtn");

function bindIfExists(element, eventName, handler) {
  if (element) element.addEventListener(eventName, handler);
}

function getGridSize() {
  return Math.max(8, parseInt(gridSizeInput.value, 10) || 32);
}

function getLayerLabel(key) {
  if (key === "terrain") return "Terrain";
  if (key === "deco") return "Décor";
  return "Objets";
}

function updateBadges() {
  activeLayerBadge.textContent = `Calque actif : ${getLayerLabel(activeLayerKey)}`;
  activeToolBadge.textContent = `Outil : ${currentTool === "stamp" ? "Pose de tuile" : "Sélection"}`;
}

function updateGridSizeLabel() {
  gridSizeValue.textContent = `${getGridSize()} px`;
}

function drawGrid() {
  gridLayer.destroyChildren();
  const size = getGridSize();
  const showGrid = showGridInput.checked;
  const type = gridTypeInput.value;

  if (!showGrid || type === "free") {
    gridLayer.draw();
    return;
  }

  for (let x = 0; x <= STAGE_WIDTH; x += size) {
    gridLayer.add(new Konva.Line({
      points: [x, 0, x, STAGE_HEIGHT],
      stroke: "rgba(15, 23, 42, 0.12)",
      strokeWidth: 1
    }));
  }

  for (let y = 0; y <= STAGE_HEIGHT; y += size) {
    gridLayer.add(new Konva.Line({
      points: [0, y, STAGE_WIDTH, y],
      stroke: "rgba(15, 23, 42, 0.12)",
      strokeWidth: 1
    }));
  }

  gridLayer.draw();
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
    selectedTileNameInput.value = "";
    selectedTileLayerInput.value = activeLayerKey;
    return;
  }

  selectionEmpty.classList.add("hidden");
  selectionEditor.classList.remove("hidden");
  selectedTileNameInput.value = selectedNode.getAttr("assetName") || "";
  selectedTileLayerInput.value = selectedNode.getAttr("layerKey") || "terrain";
}

function applySnap(value) {
  const size = getGridSize();
  return Math.round(value / size) * size;
}

function snapNodeToGrid(node) {
  if (!snapToGridInput.checked || gridTypeInput.value === "free") return;
  node.x(applySnap(node.x()));
  node.y(applySnap(node.y()));
}

function normalizeImageScale(node) {
  if (!(node instanceof Konva.Image)) return;
  const nextWidth = Math.max(8, node.width() * node.scaleX());
  const nextHeight = Math.max(8, node.height() * node.scaleY());
  node.width(nextWidth);
  node.height(nextHeight);
  node.scale({ x: 1, y: 1 });
}

function makeSelectable(node) {
  node.on("click tap", (e) => {
    if (currentTool === "stamp") return;
    e.cancelBubble = true;
    selectNode(node);
  });

  node.on("dragstart transformstart", () => {
    if (currentTool === "select") selectNode(node);
  });

  node.on("dragmove", () => {
    snapNodeToGrid(node);
  });

  node.on("dragend", () => {
    snapNodeToGrid(node);
    getLayerForNode(node).draw();
  });

  node.on("transformend", () => {
    normalizeImageScale(node);
    snapNodeToGrid(node);
    getLayerForNode(node).draw();
  });
}

function getLayerForNode(node) {
  const layerKey = node.getAttr("layerKey") || "terrain";
  return layersMap[layerKey] || terrainLayer;
}

function setActiveLayer(layerKey) {
  activeLayerKey = layerKey;
  document.querySelectorAll(".layer-item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.layer === layerKey);
    const tag = item.querySelector(".layer-tag");
    if (tag) tag.textContent = item.dataset.layer === layerKey ? "Actif" : "Layer";
  });
  updateBadges();
}

function setTool(tool) {
  currentTool = tool;
  toolSelectBtn.classList.toggle("is-active", tool === "select");
  toolStampBtn.classList.toggle("is-active", tool === "stamp");
  if (tool === "stamp") {
    clearSelection();
  }
  updateBadges();
}

function loadImageFromFile(file, onLoad) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => onLoad(img, event.target.result);
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function setBackgroundImage(img) {
  if (backgroundImageNode) {
    backgroundImageNode.destroy();
    backgroundImageNode = null;
  }

  const scale = Math.max(STAGE_WIDTH / img.width, STAGE_HEIGHT / img.height);
  const width = img.width * scale;
  const height = img.height * scale;
  const x = (STAGE_WIDTH - width) / 2;
  const y = (STAGE_HEIGHT - height) / 2;

  backgroundImageNode = new Konva.Image({
    image: img,
    x,
    y,
    width,
    height,
    listening: false
  });

  backgroundLayer.add(backgroundImageNode);
  backgroundLayer.draw();
}

function clearTileset() {
  activeTilesetImage = null;
  activeTiles = [];
  selectedTile = null;
  tilesPalette.innerHTML = "";
  tilesetInfo.textContent = "Aucun tileset chargé.";
  renderSelectedTileCard();
}

function buildTileCanvas(tile) {
  const canvas = document.createElement("canvas");
  canvas.width = tile.width;
  canvas.height = tile.height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    activeTilesetImage,
    tile.cropX,
    tile.cropY,
    tile.cropWidth,
    tile.cropHeight,
    0,
    0,
    tile.width,
    tile.height
  );
  return canvas;
}

function renderSelectedTileCard() {
  if (!selectedTile) {
    selectedTileCard.className = "selected-tile-card empty";
    selectedTileCard.textContent = "Aucune tuile sélectionnée.";
    return;
  }

  selectedTileCard.className = "selected-tile-card";
  selectedTileCard.innerHTML = "";
  const canvas = buildTileCanvas(selectedTile);
  const textWrap = document.createElement("div");
  const title = document.createElement("strong");
  const meta = document.createElement("span");
  title.textContent = `Tuile ${selectedTile.index + 1}`;
  meta.textContent = `${selectedTile.width}×${selectedTile.height} • x:${selectedTile.cropX} y:${selectedTile.cropY}`;
  textWrap.appendChild(title);
  textWrap.appendChild(meta);
  selectedTileCard.appendChild(canvas);
  selectedTileCard.appendChild(textWrap);
}

function renderTilesPalette() {
  tilesPalette.innerHTML = "";

  if (!activeTiles.length) {
    tilesetInfo.textContent = "Aucune tuile exploitable trouvée dans ce tileset.";
    renderSelectedTileCard();
    return;
  }

  tilesetInfo.textContent = `${activeTiles.length} tuiles découpées.`;

  activeTiles.forEach((tile) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "tile-swatch";
    if (selectedTile && selectedTile.index === tile.index) {
      item.classList.add("is-selected");
    }

    const canvas = buildTileCanvas(tile);
    const caption = document.createElement("small");
    caption.textContent = `#${tile.index + 1}`;

    item.appendChild(canvas);
    item.appendChild(caption);
    item.addEventListener("click", () => {
      selectedTile = tile;
      renderTilesPalette();
      renderSelectedTileCard();
      setTool("stamp");
    });

    tilesPalette.appendChild(item);
  });

  renderSelectedTileCard();
}

function sliceTileset() {
  if (!activeTilesetImage) return;

  const tileWidth = Math.max(1, parseInt(tileWidthInput.value, 10) || 32);
  const tileHeight = Math.max(1, parseInt(tileHeightInput.value, 10) || 32);
  const margin = Math.max(0, parseInt(tileMarginInput.value, 10) || 0);
  const spacing = Math.max(0, parseInt(tileSpacingInput.value, 10) || 0);

  const result = [];
  let index = 0;
  for (let y = margin; y + tileHeight <= activeTilesetImage.height; y += tileHeight + spacing) {
    for (let x = margin; x + tileWidth <= activeTilesetImage.width; x += tileWidth + spacing) {
      result.push({
        index,
        cropX: x,
        cropY: y,
        cropWidth: tileWidth,
        cropHeight: tileHeight,
        width: tileWidth,
        height: tileHeight
      });
      index += 1;
    }
  }

  activeTiles = result;
  selectedTile = activeTiles[0] || null;
  renderTilesPalette();
}

function createTileInstance(tile, x, y, layerKey = activeLayerKey) {
  if (!activeTilesetImage || !tile) return null;

  const node = new Konva.Image({
    image: activeTilesetImage,
    x,
    y,
    width: tile.width,
    height: tile.height,
    crop: {
      x: tile.cropX,
      y: tile.cropY,
      width: tile.cropWidth,
      height: tile.cropHeight
    },
    draggable: true,
    perfectDrawEnabled: false,
    shadowForStrokeEnabled: false
  });

  node.setAttr("instanceId", `tile-${tileInstanceCounter++}`);
  node.setAttr("assetName", `Tuile ${tile.index + 1}`);
  node.setAttr("layerKey", layerKey);
  node.setAttr("tileMeta", { ...tile });

  makeSelectable(node);
  layersMap[layerKey].add(node);
  layersMap[layerKey].draw();
  return node;
}

function duplicateSelected() {
  if (!selectedNode) return;
  const tileMeta = selectedNode.getAttr("tileMeta");
  if (!tileMeta) return;

  const node = createTileInstance(
    tileMeta,
    selectedNode.x() + getGridSize(),
    selectedNode.y() + getGridSize(),
    selectedNode.getAttr("layerKey") || activeLayerKey
  );

  if (!node) return;
  node.width(selectedNode.width());
  node.height(selectedNode.height());
  node.setAttr("assetName", `${selectedNode.getAttr("assetName") || "Tuile"} copie`);
  selectNode(node);
}

function removeSelected() {
  if (!selectedNode) return;
  const parentLayer = getLayerForNode(selectedNode);
  selectedNode.destroy();
  clearSelection();
  parentLayer.draw();
}

function updateSelectedFromInputs() {
  if (!selectedNode) return;
  selectedNode.setAttr("assetName", selectedTileNameInput.value.trim() || "Tuile");

  const nextLayerKey = selectedTileLayerInput.value;
  const currentLayerKey = selectedNode.getAttr("layerKey") || "terrain";

  if (nextLayerKey !== currentLayerKey) {
    selectedNode.moveTo(layersMap[nextLayerKey]);
    selectedNode.setAttr("layerKey", nextLayerKey);
    layersMap[currentLayerKey].draw();
    layersMap[nextLayerKey].draw();
  } else {
    getLayerForNode(selectedNode).draw();
  }

  updateSelectionPanel();
}

function exportPNG() {
  clearSelection();
  const dataURL = stage.toDataURL({ pixelRatio: 2 });
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = "carte-2d.png";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function resetView() {
  stage.scale({ x: 1, y: 1 });
  stage.position({ x: 0, y: 0 });
  stage.batchDraw();
}

function getPointerOnStage() {
  const pointer = stage.getPointerPosition();
  if (!pointer) return null;
  const transform = stage.getAbsoluteTransform().copy();
  transform.invert();
  return transform.point(pointer);
}

function placeSelectedTileAtPointer() {
  if (currentTool !== "stamp" || !selectedTile) return;
  const point = getPointerOnStage();
  if (!point) return;

  const x = snapToGridInput.checked ? applySnap(point.x) : point.x;
  const y = snapToGridInput.checked ? applySnap(point.y) : point.y;

  const node = createTileInstance(selectedTile, x, y, activeLayerKey);
  if (!node) return;
  selectNode(node);
}

stage.on("click tap", (e) => {
  if (e.target !== stage) return;

  if (currentTool === "stamp") {
    placeSelectedTileAtPointer();
    return;
  }

  clearSelection();
});

stage.on("wheel", (e) => {
  e.evt.preventDefault();
  const oldScale = stage.scaleX();
  const pointer = stage.getPointerPosition();
  if (!pointer) return;

  const scaleBy = 1.08;
  const direction = e.evt.deltaY > 0 ? -1 : 1;
  const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
  const clampedScale = Math.max(0.25, Math.min(4, newScale));

  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale
  };

  stage.scale({ x: clampedScale, y: clampedScale });
  stage.position({
    x: pointer.x - mousePointTo.x * clampedScale,
    y: pointer.y - mousePointTo.y * clampedScale
  });
  stage.batchDraw();
});

stage.on("mousedown", (e) => {
  const middleClick = e.evt.button === 1;
  if (middleClick || spacePressed) {
    isPanning = true;
    panLastPointer = stage.getPointerPosition();
    stage.container().style.cursor = "grabbing";
    e.evt.preventDefault();
  }
});

stage.on("mousemove", () => {
  if (!isPanning) return;
  const pointer = stage.getPointerPosition();
  if (!pointer || !panLastPointer) return;

  const dx = pointer.x - panLastPointer.x;
  const dy = pointer.y - panLastPointer.y;
  stage.position({ x: stage.x() + dx, y: stage.y() + dy });
  panLastPointer = pointer;
  stage.batchDraw();
});

window.addEventListener("mouseup", () => {
  isPanning = false;
  panLastPointer = null;
  stage.container().style.cursor = currentTool === "stamp" ? "copy" : "default";
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    spacePressed = true;
    stage.container().style.cursor = "grab";
  }

  if (e.key === "Delete" || e.key === "Backspace") {
    if (selectedNode) {
      e.preventDefault();
      removeSelected();
    }
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    spacePressed = false;
    stage.container().style.cursor = currentTool === "stamp" ? "copy" : "default";
  }
});

bindIfExists(applyGridBtn, "click", drawGrid);
bindIfExists(gridSizeInput, "input", () => { updateGridSizeLabel(); drawGrid(); });
bindIfExists(showGridInput, "change", drawGrid);
bindIfExists(gridTypeInput, "change", drawGrid);

bindIfExists(bgUpload, "change", (event) => {
  const file = event.target.files?.[0];
  loadImageFromFile(file, (img) => setBackgroundImage(img));
});

bindIfExists(clearBgBtn, "click", () => {
  if (backgroundImageNode) {
    backgroundImageNode.destroy();
    backgroundImageNode = null;
    backgroundLayer.draw();
  }
});

bindIfExists(tilesetUpload, "change", (event) => {
  const file = event.target.files?.[0];
  loadImageFromFile(file, (img) => {
    activeTilesetImage = img;
    tilesetInfo.textContent = `Tileset chargé : ${img.width}×${img.height}px`;
    sliceTileset();
  });
});

bindIfExists(sliceTilesetBtn, "click", sliceTileset);
bindIfExists(clearTilesetBtn, "click", clearTileset);

bindIfExists(toolSelectBtn, "click", () => setTool("select"));
bindIfExists(toolStampBtn, "click", () => {
  if (!selectedTile) return;
  setTool("stamp");
});

bindIfExists(resetViewBtn, "click", resetView);

layersList.querySelectorAll(".layer-item").forEach((item) => {
  item.addEventListener("click", (e) => {
    if (e.target.classList.contains("layer-visibility")) return;
    setActiveLayer(item.dataset.layer);
  });
});

document.querySelectorAll(".layer-visibility").forEach((checkbox) => {
  checkbox.addEventListener("change", (e) => {
    const layerKey = e.target.dataset.layerToggle;
    const layer = layersMap[layerKey];
    layer.visible(e.target.checked);
    layer.draw();
  });
});

bindIfExists(selectedTileNameInput, "input", updateSelectedFromInputs);
bindIfExists(selectedTileLayerInput, "change", updateSelectedFromInputs);
bindIfExists(duplicateSelectedBtn, "click", duplicateSelected);
bindIfExists(bringForwardBtn, "click", () => {
  if (!selectedNode) return;
  selectedNode.moveUp();
  getLayerForNode(selectedNode).draw();
});
bindIfExists(sendBackwardBtn, "click", () => {
  if (!selectedNode) return;
  selectedNode.moveDown();
  getLayerForNode(selectedNode).draw();
});
bindIfExists(deleteSelectedBtn, "click", removeSelected);
bindIfExists(exportBtn, "click", exportPNG);

updateGridSizeLabel();
drawGrid();
setActiveLayer(activeLayerKey);
setTool(currentTool);
updateSelectionPanel();
renderSelectedTileCard();
resetView();
