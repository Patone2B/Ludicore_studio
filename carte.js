const STORAGE_KEY = 'deckStudioLocal.v1';
const CURRENT_KEY = 'deckStudioCurrentDeckId';
const DB_NAME = 'deckStudioLocalDB';
const DB_VERSION = 1;
const STORE_DECKS = 'decks';
const META_MIGRATED_KEY = 'deckStudioMigratedToIndexedDB';
const GRID_SIZE = 10;
let state = createEmptyState();
let selectedElementId = null;
let history = [];
let historyIndex = -1;
let dragState = null;
let dbPromise = null;
let autoSaveTimer = null;
let renderQueued = false;
const AUTO_SAVE_DELAY = 1800;

const els = {};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  bindElements();
  bindEvents();
  await migrateLegacyStorage();
  await renderSavedDecks();
  const currentId = localStorage.getItem(CURRENT_KEY);
  if (currentId) {
    const deck = await getDeckById(currentId);
    if (deck) loadDeck(deck, true);
  }
}

function bindElements() {
  [
    'startScreen','editorScreen','savedDecks','aboutModal','deckNameInput','saveStatus','cardCounter','cardsList','layersList','cardCanvas','canvasWrap','cardStage',
    'cardNameInput','cardWidthInput','cardHeightInput','cardBgInput','cardBgOpacityInput','cardBackgroundImageInput','selectionControls','selectionEmpty',
    'elementNameInput','elementXInput','elementYInput','elementWidthInput','elementHeightInput','elementRotationInput','elementOpacityInput',
    'elementColorInput','elementBorderColorInput','elementBorderWidthInput','elementRadiusInput','elementFontSizeInput','elementFontFamilyInput',
    'elementTextInput','persistDeckToggle','persistDeckToggleMirror'
  ].forEach(id => els[id] = document.getElementById(id));
}

function bindEvents() {
  byId('createDeckBtn').addEventListener('click', () => { state = createEmptyState(); enterEditor(); pushHistory(); });
  byId('refreshDecksBtn').addEventListener('click', () => renderSavedDecks());
  byId('aboutBtn').addEventListener('click', () => toggleModal(true));
  byId('closeAboutBtn').addEventListener('click', () => toggleModal(false));
  byId('backToHomeBtn').addEventListener('click', () => showScreen('start'));
  byId('saveDeckBtn').addEventListener('click', () => saveCurrentDeck({ notify: true }));
  byId('deckNameInput').addEventListener('input', e => { state.name = e.target.value || 'Mon deck'; markDirty(); renderCardsList(); });
  byId('addCardBtn').addEventListener('click', addCard);
  byId('duplicateCardBtn').addEventListener('click', duplicateCurrentCard);
  byId('deleteCardBtn').addEventListener('click', deleteCurrentCard);
  byId('frontBtn').addEventListener('click', () => setSide('front'));
  byId('backBtn').addEventListener('click', () => setSide('back'));
  byId('flipCardBtn').addEventListener('click', flipAnimation);
  byId('undoBtn').addEventListener('click', undo);
  byId('redoBtn').addEventListener('click', redo);
  byId('centerElementBtn').addEventListener('click', centerSelectedElement);
  byId('fitViewBtn')?.addEventListener('click', fitCardToView);
  byId('bringFrontBtn').addEventListener('click', () => reorderSelected('front'));
  byId('sendBackBtn').addEventListener('click', () => reorderSelected('back'));
  byId('duplicateElementBtn').addEventListener('click', duplicateSelectedElement);
  byId('deleteElementBtn').addEventListener('click', deleteSelectedElement);
  byId('exportJsonBtn').addEventListener('click', exportJSON);
  byId('exportPngBtn').addEventListener('click', () => exportImage('png'));
  byId('exportJpegBtn').addEventListener('click', () => exportImage('jpeg'));
  byId('exportPdfBtn').addEventListener('click', exportPDF);
  byId('imageInput').addEventListener('change', onLocalImageAdd);
  byId('cardBackgroundImageInput').addEventListener('change', onBackgroundImageAdd);
  byId('clearCardBgImageBtn').addEventListener('click', clearBackgroundImage);
  byId('importDeckInput').addEventListener('change', importJSON);
  byId('snapToggle').addEventListener('change', () => {});
  byId('showGridToggle').addEventListener('change', e => els.canvasWrap.classList.toggle('show-grid', e.target.checked));
  byId('safeZoneToggle').addEventListener('change', e => els.canvasWrap.classList.toggle('show-safe-zone', e.target.checked));
  byId('persistDeckToggle').addEventListener('change', onPersistToggleChange);
  byId('persistDeckToggleMirror').addEventListener('change', onPersistToggleChange);

  document.querySelectorAll('[data-add]').forEach(btn => btn.addEventListener('click', () => addElement(btn.dataset.add)));
  document.querySelectorAll('.template-btn').forEach(btn => btn.addEventListener('click', () => applyTheme(btn.dataset.theme)));
  document.querySelectorAll('[data-model]').forEach(btn => btn.addEventListener('click', () => applyCardModel(btn.dataset.model)));

  byId('cardNameInput').addEventListener('input', updateCardName);
  ['cardWidthInput','cardHeightInput'].forEach(id => byId(id).addEventListener('input', updateCardDimensions));
  byId('cardBgInput').addEventListener('input', updateCardBackground);
  byId('cardBgOpacityInput').addEventListener('input', updateCardBackground);

  const map = {
    elementNameInput:'name', elementXInput:'x', elementYInput:'y', elementWidthInput:'width', elementHeightInput:'height',
    elementRotationInput:'rotation', elementOpacityInput:'opacity', elementColorInput:'color', elementBorderColorInput:'borderColor',
    elementBorderWidthInput:'borderWidth', elementRadiusInput:'radius', elementFontSizeInput:'fontSize', elementFontFamilyInput:'fontFamily',
    elementTextInput:'text'
  };
  Object.entries(map).forEach(([id, prop]) => byId(id).addEventListener('input', e => updateSelectedProp(prop, e.target.value)));

  byId('textBoldBtn').addEventListener('click', () => toggleSelectedStyle('fontWeight', '700', '400'));
  byId('textItalicBtn').addEventListener('click', () => toggleSelectedStyle('fontStyle', 'italic', 'normal'));
  byId('alignLeftBtn').addEventListener('click', () => updateSelectedProp('textAlign', 'left'));
  byId('alignCenterBtn').addEventListener('click', () => updateSelectedProp('textAlign', 'center'));
  byId('alignRightBtn').addEventListener('click', () => updateSelectedProp('textAlign', 'right'));
  byId('lockElementBtn').addEventListener('click', toggleLockSelected);

  document.addEventListener('keydown', handleKeyDown);
  els.cardCanvas.addEventListener('pointerdown', onCanvasPointerDown);
}

