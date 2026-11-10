// Estores: um painel de lâminas que desce (fechado = ligado) ou sobe (aberto = desligado).
import * as THREE from "three";

const WIDTH = 1.6;
const MAX_H = 0.95;
const SLATS = 9;

export function createBlinds() {
  const object = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x888780, roughness: 0.5 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + 0.1, 0.1, 0.14), frameMat);
  box.position.y = MAX_H + 0.05;
  box.castShadow = true;
  object.add(box);

  // As lâminas ficam num grupo "pendurado" na caixa; escala em Y = quanto está fechado
  const curtain = new THREE.Group();
  curtain.position.y = MAX_H;
  object.add(curtain);

  const slatMat = new THREE.MeshStandardMaterial({ color: 0xd3d1c7, roughness: 0.7 });
  const slatGeo = new THREE.BoxGeometry(WIDTH, (MAX_H / SLATS) * 0.85, 0.04);
  for (let i = 0; i < SLATS; i++) {
    const slat = new THREE.Mesh(slatGeo, slatMat);
    slat.position.y = -((i + 0.5) * MAX_H) / SLATS;
    slat.castShadow = true;
    curtain.add(slat);
  }

  let target = 0.12;
  let current = 0.12;

  return {
    object,
    update(def) {
      target = def.state === true ? 1 : 0.12; // fechado / aberto
    },
    tick(dt) {
      current += (target - current) * Math.min(1, dt * 3);
      curtain.scale.y = current;
    }
  };
}
