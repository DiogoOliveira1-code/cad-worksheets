// Uma divisão em 3D: chão (com a cor do estado), paredes baixas em corte e nome.
// Coordenadas: o layout {x, y, w, h} está em metros, visto de cima.
//   layout.x -> eixo X do 3D,  layout.y -> eixo Z do 3D,  a altura é o eixo Y.
import * as THREE from "three";
import { createLabel, disposeLabel } from "./labels.js";

const WALL_HEIGHT = 1.0;   // paredes baixas, para se ver o interior (maquete em corte)
const WALL_THICK = 0.12;
const FLOOR_THICK = 0.1;

// Cor do chão por estado
const FLOOR_COLORS = {
  ok: 0xe9e4d8,
  unknown: 0xe9e4d8,
  warn: 0xf6cf7a,
  danger: 0xef8a8a
};
const SELECTED_EMISSIVE = 0x2a4fa0;

const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.9 });

export function createRoom(zoneId, zone) {
  const group = new THREE.Group();
  group.name = `room:${zoneId}`;

  const floorMat = new THREE.MeshStandardMaterial({ color: FLOOR_COLORS.ok, roughness: 0.85 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(1, FLOOR_THICK, 1), floorMat);
  floor.receiveShadow = true;
  floor.userData.zoneId = zoneId; // usado pelo picking
  group.add(floor);

  const walls = new THREE.Group();
  group.add(walls);

  // Os dispositivos ficam aqui dentro (coordenadas locais da sala)
  const devices = new THREE.Group();
  group.add(devices);

  const nameLabel = createLabel(zone.name ?? zoneId, "label-room");
  group.add(nameLabel.object);

  let current = { w: 0, h: 0 };
  let status = "ok";
  let selected = false;

  function buildWalls(w, h) {
    walls.children.forEach((m) => m.geometry.dispose());
    walls.clear();
    const specs = [
      // [centro x, centro z, largura, profundidade]
      [w / 2, 0, w + WALL_THICK, WALL_THICK],
      [w / 2, h, w + WALL_THICK, WALL_THICK],
      [0, h / 2, WALL_THICK, h],
      [w, h / 2, WALL_THICK, h]
    ];
    for (const [cx, cz, sw, sd] of specs) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(sw, WALL_HEIGHT, sd), wallMaterial);
      wall.position.set(cx, WALL_HEIGHT / 2, cz);
      wall.castShadow = true;
      wall.receiveShadow = true;
      walls.add(wall);
    }
  }

  function paint() {
    floorMat.color.setHex(FLOOR_COLORS[status] ?? FLOOR_COLORS.ok);
    floorMat.emissive.setHex(selected ? SELECTED_EMISSIVE : 0x000000);
    floorMat.emissiveIntensity = selected ? 0.35 : 0;
  }

  /** Atualiza posição, tamanho e nome a partir dos dados da divisão. */
  function update(z) {
    const { x = 0, y = 0, w = 4, h = 4 } = z.layout ?? {};
    group.position.set(x, 0, y);

    if (w !== current.w || h !== current.h) {
      floor.scale.set(w, 1, h);
      floor.position.set(w / 2, -FLOOR_THICK / 2 + 0.01, h / 2);
      buildWalls(w, h);
      nameLabel.object.position.set(w / 2, 0.05, h - 0.3);
      current = { w, h };
    }
    nameLabel.setText(z.name ?? zoneId);
  }

  update(zone);

  return {
    group,
    floor,
    devices,
    get size() { return current; },
    update,
    setStatus(s) { status = s; paint(); },
    setSelected(v) { selected = v; paint(); },
    dispose() {
      disposeLabel(nameLabel);
      floor.geometry.dispose();
      floorMat.dispose();
      walls.children.forEach((m) => m.geometry.dispose());
      group.removeFromParent();
    }
  };
}
