// Etiquetas HTML presas a objetos 3D (acompanham a câmara).
// Usam o CSS2DRenderer criado em scene.js; o estilo está em css/scene.css.
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

/**
 * Cria uma etiqueta.
 * @param {string} text
 * @param {string} className  classes extra (ex.: "label-room", "label-sensor")
 */
export function createLabel(text, className = "") {
  const el = document.createElement("div");
  el.className = `label-3d ${className}`;
  el.textContent = text;

  const obj = new CSS2DObject(el);
  obj.center.set(0.5, 1); // a etiqueta fica por cima do ponto

  return {
    object: obj,
    setText(value) {
      if (el.textContent !== value) el.textContent = value;
    },
    /** Estado visual: "ok" | "warn" | "danger" | "unknown" */
    setStatus(status) {
      el.dataset.status = status;
    }
  };
}

/** Remove a etiqueta do HTML (o CSS2DRenderer não o faz sozinho ao remover o objeto). */
export function disposeLabel(label) {
  label.object.element.remove();
  label.object.removeFromParent();
}
