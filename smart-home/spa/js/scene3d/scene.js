// Núcleo da cena 3D: renderer, câmara, controlos do rato/toque e ciclo de animação.
// Os outros módulos registam funções com onFrame() para serem chamados a cada frame.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";

export function createScene(container) {
  // Renderer WebGL (o desenho 3D)
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.classList.add("house-3d-canvas");
  container.appendChild(renderer.domElement);

  // Renderer de etiquetas HTML (valores dos sensores, nomes das salas) por cima do 3D
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.classList.add("house-3d-labels");
  container.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
  camera.position.set(14, 16, 20);

  // Rodar (botão esquerdo), zoom (roda), deslocar (botão direito); também funciona com toque
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2.15; // não deixa a câmara ir abaixo do chão
  controls.minDistance = 6;
  controls.maxDistance = 60;

  // Ajusta o tamanho quando o contentor muda (janela, telemóvel na horizontal…)
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // Ciclo de animação
  const frameCallbacks = new Set();
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    for (const fn of frameCallbacks) fn(dt, t);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  });

  /** Aponta a câmara para uma caixa (ex.: a casa inteira) mantendo o ângulo atual. */
  function frame(box) {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const dir = camera.position.clone().sub(controls.target).normalize();
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(dir, Math.max(size * 1.1, 12));
  }

  return {
    THREE,
    scene,
    camera,
    renderer,
    controls,
    onFrame: (fn) => frameCallbacks.add(fn),
    frame
  };
}
