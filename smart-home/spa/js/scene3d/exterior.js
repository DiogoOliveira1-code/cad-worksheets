// Exterior da casa: terreno relvado, relva em 3D a abanar ao vento, árvores,
// caminho de pedra até à entrada e vedação. Reconstrói-se quando a planta muda.
import * as THREE from "three";
import { floorMaterial, mat, colored } from "./materials.js";

function rand(seed) {
  let s = seed % 2147483647 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const inside = (p, r, m = 0) => p.x > r.x - m && p.x < r.x + r.w + m && p.z > r.y - m && p.z < r.y + r.h + m;

export function createExterior(ctx, quality) {
  const { scene, onFrame } = ctx;

  // ---- Terreno ---------------------------------------------------------------
  const groundGeo = new THREE.CircleGeometry(160, 64);
  // Repete a textura da relva (UVs em metros / 3)
  const uv = groundGeo.attributes.uv;
  const posAttr = groundGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, posAttr.getX(i) / 3, posAttr.getY(i) / 3);
  const ground = new THREE.Mesh(groundGeo, floorMaterial("grass"));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---- Relva em 3D (instancing: milhares de folhas desenhadas de uma só vez) ---
  const BLADE_H = 0.32;
  const bladeGeo = new THREE.PlaneGeometry(0.05, BLADE_H, 1, 3);
  bladeGeo.translate(0, BLADE_H / 2, 0);
  const bp = bladeGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const y = bp.getY(i) / BLADE_H;
    bp.setX(i, bp.getX(i) * (1 - y * 0.85)); // afunila no topo
  }
  // Normais viradas para cima: a relva recebe a luz como o chão (não fica "brilhante" de lado)
  const bn = bladeGeo.attributes.normal;
  for (let i = 0; i < bn.count; i++) bn.setXYZ(i, 0, 1, 0);

  const windUniform = { value: 0 };
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
  bladeMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
         float hh = position.y / ${BLADE_H.toFixed(2)};
         float sway = sin(uTime * 1.6 + ip.x * 0.55 + ip.z * 0.35) * 0.06 + sin(uTime * 3.1 + ip.x * 2.0) * 0.015;
         transformed.x += sway * hh * hh;
         transformed.z += sway * 0.6 * hh * hh;`
      );
  };

  const grass = new THREE.InstancedMesh(bladeGeo, bladeMat, quality.grass);
  grass.receiveShadow = true;
  grass.frustumCulled = false;
  scene.add(grass);

  let windTime = 0;
  let windStrength = 1;
  onFrame((dt) => { windTime += dt * windStrength; windUniform.value = windTime; });

  // ---- Grupo para árvores, caminho e vedação (reconstruído com a planta) -------
  const props = new THREE.Group();
  scene.add(props);

  const treeTops = [];
  onFrame((_dt, t) => {
    for (const { obj, phase } of treeTops) {
      obj.rotation.z = Math.sin(t * 0.8 + phase) * 0.02 * windStrength;
    }
  });

  function clearProps() {
    props.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    props.clear();
    treeTops.length = 0;
  }

  function addTree(x, z, r) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    const h = 2.2 + r() * 1.5;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, h, 8), mat("bark"));
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    tree.add(trunk);

    const crown = new THREE.Group();
    crown.position.y = h;
    const greens = [0x3f6f2e, 0x4b7d34, 0x35612a, 0x557f3a];
    const blobs = 4 + Math.floor(r() * 3);
    for (let i = 0; i < blobs; i++) {
      const s = 0.9 + r() * 0.8;
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), colored(greens[i % greens.length], 0.85));
      blob.position.set((r() - 0.5) * 1.6, r() * 1.4, (r() - 0.5) * 1.6);
      blob.castShadow = true;
      blob.receiveShadow = true;
      crown.add(blob);
    }
    tree.add(crown);
    treeTops.push({ obj: crown, phase: r() * 6 });
    props.add(tree);
  }

  function addPath(from, dir, length, r) {
    // Lajes de pedra irregulares a partir da porta de entrada
    const n = Math.floor(length / 0.75);
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.32 + r() * 0.08, 0.34, 0.06, 7), mat("stonePath"));
      s.position.set(
        from.x + dir.x * (0.6 + i * 0.75) + (r() - 0.5) * 0.15,
        0.02,
        from.z + dir.z * (0.6 + i * 0.75) + (r() - 0.5) * 0.15
      );
      s.rotation.y = r() * Math.PI;
      s.receiveShadow = true;
      props.add(s);
    }
  }

  function addFence(box, gate) {
    // Pilares de tijolo + ripas de madeira, com uma abertura (portão) para o caminho
    const minX = box.min.x, maxX = box.max.x, minZ = box.min.z, maxZ = box.max.z;
    const sides = [
      [[minX, minZ], [maxX, minZ]], [[maxX, minZ], [maxX, maxZ]],
      [[maxX, maxZ], [minX, maxZ]], [[minX, maxZ], [minX, minZ]]
    ];
    const pillarGeo = new THREE.BoxGeometry(0.3, 1.1, 0.3);
    for (const [[x1, z1], [x2, z2]] of sides) {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const n = Math.max(1, Math.round(len / 2.5));
      for (let i = 0; i <= n; i++) {
        const x = x1 + ((x2 - x1) * i) / n;
        const z = z1 + ((z2 - z1) * i) / n;
        const p = new THREE.Mesh(pillarGeo, mat("brick"));
        p.position.set(x, 0.55, z);
        p.castShadow = true;
        props.add(p);
        if (i === n) continue;
        const nx = x1 + ((x2 - x1) * (i + 1)) / n;
        const nz = z1 + ((z2 - z1) * (i + 1)) / n;
        const mid = new THREE.Vector3((x + nx) / 2, 0, (z + nz) / 2);
        if (gate && mid.distanceTo(gate) < 1.6) continue; // portão
        const segLen = Math.hypot(nx - x, nz - z) - 0.3;
        for (const y of [0.4, 0.8]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.12, 0.05), mat("woodDark"));
          rail.position.set(mid.x, y, mid.z);
          rail.rotation.y = -Math.atan2(nz - z, nx - x);
          rail.castShadow = true;
          props.add(rail);
        }
      }
    }
  }

  /**
   * Reconstrói o exterior para a planta atual.
   * @param {THREE.Box3} box  caixa da casa
   * @param {Array} rooms     [{x, y, w, h, roomType, outdoor}]
   */
  function setHouse(box, rooms) {
    clearProps();
    if (box.isEmpty()) return;
    const r = rand(1234 + Math.round(box.min.x * 7 + box.max.z * 13));
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const indoor = rooms.filter((rm) => !rm.outdoor);

    // Lote: a casa + 6 m à volta
    const lot = new THREE.Box3(
      new THREE.Vector3(box.min.x - 6, 0, box.min.z - 6),
      new THREE.Vector3(box.max.x + 6, 0, box.max.z + 6)
    );

    // Caminho: da entrada até à vedação, pelo lado mais próximo
    let gate = null;
    const entrance = rooms.find((rm) => rm.roomType === "entrance") ?? indoor[0];
    let pathRect = null;
    if (entrance) {
      const ec = new THREE.Vector3(entrance.x + entrance.w / 2, 0, entrance.y + entrance.h / 2);
      const d = [
        { dir: new THREE.Vector3(0, 0, -1), dist: entrance.y - box.min.z, from: new THREE.Vector3(ec.x, 0, entrance.y), to: lot.min.z },
        { dir: new THREE.Vector3(0, 0, 1), dist: box.max.z - (entrance.y + entrance.h), from: new THREE.Vector3(ec.x, 0, entrance.y + entrance.h), to: lot.max.z },
        { dir: new THREE.Vector3(-1, 0, 0), dist: entrance.x - box.min.x, from: new THREE.Vector3(entrance.x, 0, ec.z), to: lot.min.x },
        { dir: new THREE.Vector3(1, 0, 0), dist: box.max.x - (entrance.x + entrance.w), from: new THREE.Vector3(entrance.x + entrance.w, 0, ec.z), to: lot.max.x }
      ].sort((a, b) => a.dist - b.dist)[0];
      const length = Math.abs((d.dir.x ? d.to - d.from.x : d.to - d.from.z));
      addPath(d.from, d.dir, length, r);
      gate = d.from.clone().addScaledVector(d.dir, length);
      const a = d.from, b = gate;
      pathRect = { x: Math.min(a.x, b.x) - 0.6, y: Math.min(a.z, b.z) - 0.6, w: Math.abs(a.x - b.x) + 1.2, h: Math.abs(a.z - b.z) + 1.2 };
    }

    addFence(lot, gate);

    // Árvores dentro do lote, longe da casa, e algumas fora
    const trees = 6 + Math.floor(r() * 3);
    let placed = 0;
    for (let tries = 0; placed < trees && tries < 200; tries++) {
      const p = new THREE.Vector3(
        lot.min.x + 1 + r() * (lot.max.x - lot.min.x - 2), 0,
        lot.min.z + 1 + r() * (lot.max.z - lot.min.z - 2)
      );
      if (inside(p, { x: box.min.x, y: box.min.z, w: size.x, h: size.z }, 2.5)) continue;
      if (pathRect && inside(p, pathRect, 1.5)) continue;
      addTree(p.x, p.z, r);
      placed++;
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + r() * 0.4;
      const dist = Math.max(size.x, size.z) / 2 + 14 + r() * 12;
      addTree(center.x + Math.cos(a) * dist, center.z + Math.sin(a) * dist, r);
    }

    // Relva: dentro do lote, fora das divisões interiores e do caminho
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let count = 0;
    for (let tries = 0; count < quality.grass && tries < quality.grass * 3; tries++) {
      const p = new THREE.Vector3(
        lot.min.x - 2 + r() * (lot.max.x - lot.min.x + 4), 0,
        lot.min.z - 2 + r() * (lot.max.z - lot.min.z + 4)
      );
      if (indoor.some((rm) => inside(p, rm, 0.1))) continue;
      if (pathRect && inside(p, { ...pathRect, x: pathRect.x + 0.4, y: pathRect.y + 0.4, w: pathRect.w - 0.8, h: pathRect.h - 0.8 })) continue;
      dummy.position.copy(p);
      dummy.rotation.y = r() * Math.PI;
      dummy.scale.setScalar(0.6 + r() * 0.8);
      dummy.updateMatrix();
      grass.setMatrixAt(count, dummy.matrix);
      color.setHSL(0.23 + r() * 0.06, 0.5 + r() * 0.15, 0.16 + r() * 0.1);
      grass.setColorAt(count, color);
      count++;
    }
    grass.count = count;
    grass.instanceMatrix.needsUpdate = true;
    if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
  }

  return {
    setHouse,
    /** Vento (m/s da API) -> velocidade a que a relva e as árvores abanam. */
    setWind(speedKmh) { windStrength = 0.6 + Math.min(speedKmh ?? 10, 60) / 20; }
  };
}
