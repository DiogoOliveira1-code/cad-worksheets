// Nível de qualidade gráfica: "high" | "medium" | "low".
//
// Como é escolhido (por esta ordem):
//   1. no endereço, ex.: .../spa/?quality=low#dashboard
//   2. guardado no browser (quando a cena detetou que estava lenta ou que a placa gráfica foi abaixo)
//   3. automático: telemóvel -> "low"; computador/tablet -> "medium"
// O nível "high" só é usado quando é pedido no endereço (é pesado para placas gráficas integradas).
//
//   high   -> oclusão ambiente, brilho, sombras grandes, muita relva
//   medium -> brilho, sem oclusão ambiente, relva moderada
//   low    -> sem efeitos de imagem, sombras pequenas, pouca relva

const STORAGE_KEY = "smarthome.quality";
const ORDER = ["low", "medium", "high"];

const PRESETS = {
  high:   { ao: true,  bloom: true,  shadowMap: 2048, grass: 35000, pixelRatio: 1.5 },
  medium: { ao: false, bloom: true,  shadowMap: 1024, grass: 15000, pixelRatio: 1.25 },
  low:    { ao: false, bloom: false, shadowMap: 1024, grass: 5000,  pixelRatio: 1 }
};

function readSaved() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function detect() {
  const forced = new URLSearchParams(location.search).get("quality");
  if (PRESETS[forced]) return forced;

  const saved = readSaved();
  if (PRESETS[saved]) return saved;

  const touch = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(screen.width, screen.height) < 700;
  return touch && small ? "low" : "medium";
}

export const QUALITY_LEVEL = detect();
export const QUALITY = PRESETS[QUALITY_LEVEL];

/**
 * Guarda no browser um nível abaixo do atual (usado na próxima vez que a página abrir).
 * Devolve o novo nível, ou null se já estava no mínimo.
 */
export function saveLowerQuality() {
  const i = ORDER.indexOf(QUALITY_LEVEL);
  if (i <= 0) return null;
  const lower = ORDER[i - 1];
  try { localStorage.setItem(STORAGE_KEY, lower); } catch { /* sem armazenamento: ignora */ }
  return lower;
}
