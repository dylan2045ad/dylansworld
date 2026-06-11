import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

const canvas = document.querySelector("#world");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1218);
scene.fog = new THREE.Fog(0x0c1218, 16, 34);

const camera = new THREE.PerspectiveCamera(
  48,
  window.innerWidth / window.innerHeight,
  0.1,
  120,
);
camera.position.set(8.6, 7.2, 10.8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 5.2;
controls.maxDistance = 25;
controls.target.set(0, 1.4, 0);
controls.update();

const world = new THREE.Group();
const photoLayer = new THREE.Group();
const labelLayer = new THREE.Group();
scene.add(world, photoLayer, labelLayer);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const interactiveMeshes = [];
const buildingGroups = [];
let hovered = null;
let selected = null;
let treeCount = 0;
let roadCount = 0;
let flyoverStart = 0;

const ui = {
  status: document.querySelector("#status"),
  buildingCount: document.querySelector("#building-count"),
  treeCount: document.querySelector("#tree-count"),
  roadCount: document.querySelector("#road-count"),
  selection: document.querySelector("#selection"),
  photoToggle: document.querySelector("#photo-toggle"),
  labelToggle: document.querySelector("#label-toggle"),
  rotateToggle: document.querySelector("#rotate-toggle"),
  resetView: document.querySelector("#reset-view"),
  flyover: document.querySelector("#flyover"),
  downloadGlb: document.querySelector("#download-glb"),
};

const materials = {
  base: new THREE.MeshStandardMaterial({
    color: 0x24313a,
    roughness: 0.9,
    metalness: 0.03,
  }),
  grass: new THREE.MeshStandardMaterial({ color: 0x3e7d4b, roughness: 0.85 }),
  grassDark: new THREE.MeshStandardMaterial({ color: 0x245b39, roughness: 0.9 }),
  road: new THREE.MeshStandardMaterial({ color: 0x252b32, roughness: 0.88 }),
  lane: new THREE.MeshStandardMaterial({ color: 0xd6d1c2, roughness: 0.7 }),
  sidewalk: new THREE.MeshStandardMaterial({ color: 0xbec2bd, roughness: 0.8 }),
  roof: new THREE.MeshStandardMaterial({ color: 0xd0b8a3, roughness: 0.72 }),
  roofLight: new THREE.MeshStandardMaterial({ color: 0xe0ceb8, roughness: 0.7 }),
  window: new THREE.MeshStandardMaterial({
    color: 0x24344d,
    emissive: 0x08111f,
    emissiveIntensity: 0.55,
    roughness: 0.42,
  }),
  litWindow: new THREE.MeshStandardMaterial({
    color: 0xffd184,
    emissive: 0xf4b55c,
    emissiveIntensity: 0.72,
    roughness: 0.35,
  }),
  brick: new THREE.MeshStandardMaterial({ color: 0x9d8d94, roughness: 0.78 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0xa9a5ae, roughness: 0.76 }),
  tan: new THREE.MeshStandardMaterial({ color: 0xc4a895, roughness: 0.78 }),
  edge: new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.22,
  }),
};

const rand = mulberry32(20451049);

buildWorld();
bindUi();
animate();

function buildWorld() {
  addLights();
  addBase();
  addPhotoReference();
  addDistrictFabric();
  addRoadNetwork();
  addParks();
  addHighRises();
  addLowRiseBlocks();
  updateStats();
  setStatus("Loaded");
}

function addLights() {
  scene.add(new THREE.HemisphereLight(0xbad8ff, 0x26331d, 1.85));

  const sun = new THREE.DirectionalLight(0xfff0d2, 3.2);
  sun.position.set(-5.8, 11.5, 5.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 35;
  scene.add(sun);
}

function addBase() {
  const base = new THREE.Mesh(new THREE.BoxGeometry(22.6, 0.18, 8.7), materials.base);
  base.position.y = -0.11;
  base.receiveShadow = true;
  world.add(base);

  const rim = new THREE.LineSegments(
    new THREE.EdgesGeometry(base.geometry),
    new THREE.LineBasicMaterial({ color: 0x76d4ff, transparent: true, opacity: 0.2 }),
  );
  rim.position.copy(base.position);
  world.add(rim);
}

function addPhotoReference() {
  const loader = new THREE.TextureLoader();
  loader.load(
    "./assets/source-city.png",
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

      const photo = new THREE.Mesh(
        new THREE.PlaneGeometry(22.1, 4.7),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0.43,
          depthWrite: false,
        }),
      );
      photo.rotation.x = -Math.PI / 2;
      photo.position.set(0, 0.018, -0.18);
      photo.name = "Source screenshot reference";
      photoLayer.add(photo);
    },
    undefined,
    () => setStatus("Photo texture blocked"),
  );
}

