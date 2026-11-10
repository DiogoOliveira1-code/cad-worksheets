// Editor visual da casa (ecrã 3): vista de topo sobre uma grelha.
//
// Modos:
//   "select" -> clicar seleciona; arrastar move a divisão ou o dispositivo; os cantos redimensionam
//   "draw"   -> arrastar desenha uma divisão nova
//   "place"  -> clicar dentro de uma divisão coloca o dispositivo escolhido na paleta
//
// O editor não escreve na base de dados: avisa a view (devices.js) através dos callbacks,
// e é a view que grava. Durante um arrasto mostra uma pré-visualização local.
import * as THREE from "three";
import { createScene } from "../scene.js";
import { createHouse } from "../house-builder.js";
import { createGrid } from "./grid.js";
import { createRoomTool } from "./room-tool.js";
import { createDeviceTool } from "./device-tool.js";

/**
 * @param {HTMLElement} container
 * @param {object} cb callbacks:
 *   onRoomDrawn(layout)                    divisão nova desenhada
 *   onRoomChanged(zoneId, layout)          divisão movida/redimensionada
 *   onDevicePlaced(zoneId, pos, pending)   dispositivo colocado (pending = {kind, type})
 *   onDeviceMoved(zoneId, kind, id, pos)   dispositivo arrastado
 *   onSelect(selection)                    seleção mudou ({type:"room",zoneId} | {type:"device",zoneId,kind,id} | null)
 *   onModeChange(mode)                     o editor mudou de modo sozinho (ex.: depois de colocar)
 *   onDeleteKey(selection)                 tecla Delete com algo selecionado
 */
