/* Spooktacular Maze Hunt — renderer + input + game loop (browser only).
 * Uses Spooky.* pure logic from spooky.js. Canvas 2D, keyboard + swipe. */
(function () {
  'use strict';
  var S = window.Spooky;
  var TILE = 26;
  var DEPTHS = [
    { size: 15, candies: 8, crystals: 2, ghostSpeed: 5.2, ghostThink: 0.55 },
    { size: 19, candies: 12, crystals: 3, ghostSpeed: 5.8, ghostThink: 0.45 },
    { size: 23, candies: 16, crystals: 4, ghostSpeed: 6.4, ghostThink: 0.35 }
  ];
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var hud = {
    score: document.getElementById('score'), depth: document.getElementById('depth'),
    candy: document.getElementById('candy'), combo: document.getElementById('combo'),
    seed: document.getElementById('seed')
  };
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlay-title');
  var overlayText = document.getElementById('overlay-text');
  var overlayBtn = document.getElementById('overlay-btn');

  var G = null;

  function newGame(seed) {
    G = {
      seed: seed, depth: 0, score: 0, combo: 0, streak: 0,
      state: 'title', // title | play | win | dead | clear
      player: { x: 1, y: 1, px: 1, py: 1, t: 1, dir: [0, 0] },
      ghost: { x: 1, y: 1, px: 1, py: 1, t: 1, path: [], think: 0 },
      candies: [], crystals: [], maze: null, rng: null, time: 0
    };
    loadDepth(0);
  }

  function loadDepth(d) {
    var cfg = DEPTHS[d];
    var rng = new S.SeededRNG(G.seed + d * 7919);
    var maze = S.carveDFS(cfg.size, cfg.size, G.seed + d * 7919);
    // open cells on odd coords are rooms; exits at far corner
    var rooms = [];
    for (var k in maze.cells) {
      var p = k.split(',');
      if (+p[0] % 2 === 1 && +p[1] % 2 === 1 && !(+p[0] === 1 && +p[1] === 1)) rooms.push([+p[0], +p[1]]);
    }
    // deterministic shuffle with our RNG
    for (var i = rooms.length - 1; i > 0; i--) {
      var j = rng.nextInt(i + 1), tmp = rooms[i]; rooms[i] = rooms[j]; rooms[j] = tmp;
    }
    G.maze = maze; G.rng = rng; G.depth = d;
    G.candies = rooms.slice(0, cfg.candies).map(function (r) { return { x: r[0], y: r[1] }; });
    G.crystals = rooms.slice(cfg.candies, cfg.candies + cfg.crystals).map(function (r) { return { x: r[0], y: r[1] }; });
    var gx = 1, gz = 1, best = -1;
    rooms.forEach(function (r) {
      var dist = Math.abs(r[0] - 1) + Math.abs(r[1] - 1);
      if (dist > best) { best = dist; gx = r[0]; gz = r[1]; }
    });
    G.player = { x: 1, y: 1, px: 1, py: 1, t: 1, dir: [0, 0] };
    G.ghost = { x: gx, y: gz, px: gx, py: gz, t: 1, path: [], think: 0 };
    canvas.width = maze.w * TILE; canvas.height = maze.d * TILE;
  }

  function walkable(x, z) { return !!G.maze.cells[S.key(x, z)]; }

  function tryMove(dx, dz) {
    if (G.state !== 'play') return;
    var p = G.player;
    if (p.t < 1) return; // mid-step
    var nx = p.x + dx, nz = p.y + dz;
    if (!walkable(nx, nz)) return;
    p.px = p.x; p.py = p.y; p.x = nx; p.y = nz; p.t = 0; p.dir = [dx, dz];
  }

  function update(dt) {
    if (G.state !== 'play') return;
    G.time += dt;
    var p = G.player, g = G.ghost, cfg = DEPTHS[G.depth];
    // player interpolation with quadOut easing
    p.t = Math.min(1, p.t + dt / 0.13);
    // ghost re-paths on a timer (think budget like MazeHunter)
    g.think -= dt;
    if (g.think <= 0) {
      g.think = cfg.ghostThink;
      var path = S.astar(g.x, g.y, p.x, p.y, walkable, 600);
      g.path = path && path.length > 1 ? path.slice(1) : [];
    }
    // ghost steps along path
    g.t = Math.min(1, g.t + dt * cfg.ghostSpeed / 4);
    if (g.t >= 1 && g.path.length) {
      var n = g.path.shift();
      if (walkable(n[0], n[1]) || (n[0] === p.x && n[1] === p.y)) {
        g.px = g.x; g.py = g.y; g.x = n[0]; g.y = n[1]; g.t = 0;
      } else g.path = [];
    }
    // pickups
    for (var i = G.candies.length - 1; i >= 0; i--) {
      var c = G.candies[i];
      if (c.x === p.x && c.y === p.y) {
        G.candies.splice(i, 1);
        G.combo++; G.streak++;
        G.score += Math.round(10 * S.comboMult(G.combo)) + S.streakBonus(G.streak);
      }
    }
    for (var j = G.crystals.length - 1; j >= 0; j--) {
      var r = G.crystals[j];
      if (r.x === p.x && r.y === p.y) {
        G.crystals.splice(j, 1);
        G.combo += 2;
        G.score += Math.round(50 * S.comboMult(G.combo));
      }
    }
    // caught?
    if (g.x === p.x && g.y === p.y) return die();
    // depth clear?
    if (!G.candies.length && !G.crystals.length) {
      if (G.depth >= DEPTHS.length - 1) return win();
      G.score += 250 * (G.depth + 1);
      loadDepth(G.depth + 1);
      flash('Depth ' + (G.depth + 1) + ' — the ghost is faster!');
    }
    renderHUD();
  }

  var flashMsg = '', flashT = 0;
  function flash(m) { flashMsg = m; flashT = 2.2; }

  function die() {
    G.state = 'dead'; G.combo = 0;
    showOverlay('☠️ Caught!', 'The ghost got you on depth ' + (G.depth + 1) +
      ' with ' + S.compact(G.score) + ' points. Seed was ' + G.seed + '.', 'Try again');
  }
  function win() {
    G.state = 'win';
    G.score += 1000;
    showOverlay('🎃 Spooktacular!', 'You cleared all 3 depths with ' +
      S.compact(G.score) + ' points! Seed was ' + G.seed + '.', 'Play again');
    renderHUD();
  }
  function showOverlay(t, txt, btn) {
    overlayTitle.textContent = t; overlayText.textContent = txt; overlayBtn.textContent = btn;
    overlay.classList.remove('hidden');
  }
  function hideOverlay() { overlay.classList.add('hidden'); }

  function renderHUD() {
    hud.score.textContent = S.compact(G.score);
    hud.depth.textContent = (G.depth + 1) + '/3';
    hud.candy.textContent = G.candies.length + G.crystals.length;
    hud.combo.textContent = 'x' + S.comboMult(G.combo).toFixed(2);
    hud.seed.textContent = G.seed;
  }

  function draw() {
    var w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#0b0620'; ctx.fillRect(0, 0, w, h);
    if (!G) return;
    // maze
    for (var x = 0; x < G.maze.w; x++) for (var z = 0; z < G.maze.d; z++) {
      if (G.maze.cells[S.key(x, z)]) {
        ctx.fillStyle = (x + z) % 2 ? '#171033' : '#130d2b';
        ctx.fillRect(x * TILE, z * TILE, TILE, TILE);
      } else {
        var grd = ctx.createLinearGradient(x * TILE, z * TILE, x * TILE, z * TILE + TILE);
        grd.addColorStop(0, '#3b1d5e'); grd.addColorStop(1, '#241243');
        ctx.fillStyle = grd; ctx.fillRect(x * TILE, z * TILE, TILE, TILE);
      }
    }
    function interp(e) {
      var t = S.ease('quadOut', e.t);
      return [(e.px + (e.x - e.px) * t) * TILE + TILE / 2, (e.py + (e.y - e.py) * t) * TILE + TILE / 2];
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // pickups with sine bob
    var bob = Math.sin(G.time * 4) * 2;
    ctx.font = '15px serif';
    G.candies.forEach(function (c) { ctx.fillText('🍬', c.x * TILE + TILE / 2, c.y * TILE + TILE / 2 + bob); });
    ctx.font = '17px serif';
    G.crystals.forEach(function (c) { ctx.fillText('💎', c.x * TILE + TILE / 2, c.y * TILE + TILE / 2 - bob); });
    // ghost
    var g = interp(G.ghost);
    ctx.font = '20px serif';
    ctx.fillText('👻', g[0], g[1]);
    // player pumpkin
    var q = interp(G.player);
    ctx.font = '20px serif';
    ctx.fillText('🎃', q[0], q[1]);
    // flash message
    if (flashT > 0) {
      ctx.fillStyle = '#ffd166'; ctx.font = 'bold 18px sans-serif';
      ctx.fillText(flashMsg, w / 2, 24);
    }
  }

  var last = 0;
  function loop(ts) {
    var dt = Math.min(0.1, (ts - last) / 1000 || 0);
    last = ts;
    if (flashT > 0) flashT -= dt;
    update(dt); draw();
    requestAnimationFrame(loop);
  }

  // input
  var DIRS = { ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0] };
  document.addEventListener('keydown', function (e) {
    if (DIRS[e.key]) { e.preventDefault(); tryMove(DIRS[e.key][0], DIRS[e.key][1]); }
    if (e.key === 'Enter' && !overlay.classList.contains('hidden')) overlayBtn.click();
  });
  var touch = null;
  canvas.addEventListener('touchstart', function (e) { touch = [e.touches[0].clientX, e.touches[0].clientY]; }, { passive: true });
  canvas.addEventListener('touchmove', function (e) {
    if (!touch) return;
    e.preventDefault();
    var dx = e.touches[0].clientX - touch[0], dy = e.touches[0].clientY - touch[1];
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) tryMove(dx > 0 ? 1 : -1, 0); else tryMove(0, dy > 0 ? 1 : -1);
    touch = [e.touches[0].clientX, e.touches[0].clientY];
  }, { passive: false });

  overlayBtn.addEventListener('click', function () {
    hideOverlay();
    if (G.state === 'title') { G.state = 'play'; }
    else newGame((Math.random() * 1e9) | 0), G.state = 'play';
    renderHUD();
  });
  document.getElementById('newmaze').addEventListener('click', function () {
    newGame((Math.random() * 1e9) | 0); G.state = 'play'; hideOverlay(); renderHUD();
  });

  // boot
  newGame(20261031);
  G.state = 'title';
  renderHUD();
  showOverlay('🎃 Spooktacular Maze Hunt',
    'Grab every 🍬 and 💎 across 3 depths. The 👻 hunts you with real A*. Arrows / WASD / swipe to move.',
    'Start haunting');
  requestAnimationFrame(loop);
})();
