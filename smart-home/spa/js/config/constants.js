// Caminhos da Realtime Database (iguais aos usados no iot-app)
export const DB = {
  HOME: "home",
  ZONES: "zones",
  RULES: "rules",
  ALERTS: "alerts",
  EXTERNAL: "external"
};

// Catálogo de tipos de sensores (requisito c)
export const SENSOR_TYPES = {
  temperature:   { label: "Temperatura",      unit: "°C",  icon: "fa-temperature-half", boolean: false },
  humidity:      { label: "Humidade",         unit: "%",   icon: "fa-droplet",          boolean: false },
  air_quality:   { label: "Qualidade do ar",  unit: "ppm", icon: "fa-wind",             boolean: false },
  luminosity:    { label: "Luminosidade",     unit: "lx",  icon: "fa-sun",              boolean: false },
  power:         { label: "Consumo elétrico", unit: "W",   icon: "fa-bolt",             boolean: false },
  soil_moisture: { label: "Humidade do solo", unit: "%",   icon: "fa-seedling",         boolean: false },
  // Nó 2 (ESP32 + BME680 + CCS811)
  pressure:       { label: "Pressão",          unit: "hPa", icon: "fa-gauge",            boolean: false },
  gas_resistance: { label: "Gás (resistência)", unit: "kΩ", icon: "fa-flask",            boolean: false },
  eco2:           { label: "CO2 equivalente",  unit: "ppm", icon: "fa-smog",             boolean: false },
  tvoc:           { label: "Compostos voláteis", unit: "ppb", icon: "fa-spray-can",     boolean: false },
  // Nó 1 (PIC + ESP32): microfone, LDR (usa "luminosity") e barreira IR
  sound:          { label: "Nível sonoro",     unit: "dB",  icon: "fa-volume-high",      boolean: false },
  motion:        { label: "Movimento",        unit: "",    icon: "fa-person-walking",   boolean: true, on: "Detetado", off: "Sem movimento" },
  contact:       { label: "Porta/Janela",     unit: "",    icon: "fa-door-closed",      boolean: true, on: "Aberta",   off: "Fechada" },
  ir_barrier:    { label: "Barreira IR",      unit: "",    icon: "fa-grip-lines-vertical", boolean: true, on: "Feixe cortado", off: "Livre" }
};

// Catálogo de tipos de atuadores (requisito d)
// hasLevel: o atuador tem, além de ligado/desligado, um nível 0–100 % (ex.: PWM)
export const ACTUATOR_TYPES = {
  light:      { label: "Iluminação",       icon: "fa-lightbulb" },
  relay:      { label: "Relé",             icon: "fa-toggle-on" },
  fan:        { label: "Ventoinha",        icon: "fa-fan", hasLevel: true },
  buzzer:     { label: "Alarme sonoro",    icon: "fa-bell" },
  tv:         { label: "Televisão",        icon: "fa-tv", hasVideo: true }, // hasVideo: aceita um link de vídeo
  hvac:       { label: "Ar condicionado",  icon: "fa-snowflake" },
  blinds:     { label: "Estores",          icon: "fa-bars-staggered", on: "Fechados", off: "Abertos" },
  irrigation: { label: "Rega",             icon: "fa-shower" },
  lock:       { label: "Fechadura",        icon: "fa-lock", on: "Trancada", off: "Destrancada" },
  socket:     { label: "Tomada",           icon: "fa-plug" }
};

// Limites para o estado visual (normal / aviso / perigo), usados por utils/status.js.
//   above: o valor é mau quando SOBE (ex.: CO2);  below: quando DESCE (ex.: humidade do solo)
//   Para sensores booleanos: estado quando o valor é true.
export const THRESHOLDS = {
  temperature:   { above: { warn: 27, danger: 35 }, below: { warn: 16, danger: 10 } },
  humidity:      { above: { warn: 70, danger: 85 }, below: { warn: 30, danger: 20 } },
  air_quality:   { above: { warn: 1000, danger: 1500 } },
  eco2:          { above: { warn: 1000, danger: 1500 } },
  tvoc:          { above: { warn: 220, danger: 660 } },
  sound:         { above: { warn: 70, danger: 85 } },
  soil_moisture: { below: { warn: 30, danger: 15 } },
  ir_barrier:    { whenTrue: "danger" },
  contact:       { whenTrue: "warn" }
};

// Operadores disponíveis nas regras
export const OPERATORS = ["==", "!=", ">", ">=", "<", "<="];

// Valores externos que podem ser usados como condição nas regras
export const EXTERNAL_FIELDS = {
  "external/weather/temperature": "Temperatura exterior (°C)",
  "external/weather/humidity":    "Humidade exterior (%)",
  "external/airQuality/europeanAqi": "Índice de qualidade do ar (EAQI)",
  "external/sun/isDay":           "É dia (true/false)"
};

export const ZONE_ICONS = ["fa-couch", "fa-kitchen-set", "fa-bed", "fa-bath", "fa-car", "fa-seedling", "fa-briefcase", "fa-house"];

// Tipos de divisão (editor do ecrã 3). Definem o ícone, o chão e a mobília da casa 3D.
//   outdoor: divisão exterior (sem paredes, chão de relva)
export const ROOM_TYPES = {
  living:   { label: "Sala",                icon: "fa-couch" },
  kitchen:  { label: "Cozinha",             icon: "fa-kitchen-set" },
  bedroom:  { label: "Quarto",              icon: "fa-bed" },
  bathroom: { label: "Casa de banho",       icon: "fa-bath" },
  entrance: { label: "Entrada / corredor",  icon: "fa-door-open" },
  office:   { label: "Escritório",          icon: "fa-briefcase" },
  garage:   { label: "Garagem",             icon: "fa-car" },
  garden:   { label: "Jardim / exterior",   icon: "fa-seedling", outdoor: true }
};

// De onde vêm os dados de cada dispositivo
export const DEVICE_SOURCES = {
  node1: "Nó 1 (PIC + ESP32)",
  node2: "Nó 2 (ESP32 + BME680/CCS811)",
  sim:   "Simulado"
};
