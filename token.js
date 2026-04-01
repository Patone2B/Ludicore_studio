import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('tokenCanvas');
const ctx = canvas.getContext('2d');

const elements = {
  shapeSelect: document.getElementById('shapeSelect'),
  colorPicker: document.getElementById('colorPicker'),
  lineWidth: document.getElementById('lineWidth'),
  lineWidthValue: document.getElementById('lineWidthValue'),
  textInput: document.getElementById('textInput'),
  addText: document.getElementById('addText'),
  imageUpload: document.getElementById('imageUpload'),
  imageScale: document.getElementById('imageScale'),
  imageScaleValue: document.getElementById('imageScaleValue'),
  clearCanvas: document.getElementById('clearCanvas'),
  saveLocal: document.getElementById('saveLocal'),
  loadLocal: document.getElementById('loadLocal'),
  importJSON: document.getElementById('importJSON'),
  exportJSON: document.getElementById('exportJSON'),
  exportPNG: document.getElementById('exportPNG'),
  undoBtn: document.getElementById('undoBtn'),
  redoBtn: document.getElementById('redoBtn'),
  undoBtnMobile: document.getElementById('undoBtnMobile'),
  redoBtnMobile: document.getElementById('redoBtnMobile'),
  bringImageFront: document.getElementById('bringImageFront'),
  sendImageBack: document.getElementById('sendImageBack'),
  removeImage: document.getElementById('removeImage'),
  mode2dBtn: document.getElementById('mode2dBtn'),
  mode3dBtn: document.getElementById('mode3dBtn'),
  editor2d: document.getElementById('editor2d'),
  editor3d: document.getElementById('editor3d'),
  primitiveSelect: document.getElementById('primitiveSelect'),
  meshColor: document.getElementById('meshColor'),
  addPrimitive: document.getElementById('addPrimitive'),
  deleteMesh: document.getElementById('deleteMesh'),
  extrudeDepth: document.getElementById('extrudeDepth'),
  extrudeDepthValue: document.getElementById('extrudeDepthValue'),
  bevelSize: document.getElementById('bevelSize'),
  bevelSizeValue: document.getElementById('bevelSizeValue'),
  bevelSegments: document.getElementById('bevelSegments'),
  bevelSegmentsValue: document.getElementById('bevelSegmentsValue'),
  applyExtrude: document.getElementById('applyExtrude'),
  scale3d: document.getElementById('scale3d'),
  scale3dValue: document.getElementById('scale3dValue'),
  rotateY3d: document.getElementById('rotateY3d'),
  rotateY3dValue: document.getElementById('rotateY3dValue'),
  centerMesh: document.getElementById('centerMesh'),
  reset3dView: document.getElementById('reset3dView'),
  threeViewport: document.getElementById('threeViewport')
};

const state2D = {
  tool: 'pencil',
  drawing: false,
  startX: 0,
  startY: 0,
  items: [],
  history: [],
  future: [],
  background: null,
  draggingBackground: false,
  dragOffsetX: 0,
  dragOffsetY: 0
};

function clone2DState() {
  return JSON.parse(JSON.stringify({ items: state2D.items, background: state2D.background }));
}

function push2DHistory() {
  state2D.history.push(clone2DState());
  if (state2D.history.length > 100) state2D.history.shift();
  state2D.future = [];
}

function restore2DState(snapshot) {
  state2D.items = snapshot.items || [];
  state2D.background = snapshot.background || null;
  redraw2D();
}

function undo2D() {
  if (!state2D.history.length) return;
  state2D.future.push(clone2DState());
  restore2DState(state2D.history.pop());
}

function redo2D() {
  if (!state2D.future.length) return;
  state2D.history.push(clone2DState());
  restore2DState(state2D.future.pop());
}

function save2DLocal() {
  localStorage.setItem('tokenEditorEnhancedData', JSON.stringify(clone2DState()));
  alert('Projet 2D sauvegardé.');
}

function load2DLocal() {
  const raw = localStorage.getItem('tokenEditorEnhancedData');
  if (!raw) return;
  const parsed = JSON.parse(raw);
  push2DHistory();
  restore2DState(parsed);
}

function drawPath(path) {
  if (!path?.length) return;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i += 1) ctx.lineTo(path[i].x, path[i].y);
  ctx.stroke();
}

