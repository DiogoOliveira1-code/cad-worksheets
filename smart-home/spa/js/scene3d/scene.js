// Núcleo da cena 3D: renderer, câmara, controlos do rato/toque e ciclo de animação.
// Os outros módulos registam funções com onFrame() para serem chamados a cada frame.
//
// Opções:
//   topView: true -> câmara ortográfica vista de cima, sem rotação (usada pelo editor).
//                    O botão esquerdo fica livre para o editor; direito = deslocar, roda = zoom.
//
// Proteções contra a placa gráfica ir abaixo:
//   - se o WebGL for perdido, mostra um aviso, tenta recuperar e guarda uma qualidade mais baixa
//   - nos primeiros segundos mede a fluidez; se estiver lenta, alivia a cena na hora
//     (menos resolução, sem efeitos de imagem) e guarda uma qualidade mais baixa para a próxima vez
//   - dispose() liberta a placa gráfica (o editor usa-o ao sair do ecrã)
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";
import { QUALITY, saveLowerQuality } from "./quality.js";

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

  // Camada de elementos HTML colocados em 3D (ex.: o leitor de vídeo no ecrã da TV).
  // Tem a sua própria cena (cssScene); fica por cima do canvas e por baixo das etiquetas.
  const cssRenderer = new CSS3DRenderer();
  cssRenderer.domElement.classList.add("house-3d-css3d");
  container.appendChild(cssRenderer.domElement);
  const cssScene = new THREE.Scene();

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
    cssRenderer.setSize(w, h);
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
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  // ---- Avisos sobre o 3D (dentro da área da cena) ----------------------------
  const notice = document.createElement("div");
  notice.className = "house-3d-notice d-none";
  container.appendChild(notice);
  function showNotice(html) {
    notice.innerHTML = html;
    notice.classList.remove("d-none");
  }
  const hideNotice = () => notice.classList.add("d-none");

  // ---- Placa gráfica foi abaixo (contexto WebGL perdido) ------------------------
  let lost = false;
  let disposed = false;
  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    if (disposed) return; // fomos nós a libertar (dispose), não é um crash
    e.preventDefault(); // permite ao browser devolver o contexto
    lost = true;
    saveLowerQuality();
    showNotice(`<strong>A placa gráfica reiniciou o 3D.</strong><br>A tentar recuperar…<br>
      <a href="#" class="js-reload">Recarregar com qualidade mais baixa</a>`);
  });
  renderer.domElement.addEventListener("webglcontextrestored", () => {
    lost = false;
    hideNotice();
  });
  notice.addEventListener("click", (e) => {
    if (e.target.classList.contains("js-reload")) { e.preventDefault(); location.reload(); }
  });

  // ---- Ciclo de animação -----------------------------------------------------
  const frameCallbacks = new Set();
  const clock = new THREE.Clock();
  const defaultRender = () => renderer.render(scene, camera);
  let renderFn = defaultRender;

  // Medição da fluidez: entre os 2 e os 6 segundos com a cena visível
  // (o editor é leve e não precisa desta medição)
  const perf = { visibleTime: 0, frames: 0, done: topView };

  function checkPerformance(dt) {
    if (perf.done) return;
    perf.visibleTime += dt;
    if (perf.visibleTime < 2) return;
    perf.frames++;
    if (perf.visibleTime < 6) return;
    perf.done = true;
    const fps = perf.frames / (perf.visibleTime - 2);
    if (fps >= 24) return;

    // Lenta: alivia já (resolução 1:1 e sem efeitos de imagem) e guarda um nível abaixo
    renderer.setPixelRatio(1);
    resize();
    renderFn = defaultRender;
    const lower = saveLowerQuality();
    console.warn(`[3d] cena lenta (${fps.toFixed(0)} fps): qualidade reduzida${lower ? ` para "${lower}" na próxima vez` : ""}`);
    if (lower) {
      showNotice(`Para ficar mais fluido, a qualidade gráfica foi reduzida.<br>
        <a href="#" class="js-reload">Recarregar agora</a> · <a href="#" class="js-close">Fechar</a>`);
      notice.querySelector(".js-close").addEventListener("click", (e) => { e.preventDefault(); hideNotice(); });
    }
  }

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    // Ecrã escondido (outro separador da SPA) ou contexto perdido: não desenha
    if (lost || container.offsetParent === null) return;
    const t = clock.elapsedTime;
    for (const fn of frameCallbacks) fn(dt, t);
    controls.update();
    renderFn();
    cssRenderer.render(cssScene, camera);
    labelRenderer.render(scene, camera);
    checkPerformance(dt);
  });

  /** Liberta a placa gráfica e remove a cena da página. */
  function dispose() {
    disposed = true;
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    controls.dispose();
    scene.traverse((o) => {
      o.geometry?.dispose();
      if (o.isCSS2DObject) o.element.remove();
    });
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    cssScene.traverse((o) => { if (o.isCSS3DObject) o.element.remove(); });
    cssRenderer.domElement.remove();
    labelRenderer.domElement.remove();
    notice.remove();
  }

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
    cssScene,
    camera,
    renderer,
    controls,
    onFrame: (fn) => frameCallbacks.add(fn),
    onResize: (fn) => resizeCallbacks.add(fn),
    /** Substitui o desenho normal (usado pelos efeitos de imagem). */
    setRenderFn: (fn) => { renderFn = fn; },
    frame,
    dispose
  };
}
