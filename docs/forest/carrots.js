/* ==========================================================================
 *  ENDLESS SPOOKY FOREST — carrots.js
 *  Wild carrot patches, plantable carrots, five growth stages, ridged 3D
 *  roots, swaying leaf fans, harvesting, watering and roasted carrots.
 * ========================================================================== */
(function (root) {
  'use strict';

  var SF = root.SpookyForest = root.SpookyForest || {};
  var U = SF.Util;

  var GROWTH_STAGE_SECONDS = 26;
  var REGROW_SECONDS = 150;
  var STAGE_NAMES = ['Sprout', 'Leafing', 'Rooting', 'Ripe'];
  var STAGE_COLORS = [
    [0.40, 0.66, 0.24],
    [0.34, 0.60, 0.20],
    [0.40, 0.64, 0.22],
    [0.46, 0.70, 0.24]
  ];

  function Carrots(world, opts) {
    opts = opts || {};
    this.world = world;
    this.plants = new Map();
    this.patchIds = new Set();
    this.harvested = new Map();   // id -> timestamp (seconds)
    this.planted = [];            // saved player-planted carrots
    this.count = 0;
    this.seeds = 6;
    this.roasted = 0;
    this.watered = 0;
    this.totalHarvested = 0;
    this.bestCarrot = 0;
    this.time = 0;
    this.quality = opts.quality === undefined ? 1 : opts.quality;
    this.queryRadius = 48;
    this._seen = new Set();
    this.onEvent = opts.onEvent || function () {};
  }

  Carrots.prototype.reset = function () {
    this.plants.clear();
    this.patchIds.clear();
    this.harvested.clear();
    this.planted = [];
    this.count = 0;
    this.seeds = 6;
    this.roasted = 0;
    this.watered = 0;
    this.totalHarvested = 0;
    this.bestCarrot = 0;
    this._seen.clear();
  };

  /* ------------------------------------------------------------------ */
  /*  Syncing world patches into live plants                             */
  /* ------------------------------------------------------------------ */
  Carrots.prototype.sync = function (px, pz) {
    var patches = this.world.nearbyCarrotPatches(px, pz, this.queryRadius);
    var seen = new Set();
    for (var i = 0; i < patches.length; i++) {
      var patch = patches[i];
      seen.add(patch.id);
      this.patchIds.add(patch.id);
      for (var j = 0; j < patch.plants.length; j++) {
        var src = patch.plants[j];
        if (this.plants.has(src.id)) continue;
        this.plants.set(src.id, {
          id: src.id, patchId: patch.id,
          x: src.x, y: src.y, z: src.z,
          stage: src.stage, growth: src.stage >= 3 ? 1 : src.stage / 3,
          variant: src.variant, rotation: src.rotation,
          scale: src.scale || 1, wild: true,
          watered: false, waterBoost: 0,
          swayPhase: (U.hash2(Math.floor(src.x), Math.floor(src.z), 1) % 1000) / 1000 * 6.28,
          plantedAt: 0, readyAt: 0, harvested: false,
          glow: (src.variant === 2 && src.stage >= 3)
        });
      }
    }
    // Remove plants from patches we've walked away from, but keep planted ones.
    var self = this;
    this.plants.forEach(function (plant, id) {
      if (plant.wild && !seen.has(plant.patchId) && U.dist2(plant.x, plant.z, px, pz) > 70 * 70) {
        self.plants.delete(id);
      }
    });
  };

  Carrots.prototype.addPlanted = function (x, y, z, stage, opts) {
    opts = opts || {};
    var id = 'planted-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
    var plant = {
      id: id, patchId: 'player', x: x, y: y, z: z,
      stage: stage === undefined ? 0 : stage,
      growth: stage === undefined ? 0 : stage / 3,
      variant: opts.variant === undefined ? Math.floor(Math.random() * 3) : opts.variant,
      rotation: Math.random() * Math.PI * 2,
      scale: opts.scale || 1, wild: false,
      watered: !!opts.watered, waterBoost: 0,
      swayPhase: Math.random() * 6.28,
      plantedAt: this.time, readyAt: 0, harvested: false,
      glow: false
    };
    this.plants.set(id, plant);
    this.planted.push({ id: id, x: x, y: y, z: z, stage: plant.stage, variant: plant.variant, scale: plant.scale, watered: plant.watered });
    return plant;
  };

  Carrots.prototype.removePlanted = function (id) {
    for (var i = this.planted.length - 1; i >= 0; i--) {
      if (this.planted[i].id === id) this.planted.splice(i, 1);
    }
    this.plants.delete(id);
  };

  /* ------------------------------------------------------------------ */
  /*  Update                                                             */
  /* ------------------------------------------------------------------ */
  Carrots.prototype.update = function (dt, time, player) {
    this.time = time;
    if (player) this.sync(player.position[0], player.position[2]);

    // Regrow wild carrots that were harvested a while ago.
    if (this.harvested.size) {
      var expired = [];
      this.harvested.forEach(function (t, id) {
        if (time - t > REGROW_SECONDS) expired.push(id);
      });
      for (var i = 0; i < expired.length; i++) this.harvested.delete(expired[i]);
    }

    var self = this;
    this.plants.forEach(function (plant) {
      if (plant.harvested) {
        var t = self.harvested.get(plant.id);
        if (t !== undefined && time - t > REGROW_SECONDS) {
          plant.harvested = false;
          plant.stage = 0;
          plant.growth = 0;
        }
        return;
      }
      if (plant.stage >= 3) {
        plant.growth = 1;
        return;
      }
      var rate = plant.wild ? 0.012 : (1 / GROWTH_STAGE_SECONDS);
      if (plant.watered) rate *= 2.1;
      plant.growth += rate * dt * (plant.wild ? 0.55 : 1);
      if (plant.growth >= 1) {
        plant.growth = 0;
        plant.stage = Math.min(3, plant.stage + 1);
        if (plant.stage === 3) {
          self.onEvent('carrot:ripe', plant);
        }
      }
    });
  };

  /* ------------------------------------------------------------------ */
  /*  Interaction                                                        */
  /* ------------------------------------------------------------------ */
  Carrots.prototype.findRipe = function (player, maxDist) {
    maxDist = maxDist || 3.2;
    var best = null, bestScore = -1;
    var fx = Math.sin(player.yaw || 0), fz = Math.cos(player.yaw || 0);
    var px = player.position[0], pz = player.position[2];
    var self = this;
    this.plants.forEach(function (plant) {
      if (plant.harvested || plant.stage < 3) return;
      var dx = plant.x - px, dz = plant.z - pz;
      var d2 = dx * dx + dz * dz;
      if (d2 > maxDist * maxDist) return;
      var d = Math.sqrt(d2) || 0.001;
      var dot = (dx / d) * fx + (dz / d) * fz;
      if (dot < 0.15 && d > 1.2) return;
      var score = dot * 2 + (1 - d / maxDist) + (plant.glow ? 0.6 : 0);
      if (score > bestScore) { bestScore = score; best = plant; }
    });
    return best;
  };

  Carrots.prototype.harvest = function (player, opts) {
    var plant = this.findRipe(player, opts && opts.range);
    if (!plant) return null;
    plant.harvested = true;
    plant.stage = 0;
    plant.growth = 0;
    this.harvested.set(plant.id, this.time);
    this.count++;
    this.totalHarvested++;
    var q = 1 + (Math.random() < 0.22 ? 1 : 0);
    if (plant.glow) q += 1;
    this.count += q - 1;
    if (q > this.bestCarrot) this.bestCarrot = q;
    this.seeds += Math.random() < 0.5 ? 1 : 0;
    U.Audio.pop();
    this.onEvent('carrot:harvest', { plant: plant, amount: q });
    return { plant: plant, amount: q };
  };

  Carrots.prototype.plantAt = function (x, y, z, player) {
    if (this.seeds <= 0) return null;
    this.seeds--;
    var p = this.addPlanted(x, y, z, 0);
    U.Audio.pop();
    this.onEvent('carrot:planted', p);
    return p;
  };

  Carrots.prototype.water = function (plant) {
    if (!plant || plant.watered) return false;
    plant.watered = true;
    this.watered++;
    this.onEvent('carrot:watered', plant);
    return true;
  };

  Carrots.prototype.eat = function (amount) {
    amount = amount || 1;
    if (this.count < amount) return false;
    this.count -= amount;
    U.Audio.pop();
    this.onEvent('carrot:eaten', amount);
    return true;
  };

  Carrots.prototype.roast = function () {
    if (this.count <= 0) return false;
    this.count--;
    this.roasted++;
    this.onEvent('carrot:roasted', this.roasted);
    return true;
  };

  Carrots.prototype.nearestStage = function (player, maxDist) {
    maxDist = maxDist || 3.2;
    var best = null, bd = maxDist * maxDist;
    var px = player.position[0], pz = player.position[2];
    this.plants.forEach(function (p) {
      if (p.harvested) return;
      var d = U.dist2(p.x, p.z, px, pz);
      if (d < bd) { bd = d; best = p; }
    });
    return best;
  };

  Carrots.prototype.interaction = function (player) {
    var ripe = this.findRipe(player, 3.2);
    if (ripe) {
      return {
        type: 'carrot', label: 'Pull ' + (ripe.glow ? 'Moon' : '') + 'Carrot',
        sub: STAGE_NAMES[ripe.stage] + ' · ' + (ripe.glow ? 'faintly luminous' : 'wild patch'),
        target: ripe, range: 3.2, priority: 3
      };
    }
    var near = this.nearestStage(player, 2.3);
    if (near && !near.watered) {
      return {
        type: 'carrot-water', label: 'Water Sprout', sub: 'Doubles its growth',
        target: near, range: 2.3, priority: 1
      };
    }
    return null;
  };

  Carrots.prototype.interact = function (player) {
    var ripe = this.findRipe(player, 3.2);
    if (ripe) return this.harvest(player, { range: 3.2 });
    var near = this.nearestStage(player, 2.3);
    if (near && !near.watered) {
      var ok = this.water(near);
      if (ok) return { watered: near, amount: 0 };
    }
    return null;
  };

  /* ------------------------------------------------------------------ */
  /*  Meshes                                                             */
  /* ------------------------------------------------------------------ */
  Carrots.prototype.setQuality = function (q) {
    this.quality = q === undefined ? 1 : q;
  };

  Carrots.prototype.build = function (builder, player, time, reduce) {
    var self = this;
    var count = 0;
    var px = player.position[0], pz = player.position[2];
    // Distance LOD keeps the per-frame dynamic mesh affordable on phones while
    // still rendering a tiny silhouette for every visible patch.
    var maxDist = this.quality >= 2 ? 54 : this.quality >= 1 ? 44 : 36;
    var near2 = 22 * 22;
    var mid2 = 32 * 32;
    this.plants.forEach(function (plant) {
      if (plant.harvested) return;
      var d2 = U.dist2(plant.x, plant.z, px, pz);
      if (d2 > maxDist * maxDist) return;
      var detail = d2 < near2 ? 2 : d2 < mid2 ? 1 : 0;
      self._buildPlant(builder, plant, time, reduce, detail);
      count++;
    });
    return count;
  };

  Carrots.prototype._buildPlant = function (b, plant, time, reduce, detail) {
    var stage = plant.stage;
    var grow = plant.growth;
    var scale = plant.scale || 1;
    var sway = Math.sin(time * 1.4 + plant.swayPhase) * (reduce ? 0.015 : 0.07);
    var leafCol = STAGE_COLORS[Math.min(3, stage)];
    var leafCol2 = U.mixRgb(leafCol, [0.72, 0.86, 0.38], 0.35);
    var orange = plant.glow ? [0.95, 0.58, 0.18] : [0.92, 0.44, 0.08];
    var orangeLight = plant.glow ? [1.0, 0.76, 0.32] : [0.98, 0.58, 0.13];
    var lod = detail === undefined ? 2 : detail;

    b.push();
    b.translate(plant.x, plant.y, plant.z);
    b.rotateY(plant.rotation);
    b.scale(scale, scale, scale);

    // Tiny mound of disturbed soil.
    b.ellipsoid(0, 0.02, 0, 0.28, 0.05, 0.28, lod > 0 ? 7 : 4, lod > 0 ? 3 : 2, [0.30, 0.21, 0.12], 0);

    if (stage >= 1) {
      var rootH = 0.22 + stage * 0.19 + grow * 0.08;
      var rootR = 0.07 + stage * 0.035;
      // Ridged carrot shoulder, slightly tilted for personality.
      b.push();
      b.rotateZ(0.05 + Math.sin(plant.swayPhase) * 0.03);
      b.cylinder(0, -0.05, 0, rootR * 0.65, rootR, rootH, lod > 0 ? 7 : 4, orange, 0, true, false);
      if (lod > 0) {
        b.ellipsoid(0, rootH - 0.05, 0, rootR, 0.09, rootR, 8, 4, orangeLight, 0);
        var ridges = lod > 1 ? 3 : 1;
        for (var r = 0; r < ridges; r++) {
          var ry = 0.05 + r * (rootH / 4);
          var rr = rootR * (1 - r * 0.16);
          b.torus(0, ry, 0, rr, 0.014, lod > 1 ? 8 : 5, 3, [0.66, 0.28, 0.04], 0);
        }
      }
      b.pop();
    }

    if (stage === 0) {
      // Two seed leaves.
      b.leaf(Math.sin(sway) * 0.05, 0.12, 0, 0.34, 0.18, 0.2, -0.15, leafCol, 0);
      b.leaf(-Math.sin(sway) * 0.05, 0.12, 0, 0.3, 0.16, Math.PI - 0.2, -0.2, leafCol2, 0);
    } else {
      var fans = lod > 0 ? 3 + stage * 2 : 3;
      var leaflets = lod > 1 ? 3 : lod > 0 ? 2 : 1;
      var height = 0.35 + stage * 0.16;
      for (var f = 0; f < fans; f++) {
        var a = (f / fans) * Math.PI * 2 + plant.rotation * 0.2;
        var tilt = Math.sin(time * 1.2 + f * 1.4 + plant.swayPhase) * 0.07 + sway;
        var stemLen = height * (0.7 + (f % 3) * 0.14);
        b.push();
        b.rotateY(a);
        b.rotateZ(0.5 + tilt);
        // Stem.
        b.cylinder(0, 0.08, 0, 0.014, 0.008, stemLen, lod > 0 ? 4 : 3, [0.34, 0.55, 0.2], 0, false, false);
        // Leaflets along the stem.
        for (var l = 0; l < leaflets; l++) {
          var ly = 0.1 + stemLen * (0.35 + l * 0.2);
          var lw = 0.12 + stage * 0.025;
          b.leaf(0, ly, 0, lw * 2.6, lw * 1.3, (l % 2 ? 0.5 : -0.5), 0.75 + l * 0.12,
            l % 2 ? leafCol : leafCol2, plant.glow && stage === 3 ? 0.18 : 0);
          if (lod > 0) {
            b.leaf(0, ly, 0, lw * 2.1, lw * 1.1, Math.PI + (l % 2 ? -0.5 : 0.5), 0.75 + l * 0.1,
              l % 2 ? leafCol2 : leafCol, 0);
          }
        }
        b.pop();
      }
      // Mature flower/seed head.
      if (stage >= 3 && !reduce && lod > 1) {
        b.push();
        b.translate(0, height + 0.38, 0);
        b.sphere(0, 0, 0, 0.055, 5, 4, [0.95, 0.9, 0.72], 0.1);
        for (var sp = 0; sp < 4; sp++) {
          var sa = (sp / 4) * Math.PI * 2;
          b.leaf(Math.cos(sa) * 0.03, 0, Math.sin(sa) * 0.03, 0.13, 0.06, sa, 0.35, [0.96, 0.94, 0.8], 0.2);
        }
        b.pop();
      }
    }
    b.pop();
  };

  /* ------------------------------------------------------------------ */
  /*  Persistence                                                        */
  /* ------------------------------------------------------------------ */
  Carrots.prototype.serialize = function () {
    return {
      count: this.count, seeds: this.seeds, roasted: this.roasted,
      watered: this.watered, totalHarvested: this.totalHarvested,
      bestCarrot: this.bestCarrot,
      harvested: Array.from(this.harvested.entries()),
      planted: this.planted
    };
  };

  Carrots.prototype.load = function (data) {
    if (!data) return;
    this.count = data.count || 0;
    this.seeds = data.seeds === undefined ? 6 : data.seeds;
    this.roasted = data.roasted || 0;
    this.watered = data.watered || 0;
    this.totalHarvested = data.totalHarvested || 0;
    this.bestCarrot = data.bestCarrot || 0;
    this.harvested = new Map(data.harvested || []);
    this.planted = data.planted || [];
    for (var i = 0; i < this.planted.length; i++) {
      var p = this.planted[i];
      this.plants.set(p.id, {
        id: p.id, patchId: 'player', x: p.x, y: p.y, z: p.z,
        stage: p.stage || 0, growth: (p.stage || 0) / 3,
        variant: p.variant || 0, rotation: Math.random() * 6.28,
        scale: p.scale || 1, wild: false, watered: !!p.watered, waterBoost: 0,
        swayPhase: Math.random() * 6.28, plantedAt: 0, readyAt: 0,
        harvested: false, glow: false
      });
    }
  };

  Carrots.STAGE_NAMES = STAGE_NAMES;
  SF.Carrots = Carrots;
})(typeof window !== 'undefined' ? window : globalThis);
