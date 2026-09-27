/* Spooktacular Maze Hunt — pure game logic.
 * Faithful ports of the algorithms verified in spooktacular-verify/test_logic.py
 * (which mirror the Swift sources): SeededRNG, DFS carver, A* with octile
 * heuristic + corner rule + iteration budget, combo/streak scoring, compact().
 * No DOM here — runs in browsers and Node (for tests).
 */
(function (root) {
  'use strict';
  var MASK64 = (1n << 64n) - 1n;
  var ADD = 0x6D2B79F5n;

  function SeededRNG(seed) {
    this.state = BigInt(seed === 0 ? 0x9E3779B97F4A7C15 : seed) & MASK64;
  }
  SeededRNG.prototype.next = function () {
    var z;
    this.state = (this.state + ADD) & MASK64;
    z = this.state;
    z = ((z ^ (z >> 15n)) * (z | 1n)) & MASK64;
    z = (z ^ (z + (((z ^ (z >> 7n)) * (z | 61n)) & MASK64) & MASK64)) & MASK64;
    z = (z ^ (z >> 14n)) & MASK64;
    return z;
  };
  SeededRNG.prototype.nextDouble = function () {
    return Number(this.next() >> 11n) / 9007199254740992; // 2^53 -> [0,1)
  };
  SeededRNG.prototype.nextInt = function (n) {
    return Math.floor(this.nextDouble() * n);
  };
  SeededRNG.prototype.pick = function (arr) {
    return arr[this.nextInt(arr.length)];
  };
  SeededRNG.prototype.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = this.nextInt(i + 1), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  /* Depth-first maze carver (mirrors MazeCarver DFS): odd grid, cells 2 apart,
   * returns Set of "x,z" keys for open cells. */
  function carveDFS(w, d, seed) {
    var rng = new SeededRNG(seed);
    w = Math.max(3, w | 1); d = Math.max(3, d | 1);
    var grid = [], x, z;
    for (x = 0; x < w; x++) { grid.push([]); for (z = 0; z < d; z++) grid[x].push(false); }
    grid[1][1] = true;
    var stack = [[1, 1]], steps = 0, dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]];
    while (stack.length && steps < w * d * 4) {
      steps++;
      var top = stack[stack.length - 1];
      x = top[0]; z = top[1];
      var opts = [];
      for (var i = 0; i < 4; i++) {
        var nx = x + dirs[i][0], nz = z + dirs[i][1];
        if (nx > 0 && nx < w - 1 && nz > 0 && nz < d - 1 && !grid[nx][nz]) opts.push([dirs[i][0], dirs[i][1], nx, nz]);
      }
      if (opts.length) {
        var c = rng.pick(opts);
        grid[x + c[0] / 2][z + c[1] / 2] = true;
        grid[c[2]][c[3]] = true;
        stack.push([c[2], c[3]]);
      } else stack.pop();
    }
    var cells = {};
    for (x = 0; x < w; x++) for (z = 0; z < d; z++) if (grid[x][z]) cells[x + ',' + z] = true;
    return { w: w, d: d, cells: cells };
  }

  function key(x, z) { return x + ',' + z; }

  function connected(maze, sx, sz) {
    var seen = {}, stack = [[sx, sz]];
    seen[key(sx, sz)] = true;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (stack.length) {
      var c = stack.pop();
      for (var i = 0; i < 4; i++) {
        var n = key(c[0] + dirs[i][0], c[1] + dirs[i][1]);
        if (maze.cells[n] && !seen[n]) { seen[n] = true; stack.push([c[0] + dirs[i][0], c[1] + dirs[i][1]]); }
      }
    }
    return Object.keys(seen).length === Object.keys(maze.cells).length;
  }

  /* A* with octile heuristic, corner-cut rule, iteration budget
   * (mirrors MazeHunter A*). walkable(x,z) -> bool. */
  function astar(sx, sz, gx, gz, walkable, maxIter) {
    maxIter = maxIter || 600;
    if (sx === gx && sz === gz) return [[sx, sz]];
    function h(ax, az) {
      var dx = Math.abs(ax - gx), dz = Math.abs(az - gz);
      return Math.max(dx, dz) + 0.4142 * Math.min(dx, dz);
    }
    var open = [{ x: sx, z: sz, f: h(sx, sz), it: 0 }];
    var came = {}, g = {}, closed = {};
    g[key(sx, sz)] = 0;
    var it = 0;
    var dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
                [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
    function popBest() {
      var bi = 0;
      for (var i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      return open.splice(bi, 1)[0];
    }
    while (open.length && it < maxIter) {
      it++;
      var cur = popBest(), ck = key(cur.x, cur.z);
      if (cur.x === gx && cur.z === gz) {
        var path = [[cur.x, cur.z]], c = ck;
        while (came[c]) { c = came[c]; var p = c.split(','); path.push([+p[0], +p[1]]); }
        return path.reverse();
      }
      if (closed[ck]) continue;
      closed[ck] = true;
      for (var i = 0; i < dirs.length; i++) {
        var dx = dirs[i][0], dz = dirs[i][1], cost = dirs[i][2];
        var nx = cur.x + dx, nz = cur.z + dz, nk = key(nx, nz);
        if (closed[nk]) continue;
        if (dx && dz && (!walkable(cur.x + dx, cur.z) && !walkable(cur.x, cur.z + dz))) continue;
        if (!walkable(nx, nz) && !(nx === gx && nz === gz)) continue;
        var t = g[ck] + cost;
        if (t < (g[nk] === undefined ? Infinity : g[nk])) {
          came[nk] = ck; g[nk] = t;
          open.push({ x: nx, z: nz, f: t + h(nx, nz), it: it });
        }
      }
    }
    return null;
  }

  /* Easing (mirrors MineEasing, subset used by the web game). */
  function ease(kind, x) {
    x = Math.min(1, Math.max(0, x));
    if (kind === 'linear') return x;
    if (kind === 'quadOut') return 1 - (1 - x) * (1 - x);
    if (kind === 'sineInOut') return -(Math.cos(Math.PI * x) - 1) / 2;
    if (kind === 'quadInOut') return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    return x;
  }

  /* Scoring (mirrors ProScoringEngine). */
  function comboMult(c) { return c <= 0 ? 1 : Math.min(3, 1 + c * 0.05); }
  function streakBonus(s) {
    if (s <= 0) return 0;
    if (s >= 20) return 100 + (s - 20) * 5;
    if (s >= 10) return 40 + (s - 10) * 6;
    return s * 2;
  }
  function compact(n) {
    var v = +n;
    if (v < 1000) return String(n);
    if (v < 1000000) { var k = v / 1000; return (k === Math.floor(k) ? String(k) : k.toFixed(1)) + 'K'; }
    var m = v / 1000000; return (m === Math.floor(m) ? String(m) : m.toFixed(1)) + 'M';
  }

  /* ---- Real data tables ported from the Swift sources ---- */
  /* MNPickTier (AbandonedMine.swift): display names, speeds, gold costs. */
  var PICKS = [
    { name: 'Wooden Pick', speed: 1.5, cost: 0 },
    { name: 'Stone Pick', speed: 2.0, cost: 8 },
    { name: 'Iron Pick', speed: 2.5, cost: 20 },
    { name: 'Golden Pick', speed: 3.0, cost: 35 },
    { name: 'Diamond Pick', speed: 4.5, cost: 60 },
    { name: 'Crystal Pick', speed: 6.0, cost: 100 },
    { name: 'Void Drill', speed: 8.5, cost: 160 }
  ];
  /* MNDepthLayer titles (AbandonedMine.swift) used for web depths. */
  var LAYERS = ['Sunlit Tops', 'Dirt Tunnels', 'Stone Depths', 'Deepstone', 'Crystal Hollows', 'Magma Core'];
  /* MNRelic catalog (MineRelics.swift): 12 relics. */
  var RELICS = [
    { name: "Mole's Knuckle", effect: 'Damage', value: 0.15 },
    { name: 'Sledge of Echoes', effect: 'Damage', value: 0.25 },
    { name: 'Core Drill Bit', effect: 'Damage', value: 0.4 },
    { name: "Rabbit's Foot", effect: 'Luck', value: 0.08 },
    { name: 'Four-Leaf Pick', effect: 'Luck', value: 0.12 },
    { name: 'Wisp in a Jar', effect: 'Luck', value: 0.2 },
    { name: 'Gilded Scale', effect: 'Gold', value: 0.15 },
    { name: "Merchant's Smile", effect: 'Gold', value: 0.25 },
    { name: 'Crown Fragment', effect: 'Gold', value: 0.4 },
    { name: 'Swift Boots', effect: 'Speed', value: 0.15 },
    { name: 'Hummingbird Charm', effect: 'Speed', value: 0.25 },
    { name: 'Bottomless Pocket', effect: 'Pack', value: 25 }
  ];
  /* MNFish catalog (MineFishing.swift): 14 fish. */
  var FISH = [
    { name: 'Cave Minnow', rarity: 'Common', value: 6 },
    { name: 'Lantern Guppy', rarity: 'Common', value: 8 },
    { name: 'Blind Barb', rarity: 'Common', value: 7 },
    { name: 'Moss Carp', rarity: 'Common', value: 9 },
    { name: 'Echo Trout', rarity: 'Rare', value: 22 },
    { name: 'Mirror Koi', rarity: 'Rare', value: 28 },
    { name: 'Axolotl Pal', rarity: 'Epic', value: 60 },
    { name: 'Ember Eel', rarity: 'Common', value: 14 },
    { name: 'Cinder Carp', rarity: 'Common', value: 16 },
    { name: 'Magma Jelly', rarity: 'Rare', value: 34 },
    { name: 'Obsidian Bass', rarity: 'Rare', value: 40 },
    { name: 'Phoenix Fry', rarity: 'Epic', value: 85 },
    { name: 'Core Serpent', rarity: 'Legendary', value: 220 },
    { name: 'Golden Walleye', rarity: 'Legendary', value: 180 }
  ];
  var FISH_WEIGHT = { Common: 60, Rare: 28, Epic: 10, Legendary: 2 };
  /* XP curve (mirrors ProScoringEngine.xpNext). */
  function xpNext(lv) { return Math.max(50, Math.round(80 * Math.pow(1.28, Math.max(1, lv) - 1))); }

  /* ---- App catalogs (verbatim from iOS sources) ---- */
  var GHOSTS = [
    { key: "poltergeist", name: "👻 Poltergeist", rarity: "common" },
    { key: "specter", name: "👻 Specter", rarity: "common" },
    { key: "phantom", name: "👻 Phantom", rarity: "common" },
    { key: "wraith", name: "👻 Wraith", rarity: "common" },
    { key: "banshee", name: "👻 Banshee", rarity: "common" },
    { key: "ghoul", name: "🧟 Ghoul", rarity: "common" },
    { key: "zombie", name: "🧟 Zombie", rarity: "common" },
    { key: "mummy", name: "🧟 Mummy", rarity: "common" },
    { key: "vampire", name: "🧛 Vampire", rarity: "uncommon" },
    { key: "werewolf", name: "🐺 Werewolf", rarity: "uncommon" },
    { key: "witch", name: "🧙 Witch", rarity: "uncommon" },
    { key: "ghostKnight", name: "⚔️ Ghost Knight", rarity: "uncommon" },
    { key: "shadowDemon", name: "🌑 Shadow Demon", rarity: "uncommon" },
    { key: "demonLord", name: "👿 Demon Lord", rarity: "rare" },
    { key: "ancientSpirit", name: "🏛️ Ancient Spirit", rarity: "rare" },
    { key: "dragonGhost", name: "🐉 Dragon Ghost", rarity: "rare" },
    { key: "necromancer", name: "💀 Necromancer", rarity: "rare" },
    { key: "lichKing", name: "👑 Lich King", rarity: "epic" },
    { key: "voidBeast", name: "🌀 Void Beast", rarity: "epic" },
    { key: "timeWraith", name: "⏳ Time Wraith", rarity: "epic" },
    { key: "chaosDemon", name: "🔥 Chaos Demon", rarity: "epic" },
    { key: "halloweenKing", name: "🎃 Halloween King", rarity: "legendary" },
    { key: "pumpkinLord", name: "🎃 Pumpkin Lord", rarity: "legendary" },
    { key: "nightmare", name: "🌙 Nightmare", rarity: "legendary" },
    { key: "voidEntity", name: "🌌 Void Entity", rarity: "legendary" },
  ];
  var CANDIES = [
    { key: "chocolate", name: "🍫 Chocolate", points: 3 },
    { key: "lollipop", name: "🍭 Lollipop", points: 3 },
    { key: "gummi", name: "🐻 Gummi", points: 3 },
    { key: "candyCorn", name: "🌽 Candy Corn", points: 2 },
    { key: "licorice", name: "🖤 Licorice", points: 2 },
    { key: "jawbreaker", name: "🔴 Jawbreaker", points: 2 },
    { key: "taffy", name: "🍬 Taffy", points: 2 },
    { key: "peppermint", name: "🍬 Peppermint", points: 2 },
    { key: "truffle", name: "🍫 Truffle", points: 5 },
    { key: "caramel", name: "🍬 Caramel", points: 5 },
    { key: "fudge", name: "🍫 Fudge", points: 5 },
    { key: "toffee", name: "🍬 Toffee", points: 5 },
    { key: "goldenCandy", name: "⭐ Golden Candy", points: 15 },
    { key: "magicalCandy", name: "✨ Magical Candy", points: 20 },
    { key: "rainbowCandy", name: "🌈 Rainbow Candy", points: 25 },
    { key: "candycornKing", name: "👑 Candy Corn King", points: 50 },
    { key: "chocolateDragon", name: "🐉 Chocolate Dragon", points: 60 },
    { key: "lollipopTower", name: "🗼 Lollipop Tower", points: 70 },
  ];
  var MINIGAMES = [
    { key: "memoryMatch", name: "🧠 Memory Match" },
    { key: "pumpkinSmash", name: "🎃 Pumpkin Smash" },
    { key: "ghostRace", name: "👻 Ghost Race" },
    { key: "candySort", name: "🍬 Candy Sort" },
    { key: "spellDuel", name: "✨ Spell Duel" },
    { key: "mazeEscape", name: "🌀 Maze Escape" },
    { key: "trivia", name: "🧠 Trivia" },
    { key: "rhythm", name: "🎵 Rhythm" },
    { key: "voxelRun", name: "🧱 Voxel Run 3D" },
    { key: "graveyard3D", name: "🪦 Graveyard 3D" },
    { key: "abandonedMine", name: "🦇 Abandoned Mine" },
  ];
  var REGIONS = ["Northgate Warren", "Ember Deeps", "The Heart", "Lantern Row",
    "Tangle Warrens", "Gilded Warrens", "Far Reaches", "Howling Deeps"];
  /* ---- Mining ores (MNBlockType values, verbatim) ---- */
  var ORES = [
    { key: 'dirt', name: 'Dirt', emoji: '🟫', color: '#5a412d', hp: 1, gold: 0, xp: 0, tier: 0, w: 22 },
    { key: 'stone', name: 'Stone', emoji: '🪨', color: '#5f556e', hp: 2, gold: 0, xp: 1, tier: 0, w: 22 },
    { key: 'coal', name: 'Coal Ore', emoji: '⬛', color: '#28282e', hp: 3, gold: 0, xp: 4, tier: 0, coal: 1, w: 14 },
    { key: 'iron', name: 'Iron Ore', emoji: '🟫', color: '#786046', hp: 3, gold: 4, xp: 6, tier: 1, w: 10 },
    { key: 'gold', name: 'Gold Ore', emoji: '🟨', color: '#beA028', hp: 4, gold: 10, xp: 12, tier: 1, w: 7 },
    { key: 'lapis', name: 'Lapis Ore', emoji: '🟦', color: '#2850be', hp: 3, gold: 8, xp: 10, tier: 1, w: 6 },
    { key: 'emerald', name: 'Emerald Ore', emoji: '🟩', color: '#28aa50', hp: 5, gold: 20, xp: 24, tier: 2, w: 5 },
    { key: 'ruby', name: 'Ruby Ore', emoji: '♦️', color: '#c8285a', hp: 5, gold: 30, xp: 36, tier: 3, w: 4 },
    { key: 'diamond', name: 'Diamond Ore', emoji: '💎', color: '#78dcf0', hp: 6, gold: 25, xp: 30, tier: 4, w: 4 },
    { key: 'crystal', name: 'Spike Crystal', emoji: '🔺', color: '#4bd8ff', hp: 4, gold: 18, xp: 22, tier: 1, w: 6 }
  ];
  /* ---- Sweet table (shared candy variety for 2D + 3D mazes) ---- */
  var SWEETS = [
    { tex: 'candy', emoji: '🍬', name: 'Candy', points: 10, w: 30 },
    { tex: 'lollipop', emoji: '🍭', name: 'Lollipop', points: 15, w: 20 },
    { tex: 'choco', emoji: '🍫', name: 'Chocolate', points: 12, w: 20 },
    { tex: 'gummy', emoji: '🐻', name: 'Gummy', points: 8, w: 15 },
    { tex: 'corn', emoji: '🌽', name: 'Candy Corn', points: 10, w: 15 }
  ];
  function pickSweet(rng) {
    var tot = 0, i;
    for (i = 0; i < SWEETS.length; i++) tot += SWEETS[i].w;
    var r = rng.nextDouble() * tot;
    for (i = 0; i < SWEETS.length; i++) { r -= SWEETS[i].w; if (r <= 0) return SWEETS[i]; }
    return SWEETS[0];
  }
  function mIdentity() { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
  function mMul(a, b) {
    var o = new Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  function mPerspective(fovY, aspect, near, far) {
    var f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function mLookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz) {
    var zx = ex - cx, zy = ey - cy, zz = ez - cz;
    var zl = Math.hypot(zx, zy, zz) || 1; zx /= zl; zy /= zl; zz /= zl;
    var xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx;
    var xl = Math.hypot(xx, xy, xz) || 1; xx /= xl; xy /= xl; xz /= xl;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * ex + xy * ey + xz * ez), -(yx * ex + yy * ey + yz * ez), -(zx * ex + zy * ey + zz * ez), 1];
  }
  function mTransform(m, x, y, z) {
    var w = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
            (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
            (m[2] * x + m[6] * y + m[10] * z + m[14]) / w];
  }

  /* ---- Voxel raycast (Amanatides & Woo DDA) + value noise ---- */
  function voxelRay(origin, dir, maxDist, solid) {
    var L = Math.hypot(dir[0], dir[1], dir[2]);
    if (L === 0) return null;
    var d = [dir[0] / L, dir[1] / L, dir[2] / L];
    var x = Math.floor(origin[0]), y = Math.floor(origin[1]), z = Math.floor(origin[2]);
    function delta(c) { return c !== 0 ? Math.abs(1 / c) : Infinity; }
    var tdx = delta(d[0]), tdy = delta(d[1]), tdz = delta(d[2]);
    function tmax(o, d, td, s) {
      if (d === 0) return Infinity;
      return s > 0 ? ((Math.floor(o) + 1 - o) * td) : ((o - Math.floor(o)) * td);
    }
    var sx = d[0] > 0 ? 1 : -1, sy = d[1] > 0 ? 1 : -1, sz = d[2] > 0 ? 1 : -1;
    var tmx = tmax(origin[0], d[0], tdx, sx), tmy = tmax(origin[1], d[1], tdy, sy), tmz = tmax(origin[2], d[2], tdz, sz);
    var t = 0, n = [0, 0, 0];
    for (var i = 0; i < 256; i++) {
      if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; n = [-sx, 0, 0]; }
      else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; n = [0, -sy, 0]; }
      else { z += sz; t = tmz; tmz += tdz; n = [0, 0, -sz]; }
      if (t > maxDist) return null;
      if (solid(x, y, z)) return { x: x, y: y, z: z, nx: n[0], ny: n[1], nz: n[2], dist: t };
    }
    return null;
  }
  /* Seeded 2D value noise in [0,1], smooth + tileable-ish. */
  function makeNoise2D(seed) {
    var rng = new SeededRNG(seed);
    var perm = rng.shuffle(Array.apply(null, { length: 256 }).map(function (_, i) { return i; }));
    function lat(ix, iz) { return perm[((ix & 255) + (iz & 255) * 57) & 255] / 255; }
    function sm(t) { return t * t * (3 - 2 * t); }
    return function (x, z) {
      var ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
      var a = lat(ix, iz), b = lat(ix + 1, iz), c = lat(ix, iz + 1), d = lat(ix + 1, iz + 1);
      var u = sm(fx), v = sm(fz);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  }

  var api = { SeededRNG: SeededRNG, carveDFS: carveDFS, connected: connected, astar: astar, ease: ease, comboMult: comboMult, streakBonus: streakBonus, compact: compact, key: key,
    PICKS: PICKS, LAYERS: LAYERS, RELICS: RELICS, FISH: FISH, FISH_WEIGHT: FISH_WEIGHT, xpNext: xpNext,
    mIdentity: mIdentity, mMul: mMul, mPerspective: mPerspective, mLookAt: mLookAt, mTransform: mTransform, GHOSTS: GHOSTS, CANDIES: CANDIES, MINIGAMES: MINIGAMES, REGIONS: REGIONS, ORES: ORES,
    voxelRay: voxelRay, makeNoise2D: makeNoise2D, SWEETS: SWEETS, pickSweet: pickSweet };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Spooky = api;
})(typeof self !== 'undefined' ? self : this);
