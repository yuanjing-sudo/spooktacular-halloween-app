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
      gx: maze.w - 1.5, gz: maze.d - 1.5,
      path: null, thinkT: 0,
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
    var P = [], C = [], i;
    var t = now / 1000;
    for (i = 0; i < G.candies.length; i++) {
      var cd = G.candies[i];
      if (cd.got) continue;
      var bob = 0.55 + 0.15 * Math.sin(t * 3 + i * 1.7);
      box(P, C, cd.x + 0.5, bob, cd.z + 0.5, 0.14, 0.14, 0.14, cd.col[0], cd.col[1], cd.col[2]);
    }
    var gy = 1.15 + 0.12 * Math.sin(t * 2.2);
    box(P, C, G.gx, gy - 0.1, G.gz, 0.3, 0.45, 0.16, 0.92, 0.95, 1.0);
    box(P, C, G.gx, gy + 0.45, G.gz, 0.24, 0.24, 0.2, 0.95, 0.97, 1.0);
    box(P, C, G.gx - 0.1, gy + 0.48, G.gz - 0.19, 0.05, 0.07, 0.02, 0.08, 0.05, 0.12);
    box(P, C, G.gx + 0.1, gy + 0.48, G.gz - 0.19, 0.05, 0.07, 0.02, 0.08, 0.05, 0.12);
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
    mm.fillStyle = '#fff';
    mm.beginPath(); mm.arc(G.gx / n * s, G.gz / G.maze.d * s, 3, 0, 7); mm.fill();
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
    G.thinkT -= dt;
    if (G.thinkT <= 0) {
      G.thinkT = 0.5;
      G.path = S.astar(Math.floor(G.gx), Math.floor(G.gz), Math.floor(G.px), Math.floor(G.pz), function (x, z) {
        return !!G.maze.cells[S.key(x, z)];
      }, 400);
    }
    var gs = (2.4 + G.level * 0.25) * dt;
    if (G.path && G.path.length > 1) {
      var nx = G.path[1][0] + 0.5, nz = G.path[1][1] + 0.5;
      var dx = nx - G.gx, dz = nz - G.gz, l = Math.hypot(dx, dz) || 1;
      G.gx += dx / l * Math.min(gs, l); G.gz += dz / l * Math.min(gs, l);
      if (l < 0.1) G.path.shift();
    }
    if (Math.hypot(G.px - G.gx, G.pz - G.gz) < 0.55) {
      G.state = 'dead'; saveBest();
      showOverlay('👻 Caught!', 'Score ' + S.compact(G.score) + ' · Level ' + G.level + ' · Best ' + S.compact(best()), 'Try again', null);
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

  // ---------- boot ----------
  newGame((Math.random() * 1e9) | 0, 1);
  showOverlay('👻 Haunted Maze 3D', 'WASD/arrows + drag to walk the halls. Grab all 🍬, dodge the 👻. Arrow ←/→ also turns.', 'Enter the haunt', null);
  requestAnimationFrame(loop);
})();