function createEmptyState() {
  return {
    id: uid(),
    name: 'Mon deck',
    currentCardId: null,
    currentSide: 'front',
    updatedAt: new Date().toISOString(),
    persistLocal: true,
    cards: [createCard(1)]
  };
}

function createCard(index) {
  const id = uid();
  return {
    id,
    name: `Carte ${index}`,
    width: 420,
    height: 600,
    sides: {
      front: createSide('#f8fafc'),
      back: createSide('#101828')
    }
  };
}

function createSide(bgColor) {
  return { background: { color: bgColor, opacity: 1, image: null, style: 'plain' }, elements: [] };
}

function uid() { return Math.random().toString(36).slice(2, 10); }
function byId(id) { return document.getElementById(id); }
function showScreen(name) {
  byId('startScreen').classList.toggle('active', name === 'start');
  byId('editorScreen').classList.toggle('active', name === 'editor');
  if (name === 'start') renderSavedDecks();
}
function toggleModal(show) { els.aboutModal.classList.toggle('hidden', !show); }

function enterEditor() {
  if (!state.currentCardId) state.currentCardId = state.cards[0].id;
  if (typeof state.persistLocal !== 'boolean') state.persistLocal = true;
  showScreen('editor');
  selectedElementId = null;
  renderAll();
}

function getCurrentCard() { return state.cards.find(c => c.id === state.currentCardId) || state.cards[0]; }
function getCurrentSide() { return getCurrentCard().sides[state.currentSide]; }
function getCurrentElements() { return getCurrentSide().elements; }
function getSelectedElement() { return getCurrentElements().find(el => el.id === selectedElementId) || null; }

function renderAll() {
  byId('deckNameInput').value = state.name;
  renderCardsList();
  renderCanvas();
  renderLayers();
  renderSelectionPanel();
  renderCardControls();
  updateSideButtons();
  syncPersistToggles();
  updateCardCounter();
}

function renderCardsList() {
  const wrap = els.cardsList;
  wrap.innerHTML = '';
  state.cards.forEach((card, index) => {
    const div = document.createElement('div');
    div.className = `card-thumb ${card.id === state.currentCardId ? 'active' : ''}`;
    div.innerHTML = `<div><strong>${card.name}</strong><div class="muted">${card.width} × ${card.height}</div></div><span>#${index+1}</span>`;
    div.addEventListener('click', () => { state.currentCardId = card.id; selectedElementId = null; renderAll(); markDirty(false); });
    wrap.appendChild(div);
  });
}

