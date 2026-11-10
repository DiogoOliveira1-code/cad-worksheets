// Fonte de dados de DEMONSTRAÇÃO: imita a Firebase dentro do browser.
// Tem as mesmas funções que services/firebase.js (listen, listenLast, write, patch, add, removePath)
// e os sensores mudam de valor sozinhos, para se poder desenvolver a interface
// sem Firebase e sem hardware. Os dados perdem-se ao recarregar a página.
//
// Modelo de dados (igual ao da Firebase):
//   zones/{id}: name, icon, order, layout {x, y, w, h} (metros, vista de cima)
//     sensors/{id}:   type, name, value, unit, simulated, source, pos {x, y} (0–1 dentro da sala), updatedAt
//     actuators/{id}: type, name, state, level?, simulated, source, pos {x, y}, updatedAt
import { APP_CONFIG } from "../config/app-config.js";

const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Casa de exemplo — baseada no hardware do projeto de SEIC
//   source: "node1" (PIC + ESP32), "node2" (ESP32 + BME680/CCS811), "sim" (simulado pelo servidor)
// ---------------------------------------------------------------------------
let store = {
  home: { name: "Casa Inteligente" },
  zones: {
    entrada: {
      name: "Entrada", icon: "fa-door-open", order: 1,
      layout: { x: 0, y: 0, w: 6, h: 4 },
      sensors: {
        entrada_ir:    { type: "ir_barrier", name: "Barreira IR",  value: false, unit: "",   simulated: false, source: "node1", pos: { x: 0.5, y: 0.15 } },
        entrada_ldr:   { type: "luminosity", name: "Luminosidade", value: 320,   unit: "lx", simulated: false, source: "node1", pos: { x: 0.2, y: 0.7 } },
        entrada_sound: { type: "sound",      name: "Nível sonoro", value: 42,    unit: "dB", simulated: false, source: "node1", pos: { x: 0.8, y: 0.7 } }
      },
      actuators: {
        entrada_luz: { type: "relay", name: "Luz da entrada", state: false, simulated: false, source: "node1", pos: { x: 0.5, y: 0.5 } }
      }
    },
    sala: {
      name: "Sala", icon: "fa-couch", order: 2,
      layout: { x: 0, y: 4, w: 7, h: 6 },
      sensors: {
        sala_temp:  { type: "temperature", name: "Temperatura", value: 21.5, unit: "°C", simulated: true, source: "sim", pos: { x: 0.15, y: 0.2 } },
        sala_power: { type: "power",       name: "Consumo",     value: 180,  unit: "W",  simulated: true, source: "sim", pos: { x: 0.85, y: 0.2 } },
        sala_door:  { type: "contact",     name: "Janela",      value: false, unit: "",  simulated: true, source: "sim", pos: { x: 0.5, y: 0.95 } }
      },
      actuators: {
        sala_luz:    { type: "light",  name: "Iluminação", state: true,  simulated: true, source: "sim", pos: { x: 0.5, y: 0.5 } },
        sala_estore: { type: "blinds", name: "Estores",    state: false, simulated: true, source: "sim", pos: { x: 0.5, y: 0.9 } }
      }
    },
    cozinha: {
      name: "Cozinha", icon: "fa-kitchen-set", order: 3,
      layout: { x: 7, y: 4, w: 5, h: 6 },
      sensors: {
        cozinha_temp:  { type: "temperature",    name: "Temperatura",        value: 23.1, unit: "°C",  simulated: false, source: "node2", pos: { x: 0.2, y: 0.2 } },
        cozinha_hum:   { type: "humidity",       name: "Humidade",           value: 52,   unit: "%",   simulated: false, source: "node2", pos: { x: 0.2, y: 0.4 } },
        cozinha_press: { type: "pressure",       name: "Pressão",            value: 1015, unit: "hPa", simulated: false, source: "node2", pos: { x: 0.2, y: 0.6 } },
        cozinha_gas:   { type: "gas_resistance", name: "Gás",                value: 85,   unit: "kΩ",  simulated: false, source: "node2", pos: { x: 0.2, y: 0.8 } },
        cozinha_co2:   { type: "eco2",           name: "CO2",                value: 650,  unit: "ppm", simulated: false, source: "node2", pos: { x: 0.8, y: 0.2 } },
        cozinha_tvoc:  { type: "tvoc",           name: "Compostos voláteis", value: 80,   unit: "ppb", simulated: false, source: "node2", pos: { x: 0.8, y: 0.4 } }
      },
      actuators: {
        cozinha_fan:    { type: "fan",    name: "Ventoinha", state: true,  level: 40, simulated: false, source: "node2", pos: { x: 0.6, y: 0.6 } },
        cozinha_buzzer: { type: "buzzer", name: "Alarme",    state: false,            simulated: false, source: "node2", pos: { x: 0.8, y: 0.85 } }
      }
    },
    jardim: {
      name: "Jardim", icon: "fa-seedling", order: 4,
      layout: { x: 0, y: 10, w: 12, h: 5 },
      sensors: {
        jardim_soil: { type: "soil_moisture", name: "Humidade do solo", value: 38, unit: "%", simulated: true, source: "sim", pos: { x: 0.3, y: 0.5 } }
      },
      actuators: {
        jardim_rega: { type: "irrigation", name: "Rega", state: false, simulated: true, source: "sim", pos: { x: 0.6, y: 0.5 } }
      }
    }
  },
  rules: {
    regra_co2: {
      name: "Ventilar com CO2 alto", enabled: true, logic: "AND",
      conditions: [{ source: "sensor", path: "zones/cozinha/sensors/cozinha_co2/value", operator: ">", value: 1000 }],
      actions: [{ type: "actuator", path: "zones/cozinha/actuators/cozinha_fan/state", state: true }]
    },
    regra_intrusao: {
      name: "Alerta de intrusão à noite", enabled: true, logic: "AND",
      conditions: [
        { source: "sensor",   path: "zones/entrada/sensors/entrada_ir/value", operator: "==", value: true },
        { source: "external", path: "external/sun/isDay", operator: "==", value: false }
      ],
      actions: [{ type: "alert", message: "Movimento na entrada durante a noite", level: "danger" }]
    },
    regra_luz: {
      name: "Luz da entrada quando está escuro", enabled: true, logic: "AND",
      conditions: [{ source: "sensor", path: "zones/entrada/sensors/entrada_ldr/value", operator: "<", value: 150 }],
      actions: [{ type: "actuator", path: "zones/entrada/actuators/entrada_luz/state", state: true }]
    }
  },
  alerts: {
    a0001: { message: "Modo demonstração ativo: os dados não são reais", level: "info", createdAt: now() }
  },
  external: {
    weather:    { temperature: 17.4, humidity: 68, windSpeed: 12, weatherCode: 2 },
    airQuality: { europeanAqi: 28, pm2_5: 6.1, pm10: 11.3 },
    sun:        { sunrise: todayAt(7, 25), sunset: todayAt(17, 22), isDay: null },
    updatedAt: now()
  }
};
store.external.sun.isDay = isDayNow();

