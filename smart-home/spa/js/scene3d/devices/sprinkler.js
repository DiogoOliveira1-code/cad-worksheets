// Rega (aspersor de jardim): quando ligada, lança jatos de água em arco a rodar.
import * as THREE from "three";

const DROPS = 260;

export function createSprinkler() {
  const object = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 0.08, 16),
    new THREE.MeshStandardMaterial({ color: 0x2f5d3a, roughness: 0.6 })
  );
  base.position.y = 0.04;
  base.castShadow = true;
  object.add(base);

  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.18, 12),
    new THREE.MeshStandardMaterial({ color: 0xb8b8b4, metalness: 0.7, roughness: 0.3 })
  );
  head.position.y = 0.17;
  object.add(head);

  // Gotas: cada uma tem um ângulo, uma fase e uma velocidade
  const positions = new Float32Array(DROPS * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const water = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xbfe3ff, size: 0.05, transparent: true, opacity: 0.8 }));
  water.visible = false;
  water.frustumCulled = false;
  object.add(water);

  const drops = Array.from({ length: DROPS }, (_, i) => ({
    angle: (i / DROPS) * Math.PI * 2,
    phase: Math.random(),
    speed: 2.6 + Math.random() * 0.8
  }));

  let on = false;
  let spin = 0;

  return {
    object,
    update(def) {
      on = def.state === true;
      water.visible = on;
    },
    tick(dt, t) {
      if (!on) return;
      spin += dt * 1.5;
      const g = 9.8;
      drops.forEach((d, i) => {
        const life = (t * 0.9 + d.phase) % 1;  // 0–1 ao longo do voo
        const tt = life * 0.55;
        const a = d.angle + spin;
        const horiz = d.speed * 0.8 * tt;
        positions[i * 3] = Math.cos(a) * horiz;
        positions[i * 3 + 1] = 0.25 + d.speed * 0.9 * tt - 0.5 * g * tt * tt;
        positions[i * 3 + 2] = Math.sin(a) * horiz;
      });
      geo.attributes.position.needsUpdate = true;
    }
  };
}
