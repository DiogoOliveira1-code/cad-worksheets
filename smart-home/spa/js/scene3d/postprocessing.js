// Efeitos de imagem (pós-processamento):
//   - oclusão ambiente (GTAO): escurece cantos e junções, como na realidade
//   - brilho (bloom): as lâmpadas acesas "brilham" à noite
//   - saída com tons de cor cinematográficos (ACES) e espaço de cor sRGB
// No nível de qualidade "low" não é usado (desenha-se diretamente).
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import * as THREE from "three";

export function createPostprocessing(ctx, quality) {
  if (!quality.ao && !quality.bloom) return null;

  const { renderer, scene, camera, container } = ctx;
  const w = container.clientWidth || 800;
  const h = container.clientHeight || 600;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  // Oclusão ambiente a meia resolução: é o efeito mais pesado e assim custa ~4x menos
  let gtao = null;
  const halfAO = () => {
    if (!gtao) return;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    gtao.setSize(Math.max(1, Math.floor(size.x / 2)), Math.max(1, Math.floor(size.y / 2)));
  };
  if (quality.ao) {
    gtao = new GTAOPass(scene, camera, w / 2, h / 2);
    gtao.blendIntensity = 0.85;
    gtao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1, thickness: 1, scale: 1 });
    composer.addPass(gtao);
    halfAO(); // addPass repõe o tamanho completo; volta a meia resolução
  }

  if (quality.bloom) {
    // Só o que é muito mais brilhante que uma parede ao sol (lâmpadas acesas, alarme) ganha brilho
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.6, 0.5, 3.0));
  }

  composer.addPass(new OutputPass());

  ctx.setRenderFn(() => composer.render());
  ctx.onResize((width, height) => {
    composer.setSize(width, height);
    halfAO();
  });

  return composer;
}