// Todos os dispositivos arrancam com a hora atual como "última atualização"
for (const zone of Object.values(store.zones)) {
  for (const d of [...Object.values(zone.sensors ?? {}), ...Object.values(zone.actuators ?? {})]) {
    d.updatedAt = now();
  }
}

function todayAt(h, m) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function isDayNow() {
  const t = Date.now();
  return t >= Date.parse(store?.external?.sun?.sunrise ?? todayAt(7, 25)) &&
         t < Date.parse(store?.external?.sun?.sunset ?? todayAt(17, 22));
}

// ---------------------------------------------------------------------------
// Pequena "base de dados" em memória
// ---------------------------------------------------------------------------
const clone = (v) => (v === undefined ? null : structuredClone(v));
const split = (path) => path.split("/").filter(Boolean);

function getAt(path) {
  return split(path).reduce((node, key) => (node == null ? undefined : node[key]), store);
}

function setAt(path, value) {
  const keys = split(path);
  const last = keys.pop();
  let node = store;
  for (const k of keys) {
    if (node[k] == null || typeof node[k] !== "object") node[k] = {};
    node = node[k];
  }
  if (value === null || value === undefined) delete node[last];
  else node[last] = clone(value);
}

// Ouvintes: { path, callback, limit? }
const listeners = new Set();

// Um ouvinte é afetado se o caminho alterado estiver "acima" ou "abaixo" do caminho que ouve
function overlaps(a, b) {
  const A = split(a), B = split(b);
  const n = Math.min(A.length, B.length);
  for (let i = 0; i < n; i++) if (A[i] !== B[i]) return false;
  return true;
}

function deliver(l) {
  let value = clone(getAt(l.path));
  if (l.limit && value && typeof value === "object") {
    const keys = Object.keys(value).sort().slice(-l.limit);
    value = Object.fromEntries(keys.map((k) => [k, value[k]]));
  }
  // Assíncrono, como na Firebase
  queueMicrotask(() => l.callback(l.limit ? (value ?? {}) : value));
}

