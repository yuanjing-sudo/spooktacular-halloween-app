/* Spooktacular Ghosts 3D — walkable haunted maze, raw WebGL, zero dependencies.
 * Same engine data as the 2D game (spooky.js): seeded DFS maze, A* ghost.
 * WASD/arrows + drag to look, walk into candy, dodge the 👻. */
(function () {
  'use strict';
  var S = window.Spooky;
  var WALL_H = 2.4, EYE = 1.2;
  var canvas = document.getElementById('gameg');

  var gl = canvas.getContext('webgl', { antialias: true }) || canvas.getContext('experimental-webgl');
  if (!gl) {
    document.getElementById('overlay-title').textContent = 'No WebGL';
    document.getElementById('overlay-text').textContent = 'Your browser could not create a WebGL context, so the haunted maze cannot render. Try Chrome/Firefox with hardware acceleration enabled, or visit https://get.webgl.org to test.';
    var noGlBtn = document.getElementById('overlay-btn');
    if (noGlBtn) { noGlBtn.textContent = 'Reload'; noGlBtn.onclick = function () { window.location.reload(); }; }
    document.getElementById('overlay').classList.remove('hidden');
    return;
  }
  var mm = document.getElementById('minimap').getContext('2d');

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER,
    'precision mediump float;' +
    'attribute vec3 aPos; attribute vec3 aCol;' +
    'uniform mat4 uMVP; uniform mat4 uMV;' +
    'varying vec3 vC; varying float vD;' +
    'void main(){ vec4 mv = uMV * vec4(aPos,1.0); gl_Position = uMVP * vec4(aPos,1.0); vC = aCol; vD = -mv.z; }'));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER,
    'precision mediump float;' +
    'varying vec3 vC; varying float vD;' +
    'uniform vec3 uFog; uniform vec2 uFogR; uniform float uAlpha;' +
    'void main(){' +
    ' vec3 color = vC;' +
    ' float f = smoothstep(uFogR.x, uFogR.y, vD);' +
    ' gl_FragColor = vec4(mix(color, uFog, f), uAlpha); }'));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  var uMVP = gl.getUniformLocation(prog, 'uMVP');
  var uMV = gl.getUniformLocation(prog, 'uMV');
  var uFog = gl.getUniformLocation(prog, 'uFog');
  var uFogR = gl.getUniformLocation(prog, 'uFogR');
  var uAlpha = gl.getUniformLocation(prog, 'uAlpha');

  var FOG = [0.05, 0.02, 0.10], FOGR = [5, 26];
  var G = null;

  function walkable(x, z) {
    x = Math.floor(x); z = Math.floor(z);
    return !!G.maze.cells[S.key(x, z)];
  }
  function solidAt(x, z) { return !walkable(x, z); }

  function newGame(seed, level) {
    var maze = S.carveDFS(15, 15, seed);
    var rng = new S.SeededRNG(seed ^ 0x9e37);
    G = {
      maze: maze, seed: seed, level: level || 1,
      score: (G && G.score) || 0,
      px: 1.5, pz: 1.5, yaw: Math.PI * 0.25, pitch: 0,
      spooks: [], parts: [], wisps: [],
      candies: [], state: 'title', time: 0
    };
    var placed = 0, guard = 0;
    while (placed < 10 && guard++ < 400) {
      var cx = 1 + rng.nextInt(maze.w - 2), cz = 1 + rng.nextInt(maze.d - 2);
      if (!walkable(cx, cz)) continue;
      if (Math.abs(cx - 1) + Math.abs(cz - 1) < 4) continue;
      var dup = false, i;
      for (i = 0; i < G.candies.length; i++) {
        if (G.candies[i].x === cx && G.candies[i].z === cz) { dup = true; break; }
      }
      if (dup) continue;
      var cols = [[1, 0.55, 0.2], [1, 0.85, 0.3], [1, 0.35, 0.65], [0.45, 0.9, 1]];
      G.candies.push({ x: cx, z: cz, col: cols[placed % cols.length], got: false });
      placed++;
    }
    G.mesh = buildMazeMesh();
    G.decor = buildDecorMesh(rng, maze);
    spawnSpooks(rng, maze);
    var wi = 0, wguard = 0;
    while (wi < 6 && wguard++ < 200) {
      var wx = 1 + rng.nextInt(maze.w - 2), wz = 1 + rng.nextInt(maze.d - 2);
      if (!walkable(wx, wz)) continue;
      G.wisps.push({ x: wx + 0.5, y: 1 + Math.random() * 1.2, z: wz + 0.5, phase: Math.random() * 6.28 });
      wi++;
    }
    renderHUD();
  }

  function quad(P, C, ax, ay, az, bx, by, bz, cx2, cy2, cz2, dx, dy, dz, r, g, b, shade) {
    var vs = [[ax, ay, az], [bx, by, bz], [cx2, cy2, cz2], [dx, dy, dz]];
    var idx = [0, 1, 2, 0, 2, 3];
    for (var i = 0; i < 6; i++) {
      var v = vs[idx[i]];
      P.push(v[0], v[1], v[2]);
      C.push(Math.min(1.5, r * shade), Math.min(1.5, g * shade), Math.min(1.5, b * shade));
    }
  }
  function box(P, C, cx, cy, cz, sx, sy, sz, r, g, b) {
    var x0 = cx - sx, x1 = cx + sx, y0 = cy - sy, y1 = cy + sy, z0 = cz - sz, z1 = cz + sz;
    quad(P, C, x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1, r, g, b, 0.45); // floor-ish
    quad(P, C, x0, y1, z0, x0, y1, z1, x1, y1, z1, x1, y1, z0, r, g, b, 1.0); // top
    quad(P, C, x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0, r, g, b, 0.7);
    quad(P, C, x1, y0, z0, x1, y1, z0, x1, y1, z1, x1, y1, z1, r, g, b, 0.7);
    quad(P, C, x0, y0, z0, x0, y1, z0, x1, y1, z0, x1, y0, z0, r, g, b, 0.85);
    quad(P, C, x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1, r, g, b, 0.85);
  }
  function buildMazeMesh() {
    var P = [], C = [];
    var x, z;
    for (x = 0; x < G.maze.w; x++) for (z = 0; z < G.maze.d; z++) {
      if (!walkable(x, z)) continue;
      quad(P, C, x, 0, z, x + 1, 0, z, x + 1, 0, z + 1, x, 0, z + 1, 0.13, 0.08, 0.2, 1.0);
    }
    for (x = -1; x <= G.maze.w; x++) for (z = -1; z <= G.maze.d; z++) {
      if (walkable(x, z)) continue;
      box(P, C, x + 0.5, WALL_H / 2, z + 0.5, 0.5, WALL_H / 2, 0.5, 0.30, 0.16, 0.48);
    }
    return { n: P.length / 3, pos: buf(P, 3, 'aPos'), col: buf(C, 3, 'aCol') };
  }
  function buf(data, size, name) {
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return { b: b, loc: gl.getAttribLocation(prog, name), size: size };
  }
  function dynBuf() { return { p: gl.createBuffer(), c: gl.createBuffer() }; }
  var dynP = dynBuf();
  function drawStatic(m) {
    bindBuf(m.pos); bindBuf(m.col);
    gl.drawArrays(gl.TRIANGLES, 0, m.n);
  }
  function bindBuf(w) {
    gl.bindBuffer(gl.ARRAY_BUFFER, w.b);
    if (w.loc < 0) return;
    gl.enableVertexAttribArray(w.loc);
    gl.vertexAttribPointer(w.loc, w.size, gl.FLOAT, false, 0, 0);
  }
  function drawDyn(P, C) {
    if (!P.length) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, dynP.p);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(P), gl.DYNAMIC_DRAW);
    var lP = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(lP);
    gl.vertexAttribPointer(lP, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, dynP.c);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(C), gl.DYNAMIC_DRAW);
    var lC = gl.getAttribLocation(prog, 'aCol');
    gl.enableVertexAttribArray(lC);
    gl.vertexAttribPointer(lC, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, P.length / 3);
  }

  function eyePos() { return [G.px, EYE, G.pz]; }
  function lookDir() {
    var cp = Math.cos(G.pitch);
    return [Math.sin(G.yaw) * cp, Math.sin(G.pitch), -Math.cos(G.yaw) * cp];
  }
  function render(now) {
    gl.clearColor(FOG[0], FOG[1], FOG[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    var e = eyePos(), d = lookDir();
    var V = S.mLookAt(e[0], e[1], e[2], e[0] + d[0], e[1] + d[1], e[2] + d[2], 0, 1, 0);
    var mvp = S.mMul(S.mPerspective(Math.PI / 2.6, canvas.width / canvas.height, 0.05, 120), V);
    gl.uniformMatrix4fv(uMVP, false, new Float32Array(mvp));
    gl.uniformMatrix4fv(uMV, false, new Float32Array(V));
    gl.uniform3fv(uFog, new Float32Array(FOG));
    gl.uniform2fv(uFogR, new Float32Array(FOGR));
    gl.uniform1f(uAlpha, 1);
    drawStatic(G.mesh);
    if (G.decor && G.decor.n) drawStatic(G.decor);
    var P = [], C = [], i;
    var t = now / 1000;
    for (i = 0; i < G.candies.length; i++) {
      var cd = G.candies[i];
      if (cd.got) continue;
      gemModel(P, C, cd.x + 0.5, 0.55 + 0.15 * Math.sin(t * 3 + i * 1.7), cd.z + 0.5, 0.16, cd.col, t, i);
    }
    for (i = 0; i < G.spooks.length; i++) {
      var sp = G.spooks[i];
      var gy = 1.15 + 0.12 * Math.sin(t * 2.2 + sp.phase);
      var face = Math.atan2(G.px - sp.x, -(G.pz - sp.z));
      var ti;
      for (ti = 0; ti < sp.trail.length; ti++) {
        var tp = sp.trail[ti], tk = (ti + 1) / sp.trail.length;
        sphere(P, C, tp[0], gy - 0.1, tp[1], 0.13 * tk * sp.size, 0.2 * tk * sp.size, 0.1 * tk * sp.size,
          4, 6, sp.col[0] * tk * 0.7, sp.col[1] * tk * 0.7, sp.col[2] * tk * 0.7);
      }
      ghostModel(P, C, sp.x, gy - 0.1, sp.z, face, sp.size, sp.col, t, sp.phase);
    }
    for (i = 0; i < G.wisps.length; i++) {
      var w = G.wisps[i];
      sphere(P, C, w.x + 0.4 * Math.sin(t * 0.7 + w.phase), w.y + 0.25 * Math.sin(t + w.phase * 2), w.z + 0.4 * Math.cos(t * 0.5 + w.phase),
        0.07, 0.07, 0.07, 4, 6, 0.5, 0.95, 1.0);
    }
    for (i = 0; i < G.parts.length; i++) {
      var pt = G.parts[i], ps = 0.06 * Math.max(0.2, pt.life / pt.max);
      octa(P, C, pt.x, pt.y, pt.z, ps, pt.col[0], pt.col[1], pt.col[2], 0);
    }
    drawDyn(P, C);
    drawMinimap();
  }
  function drawMinimap() {
    var s = 132, n = G.maze.w, k = s / n, x, z;
    mm.fillStyle = '#0b0620'; mm.fillRect(0, 0, s, s);
    mm.fillStyle = '#3b2b63';
    for (x = 0; x < n; x++) for (z = 0; z < G.maze.d; z++) {
      if (!walkable(x, z)) mm.fillRect(x * k, z * k, k, k);
    }
    mm.fillStyle = '#ffd166';
    for (var i = 0; i < G.candies.length; i++) {
      if (!G.candies[i].got) mm.fillRect(G.candies[i].x * k + 1, G.candies[i].z * k + 1, 2, 2);
    }
    var dotCols = ['#ffffff', '#c77dff', '#80ffaa'];
    for (var gi = 0; gi < G.spooks.length; gi++) {
      mm.fillStyle = dotCols[gi % dotCols.length];
      mm.beginPath(); mm.arc(G.spooks[gi].x / n * s, G.spooks[gi].z / G.maze.d * s, 3, 0, 7); mm.fill();
    }
    mm.fillStyle = '#ff7518';
    mm.beginPath(); mm.arc(G.px / n * s, G.pz / G.maze.d * s, 3, 0, 7); mm.fill();
  }

  function update(dt) {
    if (G.state !== 'play') return;
    var sp = 4.2 * dt;
    var fw = ((keys.w || keys.arrowup) ? 1 : 0) - ((keys.s || keys.arrowdown) ? 1 : 0) + joy.y;
    var st = ((keys.d ? 1 : 0) - (keys.a ? 1 : 0)) + joy.x;
    if (keys.arrowleft) G.yaw += 2.4 * dt;
    if (keys.arrowright) G.yaw -= 2.4 * dt;
    var sy = Math.sin(G.yaw), cy = Math.cos(G.yaw);
    var mx = (sy * fw + cy * st) * sp, mz = (-cy * fw + sy * st) * sp;
    tryMove(G.px + mx, G.pz);
    tryMove(G.px, G.pz + mz);
    var i;
    for (i = 0; i < G.candies.length; i++) {
      var cd = G.candies[i];
      if (!cd.got && Math.abs(G.px - (cd.x + 0.5)) < 0.45 && Math.abs(G.pz - (cd.z + 0.5)) < 0.45) {
        cd.got = true;
        G.score += 10 * G.level;
        spawnBurst(cd.x + 0.5, 0.6, cd.z + 0.5, cd.col, 14, 2.5);
        renderHUD();
      }
    }
    var left = 0;
    for (i = 0; i < G.candies.length; i++) if (!G.candies[i].got) left++;
    if (left === 0) {
      G.state = 'win'; saveBest();
      showOverlay('🎃 Haunt cleared!', 'Score ' + S.compact(G.score) + ' · descent to level ' + (G.level + 1), 'Descend 👻', null);
      return;
    }
    updateParts(dt);
    var si;
    for (si = 0; si < G.spooks.length; si++) {
      var sp = G.spooks[si];
      updateSpook(sp, dt);
      if (Math.hypot(G.px - sp.x, G.pz - sp.z) < 0.55) {
        G.state = 'dead'; saveBest();
        spawnBurst(G.px, 1.2, G.pz, [1, 1, 1], 30, 4);
        showOverlay('👻 Caught by ' + sp.name + '!', 'Score ' + S.compact(G.score) + ' · Level ' + G.level + ' · Best ' + S.compact(best()), 'Try again', null);
        return;
      }
    }
  }
  function tryMove(nx, nz) {
    var r = 0.32;
    if (!hitWall(nx - r, G.pz - r) && !hitWall(nx + r, G.pz - r) && !hitWall(nx - r, G.pz + r) && !hitWall(nx + r, G.pz + r)) G.px = nx;
    if (!hitWall(G.px - r, nz - r) && !hitWall(G.px + r, nz - r) && !hitWall(G.px - r, nz + r) && !hitWall(G.px + r, nz + r)) G.pz = nz;
    G.px = Math.max(0.4, Math.min(G.maze.w - 0.4, G.px));
    G.pz = Math.max(0.4, Math.min(G.maze.d - 0.4, G.pz));
  }
  function hitWall(x, z) { return !walkable(x, z); }

  var overlay = document.getElementById('overlay');
  function hud(id) { return document.getElementById(id); }
  function best() {
    try { return +localStorage.getItem('spooky_best_ghost3d') || 0; } catch (e) { return 0; }
  }
  function saveBest() {
    if (G.score > best()) {
      try { localStorage.setItem('spooky_best_ghost3d', String(G.score)); } catch (e) {}
    }
  }
  function renderHUD() {
    var left = 0, i;
    for (i = 0; i < G.candies.length; i++) if (!G.candies[i].got) left++;
    hud('score').textContent = S.compact(G.score);
    hud('candy').textContent = left;
    hud('level').textContent = G.level;
    hud('seed').textContent = G.seed;
  }
  function showOverlay(t, txt, btn, btn2) {
    hud('overlay-title').textContent = t; hud('overlay-text').textContent = txt;
    var b1 = hud('overlay-btn'), b2 = hud('overlay-btn2');
    b1.textContent = btn;
    b1.onclick = function () {
      hideOverlay();
      if (G.state === 'win') { newGame((Math.random() * 1e9) | 0, G.level + 1); }
      else if (G.state === 'dead' || G.state === 'title') { newGame((Math.random() * 1e9) | 0, 1); G.score = 0; }
      G.state = 'play';
      renderHUD();
    };
    if (btn2) { b2.style.display = ''; b2.textContent = btn2; }
    else b2.style.display = 'none';
    overlay.classList.remove('hidden');
  }
  function hideOverlay() { overlay.classList.add('hidden'); }

  var keys = {};
  document.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    keys[k] = true;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) >= 0) e.preventDefault();
    if (k === 'enter' && !overlay.classList.contains('hidden')) hud('overlay-btn').click();
  });
  document.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  var drag = null;
  canvas.addEventListener('mousedown', function (e) { drag = [e.clientX, e.clientY]; });
  document.addEventListener('mousemove', function (e) {
    if (!drag) return;
    G.yaw -= (e.clientX - drag[0]) * 0.004;
    G.pitch = Math.max(-3.1, Math.min(3.1, G.pitch - (e.clientY - drag[1]) * 0.003));
    drag = [e.clientX, e.clientY];
  });
  document.addEventListener('mouseup', function () { drag = null; });
  var stickId = null, lookId = null, stickC = null, lastT = null, joy = { x: 0, y: 0 };
  var stick = document.getElementById('stick'), nub = document.getElementById('nub');
  if ('ontouchstart' in window && stick) stick.style.display = 'block';
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
        G.pitch = Math.max(-3.1, Math.min(3.1, G.pitch - (t.clientY - lastT[1]) * 0.004));
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
  document.getElementById('newmaze').addEventListener('click', function () {
    newGame((Math.random() * 1e9) | 0, 1); G.score = 0; G.state = 'play'; hideOverlay(); renderHUD();
  });

  var last = 0;
  function loop(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    G.time += dt;
    update(dt);
    if (G.mesh) render(ts);
    requestAnimationFrame(loop);
  }

  /* ===== Smooth (non-boxy) mesh factory: spheres, cylinders, gems.
   * The shader is unlit vertex-color, so roundness comes from geometry
   * plus top-lit shading baked per face. No textures, no new GL state. */
  function tri(P, C, ax, ay, az, bx, by, bz, cx, cy, cz, r, g, b) {
    P.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    var cr = Math.min(1.5, r), cg = Math.min(1.5, g), cb = Math.min(1.5, b);
    C.push(cr, cg, cb, cr, cg, cb, cr, cg, cb);
  }
  function quadV(P, C, v0, v1, v2, v3, r, g, b) {
    var cr = Math.min(1.5, r), cg = Math.min(1.5, g), cb = Math.min(1.5, b);
    var vs = [v0, v1, v2, v3], idx = [0, 1, 2, 0, 2, 3];
    for (var i = 0; i < 6; i++) {
      var v = vs[idx[i]];
      P.push(v[0], v[1], v[2]); C.push(cr, cg, cb);
    }
  }
  function sphere(P, C, cx, cy, cz, rx, ry, rz, lat, lon, r, g, b, rib, ribF) {
    rib = rib || 0; ribF = ribF || 10;
    function P3(la, lo) {
      var k = 1 + rib * Math.cos(la * ribF), s = Math.sin(lo);
      return [cx + rx * k * Math.cos(la) * s, cy + ry * Math.cos(lo), cz + rz * k * Math.sin(la) * s];
    }
    for (var j = 0; j < lat; j++) {
      var lo0 = Math.PI * j / lat, lo1 = Math.PI * (j + 1) / lat;
      var sh = 0.70 + 0.42 * Math.cos((lo0 + lo1) / 2);
      for (var i = 0; i < lon; i++) {
        var la0 = 2 * Math.PI * i / lon, la1 = 2 * Math.PI * (i + 1) / lon;
        quadV(P, C, P3(la0, lo0), P3(la1, lo0), P3(la1, lo1), P3(la0, lo1), r * sh, g * sh, b * sh);
      }
    }
  }
  function cylinder(P, C, cx, y0, cz, rTop, rBot, h, seg, r, g, b) {
    var i, a0, a1;
    for (i = 0; i < seg; i++) {
      a0 = 2 * Math.PI * i / seg; a1 = 2 * Math.PI * (i + 1) / seg;
      var sh = 0.72 + 0.28 * Math.cos((a0 + a1) / 2);
      quadV(P, C,
        [cx + rBot * Math.cos(a0), y0, cz + rBot * Math.sin(a0)],
        [cx + rBot * Math.cos(a1), y0, cz + rBot * Math.sin(a1)],
        [cx + rTop * Math.cos(a1), y0 + h, cz + rTop * Math.sin(a1)],
        [cx + rTop * Math.cos(a0), y0 + h, cz + rTop * Math.sin(a0)],
        r * sh, g * sh, b * sh);
    }
    for (i = 0; i < seg; i++) {
      a0 = 2 * Math.PI * i / seg; a1 = 2 * Math.PI * (i + 1) / seg;
      tri(P, C, cx, y0 + h, cz,
        cx + rTop * Math.cos(a0), y0 + h, cz + rTop * Math.sin(a0),
        cx + rTop * Math.cos(a1), y0 + h, cz + rTop * Math.sin(a1),
        r, g, b);
    }
  }
  function octa(P, C, cx, cy, cz, s, r, g, b, pulse) {
    pulse = pulse || 0;
    var top = [cx, cy + s, cz], bot = [cx, cy - s, cz];
    var eq = [[cx + s, cy, cz], [cx, cy, cz + s], [cx - s, cy, cz], [cx, cy, cz - s]];
    for (var i = 0; i < 4; i++) {
      var sh = 0.85 + 0.3 * Math.abs(Math.sin(pulse + i * 1.3));
      tri(P, C, top[0], top[1], top[2], eq[i][0], eq[i][1], eq[i][2], eq[(i + 1) % 4][0], eq[(i + 1) % 4][1], eq[(i + 1) % 4][2], r * sh, g * sh, b * sh);
      tri(P, C, bot[0], bot[1], bot[2], eq[(i + 1) % 4][0], eq[(i + 1) % 4][1], eq[(i + 1) % 4][2], eq[i][0], eq[i][1], eq[i][2], r * sh * 0.8, g * sh * 0.8, b * sh * 0.8);
    }
  }
  /* Spectral ghost: round body + head, wavy hem blobs, inset dark eyes. */
  function ghostModel(P, C, x, y, z, face, size, col, t, phase) {
    var s = size;
    sphere(P, C, x, y + 0.05 * s, z, 0.30 * s, 0.55 * s, 0.22 * s, 6, 10, col[0], col[1], col[2]);
    sphere(P, C, x, y + 0.62 * s, z, 0.26 * s, 0.26 * s, 0.24 * s, 6, 10,
      Math.min(1.5, col[0] * 1.06), Math.min(1.5, col[1] * 1.06), Math.min(1.5, col[2] * 1.06));
    var i, a;
    for (i = 0; i < 3; i++) {
      a = phase + i * 2.094 + t * 2.5;
      sphere(P, C, x + Math.cos(a) * 0.20 * s, y - 0.42 * s + 0.05 * s * Math.sin(t * 4 + phase + i),
        z + Math.sin(a) * 0.16 * s, 0.11 * s, 0.13 * s, 0.10 * s, 4, 6, col[0], col[1], col[2]);
    }
    var fx = Math.sin(face), fz = -Math.cos(face);
    var rx = -fz, rz = fx;
    for (i = -1; i <= 1; i += 2) {
      sphere(P, C, x + fx * 0.19 * s + rx * 0.09 * s * i, y + 0.66 * s, z + fz * 0.19 * s + rz * 0.09 * s * i,
        0.045 * s, 0.06 * s, 0.045 * s, 3, 5, 0.06, 0.04, 0.10);
    }
    sphere(P, C, x + fx * 0.20 * s, y + 0.52 * s, z + fz * 0.20 * s,
      0.05 * s, 0.035 * s, 0.04 * s, 3, 5, 0.06, 0.04, 0.10);
  }
  /* Candy as a faceted gem: bright core + colored shell, gently pulsing. */
  function gemModel(P, C, x, y, z, s, col, t, i) {
    var pulse = t * 3 + i * 1.7, sc = s * (1 + 0.12 * Math.sin(pulse));
    octa(P, C, x, y, z, sc, col[0], col[1], col[2], pulse);
    octa(P, C, x, y, z, sc * 0.55,
      Math.min(1.5, col[0] * 1.4 + 0.25), Math.min(1.5, col[1] * 1.4 + 0.25), Math.min(1.5, col[2] * 1.4 + 0.25), -pulse);
  }
  /* Pumpkin: ribbed sphere, stem, glowing eyes. */
  function pumpkinModel(P, C, x, y, z, s, t, phase) {
    sphere(P, C, x, y, z, s, s * 0.82, s, 7, 14, 0.95, 0.45, 0.10, 0.07, 10);
    cylinder(P, C, x, y + s * 0.78, z, 0.05 * s, 0.09 * s, 0.3 * s, 6, 0.32, 0.22, 0.1);
    var fl = 0.85 + 0.15 * Math.sin(t * 5 + phase);
    sphere(P, C, x - 0.32 * s, y + 0.12 * s, z - 0.78 * s, 0.11 * s, 0.14 * s, 0.06 * s, 3, 5, 1.3 * fl, 0.85 * fl, 0.25 * fl);
    sphere(P, C, x + 0.32 * s, y + 0.12 * s, z - 0.78 * s, 0.11 * s, 0.14 * s, 0.06 * s, 3, 5, 1.3 * fl, 0.85 * fl, 0.25 * fl);
  }
  /* Tombstone: slab + rounded cap + dark base. */
  function tombModel(P, C, x, y, z, s, tilt) {
    box(P, C, x, y + 0.1 * s, z, 0.42 * s, 0.1 * s, 0.3 * s, 0.16, 0.15, 0.2);
    var cx = x + (tilt || 0);
    box(P, C, cx, y + 0.55 * s, z, 0.3 * s, 0.45 * s, 0.12 * s, 0.42, 0.42, 0.5);
    sphere(P, C, cx, y + 1.0 * s, z, 0.3 * s, 0.18 * s, 0.12 * s, 4, 8, 0.45, 0.45, 0.53);
    box(P, C, cx, y + 0.55 * s, z - 0.13 * s, 0.16 * s, 0.22 * s, 0.01 * s, 0.2, 0.2, 0.26);
  }
  /* Static haunt decor per maze: pumpkins + tombstones on open cells. */
  function buildDecorMesh(rng, maze) {
    var P = [], C = [], placed = 0, guard = 0;
    function freeCell(margin) {
      var x = 1 + rng.nextInt(maze.w - 2), z = 1 + rng.nextInt(maze.d - 2);
      if (!walkable(x, z)) return null;
      if (Math.abs(x - 1) + Math.abs(z - 1) < (margin || 4)) return null;
      return { x: x, z: z };
    }
    while (placed < 4 && guard++ < 200) {
      var c = freeCell(4);
      if (!c) continue;
      pumpkinModel(P, C, c.x + 0.5, 0.34, c.z + 0.5, 0.34, 0, placed * 1.3);
      placed++;
    }
    placed = 0; guard = 0;
    while (placed < 5 && guard++ < 200) {
      var t2 = freeCell(3);
      if (!t2) continue;
      tombModel(P, C, t2.x + 0.5, 0, t2.z + 0.5, 0.8, (placed % 2 ? 0.06 : -0.06));
      placed++;
    }
    if (!P.length) return { n: 0 };
    return { n: P.length / 3, pos: buf(P, 3, 'aPos'), col: buf(C, 3, 'aCol') };
  }
  /* Particles: bursts that fly, fade by shrinking, then vanish. */
  function spawnBurst(x, y, z, col, n, spd) {
    n = n || 14; spd = spd || 2.5;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      G.parts.push({ x: x, y: y, z: z,
        vx: Math.cos(a) * spd * (0.4 + Math.random() * 0.8), vy: 1 + Math.random() * spd, vz: Math.sin(a) * spd * (0.4 + Math.random() * 0.8),
        life: 0.5 + Math.random() * 0.3, max: 0.8, col: col });
    }
    if (G.parts.length > 240) G.parts.splice(0, G.parts.length - 240);
  }
  function updateParts(dt) {
    for (var i = 0; i < G.parts.length; i++) {
      var p = G.parts[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.vy -= 6 * dt; p.life -= dt;
    }
    G.parts = G.parts.filter(function (p) { return p.life > 0; });
  }
  /* Three haunt AI personalities: chaser, wanderer, ambusher. */
  var SPOOK_DEFS = [
    { name: '👻 Wraith', col: [0.85, 0.95, 1.0], size: 1.0, speed: 2.4, kind: 0 },
    { name: '💜 Specter', col: [0.75, 0.55, 1.0], size: 0.85, speed: 2.0, kind: 1 },
    { name: '🌿 Phantom', col: [0.55, 1.0, 0.75], size: 1.15, speed: 2.2, kind: 2 }
  ];
  function astarTo(fx, fz, tx, tz) {
    return S.astar(Math.floor(fx), Math.floor(fz), Math.floor(tx), Math.floor(tz), function (x, z) {
      return !!G.maze.cells[S.key(x, z)];
    }, 400);
  }
  function spawnSpooks(rng, maze) {
    var corners = [[maze.w - 1.5, maze.d - 1.5], [1.5, maze.d - 1.5], [maze.w - 1.5, 1.5]];
    G.spooks = [];
    for (var i = 0; i < 3; i++) {
      var d = SPOOK_DEFS[i];
      var sx = corners[i][0], sz = corners[i][1];
      if (!walkable(sx, sz)) { sx = maze.w - 1.5; sz = maze.d - 1.5; }
      G.spooks.push({ x: sx, z: sz, path: null, thinkT: Math.random() * 0.5,
        speed: d.speed, col: d.col, size: d.size, kind: d.kind, name: d.name,
        phase: Math.random() * 6.28, trail: [], trailT: 0 });
    }
  }
  function updateSpook(sp, dt) {
    sp.thinkT -= dt; sp.phase += dt;
    if (sp.thinkT <= 0) {
      if (sp.kind === 0) {
        sp.thinkT = 0.5;
        sp.path = astarTo(sp.x, sp.z, G.px, G.pz);
      } else if (sp.kind === 1) {
        sp.thinkT = 2.5 + Math.random() * 1.5;
        var tx = 1 + Math.random() * (G.maze.w - 2), tz = 1 + Math.random() * (G.maze.d - 2);
        sp.path = astarTo(sp.x, sp.z, tx, tz);
      } else {
        sp.thinkT = 0.8;
        var sy = Math.sin(G.yaw), cy = Math.cos(G.yaw);
        var ax = Math.max(1, Math.min(G.maze.w - 2, G.px + sy * 4));
        var az = Math.max(1, Math.min(G.maze.d - 2, G.pz - cy * 4));
        sp.path = astarTo(sp.x, sp.z, ax, az);
      }
    }
    var gs = (sp.speed + G.level * 0.25) * dt;
    if (sp.path && sp.path.length > 1) {
      var nx = sp.path[1][0] + 0.5, nz = sp.path[1][1] + 0.5;
      var dx = nx - sp.x, dz = nz - sp.z, l = Math.hypot(dx, dz) || 1;
      sp.x += dx / l * Math.min(gs, l); sp.z += dz / l * Math.min(gs, l);
      if (l < 0.1) sp.path.shift();
    }
    sp.trailT -= dt;
    if (sp.trailT <= 0) {
      sp.trailT = 0.09;
      sp.trail.push([sp.x, sp.z]);
      if (sp.trail.length > 9) sp.trail.shift();
    }
  }

  // ---------- boot ----------
  newGame((Math.random() * 1e9) | 0, 1);
  showOverlay('👻 Haunted Maze 3D', 'WASD/arrows + drag to walk the halls. Grab all 🍬, dodge the 👻. Arrow ←/→ also turns.', 'Enter the haunt', null);
  requestAnimationFrame(loop);
})();