function renderCanvas() {
  const card = getCurrentCard();
  const side = getCurrentSide();
  const canvas = els.cardCanvas;
  canvas.innerHTML = '';
  canvas.style.width = card.width + 'px';
  canvas.style.height = card.height + 'px';
  const bg = side.background;
  canvas.style.background = rgbaFromHex(bg.color, bg.opacity);
  canvas.style.backgroundImage = bg.image ? `url(${bg.image})` : 'none';
  canvas.style.backgroundSize = bg.image ? 'cover' : 'initial';
  canvas.style.backgroundPosition = 'center';
  canvas.classList.remove('card-style-parchment','card-style-noir','card-style-runes');
  if (bg.style && bg.style !== 'plain') canvas.classList.add(`card-style-${bg.style}`);

  side.elements.forEach((el, index) => {
    const node = document.createElement('div');
    node.className = `canvas-element ${el.type === 'text' ? 'text-el' : ''} ${shapeClass(el)} ${selectedElementId === el.id ? 'selected' : ''} ${el.locked ? 'locked' : ''}`;
    node.dataset.id = el.id;
    node.style.left = el.x + 'px';
    node.style.top = el.y + 'px';
    node.style.width = el.width + 'px';
    node.style.height = el.height + 'px';
    node.style.transform = `rotate(${el.rotation || 0}deg)`;
    node.style.opacity = el.opacity ?? 1;
    node.style.zIndex = el.zIndex ?? index + 1;
    node.style.borderRadius = (el.radius ?? 0) + 'px';
    node.style.border = `${el.borderWidth || 0}px solid ${el.borderColor || 'transparent'}`;
    node.style.boxSizing = 'border-box';

    if (el.type === 'text') {
      node.textContent = el.text || 'Texte';
      node.style.color = el.color || '#111827';
      node.style.fontSize = (el.fontSize || 28) + 'px';
      node.style.fontFamily = el.fontFamily || 'Inter';
      node.style.fontWeight = el.fontWeight || '400';
      node.style.fontStyle = el.fontStyle || 'normal';
      node.style.textAlign = el.textAlign || 'left';
      node.style.alignItems = 'center';
      node.style.justifyContent = el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start';
      node.style.lineHeight = '1.15';
      node.style.background = rgbaFromHex(el.backgroundColor || '#000000', el.backgroundOpacity ?? 0);
    } else if (el.type === 'image') {
      const img = document.createElement('img');
      img.src = el.src;
      img.alt = el.name || 'image';
      node.appendChild(img);
    } else {
      node.style.background = el.type === 'line' ? 'transparent' : (el.color || '#60a5fa');
      if (el.type === 'line') {
        node.style.borderTop = `${Math.max(el.height, 2)}px solid ${el.color || '#60a5fa'}`;
        node.style.height = '0px';
        node.style.border = '0';
      }
      if (el.type === 'frame') {
        node.style.background = 'transparent';
        node.style.borderWidth = `${el.borderWidth || 8}px`;
      }
      if (el.type === 'badge') {
        node.style.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
      }
    }

    node.addEventListener('pointerdown', onElementPointerDown);
    node.addEventListener('dblclick', () => { if (el.type === 'text') selectedElementId = el.id; renderSelectionPanel(); });

    if (selectedElementId === el.id && !el.locked) {
      const handle = document.createElement('div');
      handle.className = 'resize-handle';
      handle.dataset.resizeId = el.id;
      handle.addEventListener('pointerdown', onResizePointerDown);
      node.appendChild(handle);
    }

    canvas.appendChild(node);
  });
}

function shapeClass(el) {
  if (el.type === 'triangle') return 'shape-triangle';
  if (el.type === 'line') return 'shape-line';
  return '';
}

function renderLayers() {
  const list = els.layersList;
  list.innerHTML = '';
  [...getCurrentElements()].sort((a,b) => (b.zIndex||0)-(a.zIndex||0)).forEach(el => {
    const item = document.createElement('div');
    item.className = `layer-item ${el.id === selectedElementId ? 'active' : ''}`;
    item.innerHTML = `<span>${el.name || el.type}</span><small>${el.type}</small>`;
    item.addEventListener('click', () => { selectedElementId = el.id; renderAll(); });
    list.appendChild(item);
  });
}

function renderCardControls() {
  const card = getCurrentCard();
  const bg = getCurrentSide().background;
  els.cardNameInput.value = card.name || '';
  els.cardWidthInput.value = card.width;
  els.cardHeightInput.value = card.height;
  els.cardBgInput.value = bg.color || '#ffffff';
  els.cardBgOpacityInput.value = bg.opacity ?? 1;
}

function renderSelectionPanel() {
  const el = getSelectedElement();
  els.selectionControls.classList.toggle('hidden', !el);
  els.selectionEmpty.classList.toggle('hidden', !!el);
  if (!el) return;
  els.elementNameInput.value = el.name || '';
  els.elementXInput.value = Math.round(el.x || 0);
  els.elementYInput.value = Math.round(el.y || 0);
  els.elementWidthInput.value = Math.round(el.width || 0);
  els.elementHeightInput.value = Math.round(el.height || 0);
  els.elementRotationInput.value = Math.round(el.rotation || 0);
  els.elementOpacityInput.value = el.opacity ?? 1;
  els.elementColorInput.value = normalizeHex(el.color || '#4f46e5');
  els.elementBorderColorInput.value = normalizeHex(el.borderColor || '#ffffff');
  els.elementBorderWidthInput.value = el.borderWidth || 0;
  els.elementRadiusInput.value = el.radius || 0;
  els.elementFontSizeInput.value = el.fontSize || 28;
  els.elementFontFamilyInput.value = el.fontFamily || 'Inter';
  els.elementTextInput.value = el.text || '';
}

function updateSideButtons() {
  byId('frontBtn').className = `btn tiny ${state.currentSide === 'front' ? 'primary' : 'ghost'}`;
  byId('backBtn').className = `btn tiny ${state.currentSide === 'back' ? 'primary' : 'ghost'}`;
}

function syncPersistToggles() {
  const value = state.persistLocal !== false;
  els.persistDeckToggle.checked = value;
  els.persistDeckToggleMirror.checked = value;
}

function onPersistToggleChange(e) {
  const checked = !!e.target.checked;
  state.persistLocal = checked;
  syncPersistToggles();
  markDirty();
  if (!checked) {
    deleteDeck(state.id, { silent: true });
    localStorage.removeItem(CURRENT_KEY);
    els.saveStatus.textContent = 'Sauvegarde navigateur désactivée';
    els.saveStatus.classList.add('is-dirty');
  } else {
    autoSave();
  }
}

