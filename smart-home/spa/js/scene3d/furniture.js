// Mobília construída por código, conforme o tipo de divisão.
// Coordenadas locais da sala: x de 0 a w, z de 0 a h (z=0 é a parede "norte"), y para cima.
// Peças que colidiriam com um dispositivo, ou que não cabem, são omitidas.
import * as THREE from "three";
import { mat, fabric, colored } from "./materials.js";

// ---- Peças básicas ------------------------------------------------------------
function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rt, rb, h, material, x = 0, y = 0, z = 0, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Grupo com a frente virada para +Z (rodar depois conforme a parede). */
function group(...children) {
  const g = new THREE.Group();
  children.forEach((c) => g.add(c));
  return g;
}

// ---- Móveis -------------------------------------------------------------------
const PIECES = {
  sofa(w = 2.1) {
    const f = fabric(0x6b7480);
    return group(
      box(w, 0.42, 0.9, f, 0, 0.05),
      box(w, 0.45, 0.22, f, 0, 0.42, -0.34),
      box(0.2, 0.25, 0.9, f, -w / 2 + 0.1, 0.42),
      box(0.2, 0.25, 0.9, f, w / 2 - 0.1, 0.42),
      box(w / 2 - 0.25, 0.12, 0.6, fabric(0x7c8591), -w / 4, 0.47, 0.08),
      box(w / 2 - 0.25, 0.12, 0.6, fabric(0x7c8591), w / 4, 0.47, 0.08)
    );
  },
  coffeeTable() {
    return group(
      box(1.1, 0.05, 0.6, mat("woodFurniture"), 0, 0.38),
      ...[[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]].map(([x, z]) => box(0.05, 0.38, 0.05, mat("darkMetal"), x, 0, z))
    );
  },
  tvUnit(w = 1.8) {
    return group(
      box(w, 0.45, 0.42, mat("woodFurniture")),
      box(1.3, 0.75, 0.05, mat("screen"), 0, 0.55, -0.08),
      box(0.3, 0.05, 0.2, mat("darkMetal"), 0, 0.45, -0.08)
    );
  },
  rug(w, d) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.015, d), fabric(0xb9a88e));
    r.position.y = 0.008;
    r.receiveShadow = true;
    return group(r);
  },
  plant() {
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), mat("plant"));
    leaves.position.y = 0.75;
    leaves.castShadow = true;
    return group(cyl(0.18, 0.14, 0.4, mat("pot")), leaves);
  },
  counter(len) {
    return group(
      box(len, 0.86, 0.6, mat("white")),
      box(len + 0.02, 0.04, 0.62, mat("countertop"), 0, 0.86),
      box(0.5, 0.02, 0.4, mat("metal"), -len / 4, 0.9),          // lava-loiça
      box(0.55, 0.01, 0.45, mat("screen"), len / 4, 0.9)          // placa
    );
  },
  fridge() {
    return group(box(0.7, 1.9, 0.68, mat("metal")), box(0.03, 0.6, 0.03, mat("darkMetal"), 0.28, 1.1, 0.35));
  },
  diningTable() {
    const g = group(
      box(1.4, 0.05, 0.85, mat("woodFurniture"), 0, 0.72),
      ...[[-0.62, -0.35], [0.62, -0.35], [-0.62, 0.35], [0.62, 0.35]].map(([x, z]) => box(0.06, 0.72, 0.06, mat("woodDark"), x, 0, z))
    );
    for (const [x, z, ry] of [[-0.35, -0.65, 0], [0.35, -0.65, 0], [-0.35, 0.65, Math.PI], [0.35, 0.65, Math.PI]]) {
      const c = PIECES.chair();
      c.position.set(x, 0, z);
      c.rotation.y = ry;
      g.add(c);
    }
    return g;
  },
  chair() {
    return group(
      box(0.42, 0.04, 0.42, mat("woodDark"), 0, 0.45),
      box(0.42, 0.45, 0.04, mat("woodDark"), 0, 0.49, -0.19),
      ...[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([x, z]) => box(0.04, 0.45, 0.04, mat("woodDark"), x, 0, z))
    );
  },
  bed(double) {
    const w = double ? 1.6 : 0.95;
    return group(
      box(w + 0.1, 0.3, 2.1, mat("woodFurniture")),
      box(w + 0.1, 0.9, 0.08, mat("woodFurniture"), 0, 0, -1.05),
      box(w, 0.22, 1.95, mat("mattress"), 0, 0.3, 0.04),
      box(w + 0.02, 0.06, 1.3, fabric(0x8fa5b8), 0, 0.52, 0.35),
      ...(double ? [-0.4, 0.4] : [0]).map((x) => box(0.55, 0.12, 0.35, mat("mattress"), x, 0.52, -0.72))
    );
  },
  nightstand() {
    return group(box(0.45, 0.5, 0.4, mat("woodFurniture")), cyl(0.08, 0.1, 0.25, mat("white"), 0, 0.5, 0));
  },
  wardrobe(w = 1.6) {
    return group(box(w, 2.0, 0.6, mat("woodFurniture")), box(0.02, 1.9, 0.01, mat("woodDark"), 0, 0.05, 0.3));
  },
  bathtub() {
    return group(box(1.7, 0.55, 0.75, mat("ceramic")), box(1.55, 0.02, 0.6, colored(0xbcd6e6, 0.1), 0, 0.5));
  },
  sink() {
    return group(box(0.6, 0.85, 0.45, mat("white")), box(0.5, 0.06, 0.4, mat("ceramic"), 0, 0.85), box(0.5, 0.6, 0.02, mat("glass"), 0, 1.15, -0.2));
  },
  toilet() {
    return group(cyl(0.2, 0.16, 0.4, mat("ceramic")), box(0.4, 0.4, 0.18, mat("ceramic"), 0, 0.3, -0.24));
  },
  shoeCabinet() {
    return group(box(1.0, 0.9, 0.35, mat("white")), box(1.02, 0.03, 0.37, mat("woodFurniture"), 0, 0.9));
  },
  coatRack() {
    return group(cyl(0.2, 0.22, 0.04, mat("darkMetal")), cyl(0.025, 0.025, 1.75, mat("darkMetal"), 0, 0.04), cyl(0.12, 0.12, 0.04, mat("darkMetal"), 0, 1.75));
  },
  doorMat() {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.6), fabric(0x7a5c3e));
    m.position.y = 0.01;
    m.receiveShadow = true;
    return group(m);
  },
  desk() {
    return group(
      box(1.4, 0.04, 0.7, mat("woodFurniture"), 0, 0.73),
      box(0.04, 0.73, 0.66, mat("white"), -0.66, 0, 0),
      box(0.04, 0.73, 0.66, mat("white"), 0.66, 0, 0),
      box(0.6, 0.38, 0.03, mat("screen"), 0, 0.9, -0.2),
      box(0.15, 0.15, 0.1, mat("darkMetal"), 0, 0.77, -0.2)
    );
  },
  officeChair() {
    return group(
      cyl(0.28, 0.3, 0.05, mat("darkMetal")),
      cyl(0.03, 0.03, 0.4, mat("darkMetal"), 0, 0.05),
      box(0.48, 0.08, 0.46, fabric(0x2f3640), 0, 0.45),
      box(0.46, 0.55, 0.06, fabric(0x2f3640), 0, 0.55, -0.22)
    );
  },
  bookshelf(w = 1.0) {
    const g = group(box(w, 1.9, 0.32, mat("woodFurniture")));
    const colors = [0xa63d40, 0x2e5266, 0xe9b44c, 0x6e8898, 0x50a2a7];
    for (let s = 0; s < 4; s++) {
      for (let i = 0; i < 6; i++) {
        g.add(box(0.06 + (i % 3) * 0.02, 0.28, 0.2, colored(colors[(s + i) % colors.length], 0.8), -w / 2 + 0.12 + i * (w - 0.2) / 6, 0.08 + s * 0.46, 0.05));
      }
    }
    return g;
  },
  car() {
    const paint = colored(0x2b4c7e, 0.25, 0.6);
    const g = group(
      box(1.8, 0.6, 4.2, paint, 0, 0.3),
      box(1.6, 0.5, 2.2, paint, 0, 0.9, -0.2),
      box(1.62, 0.4, 2.0, mat("glass"), 0, 0.95, -0.2)
    );
    for (const [x, z] of [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 20), mat("rubber"));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.34, z);
      wheel.castShadow = true;
      g.add(wheel);
    }
    return g;
  },
  shelves() {
    return group(
      ...[0.1, 0.7, 1.3, 1.9].map((y) => box(1.6, 0.04, 0.45, mat("darkMetal"), 0, y)),
      ...[[-0.78, -0.2], [0.78, -0.2], [-0.78, 0.2], [0.78, 0.2]].map(([x, z]) => box(0.04, 1.95, 0.04, mat("darkMetal"), x, 0, z)),
      box(0.4, 0.3, 0.35, colored(0x9c7b52, 0.9), -0.4, 0.74), box(0.35, 0.25, 0.3, colored(0x5d6d7e, 0.7), 0.35, 1.34)
    );
  },
  bench() {
    return group(
      box(1.5, 0.06, 0.45, mat("woodFurniture"), 0, 0.42),
      box(1.5, 0.4, 0.05, mat("woodFurniture"), 0, 0.52, -0.2),
      box(0.06, 0.42, 0.42, mat("darkMetal"), -0.65, 0, 0),
      box(0.06, 0.42, 0.42, mat("darkMetal"), 0.65, 0, 0)
    );
  },
  bush() {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + i * 0.05, 1), colored([0x3d6b2f, 0x4a7a36, 0x56863f][i], 0.9));
      b.position.set((i - 1) * 0.3, 0.3, (i % 2) * 0.15);
      b.castShadow = true;
      g.add(b);
    }
    return g;
  }
};

