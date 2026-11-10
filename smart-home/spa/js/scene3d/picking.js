// Deteta cliques em objetos 3D (ex.: o chão de uma sala).
// Distingue um clique de um arrastar (rodar a câmara), para não selecionar sem querer.
import * as THREE from "three";

/**
 * @param {object} ctx           contexto devolvido por createScene
 * @param {function} getTargets  devolve a lista de objetos clicáveis
 * @param {function} onPick      recebe o objeto clicado (ou null se clicou no vazio)
 */
export function setupPicking(ctx, getTargets, onPick) {
  const { renderer, camera } = ctx;
  const canvas = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let down = null;

  canvas.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener("pointerup", (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 5) return; // foi um arrastar

    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(getTargets(), false)[0];
    onPick(hit ? hit.object : null);
  });
}