function addCard() {
  const card = createCard(state.cards.length + 1);
  state.cards.push(card);
  state.currentCardId = card.id;
  selectedElementId = null;
  touch();
}

function duplicateCurrentCard() {
  const current = structuredClone(getCurrentCard());
  current.id = uid();
  current.name = current.name + ' copie';
  Object.values(current.sides).forEach(side => side.elements.forEach(el => el.id = uid()));
  state.cards.push(current);
  state.currentCardId = current.id;
  selectedElementId = null;
  touch();
}

function deleteCurrentCard() {
  if (state.cards.length === 1) return alert('Il faut garder au moins une carte.');
  state.cards = state.cards.filter(c => c.id !== state.currentCardId);
  state.currentCardId = state.cards[0].id;
  selectedElementId = null;
  touch();
}

function setSide(side) {
  state.currentSide = side;
  selectedElementId = null;
  renderAll();
}

function flipAnimation() {
  els.cardCanvas.classList.remove('flip-anim');
  void els.cardCanvas.offsetWidth;
  els.cardCanvas.classList.add('flip-anim');
  setTimeout(() => setSide(state.currentSide === 'front' ? 'back' : 'front'), 250);
}

function addElement(type) {
  const element = baseElement(type);
  getCurrentElements().push(element);
  selectedElementId = element.id;
  normalizeZIndices();
  touch();
}

function baseElement(type) {
  const common = { id: uid(), name: labelForType(type), type, x: 40, y: 40, width: 140, height: 90, rotation: 0, opacity: 1, color: '#7c3aed', borderColor: '#ffffff', borderWidth: 0, radius: 12, zIndex: getCurrentElements().length + 1, locked: false };
  if (type === 'text') return { ...common, width: 240, height: 80, text: 'Nouveau texte', color: '#111827', fontSize: 28, fontFamily: 'Inter', textAlign: 'left', fontWeight: '400', fontStyle: 'normal', backgroundColor: '#000000', backgroundOpacity: 0 };
  if (type === 'image') return { ...common, width: 180, height: 180, src: '' };
  if (type === 'circle') return { ...common, width: 120, height: 120, radius: 999, color: '#38bdf8' };
  if (type === 'line') return { ...common, width: 180, height: 6, color: '#f43f5e', borderWidth: 0, radius: 0 };
  if (type === 'triangle') return { ...common, width: 140, height: 120, color: '#f59e0b', radius: 0 };
  if (type === 'badge') return { ...common, width: 130, height: 130, color: '#e879f9', radius: 0 };
  if (type === 'frame') return { ...common, width: 220, height: 300, color: '#000000', borderColor: '#fde68a', borderWidth: 8, radius: 24 };
  return common;
}

function labelForType(type) {
  return ({ text:'Texte', image:'Image', rect:'Rectangle', circle:'Cercle', triangle:'Triangle', line:'Ligne', badge:'Badge', frame:'Cadre' })[type] || type;
}

function onLocalImageAdd(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  fileToDataURL(file).then(src => {
    const element = baseElement('image');
    element.src = src;
    element.name = file.name;
    getCurrentElements().push(element);
    selectedElementId = element.id;
    normalizeZIndices();
    touch();
    e.target.value = '';
  });
}

function onBackgroundImageAdd(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  fileToDataURL(file).then(src => {
    getCurrentSide().background.image = src;
    touch();
    e.target.value = '';
  });
}
function clearBackgroundImage() { getCurrentSide().background.image = null; touch(); }

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function onCanvasPointerDown(e) {
  if (e.target === els.cardCanvas) {
    selectedElementId = null;
    renderAll();
  }
}

function onElementPointerDown(e) {
  if (e.target.classList.contains('resize-handle')) return;
  const id = e.currentTarget.dataset.id;
  const element = getCurrentElements().find(el => el.id === id);
  if (!element) return;
  selectedElementId = id;
  renderSelectionPanel();
  renderLayers();
  renderCanvas();
  if (element.locked) return;
  dragState = { type: 'move', id, startX: e.clientX, startY: e.clientY, originX: element.x, originY: element.y };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp, { once: true });
}

function onResizePointerDown(e) {
  e.stopPropagation();
  const id = e.target.dataset.resizeId;
  const element = getCurrentElements().find(el => el.id === id);
  if (!element || element.locked) return;
  dragState = { type: 'resize', id, startX: e.clientX, startY: e.clientY, originW: element.width, originH: element.height };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp, { once: true });
}

function onPointerMove(e) {
  if (!dragState) return;
  const el = getCurrentElements().find(item => item.id === dragState.id);
  if (!el) return;
  if (dragState.type === 'move') {
    let x = dragState.originX + (e.clientX - dragState.startX);
    let y = dragState.originY + (e.clientY - dragState.startY);
    if (byId('snapToggle').checked) { x = snap(x); y = snap(y); }
    el.x = clamp(x, 0, getCurrentCard().width - el.width);
    el.y = clamp(y, 0, getCurrentCard().height - el.height);
  } else {
    let w = dragState.originW + (e.clientX - dragState.startX);
    let h = dragState.originH + (e.clientY - dragState.startY);
    if (byId('snapToggle').checked) { w = snap(w); h = snap(h); }
    el.width = Math.max(20, w);
    el.height = Math.max(20, h);
    if (el.type === 'circle') el.radius = 999;
  }
  renderCanvas();
  renderSelectionPanel();
}

