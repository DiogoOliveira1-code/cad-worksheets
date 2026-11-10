// Ferramenta de dispositivos: saber qual foi clicado, calcular a posição dentro da sala
// e mostrar um anel à volta do dispositivo selecionado.
import * as THREE from "three";

const MARGIN = 0.05; // os dispositivos ficam entre 5 % e 95 % da sala

export function createDeviceTool(ctx) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.42, 32),
    new THREE.MeshBasicMaterial({ color: 0x185fa5, side: THREE.DoubleSide, depthTest: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 10;
  ring.visible = false;
  ctx.scene.add(ring);

  const clamp = (v) => Math.min(1 - MARGIN, Math.max(MARGIN, v));

  return {
    /** Referência {zoneId, kind, id} do dispositivo tocado pelo raio, ou null. */
    hitDevice(raycaster, deviceObjects) {
      const hit = raycaster.intersectObjects(deviceObjects, true)[0];
      if (!hit) return null;
      let o = hit.object;
      while (o && !o.userData.deviceRef) o = o.parent;
      return o ? o.userData.deviceRef : null;
    },
    /** Converte um ponto do chão numa posição relativa (0–1) dentro da sala. */
    posInRoom(layout, p) {
      return {
        x: Math.round(clamp((p.x - layout.x) / layout.w) * 100) / 100,
        y: Math.round(clamp((p.z - layout.y) / layout.h) * 100) / 100
      };
    },
    showSelection(layout, pos) {
      ring.position.set(layout.x + pos.x * layout.w, 0.08, layout.y + pos.y * layout.h);
      ring.visible = true;
    },
    hideSelection() {
      ring.visible = false;
    }
  };
}
