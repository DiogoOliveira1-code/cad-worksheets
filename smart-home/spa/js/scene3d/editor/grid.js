// Grelha do editor (vista de topo) e funções de "encaixe" (snap).
import * as THREE from "three";

export const GRID_STEP = 0.5; // metros

/** Arredonda um valor à grelha. */
export const snap = (v, step = GRID_STEP) => Math.round(v / step) * step;

export function createGrid(ctx) {
  // Grelha fina (0,5 m) e grelha grossa (5 m)
  const fine = new THREE.GridHelper(80, 160, 0xc9c6bb, 0xdcdad2);
  fine.position.y = 0.002;
  const coarse = new THREE.GridHelper(80, 16, 0x9e9b90, 0x9e9b90);
  coarse.position.y = 0.003;
  ctx.scene.add(fine, coarse);

  // Plano invisível no chão, para converter a posição do rato em coordenadas (x, z)
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hit = new THREE.Vector3();

  /** Converte um evento do rato num raio (para testar objetos) e num ponto do chão. */
  function fromEvent(e) {
    const rect = ctx.renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, ctx.camera);
    const point = raycaster.ray.intersectPlane(groundPlane, hit) ? { x: hit.x, z: hit.z } : null;
    return { raycaster, point };
  }

  return {
    fromEvent,
    /** Centra a grelha (para acompanhar casas longe da origem). */
    centerOn(x, z) {
      fine.position.x = coarse.position.x = snap(x, 5);
      fine.position.z = coarse.position.z = snap(z, 5);
    }
  };
}