function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove);
  dragState = null;
  markDirty();
  autoSave();
  pushHistory();
}

function updateCardCounter() {
  if (!els.cardCounter) return;
  const count = state.cards?.length || 0;
  els.cardCounter.textContent = `${count} carte${count > 1 ? 's' : ''}`;
}

function updateCardName() {
  const card = getCurrentCard();
  card.name = els.cardNameInput.value || 'Carte sans nom';
  touch();
}

function updateCardDimensions() {
  const card = getCurrentCard();
  card.width = +els.cardWidthInput.value;
  card.height = +els.cardHeightInput.value;
  touch();
}

function updateCardBackground() {
  const bg = getCurrentSide().background;
  bg.color = els.cardBgInput.value;
  bg.opacity = parseFloat(els.cardBgOpacityInput.value);
  touch();
}

function updateSelectedProp(prop, rawValue) {
  const el = getSelectedElement();
  if (!el) return;
  let value = rawValue;
  if (['x','y','width','height','rotation','fontSize','borderWidth','radius'].includes(prop)) value = +value;
  if (['opacity'].includes(prop)) value = parseFloat(value);
  el[prop] = value;
  if (prop === 'width' || prop === 'height') {
    el[prop] = Math.max(0, value);
  }
  touch();
}

function toggleSelectedStyle(prop, onValue, offValue) {
  const el = getSelectedElement();
  if (!el) return;
  el[prop] = el[prop] === onValue ? offValue : onValue;
  touch();
}

function toggleLockSelected() {
  const el = getSelectedElement();
  if (!el) return;
  el.locked = !el.locked;
  touch();
}

function centerSelectedElement() {
  const el = getSelectedElement();
  if (!el) return;
  const card = getCurrentCard();
  el.x = Math.round((card.width - el.width) / 2);
  el.y = Math.round((card.height - el.height) / 2);
  touch();
}

function reorderSelected(where) {
  const elements = getCurrentElements();
  const el = getSelectedElement();
  if (!el) return;
  if (where === 'front') el.zIndex = Math.max(...elements.map(e => e.zIndex || 1)) + 1;
  else el.zIndex = 0;
  normalizeZIndices();
  touch();
}

function normalizeZIndices() {
  const elements = getCurrentElements();
  elements.sort((a,b)=>(a.zIndex||0)-(b.zIndex||0)).forEach((el, i) => el.zIndex = i + 1);
}

function duplicateSelectedElement() {
  const el = getSelectedElement();
  if (!el) return;
  const copy = structuredClone(el);
  copy.id = uid();
  copy.name = (copy.name || copy.type) + ' copie';
  copy.x += 20; copy.y += 20; copy.zIndex += 1;
  getCurrentElements().push(copy);
  selectedElementId = copy.id;
  normalizeZIndices();
  touch();
}

function deleteSelectedElement() {
  if (!selectedElementId) return;
  const elements = getCurrentElements();
  const idx = elements.findIndex(el => el.id === selectedElementId);
  if (idx >= 0) elements.splice(idx, 1);
  selectedElementId = null;
  touch();
}

function handleKeyDown(e) {
  const tag = document.activeElement?.tagName;
  const typing = ['INPUT','TEXTAREA','SELECT'].includes(tag);
  if (!typing && (e.key === 'Delete' || e.key === 'Backspace')) {
    if (selectedElementId) { e.preventDefault(); deleteSelectedElement(); }
  }
  if (!typing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelectedElement(); }
  if (!typing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveCurrentDeck({ notify: true }); }
  if (!typing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  if (!typing && selectedElementId) {
    const el = getSelectedElement();
    if (!el || el.locked) return;
    let moved = false;
    if (e.key === 'ArrowLeft') { el.x = clamp(el.x - (e.shiftKey ? 10 : 1), 0, getCurrentCard().width - el.width); moved = true; }
    if (e.key === 'ArrowRight') { el.x = clamp(el.x + (e.shiftKey ? 10 : 1), 0, getCurrentCard().width - el.width); moved = true; }
    if (e.key === 'ArrowUp') { el.y = clamp(el.y - (e.shiftKey ? 10 : 1), 0, getCurrentCard().height - el.height); moved = true; }
    if (e.key === 'ArrowDown') { el.y = clamp(el.y + (e.shiftKey ? 10 : 1), 0, getCurrentCard().height - el.height); moved = true; }
    if (moved) { e.preventDefault(); markDirty(); renderAll(); autoSave(); }
  }
}

function touch(push = true) {
  markDirty();
  renderAll();
  autoSave();
  if (push) pushHistory();
}
function markDirty(saved = false, message) {
  els.saveStatus.textContent = message || (saved ? 'Sauvegardé' : 'NON SAUVEGARDÉ');
  els.saveStatus.classList.toggle('is-saved', !!saved);
  els.saveStatus.classList.toggle('is-dirty', !saved);
  els.saveStatus.classList.remove('is-error');
}
async function saveCurrentDeck({ notify = false } = {}) {
  state.updatedAt = new Date().toISOString();
  const clone = structuredClone(state);
  try {
    if (clone.persistLocal === false) {
      await dbDeleteDeck(clone.id);
      localStorage.removeItem(CURRENT_KEY);
      if (notify) {
        els.saveStatus.textContent = 'Deck non conservé dans le navigateur';
        els.saveStatus.classList.add('is-dirty');
      }
      await renderSavedDecks();
      return true;
    }
    await dbPutDeck(clone);
    localStorage.setItem(CURRENT_KEY, state.id);
    if (notify) markDirty(true);
    else {
      els.saveStatus.textContent = 'Sauvegarde auto';
      els.saveStatus.classList.add('is-saved');
      els.saveStatus.classList.remove('is-dirty', 'is-error');
    }
    await renderSavedDecks();
    return true;
  } catch (error) {
    console.error(error);
    els.saveStatus.textContent = 'Échec de sauvegarde';
    els.saveStatus.classList.add('is-error');
    els.saveStatus.classList.remove('is-saved');
    if (notify) alert('La sauvegarde navigateur a échoué. Le JSON reste disponible pour exporter le deck.');
    return false;
  }
}
function autoSave() {
  if (state.persistLocal === false) return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => saveCurrentDeck({ notify: false }), AUTO_SAVE_DELAY);
}