function getLoadedBackgroundImage() {
  return new Promise((resolve) => {
    if (!state2D.background?.src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = state2D.background.src;
  });
}

async function drawBackground() {
  if (!state2D.background?.src) return;
  const img = await getLoadedBackgroundImage();
  if (!img) return;
  const bg = state2D.background;
  ctx.drawImage(img, bg.x, bg.y, bg.width, bg.height);
}

async function redraw2D() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state2D.background && state2D.background.layer === 'back') {
    await drawBackground();
  }

  for (const item of state2D.items) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = item.color;
    ctx.fillStyle = item.color;
    ctx.lineWidth = item.lineWidth || 1;

    if (item.type === 'pencil' || item.type === 'eraser') {
      ctx.strokeStyle = item.type === 'eraser' ? '#ffffff' : item.color;
      drawPath(item.path);
    } else if (item.type === 'circle') {
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (item.type === 'square') {
      ctx.strokeRect(item.x, item.y, item.width, item.height);
    } else if (item.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(item.startX, item.startY);
      ctx.lineTo(item.endX, item.endY);
      ctx.stroke();
    } else if (item.type === 'text') {
      ctx.font = `${item.size || 28}px Arial`;
      ctx.fillText(item.text, item.x, item.y);
    }
  }

  if (state2D.background && state2D.background.layer === 'front') {
    await drawBackground();
  }
}

function pointInBackground(x, y) {
  if (!state2D.background) return false;
  const bg = state2D.background;
  return x >= bg.x && x <= bg.x + bg.width && y >= bg.y && y <= bg.y + bg.height;
}

canvas.addEventListener('mousedown', (event) => {
  const x = event.offsetX;
  const y = event.offsetY;
  state2D.tool = elements.shapeSelect.value;

  if (pointInBackground(x, y)) {
    state2D.draggingBackground = true;
    state2D.dragOffsetX = x - state2D.background.x;
    state2D.dragOffsetY = y - state2D.background.y;
    push2DHistory();
    return;
  }

  state2D.drawing = true;
  state2D.startX = x;
  state2D.startY = y;
  push2DHistory();

  if (state2D.tool === 'pencil' || state2D.tool === 'eraser') {
    state2D.items.push({
      type: state2D.tool,
      color: elements.colorPicker.value,
      lineWidth: Number(elements.lineWidth.value),
      path: [{ x, y }]
    });
  }
});

canvas.addEventListener('mousemove', (event) => {
  const x = event.offsetX;
  const y = event.offsetY;

  if (state2D.draggingBackground && state2D.background) {
    state2D.background.x = x - state2D.dragOffsetX;
    state2D.background.y = y - state2D.dragOffsetY;
    redraw2D();
    return;
  }

  if (!state2D.drawing) return;
  if (state2D.tool === 'pencil' || state2D.tool === 'eraser') {
    const currentItem = state2D.items[state2D.items.length - 1];
    currentItem.path.push({ x, y });
    redraw2D();
  }
});

window.addEventListener('mouseup', (event) => {
  if (state2D.draggingBackground) {
    state2D.draggingBackground = false;
    redraw2D();
    return;
  }

  if (!state2D.drawing) return;
  state2D.drawing = false;

  const rect = canvas.getBoundingClientRect();
  const endX = event.clientX - rect.left;
  const endY = event.clientY - rect.top;

  if (endX < 0 || endY < 0 || endX > canvas.width || endY > canvas.height) {
    redraw2D();
    return;
  }

  if (state2D.tool === 'circle') {
    const radius = Math.hypot(endX - state2D.startX, endY - state2D.startY);
    state2D.items.push({ type: 'circle', x: state2D.startX, y: state2D.startY, radius, color: elements.colorPicker.value, lineWidth: Number(elements.lineWidth.value) });
  } else if (state2D.tool === 'square') {
    state2D.items.push({ type: 'square', x: state2D.startX, y: state2D.startY, width: endX - state2D.startX, height: endY - state2D.startY, color: elements.colorPicker.value, lineWidth: Number(elements.lineWidth.value) });
  } else if (state2D.tool === 'line') {
    state2D.items.push({ type: 'line', startX: state2D.startX, startY: state2D.startY, endX, endY, color: elements.colorPicker.value, lineWidth: Number(elements.lineWidth.value) });
  }

  redraw2D();
});