function addDistrictFabric() {
  const fabric = [
    [-9.9, 3.2, 2.8, 0.42],
    [-6.5, 3.05, 3.1, 0.38],
    [-2.7, 3.0, 2.6, 0.38],
    [1.5, 3.1, 2.7, 0.42],
    [5.6, 3.15, 3.2, 0.4],
    [9.2, 2.9, 2.8, 0.44],
    [-9.2, -3.55, 2.8, 0.42],
    [-5.3, -3.45, 2.6, 0.38],
    [-1.5, -3.5, 2.7, 0.38],
    [2.4, -3.45, 2.9, 0.38],
    [6.5, -3.45, 3.3, 0.4],
    [10.0, -3.35, 2.2, 0.42],
  ];

  for (const [x, z, w, d] of fabric) {
    const walk = new THREE.Mesh(new THREE.BoxGeometry(w, 0.035, d), materials.sidewalk);
    walk.position.set(x, 0.01, z);
    walk.receiveShadow = true;
    world.add(walk);
  }
}

function addRoadNetwork() {
  addRoad(0.0, -0.15, 0.92, 8.45, 0.02);
  addRoad(-3.72, -0.15, 0.72, 8.1, -0.015);
  addRoad(3.7, -0.15, 0.72, 8.1, 0.02);
  addRoad(7.9, -0.2, 0.68, 7.8, 0.025);
  addRoad(-7.8, -0.25, 0.68, 7.8, -0.025);
  addRoad(0, -3.05, 22.4, 0.74, 0);
  addRoad(0, -1.48, 20.5, 0.55, 0.005);
  addRoad(0, 1.55, 20.6, 0.55, -0.006);
  addRoad(0, 3.05, 22.0, 0.6, 0);
}

function addRoad(x, z, w, d, rot) {
  const road = new THREE.Mesh(new THREE.BoxGeometry(w, 0.045, d), materials.road);
  road.position.set(x, 0.035, z);
  road.rotation.y = rot;
  road.receiveShadow = true;
  world.add(road);
  roadCount += 1;

  const longAxis = d > w ? "z" : "x";
  const laneCount = Math.max(2, Math.floor((longAxis === "z" ? d : w) / 1.15));
  const laneLength = 0.34;
  for (let i = 0; i < laneCount; i += 1) {
    const t = (i + 0.5) / laneCount - 0.5;
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(longAxis === "z" ? 0.035 : laneLength, 0.01, longAxis === "z" ? laneLength : 0.035),
      materials.lane,
    );
    const localX = longAxis === "z" ? 0 : t * w;
    const localZ = longAxis === "z" ? t * d : 0;
    stripe.position.set(x + localX * Math.cos(rot) + localZ * Math.sin(rot), 0.067, z - localX * Math.sin(rot) + localZ * Math.cos(rot));
    stripe.rotation.y = rot;
    world.add(stripe);
  }
}

function addParks() {
  addPark(-8.9, 0.7, 2.3, 1.6, -0.1, 18);
  addPark(-5.8, 0.25, 2.6, 1.4, 0.05, 16);
  addPark(2.1, 0.95, 2.4, 1.25, 0.02, 14);
  addPark(5.8, 0.9, 3.05, 1.5, -0.05, 24);
  addPark(9.7, 1.35, 2.2, 1.35, 0.08, 18);
  addPark(-0.9, -2.1, 1.4, 0.85, 0, 8);
}

function addPark(x, z, w, d, rot, trees) {
  const park = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), materials.grass);
  park.position.set(x, 0.055, z);
  park.rotation.y = rot;
  park.receiveShadow = true;
  world.add(park);

  for (let i = 0; i < trees; i += 1) {
    const localX = (rand() - 0.5) * w * 0.82;
    const localZ = (rand() - 0.5) * d * 0.78;
    const px = x + localX * Math.cos(rot) + localZ * Math.sin(rot);
    const pz = z - localX * Math.sin(rot) + localZ * Math.cos(rot);
    addTree(px, pz, 0.42 + rand() * 0.34);
  }
}