function notify(changedPath) {
  for (const l of listeners) if (overlaps(l.path, changedPath)) deliver(l);
}

// ---------------------------------------------------------------------------
// API pública (igual a services/firebase.js)
// ---------------------------------------------------------------------------
export function listen(path, callback) {
  const l = { path, callback };
  listeners.add(l);
  deliver(l);
  return () => listeners.delete(l);
}

export function listenLast(path, n, callback) {
  const l = { path, callback, limit: n };
  listeners.add(l);
  deliver(l);
  return () => listeners.delete(l);
}

export async function write(path, value) {
  setAt(path, value);
  notify(path);
}

export async function patch(path, fields) {
  for (const [k, v] of Object.entries(fields)) setAt(`${path}/${k}`, v);
  notify(path);
}

let counter = 0;
export async function add(path, value) {
  // Ids ordenáveis por tempo, como os "push ids" da Firebase
  const id = Date.now().toString(36) + (counter++).toString(36).padStart(3, "0");
  setAt(`${path}/${id}`, value);
  notify(path);
  return id;
}

export async function removePath(path) {
  setAt(path, null);
  notify(path);
}

// ---------------------------------------------------------------------------
// Simulação: os sensores variam e reagem aos atuadores da mesma divisão
// ---------------------------------------------------------------------------
const RANGES = {
  temperature:    { min: 12,  max: 38,   noise: 0.3 },
  humidity:       { min: 20,  max: 95,   noise: 1 },
  pressure:       { min: 990, max: 1035, noise: 0.4 },
  gas_resistance: { min: 5,   max: 300,  noise: 3 },
  eco2:           { min: 400, max: 2000, noise: 40 },
  tvoc:           { min: 0,   max: 1000, noise: 10 },
  luminosity:     { min: 0,   max: 1000, noise: 25 },
  sound:          { min: 30,  max: 100,  noise: 4 },
  power:          { min: 0,   max: 5000, noise: 10 },
  soil_moisture:  { min: 0,   max: 100,  noise: 0.5 },
  air_quality:    { min: 400, max: 2000, noise: 30 }
};

// Efeito por ciclo dos atuadores ligados sobre sensores da mesma divisão
const EFFECTS = {
  fan:        { temperature: -0.15, eco2: -60, tvoc: -15 },
  hvac:       { temperature: -0.4 },
  irrigation: { soil_moisture: +3 },
  light:      { luminosity: +30 },
  relay:      { luminosity: +30 },
  blinds:     { luminosity: -30 }
};

// Probabilidade de mudança por ciclo nos sensores booleanos
const TOGGLE_CHANCE = { ir_barrier: 0.08, contact: 0.03, motion: 0.15 };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function tick() {
  const ts = now();

  for (const zone of Object.values(store.zones ?? {})) {
    const actuators = Object.values(zone.actuators ?? {});

    for (const s of Object.values(zone.sensors ?? {})) {
      if (typeof s.value === "boolean" || TOGGLE_CHANCE[s.type]) {
        // Barreira IR: volta sempre a "livre" no ciclo seguinte (é um evento)
        if (s.type === "ir_barrier" && s.value === true) s.value = false;
        else if (Math.random() < (TOGGLE_CHANCE[s.type] ?? 0)) s.value = !s.value;
        s.updatedAt = ts;
        continue;
      }

      const r = RANGES[s.type];
      if (!r || typeof s.value !== "number") continue;

      let delta = (Math.random() - 0.5) * 2 * r.noise;
      for (const a of actuators) {
        if (!a.state) continue;
        const factor = a.level !== undefined ? a.level / 100 : 1;
        delta += (EFFECTS[a.type]?.[s.type] ?? 0) * factor;
      }
      // CO2 e TVOC sobem lentamente sozinhos (pessoas na divisão)
      if (s.type === "eco2") delta += 25;
      if (s.type === "tvoc") delta += 5;

      s.value = Math.round(clamp(s.value + delta, r.min, r.max) * 10) / 10;
      s.updatedAt = ts;
    }

    // O consumo acompanha os atuadores ligados
    const powerSensor = Object.values(zone.sensors ?? {}).find((s) => s.type === "power");
    if (powerSensor) {
      const load = actuators.filter((a) => a.state).length * 60;
      powerSensor.value = Math.round(80 + load + Math.random() * 20);
    }
  }

  store.external.sun.isDay = isDayNow();
  notify("zones");
  notify("external/sun");
}

setInterval(tick, APP_CONFIG.DEMO_UPDATE_INTERVAL);
console.log("[demo] modo demonstração: dados simulados no browser");
