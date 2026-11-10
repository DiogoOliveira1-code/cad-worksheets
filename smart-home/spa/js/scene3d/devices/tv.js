// Televisão inteligente (atuador "tv"): móvel + televisor.
//   Desligada            -> ecrã preto
//   Ligada, com link     -> leitor de vídeo (YouTube, Vimeo ou .mp4/.webm) colocado em 3D sobre o ecrã
//   Ligada, sem link     -> "canal da casa": hora, tempo exterior, temperatura, CO2 e alertas (dados reais)
//
// Porquê um leitor HTML e não uma textura? O YouTube não deixa ler as imagens do vídeo para
// dentro do WebGL. Por isso o leitor (iframe/video) fica numa camada HTML 3D (CSS3DRenderer,
// criada em scene.js) exatamente por cima do ecrã. Como essa camada está por cima do desenho 3D,
// o leitor esconde-se quando uma parede ou um móvel fica à frente da TV.
// O link fica guardado no atuador, em /zones/{sala}/actuators/{tv}/videoUrl.
import * as THREE from "three";
import { CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";
import { listen, listenLast } from "../../services/data.js";
import { DB } from "../../config/constants.js";
import { QUALITY_LEVEL } from "../quality.js";
import { mat } from "../materials.js";

const SCREEN_W = 1.3;
const SCREEN_H = 0.73;
const PLAYER_W = 1280; // tamanho do leitor em píxeis CSS (16:9); é escalado para o tamanho do ecrã
const PLAYER_H = 720;

// ---------------------------------------------------------------------------
// Links de vídeo -> leitor
// ---------------------------------------------------------------------------
/** Converte o link colado pelo utilizador no leitor certo. Devolve null se o link for inválido. */
export function videoPlayerFor(url) {
  if (!url) return null;
  let u;
  try { u = new URL(url.trim(), location.href); } catch { return null; }
  const host = u.hostname.replace(/^(www|m)\./, "");

  // YouTube: watch?v=ID, youtu.be/ID, /shorts/ID, /embed/ID, /live/ID
  let id = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if (host.endsWith("youtube.com")) {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else id = u.pathname.match(/^\/(shorts|embed|live)\/([^/?#]+)/)?.[2] ?? null;
  }
  if (id) {
    const p = `autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&playsinline=1&rel=0&modestbranding=1`;
    return { type: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}?${p}` };
  }

  // Vimeo
  if (host === "vimeo.com") {
    const vid = u.pathname.match(/^\/(\d+)/)?.[1];
    if (vid) return { type: "iframe", src: `https://player.vimeo.com/video/${vid}?autoplay=1&muted=1&loop=1&background=1` };
  }
  if (host === "player.vimeo.com") return { type: "iframe", src: u.href };

  // Ficheiro de vídeo direto (também ficheiros do projeto, ex.: assets/videos/demo.mp4)
  if (/\.(mp4|webm|ogg|ogv|mov)$/i.test(u.pathname)) return { type: "video", src: u.href };

  // Outro site: tenta incorporar (alguns sites não deixam)
  return { type: "iframe", src: u.href };
}

function createPlayerElement(player) {
  const wrap = document.createElement("div");
  wrap.className = "tv-player";
  wrap.style.width = `${PLAYER_W}px`;
  wrap.style.height = `${PLAYER_H}px`;

  let media;
  if (player.type === "video") {
    media = document.createElement("video");
    media.src = player.src;
    media.muted = true;       // os browsers só deixam tocar sozinho sem som
    media.loop = true;
    media.autoplay = true;
    media.playsInline = true;
  } else {
    media = document.createElement("iframe");
    media.src = player.src;
    media.allow = "autoplay; encrypted-media; picture-in-picture";
    media.referrerPolicy = "strict-origin-when-cross-origin";
    media.setAttribute("frameborder", "0");
  }
  wrap.appendChild(media);
  return { wrap, media };
}

// ---------------------------------------------------------------------------
// Dados para o canal da casa (uma só subscrição, partilhada por todas as TVs)
// ---------------------------------------------------------------------------
const live = { zones: {}, external: {}, alerts: {} };
let subscribed = false;
function subscribe() {
  if (subscribed) return;
  subscribed = true;
  listen(DB.ZONES, (v) => { live.zones = v ?? {}; });
  listen(DB.EXTERNAL, (v) => { live.external = v ?? {}; });
  listenLast(DB.ALERTS, 3, (v) => { live.alerts = v ?? {}; });
}

function summary() {
  const temps = [];
  let co2 = null;
  for (const z of Object.values(live.zones)) {
    for (const s of Object.values(z.sensors ?? {})) {
      if (s.type === "temperature" && typeof s.value === "number") temps.push(s.value);
      if ((s.type === "eco2" || s.type === "air_quality") && typeof s.value === "number") co2 = Math.max(co2 ?? 0, s.value);
    }
  }
  return { avg: temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null, co2 };
}

/** Desenha o canal da casa num canvas 16:9. */
function drawInfo(g, w, h) {
  const now = new Date();
  const ext = live.external ?? {};
  const s = summary();

  const grd = g.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, "#0f2a4a");
  grd.addColorStop(1, "#1b4f72");
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);

  g.fillStyle = "#ffffff";
  g.font = "bold 64px sans-serif";
  g.fillText(now.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }), 32, 84);
  g.font = "24px sans-serif";
  g.fillStyle = "#b9d4ec";
  g.fillText(now.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" }), 34, 120);

  const fmt = (v, unit, d = 1) => (typeof v === "number" ? `${v.toFixed(d)}${unit}` : "—");
  const card = (x, title, value) => {
    g.fillStyle = "rgba(255,255,255,0.10)";
    g.fillRect(x, 150, 140, 92);
    g.fillStyle = "#b9d4ec";
    g.font = "18px sans-serif";
    g.fillText(title, x + 12, 178);
    g.fillStyle = "#ffffff";
    g.font = "bold 32px sans-serif";
    g.fillText(value, x + 12, 222);
  };
  card(32, "Exterior", fmt(ext.weather?.temperature, "°", 0));
  card(186, "Interior", fmt(s.avg, "°", 1));
  card(340, "CO2 (ppm)", s.co2 == null ? "—" : `${Math.round(s.co2)}`);

  // Rodapé com o último alerta, a deslizar
  const last = Object.values(live.alerts).pop();
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fillRect(0, h - 40, w, 40);
  g.fillStyle = last ? "#ffd166" : "#b9d4ec";
  g.font = "20px sans-serif";
  const text = last ? `⚠ ${last.message}` : "Casa Inteligente · tudo normal";
  const tw = g.measureText(text).width;
  g.fillText(text, w - ((now.getTime() / 25) % (w + tw)), h - 13);
}

// ---------------------------------------------------------------------------
// Modelo 3D
// ---------------------------------------------------------------------------
export function createTv(_def, _roomSize, ctx) {
  subscribe();
  const object = new THREE.Group();
  const isEditor = !!ctx?.camera?.isOrthographicCamera; // no editor não há leitor de vídeo

  // Móvel baixo
  const unit = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.42), mat("woodFurniture"));
  unit.position.y = 0.225;
  unit.castShadow = true;
  unit.receiveShadow = true;
  object.add(unit);

  // Televisor (moldura + pé), virado para +Z
  const screenY = 0.45 + 0.08 + SCREEN_H / 2;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(SCREEN_W + 0.05, SCREEN_H + 0.05, 0.05), mat("screen"));
  frame.position.set(0, screenY, -0.06);
  frame.castShadow = true;
  object.add(frame);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.2), mat("darkMetal"));
  foot.position.set(0, 0.49, -0.06);
  object.add(foot);

  // Ecrã: material sem iluminação (brilha por si, como um ecrã real)
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x050505, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W, SCREEN_H), screenMat);
  screen.position.set(0, screenY, -0.06 + 0.027);
  object.add(screen);

  // Canal da casa (canvas)
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 288;
  const g = canvas.getContext("2d");
  const infoTexture = new THREE.CanvasTexture(canvas);
  infoTexture.colorSpace = THREE.SRGBColorSpace;
  const infoEvery = QUALITY_LEVEL === "low" ? 5 : 1; // segundos entre redesenhos

  // Leitor de vídeo (camada HTML 3D)
  let player = null;        // { url, cssObject, media, suspended }
  let on = false;
  let url = "";
  let sinceInfo = infoEvery;
  let sinceOcclusion = 0;

  function setScreen(map, color) {
    if (screenMat.map === map && screenMat.color.getHex() === color) return;
    screenMat.map = map;
    screenMat.color.setHex(color);
    screenMat.needsUpdate = true;
  }

  function removePlayer() {
    if (!player) return;
    player.cssObject.element.remove();
    player.cssObject.removeFromParent();
    player = null;
  }

  function ensurePlayer() {
    if (isEditor || !ctx?.cssScene) return;
    if (player?.url === url) return;
    removePlayer();
    const p = videoPlayerFor(url);
    if (!p) return;
    const { wrap, media } = createPlayerElement(p);
    const cssObject = new CSS3DObject(wrap);
    cssObject.scale.setScalar(SCREEN_W / PLAYER_W);
    ctx.cssScene.add(cssObject);
    player = { url, cssObject, media, src: media.src, suspended: false };
  }

  // Quando a casa deixa de estar visível (outro ecrã da SPA), para o vídeo
  const hidden = () => !ctx?.container || ctx.container.offsetParent === null;
  const watchdog = setInterval(() => {
    if (player && !player.suspended && hidden()) {
      player.suspended = true;
      if (player.media.tagName === "VIDEO") player.media.pause();
      else player.media.src = "about:blank";
    }
  }, 500);

  // Verifica se alguma coisa está à frente do ecrã (paredes, móveis, outros dispositivos)
  const raycaster = new THREE.Raycaster();
  const corners = [[0, 0], [-0.45, -0.4], [0.45, -0.4], [-0.45, 0.4], [0.45, 0.4]];
  const isOwn = (o) => { for (let p = o; p; p = p.parent) if (p === object) return true; return false; };
  // Esconde o leitor se 2 ou mais dos 5 pontos do ecrã estiverem tapados (evita "piscar")
  function occluded() {
    const house = ctx.scene.getObjectByName("house");
    if (!house) return false;
    const cam = ctx.camera.position;
    let blocked = 0;
    for (const [cx, cy] of corners) {
      const pt = screen.localToWorld(new THREE.Vector3(cx * SCREEN_W, cy * SCREEN_H, 0));
      const dir = pt.clone().sub(cam);
      const dist = dir.length();
      raycaster.set(cam, dir.normalize());
      raycaster.far = dist - 0.02;
      const hit = raycaster.intersectObject(house, true).find((h) => !isOwn(h.object) && h.object.visible);
      if (hit && ++blocked >= 2) return true;
    }
    return false;
  }

  return {
    object,
    update(def) {
      on = def.state === true;
      url = (def.videoUrl ?? "").trim();
      if (on && url) ensurePlayer();
      else removePlayer();
      if (!on) setScreen(null, 0x050505);

      // Vira-se para dentro da sala conforme a parede mais próxima
      const px = def.pos?.x ?? 0.5;
      const py = def.pos?.y ?? 0.5;
      const d = { n: py, s: 1 - py, w: px, e: 1 - px };
      const nearest = Object.entries(d).sort((a, b) => a[1] - b[1])[0][0];
      object.rotation.y = { n: 0, s: Math.PI, w: Math.PI / 2, e: -Math.PI / 2 }[nearest];
    },
    tick(dt) {
      if (!on) return;

      if (player) {
        // Retoma o vídeo se tinha sido parado ao mudar de ecrã
        if (player.suspended) {
          player.suspended = false;
          if (player.media.tagName === "VIDEO") player.media.play().catch(() => {});
          else player.media.src = player.src;
        }
        // Garante que um vídeo direto está a tocar (o arranque automático nem sempre acontece)
        if (player.media.tagName === "VIDEO" && player.media.paused && player.media.readyState >= 2) {
          player.media.play().catch(() => {});
        }
        // Leitor acompanha o ecrã (posição e orientação no mundo)
        screen.updateWorldMatrix(true, false);
        screen.getWorldPosition(player.cssObject.position);
        screen.getWorldQuaternion(player.cssObject.quaternion);
        player.cssObject.position.add(new THREE.Vector3(0, 0, 0.004).applyQuaternion(player.cssObject.quaternion));

        sinceOcclusion += dt;
        if (sinceOcclusion > 0.2) {
          sinceOcclusion = 0;
          player.cssObject.element.style.visibility = occluded() ? "hidden" : "visible";
        }
        setScreen(null, 0x000000);
        return;
      }

      // Sem link (ou no editor): canal da casa
      sinceInfo += dt;
      if (sinceInfo >= infoEvery || screenMat.map !== infoTexture) {
        sinceInfo = 0;
        drawInfo(g, canvas.width, canvas.height);
        infoTexture.needsUpdate = true;
        setScreen(infoTexture, 0xffffff);
      }
    },
    destroy() {
      clearInterval(watchdog);
      removePlayer();
      infoTexture.dispose();
    }
  };
}
