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

  var api = { SeededRNG: SeededRNG, carveDFS: carveDFS, connected: connected, astar: astar, ease: ease, comboMult: comboMult, streakBonus: streakBonus, compact: compact, key: key,
    PICKS: PICKS, LAYERS: LAYERS, RELICS: RELICS, FISH: FISH, FISH_WEIGHT: FISH_WEIGHT, xpNext: xpNext };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Spooky = api;
})(typeof self !== 'undefined' ? self : this);
