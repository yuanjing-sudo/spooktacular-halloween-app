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
    { key: "chocolate", name: "🍫 Chocolate", points: 3, theme: "choco" },
    { key: "lollipop", name: "🍭 Lollipop", points: 3, theme: "swirl" },
    { key: "gummi", name: "🐻 Gummi", points: 3, theme: "gummi" },
    { key: "candyCorn", name: "🌽 Candy Corn", points: 2, theme: "corn" },
    { key: "licorice", name: "🖤 Licorice", points: 2, theme: "dark" },
    { key: "jawbreaker", name: "🔴 Jawbreaker", points: 2, theme: "crack" },
    { key: "taffy", name: "🍬 Taffy", points: 2, theme: "stretch" },
    { key: "peppermint", name: "🍬 Peppermint", points: 2, theme: "mint" },
    { key: "truffle", name: "🍫 Truffle", points: 5, theme: "truffle" },
    { key: "caramel", name: "🍬 Caramel", points: 5, theme: "caramel" },
    { key: "fudge", name: "🍫 Fudge", points: 5, theme: "fudge" },
    { key: "toffee", name: "🍬 Toffee", points: 5, theme: "toffee" },
    { key: "goldenCandy", name: "⭐ Golden Candy", points: 15, theme: "gold" },
    { key: "magicalCandy", name: "✨ Magical Candy", points: 20, theme: "magic" },
    { key: "rainbowCandy", name: "🌈 Rainbow Candy", points: 25, theme: "rainbow" },
    { key: "candycornKing", name: "👑 Candy Corn King", points: 50, theme: "king" },
    { key: "chocolateDragon", name: "🐉 Chocolate Dragon", points: 60, theme: "dragon" },
    { key: "lollipopTower", name: "🗼 Lollipop Tower", points: 70, theme: "tower" },
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

  var EXTRA_GHOSTS = [
    { key: "candyWraith", name: "🍬 Candy Wraith", rarity: "common" },
    { key: "sugarSpecter", name: "🧂 Sugar Specter", rarity: "common" },
    { key: "chocoPhantom", name: "🍫 Choco Phantom", rarity: "uncommon" },
    { key: "mintBanshee", name: "🌿 Mint Banshee", rarity: "uncommon" },
    { key: "caramelWisp", name: "🍯 Caramel Wisp", rarity: "uncommon" },
    { key: "gummyGolem", name: "🐻 Gummy Golem", rarity: "rare" },
    { key: "toffeeTitan", name: "🍬 Toffee Titan", rarity: "rare" },
    { key: "fudgeFiend", name: "🍫 Fudge Fiend", rarity: "rare" },
    { key: "licorichLord", name: "🖤 Licorice Lord", rarity: "epic" },
    { key: "peppermintProwler", name: "🍬 Peppermint Prowler", rarity: "epic" },
    { key: "jawbreakerJuggernaut", name: "🔴 Jawbreaker Juggernaut", rarity: "epic" },
    { key: "truffleTerror", name: "🍫 Truffle Terror", rarity: "legendary" },
    { key: "candycornCrusher", name: "🌽 Candy Corn Crusher", rarity: "legendary" },
    { key: "sugarplumSovereign", name: "👑 Sugarplum Sovereign", rarity: "legendary" },
    { key: "chocolateChimera", name: "🐉 Chocolate Chimera", rarity: "legendary" },
    { key: "lollipopLeviathan", name: "🗼 Lollipop Leviathan", rarity: "legendary" },
    { key: "gummyGorgon", name: "🐻 Gummy Gorgon", rarity: "rare" },
    { key: "toffeeTemplar", name: "🍬 Toffee Templar", rarity: "uncommon" },
    { key: "fudgeFalcon", name: "🍫 Fudge Falcon", rarity: "common" },
    { key: "licoriceLynx", name: "🖤 Licorice Lynx", rarity: "common" },
    { key: "peppermintPanther", name: "🍬 Peppermint Panther", rarity: "uncommon" },
    { key: "jawbreakerJackal", name: "🔴 Jawbreaker Jackal", rarity: "common" },
    { key: "truffleTiger", name: "🍫 Truffle Tiger", rarity: "rare" },
    { key: "candycornCobra", name: "🌽 Candy Corn Cobra", rarity: "uncommon" },
    { key: "sugarplumSerpent", name: "👑 Sugarplum Serpent", rarity: "epic" },
    { key: "chocolateCentaur", name: "🐉 Chocolate Centaur", rarity: "rare" },
    { key: "lollipopLizard", name: "🗼 Lollipop Lizard", rarity: "common" },
    { key: "gummyGriffin", name: "🐻 Gummy Griffin", rarity: "epic" },
    { key: "toffeeToucan", name: "🍬 Toffee Toucan", rarity: "common" },
    { key: "fudgeFox", name: "🍫 Fudge Fox", rarity: "uncommon" },
    { key: "licoriceLemur", name: "🖤 Licorice Lemur", rarity: "common" },
    { key: "peppermintPanda", name: "🍬 Peppermint Panda", rarity: "rare" },
    { key: "jawbreakerJaguar", name: "🔴 Jawbreaker Jaguar", rarity: "epic" },
    { key: "truffleTurtle", name: "🍫 Truffle Turtle", rarity: "uncommon" },
    { key: "candycornCrocodile", name: "🌽 Candy Corn Crocodile", rarity: "rare" },
    { key: "sugarplumSparrow", name: "👑 Sugarplum Sparrow", rarity: "common" },
    { key: "chocolateCheetah", name: "🐉 Chocolate Cheetah", rarity: "epic" },
    { key: "lollipopLion", name: "🗼 Lollipop Lion", rarity: "legendary" },
    { key: "gummyGazelle", name: "🐻 Gummy Gazelle", rarity: "uncommon" },
    { key: "toffeeTapir", name: "🍬 Toffee Tapir", rarity: "rare" },
    { key: "fudgeFerret", name: "🍫 Fudge Ferret", rarity: "common" },
    { key: "licoriceLobster", name: "🖤 Licorice Lobster", rarity: "uncommon" },
    { key: "peppermintPenguin", name: "🍬 Peppermint Penguin", rarity: "common" },
    { key: "jawbreakerJellyfish", name: "🔴 Jawbreaker Jellyfish", rarity: "rare" },
    { key: "truffleTarantula", name: "🍫 Truffle Tarantula", rarity: "epic" },
    { key: "candycornCicada", name: "🌽 Candy Corn Cicada", rarity: "uncommon" },
    { key: "sugarplumScorpion", name: "👑 Sugarplum Scorpion", rarity: "legendary" },
    { key: "chocolateCockroach", name: "🐉 Chocolate Cockroach", rarity: "common" },
    { key: "lollipopLocust", name: "🗼 Lollipop Locust", rarity: "rare" },
    { key: "gummyGnat", name: "🐻 Gummy Gnat", rarity: "common" },
    { key: "toffeeTermite", name: "🍬 Toffee Termite", rarity: "uncommon" },
    { key: "fudgeFirefly", name: "🍫 Fudge Firefly", rarity: "rare" },
    { key: "licoriceLadybug", name: "🖤 Licorice Ladybug", rarity: "common" },
    { key: "peppermintMoth", name: "🍬 Peppermint Moth", rarity: "uncommon" },
    { key: "jawbreakerMosquito", name: "🔴 Jawbreaker Mosquito", rarity: "common" },
    { key: "truffleMantis", name: "🍫 Truffle Mantis", rarity: "rare" },
    { key: "candycornMite", name: "🌽 Candy Corn Mite", rarity: "common" },
    { key: "sugarplumMouse", name: "👑 Sugarplum Mouse", rarity: "uncommon" },
    { key: "chocolateMole", name: "🐉 Chocolate Mole", rarity: "rare" },
    { key: "lollipopMonkey", name: "🗼 Lollipop Monkey", rarity: "epic" },
    { key: "gummyMarmot", name: "🐻 Gummy Marmot", rarity: "uncommon" },
    { key: "toffeeMacaw", name: "🍬 Toffee Macaw", rarity: "common" },
    { key: "fudgeMagpie", name: "🍫 Fudge Magpie", rarity: "uncommon" },
    { key: "licoriceMamba", name: "🖤 Licorice Mamba", rarity: "rare" },
    { key: "peppermintMongoose", name: "🍬 Peppermint Mongoose", rarity: "epic" },
    { key: "jawbreakerMink", name: "🔴 Jawbreaker Mink", rarity: "uncommon" },
    { key: "truffleMarten", name: "🍫 Truffle Marten", rarity: "rare" },
    { key: "candycornMastiff", name: "🌽 Candy Corn Mastiff", rarity: "uncommon" },
    { key: "sugarplumMastodon", name: "👑 Sugarplum Mastodon", rarity: "legendary" },
    { key: "chocolateManatee", name: "🐉 Chocolate Manatee", rarity: "rare" },
    { key: "lollipopMantis Shrimp", name: "🗼 Lollipop Mantis Shrimp", rarity: "epic" },
    { key: "gummyMuskox", name: "🐻 Gummy Muskox", rarity: "uncommon" },
    { key: "toffeeMusk Deer", name: "🍬 Toffee Musk Deer", rarity: "rare" },
    { key: "fudgeMuskellunge", name: "🍫 Fudge Muskellunge", rarity: "uncommon" },
    { key: "licoriceMussel", name: "🖤 Licorice Mussel", rarity: "common" },
    { key: "peppermintMyna", name: "🍬 Peppermint Myna", rarity: "uncommon" },
    { key: "jawbreakerNightingale", name: "🔴 Jawbreaker Nightingale", rarity: "rare" },
    { key: "truffleNarwhal", name: "🍫 Truffle Narwhal", rarity: "epic" },
    { key: "candycornNewt", name: "🌽 Candy Corn Newt", rarity: "common" },
    { key: "sugarplumNumbat", name: "👑 Sugarplum Numbat", rarity: "uncommon" },
    { key: "chocolateNutria", name: "🐉 Chocolate Nutria", rarity: "rare" },
    { key: "lollipopNuthatch", name: "🗼 Lollipop Nuthatch", rarity: "uncommon" },
    { key: "gummyNyala", name: "🐻 Gummy Nyala", rarity: "rare" },
    { key: "toffeeOcelot", name: "🍬 Toffee Ocelot", rarity: "epic" },
    { key: "fudgeOctopus", name: "🍫 Fudge Octopus", rarity: "rare" },
    { key: "licoriceOkapi", name: "🖤 Licorice Okapi", rarity: "epic" },
    { key: "peppermintOlm", name: "🍬 Peppermint Olm", rarity: "rare" },
    { key: "jawbreakerOpossum", name: "🔴 Jawbreaker Opossum", rarity: "uncommon" },
    { key: "truffleOrangutan", name: "🍫 Truffle Orangutan", rarity: "legendary" },
    { key: "candycornOribi", name: "🌽 Candy Corn Oribi", rarity: "uncommon" },
    { key: "sugarspoonOryx", name: "👑 Sugarplum Oryx", rarity: "rare" },
    { key: "chocolateOsprey", name: "🐉 Chocolate Osprey", rarity: "uncommon" },
    { key: "lollipopOstrich", name: "🗼 Lollipop Ostrich", rarity: "rare" },
    { key: "gummyOtter", name: "🐻 Gummy Otter", rarity: "uncommon" },
    { key: "toffeeOwl", name: "🍬 Toffee Owl", rarity: "common" },
    { key: "fudgeOx", name: "🍫 Fudge Ox", rarity: "uncommon" },
    { key: "licoriceOyster", name: "🖤 Licorice Oyster", rarity: "common" },
    { key: "peppermintPaca", name: "🍬 Peppermint Paca", rarity: "uncommon" },
    { key: "jawbreakerPaddlefish", name: "🔴 Jawbreaker Paddlefish", rarity: "rare" },
    { key: "trufflePademelon", name: "🍫 Truffle Pademelon", rarity: "uncommon" },
    { key: "candycornPanda", name: "🌽 Candy Corn Panda", rarity: "rare" },
    { key: "sugarplumPangolin", name: "👑 Sugarplum Pangolin", rarity: "epic" },
    { key: "chocolatePanther", name: "🐉 Chocolate Panther", rarity: "rare" },
    { key: "lollipopPapillon", name: "🗼 Lollipop Papillon", rarity: "uncommon" },
    { key: "gummyParakeet", name: "🐻 Gummy Parakeet", rarity: "common" },
    { key: "toffeeParrot", name: "🍬 Toffee Parrot", rarity: "uncommon" },
    { key: "fudgePartridge", name: "🍫 Fudge Partridge", rarity: "common" },
    { key: "licoricePeacock", name: "🖤 Licorice Peacock", rarity: "uncommon" },
    { key: "peppermintPekingese", name: "🍬 Peppermint Pekingese", rarity: "common" },
    { key: "jawbreakerPelican", name: "🔴 Jawbreaker Pelican", rarity: "uncommon" },
    { key: "trufflePenguin", name: "🍫 Truffle Penguin", rarity: "rare" },
    { key: "candycornPeregrine", name: "🌽 Candy Corn Peregrine", rarity: "uncommon" },
    { key: "sugarplumPersian", name: "👑 Sugarplum Persian", rarity: "common" },
    { key: "chocolatePheasant", name: "🐉 Chocolate Pheasant", rarity: "uncommon" },
    { key: "lollipopPig", name: "🗼 Lollipop Pig", rarity: "common" },
    { key: "gummyPigeon", name: "🐻 Gummy Pigeon", rarity: "common" },
    { key: "toffeePika", name: "🍬 Toffee Pika", rarity: "rare" },
    { key: "fudgePilot Whale", name: "🍫 Fudge Pilot Whale", rarity: "epic" },
    { key: "licoricePine Marten", name: "🖤 Licorice Pine Marten", rarity: "uncommon" },
    { key: "peppermintPiranha", name: "🍬 Peppermint Piranha", rarity: "rare" },
    { key: "jawbreakerPlatypus", name: "🔴 Jawbreaker Platypus", rarity: "legendary" },
    { key: "trufflePointer", name: "🍫 Truffle Pointer", rarity: "common" },
    { key: "candycornPolar Bear", name: "🌽 Candy Corn Polar Bear", rarity: "rare" },
    { key: "sugarplumPomeranian", name: "👑 Sugarplum Pomeranian", rarity: "common" },
    { key: "chocolatePorcupine", name: "🐉 Chocolate Porcupine", rarity: "uncommon" },
    { key: "lollipopPorpoise", name: "🗼 Lollipop Porpoise", rarity: "rare" },
    { key: "gummyPossum", name: "🐻 Gummy Possum", rarity: "uncommon" },
    { key: "toffeePrairie Dog", name: "🍬 Toffee Prairie Dog", rarity: "uncommon" },
    { key: "fudgePrawn", name: "🍫 Fudge Prawn", rarity: "common" },
    { key: "licoricePronghorn", name: "🖤 Licorice Pronghorn", rarity: "rare" },
    { key: "peppermintPug", name: "🍬 Peppermint Pug", rarity: "common" },
    { key: "jawbreakerPuma", name: "🔴 Jawbreaker Puma", rarity: "rare" },
    { key: "truffleQuail", name: "🍫 Truffle Quail", rarity: "common" },
    { key: "candycornQuokka", name: "🌽 Candy Corn Quokka", rarity: "epic" },
    { key: "sugarplumRabbit", name: "👑 Sugarplum Rabbit", rarity: "common" },
    { key: "chocolateRaccoon", name: "🐉 Chocolate Raccoon", rarity: "uncommon" },
    { key: "lollipopRagdoll", name: "🗼 Lollipop Ragdoll", rarity: "common" },
    { key: "gummyRat", name: "🐻 Gummy Rat", rarity: "common" },
    { key: "toffeeRattlesnake", name: "🍬 Toffee Rattlesnake", rarity: "rare" },
    { key: "fudgeRaven", name: "🍫 Fudge Raven", rarity: "uncommon" },
    { key: "licoriceRed Fox", name: "🖤 Licorice Red Fox", rarity: "uncommon" },
    { key: "peppermintRed Panda", name: "🍬 Peppermint Red Panda", rarity: "legendary" },
    { key: "jawbreakerReindeer", name: "🔴 Jawbreaker Reindeer", rarity: "rare" },
    { key: "truffleRhinoceros", name: "🍫 Truffle Rhinoceros", rarity: "epic" },
    { key: "candycornRobin", name: "🌽 Candy Corn Robin", rarity: "common" },
    { key: "sugarplumRockfish", name: "👑 Sugarplum Rockfish", rarity: "common" },
    { key: "chocolateRottweiler", name: "🐉 Chocolate Rottweiler", rarity: "common" },
    { key: "lollipopSaber-Toothed Tiger", name: "🗼 Lollipop Saber-Toothed Tiger", rarity: "legendary" },
    { key: "gummySalamander", name: "🐻 Gummy Salamander", rarity: "rare" },
    { key: "toffeeSalmon", name: "🍬 Toffee Salmon", rarity: "common" },
    { key: "fudgeSardine", name: "🍫 Fudge Sardine", rarity: "common" },
    { key: "licoriceSawfish", name: "🖤 Licorice Sawfish", rarity: "rare" },
    { key: "peppermintScorpion", name: "🍬 Peppermint Scorpion", rarity: "uncommon" },
    { key: "jawbreakerSea Lion", name: "🔴 Jawbreaker Sea Lion", rarity: "uncommon" },
    { key: "truffleSea Otter", name: "🍫 Truffle Sea Otter", rarity: "rare" },
    { key: "candycornSea Turtle", name: "🌽 Candy Corn Sea Turtle", rarity: "rare" },
    { key: "sugarplumSeal", name: "👑 Sugarplum Seal", rarity: "uncommon" },
    { key: "chocolateShark", name: "🐉 Chocolate Shark", rarity: "rare" },
    { key: "lollipopSheep", name: "🗼 Lollipop Sheep", rarity: "common" },
    { key: "gummyShrimp", name: "🐻 Gummy Shrimp", rarity: "common" },
    { key: "toffeeSiamese", name: "🍬 Toffee Siamese", rarity: "common" },
    { key: "fudgeSiberian", name: "🍫 Fudge Siberian", rarity: "common" },
    { key: "licoriceSiberian Husky", name: "🖤 Licorice Siberian Husky", rarity: "common" },
    { key: "peppermintSilver Fox", name: "🍬 Peppermint Silver Fox", rarity: "rare" },
    { key: "jawbreakerSkunk", name: "🔴 Jawbreaker Skunk", rarity: "uncommon" },
    { key: "truffleSloth", name: "🍫 Truffle Sloth", rarity: "rare" },
    { key: "candycornSnail", name: "🌽 Candy Corn Snail", rarity: "common" },
    { key: "sugarplumSnake", name: "👑 Sugarplum Snake", rarity: "uncommon" },
    { key: "chocolateSnow Leopard", name: "🐉 Chocolate Snow Leopard", rarity: "legendary" },
    { key: "lollipopSomali", name: "🗼 Lollipop Somali", rarity: "common" },
    { key: "gummySpectacled Bear", name: "🐻 Gummy Spectacled Bear", rarity: "rare" },
    { key: "toffeeSperm Whale", name: "🍬 Toffee Sperm Whale", rarity: "epic" },
    { key: "fudgeSpider", name: "🍫 Fudge Spider", rarity: "uncommon" },
    { key: "licoriceSpider Monkey", name: "🖤 Licorice Spider Monkey", rarity: "rare" },
    { key: "peppermintSquid", name: "🍬 Peppermint Squid", rarity: "rare" },
    { key: "jawbreakerSquirrel", name: "🔴 Jawbreaker Squirrel", rarity: "common" },
    { key: "truffleStarfish", name: "🍫 Truffle Starfish", rarity: "common" },
    { key: "candycornStingray", name: "🌽 Candy Corn Stingray", rarity: "rare" },
    { key: "sugarplumStoat", name: "👑 Sugarplum Stoat", rarity: "uncommon" },
    { key: "chocolateSturgeon", name: "🐉 Chocolate Sturgeon", rarity: "rare" },
    { key: "lollipopSwan", name: "🗼 Lollipop Swan", rarity: "common" },
    { key: "gummyTarantula", name: "🐻 Gummy Tarantula", rarity: "uncommon" },
    { key: "toffeeTarsier", name: "🍬 Toffee Tarsier", rarity: "rare" },
    { key: "fudgeTasmanian Devil", name: "🍫 Fudge Tasmanian Devil", rarity: "epic" },
    { key: "licoriceTermite", name: "🖤 Licorice Termite", rarity: "common" },
    { key: "peppermintTetra", name: "🍬 Peppermint Tetra", rarity: "common" },
    { key: "jawbreakerThrush", name: "🔴 Jawbreaker Thrush", rarity: "common" },
    { key: "truffleTiger", name: "🍫 Truffle Tiger", rarity: "rare" },
    { key: "candycornTiger Shark", name: "🌽 Candy Corn Tiger Shark", rarity: "epic" },
    { key: "sugarplumToad", name: "👑 Sugarplum Toad", rarity: "common" },
    { key: "chocolateTortoise", name: "🐉 Chocolate Tortoise", rarity: "rare" },
    { key: "lollipopToucan", name: "🗼 Lollipop Toucan", rarity: "uncommon" },
    { key: "gummyTree Frog", name: "🐻 Gummy Tree Frog", rarity: "uncommon" },
    { key: "toffeeTropicbird", name: "🍬 Toffee Tropicbird", rarity: "rare" },
    { key: "fudgeTrout", name: "🍫 Fudge Trout", rarity: "common" },
    { key: "licoriceTuatara", name: "🖤 Licorice Tuatara", rarity: "epic" },
    { key: "peppermintTurkey", name: "🍬 Peppermint Turkey", rarity: "common" },
    { key: "jawbreakerTurtle", name: "🔴 Jawbreaker Turtle", rarity: "uncommon" },
    { key: "truffleUakari", name: "🍫 Truffle Uakari", rarity: "rare" },
    { key: "candycornUmbrellabird", name: "🌽 Candy Corn Umbrellabird", rarity: "epic" },
    { key: "sugarplumUnicorn", name: "👑 Sugarplum Unicorn", rarity: "legendary" },
    { key: "chocolateVampire Bat", name: "🐉 Chocolate Vampire Bat", rarity: "rare" },
    { key: "lollipopVicuña", name: "🗼 Lollipop Vicuña", rarity: "rare" },
    { key: "gummyViper", name: "🐻 Gummy Viper", rarity: "uncommon" },
    { key: "toffeeVole", name: "🍬 Toffee Vole", rarity: "common" },
    { key: "fudgeVulture", name: "🍫 Fudge Vulture", rarity: "uncommon" },
    { key: "licoriceWallaby", name: "🖤 Licorice Wallaby", rarity: "uncommon" },
    { key: "peppermintWalrus", name: "🍬 Peppermint Walrus", rarity: "rare" },
    { key: "jawbreakerWarbler", name: "🔴 Jawbreaker Warbler", rarity: "common" },
    { key: "truffleWasp", name: "🍫 Truffle Wasp", rarity: "common" },
    { key: "candycornWater Buffalo", name: "🌽 Candy Corn Water Buffalo", rarity: "rare" },
    { key: "sugarplumWaterfowl", name: "👑 Sugarplum Waterfowl", rarity: "common" },
    { key: "chocolateWaxwing", name: "🐉 Chocolate Waxwing", rarity: "uncommon" },
    { key: "lollipopWeasel", name: "🗼 Lollipop Weasel", rarity: "uncommon" },
    { key: "gummyWhale", name: "🐻 Gummy Whale", rarity: "epic" },
    { key: "toffeeWhippet", name: "🍬 Toffee Whippet", rarity: "uncommon" },
    { key: "fudgeWhite-tailed Deer", name: "🍫 Fudge White-tailed Deer", rarity: "rare" },
    { key: "licoriceWild Boar", name: "🖤 Licorice Wild Boar", rarity: "uncommon" },
    { key: "peppermintWildebeest", name: "🍬 Peppermint Wildebeest", rarity: "rare" },
    { key: "jawbreakerWolf", name: "🔴 Jawbreaker Wolf", rarity: "rare" },
    { key: "truffleWolverine", name: "🍫 Truffle Wolverine", rarity: "epic" },
    { key: "candycornWombat", name: "🌽 Candy Corn Wombat", rarity: "rare" },
    { key: "sugarplumWoodpecker", name: "👑 Sugarplum Woodpecker", rarity: "common" },
    { key: "chocolateWorm", name: "🐉 Chocolate Worm", rarity: "common" },
    { key: "lollipopWren", name: "🗼 Lollipop Wren", rarity: "common" },
    { key: "gummyYak", name: "🐻 Gummy Yak", rarity: "rare" },
    { key: "toffeeYellowjacket", name: "🍬 Toffee Yellowjacket", rarity: "common" },
    { key: "fudgeZebra", name: "🍫 Fudge Zebra", rarity: "rare" },
    { key: "licoriceZebu", name: "🖤 Licorice Zebu", rarity: "rare" },
    { key: "peppermintZorilla", name: "🍬 Peppermint Zorilla", rarity: "legendary" },
    { key: "jawbreakerZorse", name: "🔴 Jawbreaker Zorse", rarity: "legendary" }
  ];

  var ALL_GHOSTS = GHOSTS.concat(EXTRA_GHOSTS);

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function smoothstep(t) { return t * t * (3 - 2 * t); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOutBack(t) { var c1 = 1.70158; var c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function easeOutElastic(t) { var c4 = (2 * Math.PI) / 3; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; }
  function easeOutBounce(t) { var n1 = 7.5625; var d1 = 2.75; if (t < 1 / d1) return n1 * t * t; else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75; else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375; else return n1 * (t -= 2.625 / d1) * t + 0.984375; }
  function easeInQuad(t) { return t * t; }
  function easeOutQuad(t) { return t * (2 - t); }
  function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
  function easeInCubic(t) { return t * t * t; }
  function easeInQuart(t) { return t * t * t * t; }
  function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
  function easeInOutQuart(t) { return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; }
  function easeInQuint(t) { return t * t * t * t * t; }
  function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); }
  function easeInOutQuint(t) { return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(2 * t + 2, 5) / 2; }
  function easeInSine(t) { return 1 - Math.cos((t * Math.PI) / 2); }
  function easeOutSine(t) { return Math.sin((t * Math.PI) / 2); }
  function easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }
  function easeInExpo(t) { return t === 0 ? 0 : Math.pow(2, 10 * t - 10); }
  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function easeInOutExpo(t) { return t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2; }
  function easeInCirc(t) { return 1 - Math.sqrt(1 - t * t); }
  function easeOutCirc(t) { return Math.sqrt(1 - Math.pow(t - 1, 2)); }
  function easeInOutCirc(t) { return t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2; }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c / 2;
    var r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) { return clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'); }).join('');
  }

  function lerpColor(c1, c2, t) {
    return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
  }

  function randomRange(rng, min, max) { return min + rng.nextDouble() * (max - min); }
  function randomInt(rng, min, max) { return Math.floor(randomRange(rng, min, max + 1)); }
  function pickRandom(rng, arr) { return arr[Math.floor(rng.nextDouble() * arr.length)]; }

  function createParticleSystem() {
    return {
      particles: [],
      emit: function (x, y, opts) {
        opts = opts || {};
        var count = opts.count || 10;
        var speed = opts.speed || 3;
        var life = opts.life || 1;
        var colors = opts.colors || ['#fff'];
        var size = opts.size || 3;
        var gravity = opts.gravity || 0;
        var spread = opts.spread || Math.PI * 2;
        var angle = opts.angle || 0;
        for (var i = 0; i < count; i++) {
          var a = angle + (Math.random() - 0.5) * spread;
          var v = speed * (0.5 + Math.random() * 0.5);
          this.particles.push({
            x: x, y: y,
            vx: Math.cos(a) * v, vy: Math.sin(a) * v,
            life: life * (0.5 + Math.random() * 0.5),
            maxLife: life,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: size * (0.5 + Math.random() * 0.5),
            gravity: gravity
          });
        }
      },
      update: function (dt) {
        for (var i = this.particles.length - 1; i >= 0; i--) {
          var p = this.particles[i];
          p.x += p.vx * dt * 60;
          p.y += p.vy * dt * 60;
          p.vy += p.gravity * dt * 60;
          p.life -= dt;
          if (p.life <= 0) this.particles.splice(i, 1);
        }
      },
      draw: function (ctx) {
        this.particles.forEach(function (p) {
          ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      },
      clear: function () { this.particles = []; }
    };
  }

  function createShockwave() {
    return {
      rings: [],
      emit: function (x, y, opts) {
        opts = opts || {};
        this.rings.push({
          x: x, y: y,
          r: opts.startR || 5,
          maxR: opts.maxR || 100,
          life: opts.life || 0.5,
          maxLife: opts.life || 0.5,
          color: opts.color || '#fff',
          width: opts.width || 3
        });
      },
      update: function (dt) {
        for (var i = this.rings.length - 1; i >= 0; i--) {
          var r = this.rings[i];
          r.life -= dt;
          var t = 1 - r.life / r.maxLife;
          r.r = lerp(5, r.maxR, easeOutCubic(t));
          if (r.life <= 0) this.rings.splice(i, 1);
        }
      },
      draw: function (ctx) {
        this.rings.forEach(function (r) {
          ctx.globalAlpha = clamp(r.life / r.maxLife, 0, 1);
          ctx.strokeStyle = r.color;
          ctx.lineWidth = r.width * (r.life / r.maxLife);
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
      },
      clear: function () { this.rings = []; }
    };
  }

  function createFloatingText() {
    return {
      texts: [],
      emit: function (x, y, str, opts) {
        opts = opts || {};
        this.texts.push({
          x: x, y: y,
          str: str,
          vy: opts.vy || -1.5,
          life: opts.life || 1.2,
          maxLife: opts.life || 1.2,
          color: opts.color || '#ffd166',
          size: opts.size || 16,
          weight: opts.weight || 'bold'
        });
      },
      update: function (dt) {
        for (var i = this.texts.length - 1; i >= 0; i--) {
          var t = this.texts[i];
          t.y += t.vy * dt * 60;
          t.life -= dt;
          if (t.life <= 0) this.texts.splice(i, 1);
        }
      },
      draw: function (ctx) {
        this.texts.forEach(function (t) {
          ctx.globalAlpha = clamp(t.life / t.maxLife, 0, 1);
          ctx.font = t.weight + ' ' + t.size + 'px sans-serif';
          ctx.fillStyle = t.color;
          ctx.textAlign = 'center';
          ctx.fillText(t.str, t.x, t.y);
        });
        ctx.globalAlpha = 1;
      },
      clear: function () { this.texts = []; }
    };
  }

  var api = { SeededRNG: SeededRNG, carveDFS: carveDFS, connected: connected, astar: astar, ease: ease, comboMult: comboMult, streakBonus: streakBonus, compact: compact, key: key,
    PICKS: PICKS, LAYERS: LAYERS, RELICS: RELICS, FISH: FISH, FISH_WEIGHT: FISH_WEIGHT, xpNext: xpNext,
    mIdentity: mIdentity, mMul: mMul, mPerspective: mPerspective, mLookAt: mLookAt, mTransform: mTransform, GHOSTS: ALL_GHOSTS, CANDIES: CANDIES, MINIGAMES: MINIGAMES, REGIONS: REGIONS, ORES: ORES,
    voxelRay: voxelRay, makeNoise2D: makeNoise2D, SWEETS: SWEETS, pickSweet: pickSweet,
    lerp: lerp, clamp: clamp, smoothstep: smoothstep,
    easeOutCubic: easeOutCubic, easeInOutCubic: easeInOutCubic, easeOutBack: easeOutBack,
    easeOutElastic: easeOutElastic, easeOutBounce: easeOutBounce,
    easeInQuad: easeInQuad, easeOutQuad: easeOutQuad, easeInOutQuad: easeInOutQuad,
    easeInCubic: easeInCubic, easeInQuart: easeInQuart, easeOutQuart: easeOutQuart,
    easeInOutQuart: easeInOutQuart, easeInQuint: easeInQuint, easeOutQuint: easeOutQuint, easeInOutQuint: easeInOutQuint,
    easeInSine: easeInSine, easeOutSine: easeOutSine, easeInOutSine: easeInOutSine,
    easeInExpo: easeInExpo, easeOutExpo: easeOutExpo, easeInOutExpo: easeInOutExpo,
    easeInCirc: easeInCirc, easeOutCirc: easeOutCirc, easeInOutCirc: easeInOutCirc,
    hslToRgb: hslToRgb, rgbToHex: rgbToHex, lerpColor: lerpColor,
    randomRange: randomRange, randomInt: randomInt, pickRandom: pickRandom,
    createParticleSystem: createParticleSystem, createShockwave: createShockwave, createFloatingText: createFloatingText };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Spooky = api;
})(typeof self !== 'undefined' ? self : this);