// ---- Disposição por tipo de divisão ------------------------------------------
// Cada item: [nome da peça, args, x, z, rotação, largura, profundidade]
// (x, z = centro da peça; largura/profundidade = área ocupada, para evitar dispositivos)
// Para onde a frente da peça aponta (rodar +Z em θ dá x = sin θ, z = cos θ):
//   S = virada para o norte (encostada à parede sul), E = virada para este (encostada à parede oeste)…
const N = 0, S = Math.PI, E = Math.PI / 2, W = -Math.PI / 2;

function layoutFor(type, w, h) {
  const items = [];
  const add = (name, args, x, z, rot, fw, fd) => items.push({ name, args, x, z, rot, fw, fd });

  switch (type) {
    case "living": {
      const sofaW = Math.min(2.2, w - 1.4);
      if (sofaW >= 1.4) add("sofa", [sofaW], w / 2, h - 0.65, S, sofaW, 0.9);
      add("rug", [Math.min(2.4, w - 1.6), Math.min(1.6, h - 2.6)], w / 2, h / 2 + 0.2, N, 0, 0);
      add("coffeeTable", [], w / 2, h / 2 + 0.3, N, 1.1, 0.6);
      add("tvUnit", [Math.min(1.8, w - 1.4)], w / 2, 0.33, N, 1.8, 0.45);
      add("plant", [], 0.45, h - 0.45, N, 0.4, 0.4);
      add("plant", [], w - 0.45, 0.45, N, 0.4, 0.4);
      break;
    }
    case "kitchen": {
      const len = Math.min(w - 1.4, 3.2);
      if (len >= 1.2) add("counter", [len], 0.85 + len / 2, 0.33, N, len, 0.6);
      add("fridge", [], 0.42, 0.4, N, 0.7, 0.7);
      if (w >= 3.4 && h >= 3.8) add("diningTable", [], w / 2, h / 2 + 0.6, N, 1.5, 2.0);
      break;
    }
    case "bedroom": {
      const double = w >= 3;
      add("bed", [double], w / 2, 1.12, N, double ? 1.7 : 1.05, 2.15);
      add("nightstand", [], w / 2 - (double ? 1.15 : 0.8), 0.25, N, 0.45, 0.4);
      add("nightstand", [], w / 2 + (double ? 1.15 : 0.8), 0.25, N, 0.45, 0.4);
      if (h >= 3.4) add("wardrobe", [Math.min(1.6, h - 1.2)], 0.33, h - 0.9, E, 0.6, 1.6);
      break;
    }
    case "bathroom":
      add("bathtub", [], 0.95, 0.42, N, 1.7, 0.75);
      add("sink", [], w - 0.26, h / 2, W, 0.45, 0.6);
      add("toilet", [], w - 0.35, h - 0.45, W, 0.45, 0.6);
      break;
    case "entrance":
      add("shoeCabinet", [], 0.2, h / 2, E, 0.35, 1.0);
      add("coatRack", [], w - 0.4, 0.4, N, 0.45, 0.45);
      add("plant", [], w - 0.45, h - 0.45, N, 0.4, 0.4);
      break;
    case "office":
      add("desk", [], w / 2, 0.38, N, 1.4, 0.7);
      add("officeChair", [], w / 2, 1.05, S, 0.6, 0.6);
      add("bookshelf", [Math.min(1.2, h - 1)], w - 0.18, h / 2, W, 0.32, 1.2);
      break;
    case "garage":
      if (w >= 2.6 && h >= 4.8) add("car", [], w / 2, h / 2, N, 1.9, 4.3);
      add("shelves", [], 0.25, 1.2, E, 0.45, 1.6);
      break;
    case "garden":
      add("bench", [], w / 2, h - 0.5, S, 1.5, 0.5);
      add("bush", [], 0.6, 0.6, N, 0.9, 0.7);
      add("bush", [], w - 0.6, 0.6, N, 0.9, 0.7);
      break;
  }
  return items;
}

