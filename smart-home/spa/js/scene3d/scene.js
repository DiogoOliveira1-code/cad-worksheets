// Núcleo da cena 3D: renderer, câmara, controlos do rato/toque e ciclo de animação.
// Os outros módulos registam funções com onFrame() para serem chamados a cada frame.
//
// Opções:
//   topView: true -> câmara ortográfica vista de cima, sem rotação (usada pelo editor).
//                    O botão esquerdo fica livre para o editor; direito = deslocar, roda = zoom.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { QUALITY } from "./quality.js";

const TOP_VIEW_SIZE = 20; // metros visíveis na vertical com zoom 1 (vista de topo)

export function createScene(container, { topView = false } = {}) {
  // Renderer WebGL (o desenho 3D)
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY.pixelRatio));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (!topView) {
    // Tons de cor "cinematográficos" (ACES): luzes fortes e sombras com aspeto natural
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
  }
  renderer.domElement.classList.add("house-3d-canvas");
  container.appendChild(renderer.domElement);

  // Renderer de etiquetas HTML (valores dos sensores, nomes das salas) por cima do 3D
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.classList.add("house-3d-labels");
  container.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();

  let camera;
  if (topView) {
    camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 500);
    camera.position.set(0, 60, 0.01); // ligeiro desvio em Z: "cima" do ecrã = norte (-Z)
  } else {
    camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
    camera.position.set(14, 16, 20);
  }

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  if (topView) {
    controls.enableRotate = false;
    controls.screenSpacePanning = true;
    controls.zoomToCursor = true;
    controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN };
    controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_PAN };
    controls.minZoom = 0.3;
    controls.maxZoom = 6;
  } else {
    // Rodar (botão esquerdo), zoom (roda), deslocar (botão direito); também funciona com toque
    controls.maxPolarAngle = Math.PI / 2.15; // não deixa a câmara ir abaixo do chão
    controls.minDistance = 6;
    controls.maxDistance = 60;
  }

  let pendingFrame = null;

  // Ajusta o tamanho quando o contentor muda (janela, telemóvel na horizontal, ecrã a aparecer…)
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
    const aspect = w / h;
    if (camera.isOrthographicCamera) {
      camera.left = (-TOP_VIEW_SIZE * aspect) / 2;
      camera.right = (TOP_VIEW_SIZE * aspect) / 2;
      camera.top = TOP_VIEW_SIZE / 2;
      camera.bottom = -TOP_VIEW_SIZE / 2;
    } else {
      camera.aspect = aspect;
    }
    camera.updateProjectionMatrix();
    for (const fn of resizeCallbacks) fn(w, h);

    // Um enquadramento pedido enquanto o contentor estava escondido é feito agora
    if (pendingFrame) {
      const box = pendingFrame;
      pendingFrame = null;
      frame(box);
    }
  }
  const resizeCallbacks = new Set();
  new ResizeObserver(resize).observe(container);

  // Ciclo de animação
  const frameCallbacks = new Set();
  const clock = new THREE.Clock();
  let renderFn = () => renderer.render(scene, camera);

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    // Ecrã escondido (outro separador da SPA): não gasta GPU a desenhar
    if (container.offsetParent === null) return;
    const t = clock.elapsedTime;
    for (const fn of frameCallbacks) fn(dt, t);
    controls.update();
    renderFn();
    labelRenderer.render(scene, camera);
  });

  /** Enquadra uma caixa (ex.: a casa inteira). */
  function frame(box) {
    if (!container.clientWidth || !container.clientHeight) {
      pendingFrame = box.clone();
      return;
    }
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    if (camera.isOrthographicCamera) {
      const aspect = container.clientWidth / container.clientHeight;
      camera.zoom = Math.min(
        (TOP_VIEW_SIZE * aspect) / Math.max(size.x * 1.15, 1),
        TOP_VIEW_SIZE / Math.max(size.z * 1.15, 1)
      );
      camera.updateProjectionMatrix();
      controls.target.set(center.x, 0, center.z);
      camera.position.set(center.x, 60, center.z + 0.01);
      return;
    }
    const dir = camera.position.clone().sub(controls.target).normalize();
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(dir, Math.max(size.length() * 1.1, 12));
  }

  resize();

  return {
    THREE,
    container,
    scene,
    camera,
    renderer,
    controls,
    onFrame: (fn) => frameCallbacks.add(fn),
    onResize: (fn) => resizeCallbacks.add(fn),
    /** Substitui o desenho normal (usado pelos efeitos de imagem). */
    setRenderFn: (fn) => { renderFn = fn; },
    frame
  };
}