elements.lineWidth.addEventListener('input', () => {
  elements.lineWidthValue.textContent = `${elements.lineWidth.value} px`;
});

elements.imageScale.addEventListener('input', () => {
  elements.imageScaleValue.textContent = `${elements.imageScale.value} %`;
  if (!state2D.background) return;
  push2DHistory();
  const ratio = Number(elements.imageScale.value) / 100;
  const centerX = state2D.background.x + state2D.background.width / 2;
  const centerY = state2D.background.y + state2D.background.height / 2;
  state2D.background.width = state2D.background.naturalWidth * ratio;
  state2D.background.height = state2D.background.naturalHeight * ratio;
  state2D.background.x = centerX - state2D.background.width / 2;
  state2D.background.y = centerY - state2D.background.height / 2;
  redraw2D();
});

elements.addText.addEventListener('click', () => {
  const value = elements.textInput.value.trim();
  if (!value) return;
  push2DHistory();
  state2D.items.push({ type: 'text', text: value, x: 60, y: 60, size: 30, color: elements.colorPicker.value, lineWidth: 1 });
  elements.textInput.value = '';
  redraw2D();
});

elements.imageUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    const img = new Image();
    img.onload = () => {
      push2DHistory();
      const maxWidth = canvas.width * 0.7;
      const ratio = Math.min(maxWidth / img.width, (canvas.height * 0.7) / img.height, 1);
      state2D.background = {
        src: loadEvent.target.result,
        x: (canvas.width - img.width * ratio) / 2,
        y: (canvas.height - img.height * ratio) / 2,
        width: img.width * ratio,
        height: img.height * ratio,
        naturalWidth: img.width,
        naturalHeight: img.height,
        layer: 'back'
      };
      elements.imageScale.value = Math.round(ratio * 100);
      elements.imageScaleValue.textContent = `${elements.imageScale.value} %`;
      redraw2D();
    };
    img.src = loadEvent.target.result;
  };
  reader.readAsDataURL(file);
});

elements.bringImageFront.addEventListener('click', () => {
  if (!state2D.background) return;
  push2DHistory();
  state2D.background.layer = 'front';
  redraw2D();
});

elements.sendImageBack.addEventListener('click', () => {
  if (!state2D.background) return;
  push2DHistory();
  state2D.background.layer = 'back';
  redraw2D();
});

elements.removeImage.addEventListener('click', () => {
  if (!state2D.background) return;
  push2DHistory();
  state2D.background = null;
  redraw2D();
});

elements.clearCanvas.addEventListener('click', () => {
  push2DHistory();
  state2D.items = [];
  state2D.background = null;
  redraw2D();
});

elements.saveLocal.addEventListener('click', save2DLocal);
elements.loadLocal.addEventListener('click', load2DLocal);
elements.exportJSON.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(clone2DState(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'projet-2d-pions.json';
  a.click();
  URL.revokeObjectURL(url);
});

elements.importJSON.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      push2DHistory();
      restore2DState(JSON.parse(loadEvent.target.result));
    };
    reader.readAsText(file);
  };
  input.click();
});

elements.exportPNG.addEventListener('click', async () => {
  await redraw2D();
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'projet-2d-pions.png';
  a.click();
});

[elements.undoBtn, elements.undoBtnMobile].forEach((btn) => btn.addEventListener('click', undo2D));
[elements.redoBtn, elements.redoBtnMobile].forEach((btn) => btn.addEventListener('click', redo2D));

elements.mode2dBtn.addEventListener('click', () => switchMode('2d'));
elements.mode3dBtn.addEventListener('click', () => switchMode('3d'));

function switchMode(mode) {
  const is2D = mode === '2d';
  elements.editor2d.classList.toggle('active', is2D);
  elements.editor3d.classList.toggle('active', !is2D);
  elements.mode2dBtn.classList.toggle('active', is2D);
  elements.mode3dBtn.classList.toggle('active', !is2D);
  if (!is2D) resizeRenderer();
}

// 3D
const viewport = elements.threeViewport;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
camera.position.set(5, 4, 7);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1, 0);

scene.add(new THREE.AmbientLight(0xffffff, 1.2));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(8, 10, 6);
scene.add(dirLight);

