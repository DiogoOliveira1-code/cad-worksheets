// Sincroniza os dispositivos com /zones:
//  - cria/remove sensores e atuadores quando são adicionados/removidos na SPA (ecrã 3)
//  - aplica o estado dos atuadores quando muda na BD
//  - publica periodicamente as leituras dos sensores
const { ref, db, now } = require("../firebase");
const config = require("../config");
const { createSensor } = require("./sensor-factory");
const { createActuator } = require("./actuator-factory");

let zones = {};               // último snapshot de /zones
const sensors = new Map();    // "zoneId/sensorId"   -> { key, instance }
const actuators = new Map();  // "zoneId/actuatorId" -> { key, instance, state }

// Campos que, se mudarem, obrigam a recriar o dispositivo
const identity = (d) => `${d.type}|${d.simulated}|${d.gpio ?? ""}`;

function reconcile() {
  const seenSensors = new Set();
  const seenActuators = new Set();

  for (const [zoneId, zone] of Object.entries(zones)) {
    // Sensores
    for (const [id, def] of Object.entries(zone.sensors ?? {})) {
      const k = `${zoneId}/${id}`;
      seenSensors.add(k);
      const existing = sensors.get(k);
      if (existing && existing.key === identity(def)) continue;

      existing?.instance.dispose();
      const instance = createSensor(
        def,
        () => zones[zoneId]?.actuators,
        (value) => ref(`zones/${zoneId}/sensors/${id}`).update({ value, updatedAt: now() })
      );
      sensors.set(k, { key: identity(def), instance });
      console.log(`[devices] sensor ${k} (${def.type}${def.simulated === false ? ", real" : ""})`);
    }

    // Atuadores
    for (const [id, def] of Object.entries(zone.actuators ?? {})) {
      const k = `${zoneId}/${id}`;
      seenActuators.add(k);
      let entry = actuators.get(k);

      if (!entry || entry.key !== identity(def)) {
        entry?.instance.dispose();
        entry = { key: identity(def), instance: createActuator(def), state: def.state === true };
        actuators.set(k, entry);
        console.log(`[devices] atuador ${k} (${def.type}${def.simulated === false ? ", real" : ""})`);
      }

      const state = def.state === true;
      if (state !== entry.state) {
        entry.state = state;
        entry.instance.apply(state);
      }
    }
  }

  // Remover os que desapareceram da BD
  for (const [k, e] of sensors) if (!seenSensors.has(k)) { e.instance.dispose(); sensors.delete(k); }
  for (const [k, e] of actuators) if (!seenActuators.has(k)) { e.instance.dispose(); actuators.delete(k); }
}

/** Lê todos os sensores e envia tudo numa única escrita (multi-path update). */
async function publishReadings() {
  const updates = {};
  const timestamp = now();

  for (const [k, { instance }] of sensors) {
    const [zoneId, id] = k.split("/");
    if (!zones[zoneId]?.sensors?.[id]) continue; // removido entretanto
    updates[`zones/${zoneId}/sensors/${id}/value`] = instance.read();
    updates[`zones/${zoneId}/sensors/${id}/updatedAt`] = timestamp;
  }

  if (Object.keys(updates).length) {
    await db.ref().update(updates);
  }
}

function start() {
  ref("zones").on("value", (snapshot) => {
    zones = snapshot.val() ?? {};
    reconcile();
  });

  setInterval(() => {
    publishReadings().catch((err) => console.error("[devices] erro ao publicar:", err.message));
  }, config.sensorPublishInterval);

  console.log(`[devices] a publicar leituras a cada ${config.sensorPublishInterval / 1000}s`);
}

function stop() {
  for (const { instance } of sensors.values()) instance.dispose();
  for (const { instance } of actuators.values()) instance.dispose();
}

module.exports = { start, stop };
