// Meteorologia real na cena (dados da Open-Meteo em /external/weather).
// Código WMO (weatherCode):
//   0 limpo · 1–3 nuvens · 45/48 nevoeiro · 51–67 e 80–82 chuva · 71–77, 85–86 neve · 95–99 trovoada
import * as THREE from "three";

function classify(code) {
  if (code == null) return { clouds: 0.2 };
  if (code === 0) return { clouds: 0 };
  if (code === 1) return { clouds: 0.25 };
  if (code === 2) return { clouds: 0.5 };
  if (code === 3) return { clouds: 0.9 };
  if (code === 45 || code === 48) return { clouds: 0.8, fog: 0.05 };
  if (code >= 51 && code <= 57) return { clouds: 0.85, rain: 0.35, fog: 0.012 };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { clouds: 0.95, rain: code === 65 || code === 82 ? 1 : 0.7, fog: 0.015 };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { clouds: 0.9, snow: 0.8, fog: 0.015 };
  if (code >= 95) return { clouds: 1, rain: 1, thunder: true, fog: 0.015 };
  return { clouds: 0.3 };
}

/** Textura de nuvem (mancha branca suave) desenhada num canvas. */
function cloudTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  for (let i = 0; i < 7; i++) {
    const x = 30 + Math.random() * 68, y = 40 + Math.random() * 48, r = 22 + Math.random() * 22;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(255,255,255,0.9)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createWeather(ctx, sky) {
  const { scene, onFrame } = ctx;
  const AREA = 50, HEIGHT = 25;
  let center = new THREE.Vector3();
  let state = classify(null);

  // ---- Chuva (segmentos de linha a cair) --------------------------------------
  const DROPS = 3500;
  const rainPos = new Float32Array(DROPS * 6);
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xaab8c8, transparent: true, opacity: 0.45 }));
  rain.frustumCulled = false;
  rain.visible = false;
  scene.add(rain);

  // ---- Neve (pontos a cair devagar) -------------------------------------------
  const FLAKES = 2500;
  const snowPos = new Float32Array(FLAKES * 3);
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.9 }));
  snow.frustumCulled = false;
  snow.visible = false;
  scene.add(snow);

  function seed(arr, stride, i) {
    const x = center.x + (Math.random() - 0.5) * AREA;
    const y = Math.random() * HEIGHT;
    const z = center.z + (Math.random() - 0.5) * AREA;
    arr[i * stride] = x; arr[i * stride + 1] = y; arr[i * stride + 2] = z;
    if (stride === 6) { arr[i * 6 + 3] = x; arr[i * 6 + 4] = y + 0.35; arr[i * 6 + 5] = z; }
  }
  for (let i = 0; i < DROPS; i++) seed(rainPos, 6, i);
  for (let i = 0; i < FLAKES; i++) seed(snowPos, 3, i);

  // ---- Nuvens ------------------------------------------------------------------
  const cloudTex = cloudTexture();
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0, depthWrite: false, fog: false });
    const s = new THREE.Sprite(m);
    s.scale.set(28 + Math.random() * 20, 12 + Math.random() * 6, 1);
    s.userData = { ox: (Math.random() - 0.5) * 140, oz: (Math.random() - 0.5) * 140, y: 38 + Math.random() * 14, speed: 0.6 + Math.random() * 0.8 };
    scene.add(s);
    clouds.push(s);
  }

  // ---- Nevoeiro ----------------------------------------------------------------
  scene.fog = new THREE.FogExp2(0xbfc8d2, 0);

  let flashTimer = 3;

  onFrame((dt, t) => {
    const day = sky.dayFactor;

    // Chuva
    if (rain.visible) {
      const n = Math.floor(DROPS * state.rain);
      for (let i = 0; i < n; i++) {
        rainPos[i * 6 + 1] -= 18 * dt;
        rainPos[i * 6 + 4] -= 18 * dt;
        if (rainPos[i * 6 + 1] < 0) seed(rainPos, 6, i);
      }
      rainGeo.setDrawRange(0, n * 2);
      rainGeo.attributes.position.needsUpdate = true;
    }
    // Neve
    if (snow.visible) {
      for (let i = 0; i < FLAKES; i++) {
        snowPos[i * 3 + 1] -= 1.2 * dt;
        snowPos[i * 3] += Math.sin(t + i) * 0.2 * dt;
        if (snowPos[i * 3 + 1] < 0) seed(snowPos, 3, i);
      }
      snowGeo.attributes.position.needsUpdate = true;
    }
    // Nuvens a deslizar
    clouds.forEach((c, i) => {
      const u = c.userData;
      const x = ((u.ox + t * u.speed + 70) % 140) - 70;
      c.position.set(center.x + x, u.y, center.z + u.oz);
      const visible = i < Math.round(clouds.length * state.clouds);
      const tone = 0.35 + 0.6 * day;
      c.material.color.setRGB(tone, tone, tone * 1.05);
      c.material.opacity += ((visible ? 0.85 : 0) - c.material.opacity) * Math.min(1, dt);
    });
    // Nevoeiro acompanha a luz do dia
    const fogTone = 0.08 + 0.68 * day;
    scene.fog.color.setRGB(fogTone, fogTone * 1.03, fogTone * 1.08);
    scene.fog.density += ((state.fog ?? 0) - scene.fog.density) * Math.min(1, dt);

    // Relâmpagos
    if (state.thunder) {
      flashTimer -= dt;
      if (flashTimer < 0) { sky.flash(4); flashTimer = 4 + Math.random() * 8; }
    }
  });

  return {
    /** Recebe /external/weather. */
    set(weather) {
      state = classify(weather?.weatherCode);
      state.rain = state.rain ?? 0;
      rain.visible = state.rain > 0;
      snow.visible = !!state.snow;
      sky.setCloudiness(state.clouds);
    },
    centerOn(c) { center = c.clone(); }
  };
}