export function createEditor(container, cb) {
  const ctx = createScene(container, { topView: true });
  ctx.scene.background = new THREE.Color(0xf4f3ee);

  // Luz simples e uniforme (o editor não precisa de céu nem sombras fortes)
  ctx.scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d6cc, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(5, 20, 8);
  ctx.scene.add(sun);

  const house = createHouse(ctx, null);
  const grid = createGrid(ctx);
  const rooms = createRoomTool(ctx);
  const devices = createDeviceTool(ctx);
  const canvas = ctx.renderer.domElement;

  let zones = {};
  let preview = null;        // cópia local durante um arrasto
  let mode = "select";
  let pending = null;        // dispositivo escolhido na paleta
  let selection = null;
  let drag = null;           // estado do arrasto atual

  const current = () => preview ?? zones;
  const clone = (o) => structuredClone(o);

  // ---- Seleção --------------------------------------------------------------
  function refreshSelectionVisuals() {
    const z = current();
    rooms.hideHandles();
    devices.hideSelection();
    house.select(null);
    if (!selection) return;

    const zone = z[selection.zoneId];
    if (!zone) { selection = null; cb.onSelect?.(null); return; }
    const l = zone.layout;
    if (selection.type === "room") {
      house.select(selection.zoneId);
      rooms.showHandles(l);
    } else {
      const d = zone[selection.kind]?.[selection.id];
      if (!d) { selection = null; cb.onSelect?.(null); return; }
      devices.showSelection(l, d.pos ?? { x: 0.5, y: 0.5 });
    }
  }

  function select(sel) {
    selection = sel;
    refreshSelectionVisuals();
    cb.onSelect?.(sel);
  }

  /** Divisão que contém o ponto (a mais pequena, se houver sobreposições). */
  function roomAt(p) {
    let best = null;
    for (const [id, z] of Object.entries(current())) {
      const l = z.layout;
      if (!l) continue;
      if (p.x >= l.x && p.x <= l.x + l.w && p.z >= l.y && p.z <= l.y + l.h) {
        if (!best || l.w * l.h < best.area) best = { id, area: l.w * l.h };
      }
    }
    return best?.id ?? null;
  }

  function showPreview() {
    house.update(preview);
    refreshSelectionVisuals();
  }

  // ---- Rato / toque -----------------------------------------------------------
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return; // botão direito/meio: deslocar a vista
    const { raycaster, point } = grid.fromEvent(e);
    if (!point) return;

    if (mode === "draw") {
      rooms.startDraw(point);
      drag = { type: "draw" };
    } else if (mode === "place") {
      const zoneId = roomAt(point);
      if (zoneId && pending) {
        const pos = devices.posInRoom(zones[zoneId].layout, point);
        cb.onDevicePlaced?.(zoneId, pos, pending);
      }
      return;
    } else {
      // 1) pega de um canto da divisão selecionada
      const corner = selection?.type === "room" ? rooms.hitHandle(raycaster) : null;
      if (corner) {
        drag = { type: "resize", zoneId: selection.zoneId, corner, start: clone(zones[selection.zoneId].layout) };
      } else {
        // 2) dispositivo  3) divisão  4) vazio
        const ref = devices.hitDevice(raycaster, house.deviceTargets());
        if (ref) {
          select({ type: "device", ...ref });
          drag = { type: "device", ...ref, moved: false };
        } else {
          const zoneId = roomAt(point);
          if (zoneId) {
            select({ type: "room", zoneId });
            drag = { type: "move", zoneId, from: point, start: clone(zones[zoneId].layout), moved: false };
          } else {
            select(null);
          }
        }
      }
    }
    if (drag) canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const { point } = grid.fromEvent(e);
    if (!point) return;

    if (drag.type === "draw") {
      rooms.moveDraw(point);
      return;
    }

    preview = preview ?? clone(zones);
    if (drag.type === "resize") {
      preview[drag.zoneId].layout = rooms.resize(drag.start, drag.corner, point);
    } else if (drag.type === "move") {
      const dx = point.x - drag.from.x;
      const dz = point.z - drag.from.z;
      if (Math.abs(dx) + Math.abs(dz) < 0.2 && !drag.moved) return; // ainda não é um arrasto
      drag.moved = true;
      preview[drag.zoneId].layout = rooms.move(drag.start, dx, dz);
    } else if (drag.type === "device") {
      const layout = zones[drag.zoneId].layout;
      drag.moved = true;
      drag.pos = devices.posInRoom(layout, point);
      preview[drag.zoneId][drag.kind][drag.id].pos = drag.pos;
    }
    showPreview();
  });

  function endDrag(e) {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);

    if (d.type === "draw") {
      const { point } = grid.fromEvent(e);
      const layout = point ? rooms.endDraw(point) : (rooms.cancelDraw(), null);
      if (layout) cb.onRoomDrawn?.(layout);
      return;
    }

    if (preview) {
      if (d.type === "resize" || (d.type === "move" && d.moved)) {
        cb.onRoomChanged?.(d.zoneId, preview[d.zoneId].layout);
      } else if (d.type === "device" && d.moved) {
        cb.onDeviceMoved?.(d.zoneId, d.kind, d.id, d.pos);
      }
    }
    // A base de dados devolve os dados atualizados através de setZones()
    preview = null;
    house.update(zones);
    refreshSelectionVisuals();
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  // Tecla Delete/Backspace apaga a seleção (só com o editor visível)
  window.addEventListener("keydown", (e) => {
    if (container.offsetParent === null || !selection) return;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      cb.onDeleteKey?.(selection);
    }
    if (e.key === "Escape") select(null);
  });

  let framed = false;

  return {
    /** Recebe os dados atuais da base de dados. */
    setZones(z) {
      zones = z ?? {};
      if (!drag) {
        preview = null;
        house.update(zones);
        refreshSelectionVisuals();
      }
      if (!framed && Object.keys(zones).length) {
        framed = true;
        this.frameAll();
      }
    },
    /** Muda de modo: "select" | "draw" | "place" (com o dispositivo escolhido). */
    setMode(m, pendingDevice = null) {
      mode = m;
      pending = pendingDevice;
      rooms.cancelDraw();
      canvas.style.cursor = m === "select" ? "" : "crosshair";
    },
    get mode() { return mode; },
    select,
    get selection() { return selection; },
    /** Enquadra a casa toda. */
    frameAll() {
      const box = house.houseBox();
      if (box.isEmpty()) return;
      const c = box.getCenter(new THREE.Vector3());
      grid.centerOn(c.x, c.z);
      ctx.frame(box);
    }
  };
}
