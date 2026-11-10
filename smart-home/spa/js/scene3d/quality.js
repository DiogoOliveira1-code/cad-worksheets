// Nível de qualidade gráfica: "high" | "medium" | "low".
// Escolhido automaticamente pelo dispositivo; pode ser forçado no endereço,
// por exemplo: .../spa/?quality=low#dashboard
//
//   high   -> todos os efeitos (oclusão ambiente, brilho, sombras grandes, muita relva)
//   medium -> sem oclusão ambiente, menos relva
//   low    -> sem efeitos de imagem, sombras pequenas, pouca relva (telemóveis fracos)

const PRESETS = {
  high:   { ao: true,  bloom: true,  shadowMap: 2048, grass: 60000, pixelRatio: 2 },
  medium: { ao: false, bloom: true,  shadowMap: 2048, grass: 25000, pixelRatio: 1.5 },
  low:    { ao: false, bloom: false, shadowMap: 1024, grass: 8000,  pixelRatio: 1 }
};

function detect() {
  const forced = new URLSearchParams(location.search).get("quality");
  if (PRESETS[forced]) return forced;

  const touch = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(screen.width, screen.height) < 700;
  const cores = navigator.hardwareConcurrency ?? 4;

  if (touch && small) return "low";      // telemóvel
  if (touch || cores <= 4) return "medium"; // tablet ou computador modesto
  return "high";
}

export const QUALITY_LEVEL = detect();
export const QUALITY = PRESETS[QUALITY_LEVEL];
