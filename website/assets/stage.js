/* BAYK 3D stage. One lit scene per page, chosen by <body data-stage="...">:
   home     copper cloche on a plate; scrolling lifts the lid on a glowing ember dish
   weekly   a stack of meal-prep containers that follows the plan builder (5, 10 or 15)
   private  cloche, plate and a glass of red
   kitchen  cast-iron pan over a gas flame
   ambient  smoke and rising sparks, with an optional ember (data-core)
   Reads pointer, scroll and plan state from window.BAYK (set up in site.js). */
(() => {
  "use strict";

  const root = document.documentElement;
  const THREE = window.THREE;
  const canvas = document.getElementById("stage");
  const S = window.BAYK || { pointer: { x: 0, y: 0, last: 0 }, drag: { dx: 0, dy: 0 }, reveal: 0, scrollY: 0 };
  const kind = document.body.dataset.stage || "ambient";
  const reduce = !!S.reduceMotion;
  const announce = () => window.dispatchEvent(new Event("bayk:stage-ready"));
  const fail = () => { root.classList.add("no-webgl"); announce(); };
  if (!THREE || !canvas) { fail(); return; }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch (_) { fail(); return; }
  if (!renderer.getContext()) { fail(); return; }

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const isSmall = () => window.innerWidth < 900;
  const PR = Math.min(window.devicePixelRatio || 1, isSmall() ? 1.5 : 1.75);

  renderer.setPixelRatio(PR);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.82;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setClearColor(0x0b0908, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 100);

  /* ---------------------------------------------------------------- Environment: a studio with a warm floor glow */
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envScene;
  if (THREE.RoomEnvironment) {
    envScene = new THREE.RoomEnvironment();
  } else {
    envScene = new THREE.Scene();
    const box = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.BackSide }));
    envScene.add(box);
    const soft = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6, 6) }));
    soft.position.set(-2, 4.5, 2); soft.lookAt(0, 0, 0); envScene.add(soft);
  }
  const warmPanel = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.55, 0.18), side: THREE.DoubleSide }));
  warmPanel.position.set(0, -2.5, 2.5); warmPanel.lookAt(0, 0, 0);
  envScene.add(warmPanel);
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();

  /* ---------------------------------------------------------------- Smoke backdrop */
  const smokeMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }, uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uWarm: { value: 1 }, uScroll: { value: 0 }, uFocus: { value: new THREE.Vector2(0.5, 0.45) } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse; uniform float uWarm; uniform float uScroll; uniform vec2 uFocus;
      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
      float fbm(vec2 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.02 + vec2(1.7, 9.2); a *= 0.5; } return v; }
      void main(){
        float asp = uRes.x / uRes.y;
        vec2 p = (vUv - 0.5) * vec2(asp, 1.0);
        float t = uTime * 0.035;
        vec2 q = vec2(fbm(p * 1.3 + vec2(0.0, -t * 3.0 - uScroll)), fbm(p * 1.3 + vec2(5.2, 1.3) - t * 2.0));
        float s = fbm(p * 1.9 + q * 1.7 + vec2(t, -t * 4.0 - uScroll * 1.4));
        vec2 f = (uFocus - 0.5) * vec2(asp, 1.0);
        vec2 m = (uMouse - 0.5) * vec2(asp, 1.0);
        float glowF = 1.0 - smoothstep(0.0, 0.95, length((p - f) * vec2(0.8, 1.0)));
        float glowM = 1.0 - smoothstep(0.0, 0.5, length(p - m));
        vec3 col = vec3(0.043, 0.035, 0.031);
        col += vec3(0.30, 0.085, 0.03) * s * s * (0.25 + glowF * 1.1) * uWarm;
        col += vec3(0.5, 0.2, 0.07) * glowM * 0.05 * (0.5 + s);
        float vig = smoothstep(1.35, 0.15, length(p * vec2(0.8, 1.05)));
        col *= 0.5 + 0.5 * vig;
        col += (hash(vUv * uRes + uTime) - 0.5) * 0.012;
        gl_FragColor = vec4(col, 1.0);
      }`,
    depthWrite: false, depthTest: false,
  });
  const smoke = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), smokeMat);
  smoke.frustumCulled = false;
  smoke.renderOrder = -10;
  scene.add(smoke);

  /* ---------------------------------------------------------------- Lights */
  const hemi = new THREE.HemisphereLight(0x8c6d5c, 0x080504, 0.22);
  scene.add(hemi);
  const key = new THREE.SpotLight(0xffe9d6, 1.5, 0, 0.42, 0.9);
  key.position.set(-5, 9, 6);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xff8c4a, 1.1);
  rim.position.set(6, 3.5, -6);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffd2b0, 0.18);
  fill.position.set(4, 1, 7);
  scene.add(fill);
  const emberLight = new THREE.PointLight(0xff6a24, 0, 5, 2);
  scene.add(emberLight);

  /* Soft contact shadows instead of shadow maps: cleaner edges, no streaks across the backdrop */
  function shadowTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, "rgba(0,0,0,0.85)");
    grd.addColorStop(0.45, "rgba(0,0,0,0.45)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }
  const SHADOW = shadowTexture();
  function contactShadow(w, d, opacity = 0.8) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: SHADOW, transparent: true, opacity, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.002;
    m.renderOrder = -1;
    return m;
  }

  /* ---------------------------------------------------------------- Materials */
  const M = {
    copper: new THREE.MeshPhysicalMaterial({ color: 0xb36340, metalness: 1, roughness: 0.34, clearcoat: 0.35, clearcoatRoughness: 0.2, envMapIntensity: 0.55 }),
    copperDark: new THREE.MeshStandardMaterial({ color: 0x7a3f24, metalness: 1, roughness: 0.34, envMapIntensity: 0.6 }),
    bone: new THREE.MeshPhysicalMaterial({ color: 0x8f8377, metalness: 0, roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.25, envMapIntensity: 0.28 }),
    stoneware: new THREE.MeshPhysicalMaterial({ color: 0x0f0d0c, metalness: 0, roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.3, envMapIntensity: 0.3 }),
    lid: new THREE.MeshPhysicalMaterial({ color: 0x2a201b, metalness: 0, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.06, transparent: true, opacity: 0.4, envMapIntensity: 0.55, depthWrite: false }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.12, envMapIntensity: 1.1, side: THREE.DoubleSide, depthWrite: false }),
    wine: new THREE.MeshPhysicalMaterial({ color: 0x3a050c, metalness: 0, roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.94, envMapIntensity: 0.5 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x141211, metalness: 0.35, roughness: 0.6, envMapIntensity: 0.42 }),
  };

  /* Molten ember: a dark crust split by glowing seams */
  const NOISE3 = `
    float hash3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float noise3(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash3(i), hash3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
                 mix(mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
    float fbm3(vec3 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise3(p); p *= 2.03; a *= 0.5; } return v; }`;
  function emberMaterial(scale = 2.6) {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uHeat: { value: 1 }, uScale: { value: scale } },
      vertexShader: `${NOISE3}
        uniform float uTime; varying vec3 vPos; varying vec3 vNormal; varying vec3 vView;
        void main(){
          vPos = position;
          float d = (fbm3(position * 2.2 + uTime * 0.04) - 0.5) * 0.12;
          vec4 mv = modelViewMatrix * vec4(position + normal * d, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `${NOISE3}
        uniform float uTime; uniform float uHeat; uniform float uScale;
        varying vec3 vPos; varying vec3 vNormal; varying vec3 vView;
        void main(){
          vec3 p = vPos * uScale;
          float n = fbm3(p + vec3(0.0, uTime * 0.1, 0.0));
          float n2 = fbm3(p * 2.4 - uTime * 0.07);
          float seam = 1.0 - smoothstep(0.0, 0.045 + 0.035 * n2, abs(n - 0.5));
          float pores = smoothstep(0.62, 0.8, n2) * 0.35;
          float pulse = 0.8 + 0.2 * sin(uTime * 1.6 + n * 7.0);
          vec3 crust = mix(vec3(0.035, 0.02, 0.016), vec3(0.13, 0.055, 0.03), n2);
          vec3 hot = mix(vec3(1.0, 0.3, 0.05), vec3(1.0, 0.85, 0.55), seam * n2 * 1.4);
          float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.6);
          vec3 col = crust + hot * (seam + pores) * pulse * uHeat * 1.7 + vec3(1.0, 0.38, 0.08) * fres * 0.55 * uHeat;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
  }

  /* Soft glow decal (for light pooling on surfaces) */
  function glowTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, "rgba(255,150,80,1)");
    grd.addColorStop(0.35, "rgba(255,90,31,0.45)");
    grd.addColorStop(1, "rgba(255,90,31,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }
  const GLOW = glowTexture();
  function glowDisc(size, opacity) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: GLOW, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2;
    return m;
  }

  /* ---------------------------------------------------------------- Sparks */
  function sparks(count, opts) {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = Math.sin(a) * r;
      seed[i * 3] = Math.random(); seed[i * 3 + 1] = Math.random(); seed[i * 3 + 2] = Math.random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uIntensity: { value: opts.intensity ?? 1 }, uPR: { value: PR },
        uSpread: { value: new THREE.Vector3(opts.spread[0], 0, opts.spread[1]) }, uHeight: { value: opts.height }, uSpeed: { value: opts.speed ?? 1 },
        uSize: { value: opts.size ?? 1 },
      },
      vertexShader: `
        attribute vec3 aSeed;
        uniform float uTime; uniform float uIntensity; uniform float uPR; uniform vec3 uSpread; uniform float uHeight; uniform float uSpeed; uniform float uSize;
        varying float vA; varying float vHot;
        void main(){
          float life = fract(aSeed.x + uTime * (0.04 + aSeed.y * 0.09) * uSpeed);
          vec3 p = vec3(position.x * uSpread.x, 0.0, position.z * uSpread.z);
          p.y += life * uHeight * (0.6 + aSeed.z * 0.6);
          p.x += sin(life * 7.0 + aSeed.x * 30.0) * 0.18 * life + position.x * life * 0.5;
          p.z += cos(life * 5.0 + aSeed.y * 30.0) * 0.15 * life;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * (1.0 + aSeed.z * 2.4) * uPR * (7.0 / -mv.z) * (1.0 - life * 0.55);
          vA = uIntensity * smoothstep(0.0, 0.06, life) * (1.0 - smoothstep(0.5, 1.0, life)) * (0.75 + 0.25 * sin(uTime * 9.0 + aSeed.x * 60.0));
          vHot = 1.0 - life;
        }`,
      fragmentShader: `
        varying float vA; varying float vHot;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float core = pow(1.0 - smoothstep(0.0, 0.5, d), 2.4);
          vec3 col = mix(vec3(1.0, 0.32, 0.07), vec3(1.0, 0.86, 0.6), vHot * vHot);
          gl_FragColor = vec4(col * 1.4, core * vA);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    pts.renderOrder = 5;
    return pts;
  }

  /* ---------------------------------------------------------------- Geometry helpers */
  const V2 = (x, y) => new THREE.Vector2(x, y);
  function lathe(points, mat, segments = 128) {
    const geo = new THREE.LatheGeometry(points, segments);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    return mesh;
  }
  function smoothProfile(points, steps = 6) {
    // Catmull-Rom through the given points so silhouettes stay smooth
    const curve = new THREE.SplineCurve(points);
    return curve.getPoints(points.length * steps);
  }

  function makePlate(mat = M.bone) {
    const p = smoothProfile([V2(0.001, 0.035), V2(0.95, 0.035), V2(1.22, 0.06), V2(1.46, 0.12), V2(1.72, 0.18), V2(1.9, 0.205), V2(1.96, 0.19), V2(1.92, 0.165), V2(1.7, 0.135), V2(1.38, 0.07), V2(1.08, 0.02), V2(1.02, -0.02), V2(0.001, -0.02)], 5);
    return lathe(p, mat);
  }
  function makeCloche() {
    const g = new THREE.Group();
    const pts = [V2(1.66, 0.0), V2(1.665, 0.06), V2(1.63, 0.11)];
    for (let i = 0; i <= 32; i++) {
      const t = (i / 32) * (Math.PI / 2);
      pts.push(V2(Math.max(0.001, 1.6 * Math.cos(t)), 0.11 + 1.28 * Math.sin(t)));
    }
    const dome = lathe(pts, M.copper);
    dome.material.side = THREE.DoubleSide;
    g.add(dome);
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.655, 0.03, 24, 160), M.copperDark);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.035;
    g.add(band);
    const knob = lathe(smoothProfile([V2(0.001, 1.39), V2(0.13, 1.39), V2(0.075, 1.45), V2(0.062, 1.52), V2(0.15, 1.6), V2(0.175, 1.67), V2(0.13, 1.74), V2(0.001, 1.765)], 6), M.copperDark, 64);
    g.add(knob);
    return g;
  }
  function makeEmberDish() {
    const g = new THREE.Group();
    const mats = [];
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 24), emberMaterial(2.4));
    core.scale.set(1.05, 0.72, 1);
    core.position.y = 0.33;
    mats.push(core.material);
    g.add(core);
    const spots = [[0.78, 0.12, 0.2, 0.12], [-0.7, 0.1, 0.35, 0.1], [0.2, 0.1, -0.78, 0.11], [-0.35, 0.09, -0.6, 0.08], [0.55, 0.09, 0.62, 0.09]];
    spots.forEach(([x, y, z, r]) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 8), emberMaterial(5));
      m.position.set(x, y, z);
      m.scale.y = 0.7;
      mats.push(m.material);
      g.add(m);
    });
    const pool = glowDisc(3.2, 0.0);
    pool.position.y = 0.045;
    g.add(pool);
    return { group: g, mats, pool };
  }
  function makeGlass() {
    const g = new THREE.Group();
    const outer = smoothProfile([V2(0.001, 0.0), V2(0.52, 0.0), V2(0.54, 0.02), V2(0.2, 0.05), V2(0.055, 0.12), V2(0.045, 0.6), V2(0.05, 1.0), V2(0.16, 1.1), V2(0.42, 1.32), V2(0.52, 1.6), V2(0.5, 1.9), V2(0.44, 2.12)], 6);
    g.add(lathe(outer, M.glass, 96));
    const wine = smoothProfile([V2(0.001, 1.06), V2(0.14, 1.1), V2(0.38, 1.3), V2(0.47, 1.5), V2(0.48, 1.56), V2(0.001, 1.56)], 4);
    const w = lathe(wine, M.wine, 96);
    g.add(w);
    return g;
  }
  function labelTexture(text) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 160;
    const g = c.getContext("2d");
    g.fillStyle = "#efe7dc"; g.fillRect(0, 0, 512, 160);
    g.fillStyle = "#ff5a1f"; g.fillRect(0, 0, 10, 160);
    g.fillStyle = "#14100e";
    g.font = '900 64px Anybody, "Arial Black", sans-serif';
    if ("fontStretch" in g) g.fontStretch = "extra-expanded";
    g.fillText("BAYK", 36, 78);
    if ("fontStretch" in g) g.fontStretch = "normal";
    g.font = '500 26px "Geist Mono", ui-monospace, monospace';
    g.fillStyle = "#6b625b";
    g.fillText(text, 38, 126);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  function makeContainer(labelTex) {
    const g = new THREE.Group();
    const RB = THREE.RoundedBoxGeometry;
    const baseGeo = RB ? new RB(1.5, 0.42, 1.05, 5, 0.09) : new THREE.BoxGeometry(1.5, 0.42, 1.05);
    const base = new THREE.Mesh(baseGeo, M.stoneware);
    g.add(base);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.72), new THREE.MeshBasicMaterial({ map: GLOW, color: 0xff8a40, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.2;
    g.add(glow);
    const lidGeo = RB ? new RB(1.54, 0.07, 1.09, 4, 0.03) : new THREE.BoxGeometry(1.54, 0.07, 1.09);
    const lid = new THREE.Mesh(lidGeo, M.lid);
    lid.position.y = 0.245;
    lid.renderOrder = 2;
    g.add(lid);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.194), new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.6, metalness: 0 }));
    label.position.set(-0.32, 0.0, 0.527);
    g.add(label);
    return g;
  }
  function makePan() {
    const g = new THREE.Group();
    const prof = smoothProfile([V2(0.001, 0.0), V2(1.12, 0.0), V2(1.3, 0.03), V2(1.4, 0.12), V2(1.48, 0.3), V2(1.53, 0.335), V2(1.49, 0.345), V2(1.42, 0.19), V2(1.33, 0.09), V2(1.16, 0.06), V2(0.001, 0.06)], 6);
    const body = lathe(prof, M.iron);
    g.add(body);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.095, 1.7, 32), M.iron);
    handle.rotation.z = Math.PI / 2 - 0.12;
    handle.position.set(2.32, 0.37, 0);
    g.add(handle);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.035, 16, 48), M.iron);
    ring.position.set(3.2, 0.48, 0);
    ring.rotation.y = Math.PI / 2;
    g.add(ring);
    return g;
  }
  function flameMaterial(seed) {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uPower: { value: 1 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `
        varying vec2 vUv; uniform float uTime; uniform float uSeed; uniform float uPower;
        void main(){
          float y = vUv.y;
          float flick = sin(uTime * 13.0 + uSeed * 9.0) * 0.05 + sin(uTime * 7.3 + uSeed * 3.0) * 0.04;
          float x = (vUv.x - 0.5) * 2.0 + flick * y * y;
          float w = (1.0 - y) * (0.35 + 0.65 * sin(min(y * 2.2, 1.0) * 1.5708));
          float shape = 1.0 - smoothstep(w * 0.45, w, abs(x));
          shape *= smoothstep(0.0, 0.06, y) * (1.0 - smoothstep(0.7 + flick, 1.0, y));
          float coreLine = 1.0 - smoothstep(0.0, w * 0.35, abs(x));
          vec3 blue = vec3(0.18, 0.38, 1.0);
          vec3 tip = vec3(1.0, 0.55, 0.2);
          vec3 col = mix(blue, tip, smoothstep(0.35, 0.85, y)) + vec3(0.6, 0.75, 1.0) * coreLine * (1.0 - y) * 0.35;
          gl_FragColor = vec4(col * uPower, shape * uPower);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
  }

  /* ---------------------------------------------------------------- Build the scene for this page */
  const rig = new THREE.Group();
  scene.add(rig);
  const turn = new THREE.Group();
  rig.add(turn);
  turn.add(emberLight);
  const emberMats = [];
  const flameMeshes = [];
  const updaters = [];
  const pickables = [];
  let ambientSparks = null;
  let localSparks = null;
  let focus = { x: 0.5, y: 0.45 };
  let layout = () => ({ x: 0, y: 0, camZ: 9, camY: 2.2, lookY: 0.6, scale: 1 });

  ambientSparks = sparks(isSmall() ? 260 : 560, { spread: [9, 6], height: 9, speed: 0.55, size: 0.9, intensity: 0.75 });
  ambientSparks.position.set(0, -3.2, -2.5);
  scene.add(ambientSparks);

  if (kind === "home") {
    const plate = makePlate();
    turn.add(plate);
    const dish = makeEmberDish();
    turn.add(dish.group);
    emberMats.push(...dish.mats);
    const cloche = makeCloche();
    cloche.position.y = 0.16;
    turn.add(cloche);
    pickables.push(...cloche.children);
    localSparks = sparks(isSmall() ? 140 : 240, { spread: [0.55, 0.55], height: 3.6, speed: 1.2, size: 1, intensity: 0 });
    localSparks.position.y = 0.4;
    turn.add(localSparks);
    emberLight.position.set(0, 0.7, 0);
    let hoverLift = 0;
    updaters.push((t) => {
      const r = ease(clamp(S.reveal / 0.8, 0, 1));
      hoverLift = lerp(hoverLift, S.hoverObject && r < 0.05 ? 0.14 : 0, 0.1);
      cloche.position.set(r * 1.4, 0.16 + r * 2.9 + hoverLift + Math.sin(t * 1.3) * 0.012 * (1 - r), -r * 0.6);
      cloche.rotation.set(-r * 0.55, 0, -r * 0.42);
      const heat = 0.25 + r * 0.95 + hoverLift * 2;
      emberMats.forEach((m) => (m.uniforms.uHeat.value = heat));
      emberLight.intensity = 0.25 + r * 2.0 + hoverLift * 3;
      dish.pool.material.opacity = 0.04 + r * 0.22;
      localSparks.material.uniforms.uIntensity.value = r;
    });
    layout = () => (isSmall()
      ? { x: 0, y: 0.25, camZ: 17.5, camY: 4.2, lookY: -1.1, scale: 1 }
      : { x: 2.2, y: 0, camZ: 9.6 - ease(clamp(S.reveal / 0.8, 0, 1)) * 1.2, camY: 2.6 - ease(clamp(S.reveal / 0.8, 0, 1)) * 0.5, lookY: 0.85, scale: 1 });
    focus = isSmall() ? { x: 0.5, y: 0.35 } : { x: 0.62, y: 0.55 };
    turn.add(contactShadow(5.2, 5.2, 0.9));
  } else if (kind === "weekly") {
    const tex = labelTexture(S.deliveryShort ? `DELIVERY ${S.deliveryShort}` : "WEEKLY MENU");
    const boxes = [];
    for (let i = 0; i < 15; i++) {
      const c = makeContainer(tex);
      c.userData = { y: 0, on: false, s: 0.001, delay: 0, jitter: (Math.random() - 0.5) * 0.06, rot: (Math.random() - 0.5) * 0.07 };
      c.scale.setScalar(0.001);
      turn.add(c);
      boxes.push(c);
    }
    let count = 0;
    let changedAt = 0;
    const setCount = (n) => {
      if (n === count) return;
      count = n;
      changedAt = performance.now();
    };
    setCount((S.plan && S.plan.meals) || 10);
    window.addEventListener("bayk:plan", (e) => setCount(e.detail.meals));
    emberLight.position.set(0, 3.2, 2.5);
    emberLight.intensity = 0.9;
    turn.add(contactShadow(4.4, 5.4, 0.85));
    updaters.push(() => {
      const cols = Math.ceil(count / 5);
      const since = (performance.now() - changedAt) / 1000;
      boxes.forEach((b, i) => {
        const on = i < count;
        const col = Math.floor(i / 5);
        const row = i % 5;
        const d = b.userData;
        const ready = reduce || since > (on ? i * 0.045 : (14 - i) * 0.02);
        const off = col - (cols - 1) / 2;
        const tx = off * 1.05 + d.jitter;
        const tz = -off * 1.35;
        const ty = row * 0.505 + 0.21;
        const target = on && ready ? 1 : 0.001;
        d.s = lerp(d.s, target, reduce ? 1 : 0.14);
        const drop = (1 - d.s) * 2.4;
        b.position.set(on ? tx : b.position.x, ty + drop, on ? tz : b.position.z);
        b.rotation.y = d.rot;
        b.scale.setScalar(Math.max(0.001, d.s));
        b.visible = d.s > 0.01;
      });
    });
    layout = () => (isSmall()
      ? { x: 0, y: 1.2, camZ: 18, camY: 5.8, lookY: -0.4, scale: 0.72 }
      : { x: 6, y: -0.3, camZ: 14, camY: 4.6, lookY: 1.2, scale: 0.92 });
    focus = isSmall() ? { x: 0.5, y: 0.72 } : { x: 0.7, y: 0.5 };
  } else if (kind === "private") {
    const plate = makePlate();
    turn.add(plate);
    const dish = makeEmberDish();
    turn.add(dish.group);
    emberMats.push(...dish.mats);
    const cloche = makeCloche();
    turn.add(cloche);
    const glass = makeGlass();
    glass.position.set(2.7, 0, 0.4);
    turn.add(contactShadow(5.2, 5.2, 0.9));
    const gs = contactShadow(1.6, 1.6, 0.7);
    gs.position.set(2.7, 0.002, 0.4);
    turn.add(gs);
    turn.add(glass);
    emberLight.position.set(0, 0.7, 0);
    updaters.push((t) => {
      const lift = 0.35 + Math.sin(t * 0.9) * 0.06;
      cloche.position.set(0, 0.16 + lift, 0);
      cloche.rotation.z = Math.sin(t * 0.6) * 0.03;
      emberMats.forEach((m) => (m.uniforms.uHeat.value = 0.75));
      emberLight.intensity = 1.1;
      dish.pool.material.opacity = 0.12;
    });
    layout = () => (isSmall()
      ? { x: 0.3, y: 0.2, camZ: 15, camY: 4, lookY: -0.8, scale: 0.9 }
      : { x: 4.4, y: 0, camZ: 12, camY: 3.2, lookY: 1, scale: 1 });
    focus = isSmall() ? { x: 0.5, y: 0.75 } : { x: 0.7, y: 0.5 };
  } else if (kind === "kitchen") {
    const pan = makePan();
    pan.position.y = 0.55;
    turn.add(pan);
    const sear = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 20), emberMaterial(3.2));
    sear.scale.set(1.5, 0.28, 1.2);
    sear.position.set(0, 0.67, 0);
    emberMats.push(sear.material);
    turn.add(sear);
    const burner = lathe(smoothProfile([V2(0.001, 0.0), V2(0.75, 0.0), V2(0.78, 0.08), V2(0.7, 0.14), V2(0.45, 0.16), V2(0.001, 0.16)], 4), M.iron, 64);
    burner.position.y = -0.45;
    turn.add(burner);
    const bs = contactShadow(2.6, 2.6, 0.85);
    bs.position.y = -0.448;
    turn.add(bs);
    const tongues = 18;
    for (let i = 0; i < tongues; i++) {
      const a = (i / tongues) * Math.PI * 2;
      const mat = flameMaterial(i * 1.7);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.62), mat);
      f.position.set(Math.cos(a) * 0.6, -0.12, Math.sin(a) * 0.6);
      f.userData.mat = mat;
      turn.add(f);
      flameMeshes.push(f);
    }
    const under = glowDisc(2.4, 0.28);
    under.position.y = 0.52;
    under.rotation.x = Math.PI / 2;
    turn.add(under);
    localSparks = sparks(isSmall() ? 70 : 140, { spread: [0.9, 0.9], height: 3.2, speed: 0.9, size: 0.9, intensity: 0.8 });
    localSparks.position.y = 0.75;
    turn.add(localSparks);
    emberLight.color.set(0x6f8cff);
    emberLight.position.set(0, -0.1, 0);
    emberLight.intensity = 1.6;
    emberLight.distance = 4;
    updaters.push((t) => {
      emberMats.forEach((m) => (m.uniforms.uHeat.value = 0.7));
      emberLight.intensity = 1.5 + Math.sin(t * 17) * 0.15;
    });
    layout = () => (isSmall()
      ? { x: -0.3, y: 0.4, camZ: 15, camY: 4.2, lookY: -0.6, scale: 0.85 }
      : { x: 4.4, y: 0, camZ: 12, camY: 3.6, lookY: 0.7, scale: 1 });
    focus = isSmall() ? { x: 0.5, y: 0.75 } : { x: 0.7, y: 0.52 };
  } else {
    if (document.body.dataset.core !== undefined) {
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 32), emberMaterial(1.8));
      core.position.y = 1.2;
      emberMats.push(core.material);
      turn.add(core);
      const pool = glowDisc(4.5, 0.35);
      pool.position.y = 0.01;
      turn.add(pool);
      localSparks = sparks(isSmall() ? 80 : 160, { spread: [0.8, 0.8], height: 3, speed: 0.8, intensity: 0.8 });
      localSparks.position.y = 1.2;
      turn.add(localSparks);
      emberLight.position.set(0, 1.2, 0);
      emberLight.intensity = 1.8;
      updaters.push((t) => {
        core.rotation.y = t * 0.15;
        core.position.y = 1.2 + Math.sin(t * 0.8) * 0.08;
        emberMats.forEach((m) => (m.uniforms.uHeat.value = 0.85));
      });
      layout = () => (isSmall()
        ? { x: 0, y: 0.6, camZ: 14, camY: 3.4, lookY: -1.2, scale: 0.8 }
        : { x: 5, y: -0.3, camZ: 12, camY: 2.6, lookY: 1, scale: 1 });
      focus = isSmall() ? { x: 0.5, y: 0.75 } : { x: 0.74, y: 0.5 };
    } else {
      layout = () => ({ x: 0, y: 0, camZ: 10, camY: 2, lookY: 0.5, scale: 1 });
      focus = { x: 0.5, y: 0.2 };
    }
  }

  /* ---------------------------------------------------------------- Post-processing: bloom */
  let composer = null;
  function buildComposer() {
    if (!(THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass && THREE.ShaderPass && THREE.CopyShader)) return null;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const RT = renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget ? THREE.WebGLMultisampleRenderTarget : THREE.WebGLRenderTarget;
    const rt = new RT(size.x, size.y, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, encoding: THREE.sRGBEncoding });
    const c = new THREE.EffectComposer(renderer, rt);
    c.setPixelRatio(PR);
    c.setSize(window.innerWidth, window.innerHeight);
    c.addPass(new THREE.RenderPass(scene, camera));
    const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), isSmall() ? 0.5 : 0.62, 0.45, 0.9);
    c.addPass(bloom);
    c.addPass(new THREE.ShaderPass(THREE.CopyShader));
    return c;
  }
  try { composer = buildComposer(); } catch (_) { composer = null; }

  /* ---------------------------------------------------------------- Interaction state */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let spin = 0;
  let spinVel = 0;
  let tiltX = 0;
  let tiltY = 0;
  let intro = reduce ? 1 : 0;
  let introStart = 0;
  window.addEventListener("bayk:intro", () => { introStart = performance.now(); });
  window.addEventListener("click", (e) => {
    if (kind === "home" && S.hoverObject && e.target.closest("[data-drag]")) window.dispatchEvent(new Event("bayk:lift"));
  });

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    smokeMat.uniforms.uRes.value.set(w, h);
    if (composer) composer.setSize(w, h);
  }
  let resizeTimer = 0;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); });

  /* How far the hero has scrolled away: the piece lifts out of frame once its section is done */
  const holdEl = document.querySelector(document.body.dataset.hold || ".page-hero, [data-reveal-stage]");
  function exitProgress() {
    if (!holdEl) return 0;
    const r = holdEl.getBoundingClientRect();
    return clamp((window.innerHeight * 0.85 - r.bottom) / window.innerHeight, 0, 1.4);
  }

  /* ---------------------------------------------------------------- Render loop */
  let first = true;
  const clock = new THREE.Clock();
  const lookAt = new THREE.Vector3();
  function render() {
    requestAnimationFrame(render);
    if (document.hidden) return;
    const t = clock.getElapsedTime();
    const L = layout();

    if (introStart) intro = Math.min(1, intro + (reduce ? 1 : 0.012));
    const ie = ease(intro);

    // Pointer: gentle parallax, drag to spin
    const nx = S.pointer.x / window.innerWidth - 0.5;
    const ny = S.pointer.y / window.innerHeight - 0.5;
    if (S.drag) { spinVel += (S.drag.dx || 0) * 0.0035; S.drag.dx = 0; S.drag.dy = 0; }
    spinVel *= 0.93;
    spin += spinVel + (reduce ? 0 : 0.0009);
    tiltY = lerp(tiltY, nx * 0.5, 0.04);
    tiltX = lerp(tiltX, ny * 0.12, 0.04);

    const exit = exitProgress();
    turn.rotation.set(tiltX, spin + tiltY - 0.5 + (1 - ie) * 1.2, 0);
    rig.position.set(L.x, L.y + (1 - ie) * -0.6 + exit * 5.5, 0);
    rig.scale.setScalar(L.scale * (0.92 + ie * 0.08));

    camera.position.set(nx * 0.35, L.camY - ny * 0.2, L.camZ);
    lookAt.set(L.x * 0.5, L.lookY, 0);
    camera.lookAt(lookAt);

    // Key light follows the piece so shadows stay soft and close
    key.position.set(L.x - 5, 9, 6);
    key.target.position.set(L.x, 0, 0);

    // Hover test for the home cloche
    if (pickables.length && performance.now() - S.pointer.last < 3000) {
      ndc.set((S.pointer.x / window.innerWidth) * 2 - 1, -(S.pointer.y / window.innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      S.hoverObject = raycaster.intersectObjects(pickables, true).length > 0;
    } else if (pickables.length) {
      S.hoverObject = false;
    }

    updaters.forEach((u) => u(t));
    emberMats.forEach((m) => (m.uniforms.uTime.value = t));
    flameMeshes.forEach((f) => { f.userData.mat.uniforms.uTime.value = t; f.lookAt(camera.position.x, f.getWorldPosition(lookAt).y, camera.position.z); });
    if (ambientSparks) { ambientSparks.material.uniforms.uTime.value = t; ambientSparks.material.uniforms.uIntensity.value = 0.75 * ie; }
    if (localSparks) localSparks.material.uniforms.uTime.value = t;

    smokeMat.uniforms.uTime.value = t;
    smokeMat.uniforms.uScroll.value = (S.scrollY || 0) / window.innerHeight * 0.1;
    smokeMat.uniforms.uMouse.value.set(nx + 0.5, 0.5 - ny);
    smokeMat.uniforms.uFocus.value.set(focus.x, 1 - focus.y + exit * 0.3);
    smokeMat.uniforms.uWarm.value = 0.6 + 0.4 * ie;

    if (composer) composer.render(); else renderer.render(scene, camera);
    if (first) { first = false; announce(); }
  }
  render();
})();
