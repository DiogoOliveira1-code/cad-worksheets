// Ambiente à volta da casa: junta o céu e o sol reais, o exterior (relva, árvores,
// caminho, vedação), a meteorologia e os efeitos de imagem.
//
// Lê diretamente /external da base de dados (horas do sol e meteorologia),
// por isso reage sozinho quando o servidor atualiza as APIs externas.
import * as THREE from "three";
import { listen } from "../services/data.js";
import { DB } from "../config/constants.js";
import { QUALITY } from "./quality.js";
import { createSkySun } from "./sky-sun.js";
import { createExterior } from "./exterior.js";
import { createWeather } from "./weather.js";
import { createPostprocessing } from "./postprocessing.js";

export function createEnvironment(ctx) {
  const sky = createSkySun(ctx, QUALITY);
  const exterior = createExterior(ctx, QUALITY);
  const weather = createWeather(ctx, sky);
  createPostprocessing(ctx, QUALITY);

  listen(DB.EXTERNAL, (external) => {
    sky.setSunTimes(external?.sun);
    weather.set(external?.weather);
    exterior.setWind(external?.weather?.windSpeed);
  });

  return {
    /** Usado só quando não há horas de nascer/pôr do sol. */
    setDaylight(isDay) {
      sky.setFallbackDay(isDay);
    },
    /**
     * A planta da casa mudou.
     * @param {THREE.Box3} box  caixa da casa
     * @param {Array} rooms     [{x, y, w, h, roomType, outdoor}]
     */
    setHouse(box, rooms) {
      sky.fitShadows(box);
      exterior.setHouse(box, rooms);
      weather.centerOn(box.getCenter(new THREE.Vector3()));
    }
  };
}
