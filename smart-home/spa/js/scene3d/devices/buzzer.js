// Alarme sonoro: quando ligado, emite "ondas" vermelhas a pulsar.
import * as THREE from "three";

export function createBuzzer() {
  const object = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.18, 0.2, 24),
    new THREE.MeshStandardMaterial({ color: 0x2c2c2a, roughness: 0.5 })
  );
  body.position.y = 0.1;
  body.castShadow = true;
  object.add(body);

  const topMat = new THREE.MeshStandardMaterial({ color: 0x8a2a2a, emissive: 0x000000 });
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), topMat);
  top.position.y = 0.2;
  object.add(top);

  // Três ondas que crescem e desaparecem
  const waves = [];
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xe24b4a, transparent: true, opacity: 0, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.015, 8, 48), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.25;
    object.add(ring);
    waves.push({ ring, mat, offset: i / 3 });
  }

  let on = false;

  return {
    object,
    update(def) {
      on = def.state === true;
      topMat.color.setHex(on ? 0xff4a4a : 0x8a2a2a);
      if (!on) {
        topMat.emissive.setHex(0x000000);
        waves.forEach((w) => (w.mat.opacity = 0));
      }
    },
    tick(_dt, t) {
      if (!on) return;
      // pisca a luz do topo e expande as ondas
      topMat.emissive.setHex(Math.sin(t * 12) > 0 ? 0xff2020 : 0x300000);
      for (const w of waves) {
        const p = (t * 0.9 + w.offset) % 1;
        w.ring.scale.setScalar(1 + p * 3);
        w.mat.opacity = 0.8 * (1 - p);
      }
    }
  };
}
