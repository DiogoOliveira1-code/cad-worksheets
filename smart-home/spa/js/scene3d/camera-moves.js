// Transições suaves da câmara: aproximar a uma sala e voltar à vista geral.
import * as THREE from "three";

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createCameraMoves(ctx) {
  const { camera, controls, onFrame } = ctx;
  let anim = null;

  onFrame((dt) => {
    if (!anim) return;
    anim.t = Math.min(1, anim.t + dt / anim.duration);
    const k = ease(anim.t);
    camera.position.lerpVectors(anim.fromPos, anim.toPos, k);
    controls.target.lerpVectors(anim.fromTarget, anim.toTarget, k);
    if (anim.t >= 1) anim = null;
  });

  // Se o utilizador mexer na câmara durante a transição, a transição para
  controls.addEventListener("start", () => { anim = null; });

  function flyTo(toTarget, toPos, duration = 0.9) {
    anim = {
      t: 0,
      duration,
      fromPos: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPos: toPos.clone(),
      toTarget: toTarget.clone()
    };
  }

  /** Vista em ângulo que enquadra a caixa dada. */
  function viewFor(box, distanceFactor) {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.z, 3);
    const dir = new THREE.Vector3(0.55, 0.85, 1).normalize();
    return { target: center, position: center.clone().addScaledVector(dir, radius * distanceFactor) };
  }

  return {
    /** Aproxima a uma sala (caixa da sala). */
    focusBox(box) {
      const v = viewFor(box, 1.6);
      flyTo(v.target, v.position);
    },
    /** Vista geral da casa. */
    overview(box) {
      const v = viewFor(box, 1.25);
      flyTo(v.target, v.position, 1.1);
    }
  };
}