function addTree(x, z, scale) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035 * scale, 0.05 * scale, 0.38 * scale, 7),
    new THREE.MeshStandardMaterial({ color: 0x7c593d, roughness: 0.88 }),
  );
  trunk.position.set(x, 0.25 * scale, z);
  trunk.castShadow = true;
  world.add(trunk);

  const crownColor = rand() > 0.5 ? 0x2e7a46 : 0x1f6239;
  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.28 * scale, 1),
    new THREE.MeshStandardMaterial({ color: crownColor, roughness: 0.92 }),
  );
  crown.position.set(x, 0.55 * scale, z);
  crown.castShadow = true;
  crown.receiveShadow = true;
  world.add(crown);
  treeCount += 1;
}

function addHighRises() {
  const towers = [
    ["Southwest Tower A", -9.25, -2.12, 1.4, 1.24, 4.9, -0.04, "concrete"],
    ["Southwest Tower B", -7.55, -2.17, 1.25, 1.18, 4.55, 0.03, "concrete"],
    ["West Park Tower", -6.15, 0.95, 1.18, 1.15, 5.6, -0.03, "brick"],
    ["Northwest Slab", -8.75, 2.1, 1.55, 1.05, 3.85, 0.06, "tan"],
    ["Center Needle", -2.95, 0.72, 1.0, 1.13, 6.65, 0.02, "concrete"],
    ["Center North Slab", -1.2, 2.05, 1.48, 1.05, 4.45, -0.03, "brick"],
    ["Main Avenue Tower", 1.55, -0.35, 1.18, 1.22, 6.05, 0.04, "concrete"],
    ["Garden Court Tower", 3.95, -0.42, 1.26, 1.16, 5.35, -0.02, "brick"],
    ["East Garden Tower", 5.85, 0.18, 1.28, 1.15, 5.15, 0.03, "concrete"],
    ["East Row Tower", 8.2, 0.2, 1.26, 1.12, 5.45, -0.02, "brick"],
    ["Far East Tower", 10.0, -0.9, 1.12, 1.08, 4.7, 0.05, "concrete"],
    ["Rear East Slab", 7.45, 2.25, 1.58, 1.0, 3.95, 0.03, "tan"],
  ];

  for (const spec of towers) {
    addBuilding({
      name: spec[0],
      x: spec[1],
      z: spec[2],
      width: spec[3],
      depth: spec[4],
      height: spec[5],
      rotation: spec[6],
      material: materials[spec[7]],
      kind: "tower",
      windowScale: 1,
    });
  }
}

function addLowRiseBlocks() {
  const blocks = [
    ["Low Shops West", -10.05, -3.62, 2.0, 0.54, 0.55, 0.02],
    ["South Row Walkups", -5.2, -3.7, 3.2, 0.58, 0.72, 0.01],
    ["Avenue Shops", -1.75, -3.7, 2.3, 0.56, 0.62, -0.01],
    ["South Market Row", 2.7, -3.65, 2.9, 0.58, 0.72, 0.01],
    ["East Corner Walkups", 6.75, -3.62, 3.1, 0.55, 0.68, -0.02],
    ["Brick Edge Block", 10.1, -3.5, 1.8, 0.7, 1.1, -0.05],
    ["Northwest Block", -9.8, 3.55, 2.4, 0.5, 0.72, 0.04],
    ["North Row", -5.6, 3.5, 2.9, 0.5, 0.68, -0.02],
    ["North Center Row", -1.35, 3.55, 3.0, 0.48, 0.66, 0],
    ["North Avenue Row", 2.7, 3.5, 2.7, 0.48, 0.62, 0.02],
    ["North East Row", 6.65, 3.55, 3.2, 0.48, 0.7, -0.02],
    ["Tennis Court Block", 10.15, 2.6, 1.7, 1.05, 0.5, 0.04],
  ];

  for (const spec of blocks) {
    addBuilding({
      name: spec[0],
      x: spec[1],
      z: spec[2],
      width: spec[3],
      depth: spec[4],
      height: spec[5],
      rotation: spec[6],
      material: spec[0].includes("Brick") ? materials.brick : materials.tan,
      kind: "low-rise",
      windowScale: 0.55,
    });
  }
}

