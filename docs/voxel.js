/* Spooktacular Voxel Worlds — Minecraft-style digging (raw WebGL, zero deps).
 * Forest (day, trees, shallow ores) + Deep Mine (caverns, rich ores, lava).
 * Same profile economy as the other games (gold/coal/XP/picks via tabs). */
(function () {
  'use strict';
  var S = window.Spooky;
  var WALL = { forest: 0, mine: 1 };

  var VOX = {};
  S.ORES.forEach(function (o) { VOX[o.key] = o; });
  VOX.grass = { key: 'grass', name: 'Grass', emoji: '🟩', color: '#4da63c', hp: 1, gold: 0, xp: 0, tier: 0, portalTarget: null, gravity: 1.0 };
  VOX.wood = { key: 'wood', name: 'Wood', emoji: '🪵', color: '#7a5230', hp: 2, gold: 1, xp: 2, tier: 0, portalTarget: null, gravity: 1.0 };
  VOX.leaves = { key: 'leaves', name: 'Leaves', emoji: '🌿', color: '#2e7d32', hp: 1, gold: 0, xp: 0, tier: 0, portalTarget: null, gravity: 1.0 };
  VOX.bedrock = { key: 'bedrock', name: 'Bedrock', emoji: '⬛', color: '#1a1a1e', hp: 1e9, gold: 0, xp: 0, tier: 99, portalTarget: null, gravity: 0.0 };
  VOX.lava = { key: 'lava', name: 'Lava', emoji: '🔥', color: '#ff6a00', hp: 1e9, gold: 0, xp: 0, tier: 99, emis: 1, portalTarget: 1, gravity: 2.5 };
  VOX.torchcube = { key: 'torchcube', name: 'Torch', emoji: '🔥', color: '#ffB545', hp: 1e9, gold: 0, xp: 0, tier: 99, emis: 1, portalTarget: null, gravity: 1.0 };
  VOX.snow = { key: 'snow', name: 'Snow', emoji: '⬜', color: '#e8eef7', hp: 1, gold: 0, xp: 0, tier: 0 };
  VOX.ice = { key: 'ice', name: 'Ice', emoji: '🧊', color: '#9fd8ff', hp: 2, gold: 0, xp: 1, tier: 0 };
  VOX.vine = { key: 'vine', name: 'Vine', emoji: '🌿', color: '#3f9142', hp: 1, gold: 0, xp: 0, tier: 0, leafy: true };
  VOX.glowcrystal = { key: 'glowcrystal', name: 'Glow Crystal', emoji: '🔮', color: '#c98fff', hp: 4, gold: 22, xp: 26, tier: 1, emis: 1 };

  /* Per-world physics + mood. Frost is slippery, Crystal is floaty. */
  var PHYS = [
    { name: 'Forest', grav: 22, jump: 7.6, grip: 1, day: true, fog: [0.53, 0.71, 0.88], fogR: [20, 70] },
    { name: 'Deep Mine', grav: 22, jump: 7.6, grip: 1, day: false, fog: [0.02, 0.01, 0.04], fogR: [6, 30] },
    { name: 'Frost Depths', grav: 22, jump: 7.6, grip: 0.14, day: true, fog: [0.75, 0.83, 0.92], fogR: [18, 60] },
    { name: 'Crystal Caverns', grav: 9, jump: 7.0, grip: 1, day: false, fog: [0.09, 0.03, 0.16], fogR: [8, 34] }
  ];
  /* Portal ring: each world gates forward/back through all four worlds. */
  function portalTargets(w) { return [(w + 1) % 4, (w + 3) % 4]; }

  var canvas = document.getElementById('gamev');
  var gl = canvas.getContext('webgl', { antialias: true }) || canvas.getContext('experimental-webgl');
  if (!gl) {
    document.getElementById('overlay-title').textContent = 'No WebGL';
    document.getElementById('overlay-text').textContent = 'Your browser could not create a WebGL context, so the voxel world cannot render. Try Chrome/Firefox with hardware acceleration enabled, or visit https://get.webgl.org to test.';
    var noGlBtnV = document.getElementById('overlay-btn');
    if (noGlBtnV) { noGlBtnV.textContent = 'Reload'; noGlBtnV.onclick = function () { window.location.reload(); }; }
    document.getElementById('overlay').classList.remove('hidden');
    return;
  }

  function shader(t, src) {
    var s = gl.createShader(t);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER,
    'precision mediump float;' +
    'attribute vec3 aPos; attribute vec3 aCol; attribute vec3 aNormal; attribute vec2 aTex;' +
    'uniform mat4 uMVP; uniform mat4 uMV; uniform mat3 uNM;' +
    'uniform vec3 uLightDir;' +
    'varying vec3 vC; varying vec3 vN; varying vec2 vTex; varying float vD;' +
    'void main(){ vec4 mv = uMV * vec4(aPos,1.0); gl_Position = uMVP * vec4(aPos,1.0); vC = aCol; vN = uNM * aNormal; vTex = aTex; vD = -mv.z; }'));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER,
    'precision mediump float; varying vec3 vC; varying vec3 vN; varying vec2 vTex; varying float vD;' +
    'uniform sampler2D uAlbedo;' +
    'uniform sampler2D uNormalMap;' +
    'uniform sampler2D uRoughnessMap;' +
    'uniform sampler2D uMetalnessMap;' +
    'uniform vec3 uFog; uniform vec2 uFogR; uniform float uAlpha;' +
    'uniform vec3 uLightDir; uniform vec3 uLightColor; uniform vec3 uAmbientColor;' +
    'uniform float uMetallic; uniform float uRoughness; uniform float uAO;' +
    'void main(){' +
    ' vec3 color = vC;' +
    ' float f = smoothstep(uFogR.x, uFogR.y, vD);' +
    ' gl_FragColor = vec4(mix(color, uFog, f), uAlpha); }'));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  /* ---- System 1: Advanced PBR shader (metallic/roughness, GGX, fresnel, clearcoat) ---- */
  var PBR = {
    grass: [0, 0.92, 0, 0], dirt: [0, 0.95, 0, 0], stone: [0.05, 0.8, 0, 0],
    wood: [0, 0.72, 0.18, 0], leaves: [0, 0.9, 0, 0], bedrock: [0.12, 0.95, 0, 0],
    lava: [0, 0.4, 0, 1.2], torchcube: [0, 0.5, 0, 1.5], snow: [0, 0.55, 0.4, 0],
    ice: [0.18, 0.12, 0.65, 0], vine: [0, 0.9, 0, 0], glowcrystal: [0.35, 0.22, 0.45, 1.0]
  };
  S.ORES.forEach(function (o) {
    if (!PBR[o.key]) PBR[o.key] = [o.tier >= 2 ? 0.55 : 0.12, Math.max(0.2, 0.6 - o.tier * 0.12), o.tier >= 3 ? 0.5 : 0, 0];
  });
  var progPBR = gl.createProgram();
  gl.attachShader(progPBR, shader(gl.VERTEX_SHADER,
    'precision mediump float;' +
    'attribute vec3 aPos; attribute vec3 aCol; attribute vec3 aSun; attribute vec4 aMat; attribute float aLamp; attribute vec3 aNrm;' +
    'uniform mat4 uMVP; uniform mat4 uMV; uniform float uTime; uniform float uSway;' +
    'varying vec3 vC; varying vec3 vS; varying float vD; varying vec4 vM; varying float vL; varying vec3 vN; varying vec3 vWp;' +
    'void main(){ vec3 p = aPos;' +
    ' p.x += sin(uTime * 1.4 + aPos.y * 0.8 + aPos.z * 0.6) * uSway;' +
    ' p.z += cos(uTime * 1.1 + aPos.x * 0.5 + aPos.y * 0.4) * uSway * 0.7;' +
    ' vec4 mv = uMV * vec4(p,1.0); gl_Position = uMVP * vec4(p,1.0);' +
    ' vC = aCol; vS = aSun; vD = -mv.z; vM = aMat; vL = aLamp; vN = aNrm; vWp = p; }'));
  gl.attachShader(progPBR, shader(gl.FRAGMENT_SHADER,
    'precision mediump float;' +
    'varying vec3 vC; varying vec3 vS; varying float vD; varying vec4 vM; varying float vL; varying vec3 vN; varying vec3 vWp;' +
    'uniform vec3 uFog; uniform vec2 uFogR; uniform float uAlpha; uniform vec3 uSun; uniform vec3 uSunDir; uniform vec3 uEye; uniform float uTime;' +
    'float D_GGX(float NoH, float rough){ float a = rough*rough; float a2 = a*a;' +
    ' float d = NoH*NoH*(a2-1.0)+1.0; return a2/(3.14159265*d*d); }' +
    'float V_Smith(float NoV, float NoL, float rough){ float k = (rough+1.0); k = k*k/8.0;' +
    ' return (NoV/(NoV*(1.0-k)+k))*(NoL/(NoL*(1.0-k)+k)); }' +
    'vec3 F_Schlick(vec3 f0, float VoH){ return f0 + (1.0-f0)*pow(1.0-VoH,5.0); }' +
    'void main(){' +
    ' vec3 N = normalize(vN); vec3 V = normalize(uEye - vWp); vec3 L = normalize(uSunDir);' +
    ' float NoL = max(dot(N,L),0.0); float NoV = max(dot(N,V),0.001);' +
    ' float metal = vM.x; float rough = max(vM.y,0.05); float coat = vM.z; float emis = vM.w;' +
    ' vec3 albedo = vC;' +
    ' vec3 f0 = mix(vec3(0.04), albedo, metal);' +
    ' float fl = 1.0 + 0.16*sin(uTime*11.0 + vWp.x*5.0 + vWp.z*7.0)*sin(uTime*7.3 + vWp.y*3.1);' +
    ' float lamp = vL * fl;' +
    ' vec3 lampCol = albedo * lamp * vec3(1.0,0.72,0.42) * 1.15;' +
    ' vec3 col = albedo * (1.0-metal) * (vS + lampCol + vec3(0.22,0.23,0.27));' +
    ' if (NoL > 0.001) {' +
    '  vec3 H = normalize(V+L);' +
    '  float NoH = max(dot(N,H),0.0); float VoH = max(dot(V,H),0.0);' +
    '  vec3 F = F_Schlick(f0, VoH);' +
    '  float D = D_GGX(NoH, rough);' +
    '  float Vis = V_Smith(NoV, NoL, rough);' +
    '  col += (D*Vis*F) * uSun * NoL * 2.2;' +
    '  if (coat > 0.001) {' +
    '   float Dc = D_GGX(NoH, 0.12);' +
    '   vec3 Fc = F_Schlick(vec3(0.04), VoH);' +
    '   col += Dc*Fc*coat * uSun * NoL * 1.6;' +
    '  }' +
    ' }' +
    ' col += albedo * emis * (0.85 + 0.15*sin(uTime*3.0 + vWp.x*2.0 + vWp.z));' +
    ' float f = smoothstep(uFogR.x, uFogR.y, vD);' +
    ' gl_FragColor = vec4(mix(col, uFog, f), uAlpha); }'));
  gl.linkProgram(progPBR);
  if (!gl.getProgramParameter(progPBR, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(progPBR));
  var U_PBR = {};
  ['uMVP', 'uMV', 'uFog', 'uFogR', 'uAlpha', 'uSun', 'uSunDir', 'uEye', 'uTime', 'uSway'].forEach(function (n) {
    U_PBR[n] = gl.getUniformLocation(progPBR, n);
  });

  function buf(data, size, name, program) {
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return { b: b, loc: gl.getAttribLocation(program || prog, name), size: size };
  }

  // ---------- meta (own profile, localStorage) ----------
  var G = null;
  function saveMeta() {
    try {
      localStorage.setItem('spooky_voxel', JSON.stringify({ m: G.meta, world: G.world, seed: G.seed }));
    } catch (e) {}
  }
  function loadMeta() {
    try {
      var s = JSON.parse(localStorage.getItem('spooky_voxel'));
      if (s && s.m) return s;
    } catch (e) {}
    return null;
  }
  function newGame(world, seed) {
    var old = loadMeta();
    G = {
      world: world === undefined ? (old ? old.world : 0) : world,
      seed: seed === undefined ? (old ? old.seed : 20261031) : seed,
      score: 0, tab: 0, time: 0, broken: 0,
      meta: (old && world === undefined) ? old.m : { gold: 0, coal: 0, level: 1, xp: 0, pickIdx: 0, ach: {} },
      pack: 0, packCap: 50, sellValue: 0,
      px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0, vxh: 0, vzh: 0, yaw: 0, pitch: 0, onGround: false,
      blocks: {}, torches: [], W: 0, H: 0, D: 0,
      dmg: {}, chunks: null, glow: null, state: 'title',
      third: false, swingT: 1, parts: [], dayT: 0.12,
      mobs: [], mobT: 5, kills: 0, apples: 0, wood: 0,
      torchesInv: 4, fallPeak: null, stats: null,
      gates: [], gateHinted: {}, gateCD: 0,
      portals: [], portalNet: loadPortalNet(), portalCD: 0,
      weather: null, weatherT: 0, bloodT: 0, bloodTotal: 0, fogT: 0, moteT: 0
    };
    genWorld();
    buildAll();
    if (meta().hp === undefined) { meta().hp = 100; meta().maxHp = 100; }
    if (meta().wood === undefined) meta().wood = 0;
    if (meta().apples === undefined) meta().apples = 0;
    if (meta().torchesInv === undefined) meta().torchesInv = 4;
    if (meta().diff === undefined) meta().diff = 1;
    if (meta().skinIdx === undefined) meta().skinIdx = 0;
    if (!meta().skins) meta().skins = [0];
    if (!meta().stats) meta().stats = { coalRun: 0, kills: 0, torchesMade: 0, goldRun: 0, deep: 99, claimed: {} };
    renderHUD();
  }
  function meta() { return G.meta; }
  function ach(id, name) {
    if (!meta().ach[id]) { meta().ach[id] = name; flash('🏆 ' + name, 3); }
    saveMeta();
  }
  function gainXP(n) {
    var m = meta();
    m.xp += n;
    while (m.xp >= S.xpNext(m.level)) {
      m.xp -= S.xpNext(m.level); m.level++;
      m.gold += 25; G.score += 100;
      AudioSys.level();
      flash('⬆️ Level ' + m.level + '! +25 gold', 2.2);
      if (m.level >= 5) ach('level-5', 'Living Myth');
    }
    saveMeta(); renderHUD();
  }

  // ---------- world gen ----------
  function K(x, y, z) { return x + ',' + y + ',' + z; }
  function get(x, y, z) {
    if (x < 0 || z < 0 || y < 0 || x >= G.W || z >= G.D || y >= G.H) return 'bedrock';
    return G.blocks[K(x, y, z)] || null;
  }
  function solidAt(x, y, z) { return get(x, y, z) !== null; }

  function pickOre(rng, table) {
    var tot = 0, i;
    for (i = 0; i < table.length; i++) tot += table[i].w;
    var r = rng.nextDouble() * tot;
    for (i = 0; i < table.length; i++) { r -= table[i].w; if (r <= 0) return table[i]; }
    return table[0];
  }
  /* Random-walk worm tunnel: carves a winding 2-wide passage, like the
   * intersecting mine tunnels. Runs inside the given box. */
  function carveWorm(rng, x0, y0, z0, steps, r) {
    var x = x0, y = y0, z = z0, dx = 1, dz = 0, dy = 0;
    for (var s = 0; s < steps; s++) {
      for (var ix = -r; ix <= r; ix++) for (var iy = 0; iy <= 2; iy++) for (var iz = -r; iz <= r; iz++) {
        var cx = Math.round(x) + ix, cy = Math.round(y) + iy, cz = Math.round(z) + iz;
        if (cx > 0 && cz > 0 && cy > 0 && cx < G.W - 1 && cz < G.D - 1 && cy < G.H - 1)
          delete G.blocks[K(cx, cy, cz)];
      }
      if (rng.nextDouble() < 0.3) {
        // turn or tilt
        var t = rng.nextDouble();
        if (t < 0.4) { var tmp = dx; dx = -dz; dz = tmp; if (rng.nextDouble() < 0.5) { dx = -dx; dz = -dz; } dy = 0; }
        else if (t < 0.55) { dy = 1; }
        else if (t < 0.7) { dy = -1; }
      }
      x += dx; z += dz; y += dy * 0.5;
      if (x < 2 || z < 2 || x > G.W - 3 || z > G.D - 3) break;
      if (y < 1.5) { y = 1.5; dy = 0; }
      if (y > G.H - 3) { y = G.H - 3; dy = 0; }
    }
  }
  var BAND = {
    dirt: ['dirt', 'dirt', 'stone'],
    shallow: ['stone', 'stone', 'coal', 'coal', 'iron'],
    mid: ['stone', 'coal', 'iron', 'gold', 'lapis', 'emerald', 'crystal'],
    deep: ['stone', 'gold', 'emerald', 'ruby', 'diamond', 'opal', 'crystal', 'frost', 'glacier']
  };
  // note: only keys present in S.ORES are rolled here

  function groundY(x, z) {
    for (var y = Math.min(G.H - 1, 20); y >= 0; y--) {
      if (G.blocks[K(Math.floor(x), y, Math.floor(z))]) return y + 1;
    }
    return 1;
  }
  var GATE_COLORS = [[1, 0.35, 0.9], [0.3, 0.9, 1], [0.55, 0.85, 1], [0.75, 0.45, 1]];
  /* Portal gates: two per world, stepping through travels the ring.
   * Coexists with (not replacing) any block-level portal experiments. */
  function buildGates() {
    G.gates = [];
    G.gateHinted = {};
    var cx = G.W / 2, cz = G.D / 2, tos = portalTargets(G.world), i;
    if (G.world === 0 || G.world === 2) {
      var spots = [[cx + 9, cz + 2], [cx - 9, cz - 2]];
      for (i = 0; i < 2; i++) {
        var gx = Math.max(2, Math.min(G.W - 3, Math.round(spots[i][0])));
        var gz = Math.max(2, Math.min(G.D - 3, Math.round(spots[i][1])));
        G.gates.push({ x: gx + 0.5, y: groundY(gx, gz), z: gz + 0.5, to: tos[i] });
      }
    } else {
      var hx = G.W >> 1, hz = G.D >> 1;
      G.gates.push({ x: hx - 1.5, y: 2, z: hz + 0.5, to: tos[0] });
      G.gates.push({ x: hx + 2.5, y: 2, z: hz + 0.5, to: tos[1] });
      if (G.world === 3) {
        var rng = new S.SeededRNG(G.seed + 555);
        for (i = 0; i < 10; i++) {
          G.torches.push({ x: 2 + rng.nextDouble() * (G.W - 4), y: 3 + rng.nextDouble() * 4, z: 2 + rng.nextDouble() * (G.D - 4) });
        }
      }
    }
  }
  function updateGates(dt) {
    if (G.gateCD > 0) { G.gateCD -= dt; return; }
    for (var i = 0; i < G.gates.length; i++) {
      var g = G.gates[i];
      var dx = G.px - g.x, dz = G.pz - g.z;
      if (dx * dx + dz * dz < 1.21 && Math.abs(G.py - g.y) < 2.2) {
        var key = G.world + '>' + g.to;
        if (!G.gateHinted[key]) {
          G.gateHinted[key] = true;
          flash('🌀 Portal to ' + PHYS[g.to].name + '!', 2);
        }
        if (dx * dx + dz * dz < 0.45) {
          switchWorld(g.to);
          G.gateCD = 1.5;
          return;
        }
      }
    }
  }

  /* ---- System 2: Complex portal network (typed portals, persistence, fast travel) ---- */
  var PORTAL_TYPES = [
    { key: 'ring', name: 'Ring Gate', col: [0.9, 0.4, 1.0], desc: 'Steps around the world ring' },
    { key: 'deep', name: 'Deep Shaft', col: [1.0, 0.45, 0.1], desc: 'Drops into the deepest dark' },
    { key: 'whisper', name: 'Whisper Gate', col: [0.35, 0.95, 1.0], desc: 'One-way trip — no return' },
    { key: 'blood', name: 'Blood Portal', col: [1.0, 0.15, 0.2], desc: 'Opens only under the blood moon' }
  ];
  function loadPortalNet() {
    try { return JSON.parse(localStorage.getItem('spooky_voxel_portals')) || { found: {}, edges: {}, uses: 0 }; }
    catch (e) { return { found: {}, edges: {}, uses: 0 }; }
  }
  function savePortalNet() {
    try { localStorage.setItem('spooky_voxel_portals', JSON.stringify(G.portalNet)); } catch (e) {}
  }
  function genPortals() {
    G.portals = [];
    var rng = new S.SeededRNG(G.seed + 31337 + G.world * 97);
    var i, x, z, y;
    function freeSpot() {
      for (var t = 0; t < 40; t++) {
        x = 2 + rng.nextInt(G.W - 4); z = 2 + rng.nextInt(G.D - 4);
        var gy = -1;
        for (y = Math.min(G.H - 2, 8); y >= 1; y--) { if (solidAt(x, y, z)) { gy = y + 1; break; } }
        if (gy >= 1 && !solidAt(x, gy, z) && !solidAt(x, gy + 1, z)) return { x: x, y: gy, z: z };
      }
      return null;
    }
    if (G.world === 1) {
      for (i = 0; i < 3; i++) {
        var s = freeSpot(); if (!s) continue;
        G.portals.push({ x: s.x + 0.5, y: s.y, z: s.z + 0.5, type: i === 0 ? 'deep' : (i === 1 ? 'whisper' : 'blood'), phase: rng.nextDouble() * 6 });
      }
    } else if (G.world === 0) {
      var s0 = freeSpot();
      if (s0) G.portals.push({ x: s0.x + 0.5, y: s0.y, z: s0.z + 0.5, type: 'whisper', phase: rng.nextDouble() * 6 });
    } else if (G.world === 3) {
      var s3 = freeSpot();
      if (s3) G.portals.push({ x: s3.x + 0.5, y: s3.y, z: s3.z + 0.5, type: 'blood', phase: rng.nextDouble() * 6 });
    }
  }
  function portalName(t) {
    for (var i = 0; i < PORTAL_TYPES.length; i++) if (PORTAL_TYPES[i].key === t) return PORTAL_TYPES[i].name;
    return 'Portal';
  }
  function portalActive(p) {
    if (p.type !== 'blood') return true;
    return bloodMoon() > 0;
  }
  function updatePortals(dt) {
    for (var i = 0; i < G.portals.length; i++) {
      var p = G.portals[i];
      p.phase += dt;
      if (Math.random() < dt * 6) {
        var a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * 0.4;
        var tc = [1, 0.5, 1];
        for (var j = 0; j < PORTAL_TYPES.length; j++) if (PORTAL_TYPES[j].key === p.type) tc = PORTAL_TYPES[j].col;
        G.parts.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.random() * 1.6, z: p.z + Math.sin(a) * r,
          vx: -Math.sin(a) * 0.4, vy: 0.5 + Math.random() * 0.5, vz: Math.cos(a) * 0.4,
          life: 0.8 + Math.random() * 0.6, col: tc, grav: -0.15, portal: true });
      }
      var dx = G.px - p.x, dz = G.pz - p.z;
      if (dx * dx + dz * dz < 1.44 && Math.abs(G.py - p.y) < 2.4 && portalActive(p)) {
        var pid = G.world + ':' + i;
        if (!G.portalNet.found[pid]) {
          G.portalNet.found[pid] = true;
          savePortalNet();
          flash('🌀 Discovered ' + portalName(p.type) + '!', 2.5);
          gainXP(20);
        }
        if (dx * dx + dz * dz < 0.4) usePortal(p);
      }
    }
  }
  function usePortal(p) {
    if (G.portalCD > 0) return;
    G.portalCD = 2;
    var dest;
    if (p.type === 'deep') dest = 1;
    else if (p.type === 'whisper') dest = (G.world + 2) % 4;
    else dest = (G.world + 1) % 4;
    var edge = G.world + '>' + dest;
    G.portalNet.edges[edge] = (G.portalNet.edges[edge] || 0) + 1;
    G.portalNet.uses++;
    meta().stats.portalsUsed = (meta().stats.portalsUsed || 0) + 1;
    savePortalNet();
    AudioSys.portal();
    switchWorld(dest);
    flash('🌀 ' + portalName(p.type) + ' → ' + PHYS[dest].name, 2.5);
    if (G.portalNet.uses >= 5) ach('portal-5', 'World Hopper');
    checkQuests('portal', 1);
  }
  function portalNetworkHTML() {
    var h = '<h2>🌀 Portal Network</h2><div class="pitem">Uses: ' + G.portalNet.uses + ' · Discovered: ' +
      Object.keys(G.portalNet.found).length + '</div><div class="pitem">Edges:</div>';
    for (var e in G.portalNet.edges) {
      var pr = e.split('>');
      h += '<div class="pitem"> ' + PHYS[+pr[0]].name + ' → ' + PHYS[+pr[1]].name + ' ×' + G.portalNet.edges[e] + '</div>';
    }
    return h;
  }

  function genWorld() {
    var rng = new S.SeededRNG(G.seed + G.world * 131071);
    var noise = S.makeNoise2D(G.seed + G.world * 977);
    G.blocks = {}; G.torches = [];
    if (G.world === 0) {
      G.W = 48; G.H = 12; G.D = 48; // tall enough for full tree crowns
      var hmap = [];
      for (var x = 0; x < G.W; x++) for (var z = 0; z < G.D; z++) {
        var h = 2 + Math.floor(noise(x * 0.08, z * 0.08) * 4);
        hmap[x * G.D + z] = h;
        for (var y = 0; y <= h; y++) {
          var key;
          if (y === h) key = 'grass';
          else if (y >= h - 2) key = BAND.dirt[rng.nextInt(BAND.dirt.length)];
          else {
            var t = pickOre(rng, S.ORES.filter(function (o) { return ['stone', 'coal', 'iron', 'gold'].indexOf(o.key) >= 0; }));
            key = t.key;
          }
          G.blocks[K(x, y, z)] = key;
        }
      }
      // trees
      var placed = 0, guard = 0;
      while (placed < 14 && guard++ < 200) {
        var tx = 4 + rng.nextInt(G.W - 8), tz = 4 + rng.nextInt(G.D - 8);
        if (Math.abs(tx - G.W / 2) < 5 && Math.abs(tz - G.D / 2) < 5) continue;
        var th = hmap[tx * G.D + tz];
        var i, j, k;
        for (i = 1; i <= 4; i++) G.blocks[K(tx, th + i, tz)] = 'wood';
        for (i = -2; i <= 2; i++) for (j = 0; j <= 1; j++) for (k = -2; k <= 2; k++) {
          if (Math.abs(i) + Math.abs(k) + j > 4) continue;
          var kk = K(tx + i, th + 4 + j, tz + k);
          if (!G.blocks[kk]) G.blocks[kk] = 'leaves';
        }
        G.blocks[K(tx, th + 6, tz)] = 'leaves';
        placed++;
      }
      var sh = hmap[(G.W / 2 | 0) * G.D + (G.D / 2 | 0)];
      G.px = G.W / 2 + 0.5; G.pz = G.D / 2 + 0.5; G.py = sh + 1.01;
      // shallow worm tunnels under the hills (coal-lined hideouts)
      for (var w = 0; w < 3; w++) {
        carveWorm(rng, 8 + rng.nextInt(G.W - 16), 1, 8 + rng.nextInt(G.D - 16), 22, 0);
      }
      // hanging vines under dense canopies
      for (var vx = 2; vx < G.W - 2; vx++) for (var vz = 2; vz < G.D - 2; vz++) {
        if (G.blocks[K(vx, 6, vz)] === 'leaves' && !G.blocks[K(vx, 5, vz)] && rng.nextDouble() < 0.25) {
          var vl = 1 + rng.nextInt(3);
          for (var vy = 0; vy < vl; vy++) {
            if (G.blocks[K(vx, 5 - vy, vz)]) break;
            G.blocks[K(vx, 5 - vy, vz)] = 'vine';
          }
        }
      }
    } else if (G.world === 2) {
      // Frost Depths: snowy surface, ice sheets, snow pines, slippery everywhere
      G.W = 48; G.H = 12; G.D = 48;
      var hmap2 = [];
      for (var fx = 0; fx < G.W; fx++) for (var fz = 0; fz < G.D; fz++) {
        var fh = 2 + Math.floor(noise(fx * 0.08, fz * 0.08) * 4);
        hmap2[fx * G.D + fz] = fh;
        var icy = noise(fx * 0.2 + 40, fz * 0.2) > 0.68;
        for (var fy = 0; fy <= fh; fy++) {
          var fkey;
          if (fy === fh) fkey = icy ? 'ice' : 'snow';
          else if (fy >= fh - 1) fkey = icy ? 'ice' : 'dirt';
          else if (fy >= fh - 2) fkey = 'dirt';
          else {
            var ft = pickOre(rng, S.ORES.filter(function (o) { return ['stone', 'coal', 'iron', 'gold', 'emerald', 'crystal'].indexOf(o.key) >= 0; }));
            fkey = ft.key;
          }
          G.blocks[K(fx, fy, fz)] = fkey;
        }
      }
      var fplaced = 0, fguard = 0;
      while (fplaced < 8 && fguard++ < 200) {
        var ftx = 4 + rng.nextInt(G.W - 8), ftz = 4 + rng.nextInt(G.D - 8);
        if (Math.abs(ftx - G.W / 2) < 5 && Math.abs(ftz - G.D / 2) < 5) continue;
        var fth = hmap2[ftx * G.D + ftz];
        var fi, fj, fk;
        for (fi = 1; fi <= 3; fi++) G.blocks[K(ftx, fth + fi, ftz)] = 'wood';
        for (fi = -2; fi <= 2; fi++) for (fj = 0; fj <= 1; fj++) for (fk = -2; fk <= 2; fk++) {
          if (Math.abs(fi) + Math.abs(fk) + fj > 3) continue;
          var fkk = K(ftx + fi, fth + 3 + fj, ftz + fk);
          if (!G.blocks[fkk]) G.blocks[fkk] = 'leaves';
        }
        fplaced++;
      }
      var fsh = hmap2[(G.W / 2 | 0) * G.D + (G.D / 2 | 0)];
      G.px = G.W / 2 + 0.5; G.pz = G.D / 2 + 0.5; G.py = fsh + 1.01;
    } else if (G.world === 1) {
      G.W = 36; G.H = 11; G.D = 36;
      for (var x2 = 0; x2 < G.W; x2++) for (var z2 = 0; z2 < G.D; z2++) for (var y2 = 0; y2 <= 9; y2++) {
        if (y2 === 0) { G.blocks[K(x2, y2, z2)] = 'bedrock'; continue; }
        var cav = noise(x2 * 0.15, z2 * 0.15 + y2 * 0.35);
        if (cav < 0.38 && y2 > 1 && y2 < 9) continue; // cavern air
        var key2, depth = 9 - y2;
        if (y2 === 1 && noise(x2 * 0.3 + 9, z2 * 0.3) > 0.72) key2 = 'lava';
        else if (depth <= 2) key2 = pickOre(rng, S.ORES.filter(function (o) { return ['stone', 'coal', 'iron'].indexOf(o.key) >= 0; })).key;
        else if (depth <= 5) key2 = pickOre(rng, S.ORES.filter(function (o) { return ['stone', 'coal', 'iron', 'gold', 'lapis', 'emerald', 'crystal'].indexOf(o.key) >= 0; })).key;
        else key2 = pickOre(rng, S.ORES.filter(function (o) { return ['stone', 'gold', 'emerald', 'ruby', 'diamond', 'crystal', 'lapis'].indexOf(o.key) >= 0; })).key;
        G.blocks[K(x2, y2, z2)] = key2;
      }
      // entrance stairwell (2x2, down to the works) + torches
      var cx = G.W >> 1, cz = G.D >> 1;
      for (var sx = 0; sx < 2; sx++) for (var sz = 0; sz < 2; sz++)
        for (var ti = 1; ti <= 9; ti++) delete G.blocks[K(cx + sx, ti, cz + sz)];
      // starter cavern hall around the stair foot (first view: lit rock + ores)
      var hx, hy, hz;
      for (hx = -2; hx <= 3; hx++) for (hz = -2; hz <= 3; hz++) for (hy = 1; hy <= 4; hy++) {
        if (hx >= 0 && hx < 2 && hz >= 0 && hz < 2 && hy <= 9) continue; // stair shaft
        delete G.blocks[K(cx + hx, hy, cz + hz)];
      }
      // mineshaft supports: wood pillars where the hall stands tall + beam ring
      // (real breakable wood blocks: they light, collide and chop like timber)
      [[-2, -2], [3, -2], [-2, 3], [3, 3]].forEach(function (c) {
        for (var yy = 1; yy <= 4; yy++) G.blocks[K(cx + c[0], yy, cz + c[1])] = 'wood';
      });
      for (var bx = -2; bx <= 3; bx++) {
        G.blocks[K(cx + bx, 4, cz - 2)] = 'wood';
        G.blocks[K(cx + bx, 4, cz + 3)] = 'wood';
      }
      G.torches.push({ x: cx - 1.5, y: 2.5, z: cz - 1.5 });
      G.torches.push({ x: cx + 2.5, y: 2.5, z: cz + 2.5 });
      // worm tunnel network out of the starter hall (intersecting passages)
      for (var w2 = 0; w2 < 6; w2++) {
        carveWorm(rng, cx + (rng.nextDouble() - 0.5) * 6, 2, cz + (rng.nextDouble() - 0.5) * 6, 80 + rng.nextInt(60), 2);
      }
      G.px = cx + 1; G.pz = cz + 1; G.py = 2.05;
    // Generate portal blocks in mine world
    if (G.world === 1) {
      var portalRng = new S.SeededRNG(G.seed + 8191);
      // Place portals in random cavern ceilings
      for (var pi = 0; pi < 3; pi++) {
        var px = 2 + portalRng.nextInt(G.W - 4);
        var pz = 2 + portalRng.nextInt(G.D - 4);
        var py = 8 + portalRng.nextInt(2); // at ceiling level
        // Check space is clear
        var isClear = true;
        for (var dx = -1; dx <= 1; dx++) {
          for (var dz = -1; dz <= 1; dz++) {
            for (var dy = 0; dy <= 1; dy++) {
              if (G.blocks[K(px + dx, py + dy, pz + dz)]) { isClear = false; }
            }
          }
        }
        if (isClear) {
          // Place portal (glowing bedrock portal)
          for (var dy = 0; dy <= 2; dy++) {
            G.blocks[K(px, py + dy, pz)] = 'bedrock';
            G.blocks[K(px, py + dy, pz + 1)] = 'bedrock';
          }
          // Mark as portal
          G.blocks[K(px, py, pz)].portalTarget = 0;
          G.blocks[K(px, py, pz + 1)].portalTarget = 0;
        }
      }
    } } else {
      // Crystal Caverns: big glowing caverns, rich crystal veins, floaty air
      G.W = 36; G.H = 11; G.D = 36;
      for (var gx = 0; gx < G.W; gx++) for (var gz = 0; gz < G.D; gz++) for (var gy = 0; gy <= 9; gy++) {
        if (gy === 0) { G.blocks[K(gx, gy, gz)] = 'bedrock'; continue; }
        var gcv = noise(gx * 0.12, gz * 0.12 + gy * 0.3);
        if (gcv < 0.45 && gy > 1 && gy < 9) continue; // wide caverns
        var gkey, gdepth = 9 - gy;
        if (gy === 1 && noise(gx * 0.3 + 9, gz * 0.3) > 0.78) gkey = 'lava';
        else if (gdepth <= 3) gkey = pickOre(rng, S.ORES.filter(function (o) { return ['stone', 'coal', 'iron', 'crystal'].indexOf(o.key) >= 0; })).key;
        else gkey = pickOre(rng, S.ORES.filter(function (o) { return ['stone', 'emerald', 'diamond', 'crystal', 'lapis'].indexOf(o.key) >= 0; })).key;
        if (rng.nextDouble() < 0.04) gkey = 'glowcrystal';
        G.blocks[K(gx, gy, gz)] = gkey;
      }
      var ccx = G.W >> 1, ccz = G.D >> 1;
      for (var csx = 0; csx < 2; csx++) for (var csz = 0; csz < 2; csz++)
        for (var cti = 1; cti <= 9; cti++) delete G.blocks[K(ccx + csx, cti, ccz + csz)];
      var chx, chy, chz;
      for (chx = -2; chx <= 3; chx++) for (chz = -2; chz <= 3; chz++) for (chy = 1; chy <= 4; chy++) {
        if (chx >= 0 && chx < 2 && chz >= 0 && chz < 2 && chy <= 9) continue;
        delete G.blocks[K(ccx + chx, chy, ccz + chz)];
      }
      for (var cw = 0; cw < 8; cw++) {
        carveWorm(rng, ccx + (rng.nextDouble() - 0.5) * 6, 3, ccz + (rng.nextDouble() - 0.5) * 6, 70 + rng.nextInt(50), 2);
      }
      G.px = ccx + 1; G.pz = ccz + 1; G.py = 2.05;
    }
    // portal gates for every world (decor frames + travel)
    buildGates();
    genPortals();
    genHorrorGeometry();
    genHalloweenFeatures();
    scanLightSources();
    G.yaw = 0; G.pitch = -0.05; G.vx = G.vy = G.vz = 0;
  }

  // ---------- mesh: chunks, smooth light, AO, leaf transparency ----------
  var FACES = [
    { d: [1, 0, 0], s: 0.8, c: [[1, 0, 0], [1, 0, 1], [1, 1, 1], [1, 0, 0], [1, 1, 1], [1, 1, 0]] },
    { d: [-1, 0, 0], s: 0.8, c: [[0, 0, 1], [0, 0, 0], [0, 1, 0], [0, 0, 1], [0, 1, 0], [0, 1, 1]] },
    { d: [0, 1, 0], s: 1.0, c: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 1], [1, 1, 0]] },
    { d: [0, -1, 0], s: 0.5, c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { d: [0, 0, 1], s: 0.7, c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 0, 1], [1, 1, 1], [0, 1, 1]] },
    { d: [0, 0, -1], s: 0.7, c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]] }
  ];
  var CH = 16;
  var AO_CURVE = [0.42, 0.62, 0.8, 1.0];
  function hexRGB(h) {
    return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  }
  function opaqueAt(x, y, z) {
    var b = get(x, y, z);
    return b !== null && b !== 'leaves' && b !== 'vine';
  }
  function skyLight(x, y, z) {
    if (G.world === 1 || G.world === 3) return 0;
    var f = 1.0;
    for (var yy = y + 1; ; yy++) {
      if (yy >= G.H) return f; // open sky above the world (out-of-bounds is NOT rock here)
      var b = get(x, yy, z);
      if (b === null) continue;
      if (b === 'leaves' || b === 'vine') { f *= 0.55; if (f < 0.22) return 0.22; continue; }
      return 0.30;
    }
  }
  function torchGlow(x, y, z) {
    var li = 0;
    for (var i = 0; i < G.torches.length; i++) {
      var T = G.torches[i];
      var dx = x - T.x, dy = y - T.y, dz = z - T.z;
      li += 2.6 / (1 + (dx * dx + dy * dy + dz * dz) * 0.18);
    }
    return li;
  }
  function cellSun(x, y, z) {
    if (G.world === 1 || G.world === 3) return 0;
    return Math.min(1.2, skyLight(x, y, z));
  }
  function cellLamp(x, y, z) {
    var amb = G.world === 1 ? 0.26 : G.world === 3 ? 0.38 : 0.24;
    return amb + Math.min(1.3, torchGlow(x + 0.5, y + 0.5, z + 0.5));
  }
  function cellLight(x, y, z) { return cellSun(x, y, z) + cellLamp(x, y, z); }
  // AO + smooth light for one face corner. n = face normal axis (0/1/2),
  // corner = [ox,oy,oz] offset, base = adjacent air cell coords.
  // Returns [sun, lamp] pair (AO curve applied to both).
  function cornerLight(bx, by, bz, n, corner, base) {
    var axes = [0, 1, 2].filter(function (a) { return a !== n; });
    var u = axes[0], v = axes[1];
    var co = [corner[0], corner[1], corner[2]];
    var su = co[u] ? 1 : -1, sv = co[v] ? 1 : -1;
    var b = base;
    function S_(du, dv) {
      var p = [b[0], b[1], b[2]];
      p[u] += du * su; p[v] += dv * sv;
      return solidAt(p[0], p[1], p[2]) ? 1 : 0;
    }
    function sun_(du, dv) {
      var p = [b[0], b[1], b[2]];
      p[u] += du * su; p[v] += dv * sv;
      return cellSun(p[0], p[1], p[2]);
    }
    function lamp_(du, dv) {
      var p = [b[0], b[1], b[2]];
      p[u] += du * su; p[v] += dv * sv;
      return cellLamp(p[0], p[1], p[2]);
    }
    var s1 = S_(1, 0), s2 = S_(0, 1), cc = S_(1, 1);
    var ao = (s1 && s2) ? 0 : 3 - (s1 + s2 + cc);
    var curve = AO_CURVE[ao];
    var sun = (sun_(0, 0) + sun_(1, 0) + sun_(0, 1) + sun_(1, 1)) / 4 * curve;
    var lamp = (lamp_(0, 0) + lamp_(1, 0) + lamp_(0, 1) + lamp_(1, 1)) / 4 * curve;
    return [sun, lamp];
  }
  function chunkKey(cx, cy, cz) { return cx + ',' + cy + ',' + cz; }
  function buildChunk(cx, cy, cz) {
    var P = [], C = [], SN = [], TP = [], TC = [], TSN = [];
    var M = [], L = [], N = [];
    var x0 = cx * CH, y0 = cy * CH, z0 = cz * CH;
    for (var k in G.blocks) {
      var p = k.split(','), x = +p[0], y = +p[1], z = +p[2];
      if (x < x0 || x >= x0 + CH || y < y0 || y >= y0 + CH || z < z0 || z >= z0 + CH) continue;
      var key = G.blocks[k];
      var ore = VOX[key] || VOX.stone;
      var base = hexRGB(ore.color);
      var leaf = key === 'leaves' || key === 'vine';
      for (var f = 0; f < 6; f++) {
        var F = FACES[f];
        // cull only against in-bounds opaque neighbors: border faces draw
        // so you never see through the edge of the world into the void
        var dx = F.d[0], dy = F.d[1], dz = F.d[2];
        if (x + dx >= 0 && y + dy >= 0 && z + dz >= 0 && x + dx < G.W && y + dy < G.H && z + dz < G.D
            && opaqueAt(x + dx, y + dy, z + dz)) continue;
        var nAxis = dx !== 0 ? 0 : (dy !== 0 ? 1 : 2);
        var bcell = [x + dx, y + dy, z + dz];
        var quad = [F.c[0], F.c[1], F.c[2], F.c[5]];
        var ls = quad.map(function (cn) { return cornerLight(x, y, z, nAxis, cn, bcell); });
        var order = [0, 1, 2, 0, 2, 3];
        var mp = leaf ? PBR.leaves : (PBR[key] || PBR.stone);
        for (var v = 0; v < 6; v++) {
          var cn2 = quad[order[v]], pair = ls[order[v]];
          var sun = pair[0] * F.s, lamp = pair[1] * F.s;
          if (ore.emis) { sun = 0; lamp = 1.5; }
          // embedded-gem glint: deterministic sparkle verts on valuable ores
          if (!ore.emis && ore.gold > 0 && ((x * 7 + y * 13 + z * 17 + f * 3 + v) % 6) < 2) lamp *= 1.9;
          (leaf ? TP : P).push(x + cn2[0], y + cn2[1], z + cn2[2]);
          var carr = leaf ? TC : C, sarr = leaf ? TSN : SN;
          carr.push(Math.min(1.5, base[0] * lamp), Math.min(1.5, base[1] * lamp), Math.min(1.5, base[2] * lamp));
          sarr.push(Math.min(1.5, base[0] * sun), Math.min(1.5, base[1] * sun), Math.min(1.5, base[2] * sun));
          if (!leaf) {
            M.push(mp[0], mp[1], mp[2], mp[3]);
            L.push(lamp);
            N.push(F.d[0], F.d[1], F.d[2]);
          }
        }
      }
    }
    return {
      x0: x0, y0: y0, z0: z0,
      op: P.length ? { n: P.length / 3, pos: buf(P, 3, 'aPos'), col: buf(C, 3, 'aCol'), sun: buf(SN, 3, 'aSun'),
        mat: buf(M, 4, 'aMat', progPBR), lamp: buf(L, 1, 'aLamp', progPBR), nrm: buf(N, 3, 'aNrm', progPBR) } : { n: 0 },
      tr: TP.length ? { n: TP.length / 3, pos: buf(TP, 3, 'aPos'), col: buf(TC, 3, 'aCol'), sun: buf(TSN, 3, 'aSun') } : { n: 0 }
    };
  }
  function buildAll() {
    G.chunks = {};
    for (var cx = 0; cx * CH < G.W; cx++)
      for (var cy = 0; cy * CH < G.H + 2; cy++)
        for (var cz = 0; cz * CH < G.D; cz++)
          G.chunks[chunkKey(cx, cy, cz)] = buildChunk(cx, cy, cz);
    buildGlow();
    genHorrorGeometry();
  }
  function rebuildAround(x, y, z) {
    var cx = Math.floor(x / CH), cy = Math.floor(y / CH), cz = Math.floor(z / CH);
    function need(ix, iy, iz) {
      if (ix < 0 || iy < 0 || iz < 0) return false;
      var key = chunkKey(ix, iy, iz);
      if (!G.chunks[key]) return false;
      G.chunks[key] = buildChunk(ix, iy, iz);
      return true;
    }
    need(cx, cy, cz);
    if (x % CH === 0) need(cx - 1, cy, cz);
    if (x % CH === CH - 1) need(cx + 1, cy, cz);
    if (y % CH === 0) need(cx, cy - 1, cz);
    if (y % CH === CH - 1) need(cx, cy + 1, cz);
    if (z % CH === 0) need(cx, cy, cz - 1);
    if (z % CH === CH - 1) need(cx, cy, cz + 1);
  }
  function buildGlow() {
    // torch stick (dark timber) + flame cube (hot emissive); decor, non-solid
    var P = [], C = [];
    function box(cx, cy, cz, sx, sy, sz, r, g, b) {
      var v = [[-sx, -sy, -sz], [sx, -sy, -sz], [sx, sy, -sz], [-sx, sy, -sz],
               [-sx, -sy, sz], [sx, -sy, sz], [sx, sy, sz], [-sx, sy, sz]];
      [[0, 1, 2, 3], [4, 6, 5, 7], [0, 4, 5, 1], [2, 6, 7, 3], [1, 5, 6, 2], [0, 3, 7, 4]].forEach(function (f) {
        [f[0], f[1], f[2], f[0], f[2], f[3]].forEach(function (vi) {
          P.push(cx + v[vi][0], cy + v[vi][1], cz + v[vi][2]);
          C.push(r, g, b);
        });
      });
    }
    G.torches.forEach(function (T) {
      box(T.x, T.y - 0.35, T.z, 0.05, 0.35, 0.05, 0.35, 0.22, 0.1);
      box(T.x, T.y + 0.08, T.z, 0.15, 0.15, 0.15, 1.5, 0.8, 0.25);
    });
    // portal gates: dark pillars + destination-hued core
    (G.gates || []).forEach(function (gt) {
      var col = GATE_COLORS[gt.to % GATE_COLORS.length];
      box(gt.x - 0.45, gt.y + 0.9, gt.z, 0.12, 1.8, 0.12, 0.25, 0.12, 0.35);
      box(gt.x + 0.45, gt.y + 0.9, gt.z, 0.12, 1.8, 0.12, 0.25, 0.12, 0.35);
      box(gt.x, gt.y + 1.85, gt.z, 1.0, 0.12, 0.12, 0.25, 0.12, 0.35);
      box(gt.x, gt.y + 0.95, gt.z, 0.62, 1.5, 0.1, col[0] * 1.3, col[1] * 1.3, col[2] * 1.3);
    });
    (G.portals || []).forEach(function (pt) {
      var tc = [1, 0.5, 1];
      for (var i = 0; i < PORTAL_TYPES.length; i++) if (PORTAL_TYPES[i].key === pt.type) tc = PORTAL_TYPES[i].col;
      box(pt.x - 0.4, pt.y + 0.8, pt.z, 0.1, 1.4, 0.1, 0.2, 0.1, 0.3);
      box(pt.x + 0.4, pt.y + 0.8, pt.z, 0.1, 1.4, 0.1, 0.2, 0.1, 0.3);
      box(pt.x, pt.y + 2.2, pt.z, 0.55, 0.1, 0.1, 0.2, 0.1, 0.3);
      box(pt.x, pt.y + 0.8, pt.z, 0.5, 1.3, 0.08, tc[0] * 1.4, tc[1] * 1.4, tc[2] * 1.4);
    });
    G.glow = P.length ? { n: P.length / 3, pos: buf(P, 3, 'aPos'), col: buf(C, 3, 'aCol') } : { n: 0 };
  }

  /* ---- System 4: Procedural horror geometry (stalactites, chains, bridges, pillars) ---- */
  var decorP = null, decorC = null;
  function boxD(P, C, cx, cy, cz, sx, sy, sz, r, g, b) {
    var v = [[-sx, -sy, -sz], [sx, -sy, -sz], [sx, sy, -sz], [-sx, sy, -sz],
             [-sx, -sy, sz], [sx, -sy, sz], [sx, sy, sz], [-sx, sy, sz]];
    [[0, 1, 2, 3], [4, 6, 5, 7], [0, 4, 5, 1], [2, 6, 7, 3], [1, 5, 6, 2], [0, 3, 7, 4]].forEach(function (f) {
      [f[0], f[1], f[2], f[0], f[2], f[3]].forEach(function (vi) {
        P.push(cx + v[vi][0], cy + v[vi][1], cz + v[vi][2]);
        C.push(r, g, b);
      });
    });
  }
  function genHorrorGeometry() {
    decorP = []; decorC = [];
    var rng = new S.SeededRNG(G.seed + G.world * 733 + 42);
    var i, x, y, z;
    if (G.world === 1 || G.world === 3) {
      // stalactites + stalagmites in caverns
      for (i = 0; i < 90; i++) {
        x = 2 + rng.nextInt(G.W - 4); z = 2 + rng.nextInt(G.D - 4);
        var gy = -1;
        for (y = 8; y >= 1; y--) { if (solidAt(x, y, z)) { gy = y; break; } }
        if (gy < 2) continue;
        if (G.blocks[K(x, gy, z)] === 'lava') continue;
        if (!solidAt(x, gy - 1, z) && rng.nextDouble() < 0.5) {
          var len = 1 + rng.nextInt(3);
          for (var s = 1; s <= len; s++) {
            if (solidAt(x, gy - s, z)) break;
            var w = 0.34 * (1 - s / (len + 1)) + 0.08;
            var cc = G.world === 3 ? [0.55, 0.35, 0.8] : [0.32, 0.3, 0.34];
            boxD(decorP, decorC, x + 0.5, gy - s + 0.5, z + 0.5, w, 0.5, w, cc[0], cc[1], cc[2]);
          }
        }
        if (!solidAt(x, gy + 1, z) && rng.nextDouble() < 0.4) {
          var alen = 1 + rng.nextInt(2);
          for (var s2 = 1; s2 <= alen; s2++) {
            if (solidAt(x, gy + s2, z)) break;
            var w2 = 0.3 * (1 - s2 / (alen + 1)) + 0.08;
            boxD(decorP, decorC, x + 0.5, gy + s2 + 0.5, z + 0.5, w2, 0.5, w2, 0.3, 0.28, 0.32);
          }
        }
      }
      // chains hanging from cavern ceilings
      for (i = 0; i < 26; i++) {
        x = 2 + rng.nextInt(G.W - 4); z = 2 + rng.nextInt(G.D - 4);
        var cy = -1;
        for (y = 9; y >= 2; y--) { if (solidAt(x, y, z)) { cy = y; break; } }
        if (cy < 3) continue;
        var cl = 1 + rng.nextInt(4);
        for (var c2 = 1; c2 <= cl; c2++) {
          if (solidAt(x, cy - c2, z)) break;
          boxD(decorP, decorC, x + 0.5, cy - c2 + 0.5, z + 0.5, 0.07, 0.3, 0.07, 0.16, 0.15, 0.17);
        }
      }
      // suspended bridges over lava chasms
      for (i = 0; i < 14; i++) {
        x = 3 + rng.nextInt(G.W - 10); z = 3 + rng.nextInt(G.D - 6);
        if (get(x, 1, z) !== 'lava') continue;
        var horiz = rng.nextDouble() < 0.5;
        var bl = 3 + rng.nextInt(4);
        var ok = true, b;
        for (b = 0; b < bl; b++) {
          var bx = horiz ? x + b : x, bz = horiz ? z : z + b;
          if (get(bx, 1, bz) !== 'lava') { ok = false; break; }
        }
        if (!ok) continue;
        for (b = -1; b <= bl; b++) {
          var px2 = horiz ? x + b : x, pz2 = horiz ? z : z + b;
          boxD(decorP, decorC, px2 + 0.5, 1.6, pz2 + 0.5, horiz ? 0.55 : 0.3, 0.07, horiz ? 0.3 : 0.55, 0.42, 0.3, 0.18);
          if (b === -1 || b === bl) {
            boxD(decorP, decorC, px2 + 0.5, 2.1, pz2 + 0.5, 0.06, 0.5, 0.06, 0.3, 0.2, 0.12);
            boxD(decorP, decorC, px2 + 0.5, 2.6, pz2 + 0.5, 0.06, 0.5, 0.06, 0.3, 0.2, 0.12);
          }
        }
      }
      // weathered support pillars in tall caverns
      for (i = 0; i < 20; i++) {
        x = 2 + rng.nextInt(G.W - 4); z = 2 + rng.nextInt(G.D - 4);
        var fy = -1;
        for (y = 1; y <= 8; y++) { if (solidAt(x, y, z)) { fy = y; break; } }
        if (fy < 2) continue;
        var top = -1;
        for (y = 9; y >= fy; y--) { if (solidAt(x, y, z)) { top = y; break; } }
        if (top < fy + 3) continue;
        var hgt = top - fy;
        var mossy = rng.nextDouble() < 0.5;
        for (var p2 = 0; p2 < hgt; p2++) {
          var weathered = 0.36 + rng.nextDouble() * 0.1;
          boxD(decorP, decorC, x + 0.5, fy + p2 + 0.5, z + 0.5, 0.22, 0.5, 0.22, weathered, weathered * 0.75, weathered * 0.5);
        }
        if (mossy) boxD(decorP, decorC, x + 0.5, fy + hgt - 0.4, z + 0.5, 0.3, 0.12, 0.3, 0.2, 0.42, 0.18);
      }
      if (G.world === 1) {
        for (i = 0; i < 15; i++) {
          x = 2 + rng.nextInt(G.W - 4); z = 2 + rng.nextInt(G.D - 4);
          var gy7 = -1;
          for (y = 8; y >= 1; y--) { if (solidAt(x, y, z)) { gy7 = y; break; } }
          if (gy7 < 2) continue;
          if (G.blocks[K(x, gy7, z)] === 'lava') continue;
          var sh2 = 0.3 + rng.nextDouble() * 0.6;
          var sr2 = 0.1 + rng.nextDouble() * 0.12;
          var sc2 = [0.35, 0.25, 0.5];
          boxD(decorP, decorC, x + 0.5, gy7 + sh2 / 2, z + 0.5, sr2, sh2 / 2, sr2, sc2[0], sc2[1], sc2[2]);
        }
      }
      if (G.world === 3) {
        for (i = 0; i < 40; i++) {
          x = 2 + rng.nextInt(G.W - 4); z = 2 + rng.nextInt(G.D - 4);
          var gy3 = -1;
          for (y = 1; y <= 8; y++) { if (solidAt(x, y, z)) { gy3 = y; break; } }
          if (gy3 < 1) continue;
          if (solidAt(x, gy3 + 1, z)) continue;
          var n = 1 + rng.nextInt(4);
          for (var c3 = 0; c3 < n; c3++) {
            var ox = (rng.nextDouble() - 0.5) * 0.6, oz = (rng.nextDouble() - 0.5) * 0.6;
            var h = 0.4 + rng.nextDouble() * 0.8;
            var cr = 0.06 + rng.nextDouble() * 0.06;
            var cc = rng.nextDouble() < 0.5 ? [0.62, 0.45, 0.95] : [0.4, 0.8, 1.0];
            boxD(decorP, decorC, x + 0.5 + ox, gy3 + h / 2, z + 0.5 + oz, cr, h / 2, cr, cc[0], cc[1], cc[2]);
          }
        }
        for (i = 0; i < 25; i++) {
          x = 2 + rng.nextInt(G.W - 4); z = 2 + rng.nextInt(G.D - 4);
          var gy5 = -1;
          for (y = 8; y >= 1; y--) { if (solidAt(x, y, z)) { gy5 = y; break; } }
          if (gy5 < 2) continue;
          if (G.blocks[K(x, gy5, z)] === 'lava') continue;
          var sh = 0.5 + rng.nextDouble() * 1.2;
          var sr = 0.15 + rng.nextDouble() * 0.2;
          var sc = [0.5, 0.3, 0.9];
          boxD(decorP, decorC, x + 0.5, gy5 + sh / 2, z + 0.5, sr, sh / 2, sr, sc[0], sc[1], sc[2]);
          boxD(decorP, decorC, x + 0.5, gy5 + sh * 0.8, z + 0.5, sr * 0.5, sh * 0.2, sr * 0.5, sc[0] * 0.7, sc[1] * 0.7, sc[2] * 0.7);
        }
        for (i = 0; i < 20; i++) {
          x = 2 + rng.nextInt(G.W - 4); z = 2 + rng.nextInt(G.D - 4);
          var gy6 = -1;
          for (y = 1; y <= 8; y++) { if (solidAt(x, y, z)) { gy6 = y; break; } }
          if (gy6 < 1) continue;
          if (solidAt(x, gy6 + 1, z)) continue;
          var ah = 0.4 + rng.nextDouble() * 0.8;
          var ar = 0.12 + rng.nextDouble() * 0.15;
          var ac = [0.4, 0.7, 1.0];
          boxD(decorP, decorC, x + 0.5, gy6 + ah / 2, z + 0.5, ar, ah / 2, ar, ac[0], ac[1], ac[2]);
          boxD(decorP, decorC, x + 0.5, gy6 + ah * 0.75, z + 0.5, ar * 0.4, ah * 0.25, ar * 0.4, ac[0] * 0.6, ac[1] * 0.6, ac[2] * 0.6);
        }
        for (i = 0; i < 10; i++) {
          x = 2 + rng.nextInt(G.W - 4); z = 2 + rng.nextInt(G.D - 4);
          var gy9 = -1;
          for (y = 1; y <= 8; y++) { if (solidAt(x, y, z)) { gy9 = y; break; } }
          if (gy9 < 1) continue;
          if (solidAt(x, gy9 + 1, z)) continue;
          var oh = 0.3 + rng.nextDouble() * 0.4;
          var or2 = 0.15 + rng.nextDouble() * 0.1;
          var oc = [0.5, 0.35, 0.9];
          boxD(decorP, decorC, x + 0.5, gy9 + oh / 2, z + 0.5, or2, oh / 2, or2, oc[0], oc[1], oc[2]);
        }
        for (i = 0; i < 15; i++) {
          x = 2 + rng.nextInt(G.W - 4); z = 2 + rng.nextInt(G.D - 4);
          var gy8 = -1;
          for (y = 8; y >= 1; y--) { if (solidAt(x, y, z)) { gy8 = y; break; } }
          if (gy8 < 3) continue;
          if (solidAt(x, gy8 - 1, z)) continue;
          var dh = 0.3 + rng.nextDouble() * 0.6;
          var dr = 0.1 + rng.nextDouble() * 0.12;
          var dc = [0.45, 0.3, 0.8];
          boxD(decorP, decorC, x + 0.5, gy8 - dh / 2, z + 0.5, dr, dh / 2, dr, dc[0], dc[1], dc[2]);
          boxD(decorP, decorC, x + 0.5, gy8 - dh * 0.75, z + 0.5, dr * 0.4, dh * 0.25, dr * 0.4, dc[0] * 0.6, dc[1] * 0.6, dc[2] * 0.6);
        }
      }
    } else {
      // forest/frost: dead shrubs on the surface
      for (i = 0; i < 24; i++) {
        x = 2 + rng.nextInt(G.W - 4); z = 2 + rng.nextInt(G.D - 4);
        var gy4 = groundY(x, z);
        if (get(x, gy4 - 1, z) !== 'grass' && get(x, gy4 - 1, z) !== 'snow') continue;
        boxD(decorP, decorC, x + 0.5, gy4 + 0.25, z + 0.5, 0.06, 0.25, 0.06, 0.25, 0.18, 0.1);
        boxD(decorP, decorC, x + 0.5, gy4 + 0.45, z + 0.5, 0.16, 0.05, 0.05, 0.22, 0.16, 0.09);
      }
    }
    G.decor = decorP.length ? { n: decorP.length / 3, pos: buf(decorP, 3, 'aPos'), col: buf(decorC, 3, 'aCol') } : { n: 0 };
  }
  function scanLightSources() {
    G.lightSources = [];
    for (var k in G.blocks) {
      var key = G.blocks[k];
      if (key === 'lava' || key === 'glowcrystal') {
        var pp = k.split(',');
        G.lightSources.push({ x: +pp[0] + 0.5, y: +pp[1] + 0.5, z: +pp[2] + 0.5, lava: key === 'lava' });
      }
    }
  }
  function frustumPlanes(m) {
    function row(i) { return [m[i], m[i + 4], m[i + 8], m[i + 12]]; }
    var r0 = row(0), r1 = row(1), r2 = row(2), r3 = row(3);
    function comb(a, b, s) {
      var p = [a[0] + s * b[0], a[1] + s * b[1], a[2] + s * b[2], a[3] + s * b[3]];
      var l = Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]) || 1;
      return [p[0] / l, p[1] / l, p[2] / l, p[3] / l];
    }
    return [comb(r3, r0, 1), comb(r3, r0, -1), comb(r3, r1, 1), comb(r3, r1, -1), comb(r3, r2, 1), comb(r3, r2, -1)];
  }
  function chunkVisible(ch, planes) {
    var x0 = ch.x0, y0 = ch.y0, z0 = ch.z0, x1 = x0 + CH, y1 = y0 + CH, z1 = z0 + CH;
    for (var i = 0; i < 6; i++) {
      var p = planes[i];
      var px = p[0] >= 0 ? x1 : x0, py = p[1] >= 0 ? y1 : y0, pz = p[2] >= 0 ? z1 : z0;
      if (p[0] * px + p[1] * py + p[2] * pz + p[3] < 0) return false;
    }
    return true;
  }

  // ---------- avatar, viewmodel pickaxe, break particles ----------
  var PR = 0.3, PH = 1.8, EYE = 1.62;
  var BOXF = [
    { q: [1, 3, 5, 7], n: [1, 0, 0] },
    { q: [0, 2, 4, 6], n: [-1, 0, 0] },
    { q: [2, 3, 6, 7], n: [0, 1, 0] },
    { q: [0, 1, 4, 5], n: [0, -1, 0] },
    { q: [4, 5, 6, 7], n: [0, 0, 1] },
    { q: [0, 1, 2, 3], n: [0, 0, -1] }
  ];
  function emitBox(P, C, o, X, Y, Z, cx, cy, cz, sx, sy, sz, col, bright) {
    var L = [];
    for (var i = 0; i < 8; i++)
      L.push([cx + (i & 1 ? sx / 2 : -sx / 2), cy + (i & 2 ? sy / 2 : -sy / 2), cz + (i & 4 ? sz / 2 : -sz / 2)]);
    function W(p) {
      return [o[0] + X[0] * p[0] + Y[0] * p[1] + Z[0] * p[2],
              o[1] + X[1] * p[0] + Y[1] * p[1] + Z[1] * p[2],
              o[2] + X[2] * p[0] + Y[2] * p[1] + Z[2] * p[2]];
    }
    BOXF.forEach(function (f) {
      var sh = (f.n[1] !== 0 ? (f.n[1] > 0 ? 1.0 : 0.55) : (f.n[0] !== 0 ? 0.85 : 0.75)) * (bright || 1);
      [f.q[0], f.q[1], f.q[2], f.q[0], f.q[2], f.q[3]].forEach(function (ci) {
        var w = W(L[ci]);
        P.push(w[0], w[1], w[2]);
        C.push(Math.min(1.5, col[0] * sh), Math.min(1.5, col[1] * sh), Math.min(1.5, col[2] * sh));
      });
    });
  }
  function rotX(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
  }
  var SKIN = [0.91, 0.72, 0.54], SHIRT = [0.43, 0.16, 0.66], PANTS = [0.16, 0.1, 0.33],
      HAIR = [0.23, 0.14, 0.08], WOODC = [0.48, 0.32, 0.19], STEEL = [0.6, 0.63, 0.69];
  function swingAngle() {
    var t = Math.min(1, G.swingT);
    return -0.7 + 1.2 * Math.sin(Math.PI * t);
  }
  function buildAvatar(P, C) {
    // No character model (cleaner view): third-person is camera-only.
  }
  function buildViewmodel(P, C) {
    var d = lookDir(), e = playerEye();
    // camera basis from yaw/pitch
    var sy = Math.sin(G.yaw), cy = Math.cos(G.yaw), cp = Math.cos(G.pitch), sp = Math.sin(G.pitch);
    var F = [sy * cp, sp, -cy * cp];
    var Rt = [cy, 0, sy];
    var U = [Rt[1] * F[2] - Rt[2] * F[1], Rt[2] * F[0] - Rt[0] * F[2], Rt[0] * F[1] - Rt[1] * F[0]];
    var lift = Math.sin(Math.PI * Math.min(1, G.swingT));
    var o = [e[0] + F[0] * 0.75 + Rt[0] * 0.34 + U[0] * (-0.3 + 0.18 * lift),
             e[1] + F[1] * 0.75 + Rt[1] * 0.34 + U[1] * (-0.3 + 0.18 * lift),
             e[2] + F[2] * 0.75 + Rt[2] * 0.34 + U[2] * (-0.3 + 0.18 * lift)];
    var B = [-F[0], -F[1], -F[2]];
    var skinCol = SKINS[meta().skinIdx || 0] ? SKINS[meta().skinIdx || 0].col : WOODC;
    var pi = (meta().pickIdx || 0);
    var headCol = [0.45, 0.32, 0.2], headBright = 0.85;
    if (pi === 1) { headCol = [0.5, 0.5, 0.52]; headBright = 0.9; }
    else if (pi === 2) { headCol = STEEL; headBright = 1.0; }
    else if (pi === 3) { headCol = [0.95, 0.75, 0.3]; headBright = 1.05; }
    else if (pi === 4) { headCol = [0.7, 0.95, 1.0]; headBright = 1.3; }
    else if (pi === 5) { headCol = [0.75, 0.5, 1.0]; headBright = 1.2; }
    else if (pi >= 6) { headCol = [0.3, 0.2, 0.5]; headBright = 1.1; }
    emitCylinder(P, C, o[0], o[1] - 0.08, o[2] - 0.2, 0.05, 0.42, skinCol, 1.0, 8);
    emitCylinder(P, C, o[0], o[1] - 0.26, o[2] - 0.26, 0.26, 0.06, headCol, headBright, 8);
    emitSphere(P, C, o[0], o[1] - 0.26, o[2] - 0.26, 0.28, headCol, headBright, 8, 6);
  }
  function spawnBurst(x, y, z, hex) {
    var base = hexRGB(hex);
    for (var i = 0; i < 14; i++) {
      var a = Math.random() * Math.PI * 2, up = 1 + Math.random() * 3, sp = 1 + Math.random() * 2.5;
      G.parts.push({ x: x, y: y, z: z,
        vx: Math.cos(a) * sp, vy: up, vz: Math.sin(a) * sp,
        life: 0.5 + Math.random() * 0.3, col: base, grav: 1 });
    }
    if (G.parts.length > 240) G.parts.splice(0, G.parts.length - 240);
  }
  function spawnMote() {
    var a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 7;
    G.parts.push({ x: G.px + Math.cos(a) * r, y: G.py + Math.random() * 3, z: G.pz + Math.sin(a) * r,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.15, vz: (Math.random() - 0.5) * 0.3,
      life: 3 + Math.random() * 2, col: [0.95, 0.88, 0.62], grav: 0.02, mote: true });
  }
  function moteCount() {
    var n = 0;
    for (var i = 0; i < G.parts.length; i++) if (G.parts[i].mote) n++;
    return n;
  }
  /* ---- System 5: Enhanced particles (ghosts, wind, blood moon, fog wisps) ---- */
  function windVec() {
    return [Math.sin(G.time * 0.31) * 0.6 + Math.sin(G.time * 0.11) * 0.4, 0,
            Math.cos(G.time * 0.23) * 0.6 + Math.cos(G.time * 0.13) * 0.4];
  }
  function spawnGhost(x, y, z) {
    G.parts.push({ x: x + (Math.random() - 0.5) * 0.6, y: y + Math.random() * 0.8, z: z + (Math.random() - 0.5) * 0.6,
      vx: (Math.random() - 0.5) * 0.2, vy: 0.3 + Math.random() * 0.4, vz: (Math.random() - 0.5) * 0.2,
      life: 1.2 + Math.random() * 1.2, col: [0.75, 0.95, 1.0], grav: -0.05, ghost: true });
    if (G.parts.length > 400) G.parts.splice(0, G.parts.length - 400);
  }
  function spawnBloodMoon() {
    G.parts.push({ x: G.px + (Math.random() - 0.5) * 24, y: G.py + 6 + Math.random() * 6, z: G.pz + (Math.random() - 0.5) * 24,
      vx: 0, vy: -1.2 - Math.random(), vz: 0,
      life: 2.5, col: [1.0, 0.2, 0.25], grav: 0, blood: true });
  }
  function spawnFogWisp() {
    var a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 10;
    G.parts.push({ x: G.px + Math.cos(a) * r, y: G.py + 0.3 + Math.random() * 1.4, z: G.pz + Math.sin(a) * r,
      vx: (Math.random() - 0.5) * 0.4, vy: 0.05, vz: (Math.random() - 0.5) * 0.4,
      life: 4 + Math.random() * 3, col: [0.5, 0.45, 0.6], grav: 0, fog: true });
  }
  function bloodMoon() {
    if (!G.bloodT || G.bloodT <= 0) return 0;
    var el = G.bloodTotal - G.bloodT;
    return Math.min(1, el / 15, G.bloodT / 15);
  }
  function updateParts(dt) {
    var w = windVec();
    for (var i = G.parts.length - 1; i >= 0; i--) {
      var p = G.parts[i];
      p.life -= dt;
      if (p.life <= 0) { G.parts.splice(i, 1); continue; }
      p.vy -= 9 * (p.grav === undefined ? 1 : p.grav) * dt;
      if (p.mote || p.ghost) { p.vx += w[0] * dt * (p.ghost ? 0.4 : 1); p.vz += w[2] * dt * (p.ghost ? 0.4 : 1); }
      if (p.fog) { p.vx += w[0] * dt * 0.6; p.vz += w[2] * dt * 0.6; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      var dx = p.x - G.px, dz = p.z - G.pz;
      if (dx * dx + dz * dz > 1600 && !p.ghost) { G.parts.splice(i, 1); continue; }
    }
  }

  /* ---- System 10: Atmospheric effects (dynamic weather, fog density) ---- */
  var WEATHERS = {
    clear: { name: 'Clear', fogK: 1.0, skyK: 1.0, part: null },
    rain: { name: 'Rain', fogK: 0.62, skyK: 0.62, part: 'rain' },
    snow: { name: 'Snow', fogK: 0.72, skyK: 0.85, part: 'snow' },
    ash: { name: 'Ashfall', fogK: 0.8, skyK: 0.7, part: 'ash' },
    spores: { name: 'Spores', fogK: 0.85, skyK: 0.9, part: 'spores' },
    dust: { name: 'Dust', fogK: 0.9, skyK: 0.95, part: 'dust' }
  };
  function setWeather(w) {
    if (G.weather === w) return;
    G.weather = w;
    G.weatherT = 60 + Math.random() * 60;
    flash('🌦️ Weather: ' + WEATHERS[w].name, 2);
  }
  function updateWeather(dt) {
    if (!G.weather) {
      G.weather = G.world === 2 ? 'snow' : (G.world === 3 ? 'spores' : (G.world === 1 ? 'dust' : 'clear'));
      G.weatherT = 60 + Math.random() * 60;
    }
    G.weatherT -= dt;
    if (G.weatherT <= 0) {
      var opts = G.world === 2 ? ['snow', 'clear', 'snow'] :
        G.world === 3 ? ['spores', 'clear', 'spores'] :
        G.world === 1 ? ['dust', 'dust', 'ash'] : ['clear', 'rain', 'clear', 'rain'];
      setWeather(opts[(Math.random() * opts.length) | 0]);
    }
    var wp = WEATHERS[G.weather].part;
    if (wp && Math.random() < dt * 30) {
      var a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 11;
      var x = G.px + Math.cos(a) * r, z = G.pz + Math.sin(a) * r;
      if (wp === 'rain') {
        G.parts.push({ x: x, y: G.py + 7, z: z, vx: 0, vy: -14, vz: 0, life: 0.6, col: [0.55, 0.65, 0.85], grav: 0, rain: true });
      } else if (wp === 'snow') {
        G.parts.push({ x: x, y: G.py + 6, z: z, vx: (Math.random() - 0.5), vy: -1 - Math.random(), vz: (Math.random() - 0.5), life: 4, col: [0.95, 0.97, 1], grav: 0.02, snow: true });
      } else if (wp === 'ash') {
        G.parts.push({ x: x, y: G.py + 5 + Math.random() * 3, z: z, vx: (Math.random() - 0.5) * 0.6, vy: -0.5 - Math.random() * 0.5, vz: (Math.random() - 0.5) * 0.6, life: 5, col: [0.45, 0.4, 0.42], grav: 0.01, ash: true });
      } else if (wp === 'spores') {
        G.parts.push({ x: x, y: G.py + Math.random() * 3, z: z, vx: (Math.random() - 0.5) * 0.4, vy: 0.3 + Math.random() * 0.3, vz: (Math.random() - 0.5) * 0.4, life: 4, col: [0.7, 0.4, 0.95], grav: -0.02, spore: true });
      } else if (wp === 'dust') {
        G.parts.push({ x: x, y: G.py + Math.random() * 3, z: z, vx: (Math.random() - 0.5) * 0.5, vy: -0.15, vz: (Math.random() - 0.5) * 0.5, life: 5, col: [0.6, 0.55, 0.5], grav: 0, dust: true });
      }
    }
  }
  var dynP1 = null, dynC1 = null, dynP2 = null, dynC2 = null;
  function dynBufs() {
    if (!dynP1) {
      dynP1 = gl.createBuffer(); dynC1 = gl.createBuffer();
      dynP2 = gl.createBuffer(); dynC2 = gl.createBuffer();
    }
  }
  function drawDyn(bP, bC, P, C) {
    if (!P.length) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, bP);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(P), gl.DYNAMIC_DRAW);
    var lP = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(lP);
    gl.vertexAttribPointer(lP, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bC);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(C), gl.DYNAMIC_DRAW);
    var lC = gl.getAttribLocation(prog, 'aCol');
    gl.enableVertexAttribArray(lC);
    gl.vertexAttribPointer(lC, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, P.length / 3);
  }
  function playerEye() {
    var bobY = Math.sin((G.bob || 0) * 2) * 0.045 * (G.bobAmt || 0);
    return [G.px, G.py + EYE + bobY, G.pz];
  }
  function thirdEye() {
    var e = playerEye(), d = lookDir();
    var bx = -d[0], bz = -d[2], bl = Math.hypot(bx, bz) || 1;
    var back = [bx / bl, 0.32, bz / bl];
    var hit = S.voxelRay(e, back, 4.2, solidAt);
    var dist = hit ? Math.max(0.5, hit.dist - 0.35) : 4.2;
    return [e[0] + back[0] * dist, e[1] + back[1] * dist, e[2] + back[2] * dist];
  }
  function eyePos() { return G.third ? thirdEye() : playerEye(); }
  function collide(nx, ny, nz) {
    // AABB corners vs solid cells; returns corrected pos
    var xs = [nx - PR, nx + PR], ys = [ny, ny + PH], zs = [nz - PR, nz + PR];
    for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) for (var k = 0; k < 2; k++) {
      if (solidAt(Math.floor(xs[i]), Math.floor(ys[j]), Math.floor(zs[k]))) return true;
    }
    // torch cubes are decor (non solid): remove torch entries from map? torches stored separately, never in blocks. ok
    return false;
  }
  function moveAxis(dx, dy, dz) {
    // Check for portal interaction
    var portalKey = G.px + ',' + G.py + ',' + G.pz;
    if (G.blocks[portalKey] && G.blocks[portalKey].portalTarget !== undefined) {
      var targetWorld = G.blocks[portalKey].portalTarget;
      var m = meta();
      newGame(targetWorld, (Math.random() * 1e9) | 0);
      meta().gold = m.gold;
      meta().coal = m.coal;
      meta().level = m.level;
      meta().xp = m.xp;
      meta().pickIdx = m.pickIdx;
      meta().ach = m.ach;
      meta().stats = m.stats;
      meta().wood = m.wood;
      meta().apples = m.apples;
      meta().torchesInv = m.torchesInv;
      renderHUD();
      flash('Entered new world!', 2);
      return;
    }
    if (dx && !collide(G.px + dx, G.py, G.pz)) G.px += dx;
    if (dz && !collide(G.px, G.py, G.pz + dz)) G.pz += dz;
    if (dy) {
      if (!collide(G.px, G.py + dy, G.pz)) { G.py += dy; G.onGround = false; }
      else { if (dy < 0) G.onGround = true; G.vy = 0; }
    }
    G.px = Math.max(PR, Math.min(G.W - PR, G.px));
    G.pz = Math.max(PR, Math.min(G.D - PR, G.pz));
  }

  // ---------- objectives: live goals with gold payouts ----------
  var OBJECTIVES = [
    { id: 'dig-20', name: 'Delve 20 blocks', target: 20, val: function () { return G.broken; }, reward: 40 },
    { id: 'coal-15', name: 'Bank 15 coal (total)', target: 15, val: function () { return meta().stats.coalRun; }, reward: 30 },
    { id: 'hunt-3', name: 'Defeat 3 beasts', target: 3, val: function () { return meta().stats.kills; }, reward: 60 },
    { id: 'deep-2', name: 'Descend below y=2 in the mine', target: 1, val: function () { return (G.world === 1 && meta().stats.deep <= 2) ? 1 : 0; }, reward: 50 },
    { id: 'torch-4', name: 'Craft 4 torches', target: 4, val: function () { return meta().stats.torchesMade; }, reward: 25 },
    { id: 'gold-200', name: 'Earn 200 gold (total)', target: 200, val: function () { return meta().stats.goldRun; }, reward: 50 }
  ];
  function checkObjectives() {
    if (!G.stats) return;
    OBJECTIVES.forEach(function (o) {
      if (!meta().stats.claimed[o.id] && o.val() >= o.target) {
        meta().stats.claimed[o.id] = true;
        meta().gold += o.reward;
        meta().stats.goldRun += o.reward;
        flash('📋 ' + o.name + ' +' + o.reward + 'g');
      }
    });
    var panel = document.getElementById('objpanel');
    if (panel && panel.style.display !== 'none') paintObjectives();
  }
  function paintObjectives() {
    var panel = document.getElementById('objpanel');
    var h = '<h2>📋 Objectives</h2>';
    OBJECTIVES.forEach(function (o) {
      var done = !!meta().stats.claimed[o.id];
      h += '<div class="pitem">' + (done ? '✅ ' : '🔒 ') + o.name + ' — ' + Math.min(o.val(), o.target) + '/' + o.target + ' (+' + o.reward + 'g)</div>';
    });
    panel.innerHTML = h;
  }

  /* ---- System 8: Complex quest system (types, rarity tiers, daily rotation) ---- */
  var questDay = 0;
  var RARITIES = [
    { name: 'Common', col: '#b8b8b8', mult: 1, w: 70 },
    { name: 'Rare', col: '#4da6ff', mult: 1.5, w: 22 },
    { name: 'Epic', col: '#c98fff', mult: 2.5, w: 7 },
    { name: 'Legendary', col: '#ffb545', mult: 4, w: 1 }
  ];
  function rollRarity() {
    var tot = 0, i;
    for (i = 0; i < RARITIES.length; i++) tot += RARITIES[i].w;
    var r = Math.random() * tot;
    for (i = 0; i < RARITIES.length; i++) { r -= RARITIES[i].w; if (r <= 0) return i; }
    return 0;
  }
  var QUEST_POOL = [
    { type: 'collect', name: 'Ore Haul', desc: 'Break {n} ore blocks', target: 15, reward: 40 },
    { type: 'collect', name: 'Timber!', desc: 'Chop {n} wood', target: 10, reward: 30 },
    { type: 'collect', name: 'Coal Run', desc: 'Bank {n} coal', target: 12, reward: 35 },
    { type: 'kill', name: 'Beast Hunter', desc: 'Defeat {n} beasts', target: 4, reward: 50 },
    { type: 'kill', name: 'Ghost Buster', desc: 'Banish {n} ghosts', target: 2, reward: 60 },
    { type: 'explore', name: 'World Tourist', desc: 'Visit {n} different worlds', target: 2, reward: 45 },
    { type: 'explore', name: 'Into the Deep', desc: 'Reach y=2 in the mine', target: 1, reward: 55 },
    { type: 'craft', name: 'Torchbearer', desc: 'Craft {n} torches', target: 8, reward: 30 },
    { type: 'survive', name: 'Night Survivor', desc: 'Survive {n} nights', target: 1, reward: 70 },
    { type: 'portal', name: 'World Hopper', desc: 'Use {n} portals', target: 3, reward: 65 }
  ];
  function dailySeed() {
    var d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }
  function genQuests() {
    G.quests = [];
    var rng = new S.SeededRNG(dailySeed() + G.world * 131);
    var pool = QUEST_POOL.slice();
    for (var i = 0; i < 3 && pool.length; i++) {
      var idx = rng.nextInt(pool.length);
      var q = pool.splice(idx, 1)[0];
      var scale = 1 + (meta().level - 1) * 0.15;
      var target = Math.max(1, Math.round(q.target * scale));
      G.quests.push({
        id: 'q' + i + '_' + dailySeed(),
        type: q.type, name: q.name, desc: q.desc.replace('{n}', target),
        target: target, progress: 0, reward: Math.round(q.reward * scale),
        rarity: rollRarity(), done: false, claimed: false
      });
    }
    // weekly challenge (bigger)
    if (new Date().getDay() === 0 || true) {
      var wq = QUEST_POOL[rng.nextInt(QUEST_POOL.length)];
      var wscale = 2 + meta().level * 0.2;
      G.quests.push({
        id: 'weekly_' + dailySeed(), type: wq.type, name: '📅 ' + wq.name,
        desc: wq.desc.replace('{n}', Math.round(wq.target * wscale)) + ' (weekly)',
        target: Math.round(wq.target * wscale), progress: 0,
        reward: Math.round(wq.reward * wscale * 1.5), rarity: Math.min(3, rollRarity() + 1),
        done: false, claimed: false, weekly: true
      });
    }
  }
  function checkQuests(type, n) {
    if (!G.quests) return;
    for (var i = 0; i < G.quests.length; i++) {
      var q = G.quests[i];
      if (q.done || q.type !== type) continue;
      q.progress = Math.min(q.target, q.progress + n);
      if (q.progress >= q.target) {
        q.done = true;
        var mult = RARITIES[q.rarity].mult;
        var gold = Math.round(q.reward * mult);
        meta().gold += gold;
        meta().stats.goldRun += gold;
        gainXP(Math.round(20 * mult));
        AudioSys.quest();
        flash('📜 ' + q.name + ' complete! +' + gold + 'g (' + RARITIES[q.rarity].name + ')', 3);
        if (q.weekly) ach('weekly-1', 'Challenge Champion');
        saveMeta(); renderHUD();
      }
    }
    var qp = document.getElementById('questpanel');
    if (qp && qp.style.display !== 'none') paintQuests();
  }
  function paintQuests() {
    var panel = document.getElementById('questpanel');
    if (!panel || !G.quests) return;
    var h = '<h2>📜 Quests</h2>';
    G.quests.forEach(function (q) {
      var rc = RARITIES[q.rarity].col;
      var pct = Math.min(100, Math.round(q.progress / q.target * 100));
      h += '<div class="pitem" style="border-left:3px solid ' + rc + '"> ' +
        (q.done ? '✅ ' : '🔒 ') + ' <b style="color:' + rc + '">' + q.name + '</b> — ' + q.desc + '<br>' +
        '<span style="display:inline-block;width:120px;height:8px;background:#333;border-radius:4px;vertical-align:middle">' +
        '<span style="display:block;height:8px;width:' + pct + '%;background:' + rc + ';border-radius:4px"></span></span> ' +
        q.progress + '/' + q.target + ' (+' + Math.round(q.reward * RARITIES[q.rarity].mult) + 'g)</div>';
    });
    panel.innerHTML = h;
  }

  /* ---- System 9: Customization & progression (skins, difficulty, stats, achievements) ---- */
  var SKINS = [
    { name: 'Wooden', cost: 0, col: [0.48, 0.32, 0.19] },
    { name: 'Iron', cost: 100, col: [0.6, 0.63, 0.69] },
    { name: 'Golden', cost: 300, col: [1.0, 0.8, 0.2] },
    { name: 'Diamond', cost: 800, col: [0.4, 0.9, 1.0] },
    { name: 'Void', cost: 2000, col: [0.6, 0.2, 1.0] }
  ];
  var DIFFS = [
    { name: 'Chill', dmg: 0.5, mobSpd: 0.8, fogK: 1.2 },
    { name: 'Normal', dmg: 1, mobSpd: 1, fogK: 1 },
    { name: 'Spooky', dmg: 1.5, mobSpd: 1.2, fogK: 0.85 },
    { name: 'Nightmare', dmg: 2.2, mobSpd: 1.5, fogK: 0.7 }
  ];
  var ACH_DEFS = [
    ['mine-10', 'Ore Hauled'], ['coal-20', 'Coal Baron'], ['level-5', 'Living Myth'],
    ['first-pick', 'New Edge'], ['void-drill', 'Maximum Spin'], ['portal-5', 'World Hopper'],
    ['weekly-1', 'Challenge Champion']
  ];
  function buySkin(i) {
    var m = meta();
    if (m.skinIdx === i) { m.skinIdx = 0; saveMeta(); renderHUD(); flash('Skin unequipped', 1.5); return; }
    if ((m.skins || []).indexOf(i) >= 0) {
      m.skinIdx = i;
      saveMeta(); renderHUD();
      flash('Equipped ' + SKINS[i].name + ' pick!', 2);
      return;
    }
    if (m.gold < SKINS[i].cost) { flash('Needs ' + SKINS[i].cost + ' gold', 1.5); return; }
    m.gold -= SKINS[i].cost;
    m.skins = m.skins || [];
    m.skins.push(i);
    m.skinIdx = i;
    saveMeta(); renderHUD();
    flash('Unlocked ' + SKINS[i].name + ' pick!', 2.5);
  }
  function setDifficulty(i) {
    meta().diff = i;
    saveMeta(); renderHUD();
    flash('Difficulty: ' + DIFFS[i].name, 2);
  }
  function trackStat(k, n) {
    var s = meta().stats;
    s[k] = (s[k] || 0) + n;
  }
  function paintAwards() {
    var panel = document.getElementById('awardpanel');
    if (!panel) return;
    var m = meta();
    var h = '<h2>🏆 Achievements</h2>';
    ACH_DEFS.forEach(function (a) {
      var got = !!m.ach[a[0]];
      h += '<div class="pitem">' + (got ? '🏆 ' : '🔒 ') + a[1] + '</div>';
    });
    h += '<h2>📊 Stats</h2>';
    var s = m.stats;
    h += '<div class="pitem">⛏️ Blocks mined: ' + (s.blocks || 0) + '</div>';
    h += '<div class="pitem">🚶 Distance: ' + Math.round(s.dist || 0) + 'm</div>';
    h += '<div class="pitem">💀 Deaths: ' + (s.deaths || 0) + '</div>';
    h += '<div class="pitem">🔥 Torches placed: ' + (s.torchesPlaced || 0) + '</div>';
    h += '<div class="pitem">🌀 Portals used: ' + (s.portalsUsed || 0) + '</div>';
    h += '<div class="pitem">⏱️ Playtime: ' + Math.round((s.playtime || 0) / 60) + 'm</div>';
    panel.innerHTML = h;
  }
  // ---------- mobs: wolves stalk, wisps drift (night forest / dark mine) ----------
  function mobCap() { return 4; }
  function wantMobs() {
    if (G.world === 1 || G.world === 3) return true;
    return dayFactor() < 0.15; // night forest + frost
  }
  function spawnMob(force) {
    var rng = new S.SeededRNG((Math.random() * 1e9) | 0);
    for (var t = 0; t < 12; t++) {
      var a = rng.nextDouble() * Math.PI * 2, r = 12 + rng.nextDouble() * 8;
      var x = Math.floor(G.px + Math.cos(a) * r), z = Math.floor(G.pz + Math.sin(a) * r);
      if (x < 1 || z < 1 || x >= G.W - 1 || z >= G.D - 1) continue;
      var gy = -1;
      for (var y = Math.min(G.H - 1, Math.floor(G.py) + 2); y >= 0; y--) {
        if (solidAt(x, y, z)) { gy = y + 1; break; }
      }
      if (gy < 1) continue;
      var roll = rng.nextDouble();
      var kind = roll < 0.4 ? 'wolf' : (roll < 0.75 ? 'wisp' : 'ghost');
      G.mobs.push({ kind: kind, x: x + 0.5, z: z + 0.5, y: gy + 0.3,
        hp: kind === 'wolf' ? 6 : 3, wx: x + 0.5, wz: z + 0.5, wait: 0, cool: 0, phase: rng.nextDouble() * 6 });
      return true;
    }
    return !!force;
  }
  function updateMobs(dt) {
    if (G.state !== 'play') return;
    G.mobT -= dt;
    if (G.mobT <= 0) {
      G.mobT = 6;
      var ghosts = 0;
      for (var gi = 0; gi < G.mobs.length; gi++) if (G.mobs[gi].kind === 'ghost') ghosts++;
      if (wantMobs() && G.mobs.length < mobCap() && ghosts < 2) spawnMob();
    }
    for (var i = G.mobs.length - 1; i >= 0; i--) {
      var m = G.mobs[i];
      m.cool -= dt;
      var dx = G.px - m.x, dz = G.pz - m.z;
      var dist = Math.hypot(dx, dz);
      var diff = DIFFS[meta().diff || 0] || DIFFS[1];
      var sp = (m.kind === 'wolf' ? 2.4 : 1.7) * diff.mobSpd;
      if (dist < 11) {
        if (dist > 0.9) {
          var nx = m.x + dx / dist * sp * dt, nz = m.z + dz / dist * sp * dt;
          if (!circleHits(nx, m.z, m.y)) m.x = nx;
          if (!circleHits(m.x, nz, m.y)) m.z = nz;
          if (m.kind === 'wisp') m.y += Math.sin(G.time * 3 + m.phase) * dt * 0.8;
        } else if (m.cool <= 0) {
          m.cool = 1.2;
          hurt(m.kind === 'wolf' ? 6 : 4, m.kind === 'wolf' ? 'mauled by a wolf' : 'stung by a wisp');
        }
      } else {
        // wander
        if (m.wait > 0) m.wait -= dt;
        else {
          var tx = m.wx - m.x, tz = m.wz - m.z;
          if (Math.hypot(tx, tz) < 0.6) {
            m.wait = 2 + Math.random() * 4;
            m.wx = m.x + (Math.random() - 0.5) * 12;
            m.wz = m.z + (Math.random() - 0.5) * 12;
          } else {
            var wnx = m.x + tx * dt * 0.8, wnz = m.z + tz * dt * 0.8;
            if (!circleHits(wnx, m.z, m.y)) m.x = wnx;
            if (!circleHits(m.x, wnz, m.y)) m.z = wnz;
          }
        }
      }
      // gravity for wolves (wisps hover)
      if (m.kind === 'wolf') {
        if (!solidAt(Math.floor(m.x), Math.floor(m.y - 0.1), Math.floor(m.z))) m.y -= 6 * dt;
      }
    }
  }

  /* ---- System 7: Advanced AI (ghost A* pathfinding, decision trees, pack coordination) ---- */
  function losClear(x0, y0, z0, x1, y1, z1) {
    var dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    var steps = Math.ceil(d * 2);
    for (var i = 1; i < steps; i++) {
      var t = i / steps;
      if (solidAt(Math.floor(x0 + dx * t), Math.floor(y0 + dy * t), Math.floor(z0 + dz * t))) return false;
    }
    return true;
  }
  function playerInLight() {
    for (var i = 0; i < G.torches.length; i++) {
      var T = G.torches[i];
      var dx = G.px - T.x, dz = G.pz - T.z;
      if (dx * dx + dz * dz < 30) return true;
    }
    return false;
  }
  function astar(sx, sz, tx, tz, yLevel) {
    var W = G.W, D = G.D;
    function walkable(x, z) {
      if (x < 1 || z < 1 || x >= W - 1 || z >= D - 1) return false;
      return !solidAt(x, yLevel, z) && !solidAt(x, yLevel + 1, z);
    }
    if (!walkable(tx, tz)) return null;
    var open = [{ x: sx, z: sz, g: 0, f: 0, p: null }];
    var seen = {};
    var iter = 0;
    while (open.length && iter++ < 800) {
      var bi = 0;
      for (var i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      var cur = open.splice(bi, 1)[0];
      var ck = cur.x + ',' + cur.z;
      if (seen[ck] !== undefined && seen[ck] <= cur.g) continue;
      seen[ck] = cur.g;
      if (cur.x === tx && cur.z === tz) {
        var path = [];
        while (cur) { path.push({ x: cur.x, z: cur.z }); cur = cur.p; }
        return path.reverse();
      }
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var d = 0; d < 4; d++) {
        var nx = cur.x + dirs[d][0], nz = cur.z + dirs[d][1];
        if (!walkable(nx, nz)) continue;
        var ng = cur.g + 1;
        var h = Math.abs(nx - tx) + Math.abs(nz - tz);
        open.push({ x: nx, z: nz, g: ng, f: ng + h, p: cur });
      }
    }
    return null;
  }
  function ghostGroundY(x, z) {
    for (var y = Math.min(G.H - 2, Math.floor(G.py) + 2); y >= 1; y--) {
      if (solidAt(x, y, z)) return y + 1;
    }
    return 1;
  }
  function updateGhostAI(dt) {
    var wolves = 0;
    for (var i = 0; i < G.mobs.length; i++) if (G.mobs[i].kind === 'wolf') wolves++;
    var gi = 0;
    for (var i = G.mobs.length - 1; i >= 0; i--) {
      var m = G.mobs[i];
      if (m.kind === 'ghost') {
        gi++;
        m.cool -= dt;
        m.repath = (m.repath === undefined ? 0 : m.repath) - dt;
        var dx = G.px - m.x, dz = G.pz - m.z;
        var dist = Math.hypot(dx, dz);
        var sp = 2.0;
        // decision tree
        var mode = 'patrol';
        if (dist < 2.5) mode = 'attack';
        else if (playerInLight() && dist < 6) mode = 'flee';
        else if (dist < 10 && losClear(m.x, m.y + 0.5, m.z, G.px, G.py + 1, G.pz)) mode = 'chase';
        if (mode === 'attack') {
          if (m.cool <= 0) {
            m.cool = 1.4;
            hurt(5, 'drained by a ghost');
            spawnGhost(m.x, m.y, m.z);
          }
        } else if (mode === 'flee') {
          var fx = m.x - dx / (dist || 1) * sp * dt, fz = m.z - dz / (dist || 1) * sp * dt;
          if (!circleHits(fx, m.z, m.y)) m.x = fx;
          if (!circleHits(m.x, fz, m.y)) m.z = fz;
        } else if (mode === 'chase') {
          if (m.repath <= 0 || !m.path || !m.path.length) {
            m.repath = 0.6;
            var gy = ghostGroundY(Math.floor(m.x), Math.floor(m.z));
            m.path = astar(Math.floor(m.x), Math.floor(m.z), Math.floor(G.px), Math.floor(G.pz), Math.floor(gy));
          }
          if (m.path && m.path.length > 1) {
            var wp = m.path[1];
            var wx = wp.x + 0.5, wz = wp.z + 0.5;
            var wdx = wx - m.x, wdz = wz - m.z;
            var wd = Math.hypot(wdx, wdz);
            if (wd < 0.3) m.path.shift();
            else {
              var nx = m.x + wdx / wd * sp * dt, nz = m.z + wdz / wd * sp * dt;
              if (!circleHits(nx, m.z, m.y)) m.x = nx;
              if (!circleHits(m.x, nz, m.y)) m.z = nz;
            }
          }
        } else {
          // patrol
          if (m.wait > 0) m.wait -= dt;
          else {
            var tx = m.wx - m.x, tz = m.wz - m.z;
            if (Math.hypot(tx, tz) < 0.6) {
              m.wait = 2 + Math.random() * 4;
              m.wx = m.x + (Math.random() - 0.5) * 12;
              m.wz = m.z + (Math.random() - 0.5) * 12;
            } else {
              var wnx = m.x + tx * dt * 0.6, wnz = m.z + tz * dt * 0.6;
              if (!circleHits(wnx, m.z, m.y)) m.x = wnx;
              if (!circleHits(m.x, wnz, m.y)) m.z = wnz;
            }
          }
        }
        m.y += Math.sin(G.time * 2.2 + m.phase) * dt * 0.5;
      } else if (m.kind === 'wolf') {
        // pack coordination: orbit offset per wolf
        m.packAngle = (gi++) * (Math.PI * 2 / Math.max(1, wolves));
        var pdx = G.px - m.x, pdz = G.pz - m.z;
        var pd = Math.hypot(pdx, pdz);
        if (pd < 11 && pd > 2.2) {
          var orbitR = 3.5;
          var tx2 = G.px + Math.cos(m.packAngle) * orbitR;
          var tz2 = G.pz + Math.sin(m.packAngle) * orbitR;
          var odx = tx2 - m.x, odz = tz2 - m.z;
          var od = Math.hypot(odx, odz);
          if (od > 0.4) {
            var sp2 = 2.4 * (meta().diff >= 2 ? 1.3 : 1);
            var nx2 = m.x + odx / od * sp2 * dt, nz2 = m.z + odz / od * sp2 * dt;
            if (!circleHits(nx2, m.z, m.y)) m.x = nx2;
            if (!circleHits(m.x, nz2, m.y)) m.z = nz2;
          }
        }
      } else if (m.kind === 'wisp') {
        // fear response: flee from torches
        for (var t = 0; t < G.torches.length; t++) {
          var T = G.torches[t];
          var tdx = m.x - T.x, tdz = m.z - T.z;
          var td = Math.hypot(tdx, tdz);
          if (td < 4 && td > 0.1) {
            var sp3 = 1.5;
            var fx3 = m.x + tdx / td * sp3 * dt, fz3 = m.z + tdz / td * sp3 * dt;
            if (!circleHits(fx3, m.z, m.y)) m.x = fx3;
            if (!circleHits(m.x, fz3, m.y)) m.z = fz3;
            break;
          }
        }
      }
    }
  }
  function circleHits(wx, wz, wy) {
    var r = 0.3, feet = wy === undefined ? G.py : wy;
    for (var ox = -1; ox <= 1; ox++) for (var oz = -1; oz <= 1; oz++) {
      var cx = Math.floor(wx) + ox, cz = Math.floor(wz) + oz;
      if (cx < 0 || cz < 0 || cx >= G.W || cz >= G.D) continue;
      // check all heights overlapped by a 1.2-tall body later; here: any solid column cell near feet
      var cy = Math.floor(feet);
      if (solidAt(cx, cy, cz) || solidAt(cx, cy + 1, cz)) {
        var nx = Math.max(cx, Math.min(wx, cx + 1)), nz = Math.max(cz, Math.min(wz, cz + 1));
        var ddx = wx - nx, ddz = wz - nz;
        if (ddx * ddx + ddz * ddz < r * r) return true;
      }
    }
    return false;
  }
  function hurt(n, cause) {
    if (G.state !== 'play') return;
    AudioSys.hurt();
    var diff = DIFFS[meta().diff || 0] || DIFFS[1];
    meta().hp -= Math.max(1, Math.round(n * diff.dmg));
    flash('-' + n + ' HP' + (cause ? ' (' + cause + ')' : ''), 1.5);
    if (meta().hp <= 0) die(cause || 'the wilds');
    else renderHUD();
  }
  function die(cause) {
    G.state = 'dead';
    trackStat('deaths', 1);
    var lost = Math.floor(meta().gold * 0.1);
    meta().gold -= lost;
    saveMeta();
    overlay.classList.remove('hidden');
    hud('overlay-title').textContent = '☠️ You died (' + cause + ')';
    hud('overlay-text').textContent = 'Lost ' + lost + ' gold. Score ' + S.compact(G.score) + '. The wilds are unforgiving after dark.';
    hud('overlay-btn').textContent = 'Respawn';
    hud('overlay-btn').onclick = function () {
      hideOverlay();
      meta().hp = meta().maxHp;
      G.mobs = [];
      genWorld(); buildAll();
      G.state = 'play';
      renderHUD();
    };
    hud('overlay-btn2').style.display = 'none';
  }
  function lookDir() {
    var cp = Math.cos(G.pitch);
    return [Math.sin(G.yaw) * cp, Math.sin(G.pitch), -Math.cos(G.yaw) * cp];
  }
  function targetBlock() {
    var e = eyePos(), d = lookDir();
    return S.voxelRay(e, d, 6, solidAt);
  }
  function hitMob(mb) {
    var dmg = S.PICKS[meta().pickIdx].speed;
    mb.hp -= dmg;
    spawnBurst(mb.x, mb.y + 0.5, mb.z, mb.kind === 'wolf' ? '#6b4e2e' : '#59e6ff');
    if (mb.hp > 0) {
      flash(mb.kind === 'wolf' ? 'Wolf hit!' : 'Wisp hit!', 0.8);
      return;
    }
    G.mobs.splice(G.mobs.indexOf(mb), 1);
    meta().stats.kills++;
    checkQuests('kill', 1);
    if (mb.halloween) killHalloweenMob(mb);
    if (mb.kind === 'wolf') {
      meta().gold += 10;
      meta().stats.goldRun += 10;
      flash('Wolf driven off! +10 gold');
    } else {
      meta().gold += 5;
      meta().stats.goldRun += 5;
      gainXP(15);
      flash('Wisp dissipated! +5 gold, +15 XP');
    }
    checkObjectives();
    saveMeta(); renderHUD();
  }
  function swing() {
    var mE = meta();
    // melee: nearest mob within reach in the facing hemisphere
    var e = eyePos();
    var fhx = Math.sin(G.yaw), fhz = -Math.cos(G.yaw);
    var best = null, bscore = 1e9;
    for (var mi = 0; mi < G.mobs.length; mi++) {
      var mb = G.mobs[mi];
      var mdx = mb.x - e[0], mdz = mb.z - e[2];
      var hdist = Math.hypot(mdx, mdz);
      if (hdist > 3.0) continue;
      var fwd = (mdx * fhx + mdz * fhz) / (hdist || 1);
      if (fwd < 0.3) continue;
      var mdy = Math.abs((mb.y + 0.5) - e[1]);
      if (mdy > 2.2) continue;
      var sc = hdist - fwd;
      if (sc < bscore) { best = mb; bscore = sc; }
    }
    G.swingT = 0;
    AudioSys.swing();
    if (best) { hitMob(best); return; }
    var hit = targetBlock();
    if (!hit) return;
    var key = hit.x + ',' + hit.y + ',' + hit.z;
    var ore = VOX[G.blocks[key]];
    if (!ore || ore.tier >= 99) { flash(ore ? ore.name + ' is unbreakable.' : '', 1.2); return; }
    if (ore.tier > meta().pickIdx) { flash('Too tough — needs ' + S.PICKS[ore.tier].name, 1.5); return; }
    var hp = (G.dmg[key] !== undefined ? G.dmg[key] : ore.hp) - S.PICKS[meta().pickIdx].speed;
    if (hp > 0) { G.dmg[key] = hp; return; }
    delete G.dmg[key];
    AudioSys.break();
    checkQuests('collect', 1);
    breakHalloweenBlock(ore.key, hit.x, hit.y, hit.z);
    if (ore.coal) {
      delete G.blocks[key];
      spawnBurst(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, ore.color);
      var m0 = meta();
      m0.coal = (m0.coal || 0) + 1;
      G.broken++;
      trackStat('blocks', 1);
      meta().stats.coalRun++;
      if (m0.coal >= 20) ach('coal-20', 'Coal Baron');
      checkObjectives();
      saveMeta(); renderHUD(); rebuildAround(hit.x, hit.y, hit.z);
      return;
    }
    if ((ore.gold > 0 || ore.xp > 0) && G.pack >= G.packCap) {
      flash('Backpack full — sell first!');
      return;
    }
    delete G.blocks[key];
    spawnBurst(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, ore.color);
    var m = meta();
    G.broken++;
    trackStat('blocks', 1);
    if (ore.key === 'wood') {
      m.wood = (m.wood || 0) + 1;
      gainXP(2);
    } else if (ore.key === 'leaves') {
      if (Math.random() < 0.12) {
        m.apples = (m.apples || 0) + 1;
        flash('🍎 Apple!');
      }
      gainXP(1);
    } else if (ore.gold > 0 || ore.xp > 0) {
      G.pack++;
      G.sellValue += ore.gold;
      gainXP(ore.xp);
      G.score += ore.gold;
    } else gainXP(1);
    if (G.broken >= 10) ach('mine-10', 'Ore Hauled');
    saveMeta(); renderHUD(); rebuildAround(hit.x, hit.y, hit.z);
  }
  function sellPack() {
    var woodCount = meta().wood || 0;
    if (G.sellValue <= 0 && woodCount <= 0) { flash('Backpack empty — break some ore!'); return; }
    var g = G.sellValue + woodCount; // timber sells 1g each; coal stays banked
    meta().gold += g;
    meta().stats.goldRun += g;
    meta().wood = 0;
    G.pack = 0; G.sellValue = 0;
    flash('Sold for ' + g + ' gold. Coal stays banked: ' + (meta().coal || 0));
    checkObjectives();
    saveMeta(); renderHUD();
  }
  function eatApple() {
    var m = meta();
    if ((m.apples || 0) <= 0) { flash('No apples — shake some leaves!'); return; }
    if (m.hp >= m.maxHp) { flash('HP already full!'); return; }
    m.apples--;
    m.hp = Math.min(m.maxHp, m.hp + 25);
    flash('🍎 +25 HP');
    saveMeta(); renderHUD();
  }
  function craftTorch() {
    var m = meta();
    if ((m.coal || 0) < 1 || (m.wood || 0) < 1) { flash('Torch needs 1 coal + 1 wood'); return; }
    m.coal--;
    m.wood--;
    m.torchesInv = (m.torchesInv || 0) + 4;
    meta().stats.torchesMade += 4;
    checkQuests('craft', 4);
    flash('🔥 +4 torches (T / right-click to place)');
    checkObjectives();
    saveMeta(); renderHUD();
  }
  function placeTorch() {
    var m = meta();
    if ((m.torchesInv || 0) <= 0) { flash('No torches — craft some! (1 coal + 1 wood)'); return; }
    if (G.torches.length >= 24) { flash('Too many torches burning already!'); return; }
    var e = eyePos(), d = lookDir();
    var hit = S.voxelRay(e, d, 6, solidAt);
    if (!hit) return;
    var px = hit.x + hit.nx, py = hit.y + hit.ny, pz = hit.z + hit.nz;
    if (px < 0 || pz < 0 || py < 0 || px >= G.W || pz >= G.D || py >= G.H) return;
    if (solidAt(px, py, pz)) return;
    m.torchesInv--;
    trackStat('torchesPlaced', 1);
    G.torches.push({ x: px + 0.5, y: py + 0.5, z: pz + 0.5 });
    buildGlow();
    buildAll();
    flash('🔥 Torch placed');
    saveMeta(); renderHUD();
  }
  function buyPick() {
    var next = S.PICKS[meta().pickIdx + 1];
    if (!next) { flash('Void Drill is max!'); return; }
    if ((meta().coal || 0) < next.cost) { flash('Needs ' + next.cost + ' coal'); return; }
    meta().coal -= next.cost;
    meta().pickIdx++;
    flash('Forged ' + next.name + '!');
    if (meta().pickIdx === 1) ach('first-pick', 'New Edge');
    if (next.name === 'Void Drill') ach('void-drill', 'Maximum Spin');
    saveMeta(); renderHUD();
  }

  // ---------- HUD/overlay/tabs ----------
  var flashMsg = '', flashT = 0;
  function flash(msg, dur) { flashMsg = msg; flashT = dur || 2.2; }
  function hud(id) { return document.getElementById(id); }
  function renderHUD() {
    var m = meta();
    hud('score').textContent = S.compact(G.score);
    hud('depth').textContent = (PHYS[G.world] || PHYS[0]).name;
    hud('gold').textContent = S.compact(m.gold);
    var co = hud('coal'); if (co) co.textContent = m.coal || 0;
    hud('level').textContent = m.level;
    hud('pick').textContent = S.PICKS[m.pickIdx].name;
    hud('candy').textContent = G.pack + '/' + G.packCap;
    var hp = hud('hp'), wd = hud('wood'), ap = hud('apples'), tc = hud('torches'), ck = hud('clock');
    if (hp) hp.textContent = Math.max(0, m.hp) + '/' + m.maxHp;
    if (wd) wd.textContent = m.wood || 0;
    if (ap) ap.textContent = m.apples || 0;
    if (tc) tc.textContent = m.torchesInv || 0;
    if (ck) {
      var PH = PHYS[G.world] || PHYS[0];
      var t = G.dayT;
      var icon = !PH.day ? (G.world === 3 ? '🔮' : '⛏️') : (dayFactor() > 0.6 ? '☀️' : (dayFactor() > 0.05 ? '🌤️' : '🌙'));
      ck.textContent = icon + ' ' + Math.floor(t * 24) + ':00';
    }
    renderHalloweenHUD();
  }
  var overlay = document.getElementById('overlay');
  function showShop() {
    var m = meta(), next = S.PICKS[m.pickIdx + 1];
    hud('overlay-title').textContent = '⛏️ Field Shop';
    hud('overlay-text').textContent = 'Gold ' + m.gold + ' · Coal ' + (m.coal || 0) + ' · Pack ' +
      G.pack + '/' + G.packCap + ' (sell ' + G.sellValue + ')' +
      (next ? ' · Next: ' + next.name + ' (' + next.cost + ' coal)' : ' · Void Drill maxed');
    var b1 = hud('overlay-btn'), b2 = hud('overlay-btn2');
    b1.textContent = 'Sell pack';
    b1.onclick = function () { sellPack(); showShop(); };
    b2.style.display = '';
    b2.textContent = next ? 'Buy ' + next.name : 'Close';
    b2.onclick = function () { if (next) buyPick(); showShop(); };
    var sk = document.createElement('div');
    sk.innerHTML = '<h3 style="margin:8px 0 4px">🎨 Pick Skins</h3>' + SKINS.map(function (s, i) {
      var owned = (m.skins || []).indexOf(i) >= 0;
      var equipped = m.skinIdx === i;
      return '<button style="display:inline-block;margin:2px;padding:4px 8px;cursor:pointer;border:1px solid ' + (equipped ? '#ffd166' : '#444') + '" onclick="window.__voxelBuySkin(' + i + ')">' +
        s.name + (equipped ? ' ✓' : owned ? ' (owned)' : ' — ' + s.cost + 'g') + '</button>';
    }).join('');
    hud('overlay-text').appendChild(sk);
    overlay.classList.remove('hidden');
  }
  function hideOverlay() { overlay.classList.add('hidden'); }

  function profile() {
    return {
      gold: function () { return meta().gold; },
      addGold: function (n) { meta().gold += n; saveMeta(); renderHUD(); },
      spendGold: function (n) { if (meta().gold < n) return false; meta().gold -= n; saveMeta(); renderHUD(); return true; },
      coal: function () { return meta().coal || 0; },
      addCoal: function (n) { meta().coal = (meta().coal || 0) + n; saveMeta(); renderHUD(); },
      spendCoal: function (n) { if ((meta().coal || 0) < n) return false; meta().coal -= n; saveMeta(); renderHUD(); return true; },
      level: function () { return meta().level; },
      pickIdx: function () { return meta().pickIdx; },
      setPick: function (i) { meta().pickIdx = i; saveMeta(); renderHUD(); },
      pickDamage: function () { return S.PICKS[meta().pickIdx].speed; },
      goldMult: function () { return 1; },
      gainXP: gainXP,
      addScore: function (n) { G.score += n; renderHUD(); },
      unlock: function (id, name) { ach(id, name); },
      flash: flash,
      hud: renderHUD
    };
  }

  /* ---- System 3: Dynamic horror lighting (god rays, fake bloom) ---- */
  function drawBeams() {
    var BP = [], BC = [];
    function beamQuad(x, y, z, h, w, r, g, b, a) {
      var dx = x - G.px, dz = z - G.pz;
      var l = Math.hypot(dx, dz) || 1;
      var px = -dz / l * w, pz = dx / l * w;
      var y0 = y, y1 = y + h;
      BP.push(x - px, y0, z - pz, x + px, y0, z + pz, x + px, y1, z + pz);
      BP.push(x - px, y0, z - pz, x + px, y1, z + pz, x - px, y1, z - pz);
      for (var i = 0; i < 6; i++) BC.push(r * a, g * a, b * a);
    }
    var i, j;
    for (i = 0; i < G.torches.length; i++) {
      var T = G.torches[i];
      var d2 = (T.x - G.px) * (T.x - G.px) + (T.z - G.pz) * (T.z - G.pz);
      if (d2 > 400) continue;
      beamQuad(T.x, T.y - 0.3, T.z, 2.2, 0.5, 1.0, 0.72, 0.35, 0.10);
    }
    for (i = 0; i < (G.portals || []).length; i++) {
      var p = G.portals[i];
      var dd = (p.x - G.px) * (p.x - G.px) + (p.z - G.pz) * (p.z - G.pz);
      if (dd > 500) continue;
      var tc = [1, 0.5, 1];
      for (j = 0; j < PORTAL_TYPES.length; j++) if (PORTAL_TYPES[j].key === p.type) tc = PORTAL_TYPES[j].col;
      beamQuad(p.x, p.y, p.z, 2.6, 0.7, tc[0], tc[1], tc[2], 0.12);
    }
    for (i = 0; i < (G.lightSources || []).length; i++) {
      var ls = G.lightSources[i];
      if (!ls.lava) continue;
      var ld = (ls.x - G.px) * (ls.x - G.px) + (ls.z - G.pz) * (ls.z - G.pz);
      if (ld > 500) continue;
      beamQuad(ls.x, ls.y + 0.2, ls.z, 3.2, 0.9, 1.0, 0.45, 0.1, 0.08);
    }
    if (!BP.length) return null;
    return { n: BP.length / 3, pos: buf(BP, 3, 'aPos'), col: buf(BC, 3, 'aCol') };
  }
  function drawBloom() {
    var BP = [], BC = [];
    function blob(x, y, z, s, r, g, b) {
      var dx = x - G.px, dy = y - (G.py + 1.2), dz = z - G.pz;
      var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > 26 || d < 0.01) return;
      var fade = 1 / (1 + d * 0.10);
      var fx = dx / d, fy = dy / d, fz = dz / d;
      var rx = -fz, rz = fx;
      var rl = Math.sqrt(rx * rx + rz * rz) || 1; rx /= rl; rz /= rl;
      var ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
      var ul = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1; ux /= ul; uy /= ul; uz /= ul;
      var corners = [[-1, -1, 1], [1, -1, 0.4], [1, 1, 0.12], [-1, 1, 0.4]];
      var order = [0, 1, 2, 0, 2, 3];
      for (var i = 0; i < 6; i++) {
        var ci = corners[order[i]];
        BP.push(x + rx * ci[0] * s + ux * ci[1] * s,
                y + uy * ci[1] * s,
                z + rz * ci[0] * s + uz * ci[1] * s);
        var a = ci[2] * fade;
        BC.push(r * a, g * a, b * a);
      }
    }
    var i, j;
    for (i = 0; i < G.torches.length; i++) {
      var T = G.torches[i];
      blob(T.x, T.y + 0.1, T.z, 0.55, 1.0, 0.75, 0.4);
    }
    for (i = 0; i < (G.portals || []).length; i++) {
      var p = G.portals[i];
      var tc = [1, 0.5, 1];
      for (j = 0; j < PORTAL_TYPES.length; j++) if (PORTAL_TYPES[j].key === p.type) tc = PORTAL_TYPES[j].col;
      blob(p.x, p.y + 1, p.z, 0.9, tc[0], tc[1], tc[2]);
    }
    for (i = 0; i < (G.lightSources || []).length; i++) {
      var ls = G.lightSources[i];
      var ddx = ls.x - G.px, ddz = ls.z - G.pz;
      if (ddx * ddx + ddz * ddz > 500) continue;
      if (ls.lava) blob(ls.x, ls.y + 0.3, ls.z, 0.8, 1.0, 0.42, 0.08);
      else blob(ls.x, ls.y, ls.z, 0.7, 0.65, 0.45, 1.0);
    }
    if (!BP.length) return null;
    return { n: BP.length / 3, pos: buf(BP, 3, 'aPos'), col: buf(BC, 3, 'aCol') };
  }

  /* ---- System 6: Sophisticated audio (spatial, reverb, procedural horror) ---- */
  var AudioSys = {
    ctx: null, master: null, verb: null, verbGain: null, ambGain: null, started: false,
    init: function () {
      if (this.started) return;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        var len = Math.floor(this.ctx.sampleRate * 1.8);
        var ir = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
        for (var c = 0; c < 2; c++) {
          var d = ir.getChannelData(c);
          for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
        }
        this.verb = this.ctx.createConvolver();
        this.verb.buffer = ir;
        this.verbGain = this.ctx.createGain();
        this.verbGain.gain.value = 0.35;
        this.verb.connect(this.verbGain);
        this.verbGain.connect(this.master);
        this.started = true;
        this.startAmbient();
      } catch (e) {}
    },
    startAmbient: function () {
      if (!this.ctx || this.ambGain) return;
      var ctx = this.ctx;
      this.ambGain = ctx.createGain();
      this.ambGain.gain.value = 0.05;
      this.ambGain.connect(this.master);
      this.ambGain.connect(this.verb);
      [52, 52.7, 104.3].forEach(function (f, i) {
        var o = ctx.createOscillator();
        o.type = i === 2 ? 'triangle' : 'sine';
        o.frequency.value = f;
        var g = ctx.createGain();
        g.gain.value = i === 2 ? 0.12 : 0.3;
        var lfo = ctx.createOscillator();
        lfo.frequency.value = 0.05 + i * 0.03;
        var lg = ctx.createGain();
        lg.gain.value = 0.15;
        lfo.connect(lg); lg.connect(g.gain);
        o.connect(g); g.connect(AudioSys.ambGain);
        o.start(); lfo.start();
      });
      var nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      var nd = nb.getChannelData(0);
      for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      var ns = ctx.createBufferSource();
      ns.buffer = nb; ns.loop = true;
      var nf = ctx.createBiquadFilter();
      nf.type = 'bandpass'; nf.frequency.value = 300; nf.Q.value = 0.6;
      var ng = ctx.createGain(); ng.gain.value = 0.25;
      var nlfo = ctx.createOscillator(); nlfo.frequency.value = 0.07;
      var nlg = ctx.createGain(); nlg.gain.value = 120;
      nlfo.connect(nlg); nlg.connect(nf.frequency);
      ns.connect(nf); nf.connect(ng); ng.connect(AudioSys.ambGain);
      ns.start(); nlfo.start();
    },
    ambient: function (boost) {
      if (this.ambGain && this.ctx) this.ambGain.gain.setTargetAtTime(boost ? 0.12 : 0.05, this.ctx.currentTime, 1.5);
    },
    spatial: function (x, y, z) {
      var dx = x - G.px, dy = y - G.py, dz = z - G.pz;
      var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      var g = 1 / (1 + d * 0.18);
      var pan = Math.max(-0.9, Math.min(0.9, dx / (d || 1)));
      return { g: g, pan: pan };
    },
    out: function (x, y, z, dry) {
      if (!this.ctx) return null;
      var s = this.spatial(x, y, z);
      var g = this.ctx.createGain();
      g.gain.value = s.g;
      var p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (p) { p.pan.value = s.pan; g.connect(p); p.connect(this.master); if (dry !== false) { var vg = this.ctx.createGain(); vg.gain.value = 0.5; p.connect(vg); vg.connect(this.verb); } }
      else { g.connect(this.master); }
      return g;
    },
    tone: function (dest, f0, f1, dur, type, vol) {
      var ctx = this.ctx;
      var o = ctx.createOscillator();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f0, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), ctx.currentTime + dur);
      var g = ctx.createGain();
      g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(dest);
      o.start(); o.stop(ctx.currentTime + dur + 0.05);
    },
    noise: function (dest, dur, freq, vol) {
      var ctx = this.ctx;
      var nb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      var d = nb.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      var s = ctx.createBufferSource();
      s.buffer = nb;
      var f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = freq || 800; f.Q.value = 1;
      var g = ctx.createGain(); g.gain.value = vol || 0.2;
      s.connect(f); f.connect(g); g.connect(dest);
      s.start();
    },
    swing: function () { if (this.ctx) this.noise(this.master, 0.12, 1200, 0.12); },
    break: function () { if (this.ctx) { this.noise(this.master, 0.1, 2000, 0.18); this.tone(this.master, 300, 90, 0.08, 'square', 0.08); } },
    hurt: function () { if (this.ctx) this.tone(this.master, 200, 55, 0.3, 'sine', 0.3); },
    portal: function () { if (this.ctx) { this.tone(this.master, 200, 900, 0.7, 'sine', 0.15); this.tone(this.master, 305, 1350, 0.7, 'triangle', 0.08); } },
    level: function () { if (this.ctx) { var t = this.master; this.tone(t, 440, 440, 0.12, 'triangle', 0.15); var s = this; setTimeout(function () { s.tone(t, 554, 554, 0.12, 'triangle', 0.15); }, 110); setTimeout(function () { s.tone(t, 659, 659, 0.2, 'triangle', 0.15); }, 220); } },
    quest: function () { if (this.ctx) this.tone(this.master, 880, 1320, 0.25, 'sine', 0.15); },
    click: function () { if (this.ctx) this.tone(this.master, 600, 500, 0.05, 'square', 0.06); },
    drip: function (x, y, z) { if (this.ctx) { var o = this.out(x, y, z); if (o) this.tone(o, 900 + Math.random() * 400, 300, 0.15, 'sine', 0.1); } },
    moan: function (x, y, z) { if (this.ctx) { var o = this.out(x, y, z); if (o) this.tone(o, 90 + Math.random() * 40, 60, 1.6, 'sawtooth', 0.05); } }
  };

  /* ---- Halloween Feature Pack ---- */
  // Pumpkin & Jack-o-Lantern blocks
  VOX.pumpkin = { key: 'pumpkin', name: 'Pumpkin', emoji: '🎃', color: '#e87d1e', hp: 2, gold: 3, xp: 3, tier: 0, portalTarget: null, gravity: 1.0 };
  VOX.jackolantern = { key: 'jackolantern', name: 'Jack-o-Lantern', emoji: '🎃', color: '#ff9d2e', hp: 2, gold: 4, xp: 4, tier: 0, emis: 1, portalTarget: null, gravity: 1.0 };
  VOX.candycorn = { key: 'candycorn', name: 'Candy Corn', emoji: '🍬', color: '#ffcc00', hp: 1, gold: 2, xp: 2, tier: 0, portalTarget: null, gravity: 1.0 };
  VOX.spiderweb = { key: 'spiderweb', name: 'Spider Web', emoji: '🕸️', color: '#e8e8e8', hp: 1, gold: 0, xp: 1, tier: 0, portalTarget: null, gravity: 0.5 };
  VOX.coffin = { key: 'coffin', name: 'Coffin', emoji: '⚰️', color: '#4a3728', hp: 3, gold: 5, xp: 5, tier: 0, portalTarget: null, gravity: 1.0 };
  VOX.tombstone = { key: 'tombstone', name: 'Tombstone', emoji: '🪦', color: '#8a8a8a', hp: 2, gold: 2, xp: 2, tier: 0, portalTarget: null, gravity: 1.0 };
  VOX.witchhat = { key: 'witchhat', name: 'Witch Hat', emoji: '🧙', color: '#2d1b4e', hp: 1, gold: 8, xp: 6, tier: 1, portalTarget: null, gravity: 0.8 };
  VOX.soullantern = { key: 'soullantern', name: 'Soul Lantern', emoji: '🏮', color: '#66ffcc', hp: 2, gold: 10, xp: 8, tier: 1, emis: 1, portalTarget: null, gravity: 1.0 };
  VOX.candycane = { key: 'candycane', name: 'Candy Cane', emoji: '🍭', color: '#ff3366', hp: 1, gold: 3, xp: 2, tier: 0, portalTarget: null, gravity: 1.0 };
  VOX.hauntedportrait = { key: 'hauntedportrait', name: 'Haunted Portrait', emoji: '🖼️', color: '#3d2b1f', hp: 2, gold: 6, xp: 5, tier: 0, portalTarget: null, gravity: 1.0 };
  VOX.boneblock = { key: 'boneblock', name: 'Bone Block', emoji: '🦴', color: '#f5f5dc', hp: 2, gold: 2, xp: 2, tier: 0, portalTarget: null, gravity: 1.0 };
  VOX.werewolfclaw = { key: 'werewolfclaw', name: 'Werewolf Claw', emoji: '🐺', color: '#4a4a4a', hp: 3, gold: 12, xp: 10, tier: 1, portalTarget: null, gravity: 1.0 };
  VOX.vampirefang = { key: 'vampirefang', name: 'Vampire Fang', emoji: '🧛', color: '#8b0000', hp: 3, gold: 15, xp: 12, tier: 1, portalTarget: null, gravity: 1.0 };
  VOX.ghostessence = { key: 'ghostessence', name: 'Ghost Essence', emoji: '👻', color: '#e0e0ff', hp: 1, gold: 20, xp: 15, tier: 2, emis: 1, portalTarget: null, gravity: 0.3 };
  VOX.witchbrew = { key: 'witchbrew', name: 'Witch Brew', emoji: '🧪', color: '#00ff88', hp: 1, gold: 25, xp: 20, tier: 2, emis: 1, portalTarget: null, gravity: 0.5 };
  VOX.cursedbone = { key: 'cursedbone', name: 'Cursed Bone', emoji: '💀', color: '#2f2f2f', hp: 4, gold: 30, xp: 25, tier: 2, portalTarget: null, gravity: 1.0 };
  VOX.pumpkinpie = { key: 'pumpkinpie', name: 'Pumpkin Pie', emoji: '🥧', color: '#d4a574', hp: 1, gold: 5, xp: 5, tier: 0, portalTarget: null, gravity: 1.0 };
  VOX.caramelapple = { key: 'caramelapple', name: 'Caramel Apple', emoji: '🍎', color: '#c68e17', hp: 1, gold: 4, xp: 4, tier: 0, portalTarget: null, gravity: 1.0 };
  VOX.ectoplasm = { key: 'ectoplasm', name: 'Ectoplasm', emoji: '💚', color: '#39ff14', hp: 1, gold: 18, xp: 14, tier: 2, emis: 1, portalTarget: null, gravity: 0.2 };
  VOX.shadowstone = { key: 'shadowstone', name: 'Shadow Stone', emoji: '⬛', color: '#1a0a2e', hp: 5, gold: 35, xp: 30, tier: 3, portalTarget: null, gravity: 1.0 };
  VOX.bloodrose = { key: 'bloodrose', name: 'Blood Rose', emoji: '🥀', color: '#8b0000', hp: 1, gold: 8, xp: 6, tier: 1, portalTarget: null, gravity: 0.8 };
  VOX.midnightorchid = { key: 'midnightorchid', name: 'Midnight Orchid', emoji: '🌸', color: '#4b0082', hp: 1, gold: 12, xp: 10, tier: 1, portalTarget: null, gravity: 0.8 };

  // PBR params for Halloween blocks
  PBR.pumpkin = [0, 0.7, 0.1, 0];
  PBR.jackolantern = [0, 0.5, 0, 1.0];
  PBR.candycorn = [0.1, 0.4, 0.3, 0];
  PBR.spiderweb = [0, 0.95, 0, 0];
  PBR.coffin = [0, 0.8, 0.1, 0];
  PBR.tombstone = [0.05, 0.85, 0, 0];
  PBR.witchhat = [0, 0.75, 0.2, 0];
  PBR.soullantern = [0.2, 0.3, 0.5, 1.2];
  PBR.candycane = [0.1, 0.5, 0.4, 0];
  PBR.hauntedportrait = [0, 0.85, 0, 0];
  PBR.boneblock = [0.1, 0.7, 0.1, 0];
  PBR.werewolfclaw = [0.3, 0.4, 0.3, 0];
  PBR.vampirefang = [0.4, 0.3, 0.4, 0];
  PBR.ghostessence = [0.5, 0.2, 0.6, 1.0];
  PBR.witchbrew = [0.3, 0.2, 0.5, 1.2];
  PBR.cursedbone = [0.2, 0.6, 0.2, 0];
  PBR.pumpkinpie = [0, 0.8, 0, 0];
  PBR.caramelapple = [0.1, 0.5, 0.3, 0];
  PBR.ectoplasm = [0.4, 0.15, 0.6, 1.3];
  PBR.shadowstone = [0.15, 0.9, 0, 0];
  PBR.bloodrose = [0, 0.7, 0.1, 0];
  PBR.midnightorchid = [0, 0.65, 0.15, 0];

  // Costume system
  var COSTUMES = [
    { name: 'Ghost', emoji: '👻', bonus: 'speed', mult: 1.3, cost: 0 },
    { name: 'Vampire', emoji: '🧛', bonus: 'lifesteal', mult: 0.1, cost: 200 },
    { name: 'Witch', emoji: '🧙', bonus: 'luck', mult: 1.5, cost: 350 },
    { name: 'Skeleton', emoji: '💀', bonus: 'defense', mult: 0.5, cost: 500 },
    { name: 'Pumpkin King', emoji: '🎃', bonus: 'gold', mult: 1.4, cost: 800 },
    { name: 'Reaper', emoji: '☠️', bonus: 'damage', mult: 1.5, cost: 1200 },
    { name: 'Werewolf', emoji: '🐺', bonus: 'nightvision', mult: 1, cost: 1500 },
    { name: 'Phantom', emoji: '👤', bonus: 'invisibility', mult: 0.3, cost: 2000 }
  ];

  // Enchantment system
  var ENCHANTS = [
    { id: 'soul_harvest', name: 'Soul Harvest', emoji: '💜', desc: '+20% soul drops', cost: 100, max: 3 },
    { id: 'cursed_edge', name: 'Cursed Edge', emoji: '🗡️', desc: '+30% damage', cost: 150, max: 3 },
    { id: 'vampiric', name: 'Vampiric', emoji: '🩸', desc: 'Heal 10% of damage', cost: 200, max: 2 },
    { id: 'ghost_touch', name: 'Ghost Touch', emoji: '👻', desc: '+25% XP gain', cost: 120, max: 3 },
    { id: 'pumpkin_fury', name: 'Pumpkin Fury', emoji: '🎃', desc: '+15% swing speed', cost: 80, max: 3 },
    { id: 'shadow_step', name: 'Shadow Step', emoji: '🌑', desc: '+20% move speed', cost: 180, max: 2 },
    { id: 'witch_sight', name: 'Witch Sight', emoji: '🔮', desc: 'See ores through walls', cost: 250, max: 1 },
    { id: 'reapers_call', name: "Reaper's Call", emoji: '💀', desc: '+50% mob drops', cost: 300, max: 2 }
  ];

  // Potion system
  var POTIONS = [
    { id: 'healing', name: 'Healing Draught', emoji: '❤️', color: '#ff4444', dur: 30, cost: 50 },
    { id: 'speed', name: 'Swiftness Brew', emoji: '⚡', color: '#ffff44', dur: 45, cost: 40 },
    { id: 'strength', name: 'Strength Elixir', emoji: '💪', color: '#ff8844', dur: 40, cost: 60 },
    { id: 'nightvision', name: 'Night Vision', emoji: '👁️', color: '#44ff44', dur: 60, cost: 45 },
    { id: 'luck', name: 'Liquid Luck', emoji: '🍀', color: '#44ffff', dur: 50, cost: 70 },
    { id: 'fire_resist', name: 'Fire Resistance', emoji: '🔥', color: '#ff4400', dur: 40, cost: 55 },
    { id: 'invisibility', name: 'Invisibility', emoji: '👻', color: '#cccccc', dur: 25, cost: 100 },
    { id: 'soul_shield', name: 'Soul Shield', emoji: '🛡️', color: '#aa44ff', dur: 35, cost: 90 }
  ];

  // Trick or Treat events
  var TRICKS = [
    { msg: '🎃 A pumpkin explodes! -10 HP', effect: 'damage', val: 10 },
    { msg: '👻 Ghosts swarm you! -20 HP', effect: 'ghosts', val: 5 },
    { msg: '🕷️ Spider web! Slowed!', effect: 'slow', val: 5 },
    { msg: '💀 Curse! -30 gold', effect: 'gold_loss', val: 30 },
    { msg: '🌑 Darkness falls!', effect: 'dark', val: 10 },
    { msg: '🧛 Vampire bite! -15 HP', effect: 'damage', val: 15 },
    { msg: '🕸️ Webs everywhere!', effect: 'webs', val: 3 },
    { msg: '💜 Soul drain! -5 XP', effect: 'xp_loss', val: 5 }
  ];
  var TREATS = [
    { msg: '🍬 Candy! +15 gold', effect: 'gold', val: 15 },
    { msg: '🎃 Pumpkin treat! +25 gold', effect: 'gold', val: 25 },
    { msg: '🍫 Chocolate! +20 HP', effect: 'heal', val: 20 },
    { msg: '🧪 Mystery potion!', effect: 'potion', val: 1 },
    { msg: '💜 Soul candy! +30 XP', effect: 'xp', val: 30 },
    { msg: '🌟 Star treat! +50 gold', effect: 'gold', val: 50 },
    { msg: '🎭 Mask of power! +10 damage', effect: 'buff', val: 10 },
    { msg: '🔮 Crystal ball! Reveal ores!', effect: 'reveal', val: 1 }
  ];

  // Halloween shop items
  var HALLOWEEN_SHOP = [
    { id: 'pumpkin', name: 'Pumpkin', emoji: '🎃', cost: 20, desc: 'Carve into Jack-o-Lantern' },
    { id: 'candycorn', name: 'Candy Corn', emoji: '🍬', cost: 10, desc: 'Sweet Halloween treat' },
    { id: 'spiderweb', name: 'Spider Web', emoji: '🕸️', cost: 15, desc: 'Slows enemies' },
    { id: 'coffin', name: 'Coffin', emoji: '⚰️', cost: 100, desc: 'Spooky decoration' },
    { id: 'tombstone', name: 'Tombstone', emoji: '🪦', cost: 30, desc: 'Graveyard decor' },
    { id: 'witchhat', name: 'Witch Hat', emoji: '🧙', cost: 150, desc: 'Wear for luck bonus' },
    { id: 'soullantern', name: 'Soul Lantern', emoji: '🏮', cost: 200, desc: 'Ethereal light source' },
    { id: 'candycane', name: 'Candy Cane', emoji: '🍭', cost: 25, desc: 'Festive decoration' },
    { id: 'hauntedportrait', name: 'Haunted Portrait', emoji: '🖼️', cost: 80, desc: 'Spooky wall art' },
    { id: 'boneblock', name: 'Bone Block', emoji: '🦴', cost: 40, desc: 'Build with bones' },
    { id: 'pumpkinpie', name: 'Pumpkin Pie', emoji: '🥧', cost: 35, desc: 'Heals 40 HP' },
    { id: 'caramelapple', name: 'Caramel Apple', emoji: '🍎', cost: 20, desc: 'Heals 15 HP' },
    { id: 'bloodrose', name: 'Blood Rose', emoji: '🥀', cost: 60, desc: 'Dark beauty' },
    { id: 'midnightorchid', name: 'Midnight Orchid', emoji: '🌸', cost: 90, desc: 'Rare flower' }
  ];

  // Soul system
  var SOUL_TYPES = [
    { id: 'ghost', name: 'Ghost Soul', emoji: '👻', color: '#e0e0ff', dropChance: 0.3 },
    { id: 'wolf', name: 'Wolf Soul', emoji: '🐺', color: '#8b4513', dropChance: 0.25 },
    { id: 'wisp', name: 'Wisp Soul', emoji: '✨', color: '#87ceeb', dropChance: 0.35 },
    { id: 'pumpkin', name: 'Pumpkin Soul', emoji: '🎃', color: '#ff8c00', dropChance: 0.2 },
    { id: 'skeleton', name: 'Skeleton Soul', emoji: '💀', color: '#f5f5dc', dropChance: 0.25 },
    { id: 'bat', name: 'Bat Soul', emoji: '🦇', color: '#4a4a4a', dropChance: 0.3 },
    { id: 'spider', name: 'Spider Soul', emoji: '🕷️', color: '#2f2f2f', dropChance: 0.25 },
    { id: 'witch', name: 'Witch Soul', emoji: '🧙', color: '#4b0082', dropChance: 0.15 },
    { id: 'vampire', name: 'Vampire Soul', emoji: '🧛', color: '#8b0000', dropChance: 0.1 },
    { id: 'reaper', name: 'Reaper Soul', emoji: '☠️', color: '#1a1a1a', dropChance: 0.05 }
  ];

  // Halloween mob types
  var HALLOWEEN_MOBS = [
    { kind: 'pumpkin', name: 'Pumpkin Head', emoji: '🎃', hp: 8, dmg: 5, speed: 1.8, xp: 20, gold: 15, color: '#ff8c00' },
    { kind: 'skeleton', name: 'Skeleton', emoji: '💀', hp: 10, dmg: 7, speed: 2.0, xp: 25, gold: 20, color: '#f5f5dc' },
    { kind: 'bat', name: 'Cave Bat', emoji: '🦇', hp: 4, dmg: 3, speed: 3.0, xp: 10, gold: 8, color: '#4a4a4a' },
    { kind: 'spider', name: 'Giant Spider', emoji: '🕷️', hp: 12, dmg: 8, speed: 2.2, xp: 30, gold: 25, color: '#2f2f2f' },
    { kind: 'witch', name: 'Witch', emoji: '🧙', hp: 15, dmg: 10, speed: 1.5, xp: 40, gold: 35, color: '#4b0082' },
    { kind: 'vampire', name: 'Vampire', emoji: '🧛', hp: 20, dmg: 12, speed: 2.5, xp: 50, gold: 45, color: '#8b0000' },
    { id: 'reaper', name: 'Reaper', emoji: '☠️', hp: 30, dmg: 15, speed: 1.2, xp: 80, gold: 100, color: '#1a1a1a' }
  ];

  // Haunted structure generation
  function genHauntedHouse(cx, cz, rng) {
    var w = 5 + rng.nextInt(4);
    var d = 5 + rng.nextInt(4);
    var h = 3 + rng.nextInt(2);
    var x0 = cx - Math.floor(w / 2);
    var z0 = cz - Math.floor(d / 2);
    var wallBlock = rng.nextDouble() < 0.5 ? 'wood' : 'stone';
    var floorBlock = rng.nextDouble() < 0.5 ? 'wood' : 'boneblock';
    for (var x = x0; x < x0 + w; x++) {
      for (var z = z0; z < z0 + d; z++) {
        if (x < 1 || z < 1 || x >= G.W - 1 || z >= G.D - 1) continue;
        var gy = groundY(x, z);
        // Floor
        G.blocks[K(x, gy - 1, z)] = floorBlock;
        // Walls
        for (var y = 0; y < h; y++) {
          var isWall = (x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1);
          if (isWall) {
            // Doorway
            if (z === z0 + Math.floor(d / 2) && (x === x0 || x === x0 + w - 1) && y < 2) continue;
            // Windows
            if (y === 1 && (x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1)) {
              if (rng.nextDouble() < 0.3) continue;
            }
            G.blocks[K(x, gy + y, z)] = wallBlock;
          }
        }
        // Roof
        G.blocks[K(x, gy + h, z)] = rng.nextDouble() < 0.5 ? 'wood' : 'shadowstone';
      }
    }
    // Interior: coffin, tombstone, haunted portrait
    var ix = x0 + 1 + rng.nextInt(w - 2);
    var iz = z0 + 1 + rng.nextInt(d - 2);
    var igy = groundY(ix, iz);
    if (ix > 0 && iz > 0 && ix < G.W - 1 && iz < G.D - 1) {
      G.blocks[K(ix, igy, iz)] = rng.nextDouble() < 0.5 ? 'coffin' : 'tombstone';
    }
    // Jack-o-lantern inside
    var jx = x0 + 1 + rng.nextInt(w - 2);
    var jz = z0 + 1 + rng.nextInt(d - 2);
    var jgy = groundY(jx, jz);
    if (jx > 0 && jz > 0 && jx < G.W - 1 && jz < G.D - 1 && !G.blocks[K(jx, jgy, jz)]) {
      G.blocks[K(jx, jgy, jz)] = 'jackolantern';
    }
    // Spider webs in corners
    for (var wx = 0; wx < 2; wx++) {
      for (var wz = 0; wz < 2; wz++) {
        var cornerX = wx === 0 ? x0 : x0 + w - 1;
        var cornerZ = wz === 0 ? z0 : z0 + d - 1;
        var cgy = groundY(cornerX, cornerZ);
        if (cornerX > 0 && cornerZ > 0 && cornerX < G.W - 1 && cornerZ < G.D - 1) {
          if (!G.blocks[K(cornerX, cgy, cornerZ)] && rng.nextDouble() < 0.6) {
            G.blocks[K(cornerX, cgy, cornerZ)] = 'spiderweb';
          }
        }
      }
    }
  }

  function genGraveyard(cx, cz, rng) {
    var count = 5 + rng.nextInt(8);
    for (var i = 0; i < count; i++) {
      var x = cx + rng.nextInt(10) - 5;
      var z = cz + rng.nextInt(10) - 5;
      if (x < 1 || z < 1 || x >= G.W - 1 || z >= G.D - 1) continue;
      var gy = groundY(x, z);
      if (get(x, gy - 1, z) !== 'grass' && get(x, gy - 1, z) !== 'dirt') continue;
      var block = rng.nextDouble() < 0.7 ? 'tombstone' : (rng.nextDouble() < 0.5 ? 'coffin' : 'boneblock');
      G.blocks[K(x, gy, z)] = block;
      // Blood rose nearby
      if (rng.nextDouble() < 0.3) {
        var rx = x + rng.nextInt(3) - 1;
        var rz = z + rng.nextInt(3) - 1;
        if (rx > 0 && rz > 0 && rx < G.W - 1 && rz < G.D - 1) {
          var rgy = groundY(rx, rz);
          if (!G.blocks[K(rx, rgy, rz)]) {
            G.blocks[K(rx, rgy, rz)] = rng.nextDouble() < 0.5 ? 'bloodrose' : 'midnightorchid';
          }
        }
      }
    }
  }

  function genPumpkinPatch(cx, cz, rng) {
    var count = 3 + rng.nextInt(6);
    for (var i = 0; i < count; i++) {
      var x = cx + rng.nextInt(8) - 4;
      var z = cz + rng.nextInt(8) - 4;
      if (x < 1 || z < 1 || x >= G.W - 1 || z >= G.D - 1) continue;
      var gy = groundY(x, z);
      if (get(x, gy - 1, z) !== 'grass') continue;
      G.blocks[K(x, gy, z)] = rng.nextDouble() < 0.8 ? 'pumpkin' : 'jackolantern';
    }
  }

  // Call Halloween generation in world gen
  function genHalloweenFeatures() {
    var rng = new S.SeededRNG(G.seed + 99991);
    if (G.world === 0) {
      // Forest: haunted houses, graveyards, pumpkin patches
      for (var i = 0; i < 3; i++) {
        var hx = 5 + rng.nextInt(G.W - 10);
        var hz = 5 + rng.nextInt(G.D - 10);
        if (Math.abs(hx - G.W / 2) < 6 && Math.abs(hz - G.D / 2) < 6) continue;
        genHauntedHouse(hx, hz, rng);
      }
      for (var i = 0; i < 4; i++) {
        genGraveyard(5 + rng.nextInt(G.W - 10), 5 + rng.nextInt(G.D - 10), rng);
      }
      for (var i = 0; i < 5; i++) {
        genPumpkinPatch(5 + rng.nextInt(G.W - 10), 5 + rng.nextInt(G.D - 10), rng);
      }
    } else if (G.world === 1) {
      // Mine: bone blocks, spider webs, coffins
      for (var i = 0; i < 40; i++) {
        var x = 2 + rng.nextInt(G.W - 4);
        var z = 2 + rng.nextInt(G.D - 4);
        var y = 1 + rng.nextInt(8);
        if (!G.blocks[K(x, y, z)] && rng.nextDouble() < 0.3) {
          G.blocks[K(x, y, z)] = rng.nextDouble() < 0.5 ? 'boneblock' : 'spiderweb';
        }
      }
      for (var i = 0; i < 15; i++) {
        var x = 2 + rng.nextInt(G.W - 4);
        var z = 2 + rng.nextInt(G.D - 4);
        var gy = -1;
        for (var y = 8; y >= 1; y--) {
          if (solidAt(x, y, z)) { gy = y + 1; break; }
        }
        if (gy > 0 && !G.blocks[K(x, gy, z)] && rng.nextDouble() < 0.4) {
          G.blocks[K(x, gy, z)] = rng.nextDouble() < 0.5 ? 'coffin' : 'tombstone';
        }
      }
    } else if (G.world === 3) {
      // Crystal caverns: ectoplasm, shadow stone, ghost essence
      for (var i = 0; i < 30; i++) {
        var x = 2 + rng.nextInt(G.W - 4);
        var z = 2 + rng.nextInt(G.D - 4);
        var y = 1 + rng.nextInt(8);
        if (!G.blocks[K(x, y, z)] && rng.nextDouble() < 0.25) {
          var roll = rng.nextDouble();
          if (roll < 0.4) G.blocks[K(x, y, z)] = 'ectoplasm';
          else if (roll < 0.7) G.blocks[K(x, y, z)] = 'shadowstone';
          else G.blocks[K(x, y, z)] = 'ghostessence';
        }
      }
    }
  }

  // Halloween mob spawning
  function spawnHalloweenMob() {
    var rng = new S.SeededRNG((Math.random() * 1e9) | 0);
    for (var t = 0; t < 8; t++) {
      var a = rng.nextDouble() * Math.PI * 2;
      var r = 10 + rng.nextDouble() * 10;
      var x = Math.floor(G.px + Math.cos(a) * r);
      var z = Math.floor(G.pz + Math.sin(a) * r);
      if (x < 1 || z < 1 || x >= G.W - 1 || z >= G.D - 1) continue;
      var gy = -1;
      for (var y = Math.min(G.H - 1, Math.floor(G.py) + 2); y >= 0; y--) {
        if (solidAt(x, y, z)) { gy = y + 1; break; }
      }
      if (gy < 1) continue;
      var roll = rng.nextDouble();
      var kind;
      if (G.world === 0) {
        if (roll < 0.3) kind = 'pumpkin';
        else if (roll < 0.5) kind = 'skeleton';
        else if (roll < 0.7) kind = 'spider';
        else if (roll < 0.85) kind = 'witch';
        else kind = 'vampire';
      } else if (G.world === 1) {
        if (roll < 0.35) kind = 'skeleton';
        else if (roll < 0.6) kind = 'spider';
        else if (roll < 0.8) kind = 'bat';
        else if (roll < 0.92) kind = 'witch';
        else kind = 'reaper';
      } else {
        if (roll < 0.3) kind = 'ghost';
        else if (roll < 0.5) kind = 'wisp';
        else if (roll < 0.7) kind = 'skeleton';
        else if (roll < 0.85) kind = 'witch';
        else kind = 'vampire';
      }
      var mobDef = null;
      for (var i = 0; i < HALLOWEEN_MOBS.length; i++) {
        if (HALLOWEEN_MOBS[i].kind === kind) { mobDef = HALLOWEEN_MOBS[i]; break; }
      }
      if (!mobDef) continue;
      G.mobs.push({
        kind: kind, x: x + 0.5, z: z + 0.5, y: gy + 0.3,
        hp: mobDef.hp, maxHp: mobDef.hp, dmg: mobDef.dmg, speed: mobDef.speed,
        xp: mobDef.xp, gold: mobDef.gold, color: mobDef.color,
        wx: x + 0.5, wz: z + 0.5, wait: 0, cool: 0, phase: rng.nextDouble() * 6,
        halloween: true
      });
      return true;
    }
    return false;
  }

  // Update Halloween mobs
  function updateHalloweenMobs(dt) {
    for (var i = G.mobs.length - 1; i >= 0; i--) {
      var m = G.mobs[i];
      if (!m.halloween) continue;
      m.cool -= dt;
      var dx = G.px - m.x, dz = G.pz - m.z;
      var dist = Math.hypot(dx, dz);
      var sp = m.speed * (DIFFS[meta().diff || 0] ? DIFFS[meta().diff || 0].mobSpd : 1);
      if (dist < 12) {
        if (dist > 0.9) {
          var nx = m.x + dx / dist * sp * dt;
          var nz = m.z + dz / dist * sp * dt;
          if (!circleHits(nx, m.z, m.y)) m.x = nx;
          if (!circleHits(m.x, nz, m.y)) m.z = nz;
          if (m.kind === 'bat' || m.kind === 'ghost') {
            m.y += Math.sin(G.time * 4 + m.phase) * dt * 1.2;
          }
        } else if (m.cool <= 0) {
          m.cool = 1.2;
          hurt(m.dmg, 'slain by a ' + m.kind);
          // Vampire lifesteal
          if (m.kind === 'vampire') {
            m.hp = Math.min(m.maxHp, m.hp + 3);
          }
        }
      } else {
        if (m.wait > 0) m.wait -= dt;
        else {
          var tx = m.wx - m.x, tz = m.wz - m.z;
          if (Math.hypot(tx, tz) < 0.6) {
            m.wait = 2 + Math.random() * 4;
            m.wx = m.x + (Math.random() - 0.5) * 14;
            m.wz = m.z + (Math.random() - 0.5) * 14;
          } else {
            var wnx = m.x + tx * dt * 0.7, wnz = m.z + tz * dt * 0.7;
            if (!circleHits(wnx, m.z, m.y)) m.x = wnx;
            if (!circleHits(m.x, wnz, m.y)) m.z = wnz;
          }
        }
      }
      // Witch casts spells
      if (m.kind === 'witch' && dist < 8 && m.cool <= 0) {
        m.cool = 3;
        if (Math.random() < 0.5) {
          hurt(6, 'witch curse');
        } else {
          // Spawn spider
          if (G.mobs.length < mobCap() + 4) {
            G.mobs.push({ kind: 'spider', x: m.x + 1, z: m.z, y: m.y, hp: 12, maxHp: 12, dmg: 8, speed: 2.2, xp: 30, gold: 25, color: '#2f2f2f', wx: m.x, wz: m.z, wait: 0, cool: 0, phase: 0, halloween: true });
          }
        }
      }
      // Reaper teleports
      if (m.kind === 'reaper' && dist < 6 && dist > 2 && Math.random() < dt * 0.5) {
        var ta = Math.random() * Math.PI * 2;
        var tx2 = G.px + Math.cos(ta) * 3;
        var tz2 = G.pz + Math.sin(ta) * 3;
        if (!circleHits(tx2, tz2, m.y)) {
          m.x = tx2; m.z = tz2;
          spawnGhost(m.x, m.y, m.z);
        }
      }
    }
  }

  // Soul collection
  function collectSoul(mob) {
    var soulType = null;
    for (var i = 0; i < SOUL_TYPES.length; i++) {
      if (SOUL_TYPES[i].id === mob.kind) { soulType = SOUL_TYPES[i]; break; }
    }
    if (!soulType) return;
    if (Math.random() > soulType.dropChance) return;
    var m = meta();
    m.souls = m.souls || {};
    m.souls[soulType.id] = (m.souls[soulType.id] || 0) + 1;
    flash(soulType.emoji + ' ' + soulType.name + ' collected! (' + m.souls[soulType.id] + ')', 2);
    saveMeta();
  }

  // Costume functions
  function buyCostume(i) {
    var m = meta();
    if (m.costumeIdx === i) { m.costumeIdx = -1; saveMeta(); renderHUD(); flash('Costume removed', 1.5); return; }
    if ((m.costumes || []).indexOf(i) >= 0) {
      m.costumeIdx = i;
      saveMeta(); renderHUD();
      flash(COSTUMES[i].emoji + ' ' + COSTUMES[i].name + ' costume equipped!', 2.5);
      return;
    }
    if (m.gold < COSTUMES[i].cost) { flash('Needs ' + COSTUMES[i].cost + ' gold', 1.5); return; }
    m.gold -= COSTUMES[i].cost;
    m.costumes = m.costumes || [];
    m.costumes.push(i);
    m.costumeIdx = i;
    saveMeta(); renderHUD();
    flash(COSTUMES[i].emoji + ' ' + COSTUMES[i].name + ' costume unlocked!', 3);
  }

  function getCostumeBonus() {
    var m = meta();
    if (!m.costumeIdx || m.costumeIdx < 0) return null;
    return COSTUMES[m.costumeIdx];
  }

  // Enchanting
  function buyEnchant(id) {
    var m = meta();
    var enchant = null;
    for (var i = 0; i < ENCHANTS.length; i++) {
      if (ENCHANTS[i].id === id) { enchant = ENCHANTS[i]; break; }
    }
    if (!enchant) return;
    m.enchants = m.enchants || {};
    var level = m.enchants[id] || 0;
    if (level >= enchant.max) { flash(enchant.name + ' is maxed!', 1.5); return; }
    var cost = enchant.cost * (level + 1);
    if (m.gold < cost) { flash('Needs ' + cost + ' gold', 1.5); return; }
    m.gold -= cost;
    m.enchants[id] = level + 1;
    saveMeta(); renderHUD();
    flash(enchant.emoji + ' ' + enchant.name + ' +' + (level + 1) + '!', 2.5);
  }

  function getEnchantLevel(id) {
    var m = meta();
    return (m.enchants && m.enchants[id]) || 0;
  }

  // Potion brewing
  function brewPotion(id) {
    var m = meta();
    var potion = null;
    for (var i = 0; i < POTIONS.length; i++) {
      if (POTIONS[i].id === id) { potion = POTIONS[i]; break; }
    }
    if (!potion) return;
    if (m.gold < potion.cost) { flash('Needs ' + potion.cost + ' gold', 1.5); return; }
    m.gold -= potion.cost;
    m.potions = m.potions || {};
    m.potions[id] = (m.potions[id] || 0) + 1;
    saveMeta(); renderHUD();
    flash(potion.emoji + ' ' + potion.name + ' brewed!', 2.5);
  }

  function drinkPotion(id) {
    var m = meta();
    if (!m.potions || !m.potions[id]) { flash('No ' + id + ' potion!', 1.5); return; }
    var potion = null;
    for (var i = 0; i < POTIONS.length; i++) {
      if (POTIONS[i].id === id) { potion = POTIONS[i]; break; }
    }
    if (!potion) return;
    m.potions[id]--;
    if (m.potions[id] <= 0) delete m.potions[id];
    m.activePotions = m.activePotions || {};
    m.activePotions[id] = potion.dur;
    flash(potion.emoji + ' ' + potion.name + ' active for ' + potion.dur + 's!', 3);
    saveMeta(); renderHUD();
  }

  function updatePotions(dt) {
    var m = meta();
    if (!m.activePotions) return;
    for (var id in m.activePotions) {
      m.activePotions[id] -= dt;
      if (m.activePotions[id] <= 0) {
        delete m.activePotions[id];
        flash('Potion effect faded', 1.5);
      }
    }
  }

  function hasPotion(id) {
    var m = meta();
    return m.activePotions && m.activePotions[id] > 0;
  }

  // Trick or Treat
  function trickOrTreat() {
    var isTreat = Math.random() < 0.45;
    var m = meta();
    if (isTreat) {
      var treat = TREATS[(Math.random() * TREATS.length) | 0];
      flash(treat.msg, 3);
      switch (treat.effect) {
        case 'gold': m.gold += treat.val; m.stats.goldRun += treat.val; break;
        case 'heal': m.hp = Math.min(m.maxHp, m.hp + treat.val); break;
        case 'xp': gainXP(treat.val); break;
        case 'potion':
          var potion = POTIONS[(Math.random() * POTIONS.length) | 0];
          m.potions = m.potions || {};
          m.potions[potion.id] = (m.potions[potion.id] || 0) + 1;
          break;
        case 'buff':
          m.buffDamage = (m.buffDamage || 0) + treat.val;
          setTimeout(function () { m.buffDamage = 0; }, 30000);
          break;
        case 'reveal':
          // Reveal ores for 10 seconds
          m.oreReveal = 10;
          break;
      }
    } else {
      var trick = TRICKS[(Math.random() * TRICKS.length) | 0];
      flash(trick.msg, 3);
      switch (trick.effect) {
        case 'damage': hurt(trick.val, 'trick or treat'); break;
        case 'ghosts':
          for (var i = 0; i < trick.val; i++) {
            if (G.mobs.length < mobCap() + 4) {
              G.mobs.push({ kind: 'ghost', x: G.px + 2, z: G.pz, y: G.py, hp: 3, maxHp: 3, dmg: 4, speed: 2, xp: 15, gold: 5, color: '#e0e0ff', wx: G.px, wz: G.pz, wait: 0, cool: 0, phase: 0, halloween: true });
            }
          }
          break;
        case 'slow': m.slowTimer = trick.val; break;
        case 'gold_loss': m.gold = Math.max(0, m.gold - trick.val); break;
        case 'dark': m.darkTimer = trick.val; break;
        case 'xp_loss': m.xp = Math.max(0, m.xp - trick.val); break;
        case 'webs':
          for (var i = 0; i < trick.val; i++) {
            var a = Math.random() * Math.PI * 2;
            var r = 2 + Math.random() * 3;
            var x = Math.floor(G.px + Math.cos(a) * r);
            var z = Math.floor(G.pz + Math.sin(a) * r);
            if (x > 0 && z > 0 && x < G.W - 1 && z < G.D - 1) {
              var gy = groundY(x, z);
              if (!G.blocks[K(x, gy, z)]) G.blocks[K(x, gy, z)] = 'spiderweb';
            }
          }
          break;
      }
    }
    saveMeta(); renderHUD();
  }

  // Halloween shop
  function showHalloweenShop() {
    var m = meta();
    hud('overlay-title').textContent = '🎃 Halloween Shop';
    hud('overlay-text').textContent = 'Gold: ' + m.gold + ' | Souls: ' + Object.keys(m.souls || {}).length;
    var b1 = hud('overlay-btn'), b2 = hud('overlay-btn2');
    b1.textContent = 'Close';
    b1.onclick = function () { hideOverlay(); };
    b2.style.display = 'none';
    var shopDiv = document.createElement('div');
    shopDiv.innerHTML = '<h3 style="margin:8px 0 4px">🎃 Items</h3>' +
      HALLOWEEN_SHOP.map(function (item, i) {
        return '<button style="display:inline-block;margin:2px;padding:4px 8px;cursor:pointer;border:1px solid #666" onclick="window.__voxelBuyHalloweenItem(' + i + ')">' +
          item.emoji + ' ' + item.name + ' — ' + item.cost + 'g</button>';
      }).join('') +
      '<h3 style="margin:8px 0 4px">👻 Costumes</h3>' +
      COSTUMES.map(function (c, i) {
        var owned = (m.costumes || []).indexOf(i) >= 0;
        var equipped = m.costumeIdx === i;
        return '<button style="display:inline-block;margin:2px;padding:4px 8px;cursor:pointer;border:1px solid ' + (equipped ? '#ffd166' : '#666') + '" onclick="window.__voxelBuyCostume(' + i + ')">' +
          c.emoji + ' ' + c.name + (equipped ? ' ✓' : owned ? ' (owned)' : ' — ' + c.cost + 'g') + '</button>';
      }).join('') +
      '<h3 style="margin:8px 0 4px">✨ Enchantments</h3>' +
      ENCHANTS.map(function (e) {
        var level = (m.enchants && m.enchants[e.id]) || 0;
        return '<button style="display:inline-block;margin:2px;padding:4px 8px;cursor:pointer;border:1px solid #666" onclick="window.__voxelBuyEnchant(\'' + e.id + '\')">' +
          e.emoji + ' ' + e.name + ' +' + level + '/' + e.max + ' — ' + e.cost + 'g</button>';
      }).join('') +
      '<h3 style="margin:8px 0 4px">🧪 Potions</h3>' +
      POTIONS.map(function (p) {
        return '<button style="display:inline-block;margin:2px;padding:4px 8px;cursor:pointer;border:1px solid #666" onclick="window.__voxelBrewPotion(\'' + p.id + '\')">' +
          p.emoji + ' ' + p.name + ' — ' + p.cost + 'g</button>';
      }).join('');
    hud('overlay-text').appendChild(shopDiv);
    overlay.classList.remove('hidden');
  }

  // Pumpkin carving
  function carvePumpkin() {
    var m = meta();
    if ((m.pumpkins || 0) < 1) { flash('No pumpkins! Find or buy some.', 1.5); return; }
    m.pumpkins--;
    m.jackolanterns = (m.jackolanterns || 0) + 1;
    flash('🎃 Carved a Jack-o-Lantern!', 2.5);
    saveMeta(); renderHUD();
  }

  // Place jack-o-lantern
  function placeJackolantern() {
    var m = meta();
    if ((m.jackolanterns || 0) < 1) { flash('No Jack-o-Lanterns! Carve one first.', 1.5); return; }
    var e = eyePos(), d = lookDir();
    var hit = S.voxelRay(e, d, 6, solidAt);
    if (!hit) return;
    var px = hit.x + hit.nx, py = hit.y + hit.ny, pz = hit.z + hit.nz;
    if (px < 0 || pz < 0 || py < 0 || px >= G.W || pz >= G.D || py >= G.H) return;
    if (solidAt(px, py, pz)) return;
    m.jackolanterns--;
    G.blocks[K(px, py, pz)] = 'jackolantern';
    rebuildAround(px, py, pz);
    flash('🎃 Jack-o-Lantern placed!', 2);
    saveMeta(); renderHUD();
  }

  // Eat pumpkin pie
  function eatPumpkinPie() {
    var m = meta();
    if ((m.pumpkinPies || 0) < 1) { flash('No pumpkin pie!', 1.5); return; }
    if (m.hp >= m.maxHp) { flash('HP already full!', 1.5); return; }
    m.pumpkinPies--;
    m.hp = Math.min(m.maxHp, m.hp + 40);
    flash('🥧 +40 HP!', 2);
    saveMeta(); renderHUD();
  }

  // Eat caramel apple
  function eatCaramelApple() {
    var m = meta();
    if ((m.caramelApples || 0) < 1) { flash('No caramel apple!', 1.5); return; }
    if (m.hp >= m.maxHp) { flash('HP already full!', 1.5); return; }
    m.caramelApples--;
    m.hp = Math.min(m.maxHp, m.hp + 15);
    flash('🍎 +15 HP!', 2);
    saveMeta(); renderHUD();
  }

  // Soul lantern crafting
  function craftSoulLantern() {
    var m = meta();
    var ghostSouls = (m.souls && m.souls.ghost) || 0;
    if (ghostSouls < 3) { flash('Needs 3 Ghost Souls', 1.5); return; }
    m.souls.ghost -= 3;
    m.soulLanterns = (m.soulLanterns || 0) + 1;
    flash('🏮 Soul Lantern crafted!', 2.5);
    saveMeta(); renderHUD();
  }

  // Place soul lantern
  function placeSoulLantern() {
    var m = meta();
    if ((m.soulLanterns || 0) < 1) { flash('No Soul Lanterns!', 1.5); return; }
    var e = eyePos(), d = lookDir();
    var hit = S.voxelRay(e, d, 6, solidAt);
    if (!hit) return;
    var px = hit.x + hit.nx, py = hit.y + hit.ny, pz = hit.z + hit.nz;
    if (px < 0 || pz < 0 || py < 0 || px >= G.W || pz >= G.D || py >= G.H) return;
    if (solidAt(px, py, pz)) return;
    m.soulLanterns--;
    G.torches.push({ x: px + 0.5, y: py + 0.5, z: pz + 0.5, soul: true });
    buildGlow();
    flash('🏮 Soul Lantern placed!', 2);
    saveMeta(); renderHUD();
  }

  // Bat swarm event
  function spawnBatSwarm() {
    var count = 5 + ((Math.random() * 5) | 0);
    for (var i = 0; i < count; i++) {
      if (G.mobs.length >= mobCap() + 6) break;
      var a = Math.random() * Math.PI * 2;
      var r = 4 + Math.random() * 6;
      var x = Math.floor(G.px + Math.cos(a) * r);
      var z = Math.floor(G.pz + Math.sin(a) * r);
      if (x < 1 || z < 1 || x >= G.W - 1 || z >= G.D - 1) continue;
      var gy = -1;
      for (var y = Math.min(G.H - 1, Math.floor(G.py) + 3); y >= 0; y--) {
        if (solidAt(x, y, z)) { gy = y + 1; break; }
      }
      if (gy < 1) continue;
      G.mobs.push({ kind: 'bat', x: x + 0.5, z: z + 0.5, y: gy + 0.5, hp: 4, maxHp: 4, dmg: 3, speed: 3.0, xp: 10, gold: 8, color: '#4a4a4a', wx: x + 0.5, wz: z + 0.5, wait: 0, cool: 0, phase: Math.random() * 6, halloween: true });
    }
    flash('🦇 A bat swarm appears!', 2.5);
  }

  // Midnight event
  function checkMidnightEvent() {
    if (!PHYS[G.world] || !PHYS[G.world].day) return;
    if (Math.abs(G.dayT - 0.75) < 0.01 && !G.midnightEvent) {
      G.midnightEvent = true;
      flash('🌙 MIDNIGHT — The veil is thin...', 4);
      AudioSys.ambient(1);
      // Spawn extra mobs
      for (var i = 0; i < 3; i++) {
        if (G.mobs.length < mobCap() + 4) spawnHalloweenMob();
      }
      // Trick or treat
      if (Math.random() < 0.5) trickOrTreat();
    }
    if (G.dayT > 0.8 || G.dayT < 0.7) G.midnightEvent = false;
  }

  // Update Halloween systems
  function updateHalloween(dt) {
    updateHalloweenMobs(dt);
    updatePotions(dt);
    checkMidnightEvent();
    // Random trick or treat
    if (Math.random() < dt / 120) trickOrTreat();
    // Random bat swarm
    if (Math.random() < dt / 180 && (G.world === 1 || G.world === 3)) spawnBatSwarm();
    // Ore reveal timer
    var m = meta();
    if (m.oreReveal > 0) m.oreReveal -= dt;
    if (m.slowTimer > 0) m.slowTimer -= dt;
    if (m.darkTimer > 0) m.darkTimer -= dt;
  }

  // Render Halloween mobs
  function renderHalloweenMobs() {
    var HP = [], HC = [];
    for (var i = 0; i < G.mobs.length; i++) {
      var m = G.mobs[i];
      if (!m.halloween) continue;
      var bob = Math.abs(Math.sin(G.time * 6 + m.phase)) * 0.08;
      if (m.kind === 'pumpkin') {
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0.3, 0, 0.5, 0.5, 0.5, [1.0, 0.55, 0.1], 1.2);
        // Face
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0.35, 0.2, 0.15, 0.1, 0.05, [1.0, 0.8, 0.2], 1.5);
      } else if (m.kind === 'skeleton') {
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0.4, 0, 0.3, 0.6, 0.3, [0.95, 0.95, 0.85], 1.1);
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0.75, 0, 0.25, 0.25, 0.25, [0.95, 0.95, 0.85], 1.2);
      } else if (m.kind === 'bat') {
        var wingSpan = 0.4 + Math.sin(G.time * 10 + m.phase) * 0.2;
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0, 0, 0.15, 0.15, 0.15, [0.3, 0.3, 0.3], 1.2);
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          wingSpan, 0, 0, wingSpan, 0.05, 0.2, [0.25, 0.25, 0.25], 1.1);
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          -wingSpan, 0, 0, wingSpan, 0.05, 0.2, [0.25, 0.25, 0.25], 1.1);
      } else if (m.kind === 'spider') {
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0.2, 0, 0.4, 0.3, 0.4, [0.2, 0.2, 0.2], 1.2);
        // Legs
        for (var l = 0; l < 4; l++) {
          var la = (l / 4) * Math.PI * 2 + m.phase;
          emitBox(HP, HC, [m.x + Math.cos(la) * 0.4, m.y + bob, m.z + Math.sin(la) * 0.4],
            [1, 0, 0], [0, 1, 0], [0, 0, 1], 0, 0, 0, 0.08, 0.08, 0.08, [0.15, 0.15, 0.15], 1.0);
        }
      } else if (m.kind === 'witch') {
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0.35, 0, 0.35, 0.5, 0.35, [0.3, 0.1, 0.4], 1.2);
        // Hat
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0.7, 0, 0.45, 0.15, 0.45, [0.15, 0.05, 0.25], 1.2);
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0.95, 0, 0.15, 0.35, 0.15, [0.15, 0.05, 0.25], 1.2);
      } else if (m.kind === 'vampire') {
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0.4, 0, 0.35, 0.6, 0.35, [0.5, 0.05, 0.05], 1.2);
        // Cape
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0.3, -0.2, 0.45, 0.5, 0.05, [0.3, 0.02, 0.02], 1.1);
        // Eyes
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0.1, 0.55, 0.18, 0.05, 0.05, 0.05, [1, 0, 0], 1.5);
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          -0.1, 0.55, 0.18, 0.05, 0.05, 0.05, [1, 0, 0], 1.5);
      } else if (m.kind === 'reaper') {
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0.5, 0, 0.4, 0.8, 0.4, [0.1, 0.1, 0.1], 1.3);
        // Hood
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0.9, 0, 0.3, 0.3, 0.3, [0.05, 0.05, 0.05], 1.3);
        // Scythe
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0.4, 0.6, 0, 0.05, 0.6, 0.05, [0.7, 0.7, 0.7], 1.2);
        emitBox(HP, HC, [m.x, m.y + bob, m.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0.4, 0.9, 0, 0.3, 0.05, 0.05, [0.7, 0.7, 0.7], 1.2);
      }
    }
    if (HP.length) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      drawDyn(dynP1, dynC1, HP, HC);
      gl.disable(gl.BLEND);
    }
  }

  // Halloween block breaking
  function breakHalloweenBlock(key, x, y, z) {
    var m = meta();
    switch (key) {
      case 'pumpkin':
        m.pumpkins = (m.pumpkins || 0) + 1;
        flash('🎃 Pumpkin collected!', 1.5);
        break;
      case 'jackolantern':
        m.jackolanterns = (m.jackolanterns || 0) + 1;
        flash('🎃 Jack-o-Lantern collected!', 1.5);
        break;
      case 'candycorn':
        m.candyCorn = (m.candyCorn || 0) + 1;
        m.gold += 2;
        flash('🍬 Candy Corn! +2 gold', 1.5);
        break;
      case 'witchhat':
        m.witchHats = (m.witchHats || 0) + 1;
        flash('🧙 Witch Hat collected!', 2);
        break;
      case 'soullantern':
        m.soulLanterns = (m.soulLanterns || 0) + 1;
        flash('🏮 Soul Lantern collected!', 2);
        break;
      case 'pumpkinpie':
        m.pumpkinPies = (m.pumpkinPies || 0) + 1;
        flash('🥧 Pumpkin Pie collected!', 1.5);
        break;
      case 'caramelapple':
        m.caramelApples = (m.caramelApples || 0) + 1;
        flash('🍎 Caramel Apple collected!', 1.5);
        break;
      case 'bloodrose':
        m.bloodRoses = (m.bloodRoses || 0) + 1;
        flash('🥀 Blood Rose collected!', 1.5);
        break;
      case 'midnightorchid':
        m.midnightOrchids = (m.midnightOrchids || 0) + 1;
        flash('🌸 Midnight Orchid collected!', 1.5);
        break;
      case 'boneblock':
        m.bones = (m.bones || 0) + 1;
        flash('🦴 Bones collected!', 1);
        break;
      case 'coffin':
        // Chance for treasure
        if (Math.random() < 0.3) {
          var gold = 10 + ((Math.random() * 20) | 0);
          m.gold += gold;
          m.stats.goldRun += gold;
          flash('⚰️ Coffin treasure! +' + gold + ' gold', 2.5);
        } else {
          flash('⚰️ Empty coffin...', 1.5);
        }
        break;
      case 'tombstone':
        if (Math.random() < 0.2) {
          m.souls = m.souls || {};
          var soulKeys = Object.keys(SOUL_TYPES);
          var soul = SOUL_TYPES[(Math.random() * soulKeys.length) | 0];
          m.souls[soul.id] = (m.souls[soul.id] || 0) + 1;
          flash('🪦 Tombstone soul! +1 ' + soul.name, 2.5);
        } else {
          flash('🪦 Just a tombstone...', 1.5);
        }
        break;
      case 'hauntedportrait':
        // Spooky event
        if (Math.random() < 0.4) {
          hurt(5, 'haunted portrait');
        } else {
          flash('🖼️ The portrait watches...', 2);
        }
        break;
      case 'spiderweb':
        flash('🕸️ Web cleared', 1);
        break;
    }
  }

  // Halloween mob kill rewards
  function killHalloweenMob(mob) {
    var m = meta();
    // Soul drop
    collectSoul(mob);
    // Extra drops
    if (mob.kind === 'witch') {
      // Witch drops potion ingredients
      if (Math.random() < 0.5) {
        m.witchBrew = (m.witchBrew || 0) + 1;
        flash('🧪 Witch Brew ingredient!', 2);
      }
    } else if (mob.kind === 'vampire') {
      if (Math.random() < 0.3) {
        m.vampireFangs = (m.vampireFangs || 0) + 1;
        flash('🧛 Vampire Fang!', 2);
      }
    } else if (mob.kind === 'reaper') {
      m.reaperEssence = (m.reaperEssence || 0) + 1;
      flash('☠️ Reaper Essence!', 2.5);
    } else if (mob.kind === 'pumpkin') {
      if (Math.random() < 0.4) {
        m.pumpkins = (m.pumpkins || 0) + 1;
        flash('🎃 Pumpkin dropped!', 1.5);
      }
    } else if (mob.kind === 'skeleton') {
      if (Math.random() < 0.3) {
        m.bones = (m.bones || 0) + 1;
        flash('🦴 Bones!', 1.5);
      }
    }
  }

  // Witch hat wear
  function wearWitchHat() {
    var m = meta();
    if ((m.witchHats || 0) < 1) { flash('No Witch Hat!', 1.5); return; }
    m.witchHatEquipped = !m.witchHatEquipped;
    flash(m.witchHatEquipped ? '🧙 Witch Hat equipped! +Luck' : '🧙 Witch Hat removed', 2);
    saveMeta(); renderHUD();
  }

  // Halloween HUD
  function renderHalloweenHUD() {
    var m = meta();
    var hudEl = document.getElementById('hud');
    if (!hudEl) return;
    // Add Halloween stats if not present
    var halloweenStats = document.getElementById('halloween-stats');
    if (!halloweenStats) {
      halloweenStats = document.createElement('span');
      halloweenStats.id = 'halloween-stats';
      hudEl.appendChild(halloweenStats);
    }
    var souls = m.souls || {};
    var soulCount = 0;
    for (var k in souls) soulCount += souls[k];
    var costume = getCostumeBonus();
    var costumeStr = costume ? costume.emoji : '';
    halloweenStats.innerHTML = ' · 👻 ' + soulCount + ' ' + costumeStr;
  }

  // Halloween shop buy function
  function buyHalloweenItem(i) {
    var m = meta();
    var item = HALLOWEEN_SHOP[i];
    if (!item) return;
    if (m.gold < item.cost) { flash('Needs ' + item.cost + ' gold', 1.5); return; }
    m.gold -= item.cost;
    switch (item.id) {
      case 'pumpkin': m.pumpkins = (m.pumpkins || 0) + 1; break;
      case 'candycorn': m.candyCorn = (m.candyCorn || 0) + 1; break;
      case 'spiderweb':
        // Place spider web
        var e = eyePos(), d = lookDir();
        var hit = S.voxelRay(e, d, 6, solidAt);
        if (hit) {
          var px = hit.x + hit.nx, py = hit.y + hit.ny, pz = hit.z + hit.nz;
          if (px >= 0 && pz >= 0 && py >= 0 && px < G.W && pz < G.D && py < G.H && !solidAt(px, py, pz)) {
            G.blocks[K(px, py, pz)] = 'spiderweb';
            rebuildAround(px, py, pz);
          }
        }
        break;
      case 'coffin':
      case 'tombstone':
      case 'boneblock':
        // Place block
        var e2 = eyePos(), d2 = lookDir();
        var hit2 = S.voxelRay(e2, d2, 6, solidAt);
        if (hit2) {
          var px2 = hit2.x + hit2.nx, py2 = hit2.y + hit2.ny, pz2 = hit2.z + hit2.nz;
          if (px2 >= 0 && pz2 >= 0 && py2 >= 0 && px2 < G.W && pz2 < G.D && py2 < G.H && !solidAt(px2, py2, pz2)) {
            G.blocks[K(px2, py2, pz2)] = item.id;
            rebuildAround(px2, py2, pz2);
          }
        }
        break;
      case 'witchhat': m.witchHats = (m.witchHats || 0) + 1; break;
      case 'soullantern': m.soulLanterns = (m.soulLanterns || 0) + 1; break;
      case 'candycane':
        var e3 = eyePos(), d3 = lookDir();
        var hit3 = S.voxelRay(e3, d3, 6, solidAt);
        if (hit3) {
          var px3 = hit3.x + hit3.nx, py3 = hit3.y + hit3.ny, pz3 = hit3.z + hit3.nz;
          if (px3 >= 0 && pz3 >= 0 && py3 >= 0 && px3 < G.W && pz3 < G.D && py3 < G.H && !solidAt(px3, py3, pz3)) {
            G.blocks[K(px3, py3, pz3)] = 'candycane';
            rebuildAround(px3, py3, pz3);
          }
        }
        break;
      case 'hauntedportrait':
        var e4 = eyePos(), d4 = lookDir();
        var hit4 = S.voxelRay(e4, d4, 6, solidAt);
        if (hit4) {
          var px4 = hit4.x + hit4.nx, py4 = hit4.y + hit4.ny, pz4 = hit4.z + hit4.nz;
          if (px4 >= 0 && pz4 >= 0 && py4 >= 0 && px4 < G.W && pz4 < G.D && py4 < G.H && !solidAt(px4, py4, pz4)) {
            G.blocks[K(px4, py4, pz4)] = 'hauntedportrait';
            rebuildAround(px4, py4, pz4);
          }
        }
        break;
      case 'pumpkinpie': m.pumpkinPies = (m.pumpkinPies || 0) + 1; break;
      case 'caramelapple': m.caramelApples = (m.caramelApples || 0) + 1; break;
      case 'bloodrose':
        var e5 = eyePos(), d5 = lookDir();
        var hit5 = S.voxelRay(e5, d5, 6, solidAt);
        if (hit5) {
          var px5 = hit5.x + hit5.nx, py5 = hit5.y + hit5.ny, pz5 = hit5.z + hit5.nz;
          if (px5 >= 0 && pz5 >= 0 && py5 >= 0 && px5 < G.W && pz5 < G.D && py5 < G.H && !solidAt(px5, py5, pz5)) {
            G.blocks[K(px5, py5, pz5)] = 'bloodrose';
            rebuildAround(px5, py5, pz5);
          }
        }
        break;
      case 'midnightorchid':
        var e6 = eyePos(), d6 = lookDir();
        var hit6 = S.voxelRay(e6, d6, 6, solidAt);
        if (hit6) {
          var px6 = hit6.x + hit6.nx, py6 = hit6.y + hit6.ny, pz6 = hit6.z + hit6.nz;
          if (px6 >= 0 && pz6 >= 0 && py6 >= 0 && px6 < G.W && pz6 < G.D && py6 < G.H && !solidAt(px6, py6, pz6)) {
            G.blocks[K(px6, py6, pz6)] = 'midnightorchid';
            rebuildAround(px6, py6, pz6);
          }
        }
        break;
    }
    flash(item.emoji + ' ' + item.name + ' purchased!', 2);
    saveMeta(); renderHUD();
    showHalloweenShop();
  }

  // Expose Halloween functions
  window.__voxelBuyHalloweenItem = buyHalloweenItem;
  window.__voxelBuyCostume = buyCostume;
  window.__voxelBuyEnchant = buyEnchant;
  window.__voxelBrewPotion = brewPotion;

  // ---------- render ----------
  function resize() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = canvas.clientWidth * dpr, h = canvas.clientHeight * dpr;
    if (canvas.width !== Math.round(w) || canvas.height !== Math.round(h)) {
      canvas.width = Math.round(w); canvas.height = Math.round(h);
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function dayFactor() {
    // 0 = sunrise, 0.25 = noon, 0.5 = sunset, 0.75 = midnight
    return Math.sin(2 * Math.PI * G.dayT);
  }
  function sunDir() {
    var el = Math.sin(2 * Math.PI * G.dayT);
    var ce = Math.max(0.12, el);
    var l = Math.hypot(0.9, ce, 0.35) || 1;
    return [0.9 / l, ce / l, 0.35 / l];
  }
  function sunColor() {
    var e = Math.max(0, dayFactor());
    var warm = 1 - Math.min(1, e * 2.2); // orange near horizon
    return [0.45 + 0.75 * e, (0.45 + 0.6 * e) * (1 - warm * 0.25), (0.48 + 0.5 * e) * (1 - warm * 0.55)];
  }
  function skyColor() {
    var e = Math.max(0, dayFactor());
    var day = [0.53, 0.71, 0.88], night = [0.07, 0.08, 0.14], dusk = [0.45, 0.22, 0.35];
    var warm = 1 - Math.min(1, e * 2.5);
    var base = [day[0] * e + night[0] * (1 - e), day[1] * e + night[1] * (1 - e), day[2] * e + night[2] * (1 - e)];
    var sky = [base[0] + (dusk[0] - base[0]) * warm * 0.7, base[1] + (dusk[1] - base[1]) * warm * 0.7, base[2] + (dusk[2] - base[2]) * warm * 0.7];
    if (G.world === 2) return [Math.min(1, sky[0] + 0.18), Math.min(1, sky[1] + 0.16), Math.min(1, sky[2] + 0.12)]; // icy glare
    return sky;
  }
  function render() {
    resize();
    var PH = PHYS[G.world] || PHYS[0];
    var fogC = PH.day ? skyColor() : PH.fog;
    var wk = WEATHERS[G.weather || 'clear'] || WEATHERS.clear;
    if (PH.day) fogC = [fogC[0] * wk.skyK, fogC[1] * wk.skyK, fogC[2] * wk.skyK];
    if (bloodMoon() > 0) {
      var bm = bloodMoon();
      fogC = [fogC[0] + (0.5 - fogC[0]) * bm, fogC[1] * (1 - bm * 0.72), fogC[2] * (1 - bm * 0.72)];
    }
    var diffNow = DIFFS[meta().diff || 0] || DIFFS[1];
    var fogRNow = [PH.fogR[0] * wk.fogK * diffNow.fogK, PH.fogR[1] * wk.fogK * diffNow.fogK];
    gl.clearColor(fogC[0], fogC[1], fogC[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    var e = eyePos(), d = lookDir();
    var V = S.mLookAt(e[0], e[1], e[2], e[0] + d[0], e[1] + d[1], e[2] + d[2], 0, 1, 0);
    var mvp = S.mMul(S.mPerspective(Math.PI / 2.6, canvas.width / canvas.height, 0.05, 200), V);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'uMVP'), false, new Float32Array(mvp));
    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'uMV'), false, new Float32Array(V));
    gl.uniform3fv(gl.getUniformLocation(prog, 'uFog'), new Float32Array(fogC));
    gl.uniform2fv(gl.getUniformLocation(prog, 'uFogR'), new Float32Array(fogRNow));
    function bind(w, size, name) {
      gl.bindBuffer(gl.ARRAY_BUFFER, w.b);
      var loc = gl.getAttribLocation(prog, name);
      if (loc < 0) return;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    }
    function drawBuf(g) {
      if (!g || !g.n) return;
      bind(g.pos, 3, 'aPos');
      bind(g.col, 3, 'aCol');
      if (g.sun) bind(g.sun, 3, 'aSun');
      gl.drawArrays(gl.TRIANGLES, 0, g.n);
    }
    var planes = frustumPlanes(mvp);
    var sc = sunColor();
    if (!PH.day) sc = [0, 0, 0];
    gl.uniform3fv(gl.getUniformLocation(prog, 'uSun'), new Float32Array(sc));
    gl.uniform1f(gl.getUniformLocation(prog, 'uTime'), G.time);
    // pass 1: opaque PBR (Z-buffer fills, no wind)
    gl.useProgram(progPBR);
    gl.uniformMatrix4fv(U_PBR.uMVP, false, new Float32Array(mvp));
    gl.uniformMatrix4fv(U_PBR.uMV, false, new Float32Array(V));
    gl.uniform3fv(U_PBR.uFog, new Float32Array(fogC));
    gl.uniform2fv(U_PBR.uFogR, new Float32Array(fogRNow));
    gl.uniform3fv(U_PBR.uSun, new Float32Array(sc));
    gl.uniform3fv(U_PBR.uSunDir, new Float32Array(sunDir()));
    gl.uniform3fv(U_PBR.uEye, new Float32Array(e));
    gl.uniform1f(U_PBR.uTime, G.time);
    gl.uniform1f(U_PBR.uSway, 0);
    gl.uniform1f(U_PBR.uAlpha, 1);
    function bindP(w, size) {
      gl.bindBuffer(gl.ARRAY_BUFFER, w.b);
      gl.enableVertexAttribArray(w.loc);
      gl.vertexAttribPointer(w.loc, size, gl.FLOAT, false, 0, 0);
    }
    function drawBufP(g) {
      if (!g || !g.n) return;
      bindP(g.pos, 3);
      bindP(g.col, 3);
      bindP(g.sun, 3);
      bindP(g.mat, 4);
      bindP(g.lamp, 1);
      bindP(g.nrm, 3);
      gl.drawArrays(gl.TRIANGLES, 0, g.n);
    }
    for (var key in G.chunks) {
      var ch = G.chunks[key];
      if (chunkVisible(ch, planes)) drawBufP(ch.op);
    }
    gl.useProgram(prog);
    gl.uniform3fv(gl.getUniformLocation(prog, 'uFog'), new Float32Array(fogC));
    gl.uniform2fv(gl.getUniformLocation(prog, 'uFogR'), new Float32Array(fogRNow));
    drawBuf(G.glow);
    drawBuf(G.decor);
    var beams = drawBeams();
    var bloom = drawBloom();
    if (beams || bloom) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      if (beams) drawBuf(beams);
      if (bloom) drawBuf(bloom);
      gl.disable(gl.BLEND);
    }
    // pass 2: translucent leaves (alpha blend, tested against the Z-buffer)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1f(gl.getUniformLocation(prog, 'uSway'), 0.06); // wind in the canopy
    gl.uniform1f(gl.getUniformLocation(prog, 'uAlpha'), 0.72);
    for (var key2 in G.chunks) {
      var ch2 = G.chunks[key2];
      if (chunkVisible(ch2, planes)) drawBuf(ch2.tr);
    }
    gl.disable(gl.BLEND);
    // avatar / viewmodel / particles / mobs (dynamic)
    dynBufs();
    gl.uniform1f(gl.getUniformLocation(prog, 'uAlpha'), 1);
    var AP = [], AC = [];
    if (G.third) buildAvatar(AP, AC);
    else buildViewmodel(AP, AC);
    for (var qi = 0; qi < G.mobs.length; qi++) {
      var qm = G.mobs[qi];
      if (qm.kind === 'wolf') {
        var bob = Math.abs(Math.sin(G.time * 8 + qm.phase)) * 0.06;
        emitEllipsoid(AP, AC, qm.x, qm.y + 0.35 + bob, qm.z, 0.35, 0.22, 0.22, [0.42, 0.31, 0.18], 1.2, 10, 8);
        emitSphere(AP, AC, qm.x, qm.y + 0.62 + bob, qm.z - 0.15, 0.16, [0.35, 0.25, 0.14], 1.2, 8, 6);
        emitSphere(AP, AC, qm.x - 0.06, qm.y + 0.65 + bob, qm.z - 0.28, 0.03, [0.1, 0.05, 0.05], 1.3, 4, 3);
        emitSphere(AP, AC, qm.x + 0.06, qm.y + 0.65 + bob, qm.z - 0.28, 0.03, [0.1, 0.05, 0.05], 1.3, 4, 3);
      } else {
        var fl = 0.5 + 0.2 * Math.sin(G.time * 5 + qm.phase);
        var fy = qm.y + 0.6 + 0.1 * Math.sin(G.time * 3 + qm.phase);
        emitSphere(AP, AC, qm.x, fy, qm.z, fl * 0.6, [0.35, 0.9, 1.0], 1.4, 10, 8);
        emitSphere(AP, AC, qm.x, fy, qm.z, fl, [0.5, 0.95, 1.0], 0.6, 8, 6);
      }
    }
    drawDyn(dynP1, dynC1, AP, AC);
    var GP = [], GC = [];
    for (var qi2 = 0; qi2 < G.mobs.length; qi2++) {
      var gm = G.mobs[qi2];
      if (gm.kind !== 'ghost') continue;
      var ga = 0.35 + 0.15 * Math.sin(G.time * 4 + gm.phase);
      emitEllipsoid(GP, GC, gm.x, gm.y + 0.5 + 0.15 * Math.sin(G.time * 2.5 + gm.phase), gm.z,
        0.4, 0.6, 0.4, [0.85, 0.92, 1.0], ga, 10, 8);
    }
    if (GP.length) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      drawDyn(dynP1, dynC1, GP, GC);
      gl.disable(gl.BLEND);
    }
    renderHalloweenMobs();
    var PP = [], PC = [], AP = [], AC = [];
    for (var pi = 0; pi < G.parts.length; pi++) {
      var pt = G.parts[pi], s = 0.09;
      if (pt.ghost || pt.fog || pt.portal || pt.blood) {
        var as = pt.fog ? 0.35 : (pt.blood ? 0.5 : 0.28);
        var bs = s * (pt.fog ? 4 : 2.2);
        emitSphere(AP, AC, pt.x, pt.y, pt.z, bs * 0.5, pt.col, as, 6, 4);
      } else {
        emitSphere(PP, PC, pt.x, pt.y, pt.z, s * 0.5, pt.col, 1.3, 6, 4);
      }
    }
    drawDyn(dynP2, dynC2, PP, PC);
    if (AP.length) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      drawDyn(dynP1, dynC1, AP, AC);
      gl.disable(gl.BLEND);
    }
  }

  // ---------- input ----------
  var keys = {}, joy = { x: 0, y: 0 };
  document.addEventListener('keydown', function (e) {
    AudioSys.init();
    var k = e.key.toLowerCase();
    keys[k] = true;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) >= 0) e.preventDefault();
    if (k === 'f') swing();
    if (k === 'v') { G.third = !G.third; flash(G.third ? '👤 Third person' : '⛏️ First person', 1.5); }
    if (k === 'e') eatApple();
    if (k === 't') placeTorch();
    if (k === 'j') {
      var op = document.getElementById('objpanel');
      if (G.tab !== 0) return;
      if (op.style.display === 'none' || !op.style.display) { paintObjectives(); op.style.display = 'flex'; }
      else op.style.display = 'none';
    }
    if (k === 'k') {
      var qp = document.getElementById('questpanel');
      if (G.tab !== 0) return;
      if (qp.style.display === 'none' || !qp.style.display) { paintQuests(); qp.style.display = 'flex'; }
      else qp.style.display = 'none';
    }
    if (k === 'p') {
      var ap = document.getElementById('awardpanel');
      if (G.tab !== 0) return;
      if (ap.style.display === 'none' || !ap.style.display) { paintAwards(); ap.style.display = 'flex'; }
      else ap.style.display = 'none';
    }
    if (k === 'c') carvePumpkin();
    if (k === 'g') placeJackolantern();
    if (k === 'b') eatPumpkinPie();
    if (k === 'n') eatCaramelApple();
    if (k === 'h') wearWitchHat();
    if (k === 'l') craftSoulLantern();
    if (k === 'o') placeSoulLantern();
    if (k === 'y') drinkPotion('healing');
    if (k === 'u') drinkPotion('speed');
    if (k === 'i') drinkPotion('strength');
    if (k === 'z') trickOrTreat();
    if (k === 'm') {
      var h = document.getElementById('help');
      h.style.display = h.style.display === 'none' ? '' : 'none';
    }
    if (k === 'enter' && !overlay.classList.contains('hidden')) hud('overlay-btn').click();
  });
  document.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  var drag = null;
  canvas.addEventListener('mousedown', function (e) {
    AudioSys.init();
    drag = [e.clientX, e.clientY];
    if (e.button === 2) placeTorch();
    else swing();
  });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('mousemove', function (e) {
    if (!drag) return;
    G.yaw -= (e.clientX - drag[0]) * 0.004;
    G.pitch = Math.max(-1.4, Math.min(1.4, G.pitch - (e.clientY - drag[1]) * 0.003));
    drag = [e.clientX, e.clientY];
  });
  document.addEventListener('mouseup', function () { drag = null; });
  var touch = null, stickId = null, lookId = null, stickC = null, lastT = null;
  var minebtn = document.getElementById('minebtn');
  if ('ontouchstart' in window) minebtn.style.display = 'block';
  minebtn.addEventListener('click', function () { swing(); });
  var flyup = document.getElementById('flyup'), flydn = document.getElementById('flydn');
  if (flyup && flydn && 'ontouchstart' in window) { flyup.style.display = 'block'; flydn.style.display = 'block'; }
  function bindHold(el, key) {
    el.addEventListener('touchstart', function (e) { AudioSys.init(); keys[key] = true; e.preventDefault(); }, { passive: false });
    el.addEventListener('touchend', function (e) { keys[key] = false; e.preventDefault(); });
    el.addEventListener('touchcancel', function () { keys[key] = false; });
    el.addEventListener('mousedown', function () { keys[key] = true; });
    el.addEventListener('mouseup', function () { keys[key] = false; });
    el.addEventListener('mouseleave', function () { keys[key] = false; });
  }
  if (flyup && flydn) { bindHold(flyup, 'r'); bindHold(flydn, 'x'); }
  canvas.addEventListener('touchstart', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.clientX < window.innerWidth * 0.4 && stickId === null) { stickId = t.identifier; stickC = [t.clientX, t.clientY]; }
      else if (lookId === null) { lookId = t.identifier; lastT = [t.clientX, t.clientY]; }
    }
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === stickId) {
        var dx = (t.clientX - stickC[0]) / 40, dy = (t.clientY - stickC[1]) / 40;
        var l = Math.hypot(dx, dy) || 1, cl = Math.min(1, l);
        joy.x = dx / l * cl; joy.y = -dy / l * cl;
      } else if (t.identifier === lookId && lastT) {
        G.yaw -= (t.clientX - lastT[0]) * 0.006;
        G.pitch = Math.max(-1.4, Math.min(1.4, G.pitch - (t.clientY - lastT[1]) * 0.004));
        lastT = [t.clientX, t.clientY];
      }
    }
    e.preventDefault();
  }, { passive: false });
  function endTouch(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === stickId) { stickId = null; joy.x = joy.y = 0; }
      if (t.identifier === lookId) { lookId = null; lastT = null; }
    }
  }
  canvas.addEventListener('touchend', endTouch);
  canvas.addEventListener('touchcancel', endTouch);

  document.getElementById('worldf').addEventListener('click', function () { switchWorld(0); });
  document.getElementById('worldm').addEventListener('click', function () { switchWorld(1); });
  document.getElementById('worldfr').addEventListener('click', function () { switchWorld(2); });
  document.getElementById('worldc').addEventListener('click', function () { switchWorld(3); });
  document.getElementById('newmaze').addEventListener('click', function () {
    newGame(G.world, (Math.random() * 1e9) | 0);
    hideOverlay();
  });
  document.getElementById('shopbtn').addEventListener('click', function () { showShop(); });
  document.getElementById('viewbtn').addEventListener('click', function () {
    // View mode stays first-person since avatar was removed
    flash('⛏️ First person view', 1.5);
  });
  document.getElementById('craftbtn').addEventListener('click', function () { craftTorch(); });
  document.getElementById('objbtn').addEventListener('click', function () {
    var op = document.getElementById('objpanel');
    if (op.style.display === 'none' || !op.style.display) { paintObjectives(); op.style.display = 'flex'; }
    else op.style.display = 'none';
  });
  document.getElementById('questbtn').addEventListener('click', function () {
    var qp = document.getElementById('questpanel');
    if (qp.style.display === 'none' || !qp.style.display) { paintQuests(); qp.style.display = 'flex'; }
    else qp.style.display = 'none';
  });
  document.getElementById('awardbtn').addEventListener('click', function () {
    var ap = document.getElementById('awardpanel');
    if (ap.style.display === 'none' || !ap.style.display) { paintAwards(); ap.style.display = 'flex'; }
    else ap.style.display = 'none';
  });
  document.getElementById('netbtn').addEventListener('click', function () {
    hud('overlay-title').textContent = '🌀 Portal Network';
    hud('overlay-text').textContent = '';
    var nb = document.createElement('div');
    nb.innerHTML = portalNetworkHTML();
    hud('overlay-text').appendChild(nb);
    hud('overlay-btn').textContent = 'Close';
    hud('overlay-btn').onclick = function () { hideOverlay(); };
    hud('overlay-btn2').style.display = 'none';
    overlay.classList.remove('hidden');
  });
  document.getElementById('diffbtn').addEventListener('click', function () {
    hud('overlay-title').textContent = '😱 Difficulty';
    var m = meta();
    hud('overlay-text').textContent = 'Current: ' + DIFFS[m.diff || 1].name;
    var db = document.createElement('div');
    db.innerHTML = DIFFS.map(function (d, i) {
      return '<button style="display:block;width:100%;margin:4px 0;padding:6px;cursor:pointer" onclick="window.__voxelSetDiff(' + i + ')">' + d.name + '</button>';
    }).join('');
    hud('overlay-text').appendChild(db);
    hud('overlay-btn').textContent = 'Close';
    hud('overlay-btn').onclick = function () { hideOverlay(); };
    hud('overlay-btn2').style.display = 'none';
    overlay.classList.remove('hidden');
  });
  document.getElementById('halloweenbtn').addEventListener('click', function () {
    showHalloweenShop();
  });
  function switchWorld(w) {
    var m = meta();
    newGame(w, (Math.random() * 1e9) | 0);
    checkQuests('explore', 1);
    meta().gold = m.gold; meta().coal = m.coal; meta().level = m.level;
    meta().xp = m.xp; meta().pickIdx = m.pickIdx; meta().ach = m.ach;
    saveMeta(); renderHUD(); hideOverlay();
    flash(w === 0 ? '🌲 Forest — surface ores + timber' : '⛏️ Deep Mine — caverns, lava, riches', 3);
  }

  // ---------- loop ----------
  var last = 0;
  function update(dt) {
    G.time += dt;
    var PH = PHYS[G.world] || PHYS[0];
    var prevDayT = G.dayT;
    if (PH.day) G.dayT = (G.dayT + dt / 360) % 1; // 6-minute days
    if (PH.day && G.dayT < prevDayT) checkQuests('survive', 1);
    if (G.swingT < 1) G.swingT = Math.min(1, G.swingT + dt / 0.28);
    updateParts(dt);
    updateMobs(dt);
    updateGhostAI(dt);
    updateHalloween(dt);
    updateGates(dt);
    updatePortals(dt);
    updateWeather(dt);
    if (G.portalCD > 0) G.portalCD -= dt;
    // blood moon event (outdoor worlds)
    if (G.bloodT > 0) {
      G.bloodT -= dt;
      if (Math.random() < dt * 8) spawnBloodMoon();
      if (G.bloodT <= 0) { G.bloodT = 0; flash('🌕 The blood moon fades...', 2.5); }
    } else if (PH.day && Math.random() < dt / 480) {
      G.bloodTotal = G.bloodT = 90;
      flash('🩸 BLOOD MOON RISES — portals stir!', 3.5);
      AudioSys.ambient(1);
    }
    // ghostly trails around wisps/ghosts
    for (var gi = 0; gi < G.mobs.length; gi++) {
      if ((G.mobs[gi].kind === 'wisp' || G.mobs[gi].kind === 'ghost') && Math.random() < dt * 3)
        spawnGhost(G.mobs[gi].x, G.mobs[gi].y, G.mobs[gi].z);
    }
    // fog wisps drift in dark air
    G.fogT -= dt;
    if (G.fogT <= 0) {
      G.fogT = 0.8;
      if (!PH.day && Math.random() < 0.7) spawnFogWisp();
    }
    G.ambT = (G.ambT || 0) - dt;
    if (G.ambT <= 0) {
      G.ambT = 6 + Math.random() * 14;
      if (!PH.day && Math.random() < 0.6) {
        var aa = Math.random() * Math.PI * 2, rr = 5 + Math.random() * 10;
        if (Math.random() < 0.5) AudioSys.drip(G.px + Math.cos(aa) * rr, G.py, G.pz + Math.sin(aa) * rr);
        else AudioSys.moan(G.px + Math.cos(aa) * rr, G.py, G.pz + Math.sin(aa) * rr);
      }
    }
    // dust motes drift in dark air (fireflies at night, dust in caves)
    var dark = (PHYS[G.world] || PHYS[0]).day ? 1 - Math.max(0, dayFactor()) : 1;
    G.moteT = (G.moteT || 0) - dt;
    if (G.moteT <= 0) {
      G.moteT = 0.4;
      if (Math.random() < dark && moteCount() < 24) spawnMote();
    }
    // head-bob while walking grounded
    var hsp = Math.hypot(G.vxh, G.vzh);
    G.bobAmt = G.bobAmt === undefined ? 0 : G.bobAmt + (((hsp > 0.5 && G.onGround) ? 1 : 0) - G.bobAmt) * Math.min(1, dt * 8);
    G.bob = (G.bob || 0) + hsp * dt * 2.4;
    var sp = 4.6 * dt;
    var fw = ((keys.w || keys.arrowup) ? 1 : 0) - ((keys.s || keys.arrowdown) ? 1 : 0) + joy.y;
    var st = ((keys.d ? 1 : 0) - (keys.a ? 1 : 0)) + joy.x;
    var sy = Math.sin(G.yaw), cy = Math.cos(G.yaw);
    // velocity smoothing: ice (low grip) slides, others snap
    var dvx = (sy * fw + cy * st) * sp, dvz = (-cy * fw + sy * st) * sp;
    if (PH.grip >= 1) { G.vxh = dvx; G.vzh = dvz; }
    else {
      var k = Math.min(1, PH.grip * dt * 8);
      G.vxh += (dvx - G.vxh) * k;
      G.vzh += (dvz - G.vzh) * k;
    }
    moveAxis(G.vxh, 0, G.vzh);
    trackStat('dist', Math.hypot(G.vxh, G.vzh) * dt);
    trackStat('playtime', dt);
    var climb = ((keys.r ? 1 : 0) - (keys.x ? 1 : 0));
    if (climb !== 0) { G.vy = climb * 6; G.onGround = false; G.fallPeak = undefined; }
    else {
      G.vy -= PH.grav * dt;
      if ((keys[' '] ) && G.onGround) { G.vy = PH.jump; G.onGround = false; }
    }
    var wasAir = !G.onGround;
    if (!G.onGround) G.fallPeak = Math.max(G.fallPeak === undefined ? -99 : G.fallPeak, G.py);
    moveAxis(0, G.vy * dt, 0);
    if (G.onGround && wasAir && G.fallPeak !== undefined && G.fallPeak > -99) {
      var drop = G.fallPeak - G.py;
      if (drop > 3.5) hurt(Math.round((drop - 3.5) * 8), 'a big fall');
      G.fallPeak = undefined;
    }
    // lava burns + track depth record
    if (get(Math.floor(G.px), Math.floor(G.py + 0.3), Math.floor(G.pz)) === 'lava') {
      G.lavaT = (G.lavaT || 0) + dt;
      if (G.lavaT > 0.5) { G.lavaT = 0; hurt(8, 'lava'); }
    } else G.lavaT = 0;
    if (G.world === 1) {
      meta().stats.deep = Math.min(meta().stats.deep, G.py);
      checkObjectives();
    }
    if (G.py < -5) { // fell out: respawn
      genWorld(); buildAll();
    }
  }
  function loop(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    if (flashT > 0) { flashT -= dt; if (flashT <= 0) document.title = '⛏️ Spooktacular Voxel Worlds'; }
    if (G.tab === 0) update(dt);
    if (flashT > 0) document.title = '⛏️ ' + flashMsg;
    if (G.chunks) render();
    requestAnimationFrame(loop);
  }

  // ---------- boot ----------
  var hash = (window.location.hash || '').replace('#', '');
  var startWorld = { mine: 1, frost: 2, crystal: 3 }[hash] || 0;
  newGame(startWorld);
  if (questDay !== dailySeed()) { questDay = dailySeed(); genQuests(); }
  renderHUD();
  window.SpookyTabs.init({
    tabsId: 'tabs', panelsId: 'tabpanels',
    snapshot: function () {
      var m = meta(), left = 0;
      for (var k in G.blocks) {
        var o = VOX[G.blocks[k]];
        if (o && (o.gold > 0 || o.coal)) left++;
      }
      return { score: G.score, layer: (PHYS[G.world] || PHYS[0]).name, left: left,
        gold: m.gold, level: m.level, pick: S.PICKS[m.pickIdx].name, seed: G.seed,
        relics: 0, ach: m.ach, collected: G.broken };
    },
    onSelect: function (i) { G.tab = i; },
    actions: {
      openShop: function () { showShop(); },
      newMaze: function () { document.getElementById('newmaze').click(); }
    },
    host: { onUnlock: function (id, name) { ach(id, name); } },
    profile: profile()
  });
  overlay.classList.remove('hidden');
  hud('overlay-title').textContent = '⛏️ Voxel Worlds';
  hud('overlay-text').textContent = 'WASD + Space to roam. Click stone to swing. Forest above, riches below — same gold, same picks, everywhere.';
  hud('overlay-btn').textContent = 'Start digging';
  hud('overlay-btn').onclick = function () { hideOverlay(); };
  hud('overlay-btn2').style.display = 'none';
  window.__voxel = { swing: swing, target: targetBlock, state: function () { return G; }, meta: meta,
    cornerLight: cornerLight, cellLight: cellLight, opaqueAt: opaqueAt,
    frustumPlanes: frustumPlanes, chunkVisible: chunkVisible, rebuildAround: rebuildAround,
    carveWorm: carveWorm, buildAvatar: buildAvatar, buildViewmodel: buildViewmodel,
    setDiff: function (i) { setDifficulty(i); },
    buySkin: function (i) { buySkin(i); },
    quests: function () { return G.quests; },
    weather: function () { return G.weather; },
    bloodMoon: bloodMoon,
    debug: function () {
      return {
        dayFactor: dayFactor,
        gold: function () { return meta().gold; },
        hp: function () { return meta().hp; },
        setHP: function (n) { meta().hp = n; },
        apples: function () { return meta().apples || 0; },
        eat: eatApple,
        torches: function () { return G.torches.length; },
        torchesInv: function () { return meta().torchesInv || 0; },
        craft: craftTorch,
        place: placeTorch,
        placed: function () { return G.torches.length; },
        spawn: function (kind) {
          G.mobs.push({ kind: kind, x: G.px + 2, z: G.pz, y: G.py, hp: kind === 'wolf' ? 6 : 3,
            wx: G.px, wz: G.pz, wait: 0, cool: 0, phase: 0 });
        },
        give: function (o) {
          if (o.coal) meta().coal = (meta().coal || 0) + o.coal;
          if (o.wood) meta().wood = (meta().wood || 0) + o.wood;
          if (o.apples) meta().apples = (meta().apples || 0) + o.apples;
        },
        objectives: function () {
          return OBJECTIVES.map(function (o) {
            return { id: o.id, have: o.val(), claimed: !!meta().stats.claimed[o.id] };
          });
        }
      };
    } };
  requestAnimationFrame(loop);

  /* ---- System 11: Smooth 3D Ghost Models (sphere-based spectral entities) ---- */
  function emitSphere(P, C, cx, cy, cz, r, col, alpha, slices, stacks) {
    slices = slices || 8;
    stacks = stacks || 6;
    for (var s = 0; s < stacks; s++) {
      var phi1 = Math.PI * s / stacks;
      var phi2 = Math.PI * (s + 1) / stacks;
      for (var t = 0; t < slices; t++) {
        var theta1 = 2 * Math.PI * t / slices;
        var theta2 = 2 * Math.PI * (t + 1) / slices;
        var p1 = [cx + r * Math.sin(phi1) * Math.cos(theta1), cy + r * Math.cos(phi1), cz + r * Math.sin(phi1) * Math.sin(theta1)];
        var p2 = [cx + r * Math.sin(phi1) * Math.cos(theta2), cy + r * Math.cos(phi1), cz + r * Math.sin(phi1) * Math.sin(theta2)];
        var p3 = [cx + r * Math.sin(phi2) * Math.cos(theta2), cy + r * Math.cos(phi2), cz + r * Math.sin(phi2) * Math.sin(theta2)];
        var p4 = [cx + r * Math.sin(phi2) * Math.cos(theta1), cy + r * Math.cos(phi2), cz + r * Math.sin(phi2) * Math.sin(theta1)];
        P.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2]);
        P.push(p1[0], p1[1], p1[2], p3[0], p3[1], p3[2], p4[0], p4[1], p4[2]);
        for (var i = 0; i < 6; i++) C.push(col[0], col[1], col[2], alpha);
      }
    }
  }

  function emitEllipsoid(P, C, cx, cy, cz, rx, ry, rz, col, alpha, slices, stacks) {
    slices = slices || 10;
    stacks = stacks || 8;
    for (var s = 0; s < stacks; s++) {
      var phi1 = Math.PI * s / stacks;
      var phi2 = Math.PI * (s + 1) / stacks;
      for (var t = 0; t < slices; t++) {
        var theta1 = 2 * Math.PI * t / slices;
        var theta2 = 2 * Math.PI * (t + 1) / slices;
        var p1 = [cx + rx * Math.sin(phi1) * Math.cos(theta1), cy + ry * Math.cos(phi1), cz + rz * Math.sin(phi1) * Math.sin(theta1)];
        var p2 = [cx + rx * Math.sin(phi1) * Math.cos(theta2), cy + ry * Math.cos(phi1), cz + rz * Math.sin(phi1) * Math.sin(theta2)];
        var p3 = [cx + rx * Math.sin(phi2) * Math.cos(theta2), cy + ry * Math.cos(phi2), cz + rz * Math.sin(phi2) * Math.sin(theta2)];
        var p4 = [cx + rx * Math.sin(phi2) * Math.cos(theta1), cy + ry * Math.cos(phi2), cz + rz * Math.sin(phi2) * Math.sin(theta1)];
        P.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2]);
        P.push(p1[0], p1[1], p1[2], p3[0], p3[1], p3[2], p4[0], p4[1], p4[2]);
        for (var i = 0; i < 6; i++) C.push(col[0], col[1], col[2], alpha);
      }
    }
  }

  function emitCylinder(P, C, cx, cy, cz, r, h, col, alpha, slices) {
    slices = slices || 8;
    for (var i = 0; i < slices; i++) {
      var a1 = 2 * Math.PI * i / slices;
      var a2 = 2 * Math.PI * (i + 1) / slices;
      var x1 = cx + r * Math.cos(a1), z1 = cz + r * Math.sin(a1);
      var x2 = cx + r * Math.cos(a2), z2 = cz + r * Math.sin(a2);
      P.push(x1, cy, z1, x2, cy, z2, x2, cy + h, z2);
      P.push(x1, cy, z1, x2, cy + h, z2, x1, cy + h, z1);
      for (var j = 0; j < 6; j++) C.push(col[0], col[1], col[2], alpha);
    }
  }

  function emitCone(P, C, cx, cy, cz, r, h, col, alpha, slices) {
    slices = slices || 8;
    for (var i = 0; i < slices; i++) {
      var a1 = 2 * Math.PI * i / slices;
      var a2 = 2 * Math.PI * (i + 1) / slices;
      var x1 = cx + r * Math.cos(a1), z1 = cz + r * Math.sin(a1);
      var x2 = cx + r * Math.cos(a2), z2 = cz + r * Math.sin(a2);
      P.push(x1, cy, z1, x2, cy, z2, cx, cy + h, cz);
      for (var j = 0; j < 3; j++) C.push(col[0], col[1], col[2], alpha);
    }
  }

  function emitOctahedron(P, C, cx, cy, cz, r, col, alpha) {
    var top = [cx, cy + r, cz], bot = [cx, cy - r, cz];
    var pts = [[cx + r, cy, cz], [cx, cy, cz + r], [cx - r, cy, cz], [cx, cy, cz - r]];
    for (var i = 0; i < 4; i++) {
      var p1 = pts[i], p2 = pts[(i + 1) % 4];
      P.push(top[0], top[1], top[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]);
      P.push(bot[0], bot[1], bot[2], p2[0], p2[1], p2[2], p1[0], p1[1], p1[2]);
      for (var j = 0; j < 6; j++) C.push(col[0], col[1], col[2], alpha);
    }
  }

  function emitHexPrism(P, C, cx, cy, cz, r, h, col, alpha) {
    for (var i = 0; i < 6; i++) {
      var a1 = Math.PI / 3 * i, a2 = Math.PI / 3 * (i + 1);
      var x1 = cx + r * Math.cos(a1), z1 = cz + r * Math.sin(a1);
      var x2 = cx + r * Math.cos(a2), z2 = cz + r * Math.sin(a2);
      P.push(x1, cy, z1, x2, cy, z2, x2, cy + h, z2);
      P.push(x1, cy, z1, x2, cy + h, z2, x1, cy + h, z1);
      for (var j = 0; j < 6; j++) C.push(col[0], col[1], col[2], alpha);
    }
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 3 * i + Math.PI / 6;
      P.push(cx + r * Math.cos(a), cy + h, cz + r * Math.sin(a));
    }
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 3 * i + Math.PI / 6;
      P.push(cx + r * Math.cos(a), cy, cz + r * Math.sin(a));
    }
  }

  function emitCrystalCylinder(P, C, cx, cy, cz, r, h, col, alpha, sides) {
    sides = sides || 6;
    for (var i = 0; i < sides; i++) {
      var a1 = Math.PI * 2 * i / sides, a2 = Math.PI * 2 * (i + 1) / sides;
      var x1 = cx + r * Math.cos(a1), z1 = cz + r * Math.sin(a1);
      var x2 = cx + r * Math.cos(a2), z2 = cz + r * Math.sin(a2);
      P.push(x1, cy, z1, x2, cy, z2, x2, cy + h * 0.7, z2);
      P.push(x1, cy, z1, x2, cy + h * 0.7, z2, x1, cy + h * 0.7, z1);
      for (var j = 0; j < 6; j++) C.push(col[0], col[1], col[2], alpha);
    }
    for (var i = 0; i < sides; i++) {
      var a = Math.PI * 2 * i / sides;
      P.push(cx + r * Math.cos(a), cy + h * 0.7, cz + r * Math.sin(a));
    }
    for (var i = 0; i < sides; i++) {
      var a = Math.PI * 2 * i / sides;
      P.push(cx + r * Math.cos(a) * 0.3, cy + h, cz + r * Math.sin(a) * 0.3);
    }
  }

  function emitTorus(P, C, cx, cy, cz, R, r, col, alpha, segs, sides) {
    segs = segs || 12; sides = sides || 6;
    for (var i = 0; i < segs; i++) {
      var a1 = Math.PI * 2 * i / segs, a2 = Math.PI * 2 * (i + 1) / segs;
      for (var j = 0; j < sides; j++) {
        var b1 = Math.PI * 2 * j / sides, b2 = Math.PI * 2 * (j + 1) / sides;
        var p1 = [cx + (R + r * Math.cos(b1)) * Math.cos(a1), cy + r * Math.sin(b1), cz + (R + r * Math.cos(b1)) * Math.sin(a1)];
        var p2 = [cx + (R + r * Math.cos(b2)) * Math.cos(a1), cy + r * Math.sin(b2), cz + (R + r * Math.cos(b2)) * Math.sin(a1)];
        var p3 = [cx + (R + r * Math.cos(b2)) * Math.cos(a2), cy + r * Math.sin(b2), cz + (R + r * Math.cos(b2)) * Math.sin(a2)];
        var p4 = [cx + (R + r * Math.cos(b1)) * Math.cos(a2), cy + r * Math.sin(b1), cz + (R + r * Math.cos(b1)) * Math.sin(a2)];
        P.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2]);
        P.push(p1[0], p1[1], p1[2], p3[0], p3[1], p3[2], p4[0], p4[1], p4[2]);
        for (var k = 0; k < 6; k++) C.push(col[0], col[1], col[2], alpha);
      }
    }
  }

  function emitIcosahedron(P, C, cx, cy, cz, r, col, alpha) {
    var t = (1 + Math.sqrt(5)) / 2;
    var verts = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
    ];
    var faces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];
    for (var i = 0; i < faces.length; i++) {
      var f = faces[i];
      for (var j = 0; j < 3; j++) {
        var v = verts[f[j]];
        P.push(cx + v[0] * r * 0.6, cy + v[1] * r * 0.6, cz + v[2] * r * 0.6);
      }
      for (var j = 0; j < 3; j++) C.push(col[0], col[1], col[2], alpha);
    }
  }

  function emitDodecahedron(P, C, cx, cy, cz, r, col, alpha) {
    var t = (1 + Math.sqrt(5)) / 2, r2 = 1 / t;
    var verts = [
      [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
      [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
      [0, r2, t], [0, r2, -t], [0, -r2, t], [0, -r2, -t],
      [r2, t, 0], [r2, -t, 0], [-r2, t, 0], [-r2, -t, 0],
      [t, 0, r2], [t, 0, -r2], [-t, 0, r2], [-t, 0, -r2]
    ];
    var faces = [
      [0, 8, 4, 14, 12], [0, 12, 1, 18, 16], [0, 16, 2, 10, 8],
      [1, 9, 5, 14, 12], [1, 18, 3, 11, 9], [2, 10, 6, 15, 13],
      [2, 13, 3, 18, 16], [3, 11, 7, 15, 13], [4, 8, 10, 6, 15],
      [4, 15, 7, 19, 14], [5, 9, 11, 7, 19], [5, 19, 14, 12],
      [6, 15, 7, 11, 9], [6, 9, 5, 14, 8]
    ];
    for (var i = 0; i < faces.length; i++) {
      var f = faces[i];
      for (var j = 0; j < f.length - 2; j++) {
        var v1 = verts[f[0]], v2 = verts[f[j + 1]], v3 = verts[f[j + 2]];
        P.push(cx + v1[0] * r * 0.5, cy + v1[1] * r * 0.5, cz + v1[2] * r * 0.5);
        P.push(cx + v2[0] * r * 0.5, cy + v2[1] * r * 0.5, cz + v2[2] * r * 0.5);
        P.push(cx + v3[0] * r * 0.5, cy + v3[1] * r * 0.5, cz + v3[2] * r * 0.5);
        for (var k = 0; k < 3; k++) C.push(col[0], col[1], col[2], alpha);
      }
    }
  }

  function emitAnimatedCrystal(P, C, cx, cy, cz, r, h, col, phase) {
    var t = G.time * 2 + phase;
    var pulse = 0.8 + 0.2 * Math.sin(t * 3);
    var glowR = r * (1.2 + 0.3 * Math.sin(t * 2));
    emitSphere(P, C, cx, cy + h * 0.4, cz, glowR, [col[0] * 0.5, col[1] * 0.5, col[2] * 0.5], 0.15 * pulse, 8, 6);
    emitCrystalCylinder(P, C, cx, cy, cz, r * 0.4, h * 0.7, col, 0.9 * pulse, 6);
    emitCone(P, C, cx, cy + h * 0.7, cz, r * 0.4, h * 0.3, [Math.min(1, col[0] * 1.3), Math.min(1, col[1] * 1.3), Math.min(1, col[2] * 1.3)], pulse, 6);
    for (var i = 0; i < 4; i++) {
      var a = t * 0.5 + i * Math.PI / 2;
      var ox = Math.cos(a) * r * 0.6, oz = Math.sin(a) * r * 0.6;
      emitOctahedron(P, C, cx + ox, cy + h * 0.3, cz + oz, r * 0.15, [col[0] * 0.7, col[1] * 0.7, col[2] * 0.7], 0.6 * pulse);
    }
  }

  function emitCrystalStalagmite(P, C, cx, cy, cz, h, r, col, phase) {
    var t = G.time + phase;
    var sway = Math.sin(t * 1.5) * 0.02;
    emitCone(P, C, cx + sway, cy, cz, r, h, col, 0.95, 8);
    emitCone(P, C, cx + sway, cy + h * 0.6, cz, r * 0.6, h * 0.4, [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8], 0.9, 6);
    emitSphere(P, C, cx + sway, cy + h, cz, r * 0.15, [Math.min(1, col[0] * 1.2), Math.min(1, col[1] * 1.2), Math.min(1, col[2] * 1.2)], 0.7, 4, 3);
  }

  function emitCrystalStalactite(P, C, cx, cy, cz, h, r, col, phase) {
    var t = G.time + phase;
    var sway = Math.sin(t * 1.5) * 0.02;
    emitCone(P, C, cx + sway, cy - h, cz, r, h, col, 0.95, 8);
    emitCone(P, C, cx + sway, cy - h * 0.6, cz, r * 0.6, h * 0.4, [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8], 0.9, 6);
    emitSphere(P, C, cx + sway, cy - h, cz, r * 0.15, [Math.min(1, col[0] * 1.2), Math.min(1, col[1] * 1.2), Math.min(1, col[2] * 1.2)], 0.7, 4, 3);
  }

  function buildGhost3D(P, C, x, y, z, phase, scale) {
    scale = scale || 1;
    var t = G.time + phase;
    var hover = Math.sin(t * 2.1) * 0.15 * scale;
    var sway = Math.sin(t * 1.3) * 0.1;
    var alpha = 0.65 + 0.15 * Math.sin(t * 3.7);
    var body = [0.75, 0.85, 1.0];
    var bodyDark = [0.5, 0.6, 0.85];
    var eye = [0.05, 0.02, 0.08];
    var mouth = [0.03, 0.01, 0.05];
    var glow = [0.4, 0.6, 0.9];
    var cx = x, cy = y + hover, cz = z;
    emitEllipsoid(P, C, cx, cy + 0.3 * scale, cz, 0.35 * scale, 0.5 * scale, 0.28 * scale, body, alpha, 12, 10);
    emitEllipsoid(P, C, cx, cy + 0.75 * scale, cz, 0.25 * scale, 0.22 * scale, 0.22 * scale, body, alpha, 10, 8);
    emitSphere(P, C, cx - 0.1 * scale, cy + 0.78 * scale, cz + 0.18 * scale, 0.05 * scale, eye, alpha + 0.25, 6, 4);
    emitSphere(P, C, cx + 0.1 * scale, cy + 0.78 * scale, cz + 0.18 * scale, 0.05 * scale, eye, alpha + 0.25, 6, 4);
    emitEllipsoid(P, C, cx, cy + 0.55 * scale, cz + 0.2 * scale, 0.08 * scale, 0.04 * scale, 0.02 * scale, mouth, alpha + 0.15, 6, 4);
    for (var w = 0; w < 5; w++) {
      var wx = cx + (w - 2) * 0.15 * scale;
      var wave = Math.sin(t * 4 + w * 1.2) * 0.08 * scale;
      var taper = 1 - Math.abs(w - 2) * 0.2;
      emitCone(P, C, wx, cy - 0.2 * scale + wave, cz + sway, 0.08 * scale * taper, 0.3 * scale * taper, bodyDark, alpha * 0.6, 6);
    }
    for (var a = 0; a < 2; a++) {
      var ax = cx + (a === 0 ? -0.3 : 0.3) * scale;
      var armWave = Math.sin(t * 2.5 + a * 2) * 0.12 * scale;
      emitCylinder(P, C, ax, cy + 0.1 * scale + armWave, cz, 0.06 * scale, 0.35 * scale, body, alpha * 0.7, 6);
      emitSphere(P, C, ax + (a === 0 ? -0.06 : 0.06) * scale, cy - 0.1 * scale + armWave, cz, 0.05 * scale, bodyDark, alpha * 0.5, 6, 4);
    }
    emitSphere(P, C, cx, cy + 0.3 * scale, cz, 0.4 * scale, glow, alpha * 0.15, 8, 6);
  }

  /* ---- System 12: Horror Props (coffins, gravestones, skeletons, pentagrams) ---- */
  function genHorrorProps() {
    G.props = [];
    var rng = new S.SeededRNG(G.seed + G.world * 991 + 77);
    var i, x, z, y;
    if (G.world === 0 || G.world === 2) {
      for (i = 0; i < 8; i++) {
        x = 3 + rng.nextInt(G.W - 6); z = 3 + rng.nextInt(G.D - 6);
        y = groundY(x, z);
        if (get(x, y - 1, z) !== 'grass' && get(x, y - 1, z) !== 'snow') continue;
        G.props.push({ type: 'gravestone', x: x + 0.5, y: y, z: z + 0.5, rot: rng.nextDouble() * 0.6 - 0.3 });
      }
      for (i = 0; i < 4; i++) {
        x = 4 + rng.nextInt(G.W - 8); z = 4 + rng.nextInt(G.D - 8);
        y = groundY(x, z);
        if (get(x, y - 1, z) !== 'grass') continue;
        G.props.push({ type: 'skeleton', x: x + 0.5, y: y, z: z + 0.5, rot: rng.nextDouble() * Math.PI });
      }
      for (i = 0; i < 3; i++) {
        x = 5 + rng.nextInt(G.W - 10); z = 5 + rng.nextInt(G.D - 10);
        y = groundY(x, z);
        if (get(x, y - 1, z) !== 'grass') continue;
        G.props.push({ type: 'deadtree', x: x + 0.5, y: y, z: z + 0.5, s: 0.8 + rng.nextDouble() * 0.6 });
      }
    }
    if (G.world === 1 || G.world === 3) {
      for (i = 0; i < 6; i++) {
        x = 3 + rng.nextInt(G.W - 6); z = 3 + rng.nextInt(G.D - 6);
        var gy = -1;
        for (y = 8; y >= 1; y--) { if (solidAt(x, y, z)) { gy = y + 1; break; } }
        if (gy < 1) continue;
        G.props.push({ type: 'coffin', x: x + 0.5, y: gy, z: z + 0.5, rot: rng.nextDouble() * 0.8 - 0.4 });
      }
      for (i = 0; i < 5; i++) {
        x = 3 + rng.nextInt(G.W - 6); z = 3 + rng.nextInt(G.D - 6);
        var gy2 = -1;
        for (y = 8; y >= 1; y--) { if (solidAt(x, y, z)) { gy2 = y + 1; break; } }
        if (gy2 < 1) continue;
        G.props.push({ type: 'bones', x: x + 0.5, y: gy2, z: z + 0.5, rot: rng.nextDouble() * Math.PI });
      }
      for (i = 0; i < 4; i++) {
        x = 4 + rng.nextInt(G.W - 8); z = 4 + rng.nextInt(G.D - 8);
        var gy3 = -1;
        for (y = 8; y >= 1; y--) { if (solidAt(x, y, z)) { gy3 = y + 1; break; } }
        if (gy3 < 1) continue;
        G.props.push({ type: 'pentagram', x: x + 0.5, y: gy3, z: z + 0.5, rot: rng.nextDouble() * Math.PI });
      }
      for (i = 0; i < 3; i++) {
        x = 3 + rng.nextInt(G.W - 6); z = 3 + rng.nextInt(G.D - 6);
        var gy4 = -1;
        for (y = 8; y >= 1; y--) { if (solidAt(x, y, z)) { gy4 = y + 1; break; } }
        if (gy4 < 1) continue;
        G.props.push({ type: 'candles', x: x + 0.5, y: gy4, z: z + 0.5, phase: rng.nextDouble() * 6 });
      }
    }
  }

  function drawProps(P, C) {
    if (!G.props) return;
    var i, p;
    for (i = 0; i < G.props.length; i++) {
      p = G.props[i];
      var dx = p.x - G.px, dz = p.z - G.pz;
      if (dx * dx + dz * dz > 900) continue;
      if (p.type === 'gravestone') {
        emitBox(P, C, [p.x, p.y, p.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0.3, 0, 0.35, 0.6, 0.12, [0.45, 0.45, 0.52], 1.1);
        emitSphere(P, C, p.x, p.y + 0.65 * 0.5, p.z, 0.25, [0.42, 0.42, 0.5], 1.1, 8, 6);
        emitBox(P, C, [p.x, p.y, p.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0.32, 0.07, 0.08, 0.25, 0.02, [0.6, 0.7, 0.5], 0.9);
      } else if (p.type === 'skeleton') {
        emitCylinder(P, C, p.x, p.y, p.z, 0.15, 0.06, [0.85, 0.82, 0.75], 1.1, 8);
        emitSphere(P, C, p.x, p.y + 0.12, p.z, 0.12, [0.88, 0.85, 0.78], 1.1, 8, 6);
        emitSphere(P, C, p.x - 0.04, p.y + 0.12, p.z + 0.07, 0.03, [0.1, 0.1, 0.1], 1.2, 4, 3);
        emitSphere(P, C, p.x + 0.04, p.y + 0.12, p.z + 0.07, 0.03, [0.1, 0.1, 0.1], 1.2, 4, 3);
      } else if (p.type === 'deadtree') {
        var s = p.s;
        emitCylinder(P, C, p.x, p.y, p.z, 0.08 * s, 1.0 * s, [0.2, 0.12, 0.08], 1.1, 8);
        emitCylinder(P, C, p.x + 0.2 * s, p.y + 0.5 * s, p.z, 0.05 * s, 0.5 * s, [0.18, 0.1, 0.07], 1.1, 6);
        emitCylinder(P, C, p.x - 0.15 * s, p.y + 0.4 * s, p.z + 0.1 * s, 0.04 * s, 0.4 * s, [0.18, 0.1, 0.07], 1.1, 6);
      } else if (p.type === 'coffin') {
        emitBox(P, C, [p.x, p.y, p.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0.15, 0, 0.5, 0.3, 0.9, [0.3, 0.18, 0.1], 1.1);
        emitBox(P, C, [p.x, p.y, p.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0.32, 0, 0.45, 0.06, 0.8, [0.35, 0.22, 0.12], 1.1);
        emitSphere(P, C, p.x, p.y + 0.36, p.z + 0.3, 0.06, [0.7, 0.65, 0.5], 0.9, 6, 4);
      } else if (p.type === 'bones') {
        emitCylinder(P, C, p.x, p.y, p.z, 0.04, 0.25, [0.8, 0.78, 0.72], 1.1, 6);
        emitCylinder(P, C, p.x + 0.15, p.y, p.z + 0.1, 0.04, 0.2, [0.78, 0.76, 0.7], 1.1, 6);
        emitCylinder(P, C, p.x - 0.12, p.y, p.z - 0.08, 0.035, 0.18, [0.82, 0.8, 0.74], 1.1, 6);
      } else if (p.type === 'pentagram') {
        var pr = 0.5;
        for (var a = 0; a < 5; a++) {
          var a1 = a * Math.PI * 2 / 5 - Math.PI / 2;
          var a2 = (a + 1) * Math.PI * 2 / 5 - Math.PI / 2;
          var x1 = p.x + Math.cos(a1) * pr, z1 = p.z + Math.sin(a1) * pr;
          var x2 = p.x + Math.cos(a2) * pr, z2 = p.z + Math.sin(a2) * pr;
          var mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
          emitBox(P, C, [mx, p.y + 0.02, mz], [1, 0, 0], [0, 1, 0], [0, 0, 1],
            0, 0, 0, Math.abs(x2 - x1) / 2 + 0.03, 0.02, Math.abs(z2 - z1) / 2 + 0.03, [0.6, 0.1, 0.15], 0.7);
        }
        emitCylinder(P, C, p.x, p.y + 0.02, p.z, pr, 0.015, [0.5, 0.08, 0.12], 0.6, 16);
      } else if (p.type === 'candles') {
        for (var ci = 0; ci < 4; ci++) {
          var ca = ci * Math.PI / 2 + 0.4;
          var cx2 = p.x + Math.cos(ca) * 0.25, cz2 = p.z + Math.sin(ca) * 0.25;
          var ch = 0.1 + (ci % 2) * 0.08;
          emitCylinder(P, C, cx2, p.y, cz2, 0.03, ch, [0.9, 0.85, 0.7], 1.1, 6);
          var fl = 0.6 + 0.3 * Math.sin(G.time * 9 + p.phase + ci);
          emitSphere(P, C, cx2, p.y + ch + 0.04, cz2, 0.025, [1.0, 0.7, 0.2], fl, 4, 3);
        }
      }
    }
  }

  /* ---- System 13: Ghost Trail Particles & Aura ---- */
  function spawnGhostAura(x, y, z) {
    var a = Math.random() * Math.PI * 2;
    var r = 0.2 + Math.random() * 0.3;
    G.parts.push({
      x: x + Math.cos(a) * r, y: y + Math.random() * 0.8, z: z + Math.sin(a) * r,
      vx: (Math.random() - 0.5) * 0.1, vy: 0.1 + Math.random() * 0.15, vz: (Math.random() - 0.5) * 0.1,
      life: 0.6 + Math.random() * 0.5, col: [0.6, 0.8, 1.0], grav: -0.02, ghost: true
    });
  }

  /* ---- System 14: Dynamic Shadow Simulation (blob shadows under entities) ---- */
  function drawBlobShadows(P, C) {
    var i, m;
    for (i = 0; i < G.mobs.length; i++) {
      m = G.mobs[i];
      var dx = m.x - G.px, dz = m.z - G.pz;
      if (dx * dx + dz * dz > 400) continue;
      var gy = -1;
      for (var y = Math.min(G.H - 1, Math.floor(m.y) + 1); y >= 0; y--) {
        if (solidAt(Math.floor(m.x), y, Math.floor(m.z))) { gy = y + 1; break; }
      }
      if (gy < 0) continue;
      var h = m.y - gy;
      var shadowScale = Math.max(0.3, 1 - h * 0.15);
      var sr = 0.35 * shadowScale;
      emitEllipsoid(P, C, m.x, gy + 0.01, m.z, sr, 0.01, sr, [0.05, 0.03, 0.08], 0.4, 8, 4);
    }
  }

  /* ---- System 15: Ambient Occlusion Enhancement (corner darkening) ---- */
  function calcAO(x, y, z, faceDir) {
    var occ = 0;
    var checks = [
      [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
    ];
    for (var i = 0; i < 6; i++) {
      var d = checks[i];
      if (solidAt(x + d[0], y + d[1], z + d[2])) occ += 0.15;
      if (solidAt(x + d[0] + faceDir[0], y + d[1] + faceDir[1], z + d[2] + faceDir[2])) occ += 0.08;
    }
    return Math.min(1, occ);
  }

  /* ---- System 16: Footstep Dust & Interaction Particles ---- */
  function spawnFootstep() {
    G.parts.push({
      x: G.px + (Math.random() - 0.5) * 0.3, y: G.py + 0.05, z: G.pz + (Math.random() - 0.5) * 0.3,
      vx: (Math.random() - 0.5) * 0.3, vy: 0.3 + Math.random() * 0.3, vz: (Math.random() - 0.5) * 0.3,
      life: 0.4 + Math.random() * 0.3, col: [0.5, 0.45, 0.4], grav: 0.5
    });
  }

  /* ---- System 17: Ghost Whisper System (proximity-based spooky messages) ---- */
  var WHISPERS = [
    '...behind you...', '...cold...', '...they watch...', '...leave...',
    '...the moon sees...', '...dig deeper...', '...no escape...', '...join us...',
    '...the crystals sing...', '...blood calls blood...', '...the gate opens...',
    '...remember...', '...so dark...', '...they hunger...', '...turn back...'
  ];
  var whisperT = 0;
  function updateWhispers(dt) {
    whisperT -= dt;
    if (whisperT > 0) return;
    whisperT = 12 + Math.random() * 20;
    var dark = (PHYS[G.world] || PHYS[0]).day ? 1 - Math.max(0, dayFactor()) : 1;
    if (Math.random() < dark * 0.7) {
      var msg = WHISPERS[(Math.random() * WHISPERS.length) | 0];
      flash('👻 ' + msg, 2.5);
      AudioSys.moan(G.px + (Math.random() - 0.5) * 8, G.py, G.pz + (Math.random() - 0.5) * 8);
    }
  }

  /* ---- System 18: Dynamic Music Intensity (combat/night/danger) ---- */
  function dangerLevel() {
    var d = 0;
    for (var i = 0; i < G.mobs.length; i++) {
      var dx = G.mobs[i].x - G.px, dz = G.mobs[i].z - G.pz;
      var dist = Math.hypot(dx, dz);
      if (dist < 8) d += (8 - dist) / 8;
    }
    var dark = (PHYS[G.world] || PHYS[0]).day ? 1 - Math.max(0, dayFactor()) : 1;
    d += dark * 0.3;
    if (bloodMoon() > 0) d += bloodMoon() * 0.5;
    return Math.min(1, d);
  }

  /* ---- System 19: Procedural Cave Sounds (drips, rumbles, echoes) ---- */
  function updateCaveAudio(dt) {
    G.caveT = (G.caveT || 0) - dt;
    if (G.caveT > 0) return;
    G.caveT = 3 + Math.random() * 8;
    var PH = PHYS[G.world] || PHYS[0];
    if (!PH.day) {
      var roll = Math.random();
      if (roll < 0.4) {
        var a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 12;
        AudioSys.drip(G.px + Math.cos(a) * r, G.py + Math.random() * 3, G.pz + Math.sin(a) * r);
      } else if (roll < 0.6) {
        AudioSys.moan(G.px + (Math.random() - 0.5) * 15, G.py, G.pz + (Math.random() - 0.5) * 15);
      } else if (roll < 0.7) {
        AudioSys.noise(AudioSys.master, 0.8, 150, 0.04);
      }
    }
  }

  /* ---- System 20: Ghost Possession Effect (screen distortion via fog color) ---- */
  function possessionFactor() {
    var d = 0;
    for (var i = 0; i < G.mobs.length; i++) {
      if (G.mobs[i].kind !== 'ghost') continue;
      var dx = G.mobs[i].x - G.px, dz = G.mobs[i].z - G.pz;
      var dist = Math.hypot(dx, dz);
      if (dist < 4) d += (4 - dist) / 4;
    }
    return Math.min(1, d);
  }

  /* ---- System 21: Multi-layer Fog (distance + height fog) ---- */
  function heightFog(y) {
    var PH = PHYS[G.world] || PHYS[0];
    if (PH.day) return 0;
    var depth = Math.max(0, 3 - y);
    return depth * 0.08;
  }

  /* ---- System 22: Ghost Interaction (touch to banish with pickaxe) ---- */
  function banishGhost(m) {
    var idx = G.mobs.indexOf(m);
    if (idx < 0) return;
    for (var i = 0; i < 8; i++) {
      spawnGhostAura(m.x, m.y + 0.5, m.z);
    }
    G.mobs.splice(idx, 1);
    meta().stats.kills++;
    meta().gold += 15;
    meta().stats.goldRun += 15;
    gainXP(25);
    flash('👻 Ghost banished! +15 gold, +25 XP', 2);
    AudioSys.tone(AudioSys.master, 600, 1200, 0.4, 'sine', 0.2);
    checkQuests('kill', 1);
    saveMeta(); renderHUD();
  }

  /* ---- System 23: Ghost Lure Item (craftable, attracts then banishes) ---- */
  function craftLure() {
    var m = meta();
    if ((m.coal || 0) < 3 || (m.wood || 0) < 2) { flash('Ghost lure needs 3 coal + 2 wood'); return; }
    m.coal -= 3; m.wood -= 2;
    m.lures = (m.lures || 0) + 1;
    flash('🎣 Ghost lure crafted! (G to use)');
    saveMeta(); renderHUD();
  }

  function useLure() {
    var m = meta();
    if ((m.lures || 0) <= 0) { flash('No lures — craft some! (3 coal + 2 wood)'); return; }
    m.lures--;
    for (var i = 0; i < G.mobs.length; i++) {
      if (G.mobs[i].kind === 'ghost') {
        var gm = G.mobs[i];
        var dx = gm.x - G.px, dz = gm.z - G.pz;
        var dist = Math.hypot(dx, dz);
        if (dist < 10) { banishGhost(gm); break; }
      }
    }
    if (G.mobs.length === 0 || !G.mobs.some(function (g) { return g.kind === 'ghost'; })) {
      flash('No ghosts nearby to lure...');
    }
    saveMeta(); renderHUD();
  }

  /* ---- System 24: Ghost King Boss (spawns during blood moon) ---- */
  function spawnGhostKing() {
    var a = Math.random() * Math.PI * 2;
    var r = 10 + Math.random() * 5;
    var x = G.px + Math.cos(a) * r, z = G.pz + Math.sin(a) * r;
    var gy = groundY(Math.floor(x), Math.floor(z));
    G.mobs.push({
      kind: 'ghostking', x: x + 0.5, z: z + 0.5, y: gy + 0.5,
      hp: 30, wx: x, wz: z, wait: 0, cool: 0, phase: 0, path: [], repath: 0
    });
    flash('👑 THE GHOST KING RISES!', 4);
    AudioSys.moan(G.px, G.py + 2, G.pz);
    AudioSys.ambient(1);
  }

  function updateGhostKing(dt) {
    for (var i = G.mobs.length - 1; i >= 0; i--) {
      var m = G.mobs[i];
      if (m.kind !== 'ghostking') continue;
      m.cool -= dt;
      var dx = G.px - m.x, dz = G.pz - m.z;
      var dist = Math.hypot(dx, dz);
      if (dist < 12 && dist > 1.5) {
        var sp = 1.8;
        var nx = m.x + dx / dist * sp * dt, nz = m.z + dz / dist * sp * dt;
        if (!circleHits(nx, m.z, m.y)) m.x = nx;
        if (!circleHits(m.x, nz, m.y)) m.z = nz;
      }
      if (dist < 2 && m.cool <= 0) {
        m.cool = 1.8;
        hurt(12, 'touched by the Ghost King');
        spawnGhostAura(m.x, m.y, m.z);
      }
      if (Math.random() < dt * 2) spawnGhostAura(m.x, m.y + 0.5, m.z);
      m.y += Math.sin(G.time * 1.8 + m.phase) * dt * 0.4;
    }
  }

  /* ---- System 25: Ghost King 3D Model (large, crown, cape) ---- */
  function drawGhostKing(P, C, m) {
    var t = G.time + m.phase;
    var s = 1.4;
    var hover = Math.sin(t * 1.5) * 0.18;
    var cx = m.x, cy = m.y + hover, cz = m.z;
    var body = [0.65, 0.75, 1.0];
    var bodyDark = [0.4, 0.5, 0.8];
    var alpha = 0.7 + 0.1 * Math.sin(t * 3);
    var crown = [1.0, 0.8, 0.2];
    var eyeGlow = [0.1, 0.0, 0.2];
    emitEllipsoid(P, C, cx, cy + 0.4 * s, cz, 0.45 * s, 0.65 * s, 0.35 * s, body, alpha, 14, 12);
    emitEllipsoid(P, C, cx, cy + 0.9 * s, cz, 0.3 * s, 0.28 * s, 0.28 * s, body, alpha, 12, 10);
    emitEllipsoid(P, C, cx, cy + 1.2 * s, cz, 0.35 * s, 0.18 * s, 0.3 * s, body, alpha * 0.85, 12, 8);
    emitSphere(P, C, cx, cy + 1.35 * s, cz, 0.12 * s, crown, alpha + 0.2, 8, 6);
    for (var c = 0; c < 5; c++) {
      var ca = c * Math.PI * 2 / 5;
      emitCone(P, C, cx + Math.cos(ca) * 0.1 * s, cy + 1.4 * s, cz + Math.sin(ca) * 0.1 * s, 0.025 * s, 0.12 * s, crown, alpha + 0.25, 6);
    }
    emitSphere(P, C, cx - 0.12 * s, cy + 1.25 * s, cz + 0.22 * s, 0.06 * s, eyeGlow, alpha + 0.3, 6, 4);
    emitSphere(P, C, cx + 0.12 * s, cy + 1.25 * s, cz + 0.22 * s, 0.06 * s, eyeGlow, alpha + 0.3, 6, 4);
    emitEllipsoid(P, C, cx, cy + 1.0 * s, cz + 0.25 * s, 0.1 * s, 0.05 * s, 0.03 * s, [0.05, 0.0, 0.1], alpha + 0.2, 6, 4);
    for (var w = 0; w < 6; w++) {
      var wx = cx + (w - 2.5) * 0.14 * s;
      var wave = Math.sin(t * 3.5 + w) * 0.1 * s;
      var taper = 1 - Math.abs(w - 2.5) * 0.15;
      emitCone(P, C, wx, cy - 0.3 * s + wave, cz, 0.1 * s * taper, 0.35 * s * taper, bodyDark, alpha * 0.55, 6);
    }
    for (var a = 0; a < 2; a++) {
      var ax = cx + (a === 0 ? -0.4 : 0.4) * s;
      var armWave = Math.sin(t * 2 + a * 2.5) * 0.15 * s;
      emitCylinder(P, C, ax, cy + 0.1 * s + armWave, cz, 0.08 * s, 0.45 * s, body, alpha * 0.65, 8);
      emitSphere(P, C, ax + (a === 0 ? -0.08 : 0.08) * s, cy - 0.15 * s + armWave, cz, 0.07 * s, bodyDark, alpha * 0.45, 6, 4);
    }
    emitSphere(P, C, cx, cy + 0.4 * s, cz, 0.5 * s, [0.3, 0.4, 0.8], alpha * 0.12, 10, 8);
  }

  /* ---- System 26: Ectoplasm Trails (ghost movement leaves glowing residue) ---- */
  function spawnEctoplasm(x, y, z) {
    G.parts.push({
      x: x + (Math.random() - 0.5) * 0.4, y: y + Math.random() * 0.6, z: z + (Math.random() - 0.5) * 0.4,
      vx: (Math.random() - 0.5) * 0.05, vy: 0.05 + Math.random() * 0.05, vz: (Math.random() - 0.5) * 0.05,
      life: 1.5 + Math.random() * 1.5, col: [0.4, 0.7, 0.9], grav: -0.01, ghost: true
    });
  }

  /* ---- System 27: Ghost Trap (placeable, captures nearby ghosts) ---- */
  function craftTrap() {
    var m = meta();
    if ((m.coal || 0) < 5 || (m.wood || 0) < 3) { flash('Ghost trap needs 5 coal + 3 wood'); return; }
    m.coal -= 5; m.wood -= 3;
    m.traps = (m.traps || 0) + 1;
    flash('👻 Ghost trap crafted! (B to place)');
    saveMeta(); renderHUD();
  }

  function placeTrap() {
    var m = meta();
    if ((m.traps || 0) <= 0) { flash('No traps — craft some! (5 coal + 3 wood)'); return; }
    m.traps--;
    var e = eyePos(), d = lookDir();
    var hit = S.voxelRay(e, d, 5, solidAt);
    if (!hit) { flash('No surface to place trap'); m.traps++; return; }
    var px = hit.x + hit.nx, py = hit.y + hit.ny, pz = hit.z + hit.nz;
    if (solidAt(px, py, pz)) { flash('No space here'); m.traps++; return; }
    G.trapsPlaced = G.trapsPlaced || [];
    G.trapsPlaced.push({ x: px + 0.5, y: py + 0.5, z: pz + 0.5, armed: true });
    flash('👻 Trap placed!');
    saveMeta(); renderHUD();
  }

  function updateTraps(dt) {
    if (!G.trapsPlaced) return;
    for (var i = G.trapsPlaced.length - 1; i >= 0; i--) {
      var trap = G.trapsPlaced[i];
      if (!trap.armed) continue;
      for (var j = G.mobs.length - 1; j >= 0; j--) {
        var m = G.mobs[j];
        if (m.kind !== 'ghost') continue;
        var dx = m.x - trap.x, dz = m.z - trap.z;
        if (dx * dx + dz * dz < 2.5) {
          banishGhost(m);
          trap.armed = false;
          flash('👻 Trap caught a ghost!', 2);
          break;
        }
      }
      if (!trap.armed) {
        for (var k = 0; k < 5; k++) spawnGhostAura(trap.x, trap.y, trap.z);
      }
    }
  }

  /* ---- System 28: Draw traps in world ---- */
  function drawTraps(P, C) {
    if (!G.trapsPlaced) return;
    for (var i = 0; i < G.trapsPlaced.length; i++) {
      var trap = G.trapsPlaced[i];
      var dx = trap.x - G.px, dz = trap.z - G.pz;
      if (dx * dx + dz * dz > 200) continue;
      var pulse = trap.armed ? 0.5 + 0.3 * Math.sin(G.time * 4) : 0.2;
      emitCylinder(P, C, trap.x, trap.y, trap.z, 0.2, 0.05, [0.3, 0.2, 0.4], 1.1, 8);
      emitSphere(P, C, trap.x, trap.y + 0.15, trap.z, 0.12, [0.6, 0.3, 0.8], pulse, 8, 6);
    }
  }

  /* ---- System 29: Ghost Communication (morse code flickers) ---- */
  var GHOST_WORDS = ['HELP', 'DIE', 'MINE', 'COLD', 'RUN', 'KING', 'BLOOD', 'STAY'];
  var ghostCommT = 0;
  var ghostCommActive = false;
  var ghostCommWord = '';
  var ghostCommIdx = 0;
  var ghostCommTimer = 0;

  function startGhostComm() {
    ghostCommActive = true;
    ghostCommWord = GHOST_WORDS[(Math.random() * GHOST_WORDS.length) | 0];
    ghostCommIdx = 0;
    ghostCommTimer = 0;
  }

  function updateGhostComm(dt) {
    if (!ghostCommActive) {
      ghostCommT -= dt;
      if (ghostCommT <= 0) {
        ghostCommT = 20 + Math.random() * 30;
        if (Math.random() < 0.4) startGhostComm();
      }
      return;
    }
    ghostCommTimer -= dt;
    if (ghostCommTimer > 0) return;
    if (ghostCommIdx >= ghostCommWord.length) {
      ghostCommActive = false;
      flash('👻 "' + ghostCommWord + '"', 3);
      return;
    }
    var ch = ghostCommWord[ghostCommIdx];
    var code = ch.charCodeAt(0);
    for (var b = 0; b < 4; b++) {
      if (code & (1 << b)) {
        ghostCommTimer = 0.3;
        var a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 4;
        G.parts.push({
          x: G.px + Math.cos(a) * r, y: G.py + 1 + Math.random(), z: G.pz + Math.sin(a) * r,
          vx: 0, vy: 0.5, vz: 0, life: 0.3, col: [0.7, 0.9, 1.0], grav: 0, ghost: true
        });
      } else {
        ghostCommTimer = 0.15;
      }
    }
    ghostCommIdx++;
    ghostCommTimer += 0.2;
  }

  /* ---- System 30: Haunted Ore (mining releases ghosts) ---- */
  function mineHauntedOre(x, y, z, oreKey) {
    if (oreKey === 'crystal' || oreKey === 'glowcrystal') {
      if (Math.random() < 0.15) {
        var a = Math.random() * Math.PI * 2;
        G.mobs.push({
          kind: 'ghost', x: x + 0.5 + Math.cos(a), z: z + 0.5 + Math.sin(a), y: y + 1,
          hp: 3, wx: x, wz: z, wait: 0, cool: 0, phase: Math.random() * 6, path: [], repath: 0
        });
        flash('👻 The crystal releases a spirit!', 2.5);
        AudioSys.moan(x, y, z);
      }
    }
  }

  /* ---- System 31: Ghost Nest (spawn points in dark areas) ---- */
  function genGhostNests() {
    G.nests = [];
    var rng = new S.SeededRNG(G.seed + G.world * 333 + 9);
    var count = G.world === 0 || G.world === 2 ? 3 : 5;
    for (var i = 0; i < count; i++) {
      var x = 4 + rng.nextInt(G.W - 8), z = 4 + rng.nextInt(G.D - 8);
      var gy = groundY(x, z);
      G.nests.push({ x: x + 0.5, y: gy, z: z + 0.5, active: true, cooldown: 0 });
    }
  }

  function updateNests(dt) {
    if (!G.nests) return;
    var dark = (PHYS[G.world] || PHYS[0]).day ? 1 - Math.max(0, dayFactor()) : 1;
    for (var i = 0; i < G.nests.length; i++) {
      var n = G.nests[i];
      if (!n.active) {
        n.cooldown -= dt;
        if (n.cooldown <= 0) n.active = true;
        continue;
      }
      var dx = n.x - G.px, dz = n.z - G.pz;
      var dist = Math.hypot(dx, dz);
      if (dist < 15 && dist > 3 && Math.random() < dt * 0.1 * dark) {
        var ghosts = 0;
        for (var j = 0; j < G.mobs.length; j++) if (G.mobs[j].kind === 'ghost') ghosts++;
        if (ghosts < 3) {
          G.mobs.push({
            kind: 'ghost', x: n.x, z: n.z, y: n.y + 0.5,
            hp: 3, wx: n.x, wz: n.z, wait: 0, cool: 0, phase: Math.random() * 6, path: [], repath: 0
          });
          n.active = false;
          n.cooldown = 30 + Math.random() * 30;
          flash('👻 A ghost emerges from the nest!', 2);
        }
      }
      if (dist < 2 && Math.random() < dt * 2) {
        spawnGhostAura(n.x, n.y + 0.5, n.z);
      }
    }
  }

  /* ---- System 32: Draw ghost nests (eerie glow spots) ---- */
  function drawNests(P, C) {
    if (!G.nests) return;
    for (var i = 0; i < G.nests.length; i++) {
      var n = G.nests[i];
      var dx = n.x - G.px, dz = n.z - G.pz;
      if (dx * dx + dz * dz > 300) continue;
      var pulse = n.active ? 0.3 + 0.2 * Math.sin(G.time * 2 + i) : 0.1;
      emitEllipsoid(P, C, n.x, n.y + 0.02, n.z, 0.4, 0.02, 0.4, [0.3, 0.15, 0.4], pulse, 8, 4);
      if (n.active) {
        for (var g = 0; g < 3; g++) {
          var ga = g * Math.PI * 2 / 3 + G.time * 0.5;
          emitSphere(P, C, n.x + Math.cos(ga) * 0.3, n.y + 0.1, n.z + Math.sin(ga) * 0.3, 0.04, [0.5, 0.2, 0.6], pulse * 0.7, 4, 3);
        }
      }
    }
  }

  /* ---- System 33: Ghost King Arena (blood moon event arena) ---- */
  function setupKingArena() {
    G.arenaActive = true;
    G.arenaT = 120;
    flash('👑 GHOST KING ARENA — survive or banish!', 4);
    spawnGhostKing();
    for (var i = 0; i < 3; i++) {
      var a = i * Math.PI * 2 / 3;
      G.mobs.push({
        kind: 'ghost', x: G.px + Math.cos(a) * 6, z: G.pz + Math.sin(a) * 6, y: G.py + 0.5,
        hp: 3, wx: G.px, wz: G.pz, wait: 0, cool: 0, phase: i * 2, path: [], repath: 0
      });
    }
  }

  function updateArena(dt) {
    if (!G.arenaActive) return;
    G.arenaT -= dt;
    if (G.arenaT <= 0) {
      G.arenaActive = false;
      var kingAlive = false;
      for (var i = 0; i < G.mobs.length; i++) if (G.mobs[i].kind === 'ghostking') kingAlive = true;
      if (!kingAlive) {
        flash('👑 GHOST KING BANISHED! +200 gold!', 4);
        meta().gold += 200;
        meta().stats.goldRun += 200;
        gainXP(100);
        ach('ghost-king', 'Ghost King Slayer');
        saveMeta(); renderHUD();
      } else {
        flash('The Ghost King fades... for now.', 3);
        for (var i = G.mobs.length - 1; i >= 0; i--) {
          if (G.mobs[i].kind === 'ghostking') { G.mobs.splice(i, 1); break; }
        }
      }
    }
  }

  /* ---- System 34: Ectoplasm Pickup (dropped by banished ghosts) ---- */
  function spawnEctoplasmPickup(x, y, z) {
    G.ectoplasm = G.ectoplasm || [];
    G.ectoplasm.push({ x: x, y: y, z: z, vy: 0, phase: Math.random() * 6 });
  }

  function updateEctoplasm(dt) {
    if (!G.ectoplasm) return;
    for (var i = G.ectoplasm.length - 1; i >= 0; i--) {
      var e = G.ectoplasm[i];
      e.phase += dt;
      e.y += Math.sin(e.phase * 2) * dt * 0.3;
      var dx = e.x - G.px, dz = e.z - G.pz;
      if (dx * dx + dz * dz < 1.2 && Math.abs(e.y - G.py) < 2) {
        G.ectoplasm.splice(i, 1);
        meta().ectoplasm = (meta().ectoplasm || 0) + 1;
        flash('💠 +1 Ectoplasm (' + meta().ectoplasm + ' total)');
        gainXP(5);
        saveMeta(); renderHUD();
      }
    }
  }

  function drawEctoplasm(P, C) {
    if (!G.ectoplasm) return;
    for (var i = 0; i < G.ectoplasm.length; i++) {
      var e = G.ectoplasm[i];
      var dx = e.x - G.px, dz = e.z - G.pz;
      if (dx * dx + dz * dz > 200) continue;
      var pulse = 0.6 + 0.3 * Math.sin(e.phase * 3);
      emitEllipsoid(P, C, e.x, e.y, e.z, 0.08, 0.12, 0.08, [0.4, 0.8, 0.9], pulse, 8, 6);
      emitSphere(P, C, e.x, e.y + 0.1, e.z, 0.04, [0.7, 0.95, 1.0], pulse * 0.8, 6, 4);
    }
  }

  /* ---- System 35: Ectoplasm Crafting (ghost armor, ecto-blade) ---- */
  function craftEctoSword() {
    var m = meta();
    if ((m.ectoplasm || 0) < 5) { flash('Need 5 ectoplasm'); return; }
    m.ectoplasm -= 5;
    m.ecoBlade = true;
    flash('⚔️ Ectoplasmic Blade forged! (2x damage vs ghosts)');
    saveMeta(); renderHUD();
  }

  function craftEctoArmor() {
    var m = meta();
    if ((m.ectoplasm || 0) < 8) { flash('Need 8 ectoplasm'); return; }
    m.ectoplasm -= 8;
    m.ecoArmor = true;
    flash('🛡️ Ectoplasmic Armor forged! (50% ghost damage reduction)');
    saveMeta(); renderHUD();
  }

  /* ---- System 36: Ghost Damage Modifiers ---- */
  function ghostDamageMult() {
    var m = meta();
    if (m.ecoArmor) return 0.5;
    return 1;
  }

  function ghostDamageVs() {
    var m = meta();
    if (m.ecoBlade) return 2;
    return 1;
  }

  /* ---- System 37: Draw 3D ghosts in render loop ---- */
  function drawGhosts3D(P, C) {
    for (var i = 0; i < G.mobs.length; i++) {
      var m = G.mobs[i];
      if (m.kind === 'ghost') {
        buildGhost3D(P, C, m.x, m.y, m.z, m.phase, 1.0);
      } else if (m.kind === 'ghostking') {
        drawGhostKing(P, C, m);
      }
    }
  }

  /* ---- System 38: Ghost spawn from nests during blood moon ---- */
  function bloodMoonGhosts() {
    if (bloodMoon() <= 0) return;
    if (Math.random() < 0.02) {
      var a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 6;
      var x = Math.floor(G.px + Math.cos(a) * r), z = Math.floor(G.pz + Math.sin(a) * r);
      var gy = groundY(x, z);
      G.mobs.push({
        kind: 'ghost', x: x + 0.5, z: z + 0.5, y: gy + 0.5,
        hp: 3, wx: x, wz: z, wait: 0, cool: 0, phase: Math.random() * 6, path: [], repath: 0
      });
    }
  }

  /* ---- System 39: Whisper indicator (screen edge glow) ---- */
  function whisperIndicator() {
    if (!ghostCommActive) return 0;
    return 0.3 + 0.2 * Math.sin(G.time * 8);
  }

  /* ---- System 40: Ghost repellent (craftable torch variant) ---- */
  function craftRepellent() {
    var m = meta();
    if ((m.coal || 0) < 2 || (m.wood || 0) < 1 || (m.ectoplasm || 0) < 1) {
      flash('Repellent needs 2 coal + 1 wood + 1 ectoplasm'); return;
    }
    m.coal -= 2; m.wood -= 1; m.ectoplasm -= 1;
    m.repellents = (m.repellents || 0) + 1;
    flash('🧪 Ghost repellent crafted! (R to use)');
    saveMeta(); renderHUD();
  }

  function useRepellent() {
    var m = meta();
    if ((m.repellents || 0) <= 0) { flash('No repellent — craft some!'); return; }
    m.repellents--;
    for (var i = G.mobs.length - 1; i >= 0; i--) {
      var mob = G.mobs[i];
      if (mob.kind === 'ghost' || mob.kind === 'wisp') {
        var dx = mob.x - G.px, dz = mob.z - G.pz;
        if (Math.hypot(dx, dz) < 8) {
          mob.x += dx * 2; mob.z += dz * 2;
          spawnGhostAura(mob.x, mob.y, mob.z);
        }
      }
    }
    flash('🧪 Ghosts repelled!');
    saveMeta(); renderHUD();
  }

  /* ---- System 41: Ghost evolution (ghosts grow stronger over time) ---- */
  function ghostEvolution() {
    for (var i = 0; i < G.mobs.length; i++) {
      var m = G.mobs[i];
      if (m.kind !== 'ghost') continue;
      m.age = (m.age || 0) + 1;
      if (m.age > 60 && !m.elder) {
        m.elder = true;
        m.hp = 6;
        flash('👻 An elder ghost appears!', 2.5);
      }
      if (m.age > 120 && !m.ancient) {
        m.ancient = true;
        m.hp = 10;
        flash('👻👻 AN ANCIENT GHOST AWAKENS!', 3.5);
        AudioSys.moan(m.x, m.y, m.z);
      }
    }
  }

  /* ---- System 42: Draw elder/ancient ghost variants ---- */
  function drawElderGhosts(P, C) {
    for (var i = 0; i < G.mobs.length; i++) {
      var m = G.mobs[i];
      if (m.kind !== 'ghost') continue;
      if (m.ancient) {
        var a = 0.4 + 0.2 * Math.sin(G.time * 5 + m.phase);
        emitEllipsoid(P, C, m.x, m.y + 0.8, m.z, 0.6, 0.3, 0.5, [0.5, 0.2, 0.6], a, 10, 8);
        emitEllipsoid(P, C, m.x, m.y + 1.0, m.z, 0.4, 0.15, 0.35, [0.3, 0.1, 0.4], a * 0.8, 8, 6);
      } else if (m.elder) {
        var a2 = 0.35 + 0.15 * Math.sin(G.time * 4 + m.phase);
        emitEllipsoid(P, C, m.x, m.y + 0.7, m.z, 0.5, 0.2, 0.4, [0.6, 0.5, 0.8], a2, 8, 6);
      }
    }
  }

  /* ---- System 43: Ghost King health bar (drawn as particles above king) ---- */
  function drawKingHealth(P, C) {
    for (var i = 0; i < G.mobs.length; i++) {
      var m = G.mobs[i];
      if (m.kind !== 'ghostking') continue;
      var dx = m.x - G.px, dz = m.z - G.pz;
      if (dx * dx + dz * dz > 400) continue;
      var pct = m.hp / 30;
      for (var b = 0; b < 10; b++) {
        var on = b < pct * 10;
        emitSphere(P, C, m.x - 0.45 + b * 0.1, m.y + 1.6, m.z, 0.04, on ? [0.9, 0.2, 0.2] : [0.2, 0.1, 0.1], on ? 0.8 : 0.3, 4, 3);
      }
    }
  }

  /* ---- System 44: Ambient ghost spawner (keeps world populated) ---- */
  function ambientGhosts() {
    var dark = (PHYS[G.world] || PHYS[0]).day ? 1 - Math.max(0, dayFactor()) : 1;
    var maxGhosts = 2 + (bloodMoon() > 0 ? 3 : 0) + (G.arenaActive ? 2 : 0);
    var ghosts = 0;
    for (var i = 0; i < G.mobs.length; i++) if (G.mobs[i].kind === 'ghost') ghosts++;
    if (ghosts < maxGhosts && Math.random() < 0.005 * dark) {
      var a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 8;
      var x = Math.floor(G.px + Math.cos(a) * r), z = Math.floor(G.pz + Math.sin(a) * r);
      if (x > 1 && x < G.W - 1 && z > 1 && z < G.D - 1) {
        var gy = groundY(x, z);
        G.mobs.push({
          kind: 'ghost', x: x + 0.5, z: z + 0.5, y: gy + 0.5,
          hp: 3, wx: x, wz: z, wait: 0, cool: 0, phase: Math.random() * 6, path: [], repath: 0
        });
      }
    }
  }

  /* ---- System 45: Ghost death animation (burst of ectoplasm) ---- */
  function ghostDeathEffect(x, y, z) {
    for (var i = 0; i < 12; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 0.5 + Math.random() * 1.5;
      G.parts.push({
        x: x, y: y + 0.5, z: z,
        vx: Math.cos(a) * sp, vy: 0.5 + Math.random() * 1.5, vz: Math.sin(a) * sp,
        life: 0.8 + Math.random() * 0.6, col: [0.5 + Math.random() * 0.3, 0.7, 1.0], grav: -0.05, ghost: true
      });
    }
    spawnEctoplasmPickup(x, y, z);
  }

  /* ---- System 46: Initialize all ghost systems ---- */
  function initGhostSystems() {
    genGhostNests();
    G.ectoplasm = [];
    G.trapsPlaced = [];
    G.arenaActive = false;
    G.arenaT = 0;
    ghostCommT = 10 + Math.random() * 20;
    whisperT = 8 + Math.random() * 15;
  }

  /* ---- System 47: Update all ghost systems ---- */
  function updateAllGhostSystems(dt) {
    updateWhispers(dt);
    updateGhostComm(dt);
    updateNests(dt);
    updateTraps(dt);
    updateEctoplasm(dt);
    updateGhostKing(dt);
    updateArena(dt);
    ghostEvolution();
    ambientGhosts();
    bloodMoonGhosts();
    updateCaveAudio(dt);
    for (var i = 0; i < G.mobs.length; i++) {
      var m = G.mobs[i];
      if (m.kind === 'ghost' && Math.random() < dt * 2) {
        spawnEctoplasm(m.x, m.y + 0.3, m.z);
      }
    }
  }

  /* ---- System 48: Draw all ghost-related rendering ---- */
  function drawAllGhostSystems(P, C, PG, CG) {
    drawGhosts3D(P, C);
    drawElderGhosts(P, C);
    drawKingHealth(P, C);
    drawNests(P, C);
    drawTraps(P, C);
    drawEctoplasm(P, C);
    drawProps(P, C);
    drawBlobShadows(P, C);
    drawAnimatedCrystals(PG, CG);
  }

  function drawAnimatedCrystals(P, C) {
    if (!G.lightSources) return;
    for (var i = 0; i < G.lightSources.length; i++) {
      var ls = G.lightSources[i];
      if (ls.lava) continue;
      var dx = ls.x - G.px, dz = ls.z - G.pz;
      if (dx * dx + dz * dz > 400) continue;
      var pulse = 0.7 + 0.3 * Math.sin(G.time * 3 + i * 1.7);
      var r = 0.15 + 0.05 * Math.sin(G.time * 2 + i);
      emitSphere(P, C, ls.x, ls.y + 0.1, ls.z, r * 2, [0.4, 0.2, 0.6], 0.12 * pulse, 6, 4);
      emitCrystalCylinder(P, C, ls.x, ls.y - 0.3, ls.z, r * 0.5, 0.6, [0.5, 0.3, 0.9], 0.8 * pulse, 6);
      emitCone(P, C, ls.x, ls.y + 0.3, ls.z, r * 0.5, 0.3, [0.6, 0.4, 1.0], pulse, 6);
      for (var j = 0; j < 3; j++) {
        var a = G.time * 0.8 + j * Math.PI * 2 / 3;
        emitOctahedron(P, C, ls.x + Math.cos(a) * r * 0.8, ls.y, ls.z + Math.sin(a) * r * 0.8, r * 0.2, [0.4, 0.25, 0.8], 0.5 * pulse);
      }
    }
  }

  /* ---- System 49: Hook into main loop ---- */
  var origUpdate = update;
  update = function (dt) {
    origUpdate(dt);
    if (G.state === 'play') updateAllGhostSystems(dt);
  };

  /* ---- System 50: Hook into world gen ---- */
  var origGenWorld = genWorld;
  genWorld = function () {
    origGenWorld();
    genHorrorProps();
    initGhostSystems();
  };

  /* ---- System 51: Hook into render ---- */
  var origRender = render;
  render = function () {
    origRender();
    if (G.state === 'play' || G.state === 'dead') {
      var P = [], C = [], PG = [], CG = [];
      drawAllGhostSystems(P, C, PG, CG);
      if (P.length) {
        dynBufs();
        gl.uniform1f(gl.getUniformLocation(prog, 'uAlpha'), 1);
        drawDyn(dynP1, dynC1, P, C);
      }
      if (PG.length) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        drawDyn(dynP2, dynC2, PG, CG);
        gl.disable(gl.BLEND);
      }
    }
  };

  /* ---- System 52: Additional keybinds ---- */
  document.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if (k === 'g') useLure();
    if (k === 'b') placeTrap();
    if (k === 'r') useRepellent();
  });

  /* ---- System 53: Ghost stats tracking ---- */
  function ghostStats() {
    var m = meta();
    return {
      banished: m.stats.kills || 0,
      ectoplasm: m.ectoplasm || 0,
      lures: m.lures || 0,
      traps: m.traps || 0,
      repellents: m.repellents || 0,
      ecoBlade: !!m.ecoBlade,
      ecoArmor: !!m.ecoArmor,
      arenaWins: m.arenaWins || 0
    };
  }

  /* ---- System 54: Ghost bestiary (discovery journal) ---- */
  var GHOST_BESTIARY = [
    { name: 'Wisp', desc: 'A faint spectral light. Fears torches.', discovered: false },
    { name: 'Ghost', desc: 'A restless spirit. Drifts toward the living.', discovered: false },
    { name: 'Elder Ghost', desc: 'An aged spirit, stronger and more aggressive.', discovered: false },
    { name: 'Ancient Ghost', desc: 'A primordial entity of immense power.', discovered: false },
    { name: 'Ghost King', desc: 'The ruler of all spirits. Spawns during blood moons.', discovered: false }
  ];

  function discoverGhost(kind) {
    var idx = -1;
    if (kind === 'wisp') idx = 0;
    else if (kind === 'ghost') idx = 1;
    else if (kind === 'elder') idx = 2;
    else if (kind === 'ancient') idx = 3;
    else if (kind === 'ghostking') idx = 4;
    if (idx < 0) return;
    if (!GHOST_BESTIARY[idx].discovered) {
      GHOST_BESTIARY[idx].discovered = true;
      flash('📖 Discovered: ' + GHOST_BESTIARY[idx].name + '!', 3);
      gainXP(15);
    }
  }

  /* ---- System 55: Ghost bestiary UI ---- */
  function ghostBestiaryHTML() {
    var h = '<h2>👻 Ghost Bestiary</h2>';
    for (var i = 0; i < GHOST_BESTIARY.length; i++) {
      var g = GHOST_BESTIARY[i];
      h += '<div class="pitem">' + (g.discovered ? '👻 ' : '❓ ') +
        '<b>' + (g.discovered ? g.name : '???') + '</b>' +
        (g.discovered ? '<br><small>' + g.desc + '</small>' : ' — Undiscovered') + '</div>';
    }
    var s = ghostStats();
    h += '<h2>📊 Ghost Stats</h2>';
    h += '<div class="pitem">👻 Ghosts banished: ' + s.banished + '</div>';
    h += '<div class="pitem">💠 Ectoplasm: ' + s.ectoplasm + '</div>';
    h += '<div class="pitem">🎣 Lures: ' + s.lures + '</div>';
    h += '<div class="pitem">🪤 Traps: ' + s.traps + '</div>';
    h += '<div class="pitem">🧪 Repellents: ' + s.repellents + '</div>';
    if (s.ecoBlade) h += '<div class="pitem">⚔️ Ectoplasmic Blade</div>';
    if (s.ecoArmor) h += '<div class="pitem">🛡️ Ectoplasmic Armor</div>';
    return h;
  }

  /* ---- System 56: Ghost bestiary button ---- */
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.createElement('button');
    btn.id = 'ghostbtn';
    btn.textContent = '👻 Ghosts';
    btn.onclick = function () {
      hud('overlay-title').textContent = '👻 Ghost Bestiary';
      hud('overlay-text').textContent = '';
      var nb = document.createElement('div');
      nb.innerHTML = ghostBestiaryHTML();
      hud('overlay-text').appendChild(nb);
      hud('overlay-btn').textContent = 'Close';
      hud('overlay-btn').onclick = function () { hideOverlay(); };
      hud('overlay-btn2').style.display = 'none';
      overlay.classList.remove('hidden');
    };
    var btnRow = document.querySelector('#worlds');
    if (btnRow) btnRow.appendChild(btn);
  });

  /* ---- System 57: Ghost damage hook ---- */
  var origHurt = hurt;
  hurt = function (n, cause) {
    if (cause && cause.indexOf('ghost') >= 0) {
      n = Math.round(n * ghostDamageMult());
    }
    origHurt(n, cause);
  };

  /* ---- System 58: Ghost kill hook ---- */
  var origHitMob = hitMob;
  hitMob = function (mb) {
    if (mb.kind === 'ghost') {
      discoverGhost('ghost');
      if (mb.elder) discoverGhost('elder');
      if (mb.ancient) discoverGhost('ancient');
      ghostDeathEffect(mb.x, mb.y, mb.z);
    }
    origHitMob(mb);
  };

  /* ---- System 59: Ghost King kill hook ---- */
  var origBanish = banishGhost;
  banishGhost = function (m) {
    if (m.kind === 'ghostking') {
      discoverGhost('ghostking');
      meta().arenaWins = (meta().arenaWins || 0) + 1;
      flash('👑👑👑 GHOST KING BANISHED! +500 gold!', 5);
      meta().gold += 500;
      meta().stats.goldRun += 500;
      gainXP(200);
      ach('ghost-king', 'Ghost King Slayer');
      for (var i = 0; i < 20; i++) spawnGhostAura(m.x, m.y, m.z);
      AudioSys.level();
      G.arenaActive = false;
    }
    origBanish(m);
  };

  /* ---- System 60: Blood moon king spawn hook ---- */
  var origUpdate2 = update;
  update = function (dt) {
    origUpdate2(dt);
    if (bloodMoon() > 0.5 && !G.arenaActive && Math.random() < dt * 0.01) {
      setupKingArena();
    }
  };

  /* ================================================================
   * COMMERCIAL-GRADE ANIMATION SYSTEM
   * Smooth camera, movement, combat, UI, and visual effects
   * ================================================================ */

  // ---- Animation State ----
  var Anim = {
    // Camera
    shake: 0, shakeX: 0, shakeY: 0,
    fov: Math.PI / 2.6, fovTarget: Math.PI / 2.6,
    pitchSmooth: 0, yawSmooth: 0,
    // Movement
    velX: 0, velZ: 0, velY: 0,
    bobPhase: 0, bobAmp: 0,
    landDip: 0, landDipVel: 0,
    // Combat
    swingT: 0, swingDur: 0.28,
    hitStop: 0, hitStopDur: 0,
    damageFlash: 0, damageFlashDur: 0.3,
    // UI
    panelT: 0, panelTarget: 0,
    overlayT: 0, overlayTarget: 0,
    // Particles
    trailT: 0,
    // Portal
    portalSwirl: 0,
    // Weather
    weatherBlend: 0, weatherBlendTarget: 0,
    // Day/night
    dayBlend: 0, dayBlendTarget: 0,
    // Death
    deathT: 0, deathTarget: 0,
    // Level up
    levelUpT: 0, levelUpTarget: 0,
    // Screen effects
    vignette: 0, vignetteTarget: 0,
    chromatic: 0, chromaticTarget: 0
  };

  // ---- Easing Functions ----
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOutElastic(t) {
    var c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
  function easeOutBack(t) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function smoothstep(a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  // ---- Camera Shake ----
  function addShake(intensity, duration) {
    Anim.shake = Math.max(Anim.shake, intensity);
    Anim.shakeDur = Math.max(Anim.shakeDur || 0, duration);
  }

  function updateCameraShake(dt) {
    if (Anim.shake > 0) {
      Anim.shake = Math.max(0, Anim.shake - dt * 3);
      var s = Anim.shake * Anim.shake;
      Anim.shakeX = (Math.random() - 0.5) * s * 0.1;
      Anim.shakeY = (Math.random() - 0.5) * s * 0.1;
    } else {
      Anim.shakeX = 0;
      Anim.shakeY = 0;
    }
  }

  // ---- FOV Effects ----
  function setFOV(target, speed) {
    Anim.fovTarget = target;
    Anim.fovSpeed = speed || 3;
  }

  function updateFOV(dt) {
    var diff = Anim.fovTarget - Anim.fov;
    if (Math.abs(diff) > 0.001) {
      Anim.fov += diff * Math.min(1, dt * (Anim.fovSpeed || 3));
    }
  }

  // ---- Smooth Camera Look ----
  function updateSmoothLook(dt) {
    var lookSpeed = 12;
    Anim.pitchSmooth = lerp(Anim.pitchSmooth, G.pitch, Math.min(1, dt * lookSpeed));
    Anim.yawSmooth = lerp(Anim.yawSmooth, G.yaw, Math.min(1, dt * lookSpeed));
  }

  // ---- Movement Smoothing ----
  function updateMovementSmoothing(dt) {
    var accel = G.onGround ? 12 : 4;
    var friction = G.onGround ? 10 : 1;
    var maxSpeed = 4.6;
    // Costume bonus
    var costume = getCostumeBonus();
    if (costume && costume.bonus === 'speed') maxSpeed *= costume.mult;
    // Potion bonus
    if (hasPotion('speed')) maxSpeed *= 1.4;
    // Slow effect
    if (meta().slowTimer > 0) maxSpeed *= 0.5;

    var targetVX = G.vxh;
    var targetVZ = G.vzh;
    var targetSpeed = Math.hypot(targetVX, targetVZ);
    if (targetSpeed > maxSpeed) {
      targetVX = targetVX / targetSpeed * maxSpeed;
      targetVZ = targetVZ / targetSpeed * maxSpeed;
    }

    var rate = (Math.hypot(targetVX, targetVZ) > Math.hypot(Anim.velX, Anim.velZ) ? accel : friction) * dt;
    Anim.velX = lerp(Anim.velX, targetVX, Math.min(1, rate));
    Anim.velZ = lerp(Anim.velZ, targetVZ, Math.min(1, rate));

    // Head bob
    var hSpeed = Math.hypot(Anim.velX, Anim.velZ);
    var bobTarget = (hSpeed > 0.5 && G.onGround) ? 1 : 0;
    Anim.bobAmp = lerp(Anim.bobAmp, bobTarget, Math.min(1, dt * 8));
    Anim.bobPhase += hSpeed * dt * 2.4;

    // Landing dip
    if (G.onGround && Anim.landDipVel > 0) {
      Anim.landDip += Anim.landDipVel * dt;
      Anim.landDipVel -= 30 * dt;
      if (Anim.landDip < 0) { Anim.landDip = 0; Anim.landDipVel = 0; }
    }
  }

  // ---- Combat Animations ----
  function updateCombatAnimations(dt) {
    // Swing
    if (Anim.swingT < 1) {
      Anim.swingT = Math.min(1, Anim.swingT + dt / Anim.swingDur);
    }
    // Hit stop
    if (Anim.hitStop > 0) {
      Anim.hitStop -= dt;
      if (Anim.hitStop < 0) Anim.hitStop = 0;
    }
    // Damage flash
    if (Anim.damageFlash > 0) {
      Anim.damageFlash -= dt;
      if (Anim.damageFlash < 0) Anim.damageFlash = 0;
    }
  }

  function triggerHitStop(duration) {
    Anim.hitStop = duration || 0.08;
  }

  function triggerDamageFlash() {
    Anim.damageFlash = Anim.damageFlashDur;
  }

  // ---- UI Animations ----
  function updateUIAnimations(dt) {
    // Panel slide
    Anim.panelT = lerp(Anim.panelT, Anim.panelTarget, Math.min(1, dt * 10));
    // Overlay fade
    Anim.overlayT = lerp(Anim.overlayT, Anim.overlayTarget, Math.min(1, dt * 8));
    // Level up
    if (Anim.levelUpT > 0) {
      Anim.levelUpT -= dt;
      if (Anim.levelUpT < 0) Anim.levelUpT = 0;
    }
    // Death fade
    if (G.state === 'dead') {
      Anim.deathT = lerp(Anim.deathT, 1, Math.min(1, dt * 2));
    } else {
      Anim.deathT = lerp(Anim.deathT, 0, Math.min(1, dt * 3));
    }
    // Vignette
    var danger = dangerLevel();
    Anim.vignetteTarget = danger * 0.5 + (meta().hp < 30 ? 0.3 : 0);
    Anim.vignette = lerp(Anim.vignette, Anim.vignetteTarget, Math.min(1, dt * 3));
    // Chromatic aberration on damage
    Anim.chromaticTarget = Anim.damageFlash > 0 ? 1 : 0;
    Anim.chromatic = lerp(Anim.chromatic, Anim.chromaticTarget, Math.min(1, dt * 10));
  }

  // ---- Portal Swirl Animation ----
  function updatePortalSwirl(dt) {
    Anim.portalSwirl += dt * 2;
  }

  // ---- Weather Transition ----
  function updateWeatherBlend(dt) {
    Anim.weatherBlend = lerp(Anim.animBlend || 0, 1, Math.min(1, dt * 0.5));
  }

  // ---- Particle Trails ----
  function updateParticleTrails(dt) {
    Anim.trailT -= dt;
    if (Anim.trailT <= 0) {
      Anim.trailT = 0.05;
      // Player trail when moving fast
      var speed = Math.hypot(Anim.velX, Anim.velZ);
      if (speed > 3 && G.onGround) {
        G.parts.push({
          x: G.px + (Math.random() - 0.5) * 0.2,
          y: G.py + 0.1,
          z: G.pz + (Math.random() - 0.5) * 0.2,
          vx: -Anim.velX * 0.1 + (Math.random() - 0.5) * 0.2,
          vy: 0.2 + Math.random() * 0.2,
          vz: -Anim.velZ * 0.1 + (Math.random() - 0.5) * 0.2,
          life: 0.3 + Math.random() * 0.2,
          col: [0.6, 0.5, 0.4],
          grav: 0.1
        });
      }
    }
  }

  // ---- Block Break Crack Animation ----
  var crackStages = [
    { t: 0.0, verts: 4 },
    { t: 0.25, verts: 8 },
    { t: 0.5, verts: 12 },
    { t: 0.75, verts: 16 },
    { t: 1.0, verts: 20 }
  ];

  function getCrackIntensity(dmg, maxHp) {
    return clamp(dmg / maxHp, 0, 1);
  }

  function drawCrackOverlay(x, y, z, intensity) {
    if (intensity <= 0) return;
    var CP = [], CC = [];
    var stage = 0;
    for (var i = 0; i < crackStages.length; i++) {
      if (intensity >= crackStages[i].t) stage = i;
    }
    var numVerts = crackStages[stage].verts;
    var alpha = 0.3 + intensity * 0.5;
    var crackCol = [0.1, 0.08, 0.06];
    // Generate crack lines on each face
    for (var f = 0; f < 6; f++) {
      var F = FACES[f];
      var cx = x + 0.5 + F.d[0] * 0.51;
      var cy = y + 0.5 + F.d[1] * 0.51;
      var cz = z + 0.5 + F.d[2] * 0.51;
      var seed = x * 7 + y * 13 + z * 17 + f * 31;
      for (var v = 0; v < numVerts; v++) {
        var a1 = ((seed + v * 17) % 100) / 100 * Math.PI * 2;
        var a2 = ((seed + v * 23 + 7) % 100) / 100 * Math.PI * 2;
        var r1 = 0.1 + ((seed + v * 31) % 100) / 100 * 0.3;
        var r2 = 0.1 + ((seed + v * 37 + 13) % 100) / 100 * 0.3;
        var ox = F.d[0] === 0 ? Math.cos(a1) * r1 : 0;
        var oy = F.d[1] === 0 ? Math.cos(a1) * r1 : 0;
        var oz = F.d[2] === 0 ? Math.cos(a1) * r1 : 0;
        var ox2 = F.d[0] === 0 ? Math.cos(a2) * r2 : 0;
        var oy2 = F.d[1] === 0 ? Math.cos(a2) * r2 : 0;
        var oz2 = F.d[2] === 0 ? Math.cos(a2) * r2 : 0;
        CP.push(cx + ox, cy + oy, cz + oz);
        CP.push(cx + ox2, cy + oy2, cz + oz2);
        CC.push(crackCol[0], crackCol[1], crackCol[2], alpha);
        CC.push(crackCol[0], crackCol[1], crackCol[2], alpha * 0.5);
      }
    }
    if (CP.length) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      drawDyn(dynP1, dynC1, CP, CC);
      gl.disable(gl.BLEND);
    }
  }

  // ---- Smooth Mob Movement Interpolation ----
  var mobPrevPos = {};
  function initMobInterp() {
    mobPrevPos = {};
    for (var i = 0; i < G.mobs.length; i++) {
      var m = G.mobs[i];
      mobPrevPos[i] = { x: m.x, y: m.y, z: m.z };
    }
  }

  function updateMobInterp(dt) {
    for (var i = 0; i < G.mobs.length; i++) {
      var m = G.mobs[i];
      var prev = mobPrevPos[i];
      if (prev) {
        m.renderX = lerp(prev.x, m.x, Math.min(1, dt * 15));
        m.renderY = lerp(prev.y, m.y, Math.min(1, dt * 15));
        m.renderZ = lerp(prev.z, m.z, Math.min(1, dt * 15));
      } else {
        m.renderX = m.x; m.renderY = m.y; m.renderZ = m.z;
      }
    }
  }

  function saveMobInterp() {
    for (var i = 0; i < G.mobs.length; i++) {
      var m = G.mobs[i];
      mobPrevPos[i] = { x: m.x, y: m.y, z: m.z };
    }
  }

  // ---- Mob Attack Animation ----
  function getMobAttackT(m) {
    if (m.cool > 0.8) return 1 - (m.cool - 0.8) / 0.4;
    return 0;
  }

  // ---- Mob Death Animation ----
  var deathAnims = {};
  function startDeathAnim(mob) {
    deathAnims[G.mobs.indexOf(mob)] = {
      t: 0,
      dur: 0.5,
      x: mob.x, y: mob.y, z: mob.z,
      kind: mob.kind
    };
  }

  function updateDeathAnims(dt) {
    for (var idx in deathAnims) {
      var da = deathAnims[idx];
      da.t += dt;
      if (da.t >= da.dur) {
        delete deathAnims[idx];
      }
    }
  }

  function drawDeathAnims(P, C) {
    for (var idx in deathAnims) {
      var da = deathAnims[idx];
      var t = da.t / da.dur;
      var alpha = 1 - t;
      var scale = 1 + t * 0.5;
      var yOff = t * 1.5;
      var col = [0.8, 0.2, 0.2];
      if (da.kind === 'ghost') col = [0.5, 0.7, 1.0];
      else if (da.kind === 'skeleton') col = [0.9, 0.9, 0.8];
      else if (da.kind === 'witch') col = [0.4, 0.1, 0.5];
      else if (da.kind === 'vampire') col = [0.6, 0.05, 0.05];
      else if (da.kind === 'reaper') col = [0.1, 0.1, 0.1];
      else if (da.kind === 'pumpkin') col = [1.0, 0.5, 0.1];
      emitBox(P, C, [da.x, da.y + yOff, da.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
        0, 0.3 * scale, 0, 0.4 * scale, 0.5 * scale, 0.4 * scale, col, alpha);
    }
  }

  // ---- Level Up Animation ----
  function triggerLevelUp() {
    Anim.levelUpT = 2;
    // Burst of particles
    for (var i = 0; i < 30; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 1 + Math.random() * 3;
      G.parts.push({
        x: G.px, y: G.py + 1, z: G.pz,
        vx: Math.cos(a) * sp, vy: 2 + Math.random() * 3, vz: Math.sin(a) * sp,
        life: 1 + Math.random() * 0.5,
        col: [1.0, 0.9, 0.3],
        grav: 0.3
      });
    }
    addShake(0.3, 0.3);
  }

  function drawLevelUpEffect(P, C) {
    if (Anim.levelUpT <= 0) return;
    var t = 1 - Anim.levelUpT / 2;
    var alpha = 1 - t;
    var radius = 0.5 + t * 3;
    // Expanding ring
    for (var i = 0; i < 16; i++) {
      var a = i * Math.PI / 2 / 4;
      var x = G.px + Math.cos(a) * radius;
      var z = G.pz + Math.sin(a) * radius;
      emitSphere(P, C, x, G.py + 0.5, z, 0.08, [1.0, 0.9, 0.3], alpha, 6, 4);
    }
    // Vertical beam
    emitCylinder(P, C, G.px, G.py, G.pz, 0.1, 3 * (1 - t), [1.0, 0.9, 0.3], alpha * 0.5, 8);
  }

  // ---- Damage Number Popups ----
  var damageNumbers = [];
  function spawnDamageNumber(x, y, z, val, color) {
    damageNumbers.push({ x: x, y: y, z: z, val: val, color: color || '#ff4444', t: 0, dur: 0.8 });
  }

  function updateDamageNumbers(dt) {
    for (var i = damageNumbers.length - 1; i >= 0; i--) {
      var dn = damageNumbers[i];
      dn.t += dt;
      dn.y += dt * 1.5;
      if (dn.t >= dn.dur) damageNumbers.splice(i, 1);
    }
  }

  function drawDamageNumbers(P, C) {
    for (var i = 0; i < damageNumbers.length; i++) {
      var dn = damageNumbers[i];
      var t = dn.t / dn.dur;
      var alpha = 1 - t * t;
      var scale = 1 + t * 0.3;
      // Draw as small boxes forming a cross/plus shape
      var s = 0.06 * scale;
      emitBox(P, C, [dn.x, dn.y, dn.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
        0, 0, 0, s, s * 3, s, hexRGB(dn.color), alpha);
      emitBox(P, C, [dn.x, dn.y, dn.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
        0, 0, 0, s * 3, s, s, hexRGB(dn.color), alpha);
    }
  }

  // ---- Smooth Portal Animation ----
  function drawPortalSwirl(P, C, portal) {
    var t = Anim.portalSwirl + portal.phase;
    var numParticles = 8;
    for (var i = 0; i < numParticles; i++) {
      var a = t + i * Math.PI * 2 / numParticles;
      var r = 0.3 + Math.sin(t * 2 + i) * 0.15;
      var y = portal.y + 0.3 + (i / numParticles) * 1.4 + Math.sin(t * 3 + i) * 0.1;
      var x = portal.x + Math.cos(a) * r;
      var z = portal.z + Math.sin(a) * r;
      var alpha = 0.4 + Math.sin(t * 4 + i) * 0.2;
      var tc = [1, 0.5, 1];
      for (var j = 0; j < PORTAL_TYPES.length; j++) {
        if (PORTAL_TYPES[j].key === portal.type) tc = PORTAL_TYPES[j].col;
      }
      emitSphere(P, C, x, y, z, 0.04, tc, alpha, 4, 3);
    }
  }

  // ---- Smooth Gate Animation ----
  function drawGateGlow(P, C, gate) {
    var t = G.time * 2;
    var pulse = 0.5 + Math.sin(t) * 0.3;
    var col = GATE_COLORS[gate.to % GATE_COLORS.length];
    // Floating particles around gate
    for (var i = 0; i < 6; i++) {
      var a = t * 0.5 + i * Math.PI / 3;
      var r = 0.8 + Math.sin(t + i) * 0.2;
      var x = gate.x + Math.cos(a) * r;
      var z = gate.z + Math.sin(a) * r;
      var y = gate.y + 0.5 + Math.sin(t * 1.5 + i * 2) * 0.5;
      emitSphere(P, C, x, y, z, 0.03, col, pulse * 0.6, 4, 3);
    }
  }

  // ---- Weather Transition Particles ----
  function drawWeatherTransition(P, C) {
    if (Anim.weatherBlend < 0.1) return;
    var alpha = Anim.weatherBlend * 0.3;
    // Soft overlay particles
    for (var i = 0; i < 5; i++) {
      var a = G.time * 0.1 + i * Math.PI * 2 / 5;
      var r = 5 + Math.sin(G.time * 0.2 + i) * 2;
      var x = G.px + Math.cos(a) * r;
      var z = G.pz + Math.sin(a) * r;
      var y = G.py + 2 + Math.sin(G.time * 0.3 + i) * 1;
      emitSphere(P, C, x, y, z, 0.1, [0.7, 0.7, 0.8], alpha, 6, 4);
    }
  }

  // ---- Vignette Effect ----
  function drawVignette() {
    if (Anim.vignette < 0.01) return;
    // Darken screen edges via fog color modulation
    var v = Anim.vignette;
    // This is handled in the render loop via uniform
  }

  // ---- Chromatic Aberration Simulation ----
  function getChromaticOffset() {
    if (Anim.chromatic < 0.01) return 0;
    return Anim.chromatic * 0.003;
  }

  // ---- Smooth Day/Night Transition ----
  function updateDayNightBlend(dt) {
    var target = PHYS[G.world] && PHYS[G.world].day ? Math.max(0, dayFactor()) : 0;
    Anim.dayBlend = lerp(Anim.dayBlend, target, Math.min(1, dt * 2));
  }

  // ---- Footstep Particles ----
  var footstepT = 0;
  function updateFootsteps(dt) {
    footstepT -= dt;
    if (footstepT <= 0) {
      var speed = Math.hypot(Anim.velX, Anim.velZ);
      if (speed > 1 && G.onGround) {
        footstepT = 0.3 / speed;
        spawnFootstep();
      } else {
        footstepT = 0.1;
      }
    }
  }

  // ---- Landing Animation ----
  function triggerLanding(velocity) {
    var intensity = clamp(velocity / 10, 0, 1);
    Anim.landDip = intensity * 0.15;
    Anim.landDipVel = -intensity * 2;
    addShake(intensity * 0.2, 0.2);
    // Dust burst
    for (var i = 0; i < 8 * intensity; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 0.5 + Math.random() * 1.5 * intensity;
      G.parts.push({
        x: G.px, y: G.py + 0.05, z: G.pz,
        vx: Math.cos(a) * sp, vy: 0.3 + Math.random() * 0.5, vz: Math.sin(a) * sp,
        life: 0.4 + Math.random() * 0.3,
        col: [0.5, 0.45, 0.4],
        grav: 0.5
      });
    }
  }

  // ---- Swing Animation Enhancement ----
  function getSwingAngle() {
    var t = easeOutCubic(Anim.swingT);
    return -0.7 + 1.2 * Math.sin(Math.PI * t);
  }

  // ---- Mob Smooth Render Position ----
  function getMobRenderPos(m) {
    return {
      x: m.renderX !== undefined ? m.renderX : m.x,
      y: m.renderY !== undefined ? m.renderY : m.y,
      z: m.renderZ !== undefined ? m.renderZ : m.z
    };
  }

  // ---- Initialize Animation System ----
  function initAnimations() {
    Anim.pitchSmooth = G.pitch;
    Anim.yawSmooth = G.yaw;
    Anim.velX = 0;
    Anim.velZ = 0;
    Anim.bobPhase = 0;
    Anim.bobAmp = 0;
    Anim.landDip = 0;
    Anim.landDipVel = 0;
    Anim.swingT = 1;
    Anim.hitStop = 0;
    Anim.damageFlash = 0;
    Anim.panelT = 0;
    Anim.panelTarget = 0;
    Anim.overlayT = 0;
    Anim.overlayTarget = 0;
    Anim.portalSwirl = 0;
    Anim.weatherBlend = 0;
    Anim.dayBlend = 0;
    Anim.deathT = 0;
    Anim.levelUpT = 0;
    Anim.vignette = 0;
    Anim.chromatic = 0;
    footstepT = 0;
    damageNumbers = [];
    deathAnims = {};
    initMobInterp();
  }

  // ---- Update All Animations ----
  function updateAnimations(dt) {
    // Hit stop slows everything
    if (Anim.hitStop > 0) {
      dt *= 0.1;
    }
    updateCameraShake(dt);
    updateFOV(dt);
    updateSmoothLook(dt);
    updateMovementSmoothing(dt);
    updateCombatAnimations(dt);
    updateUIAnimations(dt);
    updatePortalSwirl(dt);
    updateWeatherBlend(dt);
    updateParticleTrails(dt);
    updateMobInterp(dt);
    updateDeathAnims(dt);
    updateDamageNumbers(dt);
    updateDayNightBlend(dt);
    updateFootsteps(dt);
  }

  // ---- Hook into main update loop ----
  var origUpdate3 = update;
  update = function (dt) {
    origUpdate3(dt);
    if (G.state === 'play') {
      updateAnimations(dt);
      saveMobInterp();
    }
  };

  // ---- Hook into render for animation effects ----
  var origRender2 = render;
  render = function () {
    // Apply camera shake
    var shakeX = Anim.shakeX;
    var shakeY = Anim.shakeY;
    // Apply smooth look
    var savedPitch = G.pitch;
    var savedYaw = G.yaw;
    G.pitch = Anim.pitchSmooth + shakeY;
    G.yaw = Anim.yawSmooth + shakeX;
    // Apply landing dip
    var savedPy = G.py;
    G.py += Anim.landDip;
    // Apply FOV
    var savedFov = Math.PI / 2.6;
    // Render
    origRender2();
    // Restore
    G.pitch = savedPitch;
    G.yaw = savedYaw;
    G.py = savedPy;
    // Draw animation effects
    if (G.state === 'play' || G.state === 'dead') {
      var P = [], C = [], PG = [], CG = [];
      // Death animations
      drawDeathAnims(P, C);
      // Level up effect
      drawLevelUpEffect(PG, CG);
      // Damage numbers
      drawDamageNumbers(P, C);
      // Portal swirls
      for (var i = 0; i < (G.portals || []).length; i++) {
        drawPortalSwirl(PG, CG, G.portals[i]);
      }
      // Gate glows
      for (var i = 0; i < (G.gates || []).length; i++) {
        drawGateGlow(PG, CG, G.gates[i]);
      }
      // Weather transition
      drawWeatherTransition(PG, CG);
      // Draw
      if (P.length) {
        dynBufs();
        gl.uniform1f(gl.getUniformLocation(prog, 'uAlpha'), 1);
        drawDyn(dynP1, dynC1, P, C);
      }
      if (PG.length) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        drawDyn(dynP2, dynC2, PG, CG);
        gl.disable(gl.BLEND);
      }
    }
  };

  // ---- Hook into combat ----
  var origSwing = swing;
  swing = function () {
    origSwing();
    Anim.swingT = 0;
    // FOV punch
    setFOV(Math.PI / 2.6 - 0.05, 8);
    setTimeout(function () { setFOV(Math.PI / 2.6, 3); }, 100);
  };

  var origHurt2 = hurt;
  hurt = function (n, cause) {
    origHurt2(n, cause);
    triggerDamageFlash();
    addShake(0.4, 0.3);
    triggerHitStop(0.06);
  };

  var origDie = die;
  die = function (cause) {
    origDie(cause);
    addShake(0.8, 0.5);
    Anim.deathT = 0;
  };

  var origGainXP = gainXP;
  gainXP = function (n) {
    var wasLevel = meta().level;
    origGainXP(n);
    if (meta().level > wasLevel) {
      triggerLevelUp();
    }
  };

  // ---- Hook into block break for crack animation ----
  var origSwing2 = swing;
  swing = function () {
    origSwing2();
    var hit = targetBlock();
    if (hit) {
      var key = hit.x + ',' + hit.y + ',' + hit.z;
      var dmg = G.dmg[key];
      if (dmg !== undefined) {
        var ore = VOX[G.blocks[key]];
        if (ore) {
          // Crack particles
          var intensity = getCrackIntensity(ore.hp - dmg, ore.hp);
          for (var i = 0; i < intensity * 5; i++) {
            G.parts.push({
              x: hit.x + 0.5 + (Math.random() - 0.5) * 0.6,
              y: hit.y + 0.5 + (Math.random() - 0.5) * 0.6,
              z: hit.z + 0.5 + (Math.random() - 0.5) * 0.6,
              vx: (Math.random() - 0.5) * 2,
              vy: Math.random() * 2,
              vz: (Math.random() - 0.5) * 2,
              life: 0.3 + Math.random() * 0.2,
              col: hexRGB(ore.color),
              grav: 1
            });
          }
        }
      }
    }
  };

  // ---- Hook into mob hit for damage numbers ----
  var origHitMob2 = hitMob;
  hitMob = function (mb) {
    var dmg = S.PICKS[meta().pickIdx].speed;
    // Costume damage bonus
    var costume = getCostumeBonus();
    if (costume && costume.bonus === 'damage') dmg = Math.round(dmg * costume.mult);
    // Enchant damage bonus
    dmg = Math.round(dmg * (1 + getEnchantLevel('cursed_edge') * 0.3));
    // Buff damage
    dmg += meta().buffDamage || 0;
    spawnDamageNumber(mb.x, mb.y + 1, mb.z, dmg, '#ff4444');
    triggerHitStop(0.04);
    addShake(0.15, 0.1);
    origHitMob2(mb);
  };

  // ---- Hook into landing ----
  var origMoveAxis = moveAxis;
  moveAxis = function (dx, dy, dz) {
    var wasAir = !G.onGround;
    var fallSpeed = G.vy;
    origMoveAxis(dx, dy, dz);
    if (G.onGround && wasAir && fallSpeed < -5) {
      triggerLanding(-fallSpeed);
    }
  };

  // ---- Initialize animations on boot ----
  initAnimations();

  // ---- Expose animation API ----
  window.__voxelAnim = {
    addShake: addShake,
    setFOV: setFOV,
    triggerLevelUp: triggerLevelUp,
    triggerDamageFlash: triggerDamageFlash,
    triggerHitStop: triggerHitStop,
    triggerLanding: triggerLanding,
    Anim: Anim,
    easeOutCubic: easeOutCubic,
    easeInOutCubic: easeInOutCubic,
    easeOutElastic: easeOutElastic,
    easeOutBack: easeOutBack,
    lerp: lerp,
    clamp: clamp,
    smoothstep: smoothstep
  };

})();
