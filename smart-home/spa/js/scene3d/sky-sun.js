// Céu físico e sol real.
// O sol percorre o céu entre o nascer e o pôr do sol (dados da API em /external/sun),
// as sombras rodam ao longo do dia, o céu fica alaranjado ao amanhecer/entardecer e,
// à noite, aparecem estrelas e o luar. A luz ambiente é calculada a partir do próprio céu.
import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";

const LATITUDE = 39.74;        // Leiria
const NIGHT_SKY = new THREE.Color(0x0b1026);
const deg = THREE.MathUtils.degToRad;

/** Altura máxima do sol ao meio-dia solar, conforme o dia do ano (graus). */
function maxSunElevation(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - start) / 86400000);
  const declination = 23.44 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365);
  return 90 - LATITUDE + declination;
}

/**
 * Posição do sol (elevação e azimute em graus) para um instante, a partir das horas
 * de nascer e pôr do sol. De dia: nasce a este, passa a sul, põe-se a oeste.
 */
export function sunPosition(now, sunrise, sunset) {
  const rise = sunrise.getTime();
  const set = sunset.getTime();
  const t = now.getTime();
  const maxEl = maxSunElevation(now);

  if (t >= rise && t <= set) {
    const f = (t - rise) / (set - rise);
    return { elevation: maxEl * Math.sin(Math.PI * f), azimuth: 90 + 180 * f };
  }
  // Noite: o sol "desce" abaixo do horizonte até à meia-noite solar e volta a subir
  const nightLen = 86400000 - (set - rise);
  const since = t > set ? t - set : t + 86400000 - set;
  const g = Math.min(1, since / nightLen);
  return { elevation: -35 * Math.sin(Math.PI * g), azimuth: 270 + 180 * g };
}

/** Direção (vetor unitário) para elevação/azimute. Norte = -Z, Este = +X. */
function direction(elevation, azimuth) {
  const el = deg(elevation);
  const az = deg(azimuth);
  return new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az));
}