function addBuilding(spec) {
  const group = new THREE.Group();
  group.name = spec.name;
  group.position.set(spec.x, 0, spec.z);
  group.rotation.y = spec.rotation;
  world.add(group);

  const bodyMaterial = spec.material.clone();
  bodyMaterial.emissive = new THREE.Color(0x000000);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width, spec.height, spec.depth),
    bodyMaterial,
  );
  body.position.y = spec.height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  body.userData = {
    name: spec.name,
    kind: spec.kind,
    height: spec.height,
    baseColor: bodyMaterial.color.clone(),
  };
  group.add(body);
  interactiveMeshes.push(body);

  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), materials.edge);
  edges.position.copy(body.position);
  group.add(edges);

  addWindows(group, spec);
  addRoof(group, spec);
  addLabel(group, spec);

  buildingGroups.push(group);
}

function addWindows(group, spec) {
  if (spec.height < 0.65) return;

  const rows = Math.max(2, Math.floor(spec.height / (0.34 / spec.windowScale)));
  const frontCols = Math.max(3, Math.floor(spec.width / 0.22));
  const sideCols = Math.max(2, Math.floor(spec.depth / 0.22));
  const winW = 0.08 * spec.windowScale;
  const winH = 0.12 * spec.windowScale;

  addWindowFace("front", frontCols, rows, spec.width, spec.depth, spec.height, winW, winH, group);
  addWindowFace("back", frontCols, rows, spec.width, spec.depth, spec.height, winW, winH, group);
  addWindowFace("left", sideCols, rows, spec.width, spec.depth, spec.height, winW, winH, group);
  addWindowFace("right", sideCols, rows, spec.width, spec.depth, spec.height, winW, winH, group);
}

function addWindowFace(face, cols, rows, width, depth, height, winW, winH, group) {
  const eps = 0.007;
  const stepY = height / (rows + 1);
  const span = face === "front" || face === "back" ? width : depth;
  const geom = new THREE.PlaneGeometry(winW, winH);

  for (let row = 1; row <= rows; row += 1) {
    for (let col = 1; col <= cols; col += 1) {
      if ((row + col) % 11 === 0) continue;
      const t = col / (cols + 1) - 0.5;
      const lit = row > rows * 0.58 && (row * 13 + col * 7) % 9 === 0;
      const windowMesh = new THREE.Mesh(geom, lit ? materials.litWindow : materials.window);
      const y = row * stepY;
      const a = t * span * 0.78;

      if (face === "front") {
        windowMesh.position.set(a, y, depth / 2 + eps);
      } else if (face === "back") {
        windowMesh.position.set(-a, y, -depth / 2 - eps);
        windowMesh.rotation.y = Math.PI;
      } else if (face === "left") {
        windowMesh.position.set(-width / 2 - eps, y, a);
        windowMesh.rotation.y = -Math.PI / 2;
      } else {
        windowMesh.position.set(width / 2 + eps, y, -a);
        windowMesh.rotation.y = Math.PI / 2;
      }

      group.add(windowMesh);
    }
  }
}

function addRoof(group, spec) {
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.9, 0.12, spec.depth * 0.9),
    spec.height > 2 ? materials.roof : materials.roofLight,
  );
  cap.position.y = spec.height + 0.065;
  cap.castShadow = true;
  cap.receiveShadow = true;
  group.add(cap);

  if (spec.kind === "tower") {
    const house = new THREE.Mesh(
      new THREE.BoxGeometry(spec.width * 0.35, 0.24, spec.depth * 0.32),
      materials.roofLight,
    );
    house.position.set(spec.width * 0.12, spec.height + 0.25, -spec.depth * 0.08);
    house.castShadow = true;
    group.add(house);

    const vent = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.2, 10),
      new THREE.MeshStandardMaterial({ color: 0xc9c0b3, roughness: 0.65 }),
    );
    vent.position.set(-spec.width * 0.22, spec.height + 0.25, spec.depth * 0.18);
    vent.castShadow = true;
    group.add(vent);
  }
}