function fitCardToView() {
  const stage = els.cardStage || byId('cardStage');
  const wrap = els.canvasWrap;
  const card = getCurrentCard();
  if (!stage || !wrap || !card) return;
  const availableW = Math.max(240, wrap.clientWidth - 56);
  const availableH = Math.max(240, wrap.clientHeight - 56);
  const scale = Math.min(1, availableW / card.width, availableH / card.height);
  stage.style.transform = `scale(${Math.max(0.45, scale)})`;
}
async function getAllDecks() {
  const decks = await dbGetAllDecks();
  return decks.sort((a,b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

async function renderSavedDecks() {
  const wrap = byId('savedDecks');
  const decks = await getAllDecks();
  wrap.innerHTML = '';
  if (!decks.length) {
    wrap.innerHTML = `<div class="deck-card glass"><h3>Aucun deck</h3><p>Crée ton premier deck ou importe un JSON.</p></div>`;
    return;
  }
  decks.forEach(deck => {
    const card = document.createElement('div');
    card.className = 'deck-card glass';
    card.innerHTML = `<h3>${escapeHtml(deck.name || 'Sans nom')}</h3><small>${deck.cards?.length || 0} carte(s) · ${formatDate(deck.updatedAt)}</small>
      <div class="hero-actions">
        <button class="btn tiny primary">Ouvrir</button>
        <button class="btn tiny secondary">Dupliquer</button>
        <button class="btn tiny danger">Supprimer</button>
      </div>`;
    const [openBtn, dupBtn, delBtn] = card.querySelectorAll('button');
    openBtn.addEventListener('click', async () => {
      const fresh = await getDeckById(deck.id);
      if (fresh) loadDeck(fresh);
    });
    dupBtn.addEventListener('click', () => duplicateDeck(deck.id));
    delBtn.addEventListener('click', () => deleteDeck(deck.id));
    wrap.appendChild(card);
  });
}

function loadDeck(deck, silent = false) {
  state = structuredClone(deck);
  if (typeof state.persistLocal !== 'boolean') state.persistLocal = true;
  if (!state.currentCardId && state.cards?.length) state.currentCardId = state.cards[0].id;
  enterEditor();
  if (!silent) markDirty(true);
  pushHistory(true);
}
async function duplicateDeck(id) {
  const source = await getDeckById(id);
  if (!source) return;
  const copy = structuredClone(source);
  copy.id = uid();
  copy.name = (copy.name || 'Deck') + ' copie';
  copy.updatedAt = new Date().toISOString();
  copy.persistLocal = true;
  copy.cards.forEach(card => {
    card.id = uid();
    Object.values(card.sides).forEach(side => side.elements.forEach(el => el.id = uid()));
  });
  await dbPutDeck(copy);
  await renderSavedDecks();
}
async function deleteDeck(id, { silent = false } = {}) {
  await dbDeleteDeck(id);
  if (localStorage.getItem(CURRENT_KEY) === id) localStorage.removeItem(CURRENT_KEY);
  if (!silent) renderSavedDecks();
}

function exportJSON() {
  downloadBlob(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), `${safeName(state.name)}.json`);
}

async function exportImage(type = 'png') {
  const { node } = await createExportSnapshot(getCurrentCard(), state.currentSide);
  try {
    const canvas = await html2canvas(node, buildCaptureOptions(type === 'jpeg' ? '#ffffff' : null));
    canvas.toBlob(
      blob => downloadBlob(blob, `${safeName(state.name)}-${getCurrentCard().name}-${state.currentSide}.${type === 'png' ? 'png' : 'jpg'}`),
      `image/${type === 'png' ? 'png' : 'jpeg'}`,
      0.95
    );
  } finally {
    node.remove();
  }
}

async function exportPDF() {
  const originalCardId = state.currentCardId;
  const originalSide = state.currentSide;
  selectedElementId = null;
  renderAll();
  const pages = [];
  for (let c = 0; c < state.cards.length; c++) {
    const card = state.cards[c];
    for (const side of ['front', 'back']) {
      const { node } = await createExportSnapshot(card, side);
      try {
        const canvas = await html2canvas(node, buildCaptureOptions('#ffffff'));
        pages.push({
          width: card.width,
          height: card.height,
          img: canvas.toDataURL('image/png')
        });
      } finally {
        node.remove();
      }
    }
  }
  if (!pages.length) return;
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: pages[0].width >= pages[0].height ? 'landscape' : 'portrait', unit: 'px', format: [pages[0].width, pages[0].height] });
  pages.forEach((page, index) => {
    if (index > 0) {
      pdf.addPage([page.width, page.height], page.width >= page.height ? 'landscape' : 'portrait');
    }
    pdf.addImage(page.img, 'PNG', 0, 0, page.width, page.height, undefined, 'FAST');
  });
  pdf.save(`${safeName(state.name)}.pdf`);
  state.currentCardId = originalCardId;
  state.currentSide = originalSide;
  renderAll();
}

