/* ==========================================================================
 *  ENDLESS SPOOKY FOREST — world.js
 *  A chunk-streamed procedural forest. X and Z are unbounded; Y is a full
 *  96-metre vertical playground (ground, tall pines, floating spirit isles
 *  and a sky you can fly through). Every chunk is deterministic from the
 *  seed, so walking away and returning finds the same woods.
 * ========================================================================== */
(function (root) {
  'use strict';

  var SF = root.SpookyForest = root.SpookyForest || {};
  var U = SF.Util;
  var MB = SF.MeshBuilder;

  var CHUNK = 16;
  var WATER = 0.45;
  var MIN_Y = -18;
  var MAX_Y = 78;

  /* ------------------------------------------------------------------ */
  /*  Biomes                                                             */
  /* ------------------------------------------------------------------ */
  var BIOMES = {
    pine: {
      key: 'pine', name: 'Whispering Pines', icon: '🌲',
      ground: [0.20, 0.31, 0.16], ground2: [0.26, 0.36, 0.20],
      grass: [0.28, 0.48, 0.22], grass2: [0.42, 0.62, 0.26],
      leaf: [0.09, 0.28, 0.18], leaf2: [0.16, 0.38, 0.22],
      fog: [0.10, 0.15, 0.14], sky: [0.05, 0.08, 0.12],
      treeDensity: 0.72, rabbitDensity: 1.0, carrotChance: 0.16,
      trees: ['spruce', 'spruce', 'pine', 'deadOak'],
      ambient: ['wind', 'owl', 'crackle']
    },
    pumpkin: {
      key: 'pumpkin', name: 'Pumpkin Hollow', icon: '🎃',
      ground: [0.28, 0.22, 0.12], ground2: [0.38, 0.28, 0.15],
      grass: [0.46, 0.35, 0.16], grass2: [0.62, 0.46, 0.20],
      leaf: [0.34, 0.16, 0.07], leaf2: [0.55, 0.26, 0.09],
      fog: [0.18, 0.11, 0.08], sky: [0.10, 0.06, 0.08],
      treeDensity: 0.48, rabbitDensity: 1.2, carrotChance: 0.34,
      trees: ['pumpkinTree', 'spruce', 'deadOak', 'oak'],
      ambient: ['wind', 'crackle', 'chirp']
    },
    meadow: {
      key: 'meadow', name: 'Misty Meadow', icon: '🌾',
      ground: [0.24, 0.30, 0.18], ground2: [0.31, 0.38, 0.22],
      grass: [0.42, 0.56, 0.25], grass2: [0.60, 0.70, 0.32],
      leaf: [0.25, 0.42, 0.18], leaf2: [0.38, 0.55, 0.22],
      fog: [0.20, 0.24, 0.24], sky: [0.12, 0.14, 0.18],
      treeDensity: 0.34, rabbitDensity: 2.0, carrotChance: 0.42,
      trees: ['oak', 'birch', 'willow', 'oak'],
      ambient: ['chirp', 'wind', 'rabbit']
    },
    deadwood: {
      key: 'deadwood', name: 'Ashen Grove', icon: '🪵',
      ground: [0.19, 0.17, 0.15], ground2: [0.26, 0.23, 0.19],
      grass: [0.30, 0.28, 0.22], grass2: [0.38, 0.35, 0.26],
      leaf: [0.16, 0.13, 0.10], leaf2: [0.22, 0.18, 0.13],
      fog: [0.13, 0.12, 0.12], sky: [0.08, 0.07, 0.09],
      treeDensity: 0.55, rabbitDensity: 0.7, carrotChance: 0.08,
      trees: ['deadOak', 'twisted', 'charred', 'deadOak'],
      ambient: ['wind', 'crow', 'creak']
    },
    frost: {
      key: 'frost', name: 'Frostveil', icon: '❄️',
      ground: [0.42, 0.48, 0.54], ground2: [0.54, 0.60, 0.66],
      grass: [0.62, 0.72, 0.80], grass2: [0.78, 0.86, 0.92],
      leaf: [0.20, 0.40, 0.42], leaf2: [0.35, 0.55, 0.56],
      fog: [0.42, 0.48, 0.56], sky: [0.16, 0.20, 0.28],
      treeDensity: 0.58, rabbitDensity: 0.6, carrotChance: 0.04,
      trees: ['frostPine', 'frostPine', 'iceTree', 'deadOak'],
      ambient: ['wind', 'ice', 'owl']
    }
  };
  var BIOME_LIST = [BIOMES.pine, BIOMES.pumpkin, BIOMES.meadow, BIOMES.deadwood, BIOMES.frost];

  /* ------------------------------------------------------------------ */
  /*  World                                                              */
  /* ------------------------------------------------------------------ */
  function World(seed, opts) {
    opts = opts || {};
    this.seed = (seed === undefined || seed === null) ? 20261031 : (seed | 0);
    this.chunks = new Map();
    this.generatedCount = 0;
    this.removedCount = 0;
    this.lastStream = { generated: 0, removed: 0 };
    this.maxLoaded = 0;
    this.onChunkGenerated = opts.onChunkGenerated || null;
    this.spawn = null;
    this._heightCache = new Map();
  }

  World.CHUNK = CHUNK;
  World.WATER = WATER;
  World.MIN_Y = MIN_Y;
  World.MAX_Y = MAX_Y;
  World.BIOMES = BIOMES;

  World.prototype.key = function (cx, cz) { return cx + ',' + cz; };
  World.prototype.chunkCoord = function (x) { return Math.floor(x / CHUNK); };

  /* Terrain height. A gentle clearing is blended around the origin so the
   * opening camp always has level ground. */
  World.prototype.heightAt = function (x, z) {
    var s = this.seed;
    var continent = U.fbm2(x * 0.0034, z * 0.0034, s + 11, 5);
    var hills = U.fbm2(x * 0.016, z * 0.016, s + 97, 4);
    var ridge = U.ridged2(x * 0.0085, z * 0.0085, s + 43, 3);
    var h = -5.2 + continent * 17.5 + hills * 8.5 + ridge * 7.5;

    // Carve shallow misty ponds in low, wet pockets.
    var pond = U.fbm2(x * 0.006 + 100, z * 0.006 - 50, s + 311, 3);
    if (pond < 0.34) h -= (0.34 - pond) * 26;

    // Clearings flatten around camp sites (hidden in the noise).
    var clear = U.fbm2(x * 0.011 - 40, z * 0.011 + 70, s + 601, 2);
    if (clear > 0.63) h = U.lerp(h, h * 0.35 + 1.2, U.smoothstep(0.63, 0.78, clear) * 0.55);

    // Origin meadow.
    var d0 = Math.sqrt(x * x + z * z);
    var blend = U.smoothstep(5, 24, d0);
    h = U.lerp(2.3, h, blend);
    return h;
  };

  World.prototype.slopeAt = function (x, z) {
    var e = 1.2;
    var hx = this.heightAt(x + e, z) - this.heightAt(x - e, z);
    var hz = this.heightAt(x, z + e) - this.heightAt(x, z - e);
    return Math.sqrt(hx * hx + hz * hz) / (e * 2);
  };

  World.prototype.biomeAt = function (x, z) {
    var s = this.seed;
    var temp = U.fbm2(x * 0.0019, z * 0.0019, s + 1201, 4);
    var moist = U.fbm2(x * 0.0026 + 30, z * 0.0026 - 20, s + 2203, 4);
    var magic = U.fbm2(x * 0.0014 - 11, z * 0.0014 + 7, s + 3301, 3);
    var h = this.heightAt(x, z);
    temp -= U.clamp(h / 90, 0, 0.18);
    if (temp < 0.34) return BIOMES.frost;
    if (magic > 0.64) return BIOMES.pumpkin;
    if (moist > 0.63) return BIOMES.meadow;
    if (moist < 0.35 && temp > 0.58) return BIOMES.deadwood;
    return BIOMES.pine;
  };

  World.prototype.biomeName = function (x, z) { return this.biomeAt(x, z).name; };

  World.prototype.waterAt = function (x, z) { return this.heightAt(x, z) < WATER; };

  World.prototype.surfaceAt = function (x, z) {
    // Floating islands are handled separately; terrain is the fallback.
    return this.heightAt(x, z);
  };

  /* ------------------------------------------------------------------ */
  /*  Chunk generation                                                   */
  /* ------------------------------------------------------------------ */
  World.prototype.generateChunk = function (cx, cz) {
    var key = this.key(cx, cz);
    var existing = this.chunks.get(key);
    if (existing) return existing;

    var rng = new U.RNG(U.hash2(cx, cz, this.seed + 90210));
    var ox = cx * CHUNK, oz = cz * CHUNK;
    var centerBiome = this.biomeAt(ox + CHUNK / 2, oz + CHUNK / 2);
    var chunk = {
      key: key, cx: cx, cz: cz, ox: ox, oz: oz,
      biome: centerBiome,
      heights: new Float32Array((CHUNK + 1) * (CHUNK + 1)),
      props: [], trees: [], rocks: [], carrotPatches: [], campfireSites: [],
      burrows: [], ruins: [], floaters: [], waterCells: 0,
      meshData: null, waterData: null, bounds: null,
      generatedAt: 0, rand: rng
    };

    // Height grid (shared edges with neighbouring chunks).
    for (var i = 0; i <= CHUNK; i++) {
      for (var j = 0; j <= CHUNK; j++) {
        chunk.heights[i * (CHUNK + 1) + j] = this.heightAt(ox + i, oz + j);
      }
    }

    var clearings = [];
    var isSpawnChunk = (cx === 0 && cz === 0);

    /* ---- Campfire sites ------------------------------------------- */
    var wantCamp = isSpawnChunk || rng.chance(0.16);
    if (wantCamp && !this._nearCamp(cx, cz)) {
      var campX, campZ;
      if (isSpawnChunk) { campX = 6.5; campZ = 4.5; }
      else {
        campX = ox + rng.range(3.5, CHUNK - 3.5);
        campZ = oz + rng.range(3.5, CHUNK - 3.5);
      }
      var campY = this.heightAt(campX, campZ);
      if (campY > WATER + 0.7 && this.slopeAt(campX, campZ) < 0.55) {
        chunk.campfireSites.push({
          id: 'fire-' + cx + '-' + cz,
          x: campX, y: campY, z: campZ,
          variant: isSpawnChunk ? 'home' : rng.pick(['ring', 'ring', 'skull', 'stones']),
          name: isSpawnChunk ? 'The First Hearth' : rng.pick(U.NAMES.campfire),
          home: isSpawnChunk
        });
        clearings.push({ x: campX, z: campZ, r: 5.4 });
      }
    }

    /* ---- Rabbit burrows ------------------------------------------- */
    var wantBurrow = isSpawnChunk || rng.chance(0.34 * centerBiome.rabbitDensity / 2);
    if (wantBurrow) {
      var bx, bz;
      if (isSpawnChunk) { bx = 3.0; bz = -6.0; }
      else { bx = ox + rng.range(2.5, CHUNK - 2.5); bz = oz + rng.range(2.5, CHUNK - 2.5); }
      var by = this.heightAt(bx, bz);
      if (by > WATER + 0.5) {
        chunk.burrows.push({
          id: 'warren-' + cx + '-' + cz,
          x: bx, y: by, z: bz, radius: rng.range(1.1, 1.8),
          family: rng.range(1, 4), variant: rng.pick(['mound', 'roots', 'hollow'])
        });
        clearings.push({ x: bx, z: bz, r: 1.8 });
      }
    }

    /* ---- Carrot patches ------------------------------------------- */
    var patchCount = isSpawnChunk ? 1 : (rng.chance(centerBiome.carrotChance) ? (rng.chance(0.24) ? 2 : 1) : 0);
    for (var pc = 0; pc < patchCount; pc++) {
      var px = isSpawnChunk && pc === 0 ? -5.0 : ox + rng.range(3, CHUNK - 3);
      var pz = isSpawnChunk && pc === 0 ? 3.0 : oz + rng.range(3, CHUNK - 3);
      var py = this.heightAt(px, pz);
      if (py < WATER + 0.4) continue;
      var plantCount = rng.int(4, 9);
      var plants = [];
      for (var pi = 0; pi < plantCount; pi++) {
        var a = rng.next() * Math.PI * 2;
        var rr = Math.sqrt(rng.next()) * 2.4;
        var gx = px + Math.cos(a) * rr;
        var gz = pz + Math.sin(a) * rr;
        plants.push({
          id: 'carrot-' + cx + '-' + cz + '-' + pc + '-' + pi,
          x: gx, y: this.heightAt(gx, gz), z: gz,
          stage: rng.int(0, 3),
          variant: rng.int(0, 2),
          rotation: rng.next() * Math.PI * 2,
          scale: rng.range(0.85, 1.15),
          wild: true
        });
      }
      chunk.carrotPatches.push({ id: 'patch-' + cx + '-' + cz + '-' + pc, x: px, y: py, z: pz, plants: plants });
      clearings.push({ x: px, z: pz, r: 3.0 });
    }

    /* ---- Ruins, lanterns and small story props -------------------- */
    if (rng.chance(0.055) && !isSpawnChunk) {
      var rx = ox + rng.range(4, CHUNK - 4), rz = oz + rng.range(4, CHUNK - 4);
      var ry = this.heightAt(rx, rz);
      if (ry > WATER + 0.4) {
        chunk.ruins.push({ x: rx, y: ry, z: rz, kind: rng.pick(['arch', 'circle', 'grave', 'fence', 'scarecrow', 'shrine']), rot: rng.next() * 6.28 });
        clearings.push({ x: rx, z: rz, r: 3.4 });
      }
    }

    /* ---- Trees ---------------------------------------------------- */
    var treeCount = Math.max(1, Math.round((centerBiome.treeDensity * CHUNK * CHUNK) / 145));
    var attempts = treeCount * 4;
    for (var t = 0; t < attempts && chunk.trees.length < treeCount; t++) {
      var tx = ox + rng.range(1.2, CHUNK - 1.2);
      var tz = oz + rng.range(1.2, CHUNK - 1.2);
      var th = this.heightAt(tx, tz);
      if (th < WATER + 0.75) continue;
      if (this.slopeAt(tx, tz) > 0.85) continue;
      var blocked = false;
      for (var c = 0; c < clearings.length; c++) {
        if (U.dist2(tx, tz, clearings[c].x, clearings[c].z) < clearings[c].r * clearings[c].r) { blocked = true; break; }
      }
      if (blocked) continue;
      for (var tt = 0; tt < chunk.trees.length; tt++) {
        if (U.dist2(tx, tz, chunk.trees[tt].x, chunk.trees[tt].z) < 7) { blocked = true; break; }
      }
      if (blocked) continue;
      var type = rng.pick(centerBiome.trees);
      var scale = rng.range(type === 'spruce' || type === 'frostPine' ? 0.75 : 0.8, 1.35);
      var tree = {
        type: type, x: tx, y: th, z: tz,
        scale: scale, rotation: rng.next() * Math.PI * 2,
        seed: rng.next() * 10000,
        radius: (type === 'birch' ? 0.26 : 0.4) * scale,
        height: 6 * scale
      };
      chunk.trees.push(tree);
      chunk.props.push({ kind: 'tree', x: tx, y: th, z: tz, radius: tree.radius, height: tree.height, solid: true });
    }

    /* ---- Rocks, bushes, mushrooms, grass, flowers ----------------- */
    var details = isSpawnChunk ? 40 : 26 + Math.floor(rng.next() * 24);
    for (var d = 0; d < details; d++) {
      var dx = ox + rng.range(0.6, CHUNK - 0.6);
      var dz = oz + rng.range(0.6, CHUNK - 0.6);
      var dy = this.heightAt(dx, dz);
      if (dy < WATER + 0.15) continue;
      var roll = rng.next();
      if (roll < 0.12) {
        var rockR = rng.range(0.3, 1.25);
        var rock = { x: dx, y: dy, z: dz, r: rockR, seed: rng.next() * 9999, mossy: rng.chance(0.55), scale: rng.range(0.7, 1.4) };
        chunk.rocks.push(rock);
        chunk.props.push({ kind: 'rock', x: dx, y: dy, z: dz, radius: rockR * 0.7, height: rockR, solid: true });
      } else if (roll < 0.28) {
        chunk.props.push({ kind: 'bush', x: dx, y: dy, z: dz, seed: rng.next() * 9999, radius: 0.5, solid: false });
      } else if (roll < 0.42) {
        chunk.props.push({ kind: 'mushroom', x: dx, y: dy, z: dz, seed: rng.next() * 9999, glow: rng.chance(centerBiome.key === 'pine' ? 0.35 : 0.18), solid: false });
      } else if (roll < 0.53) {
        chunk.props.push({ kind: 'pumpkin', x: dx, y: dy, z: dz, seed: rng.next() * 9999, lit: rng.chance(0.32), solid: false });
      } else if (roll < 0.62) {
        chunk.props.push({ kind: 'log', x: dx, y: dy, z: dz, seed: rng.next() * 9999, rot: rng.next() * 6.28, solid: false });
      } else if (roll < 0.70) {
        chunk.props.push({ kind: 'lantern', x: dx, y: dy, z: dz, seed: rng.next() * 9999, solid: false });
      } else {
        chunk.props.push({ kind: 'grass', x: dx, y: dy, z: dz, seed: rng.next() * 9999, color: rng.chance(0.3), solid: false });
      }
    }

    /* ---- Trees from biome edges get extra shrubs ------------------ */
    if (centerBiome.key === 'meadow') {
      for (var fl = 0; fl < 8; fl++) {
        var fx = ox + rng.range(1, CHUNK - 1), fz = oz + rng.range(1, CHUNK - 1);
        var fy = this.heightAt(fx, fz);
        if (fy > WATER + 0.2) chunk.props.push({ kind: 'flower', x: fx, y: fy, z: fz, seed: rng.next() * 9999, glow: rng.chance(0.2), solid: false });
      }
    }

    /* ---- Floating spirit isles ------------------------------------ */
    if (rng.chance(0.075) || isSpawnChunk) {
      var ix = ox + rng.range(3, CHUNK - 3);
      var iz = oz + rng.range(3, CHUNK - 3);
      var iy = isSpawnChunk ? 29 : rng.range(27, 46);
      chunk.floaters.push({
        x: ix, y: iy, z: iz, r: rng.range(2.6, 5.2),
        seed: rng.next() * 9999, trees: rng.int(1, 3),
        crystal: rng.chance(0.6), phase: rng.next() * 6.28
      });
    }

    // Build meshes now; generation is deterministic and this keeps render
    // syncing simple.
    this._buildMesh(chunk);
    this.chunks.set(key, chunk);
    this.generatedCount++;
    if (this.chunks.size > this.maxLoaded) this.maxLoaded = this.chunks.size;
    if (this.onChunkGenerated) this.onChunkGenerated(chunk);
    return chunk;
  };

  World.prototype._nearCamp = function (cx, cz) {
    // Campfires are deliberately sparse: at most one per 3x3 chunk block.
    for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) continue;
      var c = this.chunks.get(this.key(cx + dx, cz + dz));
      if (c && c.campfireSites && c.campfireSites.length) return true;
    }
    return false;
  };

  /* ------------------------------------------------------------------ */
  /*  Chunk meshing                                                      */
  /* ------------------------------------------------------------------ */
  World.prototype._buildMesh = function (chunk) {
    var b = new MB(24000);
    var w = new MB(2200);
    var ox = chunk.ox, oz = chunk.oz;
    b.push();
    b.translate(-ox, 0, -oz); // bake local chunk coordinates
    w.push();
    w.translate(-ox, 0, -oz);

    var hs = chunk.heights;
    var n = CHUNK + 1;
    var biome = chunk.biome;

    /* ---- ground --------------------------------------------------- */
    for (var i = 0; i < CHUNK; i++) {
      for (var j = 0; j < CHUNK; j++) {
        var wx = ox + i + 0.5, wz = oz + j + 0.5;
        var bcell = this.biomeAt(wx, wz);
        var h00 = hs[i * n + j];
        var h10 = hs[i * n + j + 1];
        var h01 = hs[(i + 1) * n + j];
        var h11 = hs[(i + 1) * n + j + 1];
        var slope = Math.abs(h10 - h00) + Math.abs(h01 - h00) + Math.abs(h11 - h00);
        var t = U.hash01(i + chunk.cx * CHUNK, j + chunk.cz * CHUNK, this.seed + 7);
        var ground = bcell.ground;
        var shade = 0.82 + t * 0.28 - U.clamp(slope, 0, 1.2) * 0.18;
        if (h00 < WATER + 0.05) {
          ground = [ground[0] * 0.6 + 0.08, ground[1] * 0.6 + 0.09, ground[2] * 0.6 + 0.07];
          shade *= 0.8;
        }
        var col = [ground[0] * shade, ground[1] * shade, ground[2] * shade];
        var p0 = [ox + i, h00, oz + j];
        var p1 = [ox + i, h10, oz + j + 1];
        var p2 = [ox + i + 1, h11, oz + j + 1];
        var p3 = [ox + i + 1, h01, oz + j];
        // Face normal from the heightfield.
        var ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
        var vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        var nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        b.quad(p0, p1, p2, p3, col, 0, [nx / nl, ny / nl, nz / nl]);

        if (h00 < WATER && h10 < WATER && h01 < WATER && h11 < WATER) {
          var wc = [0.10, 0.22, 0.30];
          var shimmer = 0.02 * Math.sin(wx * 1.7 + wz * 2.3);
          w.quad(
            [ox + i, WATER + 0.04, oz + j],
            [ox + i, WATER + 0.04, oz + j + 1],
            [ox + i + 1, WATER + 0.04, oz + j + 1],
            [ox + i + 1, WATER + 0.04, oz + j],
            [wc[0] + shimmer, wc[1] + shimmer, wc[2] + shimmer], 0.09, [0, 1, 0]
          );
          chunk.waterCells++;
        }
      }
    }

    /* ---- trees ---------------------------------------------------- */
    for (var t2 = 0; t2 < chunk.trees.length; t2++) {
      this._buildTree(b, chunk.trees[t2], new U.RNG((chunk.trees[t2].seed * 1000) | 0));
    }
    /* ---- rocks ---------------------------------------------------- */
    for (var r = 0; r < chunk.rocks.length; r++) {
      var rock = chunk.rocks[r];
      var rrng = new U.RNG((rock.seed * 1000) | 0);
      var rCol = [0.28 + rrng.next() * 0.12, 0.29 + rrng.next() * 0.1, 0.28 + rrng.next() * 0.1];
      b.rock(rock.x, rock.y + rock.r * 0.25, rock.z, rock.r, rrng, rCol, 0);
      if (rock.mossy) {
        b.ellipsoid(rock.x, rock.y + rock.r * 0.75, rock.z, rock.r * 0.7, rock.r * 0.16, rock.r * 0.6, 7, 3, biome.grass, 0);
      }
    }
    /* ---- small props ---------------------------------------------- */
    for (var p = 0; p < chunk.props.length; p++) {
      var prop = chunk.props[p];
      if (prop.kind === 'tree' || prop.kind === 'rock') continue;
      this._buildProp(b, prop, biome);
    }
    /* ---- ruins ---------------------------------------------------- */
    for (var ru = 0; ru < chunk.ruins.length; ru++) {
      this._buildRuin(b, chunk.ruins[ru], biome);
    }
    /* ---- floating islands ----------------------------------------- */
    for (var fi = 0; fi < chunk.floaters.length; fi++) {
      this._buildFloater(b, chunk.floaters[fi], biome);
    }

    b.pop();
    w.pop();

    // Summary bounds for frustum culling.
    var minY = 999, maxY = -999;
    for (var h = 0; h < hs.length; h++) {
      if (hs[h] < minY) minY = hs[h];
      if (hs[h] > maxY) maxY = hs[h];
    }
    chunk.bounds = {
      center: [CHUNK / 2, (minY + maxY) / 2, CHUNK / 2],
      radius: Math.sqrt(CHUNK * CHUNK * 0.5 + (maxY - minY + 24) * (maxY - minY + 24) * 0.25) + 8
    };

    if (b.count > 0) {
      b.trim();
      chunk.meshData = b.toArrays();
    } else chunk.meshData = null;

    if (w.count > 0) {
      w.trim();
      chunk.waterData = w.toArrays();
    } else chunk.waterData = null;
  };

  /* ------------------------------------------------------------------ */
  /*  Prop builders                                                      */
  /* ------------------------------------------------------------------ */
  World.prototype._buildTree = function (b, tree, rng) {
    var x = tree.x, y = tree.y, z = tree.z, s = tree.scale;
    var biome = tree._biome || this.biomeAt(x, z);
    var leaf = biome.leaf;
    var leaf2 = biome.leaf2;
    var bark = [0.26, 0.17, 0.10];
    var barkDark = [0.17, 0.11, 0.07];
    var type = tree.type;

    b.push();
    b.translate(x, y, z);
    b.rotateY(tree.rotation);
    b.scale(s, s, s);

    // Roots anchor every tree to the slope.
    for (var rt = 0; rt < 4; rt++) {
      var ra = (rt / 4) * Math.PI * 2 + rng.next() * 0.4;
      b.push();
      b.translate(Math.cos(ra) * 0.18, 0.08, Math.sin(ra) * 0.18);
      b.rotateY(ra);
      b.rotateZ(0.42);
      b.cylinder(0, 0, 0, 0.16, 0.03, 0.9, 5, barkDark, 0, true, false);
      b.pop();
    }

    if (type === 'spruce' || type === 'frostPine') {
      var height = 8.5 + rng.next() * 5.5;
      var trunkCol = type === 'frostPine' ? [0.24, 0.28, 0.27] : bark;
      b.cylinder(0, 0, 0, 0.34, 0.16, height, 7, trunkCol, 0, true, false);
      var layers = 6 + Math.floor(rng.next() * 3);
      for (var l = 0; l < layers; l++) {
        var ly = height * (0.28 + l * 0.105);
        var lr = (2.2 - l * 0.27) * (0.9 + rng.next() * 0.2);
        if (lr < 0.35) lr = 0.35;
        var lc = U.mixRgb(leaf, leaf2, rng.next());
        if (type === 'frostPine') lc = U.mixRgb(lc, [0.7, 0.82, 0.86], 0.28);
        b.cone(0, ly, 0, lr, 2.4 - l * 0.12, 7, lc, 0);
        if (type === 'frostPine' && l > 1) {
          b.cone(0, ly + 1.45, 0, lr * 0.72, 0.9, 7, [0.82, 0.9, 0.95], 0);
        }
      }
      b.cone(0, height * 0.88, 0, 0.9, 2.5, 7, leaf2, 0);
      if (rng.chance(0.35)) {
        // Hanging lantern in the branches.
        b.box(0.9, height * 0.45, 0.4, 0.18, 0.24, 0.18, [1.0, 0.72, 0.3], 1.2);
      }
    } else if (type === 'pine') {
      var ph = 9 + rng.next() * 6;
      b.cylinder(0, 0, 0, 0.38, 0.2, ph, 7, bark, 0, true, false);
      for (var pb = 0; pb < 5; pb++) {
        var py2 = ph * (0.62 + pb * 0.07);
        var pa = pb * 1.3 + tree.rotation;
        b.push();
        b.translate(0, py2, 0);
        b.rotateY(pa);
        b.rotateZ(0.5);
        b.cylinder(0, 0, 0, 0.12, 0.02, 1.6, 4, barkDark, 0, true, false);
        b.pop();
      }
      for (var q = 0; q < 7; q++) {
        var qa = rng.next() * Math.PI * 2;
        var qr = rng.range(0.4, 1.8);
        b.ellipsoid(Math.cos(qa) * qr, ph * (0.72 + rng.next() * 0.25), Math.sin(qa) * qr,
          1.7 + rng.next(), 0.9 + rng.next() * 0.5, 1.7 + rng.next(), 8, 5,
          U.mixRgb(leaf, leaf2, rng.next()), 0);
      }
    } else if (type === 'oak') {
      var oh = 5.4 + rng.next() * 3.2;
      b.cylinder(0, 0, 0, 0.46, 0.24, oh, 7, bark, 0, true, false);
      for (var br = 0; br < 4; br++) {
        var ba = rng.next() * Math.PI * 2;
        b.push();
        b.translate(0, oh * (0.55 + rng.next() * 0.3), 0);
        b.rotateY(ba);
        b.rotateZ(0.75);
        b.cylinder(0, 0, 0, 0.13, 0.05, 2.2, 5, bark, 0, true, false);
        b.pop();
      }
      for (var ob = 0; ob < 8; ob++) {
        var oa = rng.next() * Math.PI * 2;
        var orr = Math.sqrt(rng.next()) * 2.6;
        b.ellipsoid(Math.cos(oa) * orr, oh + rng.range(0.2, 2.2), Math.sin(oa) * orr,
          rng.range(1.2, 2.2), rng.range(0.8, 1.4), rng.range(1.2, 2.2), 8, 5,
          U.mixRgb(leaf, leaf2, rng.next()), 0);
      }
    } else if (type === 'birch') {
      var bh = 7 + rng.next() * 4;
      b.cylinder(0, 0, 0, 0.22, 0.12, bh, 6, [0.78, 0.76, 0.68], 0, true, false);
      for (var bd = 0; bd < 7; bd++) {
        b.box(0, 0.7 + bd * (bh / 8), 0.19, 0.19, 0.06, 0.02, [0.16, 0.14, 0.12], 0);
      }
      for (var bb = 0; bb < 6; bb++) {
        var bba = rng.next() * Math.PI * 2;
        var bbr = Math.sqrt(rng.next()) * 1.9;
        b.ellipsoid(Math.cos(bba) * bbr, bh * 0.82 + rng.range(0, 2), Math.sin(bba) * bbr,
          rng.range(0.9, 1.7), rng.range(0.7, 1.2), rng.range(0.9, 1.7), 7, 4,
          U.mixRgb([0.55, 0.45, 0.12], [0.72, 0.58, 0.16], rng.next()), 0);
      }
    } else if (type === 'willow') {
      var wh = 5.8 + rng.next() * 2.8;
      b.cylinder(0, 0, 0, 0.4, 0.2, wh, 7, [0.30, 0.24, 0.15], 0, true, false);
      for (var wb = 0; wb < 5; wb++) {
        var wa = rng.next() * Math.PI * 2;
        b.ellipsoid(Math.cos(wa) * 1.2, wh + 1, Math.sin(wa) * 1.2,
          1.8, 1.0, 1.8, 7, 4, U.mixRgb(leaf, leaf2, rng.next()), 0);
      }
      for (var wv = 0; wv < 12; wv++) {
        var wva = rng.next() * Math.PI * 2;
        var wvr = rng.range(0.6, 2.7);
        var wvx = Math.cos(wva) * wvr, wvz = Math.sin(wva) * wvr;
        var wlen = rng.range(1.2, 3.1);
        for (var wl = 0; wl < wlen; wl += 0.55) {
          b.leaf(wvx + Math.sin(wl * 1.2) * 0.12, wh + 1.6 - wl, wvz, 0.48, 0.3, wva + wl, 0.2, U.mixRgb(leaf, leaf2, rng.next()), 0);
        }
      }
    } else if (type === 'deadOak' || type === 'twisted') {
      var dh = 6 + rng.next() * 5;
      var twist = type === 'twisted' ? 1.4 : 0.4;
      var col = type === 'twisted' ? [0.20, 0.17, 0.14] : [0.25, 0.21, 0.16];
      b.cylinder(0, 0, 0, 0.38, 0.13, dh, 6, col, 0, true, false);
      var branches = type === 'twisted' ? 7 : 5;
      for (var db = 0; db < branches; db++) {
        var da = rng.next() * Math.PI * 2;
        var dy = dh * (0.4 + rng.next() * 0.55);
        b.push();
        b.translate(Math.sin(db) * 0.1, dy, Math.cos(db) * 0.1);
        b.rotateY(da);
        b.rotateZ(rng.range(0.5, 1.1) * (db % 2 ? 1 : -1));
        b.cylinder(0, 0, 0, 0.1, 0.02, rng.range(1.6, 3.4), 5, col, 0, true, false);
        if (type === 'twisted') {
          b.translate(0, 1.4, 0);
          b.rotateX(rng.range(-0.8, 0.8));
          b.cylinder(0, 0, 0, 0.06, 0.01, 1.2, 4, col, 0, true, false);
        }
        b.pop();
      }
      if (rng.chance(0.5)) {
        for (var mf = 0; mf < 3; mf++) {
          b.ellipsoid(rng.range(-0.4, 0.4), dh * 0.45 + rng.range(0, 2), rng.range(-0.4, 0.4),
            0.18, 0.1, 0.18, 5, 3, [0.6, 0.7, 0.3], 0.2);
        }
      }
    } else if (type === 'charred') {
      var ch = 5 + rng.next() * 4;
      b.cylinder(0, 0, 0, 0.34, 0.1, ch, 6, [0.08, 0.07, 0.065], 0, true, false);
      for (var cb = 0; cb < 4; cb++) {
        b.push();
        b.translate(0, ch * (0.3 + cb * 0.14), 0);
        b.rotateY(cb * 1.7);
        b.rotateZ(0.8);
        b.cylinder(0, 0, 0, 0.07, 0.01, 1.6, 4, [0.07, 0.06, 0.055], 0, true, false);
        if (rng.chance(0.4)) b.box(0, 1.5, 0, 0.08, 0.08, 0.08, [1.0, 0.38, 0.08], 1.4);
        b.pop();
      }
    } else if (type === 'iceTree') {
      var ih = 6 + rng.next() * 4;
      b.cylinder(0, 0, 0, 0.24, 0.1, ih, 6, [0.55, 0.75, 0.82], 0.08, true, false);
      for (var ib = 0; ib < 6; ib++) {
        var ia = rng.next() * Math.PI * 2;
        var ir = rng.range(0.4, 1.6);
        b.ellipsoid(Math.cos(ia) * ir, ih * (0.55 + rng.next() * 0.4), Math.sin(ia) * ir,
          rng.range(0.7, 1.5), rng.range(0.5, 1.0), rng.range(0.7, 1.5), 7, 4,
          [0.55 + rng.next() * 0.2, 0.78, 0.88], 0.16);
      }
      b.cone(0, ih - 0.4, 0, 0.8, 2.4, 6, [0.66, 0.86, 0.94], 0.2);
    } else if (type === 'pumpkinTree') {
      var gh = 4.8 + rng.next() * 2.6;
      b.cylinder(0, 0, 0, 0.42, 0.22, gh, 6, [0.24, 0.16, 0.09], 0, true, false);
      for (var gb = 0; gb < 4; gb++) {
        var ga = rng.next() * Math.PI * 2;
        var gr = rng.range(1.0, 2.2);
        var gy = gh * (0.45 + rng.next() * 0.4);
        b.push();
        b.translate(Math.cos(ga) * gr, gy, Math.sin(ga) * gr);
        b.ellipsoid(0, 0, 0, 0.34, 0.28, 0.34, 7, 5, [0.92, 0.42, 0.08], 0);
        b.cylinder(0, 0.24, 0, 0.04, 0.03, 0.22, 5, [0.22, 0.32, 0.12], 0, true, false);
        b.pop();
      }
      for (var gp = 0; gp < 5; gp++) {
        var gpa = rng.next() * Math.PI * 2;
        var gpr = rng.range(0.5, 2.4);
        b.ellipsoid(Math.cos(gpa) * gpr, gh * (0.7 + rng.next() * 0.2), Math.sin(gpa) * gpr,
          1.2, 0.6, 1.2, 6, 4, [0.28, 0.35, 0.12], 0);
      }
    } else {
      b.cylinder(0, 0, 0, 0.3, 0.15, 6, 6, bark, 0, true, false);
      b.ellipsoid(0, 6.5, 0, 1.8, 1.2, 1.8, 7, 4, leaf, 0);
    }

    b.pop();
  };

  World.prototype._buildProp = function (b, p, biome) {
    var rng = new U.RNG((p.seed * 1000) | 0);
    if (p.kind === 'grass') {
      var gc = p.color ? U.mixRgb(biome.grass, biome.grass2, rng.next()) : biome.grass;
      for (var i = 0; i < 5; i++) {
        var a = rng.next() * Math.PI * 2;
        b.leaf(p.x + Math.cos(a) * 0.12, p.y, p.z + Math.sin(a) * 0.12,
          rng.range(0.25, 0.62), 0.09, a, rng.range(-0.3, 0.3), gc, 0);
      }
    } else if (p.kind === 'flower') {
      var fc = rng.pick([[0.85, 0.35, 0.55], [0.9, 0.75, 0.3], [0.55, 0.45, 0.9], [0.9, 0.9, 0.95], [0.9, 0.45, 0.2]]);
      b.cylinder(p.x, p.y, p.z, 0.025, 0.012, 0.38, 4, [0.25, 0.4, 0.18], 0, false, false);
      for (var f = 0; f < 5; f++) {
        var fa = (f / 5) * Math.PI * 2;
        b.ellipsoid(p.x + Math.cos(fa) * 0.09, p.y + 0.4, p.z + Math.sin(fa) * 0.09,
          0.085, 0.035, 0.085, 5, 3, fc, p.glow ? 0.35 : 0);
      }
      b.ellipsoid(p.x, p.y + 0.43, p.z, 0.05, 0.03, 0.05, 5, 3, [0.95, 0.8, 0.25], 0.2);
    } else if (p.kind === 'mushroom') {
      var mc = p.glow ? [0.55, 0.35, 0.7] : [0.72, 0.22, 0.18];
      b.cylinder(p.x, p.y, p.z, 0.09, 0.06, 0.44, 5, [0.86, 0.82, 0.72], 0, true, false);
      b.ellipsoid(p.x, p.y + 0.44, p.z, 0.32, 0.17, 0.32, 8, 4, mc, p.glow ? 0.5 : 0);
      if (p.glow) {
        for (var sp = 0; sp < 4; sp++) {
          var sa = rng.next() * Math.PI * 2;
          b.sphere(p.x + Math.cos(sa) * 0.18, p.y + 0.48, p.z + Math.sin(sa) * 0.18, 0.035, 4, 3, [0.9, 0.8, 1], 1.3);
        }
      }
    } else if (p.kind === 'pumpkin') {
      this._buildPumpkin(b, p.x, p.y, p.z, rng.range(0.45, 0.85), p.lit, rng);
    } else if (p.kind === 'log') {
      b.push();
      b.translate(p.x, p.y + 0.22, p.z);
      b.rotateY(p.rot);
      b.rotateZ(Math.PI / 2);
      b.cylinder(0, -0.9, 0, 0.24, 0.2, 1.8, 7, [0.29, 0.19, 0.11], 0, true, true);
      b.pop();
      if (rng.chance(0.6)) {
        for (var m = 0; m < 3; m++) {
          var ma = rng.next() * Math.PI * 2;
          b.ellipsoid(p.x + Math.cos(ma) * 0.3, p.y + 0.14, p.z + Math.sin(ma) * 0.3,
            0.12, 0.07, 0.12, 5, 3, [0.2, 0.42, 0.18], 0);
        }
      }
    } else if (p.kind === 'lantern') {
      b.cylinder(p.x, p.y, p.z, 0.06, 0.04, 1.9, 5, [0.16, 0.14, 0.12], 0, false, false);
      b.box(p.x, p.y + 2.0, p.z, 0.3, 0.36, 0.3, [0.95, 0.62, 0.2], 1.4);
      b.sphere(p.x, p.y + 2.0, p.z, 0.16, 5, 3, [1.0, 0.85, 0.45], 2.0);
      b.cone(p.x, p.y + 2.18, p.z, 0.24, 0.18, 4, [0.12, 0.1, 0.1], 0);
    } else if (p.kind === 'bush') {
      for (var bu = 0; bu < 4; bu++) {
        var ba = rng.next() * Math.PI * 2;
        b.ellipsoid(p.x + Math.cos(ba) * 0.3, p.y + 0.28 + rng.next() * 0.2, p.z + Math.sin(ba) * 0.3,
          rng.range(0.3, 0.6), rng.range(0.22, 0.4), rng.range(0.3, 0.6), 6, 4,
          U.mixRgb(biome.leaf, biome.leaf2, rng.next()), 0);
      }
      if (rng.chance(0.35)) {
        for (var be = 0; be < 3; be++) {
          b.sphere(p.x + rng.range(-0.4, 0.4), p.y + 0.4, p.z + rng.range(-0.4, 0.4), 0.06, 4, 3, [0.75, 0.1, 0.12], 0.2);
        }
      }
    }
  };

  World.prototype._buildPumpkin = function (b, x, y, z, r, lit, rng) {
    var c = [0.92, 0.44, 0.08];
    b.ellipsoid(x, y + r * 0.62, z, r, r * 0.72, r, 9, 5, c, 0);
    // Ribs.
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * Math.PI * 2;
      b.boxRot(x + Math.cos(a) * r * 0.9, y + r * 0.62, z + Math.sin(a) * r * 0.9,
        0.035, r * 1.25, r * 0.75, 0, -a, 0, [0.68, 0.28, 0.04], 0);
    }
    b.cylinder(x, y + r * 1.22, z, 0.06, 0.04, 0.28, 5, [0.24, 0.32, 0.1], 0, true, false);
    if (lit) {
      // Carved jack-o'-lantern face.
      b.tri([x - r * 0.55, y + r * 0.78, z + r * 0.82],
        [x - r * 0.25, y + r * 1.0, z + r * 0.78],
        [x - r * 0.2, y + r * 0.72, z + r * 0.84], [1.0, 0.75, 0.2], 1.8);
      b.tri([x + r * 0.55, y + r * 0.78, z + r * 0.82],
        [x + r * 0.25, y + r * 1.0, z + r * 0.78],
        [x + r * 0.2, y + r * 0.72, z + r * 0.84], [1.0, 0.75, 0.2], 1.8);
      b.quad([x - r * 0.5, y + r * 0.42, z + r * 0.86],
        [x + r * 0.5, y + r * 0.42, z + r * 0.86],
        [x + r * 0.4, y + r * 0.58, z + r * 0.82],
        [x - r * 0.4, y + r * 0.58, z + r * 0.82], [1.0, 0.75, 0.2], 1.8);
    }
    if (rng.chance(0.4)) {
      for (var v = 0; v < 3; v++) {
        var va = rng.next() * Math.PI * 2;
        b.leaf(x + Math.cos(va) * r * 1.1, y + 0.05, z + Math.sin(va) * r * 1.1,
          0.6, 0.4, va, 0.2, [0.22, 0.4, 0.12], 0);
      }
    }
  };

  World.prototype._buildRuin = function (b, r, biome) {
    var stone = [0.38, 0.37, 0.34];
    var moss = biome.grass;
    b.push();
    b.translate(r.x, r.y, r.z);
    b.rotateY(r.rot);
    if (r.kind === 'arch') {
      b.box(-1.6, 1.5, 0, 0.7, 3, 0.7, stone, 0);
      b.box(1.6, 1.5, 0, 0.7, 3, 0.7, stone, 0);
      b.box(0, 3.15, 0, 3.9, 0.6, 0.8, stone, 0);
      b.box(-1.6, 3.3, 0, 0.85, 0.18, 0.9, moss, 0);
      b.box(1.6, 3.3, 0, 0.85, 0.18, 0.9, moss, 0);
    } else if (r.kind === 'circle') {
      for (var i = 0; i < 7; i++) {
        var a = (i / 7) * Math.PI * 2;
        b.push();
        b.translate(Math.cos(a) * 2.3, 0, Math.sin(a) * 2.3);
        b.rotateY(-a);
        b.box(0, 0.7, 0, 0.55, 1.4, 0.4, stone, 0);
        b.sphere(0, 1.45, 0, 0.3, 5, 3, stone, 0);
        b.pop();
      }
      b.disc(0, 0.04, 0, 2.0, 12, [0.22, 0.18, 0.22], 0.05);
      b.box(0, 0.1, 0, 0.35, 0.2, 0.35, [0.8, 0.65, 0.2], 0.8);
    } else if (r.kind === 'grave') {
      b.box(0, 0.55, 0, 0.9, 1.1, 0.22, stone, 0);
      b.ellipsoid(0, 1.1, 0, 0.45, 0.3, 0.22, 7, 4, stone, 0);
      b.box(0, 1.35, 0, 0.1, 0.55, 0.1, stone, 0);
      b.box(0, 1.35, 0, 0.42, 0.1, 0.1, stone, 0);
      b.box(0, 0.03, 0.1, 0.8, 0.08, 0.5, [0.18, 0.16, 0.14], 0);
    } else if (r.kind === 'fence') {
      for (var f = 0; f < 4; f++) {
        b.box(-2 + f * 1.3, 0.55, 0, 0.14, 1.1, 0.14, [0.25, 0.18, 0.11], 0);
      }
      b.box(-0.05, 0.75, 0, 4, 0.1, 0.08, [0.28, 0.2, 0.12], 0);
      b.box(-0.05, 0.4, 0, 4, 0.1, 0.08, [0.28, 0.2, 0.12], 0);
    } else if (r.kind === 'scarecrow') {
      b.cylinder(0, 0, 0, 0.1, 0.08, 2.1, 5, [0.27, 0.2, 0.12], 0, true, false);
      b.box(0, 1.6, 0, 1.8, 0.1, 0.1, [0.27, 0.2, 0.12], 0);
      b.box(0, 1.55, 0, 0.5, 0.65, 0.3, [0.55, 0.42, 0.22], 0);
      b.sphere(0, 2.05, 0, 0.28, 7, 4, [0.72, 0.58, 0.35], 0);
      b.box(0, 2.3, 0, 0.75, 0.12, 0.75, [0.22, 0.18, 0.1], 0);
      b.box(0, 2.42, 0, 0.4, 0.2, 0.4, [0.22, 0.18, 0.1], 0);
      b.sphere(-0.1, 2.1, 0.25, 0.035, 4, 3, [0.05, 0.05, 0.05], 0);
      b.sphere(0.1, 2.1, 0.25, 0.035, 4, 3, [0.05, 0.05, 0.05], 0);
    } else {
      // Shrine.
      b.box(0, 0.3, 0, 1.6, 0.6, 1.2, stone, 0);
      b.box(0, 1.1, -0.35, 1.2, 1.0, 0.3, stone, 0);
      b.box(0, 1.85, 0, 1.4, 0.15, 1.0, stone, 0);
      b.sphere(0, 1.45, 0.1, 0.22, 6, 4, [0.75, 0.5, 0.95], 1.1);
      b.cylinder(0, 0.6, 0, 0.05, 0.05, 0.55, 5, [0.85, 0.75, 0.35], 0.7, true, false);
    }
    b.pop();
  };

  World.prototype._buildFloater = function (b, f, biome) {
    var rng = new U.RNG((f.seed * 1000) | 0);
    b.push();
    b.translate(f.x, f.y, f.z);
    // Inverted rock cone with a mossy top.
    b.cone(0, -f.r * 1.5, 0, f.r, f.r * 1.5, 8, [0.20, 0.21, 0.24], 0);
    b.ellipsoid(0, 0, 0, f.r, f.r * 0.25, f.r, 9, 4, [0.29, 0.36, 0.24], 0);
    b.ellipsoid(0, 0.18, 0, f.r * 0.92, f.r * 0.12, f.r * 0.92, 9, 3, biome.grass, 0);
    // Hanging roots.
    for (var r = 0; r < 7; r++) {
      var a = rng.next() * Math.PI * 2;
      var rr = rng.range(0.2, f.r * 0.8);
      b.cylinder(Math.cos(a) * rr, -rng.range(0.4, 1.2), Math.sin(a) * rr,
        0.07, 0.02, rng.range(0.8, 2.4), 4, [0.28, 0.2, 0.12], 0, false, false);
    }
    for (var t = 0; t < f.trees; t++) {
      var ta = rng.next() * Math.PI * 2;
      var tr = rng.range(0.3, f.r * 0.55);
      var tx = Math.cos(ta) * tr, tz = Math.sin(ta) * tr;
      var tree = {
        type: biome.key === 'frost' ? 'frostPine' : (rng.chance(0.5) ? 'spruce' : 'oak'),
        x: tx, y: 0.22, z: tz,
        scale: rng.range(0.35, 0.62), rotation: rng.next() * 6.28, seed: rng.next() * 10000,
        _biome: biome
      };
      this._buildTree(b, tree, rng);
    }
    if (f.crystal) {
      for (var cr = 0; cr < 4; cr++) {
        var ca = rng.next() * Math.PI * 2;
        var crr = rng.range(0.2, f.r * 0.5);
        b.push();
        b.translate(Math.cos(ca) * crr, 0.2, Math.sin(ca) * crr);
        b.rotateZ(rng.range(-0.4, 0.4));
        b.cylinder(0, 0, 0, 0.12, 0.01, rng.range(0.5, 1.5), 5, [0.65, 0.42, 0.95], 1.2, true, false);
        b.pop();
      }
    }
    b.pop();
  };

  /* ------------------------------------------------------------------ */
  /*  Streaming                                                          */
  /* ------------------------------------------------------------------ */
  World.prototype.streamAround = function (px, pz, radius, budget) {
    radius = radius || 6;
    budget = budget === undefined ? 2 : budget;
    var pcx = this.chunkCoord(px), pcz = this.chunkCoord(pz);
    var generated = 0, removed = 0;
    var r2 = (radius + 0.5) * (radius + 0.5);

    // Remove far chunks.
    var doomed = [];
    var self = this;
    this.chunks.forEach(function (c) {
      var dx = c.cx - pcx, dz = c.cz - pcz;
      if (dx * dx + dz * dz > (radius + 2.5) * (radius + 2.5)) doomed.push(c.key);
    });
    for (var d = 0; d < doomed.length; d++) {
      var c = this.chunks.get(doomed[d]);
      if (c) { c.meshData = null; c.waterData = null; this.chunks.delete(doomed[d]); removed++; this.removedCount++; }
    }

    // Generate missing chunks nearest-first.
    var missing = [];
    for (var dx = -radius; dx <= radius; dx++) {
      for (var dz = -radius; dz <= radius; dz++) {
        if (dx * dx + dz * dz > r2) continue;
        var cx = pcx + dx, cz = pcz + dz;
        if (!this.chunks.has(this.key(cx, cz))) {
          missing.push({ cx: cx, cz: cz, d: dx * dx + dz * dz });
        }
      }
    }
    missing.sort(function (a, b) { return a.d - b.d; });
    for (var m = 0; m < missing.length && generated < budget; m++) {
      this.generateChunk(missing[m].cx, missing[m].cz);
      generated++;
    }

    this.lastStream = { generated: generated, removed: removed };
    return this.lastStream;
  };

  World.prototype.preload = function (px, pz, radius) {
    var pcx = this.chunkCoord(px), pcz = this.chunkCoord(pz);
    var r2 = (radius + 0.5) * (radius + 0.5);
    for (var dx = -radius; dx <= radius; dx++) {
      for (var dz = -radius; dz <= radius; dz++) {
        if (dx * dx + dz * dz > r2) continue;
        this.generateChunk(pcx + dx, pcz + dz);
      }
    }
  };

  World.prototype.getChunk = function (cx, cz) { return this.chunks.get(this.key(cx, cz)) || null; };
  World.prototype.getChunkAt = function (x, z) {
    return this.getChunk(this.chunkCoord(x), this.chunkCoord(z));
  };

  World.prototype.forEachChunk = function (fn) {
    this.chunks.forEach(fn);
  };

  World.prototype.chunkStats = function () {
    return {
      loaded: this.chunks.size,
      generated: this.generatedCount,
      removed: this.removedCount,
      maxLoaded: this.maxLoaded
    };
  };

  /* ------------------------------------------------------------------ */
  /*  Queries used by critters, campfires, carrots and the player        */
  /* ------------------------------------------------------------------ */
  World.prototype.nearbyProps = function (x, z, radius) {
    var out = [];
    var rcx = Math.ceil(radius / CHUNK) + 1;
    var cx = this.chunkCoord(x), cz = this.chunkCoord(z);
    for (var dx = -rcx; dx <= rcx; dx++) {
      for (var dz = -rcx; dz <= rcx; dz++) {
        var c = this.getChunk(cx + dx, cz + dz);
        if (!c) continue;
        for (var i = 0; i < c.props.length; i++) {
          var p = c.props[i];
          if (!p.solid) continue;
          if (U.dist2(p.x, p.z, x, z) <= (radius + p.radius) * (radius + p.radius)) out.push(p);
        }
      }
    }
    return out;
  };

  World.prototype.collides = function (x, z, radius) {
    var props = this.nearbyProps(x, z, radius);
    for (var i = 0; i < props.length; i++) {
      var p = props[i];
      var rr = radius + p.radius;
      if (U.dist2(p.x, p.z, x, z) < rr * rr) {
        // Ignore canopies: only trunks/rocks close to the ground block.
        if (p.kind === 'tree') return true;
        if (p.kind === 'rock') return true;
      }
    }
    return false;
  };

  World.prototype.resolveCollision = function (x, z, radius) {
    var props = this.nearbyProps(x, z, radius + 0.5);
    for (var i = 0; i < props.length; i++) {
      var p = props[i];
      var rr = radius + p.radius;
      var dx = x - p.x, dz = z - p.z;
      var d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 0.0001) {
        var d = Math.sqrt(d2);
        x = p.x + (dx / d) * rr;
        z = p.z + (dz / d) * rr;
      }
    }
    return [x, z];
  };

  World.prototype.nearbyCampfires = function (x, z, radius) {
    var out = [];
    var rcx = Math.ceil(radius / CHUNK) + 1;
    var cx = this.chunkCoord(x), cz = this.chunkCoord(z);
    for (var dx = -rcx; dx <= rcx; dx++) {
      for (var dz = -rcx; dz <= rcx; dz++) {
        var c = this.getChunk(cx + dx, cz + dz);
        if (!c) continue;
        for (var i = 0; i < c.campfireSites.length; i++) {
          var s = c.campfireSites[i];
          if (U.dist2(s.x, s.z, x, z) <= radius * radius) out.push(s);
        }
      }
    }
    return out;
  };

  World.prototype.nearbyCarrotPatches = function (x, z, radius) {
    var out = [];
    var rcx = Math.ceil(radius / CHUNK) + 1;
    var cx = this.chunkCoord(x), cz = this.chunkCoord(z);
    for (var dx = -rcx; dx <= rcx; dx++) {
      for (var dz = -rcx; dz <= rcx; dz++) {
        var c = this.getChunk(cx + dx, cz + dz);
        if (!c) continue;
        for (var i = 0; i < c.carrotPatches.length; i++) {
          var p = c.carrotPatches[i];
          if (U.dist2(p.x, p.z, x, z) <= radius * radius) out.push(p);
        }
      }
    }
    return out;
  };

  World.prototype.nearbyBurrows = function (x, z, radius) {
    var out = [];
    var rcx = Math.ceil(radius / CHUNK) + 1;
    var cx = this.chunkCoord(x), cz = this.chunkCoord(z);
    for (var dx = -rcx; dx <= rcx; dx++) {
      for (var dz = -rcx; dz <= rcx; dz++) {
        var c = this.getChunk(cx + dx, cz + dz);
        if (!c) continue;
        for (var i = 0; i < c.burrows.length; i++) {
          var b = c.burrows[i];
          if (U.dist2(b.x, b.z, x, z) <= radius * radius) out.push(b);
        }
      }
    }
    return out;
  };

  World.prototype.nearbyFloaters = function (x, z, radius) {
    var out = [];
    var rcx = Math.ceil(radius / CHUNK) + 1;
    var cx = this.chunkCoord(x), cz = this.chunkCoord(z);
    for (var dx = -rcx; dx <= rcx; dx++) {
      for (var dz = -rcx; dz <= rcx; dz++) {
        var c = this.getChunk(cx + dx, cz + dz);
        if (!c) continue;
        for (var i = 0; i < c.floaters.length; i++) {
          var f = c.floaters[i];
          if (U.dist2(f.x, f.z, x, z) <= radius * radius) out.push(f);
        }
      }
    }
    return out;
  };

  World.prototype.nearestBiome = function (x, z) {
    return this.biomeAt(x, z);
  };

  World.prototype.findSpawn = function () {
    // The origin is deliberately shaped into a safe clearing.
    var h = this.heightAt(0, 0);
    this.spawn = { x: 0.5, y: h + 0.2, z: 0.5, biome: this.biomeAt(0, 0) };
    return this.spawn;
  };

  World.prototype.reset = function (seed) {
    this.seed = (seed === undefined ? this.seed : seed) | 0;
    this.chunks.clear();
    this.generatedCount = 0;
    this.removedCount = 0;
    this.maxLoaded = 0;
    this._heightCache.clear();
    this.spawn = null;
  };

  SF.World = World;
  SF.WorldClass = World;
  SF.BIOMES = BIOMES;
  SF.BIOME_LIST = BIOME_LIST;
  SF.CHUNK = CHUNK;
  SF.WATER = WATER;
})(typeof window !== 'undefined' ? window : globalThis);
