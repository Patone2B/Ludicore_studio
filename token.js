(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('tokenCanvas');
  if (!canvas) { console.error('Canvas #tokenCanvas introuvable.'); return; }
  const ctx = canvas.getContext('2d');

  const ui = {
    shapeSelect: $('shapeSelect'), colorPicker: $('colorPicker'), lineWidth: $('lineWidth'), lineWidthValue: $('lineWidthValue'),
    textInput: $('textInput'), addText: $('addText'), imageUpload: $('imageUpload'), imageScale: $('imageScale'), imageScaleValue: $('imageScaleValue'),
    bringImageFront: $('bringImageFront'), sendImageBack: $('sendImageBack'), removeImage: $('removeImage'), clearCanvas: $('clearCanvas'),
    saveLocal: $('saveLocal'), loadLocal: $('loadLocal'), importJSON: $('importJSON'), exportJSON: $('exportJSON'), exportPNG: $('exportPNG'),
    undoBtn: $('undoBtn'), redoBtn: $('redoBtn'), undoBtnMobile: $('undoBtnMobile'), redoBtnMobile: $('redoBtnMobile'),
    mode2dBtn: $('mode2dBtn'), mode3dBtn: $('mode3dBtn'), editor2d: $('editor2d'), editor3d: $('editor3d'),
    selected2dType: $('selected2dType'), selected2dX: $('selected2dX'), selected2dXValue: $('selected2dXValue'), selected2dY: $('selected2dY'), selected2dYValue: $('selected2dYValue'),
    selected2dSize: $('selected2dSize'), selected2dSizeValue: $('selected2dSizeValue'), duplicate2d: $('duplicate2d'), delete2d: $('delete2d'),
    primitiveSelect: $('primitiveSelect'), meshColor: $('meshColor'), addPrimitive: $('addPrimitive'), duplicateMesh: $('duplicateMesh'), deleteMesh: $('deleteMesh'),
    transformMode: $('transformMode'), snapMove: $('snapMove'), snapMoveValue: $('snapMoveValue'), snapRotate: $('snapRotate'), snapRotateValue: $('snapRotateValue'),
    extrudeDepth: $('extrudeDepth'), extrudeDepthValue: $('extrudeDepthValue'), bevelSize: $('bevelSize'), bevelSizeValue: $('bevelSizeValue'),
    bevelSegments: $('bevelSegments'), bevelSegmentsValue: $('bevelSegmentsValue'), applyExtrude: $('applyExtrude'), scale3d: $('scale3d'), scale3dValue: $('scale3dValue'),
    rotateY3d: $('rotateY3d'), rotateY3dValue: $('rotateY3dValue'), centerMesh: $('centerMesh'), reset3dView: $('reset3dView'),
    threeViewport: $('threeViewport'), threePlaceholder: $('three-placeholder'), toggleGrid: $('toggleGrid'), focusSelection: $('focusSelection'),
    objectName: $('objectName'), objectList: $('objectList'), text3dInput: $('text3dInput'), text3dSize: $('text3dSize'), text3dSizeValue: $('text3dSizeValue'), addText3d: $('addText3d'), toggleBevelClick: $('toggleBevelClick')
  };

  const deepClone = (v) => JSON.parse(JSON.stringify(v));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const state2D = {
    tool: 'pencil', drawing: false, startX: 0, startY: 0, currentStroke: null, items: [], background: null,
    dragImage: false, dragOffsetX: 0, dragOffsetY: 0, history: [], future: [], selectedIndex: -1, dragItem: false
  };

  const make2DSnap = () => ({ items: deepClone(state2D.items), background: deepClone(state2D.background) });
  function push2DHistory() {
    state2D.history.push(make2DSnap());
    if (state2D.history.length > 100) state2D.history.shift();
    state2D.future = [];
  }
  function restore2D(snap) {
    state2D.items = Array.isArray(snap?.items) ? deepClone(snap.items) : [];
    state2D.background = snap?.background ? deepClone(snap.background) : null;
    state2D.currentStroke = null;
    state2D.selectedIndex = -1;
    syncImageScaleSlider();
    syncSelected2DPanel();
    redraw2D();
  }
  function undo2D() { if (!state2D.history.length) return; state2D.future.push(make2DSnap()); restore2D(state2D.history.pop()); }
  function redo2D() { if (!state2D.future.length) return; state2D.history.push(make2DSnap()); restore2D(state2D.future.pop()); }

  function pointerPos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
  }

  function drawPath(item) {
    const p = item.path || []; if (!p.length) return;
    ctx.save();
    ctx.beginPath(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = Number(item.lineWidth) || 1;
    ctx.strokeStyle = item.type === 'eraser' ? '#ffffff' : item.color;
    ctx.moveTo(p[0].x, p[0].y);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
    ctx.stroke(); ctx.restore();
  }

  function getItemBounds(item) {
    if (!item) return null;
    switch (item.type) {
      case 'square': {
        const x = item.width < 0 ? item.x + item.width : item.x;
        const y = item.height < 0 ? item.y + item.height : item.y;
        return { x, y, width: Math.abs(item.width), height: Math.abs(item.height), cx: x + Math.abs(item.width)/2, cy: y + Math.abs(item.height)/2 };
      }
      case 'circle':
        return { x: item.x - item.radius, y: item.y - item.radius, width: item.radius * 2, height: item.radius * 2, cx: item.x, cy: item.y };
      case 'line': {
        const x = Math.min(item.startX, item.endX), y = Math.min(item.startY, item.endY);
        const width = Math.max(6, Math.abs(item.endX - item.startX)), height = Math.max(6, Math.abs(item.endY - item.startY));
        return { x, y, width, height, cx: x + width/2, cy: y + height/2 };
      }
      case 'text': {
        const size = item.size || 28;
        const width = Math.max(40, (item.text || '').length * size * 0.6);
        return { x: item.x, y: item.y - size, width, height: size * 1.2, cx: item.x + width/2, cy: item.y - size/2 };
      }
      case 'pencil':
      case 'eraser': {
        const path = item.path || []; if (!path.length) return null;
        let minX = path[0].x, maxX = path[0].x, minY = path[0].y, maxY = path[0].y;
        path.forEach((pt) => { minX = Math.min(minX, pt.x); maxX = Math.max(maxX, pt.x); minY = Math.min(minY, pt.y); maxY = Math.max(maxY, pt.y); });
        const pad = (item.lineWidth || 1) + 4;
        return { x: minX - pad, y: minY - pad, width: (maxX - minX) + pad*2, height: (maxY - minY) + pad*2, cx: (minX+maxX)/2, cy: (minY+maxY)/2 };
      }
      default: return null;
    }
  }

  function moveItem(item, dx, dy) {
    if (!item) return;
    switch (item.type) {
      case 'square': item.x += dx; item.y += dy; break;
      case 'circle': item.x += dx; item.y += dy; break;
      case 'line': item.startX += dx; item.endX += dx; item.startY += dy; item.endY += dy; break;
      case 'text': item.x += dx; item.y += dy; break;
      case 'pencil':
      case 'eraser': (item.path || []).forEach((pt) => { pt.x += dx; pt.y += dy; }); break;
    }
  }

  function scaleItem(item, ratio) {
    if (!item || ratio <= 0) return;
    const b = getItemBounds(item); if (!b) return;
    switch (item.type) {
      case 'square': item.width *= ratio; item.height *= ratio; break;
      case 'circle': item.radius = Math.max(2, item.radius * ratio); break;
      case 'line': {
        const cx = (item.startX + item.endX) / 2, cy = (item.startY + item.endY) / 2;
        item.startX = cx + (item.startX - cx) * ratio; item.endX = cx + (item.endX - cx) * ratio;
        item.startY = cy + (item.startY - cy) * ratio; item.endY = cy + (item.endY - cy) * ratio;
        break;
      }
      case 'text': item.size = Math.max(10, item.size * ratio); break;
      case 'pencil':
      case 'eraser': {
        (item.path || []).forEach((pt) => { pt.x = b.cx + (pt.x - b.cx) * ratio; pt.y = b.cy + (pt.y - b.cy) * ratio; });
        item.lineWidth = Math.max(1, (item.lineWidth || 1) * ratio);
        break;
      }
    }
  }

  function hitTestItem(item, x, y) {
    const b = getItemBounds(item); if (!b) return false;
    return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
  }

  function getTopItemIndexAt(x, y) {
    for (let i = state2D.items.length - 1; i >= 0; i--) if (hitTestItem(state2D.items[i], x, y)) return i;
    return -1;
  }

  function drawSelection2D() {
    if (state2D.selectedIndex < 0) return;
    const item = state2D.items[state2D.selectedIndex];
    const b = getItemBounds(item); if (!b) return;
    ctx.save();
    ctx.setLineDash([8, 5]);
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x - 4, b.y - 4, b.width + 8, b.height + 8);
    ctx.restore();
  }

  function drawItem(item) {
    if (!item) return;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = item.color || '#000'; ctx.fillStyle = item.color || '#000';
    ctx.lineWidth = Number(item.lineWidth) || 1;
    switch (item.type) {
      case 'pencil': case 'eraser': drawPath(item); break;
      case 'circle': ctx.beginPath(); ctx.arc(item.x, item.y, Math.max(1, item.radius || 0), 0, Math.PI * 2); ctx.stroke(); break;
      case 'square': {
        const x = item.width < 0 ? item.x + item.width : item.x;
        const y = item.height < 0 ? item.y + item.height : item.y;
        ctx.strokeRect(x, y, Math.abs(item.width), Math.abs(item.height)); break;
      }
      case 'line': ctx.beginPath(); ctx.moveTo(item.startX, item.startY); ctx.lineTo(item.endX, item.endY); ctx.stroke(); break;
      case 'text': ctx.font = `${item.size || 28}px Arial`; ctx.fillText(item.text || '', item.x || 0, item.y || 0); break;
    }
    ctx.restore();
  }

  const loadImage = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  async function drawBackground() {
    const bg = state2D.background; if (!bg?.src) return;
    try { ctx.drawImage(await loadImage(bg.src), bg.x, bg.y, bg.width, bg.height); } catch (e) { console.error(e); }
  }

  async function redraw2D() {
    canvas.classList.toggle('select-mode', (ui.shapeSelect?.value || 'pencil') === 'select');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (state2D.background?.layer === 'back') await drawBackground();
    state2D.items.forEach(drawItem);
    if (state2D.currentStroke) drawItem(state2D.currentStroke);
    if (state2D.background?.layer === 'front') await drawBackground();
    drawSelection2D();
  }

  function syncLineWidthLabel() { if (ui.lineWidth && ui.lineWidthValue) ui.lineWidthValue.textContent = `${ui.lineWidth.value} px`; }
  function syncImageScaleSlider() {
    if (!ui.imageScale || !ui.imageScaleValue) return;
    if (!state2D.background?.naturalWidth) { ui.imageScale.value = 100; ui.imageScaleValue.textContent = '100 %'; return; }
    const v = clamp(Math.round((state2D.background.width / state2D.background.naturalWidth) * 100), 10, 250);
    ui.imageScale.value = v; ui.imageScaleValue.textContent = `${v} %`;
  }
  function pointInBG(x, y) {
    const b = state2D.background;
    return !!b && x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
  }

  function syncSelected2DPanel() {
    const item = state2D.items[state2D.selectedIndex];
    if (!item) {
      if (ui.selected2dType) ui.selected2dType.value = 'Aucun';
      if (ui.selected2dX) ui.selected2dX.value = 0;
      if (ui.selected2dY) ui.selected2dY.value = 0;
      if (ui.selected2dSize) ui.selected2dSize.value = 100;
      if (ui.selected2dXValue) ui.selected2dXValue.textContent = '0 px';
      if (ui.selected2dYValue) ui.selected2dYValue.textContent = '0 px';
      if (ui.selected2dSizeValue) ui.selected2dSizeValue.textContent = '100 %';
      return;
    }
    const b = getItemBounds(item);
    if (ui.selected2dType) ui.selected2dType.value = item.type;
    if (ui.selected2dX && b) { ui.selected2dX.value = Math.round(b.cx); ui.selected2dXValue.textContent = `${Math.round(b.cx)} px`; }
    if (ui.selected2dY && b) { ui.selected2dY.value = Math.round(b.cy); ui.selected2dYValue.textContent = `${Math.round(b.cy)} px`; }
    if (ui.selected2dSize) { ui.selected2dSize.value = 100; ui.selected2dSizeValue.textContent = '100 %'; }
  }

  canvas.addEventListener('mousedown', (e) => {
    const pos = pointerPos(e);
    state2D.tool = ui.shapeSelect?.value || 'pencil';

    if (state2D.tool === 'select') {
      const hit = getTopItemIndexAt(pos.x, pos.y);
      state2D.selectedIndex = hit;
      syncSelected2DPanel();
      redraw2D();
      if (hit >= 0) {
        push2DHistory();
        state2D.dragItem = true;
        state2D.startX = pos.x; state2D.startY = pos.y;
        canvas.classList.add('dragging');
        return;
      }
      if (state2D.background && pointInBG(pos.x, pos.y)) {
        push2DHistory();
        state2D.dragImage = true;
        state2D.dragOffsetX = pos.x - state2D.background.x;
        state2D.dragOffsetY = pos.y - state2D.background.y;
        canvas.classList.add('dragging');
        return;
      }
      return;
    }

    if (state2D.background && pointInBG(pos.x, pos.y)) {
      state2D.dragImage = true; state2D.dragOffsetX = pos.x - state2D.background.x; state2D.dragOffsetY = pos.y - state2D.background.y;
      push2DHistory(); return;
    }

    push2DHistory();
    state2D.selectedIndex = -1;
    syncSelected2DPanel();
    state2D.drawing = true; state2D.startX = pos.x; state2D.startY = pos.y;
    if (state2D.tool === 'pencil' || state2D.tool === 'eraser') {
      state2D.currentStroke = { type: state2D.tool, color: ui.colorPicker?.value || '#000', lineWidth: Number(ui.lineWidth?.value || 4), path: [pos] };
      redraw2D();
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const pos = pointerPos(e);
    if (state2D.dragItem && state2D.selectedIndex >= 0) {
      const dx = pos.x - state2D.startX, dy = pos.y - state2D.startY;
      moveItem(state2D.items[state2D.selectedIndex], dx, dy);
      state2D.startX = pos.x; state2D.startY = pos.y;
      syncSelected2DPanel(); redraw2D(); return;
    }
    if (state2D.dragImage && state2D.background) {
      state2D.background.x = pos.x - state2D.dragOffsetX; state2D.background.y = pos.y - state2D.dragOffsetY; redraw2D(); return;
    }
    if (!state2D.drawing) return;
    if (state2D.currentStroke) { state2D.currentStroke.path.push(pos); redraw2D(); return; }
    const preview = { color: ui.colorPicker?.value || '#000', lineWidth: Number(ui.lineWidth?.value || 4) };
    if (state2D.tool === 'circle') state2D.currentStroke = { type: 'circle', x: state2D.startX, y: state2D.startY, radius: Math.hypot(pos.x - state2D.startX, pos.y - state2D.startY), ...preview };
    else if (state2D.tool === 'square') state2D.currentStroke = { type: 'square', x: state2D.startX, y: state2D.startY, width: pos.x - state2D.startX, height: pos.y - state2D.startY, ...preview };
    else if (state2D.tool === 'line') state2D.currentStroke = { type: 'line', startX: state2D.startX, startY: state2D.startY, endX: pos.x, endY: pos.y, ...preview };
    redraw2D();
  });

  window.addEventListener('mouseup', () => {
    canvas.classList.remove('dragging');
    if (state2D.dragImage) { state2D.dragImage = false; redraw2D(); return; }
    if (state2D.dragItem) { state2D.dragItem = false; redraw2D(); return; }
    if (!state2D.drawing) return;
    state2D.drawing = false;
    if (state2D.currentStroke) {
      state2D.items.push(deepClone(state2D.currentStroke));
      state2D.selectedIndex = state2D.items.length - 1;
      state2D.currentStroke = null;
      syncSelected2DPanel();
      redraw2D();
    }
  });

  if (ui.lineWidth) ui.lineWidth.addEventListener('input', syncLineWidthLabel);
  if (ui.imageScale) ui.imageScale.addEventListener('input', () => {
    ui.imageScaleValue.textContent = `${ui.imageScale.value} %`;
    if (!state2D.background?.naturalWidth) return;
    push2DHistory();
    const cx = state2D.background.x + state2D.background.width / 2;
    const cy = state2D.background.y + state2D.background.height / 2;
    const r = Number(ui.imageScale.value) / 100;
    state2D.background.width = state2D.background.naturalWidth * r;
    state2D.background.height = state2D.background.naturalHeight * r;
    state2D.background.x = cx - state2D.background.width / 2;
    state2D.background.y = cy - state2D.background.height / 2;
    redraw2D();
  });

  if (ui.addText) ui.addText.addEventListener('click', () => {
    const v = ui.textInput?.value.trim() || ''; if (!v) return;
    push2DHistory();
    state2D.items.push({ type: 'text', text: v, x: 60, y: 60, size: 30, color: ui.colorPicker?.value || '#000', lineWidth: 1 });
    state2D.selectedIndex = state2D.items.length - 1;
    ui.textInput.value = '';
    syncSelected2DPanel(); redraw2D();
  });

  if (ui.imageUpload) ui.imageUpload.addEventListener('change', () => {
    const file = ui.imageUpload.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        push2DHistory();
        const ratio = Math.min((canvas.width * 0.7) / img.width, (canvas.height * 0.7) / img.height, 1);
        const w = img.width * ratio, h = img.height * ratio;
        state2D.background = { src: reader.result, x: (canvas.width - w) / 2, y: (canvas.height - h) / 2, width: w, height: h, naturalWidth: img.width, naturalHeight: img.height, layer: 'back' };
        syncImageScaleSlider(); redraw2D(); ui.imageUpload.value = '';
      };
      img.onerror = () => alert('Impossible de charger cette image.');
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  if (ui.bringImageFront) ui.bringImageFront.addEventListener('click', () => { if (!state2D.background) return; push2DHistory(); state2D.background.layer = 'front'; redraw2D(); });
  if (ui.sendImageBack) ui.sendImageBack.addEventListener('click', () => { if (!state2D.background) return; push2DHistory(); state2D.background.layer = 'back'; redraw2D(); });
  if (ui.removeImage) ui.removeImage.addEventListener('click', () => { if (!state2D.background) return; push2DHistory(); state2D.background = null; syncImageScaleSlider(); redraw2D(); });
  if (ui.clearCanvas) ui.clearCanvas.addEventListener('click', () => { push2DHistory(); state2D.items = []; state2D.background = null; state2D.currentStroke = null; state2D.selectedIndex = -1; syncImageScaleSlider(); syncSelected2DPanel(); redraw2D(); });
  if (ui.saveLocal) ui.saveLocal.addEventListener('click', () => { localStorage.setItem('tokenData', JSON.stringify(make2DSnap())); alert('Projet 2D sauvegardé !'); });
  if (ui.loadLocal) ui.loadLocal.addEventListener('click', () => { const raw = localStorage.getItem('tokenData'); if (!raw) return alert('Aucune sauvegarde.'); try { push2DHistory(); restore2D(JSON.parse(raw)); } catch { alert('Sauvegarde invalide.'); } });
  if (ui.exportJSON) ui.exportJSON.addEventListener('click', () => { const b = new Blob([JSON.stringify(make2DSnap(), null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'pion.json'; a.click(); });
  if (ui.importJSON) ui.importJSON.addEventListener('click', () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json'; inp.onchange = () => { const f = inp.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { push2DHistory(); restore2D(JSON.parse(r.result)); } catch { alert('JSON invalide.'); } }; r.readAsText(f); }; inp.click(); });
  if (ui.exportPNG) ui.exportPNG.addEventListener('click', async () => { await redraw2D(); const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'pion.png'; a.click(); });
  [ui.undoBtn, ui.undoBtnMobile].forEach((b) => b && b.addEventListener('click', undo2D));
  [ui.redoBtn, ui.redoBtnMobile].forEach((b) => b && b.addEventListener('click', redo2D));

  if (ui.selected2dX) ui.selected2dX.addEventListener('input', () => {
    const item = state2D.items[state2D.selectedIndex]; if (!item) return;
    const b = getItemBounds(item); if (!b) return;
    const targetX = Number(ui.selected2dX.value), dx = targetX - b.cx;
    moveItem(item, dx, 0); ui.selected2dXValue.textContent = `${Math.round(targetX)} px`; redraw2D();
  });
  if (ui.selected2dY) ui.selected2dY.addEventListener('input', () => {
    const item = state2D.items[state2D.selectedIndex]; if (!item) return;
    const b = getItemBounds(item); if (!b) return;
    const targetY = Number(ui.selected2dY.value), dy = targetY - b.cy;
    moveItem(item, 0, dy); ui.selected2dYValue.textContent = `${Math.round(targetY)} px`; redraw2D();
  });
  if (ui.selected2dSize) ui.selected2dSize.addEventListener('input', () => {
    const item = state2D.items[state2D.selectedIndex]; if (!item) return;
    const ratio = Number(ui.selected2dSize.value) / 100;
    const current = item._lastUiScale || 1;
    scaleItem(item, ratio / current);
    item._lastUiScale = ratio;
    ui.selected2dSizeValue.textContent = `${ui.selected2dSize.value} %`;
    redraw2D();
  });
  if (ui.duplicate2d) ui.duplicate2d.addEventListener('click', () => {
    const item = state2D.items[state2D.selectedIndex]; if (!item) return;
    push2DHistory();
    const copy = deepClone(item); moveItem(copy, 24, 24); delete copy._lastUiScale;
    state2D.items.push(copy); state2D.selectedIndex = state2D.items.length - 1;
    syncSelected2DPanel(); redraw2D();
  });
  if (ui.delete2d) ui.delete2d.addEventListener('click', () => {
    if (state2D.selectedIndex < 0) return;
    push2DHistory();
    state2D.items.splice(state2D.selectedIndex, 1); state2D.selectedIndex = -1;
    syncSelected2DPanel(); redraw2D();
  });

  function setActiveMode(mode) {
    const is2D = mode === '2d';
    ui.editor2d?.classList.toggle('active', is2D);
    ui.editor3d?.classList.toggle('active', !is2D);
    ui.mode2dBtn?.classList.toggle('active', is2D);
    ui.mode3dBtn?.classList.toggle('active', !is2D);
    if (!is2D) init3D();
  }
  ui.mode2dBtn?.addEventListener('click', () => setActiveMode('2d'));
  ui.mode3dBtn?.addEventListener('click', () => setActiveMode('3d'));

  let threeReady = false;
  let meshCounter = 1;
  const T = { scene: null, camera: null, renderer: null, controls: null, transformControls: null, grid: null, meshes: [], selected: null, raycaster: null, ptr: null, bevelClickMode: false, font: null, fontPromise: null };

  function showPlaceholder(html) {
    if (ui.threePlaceholder) { ui.threePlaceholder.innerHTML = html; ui.threePlaceholder.style.display = 'flex'; }
  }
  function hidePlaceholder() { if (ui.threePlaceholder) ui.threePlaceholder.style.display = 'none'; }


  function syncBevelClickButton() {
    if (!ui.toggleBevelClick) return;
    ui.toggleBevelClick.innerHTML = `<i class="fas fa-hand-pointer"></i> Mode congé par clic : ${T.bevelClickMode ? 'ON' : 'OFF'}`;
    ui.toggleBevelClick.classList.toggle('active-toggle', T.bevelClickMode);
  }

  function ensureFontLoaded() {
    if (T.font) return Promise.resolve(T.font);
    if (T.fontPromise) return T.fontPromise;
    T.fontPromise = new Promise((resolve, reject) => {
      if (typeof THREE === 'undefined' || !THREE.FontLoader) {
        reject(new Error('FontLoader indisponible'));
        return;
      }
      const loader = new THREE.FontLoader();
      loader.load('https://cdn.jsdelivr.net/npm/three@0.134.0/examples/fonts/helvetiker_regular.typeface.json', (font) => {
        T.font = font;
        resolve(font);
      }, undefined, reject);
    });
    return T.fontPromise;
  }

  function getText3DOptions() {
    const text = (ui.text3dInput?.value || '').trim();
    const size = Number(ui.text3dSize?.value || 70) / 100;
    return { text, size };
  }

  function createTextGeometry(text, p, size) {
    if (!T.font || !text) return null;
    const g = new THREE.TextGeometry(text, {
      font: T.font,
      size: Math.max(0.2, size || 0.7),
      height: Math.max(0.08, p.depth),
      curveSegments: 16,
      bevelEnabled: p.bevelSize > 0,
      bevelThickness: Math.max(0.03, p.bevelSize * 0.7),
      bevelSize: Math.max(0, p.bevelSize),
      bevelSegments: p.bevelSegments
    });
    g.computeBoundingBox();
    if (g.boundingBox) {
      const xMid = -0.5 * (g.boundingBox.max.x - g.boundingBox.min.x);
      const yMid = -0.5 * (g.boundingBox.max.y - g.boundingBox.min.y);
      g.translate(xMid, yMid, 0);
    }
    return g;
  }

  function createRoundedBoxGeometry(p) {
    const radius = Math.max(0.02, Math.min(0.95, p.bevelSize || 0.12));
    return new THREE.RoundedBoxGeometry(2, 2, 2, Math.max(2, (p.bevelSegments || 3) * 2), radius);
  }

  function applyBevelStepToSelected() {
    if (!T.selected) return;
    const m = T.selected;
    const current = m.userData.params || getParams();
    const next = {
      depth: current.depth ?? getParams().depth,
      bevelSize: Math.min((current.bevelSize || 0) + 0.04, 0.8),
      bevelSegments: Math.min((current.bevelSegments || 1) + 1, 8)
    };
    const kind = m.userData.shapeType;
    let ng = null;
    if (kind === 'text3d') {
      ng = createTextGeometry(m.userData.textValue || 'Texte', next, m.userData.textSize || 0.7);
    } else if (kind === 'box') {
      ng = createRoundedBoxGeometry(next);
    } else if (kind === 'extrudeStar' || kind === 'extrudeBadge') {
      ng = createGeometry(kind, next);
    }
    if (!ng) return;
    m.geometry.dispose();
    m.geometry = ng;
    m.userData.params = next;
    sync3DUI();
  }

  function resize3D() {
    if (!threeReady || !T.renderer || !ui.threeViewport) return;
    const w = Math.max(300, ui.threeViewport.clientWidth), h = Math.max(480, ui.threeViewport.clientHeight);
    T.renderer.setSize(w, h);
    T.camera.aspect = w / h;
    T.camera.updateProjectionMatrix();
  }

  function updateObjectList() {
    if (!ui.objectList) return;
    ui.objectList.innerHTML = '';
    T.meshes.forEach((m, index) => {
      const opt = document.createElement('option');
      opt.value = String(index);
      opt.textContent = m.userData.name || `Objet ${index + 1}`;
      opt.selected = (m === T.selected);
      ui.objectList.appendChild(opt);
    });
  }

  function updateTransformMode() {
    if (!T.transformControls || !ui.transformMode) return;
    T.transformControls.setMode(ui.transformMode.value || 'translate');
  }

  function updateTransformSnaps() {
    if (!T.transformControls) return;
    const move = Number(ui.snapMove?.value || 1);
    const rot = Number(ui.snapRotate?.value || 15) * Math.PI / 180;
    T.transformControls.setTranslationSnap(move);
    T.transformControls.setRotationSnap(rot);
    T.transformControls.setScaleSnap(0.1);
    if (ui.snapMoveValue) ui.snapMoveValue.textContent = String(move);
    if (ui.snapRotateValue) ui.snapRotateValue.textContent = `${ui.snapRotate?.value || 15}°`;
  }

  function sync3DUI() {
    updateObjectList();
    if (!T.selected) {
      if (ui.objectName) ui.objectName.value = '';
      if (ui.scale3d) ui.scale3d.value = 100;
      if (ui.scale3dValue) ui.scale3dValue.textContent = '100 %';
      if (ui.rotateY3d) ui.rotateY3d.value = 0;
      if (ui.rotateY3dValue) ui.rotateY3dValue.textContent = '0°';
      return;
    }
    if (ui.objectName) ui.objectName.value = T.selected.userData.name || 'Objet 3D';
    const scale = Math.round(T.selected.scale.x * 100);
    if (ui.scale3d) ui.scale3d.value = scale;
    if (ui.scale3dValue) ui.scale3dValue.textContent = `${scale} %`;
    let deg = Math.round((T.selected.rotation.y * 180) / Math.PI); deg = ((deg % 360) + 360) % 360;
    if (ui.rotateY3d) ui.rotateY3d.value = deg;
    if (ui.rotateY3dValue) ui.rotateY3dValue.textContent = `${deg}°`;
  }

  function updateEmissive() {
    T.meshes.forEach((m) => {
      m.material.emissive = new THREE.Color(m === T.selected ? 0x1d4ed8 : 0x000000);
      m.material.emissiveIntensity = m === T.selected ? 0.35 : 0;
    });
    sync3DUI();
  }

  function selectMesh(m) {
    T.selected = m || null;
    if (T.transformControls) {
      if (T.selected) T.transformControls.attach(T.selected);
      else T.transformControls.detach();
    }
    updateEmissive();
  }

  function init3D() {
    if (threeReady) return;
    if (typeof THREE === 'undefined' || !THREE.OrbitControls || !THREE.TransformControls || !THREE.FontLoader || !THREE.TextGeometry) {
      showPlaceholder('<i class="fas fa-triangle-exclamation" style="color:#f59e0b;font-size:2rem;margin-bottom:12px"></i><p>Three.js ou ses contrôles n\'ont pas pu être chargés.<br>Vérifie la connexion Internet puis recharge la page.</p>');
      return;
    }
    hidePlaceholder();

    T.scene = new THREE.Scene();
    T.scene.background = new THREE.Color(0x0f172a);
    T.scene.fog = new THREE.FogExp2(0x0f172a, 0.022);
    T.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
    T.camera.position.set(7, 6, 9);
    T.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    T.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    T.renderer.shadowMap.enabled = true;
    T.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    T.renderer.outputEncoding = THREE.sRGBEncoding;
    ui.threeViewport.appendChild(T.renderer.domElement);

    T.controls = new THREE.OrbitControls(T.camera, T.renderer.domElement);
    T.controls.enableDamping = true; T.controls.dampingFactor = 0.08; T.controls.target.set(0, 1, 0); T.controls.update();

    T.transformControls = new THREE.TransformControls(T.camera, T.renderer.domElement);
    T.transformControls.addEventListener('dragging-changed', (event) => { T.controls.enabled = !event.value; sync3DUI(); });
    T.transformControls.addEventListener('objectChange', sync3DUI);
    T.scene.add(T.transformControls);

    T.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(8, 14, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); T.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x6699ff, 0.5); fill.position.set(-6, 4, -5); T.scene.add(fill);

    T.grid = new THREE.GridHelper(24, 24, 0x334155, 0x1e293b); T.scene.add(T.grid);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.01; floor.receiveShadow = true; T.scene.add(floor);

    T.raycaster = new THREE.Raycaster(); T.ptr = new THREE.Vector2();
    T.renderer.domElement.addEventListener('pointerdown', (e) => {
      const r = T.renderer.domElement.getBoundingClientRect();
      T.ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      T.ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      T.raycaster.setFromCamera(T.ptr, T.camera);
      const hits = T.raycaster.intersectObjects(T.meshes, false);
      const hitMesh = hits.length ? hits[0].object : null;
      if (T.bevelClickMode && hitMesh && hitMesh === T.selected) {
        applyBevelStepToSelected();
        return;
      }
      selectMesh(hitMesh);
    });

    threeReady = true;
    updateTransformMode();
    updateTransformSnaps();
    resize3D();
    (function loop() {
      requestAnimationFrame(loop);
      T.controls.update();
      T.renderer.render(T.scene, T.camera);
    })();
  }

  function buildShape(kind) {
    const s = new THREE.Shape();
    if (kind === 'extrudeStar') {
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 1.2 : 0.55, a = (Math.PI / 5) * i - Math.PI / 2;
        i === 0 ? s.moveTo(Math.cos(a) * r, Math.sin(a) * r) : s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      s.closePath(); return s;
    }
    s.moveTo(-1.4, -0.6); s.quadraticCurveTo(-1.65, 0, -1.4, 0.6); s.lineTo(-0.3, 0.6); s.quadraticCurveTo(0, 1.1, 0.6, 1.1);
    s.quadraticCurveTo(1.25, 1.1, 1.45, 0.45); s.quadraticCurveTo(1.7, 0.3, 1.7, 0); s.quadraticCurveTo(1.7, -0.35, 1.4, -0.55);
    s.quadraticCurveTo(1.15, -1.1, 0.55, -1.1); s.quadraticCurveTo(-0.05, -1.1, -0.35, -0.6); s.closePath(); return s;
  }

  function getParams() {
    return { depth: Number(ui.extrudeDepth?.value || 18) / 25, bevelSize: Number(ui.bevelSize?.value || 3) / 25, bevelSegments: Number(ui.bevelSegments?.value || 3) };
  }

  function createGeometry(kind, p) {
    switch (kind) {
      case 'box': return (p?.bevelSize || 0) > 0.001 && THREE.RoundedBoxGeometry ? createRoundedBoxGeometry(p) : new THREE.BoxGeometry(2, 2, 2);
      case 'cylinder': return new THREE.CylinderGeometry(1, 1, 2, 48);
      case 'sphere': return new THREE.SphereGeometry(1.2, 48, 32);
      case 'token': return new THREE.CylinderGeometry(1.5, 1.5, 0.35, 64);
      case 'pyramid': return new THREE.ConeGeometry(1.3, 2.2, 4);
      case 'cone': return new THREE.ConeGeometry(1.2, 2.4, 32);
      case 'extrudeStar':
      case 'extrudeBadge':
        return new THREE.ExtrudeGeometry(buildShape(kind), {
          depth: p.depth, bevelEnabled: p.bevelSize > 0, bevelSize: p.bevelSize, bevelThickness: Math.max(0.05, p.bevelSize * 0.7), bevelSegments: p.bevelSegments, curveSegments: 32
        });
      default: return new THREE.BoxGeometry(2, 2, 2);
    }
  }

  function buildMesh(kind, color, p, options = {}) {
    let geo = null;
    if (kind === 'text3d') geo = createTextGeometry(options.text || 'Texte', p, options.size || 0.7);
    else geo = createGeometry(kind, p);
    const mat = new THREE.MeshStandardMaterial({ color: color || '#3b82f6', metalness: 0.2, roughness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.position.y = (kind === 'token') ? 0.2 : 1.2;
    if (kind === 'extrudeStar' || kind === 'extrudeBadge') { mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.6; }
    if (kind === 'text3d') { mesh.position.y = Math.max(0.8, (options.size || 0.7) * 0.8); }
    mesh.userData.shapeType = kind;
    mesh.userData.params = { ...p };
    mesh.userData.name = options.name || `Objet ${meshCounter++}`;
    if (kind === 'text3d') {
      mesh.userData.textValue = options.text || 'Texte';
      mesh.userData.textSize = options.size || 0.7;
    }
    return mesh;
  }


  async function addText3D() {
    if (!threeReady) return;
    const { text, size } = getText3DOptions();
    if (!text) return;
    try {
      await ensureFontLoaded();
    } catch (err) {
      alert('Impossible de charger la police 3D. Vérifie Internet puis recharge la page.');
      return;
    }
    const color = ui.meshColor?.value || '#3b82f6';
    const mesh = buildMesh('text3d', color, getParams(), { text, size, name: `Texte ${meshCounter++}` });
    mesh.position.x = (T.meshes.length % 4) * 2.8 - 4.2;
    mesh.position.z = Math.floor(T.meshes.length / 4) * 2.8 - 2.8;
    T.scene.add(mesh);
    T.meshes.push(mesh);
    selectMesh(mesh);
  }

  function addPrimitive3D() {
    if (!threeReady) return;
    const kind = ui.primitiveSelect?.value || 'box';
    const color = ui.meshColor?.value || '#3b82f6';
    const mesh = buildMesh(kind, color, getParams());
    mesh.position.x = (T.meshes.length % 4) * 2.8 - 4.2;
    mesh.position.z = Math.floor(T.meshes.length / 4) * 2.8 - 2.8;
    T.scene.add(mesh); T.meshes.push(mesh); selectMesh(mesh);
  }

  ui.addPrimitive?.addEventListener('click', () => { init3D(); if (threeReady) addPrimitive3D(); });
  ui.addText3d?.addEventListener('click', async () => { init3D(); if (threeReady) await addText3D(); });
  ui.text3dSize?.addEventListener('input', () => { if (ui.text3dSizeValue) ui.text3dSizeValue.textContent = ui.text3dSize.value; });
  ui.toggleBevelClick?.addEventListener('click', () => { T.bevelClickMode = !T.bevelClickMode; syncBevelClickButton(); });
  ui.duplicateMesh?.addEventListener('click', () => {
    if (!threeReady || !T.selected) return;
    const source = T.selected;
    const clone = buildMesh(source.userData.shapeType, `#${source.material.color.getHexString()}`, source.userData.params || getParams(), {
      text: source.userData.textValue,
      size: source.userData.textSize,
      name: `${source.userData.name || 'Objet'} copie`
    });
    clone.position.copy(source.position).add(new THREE.Vector3(1.5, 0, 1.5));
    clone.rotation.copy(source.rotation); clone.scale.copy(source.scale);
    T.scene.add(clone); T.meshes.push(clone); selectMesh(clone);
  });
  ui.deleteMesh?.addEventListener('click', () => {
    if (!threeReady || !T.selected) return;
    const m = T.selected; T.scene.remove(m); m.geometry.dispose(); m.material.dispose();
    T.meshes = T.meshes.filter((x) => x !== m); selectMesh(null);
  });
  ui.applyExtrude?.addEventListener('click', () => {
    if (!threeReady || !T.selected) return;
    const m = T.selected, kind = m.userData.shapeType;
    const p = getParams();
    let ng = null;
    if (kind === 'extrudeStar' || kind === 'extrudeBadge' || kind === 'box') ng = createGeometry(kind, p);
    else if (kind === 'text3d') ng = createTextGeometry(m.userData.textValue || 'Texte', p, m.userData.textSize || 0.7);
    if (!ng) return;
    m.geometry.dispose();
    m.geometry = ng;
    m.userData.params = p;
  });
  ui.centerMesh?.addEventListener('click', () => { if (T.selected) T.selected.position.set(0, T.selected.position.y, 0); sync3DUI(); });
  ui.reset3dView?.addEventListener('click', () => { if (!threeReady) return; T.camera.position.set(7, 6, 9); T.controls.target.set(0, 1, 0); T.controls.update(); });
  ui.toggleGrid?.addEventListener('click', () => { if (T.grid) T.grid.visible = !T.grid.visible; });
  ui.focusSelection?.addEventListener('click', () => {
    if (!T.selected) return;
    const pos = T.selected.position.clone();
    T.controls.target.copy(pos);
    T.camera.position.set(pos.x + 4, pos.y + 4, pos.z + 5);
    T.controls.update();
  });
  ui.transformMode?.addEventListener('change', updateTransformMode);
  ui.snapMove?.addEventListener('input', updateTransformSnaps);
  ui.snapRotate?.addEventListener('input', updateTransformSnaps);
  ui.objectName?.addEventListener('input', () => { if (!T.selected) return; T.selected.userData.name = ui.objectName.value || 'Objet 3D'; updateObjectList(); });
  ui.objectList?.addEventListener('change', () => { const idx = Number(ui.objectList.value); if (Number.isInteger(idx) && T.meshes[idx]) selectMesh(T.meshes[idx]); });

  const bindSlider = (el, lbl, fmt, fn) => { if (!el) return; el.addEventListener('input', () => { if (lbl) lbl.textContent = fmt(el.value); fn(el.value); }); };
  bindSlider(ui.extrudeDepth, ui.extrudeDepthValue, (v) => v, () => {});
  bindSlider(ui.bevelSize, ui.bevelSizeValue, (v) => v, () => {});
  bindSlider(ui.bevelSegments, ui.bevelSegmentsValue, (v) => v, () => {});
  bindSlider(ui.scale3d, ui.scale3dValue, (v) => `${v} %`, (v) => { if (!T.selected) return; const s = Number(v) / 100; T.selected.scale.set(s, s, s); sync3DUI(); });
  bindSlider(ui.rotateY3d, ui.rotateY3dValue, (v) => `${v}°`, (v) => { if (!T.selected) return; T.selected.rotation.y = Number(v) * Math.PI / 180; sync3DUI(); });

  window.addEventListener('resize', resize3D);
  syncLineWidthLabel();
  syncImageScaleSlider();
  syncSelected2DPanel();
  if (ui.text3dSizeValue && ui.text3dSize) ui.text3dSizeValue.textContent = ui.text3dSize.value;
  syncBevelClickButton();
  redraw2D();
})();