async function createExportSnapshot(card, sideName) {
  await waitForFontsAndImages();
  const liveCanvas = els.cardCanvas;
  const originalCardId = state.currentCardId;
  const originalSide = state.currentSide;
  state.currentCardId = card.id;
  state.currentSide = sideName;
  renderCanvas();
  const clone = liveCanvas.cloneNode(true);
  clone.classList.remove('flip-anim');
  clone.classList.add('export-snapshot');
  clone.querySelectorAll('.resize-handle').forEach(node => node.remove());
  clone.querySelectorAll('.canvas-element').forEach(node => {
    node.classList.remove('selected', 'locked');
  });
  const holder = document.createElement('div');
  holder.className = 'export-host';
  holder.appendChild(clone);
  document.body.appendChild(holder);
  await waitForImagesInNode(clone);
  await waitTwoFrames();
  state.currentCardId = originalCardId;
  state.currentSide = originalSide;
  renderCanvas();
  return { node: holder, canvas: clone };
}

function buildCaptureOptions(backgroundColor = null) {
  return {
    backgroundColor,
    useCORS: true,
    scale: Math.max(2, window.devicePixelRatio || 1),
    logging: false,
    imageTimeout: 15000,
    removeContainer: true,
    width: undefined,
    height: undefined,
    onclone: clonedDoc => {
      clonedDoc.body.classList.add('is-exporting');
    }
  };
}

function importJSON(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  file.text().then(text => {
    try {
      const data = JSON.parse(text);
      if (!data.cards || !Array.isArray(data.cards)) throw new Error('Format invalide');
      if (typeof data.persistLocal !== 'boolean') data.persistLocal = true;
      loadDeck(data);
    } catch {
      alert('JSON invalide.');
    }
    e.target.value = '';
  });
}

function applyCardModel(model) {
  const card = getCurrentCard();
  const side = getCurrentSide();
  const presets = {
    character: { title: 'Nom du personnage', subtitle: 'Classe / rôle', footer: 'PV 10  •  ATQ 3  •  DEF 2', color: '#77a8ff' },
    boss: { title: 'Boss légendaire', subtitle: 'Capacité spéciale', footer: 'PV 30  •  ATQ 8  •  Rage', color: '#ff6d7d' },
    item: { title: 'Objet rare', subtitle: 'Effet immédiat ou équipement', footer: 'Coût 2  •  Usage unique', color: '#f2d28a' },
    spell: { title: 'Sort', subtitle: 'Description de l’effet magique', footer: 'Mana 3  •  Portée 2', color: '#a66cff' },
  };
  const preset = presets[model] || presets.character;
  side.elements = side.elements.filter(el => !el.generatedModel);
  side.elements.push({ ...baseElement('text'), generatedModel: true, name: 'Titre modèle', text: preset.title, x: 34, y: 34, width: card.width - 68, height: 58, fontSize: 30, fontFamily: model === 'spell' ? 'Cinzel' : 'Inter', color: preset.color, textAlign: 'center', fontWeight: '700' });
  side.elements.push({ ...baseElement('frame'), generatedModel: true, name: 'Cadre illustration', x: 40, y: 112, width: card.width - 80, height: Math.round(card.height * .42), color: 'transparent', borderColor: preset.color, borderWidth: 4, radius: 22 });
  side.elements.push({ ...baseElement('text'), generatedModel: true, name: 'Texte modèle', text: preset.subtitle, x: 44, y: Math.round(card.height * .61), width: card.width - 88, height: 110, fontSize: 22, fontFamily: 'Inter', color: '#f8fbff', textAlign: 'center' });
  side.elements.push({ ...baseElement('text'), generatedModel: true, name: 'Stats modèle', text: preset.footer, x: 34, y: card.height - 82, width: card.width - 68, height: 42, fontSize: 18, fontFamily: 'Inter', color: preset.color, textAlign: 'center', fontWeight: '700' });
  normalizeZIndices();
  touch();
}

