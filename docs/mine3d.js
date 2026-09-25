/* Spooktacular Mine 3D — raw WebGL voxel mine, zero dependencies.
 * Same engine data as the 2D game (spooky.js): seeded DFS mazes, A* ghost,
 * combo/streak scoring, picks/shop/relics/fishing/XP/achievements.
 * Diorama orbit mode stands in for the iOS AR dioramas (no phone camera needed). */
(function () {
  'use strict';
  var S = window.Spooky;
  var WALL_H = 2.4, EYE = 1.15;
  var DEPTHS = [
    { layer: 'Dirt Tunnels', size: 15, candies: 8, crystals: 2, ghostSpeed: 3.4, ghostThink: 0.55, wall: [0.23, 0.11, 0.37], wallTop: [0.32, 0.18, 0.48], fog: [0.04, 0.02, 0.10] },
    { layer: 'Crystal Hollows', size: 19, candies: 12, crystals: 3, ghostSpeed: 3.8, ghostThink: 0.45, wall: [0.05, 0.29, 0.37], wallTop: [0.10, 0.40, 0.50], fog: [0.02, 0.06, 0.12] },
    { layer: 'Magma Core', size: 23, candies: 16, crystals: 4, ghostSpeed: 4.2, ghostThink: 0.35, wall: [0.37, 0.11, 0.11], wallTop: [0.50, 0.16, 0.14], fog: [0.10, 0.03, 0.03] }
  ];

  var canvas = document.getElementById('game3d');
  var gl = canvas.getContext('webgl', { antialias: true }) || canvas.getContext('experimental-webgl');
  if (!gl) { document.getElementById('overlay-title').textContent = 'No WebGL'; return; }
  var mm = document.getElementById('minimap').getContext('2d');

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  var worldProg = program(
    'attribute vec3 aPos; attribute vec3 aCol; attribute vec2 aUV; attribute vec3 aNrm; attribute float aEmis;' +
    'uniform mat4 uMVP; uniform mat4 uMV; varying vec3 vC; varying vec2 vUV; varying vec3 vN; varying float vD; varying float vE; varying vec3 vW;' +
    'void main(){ vec4 wp = vec4(aPos,1.0); vec4 mv = uMV * wp; gl_Position = uMVP * wp;' +
    ' vC = aCol; vUV = aUV; vN = aNrm; vD = -mv.z; vE = aEmis; vW = aPos; }',
    'precision mediump float; varying vec3 vC; varying vec2 vUV; varying vec3 vN; varying float vD; varying float vE; varying vec3 vW;' +
    'uniform sampler2D uTex; uniform sampler2D uNrm; uniform vec3 uFog; uniform vec3 uCam; uniform float uFlick; uniform vec4 uTorches[6]; uniform int uTorchCount;' +
    'void main(){ vec3 tex = texture2D(uTex, vUV).rgb;' +
    ' vec3 N = normalize(vN);' +
    ' vec3 T = abs(N.x) > 0.9 ? vec3(0.0, 0.0, N.x) : (abs(N.z) > 0.9 ? vec3(N.z, 0.0, 0.0) : vec3(1.0, 0.0, 0.0));' +
    ' vec3 B = normalize(cross(N, T)); T = normalize(cross(B, N));' +
    ' vec3 tn = texture2D(uNrm, vUV).rgb * 2.0 - 1.0;' +
    ' vec3 Np = normalize(T * tn.x + B * tn.y + N * tn.z);' +
    ' vec3 V = normalize(uCam - vW);' +
    ' float li = 0.30;' +
    ' float spec = 0.0;' +
    ' for (int i = 0; i < 6; i++) { if (i >= uTorchCount) break;' +
    '  vec3 Lv = uTorches[i].xyz - vW; float d2 = dot(Lv, Lv); Lv = Lv / sqrt(d2);' +
    '  float att = uTorches[i].w / (1.0 + d2 * 0.30);' +
    '  li += att * max(dot(Np, Lv), 0.0);' +
    '  vec3 H = normalize(Lv + V); spec += att * pow(max(dot(Np, H), 0.0), 24.0); }' +
    ' li *= uFlick;' +
    ' vec3 lit = tex * vC * li + tex * spec * 0.35;' +
    ' lit = mix(lit, tex * vC, vE);' +
    ' float f = smoothstep(7.0, 30.0, vD);' +
    ' gl_FragColor = vec4(mix(lit, uFog, f * (1.0 - vE * 0.7)), 1.0); }');
  var sprProg = program(
    'attribute vec3 aPos; attribute vec2 aUV; uniform mat4 uMVP; varying vec2 vUV;' +
    'void main(){ gl_Position = uMVP * vec4(aPos,1.0); vUV = aUV; }',
    'precision mediump float; varying vec2 vUV; uniform sampler2D uTex; uniform vec3 uFog;' +
    'void main(){ vec4 t = texture2D(uTex, vUV); if (t.a < 0.15) discard; gl_FragColor = vec4(t.rgb, t.a); }');

  function glTex(canvas, repeat) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    var w = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w);
    return t;
  }

  /* Hand-drawn sprite art (no emoji font needed): ghost, candy, gem,
   * relic, pond, torch flame. */
  function makeArt(kind) {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d');
    g.clearRect(0, 0, 64, 64);
    if (kind === 'ghost') {
      g.fillStyle = '#f2f2fa';
      g.beginPath();
      g.arc(32, 26, 18, Math.PI, 0);
      g.lineTo(50, 52);
      for (var i = 0; i < 3; i++) { g.arc(50 - 6 - i * 12, 52, 6, 0, Math.PI); }
      g.closePath(); g.fill();
      g.fillStyle = '#1a1a2e';
      g.beginPath(); g.ellipse(25, 24, 4, 6, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(39, 24, 4, 6, 0, 0, 7); g.fill();
    } else if (kind === 'candy') {
      g.fillStyle = '#ffbe5a';
      g.beginPath(); g.moveTo(8, 32); g.lineTo(20, 22); g.lineTo(20, 42); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(56, 32); g.lineTo(44, 22); g.lineTo(44, 42); g.closePath(); g.fill();
      g.fillStyle = '#ff8c1a';
      g.beginPath(); g.ellipse(32, 32, 13, 11, 0, 0, 7); g.fill();
      g.strokeStyle = '#fff2d9'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(26, 24); g.lineTo(38, 40); g.stroke();
    } else if (kind === 'gem') {
      g.fillStyle = '#59e6ff';
      g.beginPath(); g.moveTo(32, 6); g.lineTo(52, 28); g.lineTo(32, 58); g.lineTo(12, 28); g.closePath(); g.fill();
      g.fillStyle = '#b8f4ff';
      g.beginPath(); g.moveTo(32, 6); g.lineTo(52, 28); g.lineTo(32, 28); g.closePath(); g.fill();
      g.fillStyle = '#1fa8c9';
      g.beginPath(); g.moveTo(32, 58); g.lineTo(52, 28); g.lineTo(32, 28); g.closePath(); g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(26, 20, 3, 0, 7); g.fill();
    } else if (kind === 'relic') {
      g.fillStyle = '#9aa0b0';
      g.beginPath();
      if (g.roundRect) g.roundRect(20, 8, 24, 48, 6); else g.rect(20, 8, 24, 48);
      g.fill();
      g.strokeStyle = '#565b68'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(26, 20); g.lineTo(38, 32); g.lineTo(26, 44); g.stroke();
      g.fillStyle = '#c9cede';
      g.fillRect(20, 8, 24, 5);
    } else if (kind === 'pond') {
      g.fillStyle = '#2f7bff';
      g.beginPath(); g.ellipse(32, 34, 24, 16, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(32, 34, 15, 9, 0, 0, 7); g.stroke();
      g.beginPath(); g.ellipse(32, 34, 7, 4, 0, 0, 7); g.stroke();
    } else if (kind === 'torch') {
      g.fillStyle = '#7a4a21';
      g.fillRect(29, 38, 6, 22);
      g.fillStyle = '#ff7518';
      g.beginPath(); g.moveTo(32, 4);
      g.bezierCurveTo(48, 22, 44, 38, 32, 44);
      g.bezierCurveTo(20, 38, 16, 22, 32, 4);
      g.fill();
      g.fillStyle = '#ffd166';
      g.beginPath(); g.moveTo(32, 18);
      g.bezierCurveTo(40, 28, 38, 38, 32, 41);
      g.bezierCurveTo(26, 38, 24, 28, 32, 18);
      g.fill();
    }
    return glTex(c, false);
  }
  var TEX = { ghost: makeArt('ghost'), candy: makeArt('candy'), gem: makeArt('gem'),
    relic: makeArt('relic'), pond: makeArt('pond'), torch: makeArt('torch') };

  var brickHeight = null;
  /* Procedural grayscale masonry: tint comes from vertex color, so one
   * texture serves every depth palette. Brick heights are kept for the
   * normal map built just below. */
  function makePattern(kind) {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d');
    var img = g.createImageData(64, 64);
    var rng = new S.SeededRNG(kind === 'floor' ? 77 : kind === 'ceil' ? 913 : 1234);
    for (var y = 0; y < 64; y++) for (var x = 0; x < 64; x++) {
      var v;
      if (kind === 'white') {
        v = 1.0;
      } else if (kind === 'brick') {
        var mortar = (y % 16 === 0) || (((x + ((y / 16) | 0) * 32) | 0) % 64 === 0);
        v = mortar ? 0.45 : 0.78 + rng.nextDouble() * 0.28;
        if (y < 3) v *= 1.15; // top highlight
      } else if (kind === 'floor') {
        v = ((x >> 4) + (y >> 4)) % 2 ? 0.42 : 0.55;
        v *= 0.9 + rng.nextDouble() * 0.2;
      } else {
        v = 0.30 + rng.nextDouble() * 0.12;
      }
      if (kind === 'brick') brickHeight = brickHeight || [];
      if (kind === 'brick') brickHeight[y * 64 + x] = v;
      var o = (y * 64 + x) * 4, b = Math.max(0, Math.min(255, Math.round(v * 255)));
      img.data[o] = b; img.data[o + 1] = b; img.data[o + 2] = b; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return glTex(c, true);
  }
  var TEXWALL = makePattern('brick'), TEXFLOOR = makePattern('floor'),
      TEXCEIL = makePattern('ceil'), TEXWHITE = makePattern('white');

  /* Tangent-space normal map from the brick heights (Sobel). Flat normal
   * for floor/ceiling/glow. */
  function makeNormalTex(height, strength) {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d');
    var img = g.createImageData(64, 64);
    function h(x, y) {
      x = (x + 64) % 64; y = (y + 64) % 64;
      return height ? height[y * 64 + x] : 0.5;
    }
    for (var y = 0; y < 64; y++) for (var x = 0; x < 64; x++) {
      var dx = (h(x + 1, y) - h(x - 1, y)) * (strength || 2);
      var dy = (h(x, y + 1) - h(x, y - 1)) * (strength || 2);
      var inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      var o = (y * 64 + x) * 4;
      img.data[o] = Math.round((-dx * inv * 0.5 + 0.5) * 255);
      img.data[o + 1] = Math.round((-dy * inv * 0.5 + 0.5) * 255);
      img.data[o + 2] = Math.round(inv * 255);
      img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return glTex(c, true);
  }
  var NRMWALL = makeNormalTex(brickHeight, 2.2), NRMFLAT = makeNormalTex(null, 0);

  function buf(data, size, prog, name) {
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, name);
    return { b: b, loc: loc, size: size };
  }
  function bindAttr(a, stride, offset) {
    gl.bindBuffer(gl.ARRAY_BUFFER, a.b);
    gl.enableVertexAttribArray(a.loc);
    gl.vertexAttribPointer(a.loc, a.size, gl.FLOAT, false, stride * 4, offset * 4);
  }

  // ---------- game state (same systems as game.js) ----------
  var G = null;
  function meta() { return G.meta; }
  function goldMult() { var m = 1; meta().relics.forEach(function (r) { if (r.effect === 'Gold') m += r.value; }); return m; }
  function dmgMult() { var m = 1; meta().relics.forEach(function (r) { if (r.effect === 'Damage') m += r.value; }); return m; }
  function speedMult() { var m = 1; meta().relics.forEach(function (r) { if (r.effect === 'Speed') m += r.value; }); return m; }
  function packBonus() { var n = 0; meta().relics.forEach(function (r) { if (r.effect === 'Pack') n++; }); return Math.min(2, n); }
  function moveSpeed() { return (2.6 + meta().pickIdx * 0.35) * speedMult(); }
  function ach(id, name) { if (!meta().ach[id]) { meta().ach[id] = true; flash('🏆 ' + name, 3); } }

  function newGame(seed) {
    var best = 0;
    try { best = +localStorage.getItem('spooky_best3d') || 0; } catch (e) {}
    G = { seed: seed, depth: 0, score: 0, combo: 0, streak: 0, state: 'title', time: 0, tab: 0, picked: 0,
      meta: { gold: 0, level: 1, xp: 0, pickIdx: 0, relics: [], ach: {}, best: best },
      px: 1.5, pz: 1.5, yaw: 0, pitch: 0, orbit: false,
      ghost: { x: 1, y: 1, fx: 1, fz: 1, t: 1, path: [], think: 0 },
      candies: [], crystals: [], relicSpot: null, pond: null, pondUsed: false, torches: [],
      maze: null, rng: null, world: null };
    loadDepth(0);
  }
  function loadDepth(d) {
    var cfg = DEPTHS[d];
    var rng = new S.SeededRNG(G.seed + d * 7919);
    var maze = S.carveDFS(cfg.size, cfg.size, G.seed + d * 7919);
    var rooms = [];
    for (var k in maze.cells) {
      var p = k.split(',');
      if (+p[0] % 2 === 1 && +p[1] % 2 === 1 && !(+p[0] === 1 && +p[1] === 1)) rooms.push([+p[0], +p[1]]);
    }
    for (var i = rooms.length - 1; i > 0; i--) { var j = rng.nextInt(i + 1), t = rooms[i]; rooms[i] = rooms[j]; rooms[j] = t; }
    G.maze = maze; G.rng = rng; G.depth = d;
    var n = 0, map = function (r) { return { x: r[0] + 0.5, z: r[1] + 0.5 }; };
    G.candies = rooms.slice(n, n + cfg.candies).map(map); n += cfg.candies;
    G.crystals = rooms.slice(n, n + cfg.crystals + packBonus()).map(map); n += cfg.crystals + packBonus();
    G.relicSpot = rooms[n] ? map(rooms[n]) : null; n++;
    G.pond = rooms[n] ? map(rooms[n]) : null; G.pondUsed = false;
    G.torches = rooms.filter(function (_, k) { return k % 3 === 0; }).slice(0, 24).map(map);
    var gx = 1.5, gz = 1.5, best = -1;
    rooms.forEach(function (r) {
      var dist = Math.abs(r[0] - 1) + Math.abs(r[1] - 1);
      if (dist > best) { best = dist; gx = r[0] + 0.5; gz = r[1] + 0.5; }
    });
    G.ghost = { x: gx, y: gz, fx: gx, fz: gz, t: 1, path: [], think: 0 };
    G.px = 1.5; G.pz = 1.5; G.yaw = Math.PI * 0.25; G.pitch = -0.05;
    buildWorld();
  }
  function walkable(x, z) { return !!G.maze.cells[S.key(x, z)]; }
  function solidAt(wx, wz) {
    var cx = Math.floor(wx), cz = Math.floor(wz);
    return !walkable(cx, cz);
  }

  // ---------- world geometry (merged static buffers per material) ----------
  function newGroup() { return { P: [], C: [], U: [], N: [], E: [] }; }
  function quad(G8, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, col, emis, uRep, vRep, nx, ny, nz) {
    uRep = uRep || 1; vRep = vRep || 1;
    G8.P.push(ax, ay, az, bx, by, bz, cx, cy, cz, ax, ay, az, cx, cy, cz, dx, dy, dz);
    var uvs = [0, 0, uRep, 0, uRep, vRep, 0, 0, uRep, vRep, 0, vRep];
    for (var i = 0; i < 6; i++) {
      G8.C.push(col[0], col[1], col[2]);
      G8.U.push(uvs[i * 2], uvs[i * 2 + 1]);
      G8.N.push(nx, ny, nz);
      G8.E.push(emis);
    }
  }
  function buildWorld() {
    var cfg = DEPTHS[G.depth];
    var wall = newGroup(), floor = newGroup(), ceil = newGroup(), glow = newGroup();
    var w0 = cfg.wall, w1 = cfg.wallTop;
    var x, z, len;
    for (x = 0; x < G.maze.w; x++) for (z = 0; z < G.maze.d; z++) {
      var open = walkable(x, z);
      if (!open) {
        // top
        quad(wall, x, WALL_H, z, x + 1, WALL_H, z, x + 1, WALL_H, z + 1, x, WALL_H, z + 1, w1, 0, 1, 1, 0, 1, 0);
        // sides facing open neighbors (plus outer shell)
        if (walkable(x + 1, z)) quad(wall, x + 1, 0, z, x + 1, 0, z + 1, x + 1, WALL_H, z + 1, x + 1, WALL_H, z, w0, 0, 1, 2, 1, 0, 0);
        if (walkable(x - 1, z)) quad(wall, x, 0, z + 1, x, 0, z, x, WALL_H, z, x, WALL_H, z + 1, w0, 0, 1, 2, -1, 0, 0);
        if (walkable(x, z + 1)) quad(wall, x, 0, z + 1, x + 1, 0, z + 1, x + 1, WALL_H, z + 1, x, WALL_H, z + 1, w0, 0, 1, 2, 0, 0, 1);
        if (walkable(x, z - 1)) quad(wall, x + 1, 0, z, x, 0, z, x, WALL_H, z, x + 1, WALL_H, z, w0, 0, 1, 2, 0, 0, -1);
      } else {
        // ceiling over open cells (enclosed mine) + checkered floor
        quad(ceil, x, WALL_H, z + 1, x + 1, WALL_H, z + 1, x + 1, WALL_H, z, x, WALL_H, z, [0.10, 0.07, 0.16], 0, 1, 1, 0, -1, 0);
        var f = ((x + z) % 2) ? [0.16, 0.11, 0.28] : [0.11, 0.08, 0.20];
        quad(floor, x, 0, z, x, 0, z + 1, x + 1, 0, z + 1, x + 1, 0, z, f, 0, 1, 1, 0, 1, 0);
      }
    }
    // glowing crystal clusters on some wall tops
    var rng = new S.SeededRNG(G.seed + G.depth * 131);
    for (var ci = 0; ci < 26; ci++) {
      x = 1 + rng.nextInt(G.maze.w - 2); z = 1 + rng.nextInt(G.maze.d - 2);
      if (walkable(x, z)) continue;
      var s = 0.18 + rng.nextDouble() * 0.22, ox = x + 0.2 + rng.nextDouble() * 0.6, oz = z + 0.2 + rng.nextDouble() * 0.6;
      var cc = rng.nextDouble() < 0.5 ? [0.3, 0.85, 1.0] : [0.75, 0.45, 1.0];
      quad(glow, ox - s, WALL_H, oz - s, ox + s, WALL_H, oz - s, ox + s, WALL_H + s * 2, oz, ox - s, WALL_H + s * 2, oz, cc, 0.9, 1, 1, 0, 0, 1);
      quad(glow, ox - s, WALL_H, oz + s, ox - s, WALL_H, oz - s, ox - s, WALL_H + s * 2, oz, ox - s, WALL_H + s * 2, oz + s, cc, 0.9, 1, 1, 0, 0, -1);
    }
    function freeze(G8, tex, nrm) {
      return { n: G8.P.length / 3, tex: tex, nrm: nrm,
        pos: buf(G8.P, 3, worldProg, 'aPos'), col: buf(G8.C, 3, worldProg, 'aCol'),
        uv: buf(G8.U, 2, worldProg, 'aUV'), nrmA: buf(G8.N, 3, worldProg, 'aNrm'),
        em: buf(G8.E, 1, worldProg, 'aEmis') };
    }
    G.world = [freeze(wall, TEXWALL, NRMWALL), freeze(floor, TEXFLOOR, NRMFLAT),
      freeze(ceil, TEXCEIL, NRMFLAT), freeze(glow, TEXWHITE, NRMFLAT)];
  }

  // ---------- sprites ----------
  var sprPos = [], sprUV = [];
  var sprBufP = null, sprBufU = null;
  function initSprites() {
    sprBufP = gl.createBuffer(); sprBufU = gl.createBuffer();
  }
  function drawSprites(list, time) {
    // group by texture
    var groups = {};
    list.forEach(function (sp) { (groups[sp.tex] = groups[sp.tex] || []).push(sp); });
    var V = currentView();
    var rx = V[0], ry = V[4], rz = V[8], ux = V[1], uy = V[5], uz = V[9];
    Object.keys(groups).forEach(function (key) {
      sprPos = []; sprUV = [];
      groups[key].forEach(function (sp) {
        var hw = sp.size / 2, hh = sp.size / 2, bob = sp.bob ? Math.sin(time * 3 + sp.x) * 0.06 : 0;
        var cxp = sp.x, cyp = sp.y + bob, czp = sp.z;
        var corners = [[-hw, -hh, 0, 0], [hw, -hh, 1, 0], [hw, hh, 1, 1], [-hw, -hh, 0, 0], [hw, hh, 1, 1], [-hw, hh, 0, 1]];
        corners.forEach(function (cr) {
          sprPos.push(cxp + rx * cr[0] + ux * cr[1], cyp + ry * cr[0] + uy * cr[1], czp + rz * cr[0] + uz * cr[1]);
          sprUV.push(cr[2], cr[3]);
        });
      });
      gl.useProgram(sprProg);
      gl.uniformMatrix4fv(gl.getUniformLocation(sprProg, 'uMVP'), false, new Float32Array(currentMVP()));
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, TEX[key]);
      gl.uniform1i(gl.getUniformLocation(sprProg, 'uTex'), 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, sprBufP);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sprPos), gl.DYNAMIC_DRAW);
      var locP = gl.getAttribLocation(sprProg, 'aPos');
      gl.enableVertexAttribArray(locP);
      gl.vertexAttribPointer(locP, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, sprBufU);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sprUV), gl.DYNAMIC_DRAW);
      var locU = gl.getAttribLocation(sprProg, 'aUV');
      gl.enableVertexAttribArray(locU);
      gl.vertexAttribPointer(locU, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, sprPos.length / 3);
    });
  }

  // ---------- camera ----------
  function eyePos() { return [G.px, EYE, G.pz]; }
  function lookDir() {
    return [Math.sin(G.yaw) * Math.cos(G.pitch), Math.sin(G.pitch), -Math.cos(G.yaw) * Math.cos(G.pitch)];
  }
  function currentView() {
    var t = G.time;
    if (G.orbit) {
      var cx = G.maze.w / 2, cz = G.maze.d / 2, r = Math.max(G.maze.w, G.maze.d) * 0.85;
      var a = t * 0.12;
      return S.mLookAt(cx + Math.sin(a) * r, r * 0.75, cz + Math.cos(a) * r, cx, 0, cz, 0, 1, 0);
    }
    var e = eyePos(), d = lookDir();
    return S.mLookAt(e[0], e[1], e[2], e[0] + d[0], e[1] + d[1], e[2] + d[2], 0, 1, 0);
  }
  function currentMVP() {
    var aspect = canvas.width / canvas.height;
    return S.mMul(S.mPerspective(Math.PI / 3.2, aspect, 0.05, 120), currentView());
  }

  // ---------- update ----------
  function gainXP(n) {
    var m = meta();
    m.xp += n;
    while (m.xp >= S.xpNext(m.level)) {
      m.xp -= S.xpNext(m.level); m.level++;
      m.gold += 25; G.score += 100;
      flash('⬆️ Level ' + m.level + '! +25 gold', 2.2);
      if (m.level >= 5) ach('level-5', 'Living Myth — reach level 5');
    }
  }
  function fish() {
    var bag = [];
    S.FISH.forEach(function (f) { for (var i = 0; i < S.FISH_WEIGHT[f.rarity]; i++) bag.push(f); });
    return G.rng.pick(bag);
  }
  function near(ax, az, bx, bz, r) { var dx = ax - bx, dz = az - bz; return dx * dx + dz * dz < r * r; }

  var keys = {};
  function update(dt) {
    if (G.state !== 'play' || G.tab !== 0) return;
    G.time += dt;
    var m = meta(), cfg = DEPTHS[G.depth], g = G.ghost;
    // move
    var sp = moveSpeed() * dt, fw = 0, st = 0;
    if (keys.w || keys.arrowup) fw += 1;
    if (keys.s || keys.arrowdown) fw -= 1;
    if (keys.a || keys.arrowleft) st -= 1;
    if (keys.d || keys.arrowright) st += 1;
    fw += joy.y; st += joy.x;
    var sy = Math.sin(G.yaw), cy = Math.cos(G.yaw);
    var dx = (sy * fw + cy * st) * sp, dz = (-cy * fw + sy * st) * sp;
    moveWithCollision(dx, 0); moveWithCollision(0, dz);
    // ghost A*
    g.think -= dt;
    if (g.think <= 0) {
      g.think = cfg.ghostThink;
      var p = S.astar(Math.floor(g.x), Math.floor(g.y), Math.floor(G.px), Math.floor(G.pz), walkable, 600);
      g.path = p && p.length > 1 ? p.slice(1).map(function (n) { return { x: n[0] + 0.5, z: n[1] + 0.5 }; }) : [];
    }
    var gs = cfg.ghostSpeed * dt;
    while (gs > 0 && g.path.length) {
      var t = g.path[0], ddx = t.x - g.x, ddz = t.z - g.z, dist = Math.hypot(ddx, ddz);
      if (dist < 1e-4) { g.path.shift(); continue; }
      var step = Math.min(gs, dist);
      g.x += ddx / dist * step; g.z += ddz / dist * step; gs -= step;
      if (step >= dist - 1e-6) g.path.shift();
    }
    // pickups
    var i;
    for (i = G.candies.length - 1; i >= 0; i--) {
      var c = G.candies[i];
      if (near(G.px, G.pz, c.x, c.z, 0.7)) {
        G.candies.splice(i, 1); G.combo++; G.streak++; G.picked++;
        G.score += Math.round((10 * S.comboMult(G.combo) + S.streakBonus(G.streak)) * dmgMult());
        m.gold += Math.round(2 * goldMult()); gainXP(8);
        if (G.score >= 1000) ach('score-1k', 'Score Legend — 1,000 points');
      }
    }
    for (i = G.crystals.length - 1; i >= 0; i--) {
      var r = G.crystals[i];
      if (near(G.px, G.pz, r.x, r.z, 0.7)) {
        G.crystals.splice(i, 1); G.combo += 2;
        G.score += Math.round(50 * S.comboMult(G.combo) * dmgMult());
        m.gold += Math.round(5 * goldMult()); gainXP(20);
      }
    }
    if (G.relicSpot && near(G.px, G.pz, G.relicSpot.x, G.relicSpot.z, 0.7)) {
      var owned = m.relics.map(function (x) { return x.name; });
      var pool = S.RELICS.filter(function (x) { return owned.indexOf(x.name) < 0; });
      if (pool.length) {
        var relic = G.rng.pick(pool);
        m.relics.push(relic); G.score += 150;
        flash('🗿 ' + relic.name + ' (' + relic.effect + ' +' + Math.round(relic.value * 100) + '%)', 3);
      }
      G.relicSpot = null;
    }
    if (G.pond && !G.pondUsed && near(G.px, G.pz, G.pond.x, G.pond.z, 0.8)) {
      G.pondUsed = true;
      var f = fish(), gv = Math.round(f.value * goldMult());
      m.gold += gv; G.score += Math.round(f.value * dmgMult());
      flash('🎣 ' + f.name + ' (' + f.rarity + ') +' + gv + ' gold', 3);
    }
    if (near(G.px, G.pz, g.x, g.z, 0.8)) return die();
    if (!G.candies.length && !G.crystals.length) {
      if (G.depth >= DEPTHS.length - 1) return win();
      G.score += 250 * (G.depth + 1); m.gold += 30;
      ach('clear-1', 'Pathfinder — clear a depth');
      loadDepth(G.depth + 1);
      openShop();
      return;
    }
    renderHUD();
  }
  function moveWithCollision(dx, dz) {
    var r = 0.32, nx = G.px + dx, nz = G.pz + dz;
    if (!circleHitsWall(nx, G.pz, r)) G.px = nx;
    if (!circleHitsWall(G.px, nz, r)) G.pz = nz;
    G.px = Math.max(0.4, Math.min(G.maze.w - 0.4, G.px));
    G.pz = Math.max(0.4, Math.min(G.maze.d - 0.4, G.pz));
  }
  function circleHitsWall(wx, wz, r) {
    for (var ox = -1; ox <= 1; ox++) for (var oz = -1; oz <= 1; oz++) {
      var cx = Math.floor(wx) + ox, cz = Math.floor(wz) + oz;
      if (walkable(cx, cz)) continue;
      var nx = Math.max(cx, Math.min(wx, cx + 1)), nz = Math.max(cz, Math.min(wz, cz + 1));
      var ddx = wx - nx, ddz = wz - nz;
      if (ddx * ddx + ddz * ddz < r * r) return true;
    }
    return false;
  }

  // ---------- overlays / HUD (same loop as 2D) ----------
  var flashMsg = '', flashT = 0;
  function flash(msg, dur) { flashMsg = msg; flashT = dur || 2.2; }
  var overlay = document.getElementById('overlay');
  function hud(id) { return document.getElementById(id); }
  function renderHUD() {
    var m = meta();
    hud('score').textContent = S.compact(G.score);
    hud('depth').textContent = DEPTHS[G.depth].layer;
    hud('candy').textContent = G.candies.length + G.crystals.length;
    hud('gold').textContent = S.compact(m.gold);
    hud('level').textContent = m.level;
    hud('pick').textContent = S.PICKS[m.pickIdx].name;
  }
  function saveBest() {
    if (G.score > meta().best) {
      meta().best = G.score;
      try { localStorage.setItem('spooky_best3d', String(G.score)); } catch (e) {}
    }
  }
  function achList() {
    var ids = Object.keys(meta().ach);
    return ids.length ? ' 🏆 ' + ids.length : '';
  }
  function showOverlay(t, txt, btn, btn2, buyFn) {
    hud('overlay-title').textContent = t; hud('overlay-text').textContent = txt;
    var b1 = hud('overlay-btn'), b2 = hud('overlay-btn2');
    b1.textContent = btn;
    b1.onclick = function () {
      if (G.state === 'shop' && buyFn) {
        if (buyFn() === false) return;
        openShop();
        if (meta().pickIdx >= S.PICKS.length - 1) { G.state = 'play'; hideOverlay(); }
        renderHUD();
        return;
      }
      hideOverlay();
      if (G.state === 'title' || G.state === 'shop') G.state = 'play';
      else { newGame((Math.random() * 1e9) | 0); G.state = 'play'; }
      renderHUD();
    };
    if (btn2) { b2.style.display = ''; b2.textContent = btn2; b2.onclick = function () { hideOverlay(); G.state = 'play'; renderHUD(); }; }
    else b2.style.display = 'none';
    overlay.classList.remove('hidden');
  }
  function hideOverlay() { overlay.classList.add('hidden'); }
  function die() {
    G.state = 'dead'; G.combo = 0; saveBest();
    showOverlay('☠️ Caught in the ' + DEPTHS[G.depth].layer + '!',
      'Score ' + S.compact(G.score) + ' · Lv ' + meta().level + ' · ' + S.PICKS[meta().pickIdx].name +
      ' · Best ' + S.compact(meta().best) + achList(), 'Try again', null, null);
  }
  function win() {
    G.state = 'win'; G.score += 1000; saveBest();
    showOverlay('🎃 Spooktacular! All 3 depths cleared!',
      'Score ' + S.compact(G.score) + ' · Lv ' + meta().level + ' · ' + meta().relics.length +
      '/12 relics · Best ' + S.compact(meta().best) + achList(), 'Play again', null, null);
    renderHUD();
  }
  function openShop() {
    G.state = 'shop';
    var m = meta(), next = S.PICKS[m.pickIdx + 1];
    var txt = 'Depth cleared! Now entering the ' + DEPTHS[G.depth].layer +
      '. Gold: ' + m.gold + '. Wielding: ' + S.PICKS[m.pickIdx].name + '.';
    if (next) {
      txt += ' Next: ' + next.name + ' (' + next.cost + ' gold).';
      var can = m.gold >= next.cost;
      showOverlay('🛒 Mine Shop', txt, can ? 'Buy ' + next.name : 'Need ' + (next.cost - m.gold) + ' more gold',
        'Descend ↓', function () {
          if (m.gold < next.cost) return false;
          m.gold -= next.cost; m.pickIdx++; G.score += 50;
          if (m.pickIdx === 1) ach('first-pick', 'New Edge — first upgrade');
          if (S.PICKS[m.pickIdx].name === 'Void Drill') ach('void-drill', 'Maximum Spin — own the Void Drill');
          return true;
        });
    } else showOverlay('🛒 Mine Shop', txt + ' You wield the ultimate tool.', 'Descend ↓', null, null);
    renderHUD();
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
    var cfg = DEPTHS[G.depth];
    gl.clearColor(cfg.fog[0] * 0.6, cfg.fog[1] * 0.6, cfg.fog[2] * 0.6, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    var flick = 0.9 + 0.07 * Math.sin(G.time * 7) + 0.03 * Math.sin(G.time * 13);
    var mvp = currentMVP(), mv = currentView();
    gl.useProgram(worldProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(worldProg, 'uMVP'), false, new Float32Array(mvp));
    gl.uniformMatrix4fv(gl.getUniformLocation(worldProg, 'uMV'), false, new Float32Array(mv));
    gl.uniform1f(gl.getUniformLocation(worldProg, 'uFlick'), flick);
    gl.uniform3fv(gl.getUniformLocation(worldProg, 'uFog'), new Float32Array(cfg.fog));
    // 6 nearest torches as point lights
    var sorted = G.torches.map(function (t) {
      var dx = t.x - G.px, dz = t.z - G.pz;
      return { t: t, d: dx * dx + dz * dz };
    }).sort(function (a, b) { return a.d - b.d; }).slice(0, 6);
    var tarr = [];
    sorted.forEach(function (o) { tarr.push(o.t.x, 1.9, o.t.z, 1.5); });
    while (tarr.length < 24) tarr.push(0, -10, 0, 0);
    gl.uniform4fv(gl.getUniformLocation(worldProg, 'uTorches'), new Float32Array(tarr));
    gl.uniform1i(gl.getUniformLocation(worldProg, 'uTorchCount'), sorted.length);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(gl.getUniformLocation(worldProg, 'uTex'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.uniform1i(gl.getUniformLocation(worldProg, 'uNrm'), 1);
    var eye = eyePos();
    gl.uniform3fv(gl.getUniformLocation(worldProg, 'uCam'), new Float32Array(eye));
    G.world.forEach(function (grp) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, grp.tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, grp.nrm);
      bindAttr(grp.pos, 3, 0); bindAttr(grp.col, 3, 0);
      bindAttr(grp.uv, 2, 0); bindAttr(grp.nrmA, 3, 0); bindAttr(grp.em, 1, 0);
      gl.drawArrays(gl.TRIANGLES, 0, grp.n);
    });
    // sprites
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    var list = [];
    G.candies.forEach(function (c) { list.push({ tex: 'candy', x: c.x, y: 0.8, z: c.z, size: 0.55, bob: true }); });
    G.crystals.forEach(function (c) { list.push({ tex: 'gem', x: c.x, y: 0.9, z: c.z, size: 0.7, bob: true }); });
    if (G.relicSpot) list.push({ tex: 'relic', x: G.relicSpot.x, y: 0.8, z: G.relicSpot.z, size: 0.9, bob: false });
    if (G.pond) list.push({ tex: 'pond', x: G.pond.x, y: 0.7, z: G.pond.z, size: 0.9, bob: false });
    G.torches.forEach(function (t) { list.push({ tex: 'torch', x: t.x, y: 1.7, z: t.z, size: 0.5, bob: false }); });
    var gb = 1 + 0.08 * Math.sin(G.time * 5);
    list.push({ tex: 'ghost', x: gX(), y: 1.2, z: gZ(), size: 1.1 * gb, bob: true });
    drawSprites(list, G.time);
    gl.disable(gl.BLEND);
    drawMinimap();
    if (flashT > 0) {
      // DOM-free flash: draw on minimap canvas? use overlay div text via title
      document.title = '🎃 ' + flashMsg;
    }
  }
  function gX() { return G.ghost.x; }
  function gZ() { return G.ghost.z; }
  function drawMinimap() {
    var s = 132, n = G.maze.w, k = s / n;
    mm.clearRect(0, 0, s, s);
    mm.fillStyle = '#0b0620'; mm.fillRect(0, 0, s, s);
    for (var x = 0; x < n; x++) for (var z = 0; z < G.maze.d; z++) {
      if (walkable(x, z)) { mm.fillStyle = '#2a1a55'; mm.fillRect(x * k, z * k, k, k); }
    }
    mm.fillStyle = '#ffd166';
    G.candies.forEach(function (c) { mm.fillRect((c.x - 0.5) * k + k / 3, (c.z - 0.5) * k + k / 3, 2, 2); });
    mm.fillStyle = '#7df9ff';
    G.crystals.forEach(function (c) { mm.fillRect((c.x - 0.5) * k + k / 3, (c.z - 0.5) * k + k / 3, 2, 2); });
    mm.fillStyle = '#ff5555';
    mm.beginPath(); mm.arc(G.ghost.x / n * s, G.ghost.z / G.maze.d * s, 3, 0, 7); mm.fill();
    mm.fillStyle = '#ff9f1c';
    mm.beginPath(); mm.arc(G.px / n * s, G.pz / G.maze.d * s, 3, 0, 7); mm.fill();
    // view direction
    mm.strokeStyle = '#ff9f1c'; mm.beginPath();
    mm.moveTo(G.px / n * s, G.pz / G.maze.d * s);
    mm.lineTo((G.px + Math.sin(G.yaw) * 2) / n * s, (G.pz - Math.cos(G.yaw) * 2) / G.maze.d * s);
    mm.stroke();
  }

  // ---------- input ----------
  document.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    keys[k] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) >= 0) e.preventDefault();
    if (k === 'o') G.orbit = !G.orbit;
    if (k === 'enter' && !overlay.classList.contains('hidden')) hud('overlay-btn').click();
  });
  document.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  var joy = { x: 0, y: 0 };
  var drag = null;
  canvas.addEventListener('mousedown', function (e) { drag = [e.clientX, e.clientY]; });
  document.addEventListener('mousemove', function (e) {
    if (!drag) return;
    G.yaw -= (e.clientX - drag[0]) * 0.004;
    G.pitch = Math.max(-1.2, Math.min(1.2, G.pitch - (e.clientY - drag[1]) * 0.003));
    drag = [e.clientX, e.clientY];
  });
  document.addEventListener('mouseup', function () { drag = null; });
  var lastTouch = null, stickId = null, lookId = null, stickC = null;
  var stick = document.getElementById('stick'), nub = document.getElementById('nub');
  if ('ontouchstart' in window) stick.style.display = 'block';
  canvas.addEventListener('touchstart', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.clientX < window.innerWidth * 0.4 && stickId === null) { stickId = t.identifier; stickC = [t.clientX, t.clientY]; }
      else if (lookId === null) { lookId = t.identifier; lastTouch = [t.clientX, t.clientY]; }
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
        nub.style.left = (32 + joy.x * 30) + 'px'; nub.style.top = (32 - joy.y * 30) + 'px';
      } else if (t.identifier === lookId && lastTouch) {
        G.yaw -= (t.clientX - lastTouch[0]) * 0.006;
        G.pitch = Math.max(-1.2, Math.min(1.2, G.pitch - (t.clientY - lastTouch[1]) * 0.004));
        lastTouch = [t.clientX, t.clientY];
      }
    }
    e.preventDefault();
  }, { passive: false });
  function endTouch(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === stickId) { stickId = null; joy.x = joy.y = 0; nub.style.left = '32px'; nub.style.top = '32px'; }
      if (t.identifier === lookId) { lookId = null; lastTouch = null; }
    }
  }
  canvas.addEventListener('touchend', endTouch);
  canvas.addEventListener('touchcancel', endTouch);

  document.getElementById('newmaze').addEventListener('click', function () {
    newGame((Math.random() * 1e9) | 0); G.state = 'play'; hideOverlay(); renderHUD();
  });
  document.getElementById('shopbtn').addEventListener('click', function () {
    if (G.state === 'play') openShop();
  });
  document.getElementById('orbitbtn').addEventListener('click', function () { G.orbit = !G.orbit; });

  // ---------- main loop ----------
  var last = 0;
  function loop(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    if (flashT > 0) { flashT -= dt; if (flashT <= 0) document.title = '🎃 Spooktacular Mine 3D'; }
    update(dt);
    if (G.world) render();
    requestAnimationFrame(loop);
  }

  initSprites();
  newGame(20261031);
  G.state = 'title';
  renderHUD();
  window.SpookyTabs.init({
    tabsId: 'tabs', panelsId: 'tabpanels',
    snapshot: function () {
      var m = meta();
      return { score: G.score, layer: DEPTHS[G.depth].layer, left: G.candies.length + G.crystals.length,
        gold: m.gold, level: m.level, pick: S.PICKS[m.pickIdx].name, seed: G.seed,
        relics: m.relics.length, ach: m.ach, collected: G.picked };
    },
    onSelect: function (i) { G.tab = i; },
    actions: {
      openShop: function () { if (G.state === 'play') openShop(); },
      newMaze: function () { document.getElementById('newmaze').click(); }
    },
    host: { onUnlock: function (id, name) { meta().ach[id] = name; } }
  });
  showOverlay('🎃 Spooktacular Mine 3D',
    'Same mine, real 3D. WASD + drag to walk the ' + DEPTHS[0].layer + '. Grab 🍬💎, find 🗿, fish 🎣, buy picks 🛒, dodge the 👻. Press O for the AR-style diorama orbit.',
    'Descend ⛏️', null, null);
  requestAnimationFrame(loop);
})();
