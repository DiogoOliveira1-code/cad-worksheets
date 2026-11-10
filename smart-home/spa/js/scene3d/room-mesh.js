// Uma divisão em 3D: chão com a textura do tipo de divisão, paredes de reboco em corte,
// mobília, nome e uma camada de cor por cima do chão para o estado (aviso/perigo/seleção).
// Divisões exteriores (jardim) não têm paredes: chão de relva com uma bordadura de pedra.
//
// Coordenadas: o layout {x, y, w, h} está em metros, visto de cima.
//   layout.x -> eixo X do 3D,  layout.y -> eixo Z do 3D,  a altura é o eixo Y.
import * as THREE from "three";
import { createLabel, disposeLabel } from "./labels.js";
import { floorKind, floorMaterial, floorTileSize, mat } from "./materials.js";
import { createFurniture } from "./furniture.js";
import { ROOM_TYPES } from "../config/constants.js";

const WALL_HEIGHT = 1.1;   // paredes baixas, para se ver o interior (maquete em corte)
const WALL_THICK = 0.15;
const SLAB = 0.12;         // espessura da laje do chão

// Cor e opacidade da camada de estado
const OVERLAY = {
  warn:     { color: 0xf0a020, opacity: 0.32 },
  danger:   { color: 0xe24b4a, opacity: 0.4 },
  selected: { color: 0x3b82f6, opacity: 0.22 }
};

export function createRoom(zoneId, zone) {
  const group = new THREE.Group();
  group.name = `room:${zoneId}`;

  // Chão (plano com textura) — é também o alvo dos cliques
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), floorMaterial("wood"));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.zoneId = zoneId;
  group.add(floor);

  // Laje por baixo do chão (dá espessura à maquete)
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1, SLAB, 1), mat("slab"));
  slab.receiveShadow = true;
  group.add(slab);

  // Camada de estado (transparente, por cima do chão)
  const overlayMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), overlayMat);
  overlay.rotation.x = -Math.PI / 2;
  overlay.position.y = 0.015;
  overlay.renderOrder = 2;
  group.add(overlay);

  const walls = new THREE.Group();
  group.add(walls);

  let furniture = null;

  // Os dispositivos ficam aqui dentro (coordenadas locais da sala)
  const devices = new THREE.Group();
  group.add(devices);

  const nameLabel = createLabel(zone.name ?? zoneId, "label-room");
  group.add(nameLabel.object);

  let current = { w: 0, h: 0 };
  let shapeKey = "";
  let furnitureKey = "";
  let status = "ok";
  let selected = false;

  function disposeGroup(g) {
    g.traverse((o) => {
      o.geometry?.dispose();
      if (o.material && !o.material.userData?.shared) o.material.dispose();
    });
    g.clear();
  }

  function buildWalls(w, h, outdoor) {
    disposeGroup(walls);
    if (outdoor) {
      // Bordadura de pedra baixa à volta do jardim
      const specs = [[w / 2, 0, w, 0.12], [w / 2, h, w, 0.12], [0, h / 2, 0.12, h], [w, h / 2, 0.12, h]];
      for (const [cx, cz, sw, sd] of specs) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.08, sd), mat("stonePath"));
        edge.position.set(cx, 0.04, cz);
        edge.receiveShadow = true;
        walls.add(edge);
      }
      return;
    }
    const specs = [
      // [centro x, centro z, largura, profundidade]
      [w / 2, 0, w + WALL_THICK, WALL_THICK],
      [w / 2, h, w + WALL_THICK, WALL_THICK],
      [0, h / 2, WALL_THICK, h - WALL_THICK],
      [w, h / 2, WALL_THICK, h - WALL_THICK]
    ];
    for (const [cx, cz, sw, sd] of specs) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(sw, WALL_HEIGHT, sd), mat("plaster"));
      wall.position.set(cx, WALL_HEIGHT / 2, cz);
      wall.castShadow = true;
      wall.receiveShadow = true;
      walls.add(wall);
      // Remate escuro no topo do corte (lê-se melhor a espessura da parede)
      const cap = new THREE.Mesh(new THREE.BoxGeometry(sw + 0.002, 0.02, sd + 0.002), mat("wallTop"));
      cap.position.set(cx, WALL_HEIGHT + 0.01, cz);
      walls.add(cap);
    }
  }

  /** Chão com as UVs em metros, para a textura ter sempre o mesmo tamanho real. */
  function buildFloor(w, h, kind) {
    floor.geometry.dispose();
    const geo = new THREE.PlaneGeometry(w, h);
    const [tw, th] = floorTileSize(kind);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tw, (uv.getY(i) * h) / th);
    floor.geometry = geo;
    floor.material = floorMaterial(kind);
    floor.position.set(w / 2, 0.005, h / 2);

    slab.scale.set(w, 1, h);
    slab.position.set(w / 2, -SLAB / 2, h / 2);
    overlay.scale.set(w, h, 1);
    overlay.position.set(w / 2, 0.015, h / 2);
  }

  function buildFurniture(z, w, h) {
    // Posições dos dispositivos (para a mobília não os tapar)
    const points = [
      ...Object.values(z.sensors ?? {}), ...Object.values(z.actuators ?? {})
    ].map((d) => ({ x: (d.pos?.x ?? 0.5) * w, z: (d.pos?.y ?? 0.5) * h }));

    const key = JSON.stringify([z.roomType, w, h, points.map((p) => [p.x.toFixed(1), p.z.toFixed(1)])]);
    if (key === furnitureKey) return;
    furnitureKey = key;

    if (furniture) { disposeGroup(furniture); furniture.removeFromParent(); }
    furniture = createFurniture(z.roomType, w, h, points);
    group.add(furniture);
  }

  function paint() {
    const o = selected ? OVERLAY.selected : OVERLAY[status];
    if (o) {
      overlayMat.color.setHex(o.color);
      overlayMat.opacity = o.opacity;
    } else {
      overlayMat.opacity = 0;
    }
  }

  /** Atualiza posição, tamanho, tipo e nome a partir dos dados da divisão. */
  function update(z) {
    const { x = 0, y = 0, w = 4, h = 4 } = z.layout ?? {};
    const outdoor = !!ROOM_TYPES[z.roomType]?.outdoor;
    const kind = floorKind(z.roomType);
    group.position.set(x, 0, y);

    const key = `${w}|${h}|${kind}|${outdoor}`;
    if (key !== shapeKey) {
      shapeKey = key;
      buildFloor(w, h, kind);
      buildWalls(w, h, outdoor);
      slab.visible = !outdoor;
      nameLabel.object.position.set(w / 2, 0.05, h - 0.3);
      current = { w, h };
    }
    buildFurniture(z, w, h);
    nameLabel.setText(z.name ?? zoneId);
  }

  update(zone);

  return {
    group,
    floor,
    devices,
    get size() { return current; },
    get outdoor() { return !!ROOM_TYPES[zone.roomType]?.outdoor; },
    update(z) { zone = z; update(z); },
    setStatus(s) { status = s; paint(); },
    setSelected(v) { selected = v; paint(); },
    dispose() {
      disposeLabel(nameLabel);
      disposeGroup(walls);
      if (furniture) disposeGroup(furniture);
      floor.geometry.dispose();
      slab.geometry.dispose();
      overlay.geometry.dispose();
      overlayMat.dispose();
      group.removeFromParent();
    }
  };
}
