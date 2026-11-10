// Barreira infravermelha (nó 1): dois postes de lado a lado da sala e um feixe entre eles.
// Feixe verde = livre; vermelho a piscar = feixe cortado.
import * as THREE from "three";
import { createLabel } from "../labels.js";
import { sensorStatus } from "../../utils/status.js";

const MARGIN = 0.35;   // distância dos postes às paredes
const BEAM_Y = 0.6;

export function createIrBarrier() {
  const object = new THREE.Group();

  const postMat = new THREE.MeshStandardMaterial({ color: 0x5f5e5a, roughness: 0.5 });
  const postGeo = new THREE.BoxGeometry(0.12, 0.8, 0.12);
  const postA = new THREE.Mesh(postGeo, postMat);
  const postB = new THREE.Mesh(postGeo, postMat);
  postA.position.y = postB.position.y = 0.4;
  postA.castShadow = postB.castShadow = true;
  object.add(postA, postB);

  const beamMat = new THREE.MeshBasicMaterial({ color: 0x1d9e75, transparent: true, opacity: 0.85 });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 8), beamMat);
  beam.rotation.z = Math.PI / 2;
  beam.position.y = BEAM_Y;
  object.add(beam);

  const label = createLabel("", "label-sensor");
  label.object.position.y = 1.0;
  object.add(label.object);

  let broken = false;

  return {
    object,
    update(def, roomSize) {
      // O objeto está na posição pos.x da sala; os postes vão de parede a parede (eixo X)
      const px = (def.pos?.x ?? 0.5) * roomSize.w;
      const left = MARGIN - px;
      const right = roomSize.w - MARGIN - px;
      postA.position.x = left;
      postB.position.x = right;
      beam.scale.y = right - left;
      beam.position.x = (left + right) / 2;
      label.object.position.x = (left + right) / 2;

      broken = def.value === true;
      beamMat.color.setHex(broken ? 0xe24b4a : 0x1d9e75);
      label.setText(broken ? "IR: feixe cortado" : "IR: livre");
      label.setStatus(sensorStatus(def));
    },
    tick(_dt, t) {
      beamMat.opacity = broken ? 0.45 + 0.45 * Math.abs(Math.sin(t * 8)) : 0.85;
    }
  };
}
