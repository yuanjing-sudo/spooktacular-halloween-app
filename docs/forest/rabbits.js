/* ==========================================================================
 *  ENDLESS SPOOKY FOREST — rabbits.js
 *  The forest's rabbits: articulated low-poly bodies, twitching ears,
 *  blinking eyes, whiskers, hopping gaits and a surprisingly deep AI.
 *  They graze, sniff, groom, play, flee, sleep, visit campfires, nibble
 *  carrots and — with patience and a pocket full of carrots — befriend you.
 * ========================================================================== */
(function (root) {
  'use strict';

  var SF = root.SpookyForest = root.SpookyForest || {};
  var U = SF.Util;

  var PALETTES = [
    { key: 'brown', name: 'Hazel', fur: [0.48, 0.33, 0.20], belly: [0.78, 0.68, 0.52], ear: [0.72, 0.45, 0.42], eye: [0.10, 0.06, 0.04], nose: [0.62, 0.32, 0.36] },
    { key: 'grey', name: 'Ash', fur: [0.46, 0.46, 0.44], belly: [0.78, 0.78, 0.74], ear: [0.78, 0.52, 0.50], eye: [0.08, 0.06, 0.05], nose: [0.55, 0.32, 0.34] },
    { key: 'black', name: 'Soot', fur: [0.10, 0.10, 0.11], belly: [0.24, 0.23, 0.24], ear: [0.32, 0.20, 0.22], eye: [0.02, 0.02, 0.02], nose: [0.38, 0.20, 0.22] },
    { key: 'white', name: 'Snowdrop', fur: [0.86, 0.84, 0.79], belly: [0.96, 0.94, 0.90], ear: [0.92, 0.65, 0.64], eye: [0.36, 0.12, 0.12], nose: [0.88, 0.52, 0.56] },
    { key: 'ginger', name: 'Ember', fur: [0.62, 0.34, 0.14], belly: [0.84, 0.70, 0.50], ear: [0.80, 0.44, 0.34], eye: [0.30, 0.12, 0.04], nose: [0.70, 0.36, 0.32] },
    { key: 'moon', name: 'Moonfur', fur: [0.62, 0.68, 0.86], belly: [0.85, 0.90, 1.0], ear: [0.74, 0.62, 0.86], eye: [0.55, 0.85, 1.0], nose: [0.62, 0.60, 0.76], glow: true },
    { key: 'spotted', name: 'Pebble', fur: [0.44, 0.38, 0.30], belly: [0.78, 0.72, 0.60], ear: [0.70, 0.45, 0.42], eye: [0.10, 0.07, 0.05], nose: [0.60, 0.34, 0.36], spots: true }
  ];

  var STATES = ['idle', 'graze', 'sniff', 'groom', 'hop', 'flee', 'approach', 'eat', 'sleep', 'sit', 'play', 'follow'];

  function Rabbits(world, opts) {
    opts = opts || {};
    this.world = world;
    this.rabbits = new Map();
    this.warrens = new Map();
    this.particles = [];
    this.bonds = {};
    this.namesUsed = {};
    this.maxRabbits = opts.maxRabbits || 22;
    this.spawnRadius = 40;
    this.despawnRadius = 62;
    this.met = 0;
    this.totalFed = 0;
    this.totalPetted = 0;
    this.tamedCount = 0;
    this.babies = 0;
    this.time = 0;
    this.rng = new U.RNG((world.seed + 4711) | 0);
    this.onEvent = opts.onEvent || function () {};
    this.lastNight = false;
    this.quality = opts.quality || 1;
  }

  Rabbits.prototype.reset = function () {
    this.rabbits.clear();
    this.warrens.clear();
    this.particles.length = 0;
    this.bonds = {};
    this.namesUsed = {};
    this.met = 0;
    this.totalFed = 0;
    this.totalPetted = 0;
    this.tamedCount = 0;
    this.babies = 0;
  };

  Rabbits.prototype.setQuality = function (q) {
    this.quality = q;
    this.maxRabbits = q >= 2 ? 26 : q >= 1 ? 20 : 12;
  };

  /* ------------------------------------------------------------------ */
  /*  Warrens + spawning                                                 */
  /* ------------------------------------------------------------------ */
  Rabbits.prototype.sync = function (player) {
    var px = player.position[0], pz = player.position[2];
    var burrows = this.world.nearbyBurrows(px, pz, 50);
    var seenW = new Set();
    for (var i = 0; i < burrows.length; i++) {
      var src = burrows[i];
      seenW.add(src.id);
      var warren = this.warrens.get(src.id);
      if (!warren) {
        warren = {
          id: src.id, x: src.x, y: src.y, z: src.z,
          radius: src.radius || 1.4, family: Math.max(1, src.family || 2),
          variant: src.variant || 'mound', residents: [],
          spawnClock: 0, phase: Math.random() * 6.28, discovered: false
        };
        warren.rng = new U.RNG(U.hash2(Math.floor(src.x * 10), Math.floor(src.z * 10), 1234));
        this.warrens.set(src.id, warren);
        this._spawnFamily(warren, player);
      }
    }
    var self = this;
    this.warrens.forEach(function (w, id) {
      if (!seenW.has(id) && U.dist2(w.x, w.z, px, pz) > 56 * 56) self.warrens.delete(id);
    });

    // Ambient rabbits in friendly biomes, but only if the glade feels empty.
    var nearbyCount = 0;
    this.rabbits.forEach(function (r) {
      if (U.dist2(r.x, r.z, px, pz) < 45 * 45) nearbyCount++;
    });
    if (nearbyCount < Math.min(10, this.maxRabbits) && this.rabbits.size < this.maxRabbits) {
      var biome = this.world.biomeAt(px, pz);
      if (this.rng.chance(0.5 * biome.rabbitDensity)) {
        var a = this.rng.next() * Math.PI * 2;
        var d = 18 + this.rng.next() * 18;
        var sx = px + Math.cos(a) * d, sz = pz + Math.sin(a) * d;
        if (!this.world.waterAt(sx, sz)) {
          this._spawnRabbit(sx, this.world.heightAt(sx, sz), sz, null, player, false);
        }
      }
    }

    // Despawn distant rabbits (never tamed bonds).
    this.rabbits.forEach(function (r, id) {
      if (r.tamed) return;
      if (U.dist2(r.x, r.z, px, pz) > self.despawnRadius * self.despawnRadius) {
        self.rabbits.delete(id);
        if (r.warren) {
          var w = self.warrens.get(r.warren);
          if (w) {
            var idx = w.residents.indexOf(id);
            if (idx >= 0) w.residents.splice(idx, 1);
          }
        }
      }
    });
  };

  Rabbits.prototype._spawnFamily = function (warren, player) {
    var count = Math.max(1, warren.family);
    for (var i = 0; i < count; i++) {
      var a = warren.rng.next() * Math.PI * 2;
      var d = warren.rng.range(0.5, 2.2);
      var x = warren.x + Math.cos(a) * d;
      var z = warren.z + Math.sin(a) * d;
      var y = this.world.heightAt(x, z);
      if (y < SF.WATER + 0.3) y = warren.y;
      this._spawnRabbit(x, y, z, warren.id, player, i > 0 && warren.rng.chance(0.3));
    }
  };

  Rabbits.prototype._spawnRabbit = function (x, y, z, warrenId, player, isKit) {
    if (this.rabbits.size >= this.maxRabbits) return null;
    var id = 'rabbit-' + Math.floor(x * 10) + '-' + Math.floor(z * 10) + '-' + Math.floor(Math.random() * 1e6).toString(36);
    var pal = PALETTES[Math.floor(this.rng.next() * PALETTES.length)];
    var name = this._uniqueName();
    var scale = isKit ? this.rng.range(0.52, 0.65) : this.rng.range(0.88, 1.12);
    var saved = this.bonds[name];
    var rabbit = {
      id: id, name: name, palette: pal, scale: scale,
      x: x, y: y, z: z, homeX: x, homeZ: z,
      yaw: this.rng.next() * Math.PI * 2,
      state: 'idle', timer: this.rng.range(0.8, 2.6),
      target: null, targetX: x, targetZ: z,
      hopT: 1, hopDuration: 0.42, hopFromX: x, hopFromZ: z, hopToX: x, hopToZ: z,
      hopHeight: 0, speed: this.rng.range(0.75, 1.15),
      energy: this.rng.range(0.55, 1), hunger: this.rng.range(0.25, 0.7),
      trust: saved ? saved.trust : this.rng.range(0, 0.18),
      tamed: saved ? !!saved.tamed : false,
      follow: saved ? !!saved.tamed : false,
      warren: warrenId || null, isKit: !!isKit, age: isKit ? 0.25 : 1,
      blink: 0, blinkTimer: this.rng.range(1.5, 5),
      earTwitch: 0, earTwitchTimer: this.rng.range(0.8, 3.2),
      noseTwitch: 0, headPitch: 0, headYaw: 0,
      squeakTimer: 0, playMate: null, mother: null,
      lastPet: -99, lastFeed: -99, met: false,
      sleeping: false, sitting: false, sittingAtFire: null,
      footprint: 0, dust: 0, heart: 0,
      kitColors: pal.spots ? true : false, spotSeed: this.rng.next() * 99
    };
    if (saved && saved.tamed) {
      rabbit.follow = true;
      this.tamedCount++;
    }
    if (isKit) this.babies++;
    this.rabbits.set(id, rabbit);
    var warren = warrenId ? this.warrens.get(warrenId) : null;
    if (warren) warren.residents.push(id);
    return rabbit;
  };

  Rabbits.prototype._uniqueName = function () {
    var tries = 0;
    var name = U.NAMES.rabbit[Math.floor(this.rng.next() * U.NAMES.rabbit.length)];
    while (this.namesUsed[name] && tries++ < 30) {
      name = U.NAMES.rabbit[Math.floor(this.rng.next() * U.NAMES.rabbit.length)];
      if (tries > 12) name = name + ' ' + (tries - 11);
    }
    this.namesUsed[name] = true;
    return name;
  };

  /* ------------------------------------------------------------------ */
  /*  Update                                                             */
  /* ------------------------------------------------------------------ */
  Rabbits.prototype.update = function (dt, time, player, ctx) {
    this.time = time;
    ctx = ctx || {};
    var env = ctx.env || {};
    var carrots = ctx.carrots || null;
    var campfires = ctx.campfires || null;
    var night = !!env.night;
    this.lastNight = night;
    this.sync(player);

    var self = this;
    var px = player.position[0], pz = player.position[2];
    var playerCarrots = carrots ? carrots.count : 0;

    this.rabbits.forEach(function (r) {
      var dx = px - r.x, dz = pz - r.z;
      var dist = Math.sqrt(dx * dx + dz * dz);

      // Timers and idle animation.
      r.timer -= dt;
      r.blinkTimer -= dt;
      r.earTwitchTimer -= dt;
      r.noseTwitch += dt * (4 + Math.sin(time * 2 + r.spotSeed) * 2);
      r.hunger = U.clamp(r.hunger + dt * 0.0035, 0, 1);
      r.energy = U.clamp(r.energy - dt * 0.002, 0, 1);
      if (r.blinkTimer <= 0) {
        r.blink = 0.15;
        r.blinkTimer = 2.2 + Math.random() * 4.5;
      }
      if (r.blink > 0) r.blink -= dt;
      if (r.earTwitchTimer <= 0) {
        r.earTwitch = 0.22;
        r.earTwitchTimer = 1.2 + Math.random() * 3.4;
      }
      if (r.earTwitch > 0) r.earTwitch -= dt;

      // Discover / first meeting.
      if (!r.met && dist < 6.2) {
        r.met = true;
        self.met++;
        self.onEvent('rabbit:met', r);
      }

      // Tamed rabbits follow the player.
      if (r.tamed && r.follow) {
        if (dist > 3.2) {
          self._setState(r, 'follow');
          self._steerTo(r, px, pz, 1.2);
        } else if (r.state !== 'idle' && r.state !== 'graze' && r.state !== 'sit') {
          self._setState(r, 'idle');
          r.timer = 1.5;
        }
      }

      // Fear (unless tamed or currently being fed).
      if (!r.tamed && r.state !== 'follow' && r.state !== 'eat' && dist < 2.6 + (playerCarrots > 0 ? -0.4 : 0)) {
        if (r.trust < 0.55) {
          if (r.state !== 'flee') {
            self._setState(r, 'flee');
            r.timer = 1.6;
            U.Audio.thump();
            self._spawnDust(r);
          }
          var away = Math.atan2(r.x - px, r.z - pz) + (Math.random() - 0.5) * 0.5;
          self._steerTo(r, r.x + Math.sin(away) * 6, r.z + Math.cos(away) * 6, 1.8);
        }
      }

      // Player holding a carrot: curious approach.
      if (!r.tamed && playerCarrots > 0 && dist < 9 && dist > 1.4 && r.state !== 'flee' && r.state !== 'sleep') {
        if (r.timer <= 0 || r.state === 'idle' || r.state === 'sniff') {
          self._setState(r, 'approach');
          r.timer = 1.1;
          self._steerTo(r, px, pz, 0.65);
        }
      }

      // Night behaviour: fire circles and burrows.
      if (night && !r.tamed) {
        var fire = null;
        if (campfires) {
          var fires = campfires.getGatheringSpots();
          var bd = 14 * 14;
          for (var f = 0; f < fires.length; f++) {
            var d2 = U.dist2(fires[f].x, fires[f].z, r.x, r.z);
            if (d2 < bd) { bd = d2; fire = fires[f]; }
          }
        }
        if (fire && r.state !== 'sleep' && r.state !== 'flee' && dist > 2.5) {
          if (r.timer <= 0) {
            self._setState(r, 'sit');
            r.sittingAtFire = fire.id;
            r.timer = 4;
            self._steerTo(r, fire.x + Math.cos(r.spotSeed) * 2.6, fire.z + Math.sin(r.spotSeed) * 2.6, 0.55);
          }
        } else if (!fire && r.warren && r.state !== 'sleep' && r.state !== 'flee' && dist > 5) {
          if (r.timer <= 0 && Math.random() < 0.4) {
            self._setState(r, 'sleep');
            r.timer = 8 + Math.random() * 10;
            r.sleeping = true;
          }
        }
      } else if (!night) {
        r.sleeping = false;
      }

      // Hungry rabbits seek carrots.
      if (carrots && r.hunger > 0.45 && r.state !== 'flee' && r.state !== 'sleep' && r.state !== 'follow') {
        var plant = self._nearestCarrot(carrots, r.x, r.z, 13);
        if (plant) {
          if (U.dist2(plant.x, plant.z, r.x, r.z) > 0.8 * 0.8) {
            if (r.timer <= 0) {
              self._setState(r, 'approach');
              r.timer = 1.4;
              self._steerTo(r, plant.x, plant.z, 0.55);
            }
          } else {
            self._setState(r, 'eat');
            r.timer = 1.6;
            r.hunger = U.clamp(r.hunger - dt * 0.15, 0, 1);
            if (r.squeakTimer <= 0) {
              r.squeakTimer = 2.4;
              if (Math.random() < 0.4) U.Audio.chirp();
            }
          }
        }
      }
      if (r.squeakTimer > 0) r.squeakTimer -= dt;

      // State expiry.
      if (r.timer <= 0) {
        self._chooseIdleState(r, night, campfires);
      }

      // Hop / movement.
      self._updateMovement(r, dt, env);
    });

    // Particle update.
    for (var i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.vy += (p.gravity || 0) * dt;
      p.alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      if (p.kind === 'heart') p.size += dt * 0.25;
      if (p.kind === 'dust') p.size += dt * 0.8;
    }
  };

  Rabbits.prototype._nearestCarrot = function (carrots, x, z, radius) {
    var best = null, bd = radius * radius;
    carrots.plants.forEach(function (p) {
      if (p.harvested) return;
      var d = U.dist2(p.x, p.z, x, z);
      if (d < bd) { bd = d; best = p; }
    });
    return best;
  };

  Rabbits.prototype._chooseIdleState = function (r, night, campfires) {
    if (r.state === 'flee' && r.trust > 0.3) {
      this._setState(r, 'idle');
      r.timer = 1.2;
      return;
    }
    if (night && !r.tamed) {
      this._setState(r, 'sleep');
      r.sleeping = true;
      r.timer = 6 + Math.random() * 12;
      return;
    }
    var roll = Math.random();
    if (roll < 0.24) { this._setState(r, 'graze'); r.timer = 2 + Math.random() * 3; }
    else if (roll < 0.45) { this._setState(r, 'sniff'); r.timer = 1 + Math.random() * 2; }
    else if (roll < 0.56) { this._setState(r, 'groom'); r.timer = 1.5 + Math.random() * 2; }
    else if (roll < 0.68) {
      this._setState(r, 'idle'); r.timer = 1.5 + Math.random() * 3;
      r.headYaw = (Math.random() - 0.5) * 1.2;
    } else if (roll < 0.78) {
      this._setState(r, 'sit'); r.timer = 1.2 + Math.random() * 2.4;
    } else if (roll < 0.9) {
      this._setState(r, 'hop'); r.timer = 1;
      var a = Math.random() * Math.PI * 2;
      var d = 1 + Math.random() * 3.2;
      this._steerTo(r, r.x + Math.cos(a) * d, r.z + Math.sin(a) * d, 1);
    } else {
      this._setState(r, 'play'); r.timer = 1.2;
      var mate = this._findPlaymate(r);
      r.playMate = mate ? mate.id : null;
      if (mate) this._steerTo(r, mate.x, mate.z, 1.2);
    }
  };

  Rabbits.prototype._findPlaymate = function (r) {
    var best = null, bd = 8 * 8;
    this.rabbits.forEach(function (o) {
      if (o.id === r.id) return;
      if (o.state === 'flee' || o.state === 'sleep') return;
      var d = U.dist2(o.x, o.z, r.x, r.z);
      if (d < bd) { bd = d; best = o; }
    });
    return best;
  };

  Rabbits.prototype._setState = function (r, state) {
    if (r.state === state) return;
    r.state = state;
    r.sleeping = (state === 'sleep');
    r.sitting = (state === 'sit');
    if (state !== 'sit') r.sittingAtFire = null;
    r.timer = Math.max(r.timer, 0.4);
  };

  Rabbits.prototype._steerTo = function (r, x, z, speedScale) {
    var dx = x - r.x, dz = z - r.z;
    var d = Math.sqrt(dx * dx + dz * dz) || 1;
    r.yaw = Math.atan2(dx, dz);
    r.targetX = x;
    r.targetZ = z;
    if (r.hopT >= 1) {
      var step = Math.min(0.95, d);
      var nx = r.x + (dx / d) * step;
      var nz = r.z + (dz / d) * step;
      if (this.world.waterAt(nx, nz)) return;
      var resolved = this.world.resolveCollision(nx, nz, 0.18);
      r.hopFromX = r.x; r.hopFromZ = r.z;
      r.hopToX = resolved[0]; r.hopToZ = resolved[1];
      r.hopT = 0;
      r.hopDuration = (r.state === 'flee' ? 0.26 : 0.45) / (speedScale || 1);
      r.hopApex = (r.state === 'flee' ? 0.55 : 0.28) * r.scale;
    }
  };

  Rabbits.prototype._updateMovement = function (r, dt, env) {
    if (r.hopT < 1) {
      r.hopT = Math.min(1, r.hopT + dt / r.hopDuration);
      var t = r.hopT;
      r.x = U.lerp(r.hopFromX, r.hopToX, t);
      r.z = U.lerp(r.hopFromZ, r.hopToZ, t);
      r.hopHeight = Math.sin(t * Math.PI) * (r.hopApex || 0.3);
      if (t >= 1) {
        r.hopHeight = 0;
        this._spawnDust(r);
      }
    } else {
      r.hopHeight = 0;
      // Tamed rabbits idle-follow at a gentle distance.
      if (r.tamed && r.follow && U.dist2(r.x, r.z, r.targetX, r.targetZ) > 0.6 && r.state === 'follow') {
        this._steerTo(r, r.targetX, r.targetZ, 1);
      }
    }
    var ground = this.world.heightAt(r.x, r.z);
    if (ground < SF.WATER + 0.05) {
      // Never swim: turn back inland.
      var a = Math.atan2(r.x, r.z) + Math.PI;
      this._steerTo(r, r.x + Math.sin(a) * 3, r.z + Math.cos(a) * 3, 1.4);
      ground = Math.max(ground, this.world.heightAt(r.homeX, r.homeZ));
    }
    r.y = ground + r.hopHeight;
    // Face travel direction smoothly.
    r.headYaw = U.damp(r.headYaw, Math.sin(this.time * 0.7 + r.spotSeed) * 0.25, 2, dt);
  };

  Rabbits.prototype._spawnDust = function (r) {
    for (var i = 0; i < 3; i++) {
      this.particles.push({
        kind: 'dust', x: r.x + (Math.random() - 0.5) * 0.2, y: r.y + 0.02,
        z: r.z + (Math.random() - 0.5) * 0.2,
        vx: (Math.random() - 0.5) * 0.4, vy: 0.1 + Math.random() * 0.2,
        vz: (Math.random() - 0.5) * 0.4, gravity: -0.15,
        life: 0.45 + Math.random() * 0.3, maxLife: 0.75,
        size: 0.16 + Math.random() * 0.12, alpha: 0.4,
        color: [0.48, 0.40, 0.30], additive: false
      });
    }
  };

  Rabbits.prototype._spawnHearts = function (r, count) {
    for (var i = 0; i < (count || 4); i++) {
      this.particles.push({
        kind: 'heart', x: r.x + (Math.random() - 0.5) * 0.35, y: r.y + 0.5 + Math.random() * 0.2,
        z: r.z + (Math.random() - 0.5) * 0.35,
        vx: (Math.random() - 0.5) * 0.5, vy: 0.4 + Math.random() * 0.4,
        vz: (Math.random() - 0.5) * 0.5, gravity: -0.05,
        life: 0.9 + Math.random() * 0.7, maxLife: 1.5,
        size: 0.22 + Math.random() * 0.12, alpha: 1,
        color: [1.0, 0.38, 0.55], additive: true
      });
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Interaction                                                        */
  /* ------------------------------------------------------------------ */
  Rabbits.prototype.nearest = function (player, maxDist) {
    maxDist = maxDist || 3.0;
    var best = null, bestScore = -1;
    var fx = Math.sin(player.yaw || 0), fz = Math.cos(player.yaw || 0);
    var px = player.position[0], pz = player.position[2];
    this.rabbits.forEach(function (r) {
      var dx = r.x - px, dz = r.z - pz;
      var d2 = dx * dx + dz * dz;
      if (d2 > maxDist * maxDist) return;
      var d = Math.sqrt(d2) || 0.01;
      var dot = (dx / d) * fx + (dz / d) * fz;
      var score = dot + (1 - d / maxDist) * 0.8 + (r.tamed ? 0.5 : 0);
      if (score > bestScore) { bestScore = score; best = r; }
    });
    return best;
  };

  Rabbits.prototype.interaction = function (player, carrots) {
    var r = this.nearest(player, 3.0);
    if (!r) return null;
    var canFeed = carrots && carrots.count > 0;
    return {
      type: 'rabbit', label: (canFeed ? '🥕 Feed ' : '✋ Pet ') + r.name,
      sub: (r.tamed ? 'Bonded friend' : (r.trust > 0.45 ? 'Getting curious' : 'Wild rabbit')) +
        ' · ' + Math.round(r.trust * 100) + '% trust',
      target: r, range: 3.0, priority: 4
    };
  };

  Rabbits.prototype.interact = function (player, carrots) {
    var r = this.nearest(player, 3.0);
    if (!r) return null;
    if (carrots && carrots.count > 0 && r.trust < 0.98) {
      carrots.count--;
      r.trust = Math.min(1, r.trust + 0.2);
      r.hunger = Math.max(0, r.hunger - 0.6);
      r.lastFeed = this.time;
      this.totalFed++;
      this._spawnHearts(r, 6);
      U.Audio.squeak(1.25);
      if (r.trust >= 0.72 && !r.tamed) {
        r.tamed = true;
        r.follow = true;
        this.tamedCount++;
        this.bonds[r.name] = { name: r.name, trust: r.trust, tamed: true, palette: r.palette.key };
        this.onEvent('rabbit:tamed', r);
        return { text: '🥕 ' + r.name + ' accepts the carrot and decides you are safe. ' + r.name + ' will follow you.', kind: 'good', tamed: true, rabbit: r };
      }
      this.bonds[r.name] = { name: r.name, trust: r.trust, tamed: r.tamed, palette: r.palette.key };
      return { text: '🥕 ' + r.name + ' nibbles the carrot. Trust ' + Math.round(r.trust * 100) + '%.', kind: 'good', rabbit: r };
    }
    r.trust = Math.min(1, r.trust + 0.055);
    r.lastPet = this.time;
    this.totalPetted++;
    this._spawnHearts(r, 3);
    if (r.state === 'sleep') this._setState(r, 'idle');
    U.Audio.squeak(1.0 + Math.random() * 0.2);
    if (r.trust >= 0.72 && !r.tamed) {
      r.tamed = true;
      r.follow = true;
      this.tamedCount++;
      this.bonds[r.name] = { name: r.name, trust: r.trust, tamed: true, palette: r.palette.key };
      this.onEvent('rabbit:tamed', r);
      return { text: '✋ You earn ' + r.name + '\'s trust. A new friend follows you.', kind: 'good', tamed: true, rabbit: r };
    }
    return { text: '✋ You pet ' + r.name + '. Ears twitch. Trust ' + Math.round(r.trust * 100) + '%.', kind: 'good', rabbit: r };
  };

  Rabbits.prototype.callCompanions = function (player) {
    var self = this;
    var count = 0;
    this.rabbits.forEach(function (r) {
      if (r.tamed && r.follow && U.dist2(r.x, r.z, player.position[0], player.position[2]) > 9) {
        r.targetX = player.position[0] + (Math.random() - 0.5) * 2;
        r.targetZ = player.position[2] + (Math.random() - 0.5) * 2;
        self._steerTo(r, r.targetX, r.targetZ, 1.6);
        count++;
      }
    });
    if (count) U.Audio.squeak(1.4);
    return count;
  };

  /* ------------------------------------------------------------------ */
  /*  Meshes                                                             */
  /* ------------------------------------------------------------------ */
  Rabbits.prototype.build = function (b, time, player, reduce) {
    var self = this;
    var count = 0;
    this.warrens.forEach(function (w) {
      self._buildWarren(b, w, time, reduce);
    });
    this.rabbits.forEach(function (r) {
      self._buildRabbit(b, r, time, reduce);
      count++;
    });
    return count;
  };

  Rabbits.prototype._buildWarren = function (b, w, time, reduce) {
    var y = this.world.heightAt(w.x, w.z);
    var rng = new U.RNG(U.hash2(Math.floor(w.x * 10), Math.floor(w.z * 10), 999));
    var dirt = [0.31, 0.22, 0.13];
    b.push();
    b.translate(w.x, y, w.z);
    // Mound.
    b.ellipsoid(0, 0.04, 0, w.radius, 0.32, w.radius * 0.9, 8, 4, dirt, 0);
    // Hole: a dark disc and an inner shadow cone.
    b.disc(0.05, 0.10, 0.1, w.radius * 0.48, 12, [0.03, 0.025, 0.02], 0);
    b.cone(0.05, -0.1, 0.1, w.radius * 0.44, 0.26, 8, [0.02, 0.018, 0.015], 0);
    // Roots around the entrance.
    for (var i = 0; i < 5; i++) {
      var a = rng.next() * Math.PI * 2;
      b.push();
      b.translate(Math.cos(a) * w.radius * 0.9, 0.03, Math.sin(a) * w.radius * 0.9);
      b.rotateY(a);
      b.rotateZ(0.5);
      b.cylinder(0, 0, 0, 0.05, 0.015, 0.45, 4, [0.24, 0.16, 0.09], 0, false, false);
      b.pop();
    }
    // Grass tufts and tiny flowers.
    for (var g = 0; g < 6; g++) {
      var ga = rng.next() * Math.PI * 2;
      var gr = w.radius * (1.0 + rng.next() * 0.5);
      b.leaf(Math.cos(ga) * gr, 0.05, Math.sin(ga) * gr, 0.28, 0.1, ga, 0.2,
        [0.32, 0.48, 0.20], 0);
    }
    // A rabbit skull or bones for flavour.
    if (w.variant === 'roots' || rng.chance(0.3)) {
      b.box(-w.radius * 0.8, 0.16, w.radius * 0.5, 0.35, 0.05, 0.05, [0.78, 0.74, 0.64], 0);
      b.sphere(-w.radius * 0.8 + 0.15, 0.18, w.radius * 0.5, 0.06, 4, 3, [0.82, 0.78, 0.68], 0);
    }
    // Little sign made of sticks.
    b.cylinder(w.radius * 0.9, 0, -w.radius * 0.4, 0.025, 0.02, 0.85, 4, [0.30, 0.21, 0.12], 0, true, false);
    b.box(w.radius * 0.9, 0.82, -w.radius * 0.4, 0.42, 0.18, 0.04, [0.42, 0.30, 0.16], 0);
    b.pop();

    // Rabbits who live here are rendered separately; a faint warm glow marks
    // the entrance at night.
    if (this.lastNight && !reduce) {
      b.disc(w.x + 0.05, y + 0.12, w.z + 0.1, w.radius * 0.28, 8, [1.0, 0.55, 0.55], 0.18);
    }
  };

  Rabbits.prototype._buildRabbit = function (b, r, time, reduce) {
    var pal = r.palette;
    var s = r.scale;
    var hop = r.hopHeight;
    var stretch = 1.0;
    var squash = 1.0;
    if (r.hopT < 1) {
      var t = r.hopT;
      stretch = 1 + Math.sin(t * Math.PI) * 0.16;
      squash = 1 - Math.sin(t * Math.PI) * 0.12;
    }
    var breathe = reduce ? 0 : Math.sin(time * 2.4 + r.spotSeed) * 0.012;
    var earBack = r.state === 'flee' ? 0.8 : (r.state === 'sleep' ? 0.65 : 0);
    var earTwitch = r.earTwitch > 0 ? Math.sin(time * 55) * 0.16 : 0;
    var bodyBob = (r.state === 'graze' ? -0.04 : 0) + (r.state === 'sit' ? 0.05 : 0);
    var headDown = r.state === 'graze' || r.state === 'eat' ? 0.55 : 0;
    var sleepDrop = r.state === 'sleep' ? 0.12 : 0;

    b.push();
    b.translate(r.x, r.y, r.z);
    b.rotateY(r.yaw);

    // Soft shadow.
    b.disc(0, 0.012, 0, 0.42 * s, 10, [0.05, 0.04, 0.03], 0);

    // Body (two lobes: chest and haunch).
    b.push();
    b.translate(0, 0.30 * s - sleepDrop + bodyBob, 0);
    b.scale(s, s, s);
    b.ellipsoid(0, 0, 0.02, 0.22, 0.21 * (1 + breathe) * squash, 0.36 * stretch, 10, 6, pal.fur, 0);
    b.ellipsoid(0, 0.02, -0.23, 0.24, 0.23, 0.2, 9, 5, pal.fur, 0);
    // Belly/chest patch.
    b.ellipsoid(0, -0.04, 0.15, 0.16, 0.15, 0.2, 8, 4, pal.belly, 0);
    // Spots.
    if (pal.spots) {
      b.ellipsoid(0.15, 0.08, -0.1, 0.09, 0.07, 0.12, 5, 3, [0.18, 0.15, 0.12], 0);
      b.ellipsoid(-0.12, 0.1, 0.18, 0.07, 0.06, 0.09, 5, 3, [0.20, 0.17, 0.13], 0);
    }
    b.pop();

    // Tail.
    b.sphere(0, 0.27 * s - sleepDrop, -0.46 * s, 0.09 * s, 7, 4, pal.belly, 0);

    // Head group.
    b.push();
    b.translate(0, 0.47 * s - sleepDrop + bodyBob, 0.3 * s);
    b.rotateX(headDown);
    b.rotateY(r.headYaw * 0.5);
    b.scale(s, s, s);
    b.ellipsoid(0, 0.04, 0.06, 0.17, 0.16, 0.18, 9, 5, pal.fur, 0);
    // Cheeks / muzzle.
    b.ellipsoid(0, -0.015, 0.19, 0.11, 0.085, 0.14, 8, 5, pal.belly, 0);
    b.ellipsoid(0, 0.03, 0.28, 0.055, 0.045, 0.07, 6, 4, pal.nose, 0);
    // Nose.
    b.sphere(0, 0.04, 0.325, 0.025, 5, 3, [0.45, 0.22, 0.24], 0);

    // Eyes (side-facing) + highlights.
    var blink = r.blink > 0;
    var eyeEm = pal.glow && this.lastNight ? 0.55 : 0;
    for (var e = -1; e <= 1; e += 2) {
      if (blink) {
        b.box(e * 0.12, 0.08, 0.20, 0.055, 0.012, 0.012, [0.10, 0.07, 0.05], 0);
      } else {
        b.sphere(e * 0.12, 0.075, 0.19, 0.038, 6, 4, pal.eye, eyeEm);
        b.sphere(e * 0.13 + 0.01, 0.09, 0.22, 0.012, 4, 3, [0.98, 0.98, 0.92], 0.2);
      }
    }

    // Ears: outer fur, pink inner, tufts. Animate back when fleeing/sleeping.
    var earAngles = [-0.22, 0.22];
    for (var ear = 0; ear < 2; ear++) {
      var side = ear === 0 ? -1 : 1;
      b.push();
      b.translate(side * 0.085, 0.17, 0.02);
      b.rotateZ(-side * (0.22 + earBack * 0.55) + earTwitch * side);
      b.rotateX(-0.18 - earBack * 0.55 + (r.state === 'sleep' ? 0.75 : 0));
      b.scale(1, 1 + breathe * 2, 1);
      b.ellipsoid(0, 0.17, 0, 0.06, 0.24, 0.075, 7, 5, pal.fur, 0);
      b.ellipsoid(0, 0.17, 0.038, 0.032, 0.19, 0.03, 6, 4, pal.ear, 0);
      // Tuft at the tip.
      b.cone(0, 0.33, 0, 0.035, 0.12, 5, pal.belly, 0);
      b.pop();
    }

    // Whiskers (thin, two per side).
    for (var w = 0; w < 3; w++) {
      for (var ws = -1; ws <= 1; ws += 2) {
        b.push();
        b.translate(ws * 0.09, 0.0, 0.28);
        b.rotateY(ws * (0.35 + w * 0.12));
        b.rotateZ(ws * (0.08 + w * 0.06));
        b.box(0, 0, 0.12, 0.006, 0.006, 0.25, [0.84, 0.78, 0.68], 0);
        b.pop();
      }
    }
    b.pop();

    // Front legs.
    var legSwing = (r.hopT < 1) ? Math.sin(r.hopT * Math.PI) * 0.5 : 0;
    for (var fl = -1; fl <= 1; fl += 2) {
      b.push();
      b.translate(fl * 0.12 * s, 0.18 * s - sleepDrop, 0.22 * s);
      b.rotateX(-0.3 + legSwing * (fl > 0 ? 1 : -1));
      b.scale(s, s, s);
      b.cylinder(0, -0.13, 0, 0.045, 0.035, 0.2, 5, pal.fur, 0, true, false);
      b.box(0, -0.14, 0.03, 0.09, 0.05, 0.16, pal.belly, 0);
      b.pop();
    }
    // Back legs (powerful haunches).
    for (var bl = -1; bl <= 1; bl += 2) {
      b.push();
      b.translate(bl * 0.17 * s, 0.17 * s - sleepDrop, -0.25 * s);
      b.rotateX(0.15 - legSwing * 0.6);
      b.scale(s, s, s);
      b.ellipsoid(0, 0.02, 0, 0.13, 0.16, 0.17, 7, 4, pal.fur, 0);
      b.box(0, -0.13, 0.1, 0.11, 0.06, 0.24, pal.belly, 0);
      b.pop();
    }

    // Sleeping Zzz / sitting sparkle handled by particles; no text in 3D.
    if (r.state === 'sleep' && !reduce) {
      var zt = (time * 0.6 + r.spotSeed) % 2;
      b.sphere(0.2 * s, (0.62 + zt * 0.22) * s, 0.28 * s, 0.02 + zt * 0.012, 4, 3, [0.6, 0.7, 0.9], 0.25);
    }

    b.pop();
  };

  /* ------------------------------------------------------------------ */
  /*  Persistence                                                        */
  /* ------------------------------------------------------------------ */
  Rabbits.prototype.serialize = function () {
    var self = this;
    this.rabbits.forEach(function (r) {
      if (r.tamed || r.trust > 0.5) {
        self.bonds[r.name] = {
          name: r.name, trust: r.trust, tamed: r.tamed,
          palette: r.palette.key, follow: r.follow
        };
      }
    });
    return {
      bonds: this.bonds,
      met: this.met,
      totalFed: this.totalFed,
      totalPetted: this.totalPetted,
      tamedCount: this.tamedCount
    };
  };

  Rabbits.prototype.load = function (data) {
    if (!data) return;
    this.bonds = data.bonds || {};
    this.met = data.met || 0;
    this.totalFed = data.totalFed || 0;
    this.totalPetted = data.totalPetted || 0;
    this.tamedCount = data.tamedCount || 0;
    // If the player has bonds, bring one companion to the spawn clearing.
    var names = Object.keys(this.bonds);
    if (names.length && this.world) {
      var b = this.bonds[names[0]];
      var sp = this.world.spawn || this.world.findSpawn();
      var r = this._spawnRabbit(sp.x + 1.5, this.world.heightAt(sp.x + 1.5, sp.z + 1.5), sp.z + 1.5, null, null, false);
      if (r) {
        r.tamed = true; r.follow = true; r.trust = 1;
        r.name = b.name || r.name;
        var pal = null;
        for (var i = 0; i < PALETTES.length; i++) if (PALETTES[i].key === b.palette) pal = PALETTES[i];
        if (pal) r.palette = pal;
      }
    }
  };

  Rabbits.prototype.speciesList = function () {
    return PALETTES.map(function (p) {
      return { key: p.key, name: p.name, glow: !!p.glow, spots: !!p.spots };
    });
  };

  Rabbits.PALETTES = PALETTES;
  Rabbits.STATES = STATES;
  SF.Rabbits = Rabbits;
})(typeof window !== 'undefined' ? window : globalThis);
