/* ==========================================================================
 *  ENDLESS SPOOKY FOREST — fishing.js
 *  A quiet fishing minigame for the misty ponds: cast, wait for a bite,
 *  strike, then hold and release the line as the fish surges. Catches are
 *  weighted by time of day, weather and blood moons.
 * ========================================================================== */
(function (root) {
  'use strict';

  var SF = root.SpookyForest = root.SpookyForest || {};
  var U = SF.Util;

  var WATER_Y = (SF.World && SF.World.WATER) || 0.45;
  var CAST_RANGE = 9;

  var FISH = [
    { key: 'perch', name: 'Bone Perch', weight: 30, size: [16, 44], color: [0.78, 0.76, 0.64],
      desc: 'Pale as a knuckle, but firm and sweet over a fire.' },
    { key: 'carp', name: 'Ghost Carp', weight: 22, size: [28, 68], color: [0.72, 0.78, 0.82],
      desc: 'Its scales hold a little moonlight long after it leaves the water.' },
    { key: 'trout', name: 'Wisp Trout', weight: 16, size: [22, 52], color: [0.55, 0.72, 0.62],
      desc: 'Follows fog through the ponds. Tastes faintly of woodsmoke.' },
    { key: 'eel', name: 'Lantern Eel', weight: 11, size: [36, 92], color: [0.9, 0.66, 0.28],
      desc: 'A living wick. Its light dims the moment it is lifted clear.' },
    { key: 'moonfin', name: 'Moonfin', weight: 3, size: [30, 74], color: [0.78, 0.72, 1.0],
      desc: 'Only rises when the moon is full or bleeding. Utterly silent.' },
    { key: 'boot', name: 'Soggy Boot', weight: 9, size: [24, 34], color: [0.34, 0.26, 0.2],
      desc: 'Someone walked out of the pond without it. You hope.' },
    { key: 'crown', name: 'Drowned Crown', weight: 1, size: [20, 26], color: [0.92, 0.78, 0.32],
      desc: 'A circlet of blackened gold. The water has no king now.' }
  ];

  var FISH_BY_KEY = {};
  for (var fi = 0; fi < FISH.length; fi++) FISH_BY_KEY[FISH[fi].key] = FISH[fi];

  function Fishing(world, opts) {
    opts = opts || {};
    this.world = world;
    this.onEvent = opts.onEvent || function () {};
    this.state = 'idle';
    this.timer = 0;
    this.spot = null;
    this.spotClock = 0;
    this.reel = 0;
    this.tension = 0.4;
    this.slack = 0;
    this.reelPulse = 0;
    this.surge = 0;
    this.time = 0;
    this.fish = 0;
    this.cooked = 0;
    this.totalCaught = 0;
    this.records = {};
    this.counts = {};
    this.catches = [];
    this.biggest = null;
    this.last = null;
    this.particles = [];
    this.player = null;
    this.lastBiteAt = 0;
  }

  Fishing.prototype.reset = function () {
    this.state = 'idle';
    this.timer = 0;
    this.spot = null;
    this.spotClock = 0;
    this.reel = 0;
    this.tension = 0.4;
    this.slack = 0;
    this.reelPulse = 0;
    this.surge = 0;
    this.fish = 0;
    this.cooked = 0;
    this.totalCaught = 0;
    this.records = {};
    this.counts = {};
    this.catches = [];
    this.biggest = null;
    this.last = null;
    this.particles.length = 0;
    this.player = null;
  };

  Fishing.prototype.isActive = function () { return this.state !== 'idle'; };

  /* ------------------------------------------------------------------ */
  /*  Water detection                                                    */
  /* ------------------------------------------------------------------ */
  Fishing.prototype.findSpot = function (player) {
    var p = player.position;
    var yaw = player.yaw || 0;
    var angles = [0, -0.28, 0.28, -0.55, 0.55, -0.85, 0.85];
    for (var a = 0; a < angles.length; a++) {
      var ang = yaw + angles[a];
      var sx = Math.sin(ang), sz = Math.cos(ang);
      for (var d = 2.4; d <= CAST_RANGE; d += 0.8) {
        var x = p[0] + sx * d;
        var z = p[2] + sz * d;
        var h = this.world.heightAt(x, z);
        if (h < WATER_Y - 0.24) {
          // Fish a little way out from the shore, not at the very edge.
          var out = Math.min(2.6, (WATER_Y - h) * 1.4 + 0.8);
          return {
            x: x + sx * out, z: z + sz * out,
            shoreX: x, shoreZ: z, y: WATER_Y + 0.05,
            dist: d, angle: ang
          };
        }
      }
    }
    return null;
  };

  Fishing.prototype.refreshSpot = function (player) {
    this.player = player;
    var spot = this.findSpot(player);
    if (spot) {
      spot.y = WATER_Y + 0.05;
      this.spot = spot;
    } else {
      this.spot = null;
    }
    return this.spot;
  };

  /* ------------------------------------------------------------------ */
  /*  Interaction                                                        */
  /* ------------------------------------------------------------------ */
  Fishing.prototype.label = function () {
    if (this.state === 'casting') return 'Casting the line…';
    if (this.state === 'waiting') return 'Waiting for a bite…';
    if (this.state === 'bite') return '❗ Something is biting!';
    if (this.state === 'hooked') return '🎣 Reel it in!';
    if (this.state === 'landed') return this.last ? 'Caught: ' + this.last.name : 'Landed!';
    return 'Cast Line';
  };

  Fishing.prototype.interaction = function (player) {
    if (this.state === 'idle') {
      var spot = this.spot;
      if (!spot) return null;
      return {
        type: 'fish', label: '🎣 Cast Line',
        sub: 'Something moves beneath the mist', target: spot, range: 9, priority: 2
      };
    }
    if (this.state === 'waiting') {
      return {
        type: 'fish', label: '🎣 Reel In',
        sub: 'Nothing yet — but the line is out', target: this.spot, range: 12, priority: 3
      };
    }
    if (this.state === 'bite') {
      return {
        type: 'fish', label: '❗ Strike!',
        sub: 'Tap E before it spits the hook', target: this.spot, range: 12, priority: 9
      };
    }
    if (this.state === 'hooked') {
      return {
        type: 'fish', label: '🎣 Hold E to Reel',
        sub: 'Release when the line strains', target: this.spot, range: 12, priority: 9
      };
    }
    return null;
  };

  Fishing.prototype.action = function (player) {
    if (this.state === 'idle') return this.cast(player);
    if (this.state === 'waiting' || this.state === 'casting') return this.reelBack('You reel the empty line back in.');
    if (this.state === 'bite') return this.hook(player);
    if (this.state === 'hooked') { this.reelPulse = Math.min(1, this.reelPulse + 0.35); return { text: 'The reel sings.', kind: 'info' }; }
    if (this.state === 'landed') { this.resetLine(); return null; }
    return null;
  };

  Fishing.prototype.cast = function (player) {
    this.refreshSpot(player);
    if (!this.spot) return { text: 'No water within reach. Find a pond or a flooded hollow.', kind: 'warn' };
    if (this.world.waterAt(player.position[0], player.position[2])) {
      return { text: 'You are standing in the pond. Step onto the shore first.', kind: 'warn' };
    }
    this.state = 'casting';
    this.timer = 0.65;
    this.reel = 0;
    this.tension = 0.4;
    this.slack = 0;
    this.last = null;
    U.Audio.whoosh();
    this._splash(this.spot.x, this.spot.z, 4, 0.7);
    return { text: '🎣 The line arcs out and settles on the water.', kind: 'good' };
  };

  Fishing.prototype.reelBack = function (message) {
    this.state = 'idle';
    this.timer = 0;
    this.spot = null;
    U.Audio.noise(0.16, 0.03, 900);
    return { text: message || 'You reel the line back in.', kind: 'info' };
  };

  Fishing.prototype.hook = function (player) {
    this.state = 'hooked';
    this.reel = 0.06;
    this.tension = 0.38;
    this.slack = 0;
    this.timer = 0;
    this.lastBiteAt = this.time;
    U.Audio.thump();
    this._splash(this.spot.x, this.spot.z, 10, 1.4);
    this.onEvent('fish:hooked', { spot: this.spot });
    return { text: '❗ Hooked! Hold E to reel, release when the line strains.', kind: 'good' };
  };

  Fishing.prototype.chooseFish = function (env) {
    var night = !!(env && env.night);
    var rain = !!(env && env.rain > 0.4);
    var blood = !!(env && (env.bloodMoon || (env.isBloodMoon)));
    var weighted = [];
    for (var i = 0; i < FISH.length; i++) {
      var f = FISH[i];
      var w = f.weight;
      if (f.key === 'eel' && night) w *= 3.2;
      if (f.key === 'trout' && rain) w *= 2.4;
      if (f.key === 'moonfin' && blood) w *= 9;
      if (f.key === 'crown' && blood) w *= 2.5;
      if (f.key === 'boot' && night) w *= 0.7;
      weighted.push({ fish: f, w: w });
    }
    var total = 0;
    for (var j = 0; j < weighted.length; j++) total += weighted[j].w;
    var roll = Math.random() * total;
    for (var k = 0; k < weighted.length; k++) {
      roll -= weighted[k].w;
      if (roll <= 0) return weighted[k].fish;
    }
    return FISH[0];
  };

  Fishing.prototype.land = function (env) {
    var f = this.chooseFish(env);
    var t = (f.size[0] + Math.random() * (f.size[1] - f.size[0]));
    var size = Math.round(t * 10) / 10;
    if (!this.records[f.key] || size > this.records[f.key]) this.records[f.key] = size;
    this.counts[f.key] = (this.counts[f.key] || 0) + 1;
    this.totalCaught++;
    if (f.key !== 'boot') this.fish++;
    var catchObj = { key: f.key, name: f.name, size: size, desc: f.desc, at: this.time };
    this.last = catchObj;
    this.catches.unshift(catchObj);
    if (this.catches.length > 24) this.catches.pop();
    if (!this.biggest || size > this.biggest.size) this.biggest = catchObj;
    this.state = 'landed';
    this.timer = 1.5;
    this.reel = 1;
    this.tension = 0.2;
    U.Audio.chime();
    this._splash(this.spot.x, this.spot.z, 16, 1.8);
    this.onEvent('fish:caught', catchObj);
    return catchObj;
  };

  Fishing.prototype.tick = function (dt, player, env) {
    this.time += dt;
    this.spotClock -= dt;
    if (this.spotClock <= 0) {
      this.spotClock = 0.4;
      if (this.state === 'idle') this.refreshSpot(player);
    }
    if (this.reelPulse > 0) this.reelPulse = Math.max(0, this.reelPulse - dt * 2.4);
    if (this.state === 'idle') return;
    if (!this.spot) { this.resetLine(); return; }

    var dx = player.position[0] - this.spot.x;
    var dz = player.position[2] - this.spot.z;
    if (dx * dx + dz * dz > 13 * 13) {
      this.resetLine();
      this.onEvent('fish:lost-line', {});
      return;
    }

    if (this.state === 'casting') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'waiting';
        this.timer = 2.1 + Math.random() * 5.2;
        if (env && env.rain > 0.4) this.timer *= 0.75;
        if (env && env.night) this.timer *= 0.88;
      }
      return;
    }

    if (this.state === 'waiting') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'bite';
        this.timer = 1.45;
        U.Audio.pop();
        this._splash(this.spot.x, this.spot.z, 7, 1.0);
        this.onEvent('fish:bite', {});
      }
      return;
    }

    if (this.state === 'bite') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'idle';
        this.spot = null;
        this.onEvent('fish:escaped', {});
      }
      return;
    }

    if (this.state === 'landed') {
      this.timer -= dt;
      if (this.timer <= 0) this.resetLine();
      return;
    }

    if (this.state === 'hooked') {
      var holding = !!(player.keys && player.keys['KeyE']);
      if (this.reelPulse > 0.05) holding = true;
      var surge = (Math.sin(this.time * 2.7) * 0.5 + 0.5) * 0.22;
      this.surge = surge;
      if (holding) {
        this.reel += dt * 0.34;
        this.tension += dt * (0.34 + surge);
      } else {
        this.reel -= dt * 0.028;
        this.tension -= dt * 0.5;
      }
      this.tension = U.clamp(this.tension, 0, 1.05);
      this.reel = Math.max(0, Math.min(1, this.reel));
      if (holding && this.tension > 0.9) {
        this.tension = 1;
      }
      if (this.tension >= 1) {
        var sx = this.spot.x, sz = this.spot.z;
        this.resetLine();
        U.Audio.noise(0.24, 0.09, 1600);
        this._splash(sx, sz, 8, 1.1);
        this.onEvent('fish:snapped', {});
        return;
      }
      if (this.tension < 0.12) {
        this.slack += dt;
        if (this.slack > 1.5) {
          this.resetLine();
          this.onEvent('fish:escaped', {});
          return;
        }
      } else this.slack = 0;
      if (this.reel >= 1) this.land(env);
    }
  };

  Fishing.prototype.resetLine = function () {
    this.state = 'idle';
    this.timer = 0;
    this.spot = null;
    this.reel = 0;
    this.tension = 0.4;
    this.slack = 0;
  };

  /* ------------------------------------------------------------------ */
  /*  Food                                                               */
  /* ------------------------------------------------------------------ */
  Fishing.prototype.eat = function (cooked) {
    if (cooked) {
      if (this.cooked <= 0) return null;
      this.cooked--;
      U.Audio.pop();
      this.onEvent('fish:eaten', { cooked: true });
      return { cooked: true, warmth: 30, health: 5, text: '🐟 Smoked fish, flaking and warm. The night feels smaller.' };
    }
    if (this.fish <= 0) return null;
    this.fish--;
    U.Audio.pop();
    this.onEvent('fish:eaten', { cooked: false });
    return { cooked: false, warmth: 9, health: -1, text: '🐟 Raw fish. Cold, briny, and faintly apologetic.' };
  };

  Fishing.prototype.build = function (b, time, player, env) {
    var active = this.state !== 'idle' && this.spot;
    if (!active) return 0;
    var s = this.spot;
    var p = player.position;
    var yaw = player.yaw || 0;
    var hx = p[0] + Math.sin(yaw) * 0.34 + Math.cos(yaw) * 0.2;
    var hy = p[1] + 1.28;
    var hz = p[2] + Math.cos(yaw) * 0.34 - Math.sin(yaw) * 0.2;
    var tipX = p[0] + Math.sin(yaw) * 1.15 + Math.cos(yaw) * 0.18;
    var tipY = p[1] + 1.95;
    var tipZ = p[2] + Math.cos(yaw) * 1.15 - Math.sin(yaw) * 0.18;
    var dip = this.state === 'bite' ? 0.12 : (this.state === 'hooked' ? Math.sin(time * 11) * 0.045 : 0);
    var bx = s.x, bz = s.z, by = WATER_Y + 0.10 - dip + Math.sin(time * 2.1) * 0.018;

    // Rod.
    b.push();
    b.translate(hx, hy, hz);
    b.rotateY(yaw);
    b.rotateX(-0.62);
    b.cylinder(0, 0, 0, 0.018, 0.008, 1.08, 4, [0.34, 0.22, 0.12], 0, false, false);
    b.sphere(0, 1.06, 0, 0.022, 4, 3, [0.72, 0.62, 0.24], 0);
    b.pop();

    // Line: hand -> rod tip -> bobber. Drawn as two thin billboarded quads.
    this._line(b, hx, hy, hz, tipX, tipY, tipZ);
    this._line(b, tipX, tipY, tipZ, bx, by, bz);

    // Bobber.
    b.sphere(bx, by, bz, 0.055, 6, 4, [0.9, 0.2, 0.18], 0.15);
    b.sphere(bx, by + 0.05, bz, 0.032, 5, 3, [0.95, 0.92, 0.8], 0.1);

    // Ripples.
    var ripple = (time * 0.6) % 1;
    b.torus(bx, WATER_Y + 0.02, bz, 0.18 + ripple * 0.9, 0.008, 12, 3, [0.55, 0.72, 0.8], 0.16);
    b.torus(bx, WATER_Y + 0.02, bz, 0.08 + ((time * 0.42 + 0.4) % 1) * 0.7, 0.006, 10, 3, [0.5, 0.68, 0.78], 0.1);

    if (this.state === 'hooked' && this.tension > 0.72) {
      // A taut line glows a warning red.
      this._line(b, tipX, tipY, tipZ, bx, by, bz, [1.0, 0.45, 0.3], 0.5);
    }
    return 1;
  };

  Fishing.prototype._line = function (b, x0, y0, z0, x1, y1, z1, color, emissive) {
    var dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    var len = Math.sqrt(dx * dx + dz * dz) || 1;
    var w = 0.007;
    var px = -dz / len * w, pz = dx / len * w;
    var c = color || [0.82, 0.82, 0.74];
    b.quad([x0 - px, y0, z0 - pz], [x0 + px, y0, z0 + pz], [x1 + px, y1, z1 + pz], [x1 - px, y1, z1 - pz], c, emissive || 0.12);
    b.quad([x1 - px, y1, z1 - pz], [x1 + px, y1, z1 + pz], [x0 + px, y0, z0 + pz], [x0 - px, y0, z0 - pz], c, emissive || 0.12);
  };

  Fishing.prototype._splash = function (x, z, count, power) {
    for (var i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.4,
        y: WATER_Y + 0.06,
        z: z + (Math.random() - 0.5) * 0.4,
        vx: (Math.random() - 0.5) * 1.1 * power,
        vy: (0.5 + Math.random() * 0.9) * power,
        vz: (Math.random() - 0.5) * 1.1 * power,
        gravity: -5.5, life: 0.35 + Math.random() * 0.4, maxLife: 0.75,
        size: 0.06 + Math.random() * 0.07, alpha: 0.75,
        color: [0.55, 0.72, 0.8], additive: false
      });
    }
  };

  Fishing.prototype.updateParticles = function (dt) {
    for (var i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.vy += (p.gravity || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.alpha = U.clamp(p.life / p.maxLife, 0, 1) * 0.8;
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Persistence                                                        */
  /* ------------------------------------------------------------------ */
  Fishing.prototype.serialize = function () {
    return {
      fish: this.fish, cooked: this.cooked, totalCaught: this.totalCaught,
      records: this.records, counts: this.counts, catches: this.catches,
      biggest: this.biggest
    };
  };

  Fishing.prototype.load = function (data) {
    if (!data) return;
    this.fish = data.fish || 0;
    this.cooked = data.cooked || 0;
    this.totalCaught = data.totalCaught || 0;
    this.records = data.records || {};
    this.counts = data.counts || {};
    this.catches = data.catches || [];
    this.biggest = data.biggest || null;
  };

  Fishing.FISH = FISH;
  Fishing.FISH_BY_KEY = FISH_BY_KEY;
  SF.Fishing = Fishing;
})(typeof window !== 'undefined' ? window : globalThis);
