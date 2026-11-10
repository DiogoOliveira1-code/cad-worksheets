// Candeeiro de pé: acende (e ilumina mesmo a sala) quando o atuador está ligado.
// Usado para "light" e para "relay" (o relé do nó 1 comanda a iluminação).
import * as THREE from "three";

export function createLamp() {
  const object = new THREE.Group();

  const metal = new THREE.MeshStandardMaterial({ color: 0x4a4a46, roughness: 0.4, metalness: 0.6 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.06, 24), metal);
  base.position.y = 0.03;
  base.castShadow = true;
  object.add(base);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 12), metal);
  pole.position.y = 0.78;
  pole.castShadow = true;
  object.add(pole);

  // Abajur (cone aberto) e lâmpada
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0xefe6d2, roughness: 0.8, side: THREE.DoubleSide });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 0.32, 24, 1, true), shadeMat);
  shade.position.y = 1.62;
  shade.castShadow = true;
  object.add(shade);

  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xdedbd2, emissive: 0x000000 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), bulbMat);
  bulb.position.y = 1.55;
  object.add(bulb);

  // Luz real da lâmpada (sem sombras, para ser leve)
  const light = new THREE.PointLight(0xffd69a, 0, 7, 2);
  light.position.y = 1.5;
  object.add(light);

  let target = 0;

  return {
    object,
    update(def) {
      const on = def.state === true;
      target = on ? 9 : 0;
      bulbMat.emissive.setHex(on ? 0xffc870 : 0x000000);
      bulbMat.emissiveIntensity = on ? 10 : 0; // muito brilhante: ganha o efeito de brilho (bloom)
      shadeMat.emissive.setHex(on ? 0x6a5530 : 0x000000);
    },
    tick(dt) {
      // acender/apagar suave
      light.intensity += (target - light.intensity) * Math.min(1, dt * 8);
    }
  };
}