/**
 * Cria a mobília de uma divisão.
 * @param {string} roomType
 * @param {number} w largura (x)
 * @param {number} h profundidade (z)
 * @param {Array<{x:number,z:number}>} devicePoints posições dos dispositivos (coordenadas locais)
 */
export function createFurniture(roomType, w, h, devicePoints = []) {
  const root = new THREE.Group();
  root.name = "furniture";

  for (const it of layoutFor(roomType, w, h)) {
    // Peça tem de caber na sala
    const halfW = (Math.abs(Math.sin(it.rot)) > 0.5 ? it.fd : it.fw) / 2;
    const halfD = (Math.abs(Math.sin(it.rot)) > 0.5 ? it.fw : it.fd) / 2;
    if (it.x - halfW < 0.05 || it.x + halfW > w - 0.05 || it.z - halfD < 0.05 || it.z + halfD > h - 0.05) continue;

    // E não pode tapar um dispositivo (margem de 0,3 m)
    const blocked = it.fw > 0 && devicePoints.some((p) =>
      Math.abs(p.x - it.x) < halfW + 0.3 && Math.abs(p.z - it.z) < halfD + 0.3);
    if (blocked) continue;

    const piece = PIECES[it.name](...it.args);
    piece.position.set(it.x, 0, it.z);
    piece.rotation.y = it.rot;
    root.add(piece);
  }
  return root;
}
