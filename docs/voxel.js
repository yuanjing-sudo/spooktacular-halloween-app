/* Spooktacular Voxel Worlds — Minecraft-style digging (raw WebGL, zero deps).
 * Forest (day, trees, shallow ores) + Deep Mine (caverns, rich ores, lava).
 * Same profile economy as the other games (gold/coal/XP/picks via tabs). */
(function () {
  'use strict';
  var S = window.Spooky;
  var WALL = { forest: 0, mine: 1 };

  var VOX = {};
  S.ORES.forEach(function (o) { VOX[o.key] = o; });
  VOX.grass = { key: 'grass', name: 'Grass', emoji: '🟩', color: '#4da63c', hp: 1, gold: 0, xp: 0, tier: 0 };
  VOX.wood = { key: 'wood', name: 'Wood', emoji: '🪵', color: '#7a5230', hp: 2, gold: 1, xp: 2, tier: 0 };
  VOX.leaves = { key: 'leaves', name: 'Leaves', emoji: '🌿', color: '#2e7d32', hp: 1, gold: 0, xp: 0, tier: 0 };
  VOX.bedrock = { key: 'bedrock', name: 'Bedrock', emoji: '⬛', color: '#1a1a1e', hp: 1e9, gold: 0, xp: 0, tier: 99 };
  VOX.lava = { key: 'lava', name: 'Lava', emoji: '🔥', color: '#ff6a00', hp: 1e9, gold: 0, xp: 0, tier: 99, emis: 1 };
  VOX.torchcube = { key: 'torchcube', name: 'Torch', emoji: '🔥', color: '#ffB545', hp: 1e9, gold: 0, xp: 0, tier: 99, emis: 1 };

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
    'attribute vec3 aPos; attribute vec3 aCol; uniform mat4 uMVP; uniform mat4 uMV;' +
    'varying vec3 vC; varying float vD;' +
    'void main(){ vec4 mv = uMV * vec4(aPos,1.0); gl_Position = uMVP * vec4(aPos,1.0); vC = aCol; vD = -mv.z; }'));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER,
    'precision mediump float; varying vec3 vC; varying float vD;' +
    'uniform vec3 uFog; uniform vec2 uFogR; uniform float uAlpha;' +
    'void main(){ float f = smoothstep(uFogR.x, uFogR.y, vD); gl_FragColor = vec4(mix(vC, uFog, f), uAlpha); }'));
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
      dmg: {}, chunks: null, glow: null, state: 'title'
    };
    genWorld();
    buildAll();
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
      G.W = 48; G.H = 8; G.D = 48;
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
      // entrance shaft + torches
      var cx = G.W >> 1, cz = G.D >> 1, ti;
      for (ti = 2; ti <= 9; ti++) delete G.blocks[K(cx, ti, cz)];
      for (ti = 0; ti < 8; ti++) {
        var a = ti * 0.785, rr = 3 + (ti % 3);
        var qx = Math.max(1, Math.min(G.W - 2, Math.round(cx + Math.cos(a) * rr)));
        var qz = Math.max(1, Math.min(G.D - 2, Math.round(cz + Math.sin(a) * rr)));
        G.torches.push({ x: qx + 0.5, y: 4.5, z: qz + 0.5 });
      }
      G.px = cx + 0.5; G.pz = cz + 0.5; G.py = 9.5;
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
    for (var yy = y + 1; yy < G.H + 6; yy++) {
      var b = get(x, yy, z);
      if (b === null) continue;
      if (b === 'leaves') { f *= 0.55; if (f < 0.22) return 0.22; continue; }
      return 0.30;
    }
    return f;
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
  function cellLight(x, y, z) {
    if (G.world === 1) return 0.16 + Math.min(1.3, torchGlow(x + 0.5, y + 0.5, z + 0.5));
    return Math.min(1.2, skyLight(x, y, z));
  }
  // AO + smooth light for one face corner. n = face normal axis (0/1/2),
  // corner = [ox,oy,oz] offset, base = adjacent air cell coords.
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
    function L_(du, dv) {
      var p = [b[0], b[1], b[2]];
      p[u] += du * su; p[v] += dv * sv;
      return cellLight(p[0], p[1], p[2]);
    }
    var s1 = S_(1, 0), s2 = S_(0, 1), cc = S_(1, 1);
    var ao = (s1 && s2) ? 0 : 3 - (s1 + s2 + cc);
    var li = (L_(0, 0) + L_(1, 0) + L_(0, 1) + L_(1, 1)) / 4;
    return li * AO_CURVE[ao];
  }
  function chunkKey(cx, cy, cz) { return cx + ',' + cy + ',' + cz; }
  function buildChunk(cx, cy, cz) {
    var P = [], C = [], TP = [], TC = [];
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
        if (opaqueAt(x + F.d[0], y + F.d[1], z + F.d[2])) continue;
        var nAxis = F.d[0] !== 0 ? 0 : (F.d[1] !== 0 ? 1 : 2);
        var bcell = [x + F.d[0], y + F.d[1], z + F.d[2]];
        var quad = [F.c[0], F.c[1], F.c[2], F.c[5]];
        var ls = quad.map(function (cn) { return cornerLight(x, y, z, nAxis, cn, bcell); });
        var order = [0, 1, 2, 0, 2, 3];
        for (var v = 0; v < 6; v++) {
          var cn2 = quad[order[v]], li = ore.emis ? 1.5 : ls[order[v]] * F.s;
          (leaf ? TP : P).push(x + cn2[0], y + cn2[1], z + cn2[2]);
          var carr = leaf ? TC : C;
          carr.push(Math.min(1.5, base[0] * li), Math.min(1.5, base[1] * li), Math.min(1.5, base[2] * li));
        }
      }
    }
    return {
      x0: x0, y0: y0, z0: z0,
      op: P.length ? { n: P.length / 3, pos: buf(P, 3, 'aPos'), col: buf(C, 3, 'aCol') } : { n: 0 },
      tr: TP.length ? { n: TP.length / 3, pos: buf(TP, 3, 'aPos'), col: buf(TC, 3, 'aCol') } : { n: 0 }
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
    // emissive torch cubes at torch spots (decor, non-solid)
    var P = [], C = [];
    G.torches.forEach(function (T) {
      var s = 0.16, y = T.y;
      var verts = [[-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s], [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s]];
      var faces = [[0, 1, 2, 3], [4, 6, 5, 7], [0, 4, 5, 1], [2, 6, 7, 3], [1, 5, 6, 2], [0, 3, 7, 4]];
      faces.forEach(function (f) {
        [f[0], f[1], f[2], f[0], f[2], f[3]].forEach(function (vi) {
          P.push(T.x + verts[vi][0], y + verts[vi][1], T.z + verts[vi][2]);
          C.push(1.4, 0.75, 0.25);
        });
      });
    });
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

  // ---------- physics ----------
  var PR = 0.3, PH = 1.8, EYE = 1.62;
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
    if (dx && !collide(G.px + dx, G.py, G.pz)) G.px += dx;
    if (dz && !collide(G.px, G.py, G.pz + dz)) G.pz += dz;
    if (dy) {
      if (!collide(G.px, G.py + dy, G.pz)) { G.py += dy; G.onGround = false; }
      else { if (dy < 0) G.onGround = true; G.vy = 0; }
    }
    G.px = Math.max(PR, Math.min(G.W - PR, G.px));
    G.pz = Math.max(PR, Math.min(G.D - PR, G.pz));
  }

  // ---------- mining ----------
  function lookDir() {
    var cp = Math.cos(G.pitch);
    return [Math.sin(G.yaw) * cp, Math.sin(G.pitch), -Math.cos(G.yaw) * cp];
  }
  function eyePos() { return [G.px, G.py + EYE, G.pz]; }
  function targetBlock() {
    var e = eyePos(), d = lookDir();
    return S.voxelRay(e, d, 6, solidAt);
  }
  function swing() {
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
      var m0 = meta();
      m0.coal = (m0.coal || 0) + 1;
      G.broken++;
      if (m0.coal >= 20) ach('coal-20', 'Coal Baron');
      saveMeta(); renderHUD(); rebuildAround(hit.x, hit.y, hit.z);
      return;
    }
    if ((ore.gold > 0 || ore.xp > 0) && G.pack >= G.packCap) {
      flash('Backpack full — sell first!');
      return;
    }
    delete G.blocks[key];
    var m = meta();
    G.broken++;
    if (ore.gold > 0 || ore.xp > 0) {
      G.pack++;
      G.sellValue += ore.gold;
      gainXP(ore.xp);
      G.score += ore.gold;
    } else gainXP(1);
    if (G.broken >= 10) ach('mine-10', 'Ore Hauled');
    saveMeta(); renderHUD(); rebuildAround(hit.x, hit.y, hit.z);
  }
  function sellPack() {
    if (G.sellValue <= 0) { flash('Backpack empty — break some ore!'); return; }
    meta().gold += G.sellValue;
    G.pack = 0; G.sellValue = 0;
    flash('Sold! Coal stays banked: ' + (meta().coal || 0));
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
  function render() {
    resize();
    var forest = G.world === 0;
    var fogC = forest ? [0.53, 0.71, 0.88] : [0.02, 0.01, 0.04];
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
    function bind(a, size, name) {
      gl.bindBuffer(gl.ARRAY_BUFFER, a);
      var loc = gl.getAttribLocation(prog, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    }
    function drawBuf(g) {
      if (!g || !g.n) return;
      bind(g.pos, 3, 'aPos');
      bind(g.col, 3, 'aCol');
      gl.drawArrays(gl.TRIANGLES, 0, g.n);
    }
    var planes = frustumPlanes(mvp);
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
  }

  // ---------- input ----------
  var keys = {}, joy = { x: 0, y: 0 };
  document.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    keys[k] = true;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) >= 0) e.preventDefault();
    if (k === 'f') swing();
    if (k === 'm') {
      var h = document.getElementById('help');
      h.style.display = h.style.display === 'none' ? '' : 'none';
    }
    if (k === 'enter' && !overlay.classList.contains('hidden')) hud('overlay-btn').click();
  });
  document.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  var drag = null;
  canvas.addEventListener('mousedown', function (e) { drag = [e.clientX, e.clientY]; swing(); });
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
    var sp = 4.6 * dt;
    var fw = ((keys.w || keys.arrowup) ? 1 : 0) - ((keys.s || keys.arrowdown) ? 1 : 0) + joy.y;
    var st = ((keys.d ? 1 : 0) - (keys.a ? 1 : 0)) + joy.x;
    var sy = Math.sin(G.yaw), cy = Math.cos(G.yaw);
    moveAxis((sy * fw + cy * st) * sp, 0, (-cy * fw + sy * st) * sp);
    G.vy -= 22 * dt;
    if ((keys[' '] ) && G.onGround) { G.vy = 7.6; G.onGround = false; }
    moveAxis(0, G.vy * dt, 0);
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
  newGame(hash === 'mine' ? 1 : 0);
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
    frustumPlanes: frustumPlanes, chunkVisible: chunkVisible, rebuildAround: rebuildAround };
  requestAnimationFrame(loop);
})();
