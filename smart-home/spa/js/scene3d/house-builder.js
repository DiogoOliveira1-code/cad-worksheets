// Constrói e mantém a casa 3D a partir dos dados de /zones.
// Não reconstrói tudo a cada leitura de sensor: cria/remove apenas o que mudou
// e, para o resto, só atualiza o estado (valor, ligado/desligado, cor).
import * as THREE from "three";
import { createRoom } from "./room-mesh.js";
import { createDevice } from "./devices/device-registry.js";
import { zoneStatus } from "../utils/status.js";

/**
 * @param {object} ctx           contexto devolvido por createScene
 * @param {object} [environment] ambiente (opcional; o editor não usa)
 */
export function createHouse(ctx, environment = null) {
  const root = new THREE.Group();
  root.name = "house";
  ctx.scene.add(root);

  const rooms = new Map();    // zoneId -> room
  const devices = new Map();  // "zoneId/kind/deviceId" -> { device, type }
  let framedOnce = false;
  let layoutKey = "";
  let selectedId = null;

  // Animações dos dispositivos (ventoinha a rodar, buzzer a pulsar…)
  ctx.onFrame((dt, t) => {
    for (const { device } of devices.values()) device.tick?.(dt, t);
  });

  function syncDevices(zoneId, zone, room) {
    const seen = new Set();
    const lists = [
      ["sensors", zone.sensors ?? {}],
      ["actuators", zone.actuators ?? {}]
    ];

    for (const [kind, list] of lists) {
      for (const [id, def] of Object.entries(list)) {
        const key = `${zoneId}/${kind}/${id}`;
        seen.add(key);
        let entry = devices.get(key);

        // Se o tipo mudou, recria
        if (entry && entry.type !== def.type) {
          entry.device.dispose();
          devices.delete(key);
          entry = null;
        }
        if (!entry) {
          const device = createDevice(kind, def, room.size);
          // Referência usada pelo editor para saber que dispositivo foi clicado
          device.object.userData.deviceRef = { zoneId, kind, id };
          room.devices.add(device.object);
          entry = { device, type: def.type };
          devices.set(key, entry);
        }

        // Posição dentro da sala (pos.x/pos.y entre 0 e 1); sem pos, fica ao centro
        const px = def.pos?.x ?? 0.5;
        const py = def.pos?.y ?? 0.5;
        entry.device.object.position.set(px * room.size.w, 0, py * room.size.h);
        entry.device.update(def, room.size);
      }
    }

    // Remove dispositivos desta sala que já não existem
    for (const [key, { device }] of devices) {
      if (key.startsWith(`${zoneId}/`) && !seen.has(key)) {
        device.dispose();
        devices.delete(key);
      }
    }
  }

  function update(zones) {
    zones = zones ?? {};

    // Divisões novas / atualizadas
    for (const [zoneId, zone] of Object.entries(zones)) {
      let room = rooms.get(zoneId);
      if (!room) {
        room = createRoom(zoneId, zone);
        root.add(room.group);
        rooms.set(zoneId, room);
      } else {
        room.update(zone);
      }
      room.setStatus(zoneStatus(zone));
      room.setSelected(zoneId === selectedId);
      syncDevices(zoneId, zone, room);
    }

    // Divisões removidas
    for (const [zoneId, room] of rooms) {
      if (!zones[zoneId]) {
        for (const [key, { device }] of devices) {
          if (key.startsWith(`${zoneId}/`)) { device.dispose(); devices.delete(key); }
        }
        room.dispose();
        rooms.delete(zoneId);
        if (selectedId === zoneId) selectedId = null;
      }
    }

    // Se a planta mudou (salas adicionadas/movidas), volta a enquadrar a câmara
    const key = JSON.stringify(Object.entries(zones).map(([id, z]) => [id, z.layout]));
    if (key !== layoutKey) {
      layoutKey = key;
      const box = new THREE.Box3().setFromObject(root);
      if (!box.isEmpty()) {
        environment?.centerOn(box.getCenter(new THREE.Vector3()));
        if (!framedOnce) { ctx.frame(box); framedOnce = true; }
      }
    }
  }

  /** Caixa que envolve uma sala (só chão e paredes, sem etiquetas). */
  function roomBox(zoneId) {
    const room = rooms.get(zoneId);
    if (!room) return null;
    const { w, h } = room.size;
    const p = room.group.position;
    return new THREE.Box3(new THREE.Vector3(p.x, 0, p.z), new THREE.Vector3(p.x + w, 1, p.z + h));
  }

  /** Caixa que envolve a casa toda. */
  function houseBox() {
    const box = new THREE.Box3();
    for (const id of rooms.keys()) box.union(roomBox(id));
    return box;
  }

  return {
    update,
    roomBox,
    houseBox,
    /** Objetos 3D de todos os dispositivos (para o editor os poder selecionar). */
    deviceTargets: () => [...devices.values()].map((e) => e.device.object),
    /** Objetos clicáveis: o chão de cada sala. */
    pickTargets: () => [...rooms.values()].map((r) => r.floor),
    select(zoneId) {
      selectedId = zoneId;
      for (const [id, room] of rooms) room.setSelected(id === zoneId);
    },
    get selected() { return selectedId; }
  };
}