const grid = new THREE.GridHelper(20, 20, 0x94a3b8, 0x334155);
scene.add(grid);
const axes = new THREE.AxesHelper(3);
scene.add(axes);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.1, roughness: 0.85, side: THREE.DoubleSide })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.01;
scene.add(floor);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const meshState = { selected: null, list: [], history: [], future: [] };

function serializeMesh(mesh) {
  return {
    type: mesh.userData.shapeType,
    color: `#${mesh.material.color.getHexString()}`,
    position: mesh.position.toArray(),
    rotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
    scale: mesh.scale.toArray(),
    params: { ...mesh.userData.params }
  };
}

function snapshot3D() {
  return meshState.list.map(serializeMesh);
}

function push3DHistory() {
  meshState.history.push(snapshot3D());
  if (meshState.history.length > 100) meshState.history.shift();
  meshState.future = [];
}

function clear3DMeshes() {
  for (const mesh of meshState.list) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  meshState.list = [];
  meshState.selected = null;
}

function restore3D(snapshot) {
  clear3DMeshes();
  snapshot.forEach((item) => {
    const mesh = buildMesh(item.type, item.color, item.params);
    mesh.position.fromArray(item.position);
    mesh.rotation.set(item.rotation[0], item.rotation[1], item.rotation[2]);
    mesh.scale.fromArray(item.scale);
    scene.add(mesh);
    meshState.list.push(mesh);
  });
  sync3DControls();
}

function undo3D() {
  if (!meshState.history.length) return;
  meshState.future.push(snapshot3D());
  restore3D(meshState.history.pop());
}

function redo3D() {
  if (!meshState.future.length) return;
  meshState.history.push(snapshot3D());
  restore3D(meshState.future.pop());
}

function createExtrudedShape(kind, depth, bevelSize, bevelSegments) {
  const shape = new THREE.Shape();
  if (kind === 'extrudeStar') {
    const outer = 1.2;
    const inner = 0.55;
    for (let i = 0; i < 10; i += 1) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
  } else {
    shape.moveTo(-1.4, -0.6);
    shape.quadraticCurveTo(-1.65, 0, -1.4, 0.6);
    shape.lineTo(-0.3, 0.6);
    shape.quadraticCurveTo(0.0, 1.1, 0.6, 1.1);
    shape.quadraticCurveTo(1.25, 1.1, 1.45, 0.45);
    shape.quadraticCurveTo(1.7, 0.3, 1.7, 0);
    shape.quadraticCurveTo(1.7, -0.35, 1.4, -0.55);
    shape.quadraticCurveTo(1.15, -1.1, 0.55, -1.1);
    shape.quadraticCurveTo(-0.05, -1.1, -0.35, -0.6);
    shape.closePath();
  }

  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevelSize > 0,
    bevelSize,
    bevelThickness: Math.max(bevelSize * 0.7, 0.1),
    bevelSegments,
    curveSegments: 32
  });
}

function buildGeometry(type, params) {
  if (type === 'box') return new THREE.BoxGeometry(2, 2, 2, 2, 2, 2);
  if (type === 'cylinder') return new THREE.CylinderGeometry(1, 1, 1.2, 48, 1);
  if (type === 'sphere') return new THREE.SphereGeometry(1.1, 40, 28);
  if (type === 'token') return new THREE.CylinderGeometry(1.4, 1.4, params.depth / 10, 64, 1);
  return createExtrudedShape(type, params.depth / 10, params.bevelSize / 20, params.bevelSegments);
}