function applyTheme(theme) {
  const side = getCurrentSide();
  const map = {
    classic: { color: '#1f120b', opacity: 1, image: null, style: 'plain', accents: ['#e6c282','#6b4625'] },
    neon: { color: '#071326', opacity: 1, image: null, style: 'plain', accents: ['#4cc9f0','#d946ef'] },
    mystic: { color: '#22153e', opacity: 1, image: null, style: 'plain', accents: ['#b794f4','#f0abfc'] },
    ember: { color: '#2f110d', opacity: 1, image: null, style: 'plain', accents: ['#fb923c','#facc15'] },
    ocean: { color: '#0b2942', opacity: 1, image: null, style: 'plain', accents: ['#67e8f9','#22c55e'] },
    minimal: { color: '#f3f5f8', opacity: 1, image: null, style: 'plain', accents: ['#d1d5db','#111827'] },
    parchment: { color: '#c99252', opacity: 1, image: null, style: 'parchment', accents: ['#4b2410','#f6d58a'] },
    noir: { color: '#08080b', opacity: 1, image: null, style: 'noir', accents: ['#d6b25e','#f8f1d2'] },
    runes: { color: '#102a2e', opacity: 1, image: null, style: 'runes', accents: ['#9fffe1','#77a8ff'] },
  };
  const conf = map[theme];
  side.background.color = conf.color;
  side.background.style = conf.style || 'plain';
  if (!side.elements.length) {
    side.elements.push({ ...baseElement('frame'), color:'transparent', borderColor: conf.accents[0], borderWidth: 10, width: getCurrentCard().width-40, height:getCurrentCard().height-40, x:20, y:20, radius: 24, name: 'Cadre thème' });
    side.elements.push({ ...baseElement('text'), text: state.name, x: 36, y: 28, width: getCurrentCard().width-72, height: 52, fontSize: 32, fontFamily: theme === 'classic' || theme === 'parchment' ? 'Cinzel' : theme === 'neon' ? 'Orbitron' : theme === 'noir' ? 'Playfair Display' : 'Inter', color: conf.accents[0], textAlign:'center', name:'Titre thème' });
    if (['parchment','noir','runes'].includes(theme)) {
      side.elements.push({ ...baseElement('badge'), x: Math.round(getCurrentCard().width/2 - 45), y: getCurrentCard().height - 120, width: 90, height: 90, color: conf.accents[1], opacity: .75, name: 'Symbole décoratif' });
    }
  }
  touch();
}

function pushHistory(reset = false) {
  const snapshot = JSON.stringify(state);
  if (reset) {
    history = [snapshot]; historyIndex = 0; return;
  }
  if (history[historyIndex] === snapshot) return;
  history = history.slice(0, historyIndex + 1);
  history.push(snapshot);
  if (history.length > 80) history.shift();
  historyIndex = history.length - 1;
}
function undo() {
  if (historyIndex <= 0) return;
  historyIndex -= 1;
  state = JSON.parse(history[historyIndex]);
  selectedElementId = null;
  renderAll();
}
function redo() {
  if (historyIndex >= history.length - 1) return;
  historyIndex += 1;
  state = JSON.parse(history[historyIndex]);
  selectedElementId = null;
  renderAll();
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function snap(n) { return Math.round(n / GRID_SIZE) * GRID_SIZE; }
function formatDate(iso) { try { return new Date(iso).toLocaleString('fr-FR'); } catch { return ''; } }
function safeName(name) { return (name || 'deck').replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, ''); }
function normalizeHex(hex) {
  if (!hex || !hex.startsWith('#')) return '#000000';
  if (hex.length === 4) return '#' + [...hex.slice(1)].map(c => c+c).join('');
  return hex.slice(0,7);
}
function rgbaFromHex(hex, opacity = 1) {
  hex = normalizeHex(hex);
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
function downloadBlob(blob, filename) {
  if (!blob) return;
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function escapeHtml(str) {
  return (str || '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
}

async function waitForFontsAndImages() {
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch {}
  }
  await waitForImagesInNode(document);
  await waitTwoFrames();
}

function waitForImagesInNode(root) {
  const images = [...root.querySelectorAll ? root.querySelectorAll('img') : []];
  const backgroundNodes = [...(root.querySelectorAll ? root.querySelectorAll('*') : [])].filter(node => {
    const bg = getComputedStyle(node).backgroundImage;
    return bg && bg !== 'none';
  });
  const promises = images.map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise(resolve => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
      setTimeout(resolve, 4000);
    });
  });
  backgroundNodes.forEach(node => {
    const bg = getComputedStyle(node).backgroundImage;
    const match = /url\(["']?(.*?)["']?\)/.exec(bg);
    if (!match?.[1]) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = match[1];
    promises.push(new Promise(resolve => {
      if (img.complete) return resolve();
      img.onload = img.onerror = () => resolve();
      setTimeout(resolve, 4000);
    }));
  });
  return Promise.all(promises);
}

function waitTwoFrames() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_DECKS)) {
        db.createObjectStore(STORE_DECKS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function dbGetAllDecks() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DECKS, 'readonly');
    const store = tx.objectStore(STORE_DECKS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function getDeckById(id) {
  if (!id) return null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DECKS, 'readonly');
    const store = tx.objectStore(STORE_DECKS);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function dbPutDeck(deck) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DECKS, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('db write failed'));
    tx.objectStore(STORE_DECKS).put(deck);
  });
}

async function dbDeleteDeck(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DECKS, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('db delete failed'));
    tx.objectStore(STORE_DECKS).delete(id);
  });
}

async function migrateLegacyStorage() {
  if (localStorage.getItem(META_MIGRATED_KEY) === '1') return;
  let legacyDecks = [];
  try {
    legacyDecks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    legacyDecks = [];
  }
  if (Array.isArray(legacyDecks) && legacyDecks.length) {
    for (const deck of legacyDecks) {
      if (typeof deck.persistLocal !== 'boolean') deck.persistLocal = true;
      await dbPutDeck(deck);
    }
  }
  localStorage.setItem(META_MIGRATED_KEY, '1');
}
