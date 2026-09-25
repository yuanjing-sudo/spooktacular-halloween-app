/* Spooktacular Ultimate Web — maze hunt + tycoon meta-loop (browser only).
 * Systems/data ported from the Swift app: MNPickTier (names/costs/speeds),
 * MNDepthLayer titles, MNRelic catalog (12), MNFish catalog (14), XP curve. */
(function () {
  'use strict';
  var S = window.Spooky;
  var TILE = 26;
  var DEPTHS = [
    { layer: 'Dirt Tunnels', size: 15, candies: 8, crystals: 2, ghostSpeed: 5.2, ghostThink: 0.55 },
    { layer: 'Crystal Hollows', size: 19, candies: 12, crystals: 3, ghostSpeed: 5.8, ghostThink: 0.45 },
    { layer: 'Magma Core', size: 23, candies: 16, crystals: 4, ghostSpeed: 6.4, ghostThink: 0.35 }
  ];
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var hud = {
    score: document.getElementById('score'), depth: document.getElementById('depth'),
    candy: document.getElementById('candy'), combo: document.getElementById('combo'),
    seed: document.getElementById('seed'), gold: document.getElementById('gold'),
    level: document.getElementById('level'), pick: document.getElementById('pick')
  };
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlay-title');
  var overlayText = document.getElementById('overlay-text');
  var overlayBtn = document.getElementById('overlay-btn');
  var overlayBtn2 = document.getElementById('overlay-btn2');

  var G = null;
  function meta() { return G.meta; }
  function goldMult() { var m = 1; meta().relics.forEach(function (r) { if (r.effect === 'Gold') m += r.value; }); return m; }
  function dmgMult() { var m = 1; meta().relics.forEach(function (r) { if (r.effect === 'Damage') m += r.value; }); return m; }
  function speedMult() { var m = 1; meta().relics.forEach(function (r) { if (r.effect === 'Speed') m += r.value; }); return m; }
  function packBonus() { var n = 0; meta().relics.forEach(function (r) { if (r.effect === 'Pack') n++; }); return Math.min(2, n); }
  function stepTime() { return Math.max(0.055, 0.24 / (S.PICKS[meta().pickIdx].speed * speedMult())); }
  function ach(id, name) {
    if (meta().ach[id]) return;
    meta().ach[id] = true;
    flash('🏆 ' + name, 3);
  }

  function newGame(seed) {
    var best = 0;
    try { best = +localStorage.getItem('spooky_best') || 0; } catch (e) {}
    G = {
      seed: seed, depth: 0, score: 0, combo: 0, streak: 0,
      state: 'title', tab: 0, picked: 0,
      meta: { gold: 0, coal: 0, level: 1, xp: 0, pickIdx: 0, relics: [], ach: {}, best: best },
      player: { x: 1, y: 1, px: 1, py: 1, t: 1 },
      ghost: { x: 1, y: 1, px: 1, py: 1, t: 1, path: [], think: 0 },
      candies: [], crystals: [], relicSpot: null, pond: null, pondUsed: false,
      maze: null, rng: null, time: 0
    };
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
    for (var i = rooms.length - 1; i > 0; i--) {
      var j = rng.nextInt(i + 1), tmp = rooms[i]; rooms[i] = rooms[j]; rooms[j] = tmp;
    }
    G.maze = maze; G.rng = rng; G.depth = d;
    var n = 0;
    G.candies = rooms.slice(n, n + cfg.candies).map(function (r) { return { x: r[0], y: r[1] }; }); n += cfg.candies;
    G.crystals = rooms.slice(n, n + cfg.crystals + packBonus()).map(function (r) { return { x: r[0], y: r[1] }; }); n += cfg.crystals + packBonus();
    G.relicSpot = rooms[n] ? { x: rooms[n][0], y: rooms[n][1] } : null; n++;
    G.pond = rooms[n] ? { x: rooms[n][0], y: rooms[n][1] } : null;
    G.pondUsed = false;
    var gx = 1, gz = 1, best = -1;
    rooms.forEach(function (r) {
      var dist = Math.abs(r[0] - 1) + Math.abs(r[1] - 1);
      if (dist > best) { best = dist; gx = r[0]; gz = r[1]; }
    });
    G.player = { x: 1, y: 1, px: 1, py: 1, t: 1 };
    G.ghost = { x: gx, y: gz, px: gx, py: gz, t: 1, path: [], think: 0 };
    canvas.width = maze.w * TILE; canvas.height = maze.d * TILE;
  }

  function walkable(x, z) { return !!G.maze.cells[S.key(x, z)]; }

  function tryMove(dx, dz) {
    if (G.state !== 'play') return;
    var p = G.player;
    if (p.t < 1) return;
    var nx = p.x + dx, nz = p.y + dz;
    if (!walkable(nx, nz)) return;
    p.px = p.x; p.py = p.y; p.x = nx; p.y = nz; p.t = 0;
  }

  function gainXP(n) {
    var m = meta();
    m.xp += n;
    while (m.xp >= S.xpNext(m.level)) {
      m.xp -= S.xpNext(m.level);
      m.level++;
      m.gold += 25; G.score += 100;
      flash('⬆️ Level ' + m.level + '! +25 gold', 2.2);
      if (m.level >= 5) ach('level-5', 'Living Myth — reach level 5');
    }
  }

  function fish() {
    var bag = [];
    S.FISH.forEach(function (f) {
      var w = S.FISH_WEIGHT[f.rarity];
      for (var i = 0; i < w; i++) bag.push(f);
    });
    return G.rng.pick(bag);
  }

  function update(dt) {
    if (G.state !== 'play' || G.tab !== 0) return;
    G.time += dt;
    var p = G.player, g = G.ghost, cfg = DEPTHS[G.depth], m = meta();
    p.t = Math.min(1, p.t + dt / stepTime());
    g.think -= dt;
    if (g.think <= 0) {
      g.think = cfg.ghostThink;
      var path = S.astar(g.x, g.y, p.x, p.y, walkable, 600);
      g.path = path && path.length > 1 ? path.slice(1) : [];
    }
    g.t = Math.min(1, g.t + dt * cfg.ghostSpeed / 4);
    if (g.t >= 1 && g.path.length) {
      var n = g.path.shift();
      if (walkable(n[0], n[1]) || (n[0] === p.x && n[1] === p.y)) {
        g.px = g.x; g.py = g.y; g.x = n[0]; g.y = n[1]; g.t = 0;
      } else g.path = [];
    }
    var i, c;
    for (i = G.candies.length - 1; i >= 0; i--) {
      c = G.candies[i];
      if (c.x === p.x && c.y === p.y) {
        G.candies.splice(i, 1);
        G.combo++; G.streak++; G.picked++;
        G.score += Math.round((10 * S.comboMult(G.combo) + S.streakBonus(G.streak)) * dmgMult());
        m.gold += Math.round(2 * goldMult());
        gainXP(8);
        if (G.score >= 1000) ach('score-1k', 'Score Legend — 1,000 points');
      }
    }
    for (i = G.crystals.length - 1; i >= 0; i--) {
      c = G.crystals[i];
      if (c.x === p.x && c.y === p.y) {
        G.crystals.splice(i, 1);
        G.combo += 2;
        G.score += Math.round(50 * S.comboMult(G.combo) * dmgMult());
        m.gold += Math.round(5 * goldMult());
        gainXP(20);
      }
    }
    if (G.relicSpot && p.x === G.relicSpot.x && p.y === G.relicSpot.y) {
      var owned = m.relics.map(function (r) { return r.name; });
      var pool = S.RELICS.filter(function (r) { return owned.indexOf(r.name) < 0; });
      if (pool.length) {
        var relic = G.rng.pick(pool);
        m.relics.push(relic);
        G.score += 150;
        flash('🗿 Relic: ' + relic.name + ' (' + relic.effect + ' +' + Math.round(relic.value * 100) + '%)', 3);
      }
      G.relicSpot = null;
    }
    if (G.pond && !G.pondUsed && p.x === G.pond.x && p.y === G.pond.y) {
      G.pondUsed = true;
      var f = fish();
      var g2 = Math.round(f.value * goldMult());
      m.gold += g2;
      G.score += Math.round(f.value * dmgMult());
      flash('🎣 Caught ' + f.name + ' (' + f.rarity + ') +' + g2 + ' gold', 3);
    }
    if (g.x === p.x && g.y === p.y) return die();
    if (!G.candies.length && !G.crystals.length) {
      if (G.depth >= DEPTHS.length - 1) return win();
      G.score += 250 * (G.depth + 1);
      m.gold += 30;
      ach('clear-1', 'Pathfinder — clear a depth');
      loadDepth(G.depth + 1);
      openShop();
      return;
    }
    renderHUD();
  }

  var flashMsg = '', flashT = 0;
  function flash(msg, dur) { flashMsg = msg; flashT = dur || 2.2; }

  function saveBest() {
    if (G.score > meta().best) {
      meta().best = G.score;
      try { localStorage.setItem('spooky_best', String(G.score)); } catch (e) {}
    }
  }
  function achList() {
    var ids = Object.keys(meta().ach);
    return ids.length ? ' 🏆 ' + ids.length + ' achievement' + (ids.length > 1 ? 's' : '') : '';
  }
  function die() {
    G.state = 'dead'; G.combo = 0; saveBest();
    showOverlay('☠️ Caught in the ' + DEPTHS[G.depth].layer + '!',
      'Score ' + S.compact(G.score) + ' · Level ' + meta().level + ' · ' +
      S.PICKS[meta().pickIdx].name + ' · Best ' + S.compact(meta().best) + achList() +
      ' · Seed ' + G.seed + '.', 'Try again', null, null);
  }
  function win() {
    G.state = 'win'; G.score += 1000; saveBest();
    showOverlay('🎃 Spooktacular! All 3 depths cleared!',
      'Score ' + S.compact(G.score) + ' · Level ' + meta().level + ' · ' +
      S.PICKS[meta().pickIdx].name + ' · ' + meta().relics.length + '/12 relics' +
      ' · Best ' + S.compact(meta().best) + achList(), 'Play again', null, null);
    renderHUD();
  }
  function openShop() {
    G.state = 'shop';
    var m = meta(), next = S.PICKS[m.pickIdx + 1];
    var txt = 'Depth cleared! Welcome to the ' + DEPTHS[G.depth].layer +
      '. Gold: ' + m.gold + '. Wielding: ' + S.PICKS[m.pickIdx].name + '.';
    if (next) {
      txt += ' Next: ' + next.name + ' (' + next.cost + ' gold, speed ' + next.speed + ').';
      var can = m.gold >= next.cost;
      showOverlay('🛒 Mine Shop', txt, can ? 'Buy ' + next.name : 'Need ' + (next.cost - m.gold) + ' more gold',
        'Descend ↓', function () {
          if (m.gold < next.cost) return false;
          m.gold -= next.cost; m.pickIdx++;
          G.score += 50;
          if (m.pickIdx === 1) ach('first-pick', 'New Edge — first upgrade');
          if (S.PICKS[m.pickIdx].name === 'Void Drill') ach('void-drill', 'Maximum Spin — own the Void Drill');
          return true;
        });
    } else {
      showOverlay('🛒 Mine Shop', txt + ' You wield the ultimate tool.', 'Descend ↓', null, null);
    }
    renderHUD();
  }
  function showOverlay(t, txt, btn, btn2, buyFn) {
    overlayTitle.textContent = t; overlayText.textContent = txt; overlayBtn.textContent = btn;
    overlayBtn.onclick = function () {
      if (G.state === 'shop' && buyFn) {
        if (buyFn() === false) return; // can't afford — stay in shop
        openShop(); // refresh shop (or stay if maxed)
        if (meta().pickIdx >= S.PICKS.length - 1) { G.state = 'play'; hideOverlay(); }
        renderHUD();
        return;
      }
      hideOverlay();
      if (G.state === 'title' || G.state === 'shop') G.state = 'play';
      else { newGame((Math.random() * 1e9) | 0); G.state = 'play'; }
      renderHUD();
    };
    if (btn2) {
      overlayBtn2.style.display = ''; overlayBtn2.textContent = btn2;
      overlayBtn2.onclick = function () { hideOverlay(); G.state = 'play'; renderHUD(); };
    } else overlayBtn2.style.display = 'none';
    overlay.classList.remove('hidden');
  }
  function hideOverlay() { overlay.classList.add('hidden'); }

  function renderHUD() {
    var m = meta();
    hud.score.textContent = S.compact(G.score);
    hud.depth.textContent = DEPTHS[G.depth].layer;
    hud.candy.textContent = G.candies.length + G.crystals.length;
    hud.combo.textContent = 'x' + S.comboMult(G.combo).toFixed(2);
    hud.seed.textContent = G.seed;
    hud.gold.textContent = S.compact(m.gold);
    hud.level.textContent = m.level;
    hud.pick.textContent = S.PICKS[m.pickIdx].name;
  }

  function draw() {
    var w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#0b0620'; ctx.fillRect(0, 0, w, h);
    if (!G) return;
    var pal = [['#3b1d5e', '#241243'], ['#0e4a5e', '#0a2e43'], ['#5e1d1d', '#431212']][G.depth];
    for (var x = 0; x < G.maze.w; x++) for (var z = 0; z < G.maze.d; z++) {
      if (G.maze.cells[S.key(x, z)]) {
        ctx.fillStyle = (x + z) % 2 ? '#171033' : '#130d2b';
        ctx.fillRect(x * TILE, z * TILE, TILE, TILE);
      } else {
        var grd = ctx.createLinearGradient(x * TILE, z * TILE, x * TILE, z * TILE + TILE);
        grd.addColorStop(0, pal[0]); grd.addColorStop(1, pal[1]);
        ctx.fillStyle = grd; ctx.fillRect(x * TILE, z * TILE, TILE, TILE);
      }
    }
    function interp(e) {
      var t = S.ease('quadOut', e.t);
      return [(e.px + (e.x - e.px) * t) * TILE + TILE / 2, (e.py + (e.y - e.py) * t) * TILE + TILE / 2];
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var bob = Math.sin(G.time * 4) * 2;
    ctx.font = '15px serif';
    G.candies.forEach(function (c) { ctx.fillText('🍬', c.x * TILE + TILE / 2, c.y * TILE + TILE / 2 + bob); });
    ctx.font = '17px serif';
    G.crystals.forEach(function (c) { ctx.fillText('💎', c.x * TILE + TILE / 2, c.y * TILE + TILE / 2 - bob); });
    if (G.relicSpot) { ctx.font = '18px serif'; ctx.fillText('🗿', G.relicSpot.x * TILE + TILE / 2, G.relicSpot.y * TILE + TILE / 2); }
    if (G.pond) { ctx.font = '18px serif'; ctx.fillText(G.pondUsed ? '🪨' : '🎣', G.pond.x * TILE + TILE / 2, G.pond.y * TILE + TILE / 2); }
    var g = interp(G.ghost);
    ctx.font = '20px serif';
    ctx.fillText('👻', g[0], g[1]);
    var q = interp(G.player);
    ctx.font = '20px serif';
    ctx.fillText('🎃', q[0], q[1]);
    if (flashT > 0) {
      ctx.fillStyle = '#ffd166'; ctx.font = 'bold 16px sans-serif';
      ctx.fillText(flashMsg, w / 2, 22);
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

  document.getElementById('newmaze').addEventListener('click', function () {
    newGame((Math.random() * 1e9) | 0); G.state = 'play'; hideOverlay(); renderHUD();
  });
  document.getElementById('shopbtn').addEventListener('click', function () {
    if (G.state === 'play') openShop();
  });

  newGame(20261031);
  G.state = 'title';
  renderHUD();
  window.SpookyTabs.init({
    tabsId: 'tabs', panelsId: 'tabpanels',
    snapshot: function () {
      var m = meta();
      return { score: G.score, layer: 'Depth ' + (G.depth + 1) + '/3', left: G.candies.length + G.crystals.length,
        gold: m.gold, level: m.level, pick: S.PICKS[m.pickIdx].name, seed: G.seed,
        relics: m.relics.length, ach: m.ach, collected: G.picked };
    },
    onSelect: function (i) { G.tab = i; },
    actions: {
      openShop: function () { if (G.state === 'play') openShop(); },
      newMaze: function () { document.getElementById('newmaze').click(); }
    },
    host: { onUnlock: function (id, name) { meta().ach[id] = name; } },
    profile: makeProfile()
  });
  function makeProfile() {
    return {
      gold: function () { return meta().gold; },
      addGold: function (n) { meta().gold += n; renderHUD(); },
      spendGold: function (n) { if (meta().gold < n) return false; meta().gold -= n; renderHUD(); return true; },
      coal: function () { return meta().coal || 0; },
      addCoal: function (n) { meta().coal = (meta().coal || 0) + n; renderHUD(); },
      spendCoal: function (n) { if ((meta().coal || 0) < n) return false; meta().coal -= n; renderHUD(); return true; },
      level: function () { return meta().level; },
      pickIdx: function () { return meta().pickIdx; },
      setPick: function (i) { meta().pickIdx = i; renderHUD(); },
      pickDamage: function () { return S.PICKS[meta().pickIdx].speed; },
      goldMult: function () { return goldMult(); },
      gainXP: gainXP,
      addScore: function (n) { G.score += n; renderHUD(); },
      unlock: function (id, name) { ach(id, name); },
      flash: flash,
      hud: renderHUD
    };
  }
  showOverlay('🎃 Spooktacular Ultimate',
    'Mine 3 depths (Dirt Tunnels → Crystal Hollows → Magma Core). Grab 🍬💎, find 🗿 relics, fish 🎣 ponds, earn gold, buy all 7 picks up to the Void Drill. The 👻 hunts with real A*.',
    'Start haunting', null, null);
  requestAnimationFrame(loop);
})();