function addLabel(group, spec) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(12, 18, 24, 0.76)";
  roundRect(ctx, 8, 18, 496, 86, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(118, 212, 255, 0.62)";
  ctx.lineWidth = 3;
  roundRect(ctx, 8, 18, 496, 86, 18);
  ctx.stroke();
  ctx.fillStyle = "#f4f1e8";
  ctx.font = "700 28px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(spec.name, 256, 52, 456);
  ctx.fillStyle = "#b9c0c8";
  ctx.font = "500 20px Arial";
  ctx.fillText(`${Math.round(spec.height * 10)}m miniature height`, 256, 82, 456);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  sprite.position.set(spec.x, spec.height + 0.72, spec.z);
  sprite.scale.set(1.8, 0.45, 1);
  sprite.name = `${spec.name} label`;
  labelLayer.add(sprite);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bindUi() {
  ui.photoToggle.addEventListener("change", () => {
    photoLayer.visible = ui.photoToggle.checked;
  });

  ui.labelToggle.addEventListener("change", () => {
    labelLayer.visible = ui.labelToggle.checked;
  });

  ui.rotateToggle.addEventListener("change", () => {
    controls.autoRotate = ui.rotateToggle.checked;
    controls.autoRotateSpeed = 0.65;
  });

  ui.resetView.addEventListener("click", () => {
    flyoverStart = 0;
    controls.enabled = true;
    camera.position.set(8.6, 7.2, 10.8);
    controls.target.set(0, 1.4, 0);
    controls.update();
    setStatus("View reset");
  });

  ui.flyover.addEventListener("click", () => {
    flyoverStart = performance.now();
    controls.enabled = false;
    ui.rotateToggle.checked = false;
    controls.autoRotate = false;
    setStatus("Flyover");
  });

  ui.downloadGlb.addEventListener("click", exportGlb);

  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("click", onClick);
  window.addEventListener("resize", onResize);
}

function onPointerMove(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onClick() {
  if (hovered) {
    selectMesh(hovered);
  }
}

function selectMesh(mesh) {
  selected = mesh;
  const data = mesh.userData;
  const heightMeters = Math.round(data.height * 10);
  ui.selection.innerHTML = `<span>Selected</span><strong>${data.name}</strong><span>${data.kind}, ${heightMeters}m miniature height</span>`;
  setStatus("Selected");

  const worldPos = new THREE.Vector3();
  mesh.getWorldPosition(worldPos);
  controls.target.lerp(new THREE.Vector3(worldPos.x, Math.max(0.8, data.height * 0.42), worldPos.z), 0.6);
}

function updateHover() {
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(interactiveMeshes, false)[0]?.object ?? null;

  if (hovered && hovered !== hit && hovered !== selected) {
    hovered.material.emissive.setHex(0x000000);
  }

  hovered = hit;
  renderer.domElement.style.cursor = hit ? "pointer" : "grab";

  if (hovered && hovered !== selected) {
    hovered.material.emissive.setHex(0x163347);
  }

  if (selected) {
    selected.material.emissive.setHex(0x2f2610);
  }
}

function exportGlb() {
  setStatus("Exporting GLB");
  const exporter = new GLTFExporter();
  const exportRoot = world.clone(true);
  exporter.parse(
    exportRoot,
    (result) => {
      const blob = new Blob([result], { type: "model/gltf-binary" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mini-3d-city-world.glb";
      link.click();
      URL.revokeObjectURL(url);
      setStatus("GLB saved");
    },
    (error) => {
      console.error(error);
      setStatus("GLB export failed");
    },
    { binary: true, trs: false, onlyVisible: true },
  );
}

function runFlyover(time) {
  if (!flyoverStart) return;
  const elapsed = (time - flyoverStart) / 1000;
  const duration = 10.5;
  const t = Math.min(elapsed / duration, 1);
  const angle = -Math.PI * 0.18 + t * Math.PI * 1.36;
  const radius = 11.8 - Math.sin(t * Math.PI) * 2.7;
  const y = 5.8 + Math.sin(t * Math.PI) * 1.7;
  camera.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  controls.target.set(0, 1.55 + Math.sin(t * Math.PI * 2) * 0.18, -0.18);
  controls.update();

  if (t >= 1) {
    flyoverStart = 0;
    controls.enabled = true;
    setStatus("Ready");
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateStats() {
  ui.buildingCount.textContent = String(buildingGroups.length);
  ui.treeCount.textContent = String(treeCount);
  ui.roadCount.textContent = String(roadCount);
}

function setStatus(message) {
  ui.status.textContent = message;
}

function animate(time = 0) {
  requestAnimationFrame(animate);
  updateHover();
  runFlyover(time);
  controls.update();
  renderer.render(scene, camera);
}

function mulberry32(seed) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}