export function createSkySun(ctx, quality) {
  const { scene, renderer } = ctx;

  // Céu físico (Rayleigh/Mie) visível como fundo
  const sky = new Sky();
  sky.scale.setScalar(900);
  const u = sky.material.uniforms;
  u.turbidity.value = 4;
  u.rayleigh.value = 1.6;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.82;
  scene.add(sky);

  // Cópia do céu numa cena à parte, só para gerar a luz ambiente (environment map)
  const envScene = new THREE.Scene();
  const envSky = new Sky();
  envSky.scale.setScalar(900);
  envScene.add(envSky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envTarget = null;
  let lastEnvElevation = 999;

  // Sol (projeta sombras)
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  // Luar (fraco, azulado, sem sombras)
  const moon = new THREE.DirectionalLight(0x9db4ff, 0);
  moon.position.set(-20, 30, 15);
  scene.add(moon);

  // Luz suave de preenchimento (céu/chão)
  const hemi = new THREE.HemisphereLight(0xdfeaff, 0x5d6b45, 0.4);
  scene.add(hemi);

  // Estrelas
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 1500; i++) {
    const v = new THREE.Vector3().randomDirection();
    if (v.y < 0.05) v.y = Math.abs(v.y) + 0.05;
    starPos.push(...v.normalize().multiplyScalar(800).toArray());
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  scene.background = NIGHT_SKY.clone();

  let times = null;           // { sunrise: Date, sunset: Date }
  let fallbackDay = true;     // usado se não houver horas da API
  let cloudiness = 0;         // 0–1 (meteorologia)
  let center = new THREE.Vector3();
  let accum = 1;
  let state = { elevation: 45, dayFactor: 1 };

  function update() {
    const now = new Date();
    let pos;
    if (times) {
      pos = sunPosition(now, times.sunrise, times.sunset);
    } else {
      pos = fallbackDay ? { elevation: 40, azimuth: 160 } : { elevation: -20, azimuth: 0 };
    }
    const dir = direction(pos.elevation, pos.azimuth);

    // dayFactor: 0 de noite, 1 de dia, com transição no crepúsculo (-6° a +6°)
    const dayFactor = THREE.MathUtils.smoothstep(pos.elevation, -6, 6);
    const lowSun = 1 - THREE.MathUtils.smoothstep(pos.elevation, 0, 25); // 1 com sol baixo
    const clouds = 1 - cloudiness * 0.75;

    u.sunPosition.value.copy(dir);
    envSky.material.uniforms.sunPosition.value.copy(dir);
    u.turbidity.value = envSky.material.uniforms.turbidity.value = 4 + cloudiness * 10;
    u.rayleigh.value = envSky.material.uniforms.rayleigh.value = 1.6 + lowSun * 1.2;

    // Sol: posição, cor (mais quente quando está baixo) e intensidade
    sun.position.copy(center).addScaledVector(dir, 40);
    sun.target.position.copy(center);
    sun.color.setRGB(1, 0.92 - lowSun * 0.25, 0.85 - lowSun * 0.45);
    sun.intensity = 2.4 * THREE.MathUtils.smoothstep(pos.elevation, -1, 8) * clouds;
    sun.castShadow = sun.intensity > 0.05;

    moon.intensity = 0.8 * (1 - dayFactor);
    hemi.intensity = 0.3 + 0.3 * dayFactor * clouds;
    hemi.color.setHSL(0.6, 0.4, 0.4 + 0.45 * dayFactor);

    // De noite, o céu físico dá lugar a um fundo escuro com estrelas
    sky.visible = dayFactor > 0.02;
    sky.material.opacity = dayFactor;
    starMat.opacity = Math.max(0, 1 - dayFactor * 1.5) * (1 - cloudiness);
    scene.background.copy(NIGHT_SKY);

    // Luz ambiente gerada do céu: só se recalcula quando o sol mexe o suficiente
    if (Math.abs(pos.elevation - lastEnvElevation) > 0.75 || !envTarget) {
      lastEnvElevation = pos.elevation;
      envTarget?.dispose();
      envTarget = pmrem.fromScene(envScene, 0, 0.1, 1000);
      scene.environment = envTarget.texture;
    }
    scene.environmentIntensity = (0.3 + 0.7 * dayFactor) * (1 - cloudiness * 0.35);

    state = { elevation: pos.elevation, dayFactor };
  }

  // Recalcula 2 vezes por segundo (o sol mexe devagar)
  ctx.onFrame((dt) => {
    accum += dt;
    if (accum >= 0.5) { accum = 0; update(); }
  });
  update();

  return {
    /** Horas do nascer/pôr do sol (strings ISO da API). */
    setSunTimes(sun) {
      if (sun?.sunrise && sun?.sunset) {
        times = { sunrise: new Date(sun.sunrise), sunset: new Date(sun.sunset) };
        // As horas da API são de um dia concreto. Se forem antigas (ex.: de ontem),
        // avança-se de dia em dia até ficarem perto de agora (o horário muda pouco de um dia para o outro)
        const DAY = 86400000;
        const now = Date.now();
        while (now - times.sunset.getTime() > DAY / 2) {
          times.sunrise = new Date(times.sunrise.getTime() + DAY);
          times.sunset = new Date(times.sunset.getTime() + DAY);
        }
        while (times.sunrise.getTime() - now > DAY / 2) {
          times.sunrise = new Date(times.sunrise.getTime() - DAY);
          times.sunset = new Date(times.sunset.getTime() - DAY);
        }
      } else {
        times = null;
        if (typeof sun?.isDay === "boolean") fallbackDay = sun.isDay;
      }
      update();
    },
    setFallbackDay(isDay) { fallbackDay = isDay; if (!times) update(); },
    setCloudiness(c) { cloudiness = THREE.MathUtils.clamp(c, 0, 1); },
    /** Ajusta a zona de sombras para cobrir a casa. */
    fitShadows(box) {
      center = box.getCenter(new THREE.Vector3());
      const r = Math.max(box.getSize(new THREE.Vector3()).length() / 2 + 14, 20);
      Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 120 });
      sun.shadow.camera.updateProjectionMatrix();
      update();
    },
    /** 0 = noite, 1 = dia (para outros módulos, ex.: cor do nevoeiro). */
    get dayFactor() { return state.dayFactor; },
    flash(strength) { hemi.intensity += strength; }
  };
}
