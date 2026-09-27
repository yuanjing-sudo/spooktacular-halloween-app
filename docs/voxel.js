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

  var canvas = document.getElementById('gamev');
  var gl = canvas.getContext('webgl', { antialias: true }) || canvas.getContext('experimental-webgl');
  if (!gl) return;

  function shader(t, src) {
    var s = gl.createShader(t);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER,
    'attribute vec3 aPos; attribute vec3 aCol; attribute vec3 aSun; uniform mat4 uMVP; uniform mat4 uMV;' +
    'varying vec3 vC; varying vec3 vS; varying float vD;' +
    'void main(){ vec4 mv = uMV * vec4(aPos,1.0); gl_Position = uMVP * vec4(aPos,1.0); vC = aCol; vS = aSun; vD = -mv.z; }'));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER,
    'precision mediump float; varying vec3 vC; varying vec3 vS; varying float vD;' +
    'uniform vec3 uFog; uniform vec2 uFogR; uniform float uAlpha; uniform vec3 uSun;' +
    'void main(){ float f = smoothstep(uFogR.x, uFogR.y, vD);' +
    ' vec3 lit = vC + vS * uSun;' +
    ' gl_FragColor = vec4(mix(lit, uFog, f), uAlpha); }'));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  function buf(data, size, name) {
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return { b: b, loc: gl.getAttribLocation(prog, name), size: size };
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
      px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, onGround: false,
      blocks: {}, torches: [], W: 0, H: 0, D: 0,
      dmg: {}, chunks: null, glow: null, state: 'title',
      third: false, swingT: 1, parts: [], dayT: 0.12,
      mobs: [], mobT: 5, kills: 0, apples: 0, wood: 0,
      torchesInv: 4, fallPeak: null, stats: null
    };
    genWorld();
    buildAll();
    if (meta().hp === undefined) { meta().hp = 100; meta().maxHp = 100; }
    if (meta().wood === undefined) meta().wood = 0;
    if (meta().apples === undefined) meta().apples = 0;
    if (meta().torchesInv === undefined) meta().torchesInv = 4;
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
      for (var ix = -r; ix <= r; ix++) for (var iy = 0; iy <= 1; iy++) for (var iz = -r; iz <= r; iz++) {
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
    } else {
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
      for (var w2 = 0; w2 < 4; w2++) {
        carveWorm(rng, cx + (rng.nextDouble() - 0.5) * 4, 2, cz + (rng.nextDouble() - 0.5) * 4, 45 + rng.nextInt(40), 1);
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
    }
    }
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
    return b !== null && b !== 'leaves';
  }
  function skyLight(x, y, z) {
    if (G.world === 1) return 0;
    var f = 1.0;
    for (var yy = y + 1; ; yy++) {
      if (yy >= G.H) return f; // open sky above the world (out-of-bounds is NOT rock here)
      var b = get(x, yy, z);
      if (b === null) continue;
      if (b === 'leaves') { f *= 0.55; if (f < 0.22) return 0.22; continue; }
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
    if (G.world === 1) return 0;
    return Math.min(1.2, skyLight(x, y, z));
  }
  function cellLamp(x, y, z) {
    var amb = G.world === 1 ? 0.16 : 0.14;
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
    var x0 = cx * CH, y0 = cy * CH, z0 = cz * CH;
    for (var k in G.blocks) {
      var p = k.split(','), x = +p[0], y = +p[1], z = +p[2];
      if (x < x0 || x >= x0 + CH || y < y0 || y >= y0 + CH || z < z0 || z >= z0 + CH) continue;
      var key = G.blocks[k];
      var ore = VOX[key] || VOX.stone;
      var base = hexRGB(ore.color);
      var leaf = key === 'leaves';
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
        }
      }
    }
    return {
      x0: x0, y0: y0, z0: z0,
      op: P.length ? { n: P.length / 3, pos: buf(P, 3, 'aPos'), col: buf(C, 3, 'aCol'), sun: buf(SN, 3, 'aSun') } : { n: 0 },
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
    G.glow = P.length ? { n: P.length / 3, pos: buf(P, 3, 'aPos'), col: buf(C, 3, 'aCol') } : { n: 0 };
    G.glow = P.length ? { n: P.length / 3, pos: buf(P, 3, 'aPos'), col: buf(C, 3, 'aCol') } : { n: 0 };
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
    // Avatar removed - user requested cleaner view
    // Third-person character model disabled for cleaner forest view
    // G.third now only affects camera distance, not character model
    G.third = false;
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
    emitBox(P, C, o, Rt, U, B, 0, -0.08, -0.2, 0.05, 0.42, 0.05, WOODC, 1.25);
    emitBox(P, C, o, Rt, U, B, 0, -0.26, -0.26, 0.26, 0.06, 0.06, STEEL, 1.25);
  }
  function spawnBurst(x, y, z, hex) {
    var base = hexRGB(hex);
    for (var i = 0; i < 14; i++) {
      var a = Math.random() * Math.PI * 2, up = 1 + Math.random() * 3, sp = 1 + Math.random() * 2.5;
      G.parts.push({ x: x, y: y, z: z,
        vx: Math.cos(a) * sp, vy: up, vz: Math.sin(a) * sp,
        life: 0.5 + Math.random() * 0.3, col: base });
    }
    if (G.parts.length > 240) G.parts.splice(0, G.parts.length - 240);
  }
  function updateParts(dt) {
    for (var i = G.parts.length - 1; i >= 0; i--) {
      var p = G.parts[i];
      p.life -= dt;
      if (p.life <= 0) { G.parts.splice(i, 1); continue; }
      p.vy -= 9 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
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
  function playerEye() { return [G.px, G.py + EYE, G.pz]; }
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
  // ---------- mobs: wolves stalk, wisps drift (night forest / dark mine) ----------
  function mobCap() { return 4; }
  function wantMobs() {
    if (G.world === 1) return true;
    return dayFactor() < 0.15; // night forest
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
      var wolf = rng.nextDouble() < 0.5;
      G.mobs.push({ kind: wolf ? 'wolf' : 'wisp', x: x + 0.5, z: z + 0.5, y: gy + 0.3,
        hp: wolf ? 6 : 3, wx: x + 0.5, wz: z + 0.5, wait: 0, cool: 0, phase: rng.nextDouble() * 6 });
      return true;
    }
    return !!force;
  }
  function updateMobs(dt) {
    if (G.state !== 'play') return;
    G.mobT -= dt;
    if (G.mobT <= 0) {
      G.mobT = 6;
      if (wantMobs() && G.mobs.length < mobCap()) spawnMob();
    }
    for (var i = G.mobs.length - 1; i >= 0; i--) {
      var m = G.mobs[i];
      m.cool -= dt;
      var dx = G.px - m.x, dz = G.pz - m.z;
      var dist = Math.hypot(dx, dz);
      var sp = m.kind === 'wolf' ? 2.4 : 1.7;
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
    meta().hp -= n;
    flash('-' + n + ' HP' + (cause ? ' (' + cause + ')' : ''), 1.5);
    if (meta().hp <= 0) die(cause || 'the wilds');
    else renderHUD();
  }
  function die(cause) {
    G.state = 'dead';
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
    if (ore.coal) {
      delete G.blocks[key];
      spawnBurst(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, ore.color);
      var m0 = meta();
      m0.coal = (m0.coal || 0) + 1;
      G.broken++;
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
    hud('depth').textContent = G.world === 0 ? 'Forest' : 'Deep Mine';
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
      var day = G.world === 0;
      var t = G.dayT;
      var icon = !day ? '⛏️' : (dayFactor() > 0.6 ? '☀️' : (dayFactor() > 0.05 ? '🌤️' : '🌙'));
      ck.textContent = icon + ' ' + Math.floor(t * 24) + ':00';
    }
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
  function sunColor() {
    var e = Math.max(0, dayFactor());
    var warm = 1 - Math.min(1, e * 2.2); // orange near horizon
    return [0.25 + 0.9 * e, (0.25 + 0.73 * e) * (1 - warm * 0.25), (0.3 + 0.6 * e) * (1 - warm * 0.55)];
  }
  function skyColor() {
    var e = Math.max(0, dayFactor());
    var day = [0.53, 0.71, 0.88], night = [0.015, 0.02, 0.06], dusk = [0.45, 0.22, 0.35];
    var warm = 1 - Math.min(1, e * 2.5);
    var base = [day[0] * e + night[0] * (1 - e), day[1] * e + night[1] * (1 - e), day[2] * e + night[2] * (1 - e)];
    return [base[0] + (dusk[0] - base[0]) * warm * 0.7, base[1] + (dusk[1] - base[1]) * warm * 0.7, base[2] + (dusk[2] - base[2]) * warm * 0.7];
  }
  function render() {
    resize();
    var forest = G.world === 0;
    var fogC = forest ? skyColor() : [0.02, 0.01, 0.04];
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
    gl.uniform2fv(gl.getUniformLocation(prog, 'uFogR'), new Float32Array(forest ? [20, 70] : [6, 30]));
    function bind(w, size, name) {
      gl.bindBuffer(gl.ARRAY_BUFFER, w.b);
      var loc = gl.getAttribLocation(prog, name);
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
    gl.uniform3fv(gl.getUniformLocation(prog, 'uSun'), new Float32Array(sc));
    // pass 1: opaque (Z-buffer fills)
    gl.uniform1f(gl.getUniformLocation(prog, 'uAlpha'), 1);
    for (var key in G.chunks) {
      var ch = G.chunks[key];
      if (chunkVisible(ch, planes)) drawBuf(ch.op);
    }
    drawBuf(G.glow);
    // pass 2: translucent leaves (alpha blend, tested against the Z-buffer)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
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
    // mobs: wolves (brown beast) + wisps (glowing cyan)
    for (var qi = 0; qi < G.mobs.length; qi++) {
      var qm = G.mobs[qi];
      if (qm.kind === 'wolf') {
        var bob = Math.abs(Math.sin(G.time * 8 + qm.phase)) * 0.06;
        emitBox(AP, AC, [qm.x, qm.y + bob, qm.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0.35, 0, 0.7, 0.45, 0.45, [0.42, 0.31, 0.18], 1.2);
        emitBox(AP, AC, [qm.x, qm.y + bob, qm.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
          0, 0.62, -0.3, 0.32, 0.3, 0.32, [0.35, 0.25, 0.14], 1.2);
      } else {
        var fl = 0.5 + 0.2 * Math.sin(G.time * 5 + qm.phase);
        emitBox(AP, AC, [qm.x, qm.y + 0.6 + 0.1 * Math.sin(G.time * 3 + qm.phase), qm.z],
          [1, 0, 0], [0, 1, 0], [0, 0, 1], 0, 0, 0, fl, fl, fl, [0.35, 0.9, 1.0], 1.4);
      }
    }
    drawDyn(dynP1, dynC1, AP, AC);
    var PP = [], PC = [];
    for (var pi = 0; pi < G.parts.length; pi++) {
      var pt = G.parts[pi], s = 0.09;
      emitBox(PP, PC, [pt.x, pt.y, pt.z], [1, 0, 0], [0, 1, 0], [0, 0, 1],
        0, 0, 0, s, s, s, pt.col, 1.3);
    }
    drawDyn(dynP2, dynC2, PP, PC);
  }

  // ---------- input ----------
  var keys = {}, joy = { x: 0, y: 0 };
  document.addEventListener('keydown', function (e) {
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
    if (k === 'm') {
      var h = document.getElementById('help');
      h.style.display = h.style.display === 'none' ? '' : 'none';
    }
    if (k === 'enter' && !overlay.classList.contains('hidden')) hud('overlay-btn').click();
  });
  document.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  var drag = null;
  canvas.addEventListener('mousedown', function (e) {
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
  function switchWorld(w) {
    var m = meta();
    newGame(w, (Math.random() * 1e9) | 0);
    meta().gold = m.gold; meta().coal = m.coal; meta().level = m.level;
    meta().xp = m.xp; meta().pickIdx = m.pickIdx; meta().ach = m.ach;
    saveMeta(); renderHUD(); hideOverlay();
    flash(w === 0 ? '🌲 Forest — surface ores + timber' : '⛏️ Deep Mine — caverns, lava, riches', 3);
  }

  // ---------- loop ----------
  var last = 0;
  function update(dt) {
    G.time += dt;
    if (G.world === 0) G.dayT = (G.dayT + dt / 360) % 1; // 6-minute days
    if (G.swingT < 1) G.swingT = Math.min(1, G.swingT + dt / 0.28);
    updateParts(dt);
    updateMobs(dt);
    var sp = 4.6 * dt;
    var fw = ((keys.w || keys.arrowup) ? 1 : 0) - ((keys.s || keys.arrowdown) ? 1 : 0) + joy.y;
    var st = ((keys.d ? 1 : 0) - (keys.a ? 1 : 0)) + joy.x;
    var sy = Math.sin(G.yaw), cy = Math.cos(G.yaw);
    moveAxis((sy * fw + cy * st) * sp, 0, (-cy * fw + sy * st) * sp);
    G.vy -= (G.world === 1 ? 30 : 22) * dt; // Mine has heavier gravity
    if ((keys[' '] ) && G.onGround) { G.vy = 7.6; G.onGround = false; }
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
  // Restore previous game state if switching worlds
  var oldWorld = G.world;
  var oldMeta = meta();
  newGame(hash === 'mine' ? 1 : 0);
  // Restore gold, level, pick, and score from previous world if switching
  if (G.world !== oldWorld && oldMeta.gold !== undefined) {
    meta().gold = oldMeta.gold;
    meta().level = oldMeta.level;
    meta().pickIdx = oldMeta.pickIdx;
    meta().ach = oldMeta.ach;
    meta().wood = oldMeta.wood;
    meta().apples = oldMeta.apples;
    meta().torchesInv = oldMeta.torchesInv;
    meta().stats = oldMeta.stats;
    renderHUD();
  }
  renderHUD();
  window.SpookyTabs.init({
    tabsId: 'tabs', panelsId: 'tabpanels',
    snapshot: function () {
      var m = meta(), left = 0;
      for (var k in G.blocks) {
        var o = VOX[G.blocks[k]];
        if (o && (o.gold > 0 || o.coal)) left++;
      }
      return { score: G.score, layer: G.world === 0 ? 'Forest' : 'Deep Mine', left: left,
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
})();
