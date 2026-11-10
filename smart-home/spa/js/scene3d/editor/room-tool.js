// Ferramenta de divisões: desenhar um retângulo novo, e pegas (cantos) para redimensionar.
// Todas as medidas em metros, com encaixe na grelha de 0,5 m.
import * as THREE from "three";
import { snap, GRID_STEP } from "./grid.js";

export const MIN_SIZE = 1; // tamanho mínimo de uma divisão (m)

const CORNERS = ["nw", "ne", "sw", "se"];

export function createRoomTool(ctx) {
  // Pré-visualização do retângulo a desenhar
  const preview = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.05, 1),
    new THREE.MeshBasicMaterial({ color: 0x378add, transparent: true, opacity: 0.35, depthWrite: false })
  );
  preview.visible = false;
  ctx.scene.add(preview);

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.05, 1)),
    new THREE.LineBasicMaterial({ color: 0x185fa5 })
  );
  outline.visible = false;
  ctx.scene.add(outline);

  // Pegas dos cantos da divisão selecionada
  const handleMat = new THREE.MeshBasicMaterial({ color: 0x185fa5 });
  const handles = {};
  for (const c of CORNERS) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.35), handleMat);
    h.userData.corner = c;
    h.visible = false;
    h.renderOrder = 10;
    ctx.scene.add(h);
    handles[c] = h;
  }

  let drawStart = null;

  /** Normaliza dois cantos num layout {x, y, w, h}. */
  function rectFrom(a, b) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.z, b.z);
    return { x, y, w: Math.abs(b.x - a.x), h: Math.abs(b.z - a.z) };
  }

  function showRect(mesh, l) {
    mesh.scale.set(Math.max(l.w, 0.01), 1, Math.max(l.h, 0.01));
    mesh.position.set(l.x + l.w / 2, 0.06, l.y + l.h / 2);
    mesh.visible = true;
  }

  return {
    // ---- Desenhar ----
    startDraw(p) {
      drawStart = { x: snap(p.x), z: snap(p.z) };
      showRect(preview, { x: drawStart.x, y: drawStart.z, w: 0, h: 0 });
    },
    moveDraw(p) {
      if (!drawStart) return;
      const l = rectFrom(drawStart, { x: snap(p.x), z: snap(p.z) });
      showRect(preview, l);
      showRect(outline, l);
    },
    /** Termina o desenho; devolve o layout, ou null se for demasiado pequeno. */
    endDraw(p) {
      if (!drawStart) return null;
      const l = rectFrom(drawStart, { x: snap(p.x), z: snap(p.z) });
      drawStart = null;
      preview.visible = outline.visible = false;
      return l.w >= MIN_SIZE && l.h >= MIN_SIZE ? l : null;
    },
    cancelDraw() {
      drawStart = null;
      preview.visible = outline.visible = false;
    },

    // ---- Pegas ----
    showHandles(l) {
      const pos = {
        nw: [l.x, l.y], ne: [l.x + l.w, l.y],
        sw: [l.x, l.y + l.h], se: [l.x + l.w, l.y + l.h]
      };
      for (const c of CORNERS) {
        handles[c].position.set(pos[c][0], 1.3, pos[c][1]);
        handles[c].visible = true;
      }
    },
    hideHandles() {
      for (const c of CORNERS) handles[c].visible = false;
    },
    /** Devolve o canto ("nw", "se"…) se o raio tocar numa pega visível. */
    hitHandle(raycaster) {
      const visible = CORNERS.map((c) => handles[c]).filter((h) => h.visible);
      const hit = raycaster.intersectObjects(visible, false)[0];
      return hit ? hit.object.userData.corner : null;
    },
    /** Novo layout ao arrastar um canto até ao ponto p (o canto oposto fica fixo). */
    resize(l, corner, p) {
      const px = snap(p.x);
      const pz = snap(p.z);
      let { x, y, w, h } = l;
      const right = x + w;
      const bottom = y + h;
      if (corner.includes("w")) { x = Math.min(px, right - MIN_SIZE); w = right - x; }
      if (corner.includes("e")) { w = Math.max(px - x, MIN_SIZE); }
      if (corner.includes("n")) { y = Math.min(pz, bottom - MIN_SIZE); h = bottom - y; }
      if (corner.includes("s")) { h = Math.max(pz - y, MIN_SIZE); }
      return { x, y, w, h };
    },
    /** Novo layout ao mover a divisão inteira (dx, dz desde o início do arrasto). */
    move(l, dx, dz) {
      return { ...l, x: snap(l.x + dx, GRID_STEP), y: snap(l.y + dz, GRID_STEP) };
    }
  };
}
