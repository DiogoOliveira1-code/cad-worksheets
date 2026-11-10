// Escolhe o objeto 3D de cada tipo de dispositivo.
// Cada criador recebe (def, roomSize) e devolve { object, update(def, roomSize), tick?(dt, t) }.
// Aqui também se trata da limpeza (dispose), igual para todos.
import * as THREE from "three";
import { createLamp } from "./lamp.js";
import { createFan } from "./fan.js";
import { createBuzzer } from "./buzzer.js";
import { createIrBarrier } from "./ir-barrier.js";
import { createBlinds } from "./blinds.js";
import { createSensorProbe } from "./sensor-probe.js";

const ACTUATORS = {
  light: createLamp,
  relay: createLamp,      // no projeto, o relé do nó 1 comanda a iluminação
  fan: createFan,
  hvac: createFan,
  buzzer: createBuzzer,
  blinds: createBlinds
};

const SENSORS = {
  ir_barrier: createIrBarrier
};

/**
 * @param {"sensors"|"actuators"} kind
 * @param {object} def        dados do dispositivo (type, value/state, level…)
 * @param {{w:number,h:number}} roomSize
 */
export function createDevice(kind, def, roomSize) {
  const factory = kind === "sensors"
    ? (SENSORS[def.type] ?? createSensorProbe)
    : (ACTUATORS[def.type] ?? createGenericActuator);

  const device = factory(def, roomSize);
  device.object.name = `device:${def.type}`;

  device.dispose = () => {
    device.object.traverse((o) => {
      if (o.isCSS2DObject) o.element.remove();
      o.geometry?.dispose();
      if (o.material && !o.material.userData?.shared) o.material.dispose();
    });
    device.object.removeFromParent();
  };
  return device;
}

// Atuadores sem modelo próprio (rega, tomada, fechadura…): um módulo com luz de estado
function createGenericActuator(def) {
  const object = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.25, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x5f5e5a, roughness: 0.6 })
  );
  body.position.y = 0.125;
  body.castShadow = true;
  object.add(body);

  const ledMat = new THREE.MeshStandardMaterial({ color: 0x444441 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), ledMat);
  led.position.y = 0.3;
  object.add(led);

  return {
    object,
    update(d) {
      const on = d.state === true;
      ledMat.color.setHex(on ? 0x3fbf6f : 0x444441);
      ledMat.emissive.setHex(on ? 0x2a9a50 : 0x000000);
    }
  };
}
