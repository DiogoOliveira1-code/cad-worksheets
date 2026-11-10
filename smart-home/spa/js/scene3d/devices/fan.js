// Ventoinha de pé: as pás rodam à velocidade do nível (PWM 0–100 %).
// Usada para "fan" (nó 2) e "hvac".
import * as THREE from "three";

const MAX_SPEED = 25; // rad/s a 100 %

export function createFan() {
  const object = new THREE.Group();

  const dark = new THREE.MeshStandardMaterial({ color: 0x3d3d3a, roughness: 0.5, metalness: 0.3 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x378add, roughness: 0.4 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 24), dark);
  base.position.y = 0.04;
  base.castShadow = true;
  object.add(base);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 12), dark);
  pole.position.y = 0.55;
  pole.castShadow = true;
  object.add(pole);

  // Cabeça virada para a frente (+Z); o rotor roda à volta do eixo Z
  const head = new THREE.Group();
  head.position.y = 1.12;
  object.add(head);

  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 16), dark);
  motor.rotation.x = Math.PI / 2;
  head.add(motor);

  const rotor = new THREE.Group();
  rotor.position.z = 0.12;
  head.add(rotor);

  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI * 2) / 3;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.02), bladeMat);
    blade.position.y = 0.2;
    blade.rotation.y = 0.35; // ligeira inclinação das pás
    blade.castShadow = true;
    arm.add(blade);
    rotor.add(arm);
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), dark);
  rotor.add(hub);

  // Grelha de proteção (anel)
  const guard = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.012, 8, 48),
    new THREE.MeshStandardMaterial({ color: 0xb4b2a9, metalness: 0.6, roughness: 0.3 })
  );
  guard.position.z = 0.12;
  head.add(guard);

  let targetSpeed = 0;
  let speed = 0;

  return {
    object,
    update(def) {
      const level = typeof def.level === "number" ? def.level : 100;
      targetSpeed = def.state === true ? (level / 100) * MAX_SPEED : 0;
    },
    tick(dt) {
      speed += (targetSpeed - speed) * Math.min(1, dt * 2); // acelera/abranda suavemente
      rotor.rotation.z -= speed * dt;
    }
  };
}
