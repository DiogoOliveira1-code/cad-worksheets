// Ambiente à volta da casa: luzes, chão exterior e céu.
// setDaylight(true/false) faz a transição suave entre dia e noite.
import * as THREE from "three";

const DAY = {
  sky: new THREE.Color(0xbfdcf2),
  ground: new THREE.Color(0x8fbf5a),
  hemi: 1.6,
  sun: 2.6
};
const NIGHT = {
  sky: new THREE.Color(0x141a33),
  ground: new THREE.Color(0x2c4420),
  hemi: 0.25,
  sun: 0.15
};

export function createEnvironment(ctx) {
  const { scene, onFrame } = ctx;

  scene.background = DAY.sky.clone();

  // Luz do céu (vem de cima, azulada) e do chão (esverdeada)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x6b7a55, DAY.hemi);
  scene.add(hemi);

  // "Sol": luz direcional que projeta sombras
  const sun = new THREE.DirectionalLight(0xfff4e0, DAY.sun);
  sun.position.set(15, 25, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 80 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(sun.target);

  // Relvado à volta da casa
  const groundMat = new THREE.MeshStandardMaterial({ color: DAY.ground.clone(), roughness: 1 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 64), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);

  // Transição suave: a cada frame aproxima-se 2 % do alvo
  let target = DAY;
  onFrame((dt) => {
    const k = 1 - Math.pow(0.02, dt);
    scene.background.lerp(target.sky, k);
    groundMat.color.lerp(target.ground, k);
    hemi.intensity += (target.hemi - hemi.intensity) * k;
    sun.intensity += (target.sun - sun.intensity) * k;
  });

  return {
    setDaylight(isDay) {
      target = isDay ? DAY : NIGHT;
    },
    /** Centra a área de sombras do sol na casa. */
    centerOn(center) {
      sun.target.position.copy(center);
      sun.position.copy(center).add(new THREE.Vector3(15, 25, 10));
    }
  };
}