function buildMesh(type, color, params = null) {
  const effectiveParams = params || {
    depth: Number(elements.extrudeDepth.value),
    bevelSize: Number(elements.bevelSize.value),
    bevelSegments: Number(elements.bevelSegments.value)
  };
  const geometry = buildGeometry(type, effectiveParams);
  geometry.center();
  const material = new THREE.MeshStandardMaterial({ color, metalness: 0.18, roughness: 0.45 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = 1.2;
  mesh.userData.shapeType = type;
  mesh.userData.params = { ...effectiveParams };
  return mesh;
}

function selectMesh(mesh) {
  if (meshState.selected) meshState.selected.material.emissive?.setHex?.(0x000000);
  meshState.selected = mesh;
  if (meshState.selected) {
    meshState.selected.material.emissive = new THREE.Color(0x1d4ed8);
  }
  sync3DControls();
}

function sync3DControls() {
  const mesh = meshState.selected;
  if (!mesh) return;
  elements.meshColor.value = `#${mesh.material.color.getHexString()}`;
  elements.scale3d.value = Math.round(mesh.scale.x * 100);
  elements.scale3dValue.textContent = `${elements.scale3d.value} %`;
  elements.rotateY3d.value = Math.round(THREE.MathUtils.radToDeg(mesh.rotation.y));
  elements.rotateY3dValue.textContent = `${elements.rotateY3d.value}°`;
  const params = mesh.userData.params;
  elements.extrudeDepth.value = params.depth;
  elements.extrudeDepthValue.textContent = params.depth;
  elements.bevelSize.value = params.bevelSize;
  elements.bevelSizeValue.textContent = params.bevelSize;
  elements.bevelSegments.value = params.bevelSegments;
  elements.bevelSegmentsValue.textContent = params.bevelSegments;
}

function addPrimitive3D() {
  push3DHistory();
  const mesh = buildMesh(elements.primitiveSelect.value, elements.meshColor.value);
  mesh.position.x = meshState.list.length * 0.5;
  scene.add(mesh);
  meshState.list.push(mesh);
  selectMesh(mesh);
}

elements.addPrimitive.addEventListener('click', addPrimitive3D);

elements.deleteMesh.addEventListener('click', () => {
  if (!meshState.selected) return;
  push3DHistory();
  const mesh = meshState.selected;
  scene.remove(mesh);
  mesh.geometry.dispose();
  mesh.material.dispose();
  meshState.list = meshState.list.filter((entry) => entry !== mesh);
  meshState.selected = null;
});

elements.applyExtrude.addEventListener('click', () => {
  const mesh = meshState.selected;
  if (!mesh) return;
  const type = mesh.userData.shapeType;
  if (!['token', 'extrudeStar', 'extrudeBadge'].includes(type)) return;
  push3DHistory();
  const newParams = {
    depth: Number(elements.extrudeDepth.value),
    bevelSize: Number(elements.bevelSize.value),
    bevelSegments: Number(elements.bevelSegments.value)
  };
  mesh.geometry.dispose();
  mesh.geometry = buildGeometry(type, newParams);
  mesh.geometry.center();
  mesh.userData.params = newParams;
  sync3DControls();
});

elements.meshColor.addEventListener('input', () => {
  if (!meshState.selected) return;
  push3DHistory();
  meshState.selected.material.color.set(elements.meshColor.value);
});

elements.scale3d.addEventListener('input', () => {
  elements.scale3dValue.textContent = `${elements.scale3d.value} %`;
  if (!meshState.selected) return;
  const value = Number(elements.scale3d.value) / 100;
  meshState.selected.scale.setScalar(value);
});

elements.rotateY3d.addEventListener('input', () => {
  elements.rotateY3dValue.textContent = `${elements.rotateY3d.value}°`;
  if (!meshState.selected) return;
  meshState.selected.rotation.y = THREE.MathUtils.degToRad(Number(elements.rotateY3d.value));
});

['extrudeDepth', 'bevelSize', 'bevelSegments'].forEach((id) => {
  elements[id].addEventListener('input', () => {
    elements[`${id}Value`].textContent = elements[id].value;
  });
});

elements.centerMesh.addEventListener('click', () => {
  if (!meshState.selected) return;
  push3DHistory();
  meshState.selected.position.set(0, 1.2, 0);
});

elements.reset3dView.addEventListener('click', () => {
  camera.position.set(5, 4, 7);
  controls.target.set(0, 1, 0);
  controls.update();
});

renderer.domElement.addEventListener('pointerdown', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(meshState.list);
  if (intersects.length) selectMesh(intersects[0].object);
});

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) {
    event.preventDefault();
    if (elements.editor2d.classList.contains('active')) undo2D(); else undo3D();
  } else if (((event.ctrlKey || event.metaKey) && key === 'y') || ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 'z')) {
    event.preventDefault();
    if (elements.editor2d.classList.contains('active')) redo2D(); else redo3D();
  }
});

function resizeRenderer() {
  const width = viewport.clientWidth || 600;
  const height = viewport.clientHeight || 640;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resizeRenderer);
resizeRenderer();
addPrimitive3D();

function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
redraw2D();
