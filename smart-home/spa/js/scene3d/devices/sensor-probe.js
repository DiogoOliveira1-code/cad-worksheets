// Sensor genérico: um pequeno módulo num suporte, com o valor numa etiqueta por cima.
// A cor do LED e da etiqueta acompanha o estado (normal / aviso / perigo).
import * as THREE from "three";
import { createLabel } from "../labels.js";
import { SENSOR_TYPES } from "../../config/constants.js";
import { formatValue } from "../../utils/format.js";
import { sensorStatus } from "../../utils/status.js";

const LED_COLORS = { ok: 0x3fbf6f, warn: 0xf0a020, danger: 0xe24b4a, unknown: 0x888780 };

export function createSensorProbe() {
  const object = new THREE.Group();

  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x888780, metalness: 0.5, roughness: 0.4 })
  );
  stand.position.y = 0.3;
  object.add(stand);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.14, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xf1efe8, roughness: 0.6 })
  );
  body.position.y = 0.67;
  body.castShadow = true;
  object.add(body);

  const ledMat = new THREE.MeshStandardMaterial({ color: LED_COLORS.ok, emissive: LED_COLORS.ok, emissiveIntensity: 0.8 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), ledMat);
  led.position.set(0.07, 0.67, 0.065);
  object.add(led);

  const label = createLabel("", "label-sensor");
  label.object.position.y = 0.85;
  object.add(label.object);

  return {
    object,
    update(def) {
      const type = SENSOR_TYPES[def.type];
      let text;
      if (type?.boolean) {
        text = `${def.name}: ${def.value ? type.on : type.off}`;
      } else {
        text = formatValue(def.value, def.unit ?? type?.unit ?? "");
      }
      label.setText(text);

      const status = sensorStatus(def);
      label.setStatus(status);
      ledMat.color.setHex(LED_COLORS[status]);
      ledMat.emissive.setHex(LED_COLORS[status]);
    }
  };
}
