// Biblioteca de materiais realistas (PBR: cor + relevo + rugosidade).
// Os materiais são partilhados (criados uma vez) e marcados com userData.shared,
// para não serem destruídos quando uma sala ou um dispositivo é removido.
//
// Texturas de ficheiro: assets/textures/ (ver assets/CREDITOS.md).
// Texturas geradas por código (canvas): reboco, alcatifa, betão, pedra.
import * as THREE from "three";

const TEX_URL = new URL("../../assets/textures/", import.meta.url);
const loader = new THREE.TextureLoader();
const cache = new Map();

function share(material) {
  material.userData.shared = true;
  return material;
}

/** Carrega uma textura de ficheiro (uma só vez) e prepara-a para repetir. */
function fileTexture(name, { color = false } = {}) {
  const key = `file:${name}`;
  if (!cache.has(key)) {
    const tex = loader.load(new URL(name, TEX_URL).href);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    if (color) tex.colorSpace = THREE.SRGBColorSpace;
    cache.set(key, tex);
  }
  return cache.get(key);
}

// ---------------------------------------------------------------------------
// Texturas geradas por código
// ---------------------------------------------------------------------------
function rand(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/**
 * Cria uma textura de ruído num canvas.
 * pattern: "plaster" | "carpet" | "concrete" | "stone"
 */
function canvasTexture(pattern, base, variation, seed = 7) {
  const key = `canvas:${pattern}:${base}`;
  if (cache.has(key)) return cache.get(key);

  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const r = rand(seed);
  const baseColor = new THREE.Color(base);

  g.fillStyle = `#${baseColor.getHexString()}`;
  g.fillRect(0, 0, size, size);

  const dots = pattern === "carpet" ? 9000 : pattern === "plaster" ? 2500 : 1600;
  const maxR = pattern === "carpet" ? 1 : pattern === "concrete" ? 6 : 3;
  for (let i = 0; i < dots; i++) {
    const k = (r() - 0.5) * variation;
    const col = baseColor.clone().offsetHSL(0, 0, k);
    g.fillStyle = `#${col.getHexString()}`;
    g.globalAlpha = 0.35 + r() * 0.4;
    g.beginPath();
    g.arc(r() * size, r() * size, 0.5 + r() * maxR, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  // Pedra: juntas entre lajes
  if (pattern === "stone") {
    g.strokeStyle = "rgba(60,55,50,0.55)";
    g.lineWidth = 3;
    for (let i = 0; i <= 2; i++) {
      g.beginPath(); g.moveTo(0, (i * size) / 2); g.lineTo(size, (i * size) / 2); g.stroke();
      g.beginPath(); g.moveTo((i * size) / 2, 0); g.lineTo((i * size) / 2, size); g.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

// ---------------------------------------------------------------------------
// Chãos por tipo de divisão
// ---------------------------------------------------------------------------
// tile: tamanho (m) que uma repetição da textura ocupa no chão
const FLOORS = {
  wood:     { tile: [2.4, 1.2] },
  tile:     { tile: [1.2, 1.2] },
  stone:    { tile: [1.2, 1.2] },
  concrete: { tile: [3, 3] },
  carpet:   { tile: [1.5, 1.5] },
  grass:    { tile: [3, 3] }
};

const ROOM_FLOOR = {
  living: "wood", bedroom: "wood", office: "wood",
  kitchen: "tile", bathroom: "tile",
  entrance: "stone", garage: "concrete", garden: "grass"
};

export function floorKind(roomType) {
  return ROOM_FLOOR[roomType] ?? "wood";
}

export function floorTileSize(kind) {
  return FLOORS[kind]?.tile ?? [2, 2];
}

export function floorMaterial(kind) {
  const key = `floor:${kind}`;
  if (cache.has(key)) return cache.get(key);
  let m;
  switch (kind) {
    case "wood":
      m = new THREE.MeshStandardMaterial({
        map: fileTexture("hardwood2_diffuse.jpg", { color: true }),
        bumpMap: fileTexture("hardwood2_bump.jpg"),
        bumpScale: 1.5,
        roughnessMap: fileTexture("hardwood2_roughness.jpg"),
        roughness: 1,
        metalness: 0
      });
      break;
    case "tile":
      m = new THREE.MeshStandardMaterial({
        map: fileTexture("tiles_diffuse.jpg", { color: true }),
        normalMap: fileTexture("tiles_normal.jpg"),
        roughness: 0.35,
        color: 0xf4f1ea
      });
      break;
    case "stone":
      m = new THREE.MeshStandardMaterial({ map: canvasTexture("stone", 0xb9b1a3, 0.12, 11), roughness: 0.8 });
      break;
    case "concrete":
      m = new THREE.MeshStandardMaterial({ map: canvasTexture("concrete", 0x9c9a94, 0.1, 5), roughness: 0.95 });
      break;
    case "carpet":
      m = new THREE.MeshStandardMaterial({ map: canvasTexture("carpet", 0x8a8f9a, 0.12, 3), roughness: 1 });
      break;
    case "grass":
      m = new THREE.MeshStandardMaterial({ map: fileTexture("grass_diffuse.jpg", { color: true }), roughness: 1, color: 0xffffff });
      break;
    default:
      m = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  }
  cache.set(key, share(m));
  return m;
}

// ---------------------------------------------------------------------------
// Outros materiais partilhados
// ---------------------------------------------------------------------------
const SIMPLE = {
  plaster:   () => new THREE.MeshStandardMaterial({ map: canvasTexture("plaster", 0xf3f0e8, 0.04, 9), roughness: 0.95 }),
  wallTop:   () => new THREE.MeshStandardMaterial({ color: 0x8a8780, roughness: 0.8 }),
  slab:      () => new THREE.MeshStandardMaterial({ color: 0x6f6b64, roughness: 0.9 }),
  brick:     () => new THREE.MeshStandardMaterial({
    map: fileTexture("brick_diffuse.jpg", { color: true }),
    bumpMap: fileTexture("brick_bump.jpg"),
    roughnessMap: fileTexture("brick_roughness.jpg"),
    roughness: 1
  }),
  woodFurniture: () => new THREE.MeshStandardMaterial({ map: fileTexture("hardwood2_diffuse.jpg", { color: true }), roughness: 0.6, color: 0xd8c3a5 }),
  woodDark:  () => new THREE.MeshStandardMaterial({ map: fileTexture("hardwood2_diffuse.jpg", { color: true }), roughness: 0.55, color: 0x7a5a40 }),
  white:     () => new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.45 }),
  ceramic:   () => new THREE.MeshStandardMaterial({ color: 0xfbfbf8, roughness: 0.15 }),
  metal:     () => new THREE.MeshStandardMaterial({ color: 0xb8b8b4, roughness: 0.3, metalness: 0.85 }),
  darkMetal: () => new THREE.MeshStandardMaterial({ color: 0x3a3a38, roughness: 0.4, metalness: 0.6 }),
  screen:    () => new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.15, metalness: 0.2 }),
  countertop:() => new THREE.MeshStandardMaterial({ color: 0x3d3b38, roughness: 0.25 }),
  mattress:  () => new THREE.MeshStandardMaterial({ map: canvasTexture("carpet", 0xf4f2ee, 0.05, 2), roughness: 1 }),
  plant:     () => new THREE.MeshStandardMaterial({ color: 0x3f7a35, roughness: 0.8 }),
  pot:       () => new THREE.MeshStandardMaterial({ color: 0xb5643c, roughness: 0.85 }),
  bark:      () => new THREE.MeshStandardMaterial({ color: 0x5b4330, roughness: 1 }),
  stonePath: () => new THREE.MeshStandardMaterial({ map: canvasTexture("concrete", 0xa9a395, 0.15, 21), roughness: 0.9 }),
  glass:     () => new THREE.MeshStandardMaterial({ color: 0x9fb8c8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.45 }),
  rubber:    () => new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.9 })
};

/** Material partilhado pelo nome (ver SIMPLE). */
export function mat(name) {
  const key = `mat:${name}`;
  if (!cache.has(key)) cache.set(key, share(SIMPLE[name]()));
  return cache.get(key);
}

/** Tecido (sofás, camas…) numa cor à escolha. */
export function fabric(color) {
  const key = `fabric:${color}`;
  if (!cache.has(key)) {
    cache.set(key, share(new THREE.MeshStandardMaterial({ map: canvasTexture("carpet", color, 0.08, 4), roughness: 1 })));
  }
  return cache.get(key);
}

/** Cor simples partilhada (folhagem, carro…). */
export function colored(color, roughness = 0.7, metalness = 0) {
  const key = `color:${color}:${roughness}:${metalness}`;
  if (!cache.has(key)) cache.set(key, share(new THREE.MeshStandardMaterial({ color, roughness, metalness })));
  return cache.get(key);
}
