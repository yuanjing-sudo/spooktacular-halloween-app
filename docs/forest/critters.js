/* ==========================================================================
 *  ENDLESS SPOOKY FOREST — critters.js
 *  Owls, bats, frogs, hedgehogs and moths. Ambient wildlife that makes the
 *  woods feel inhabited: owls turn their heads and hoot, bats stitch circles
 *  through the dusk, frogs croak from the ponds and moths spiral around fire.
 * ========================================================================== */
(function (root) {
  'use strict';

  var SF = root.SpookyForest = root.SpookyForest || {};
  var U = SF.Util;

  var CELL = 26;
  var VIEW_RADIUS = 64;
  var MAX_ENTITIES = 22;
  var TYPES = ['owl', 'bat', 'frog', 'hedgehog', 'moth'];

  var WHISPERS = [
    'The owl says: the north wind carries a smell of rain and old iron.',
    'The owl says: the warren under the hawthorn is older than the path.',
    'The owl says: not every light in the trees is a lantern.',
    'The owl says: the forest counts your footsteps, but it does not keep score.',
    'The owl says: when the moon turns red, stay near the fire.',
    'The owl says: the floating isles were once the tops of hills.',
    'The owl says: a carrot pulled at midnight tastes of cold stars.',
    'The owl says: someone left a door open in the dark. Do not knock.',
    'The owl says: the oldest tree remembers being a seed.',
    'The owl says: you are not lost. You are only further in.'
  ];

  function Critters(world, opts) {
    opts = opts || {};
    this.world = world;
    this.onEvent = opts.onEvent || function () {};
    this.entities = new Map();
    this.entityList = [];
    this.particles = [];
    this.seen = {};          // type -> count
    this.typesSeen = {};     // type -> true
    this.owlsListened = 0;
    this.totalSeen = 0;
    this.lastNight = false;
    this.time = 0;
    this.syncClock = 0;
    this.fireflyClock = 0;
    this.player = null;
    this.seed = world.seed || 1;
  }

  Critters.prototype.reset = function () {
    this.entities.clear();
    this.entityList = [];
    this.particles.length = 0;
    this.seen = {};
    this.typesSeen = {};
    this.owlsListened = 0;
    this.totalSeen = 0;
    this.lastNight = false;
    this.time = 0;
    this.syncClock = 0;
    this.fireflyClock = 0;
    this.player = null;
  };

  /* ------------------------------------------------------------------ */
  /*  Spawning                                                           */
  /* ------------------------------------------------------------------ */
  Critters.prototype.sync = function (player, env, campfires) {
    this.player = player;
    var px = player.position[0], pz = player.position[2];
    var pcx = Math.floor(px / CELL), pcz = Math.floor(pz / CELL);
    var night = !!(env && env.night);
    this.lastNight = night;
    var wanted = new Set();

    for (var dx = -2; dx <= 2; dx++) {
      for (var dz = -2; dz <= 2; dz++) {
        var cx = pcx + dx, cz = pcz + dz;
        var id = 'crit-' + cx + '-' + cz;
        var roll = U.hash01(cx, cz, this.seed + 6151);
        var kind = this._pickType(roll, cx, cz, night);
        if (!kind) continue;
        wanted.add(id);
        if (this.entities.has(id)) {
          var old = this.entities.get(id);
          var odx = old.x - px, odz = old.z - pz;
          if (old.type === 'bat' && !night) { this.entities.delete(id); }
          else if (odx * odx + odz * odz > VIEW_RADIUS * VIEW_RADIUS) this.entities.delete(id);
          continue;
        }
        if (this.entities.size >= MAX_ENTITIES) continue;
        var e = this._spawn(kind, cx, cz, id, night, campfires);
        if (e) this.entities.set(id, e);
      }
    }

    // Cull anything the streaming world has left behind.
    var self = this;
    this.entities.forEach(function (e, id) {
      if (!wanted.has(id)) {
        var ddx = e.x - px, ddz = e.z - pz;
        if (ddx * ddx + ddz * ddz > (VIEW_RADIUS + 14) * (VIEW_RADIUS + 14)) self.entities.delete(id);
        else if (e.type === 'bat' && !night) self.entities.delete(id);
      }
    });

    this.entityList.length = 0;
    this.entities.forEach(function (e) { self.entityList.push(e); });
  };

  Critters.prototype._pickType = function (roll, cx, cz, night) {
    // Keep some cells empty so the forest never feels like a petting zoo.
    if (roll > 0.82) return null;
    if (night) {
      if (roll < 0.17) return 'owl';
      if (roll < 0.48) return 'bat';
      if (roll < 0.6) return 'moth';
      if (roll < 0.76) return 'hedgehog';
      return 'frog';
    }
    if (roll < 0.3) return 'frog';
    if (roll < 0.55) return 'hedgehog';
    if (roll < 0.7) return 'moth';
    return null;
  };

  Critters.prototype._spawn = function (kind, cx, cz, id, night, campfires) {
    var rng = new U.RNG(U.hash2(cx, cz, this.seed + 4049));
    var baseX = cx * CELL + rng.range(3, CELL - 3);
    var baseZ = cz * CELL + rng.range(3, CELL - 3);
    var chunk = this.world.getChunkAt(baseX, baseZ);
    if (!chunk) return null;
    var ground = this.world.heightAt(baseX, baseZ);
    var e = {
      id: id, type: kind, x: baseX, z: baseZ, y: ground,
      homeX: baseX, homeZ: baseZ, anchorY: ground,
      phase: rng.next() * Math.PI * 2, seed: rng.next() * 9999,
      yaw: rng.next() * Math.PI * 2, scale: rng.range(0.82, 1.18),
      state: 'idle', timer: rng.range(0.5, 4), blink: 0,
      hop: 0, hopDir: 0, wing: rng.next() * 6.28,
      listen: false, curled: false, visible: true, age: 0
    };

    if (kind === 'owl') {
      var props = this.world.nearbyProps(baseX, baseZ, 10);
      var tree = null;
      for (var i = 0; i < props.length; i++) {
        if (props[i].kind !== 'tree') continue;
        if (!tree) tree = props[i];
        else if (U.hash01(Math.floor(props[i].x), Math.floor(props[i].z), this.seed + 71) > rng.next()) tree = props[i];
      }
      if (!tree) return null;
      e.x = tree.x + rng.range(-0.18, 0.18);
      e.z = tree.z + rng.range(-0.18, 0.18);
      e.y = tree.y + tree.height * rng.range(0.38, 0.54);
      e.homeX = e.x; e.homeZ = e.z;
      e.perchY = e.y;
      e.yaw = rng.next() * Math.PI * 2;
    } else if (kind === 'bat') {
      e.y = ground + rng.range(4.5, 9.5);
      e.orbit = rng.range(2.0, 5.5);
      e.speed = rng.range(0.45, 0.9) * (rng.chance(0.5) ? 1 : -1);
      e.anchorY = ground + rng.range(3.5, 7);
    } else if (kind === 'frog') {
      var pond = this._findWater(baseX, baseZ, 7, rng);
      if (!pond) {
        // Keep a frog on damp ground beside the pond instead of losing it.
        if (ground > SF.World.WATER + 2.2) return null;
        e.y = Math.max(ground, SF.World.WATER + 0.02);
      } else {
        e.x = pond.x; e.z = pond.z;
        e.y = SF.World.WATER + 0.03;
        e.homeX = e.x; e.homeZ = e.z;
        e.onWater = true;
      }
    } else if (kind === 'hedgehog') {
      if (ground < SF.World.WATER + 0.25) return null;
      e.y = ground;
    } else if (kind === 'moth') {
      var fire = this._nearestFire(baseX, baseZ, 13, campfires);
      if (!fire) return null;
      e.x = fire.x + rng.range(-1.1, 1.1);
      e.z = fire.z + rng.range(-1.1, 1.1);
      e.y = fire.y + rng.range(1.0, 2.0);
      e.homeX = fire.x; e.homeZ = fire.z;
      e.fire = fire;
      e.scale = rng.range(0.8, 1.2);
    }

    this._markSeen(kind);
    return e;
  };

  Critters.prototype._markSeen = function (kind) {
    if (!this.typesSeen[kind]) {
      this.typesSeen[kind] = true;
      this.onEvent('critter:first-seen', { type: kind });
    }
    this.seen[kind] = (this.seen[kind] || 0) + 1;
    this.totalSeen++;
  };

  Critters.prototype._findWater = function (x, z, radius, rng) {
    for (var i = 0; i < 24; i++) {
      var a = rng.next() * Math.PI * 2;
      var r = Math.sqrt(rng.next()) * radius;
      var wx = x + Math.cos(a) * r;
      var wz = z + Math.sin(a) * r;
      if (this.world.waterAt(wx, wz)) return { x: wx, z: wz };
    }
    return null;
  };

  Critters.prototype._nearestFire = function (x, z, radius, campfires) {
    if (!campfires || !campfires.fires) return null;
    var best = null, bd = radius * radius;
    campfires.fires.forEach(function (f) {
      if (!f.lit) return;
      var d = U.dist2(f.x, f.z, x, z);
      if (d < bd) { bd = d; best = f; }
    });
    return best;
  };

  /* ------------------------------------------------------------------ */
  /*  Update                                                            */
  /* ------------------------------------------------------------------ */
  Critters.prototype.update = function (dt, time, player, env, campfires) {
    this.time = time;
    this.player = player;
    var px = player.position[0], py = player.position[1], pz = player.position[2];
    var night = !!(env && env.night);
    var self = this;

    this.syncClock -= dt;
    if (this.syncClock <= 0) {
      this.syncClock = 1.1;
      this.sync(player, env, campfires);
    }

    this.entities.forEach(function (e) {
      e.age += dt;
      e.timer -= dt;
      if (e.blink > 0) e.blink -= dt;
      var dx = e.x - px, dz = e.z - pz;
      var dist2 = dx * dx + dz * dz;

      if (e.type === 'bat') {
        e.phase += dt * (e.speed || 0.6);
        e.wing += dt * 9.5;
        e.x = e.homeX + Math.cos(e.phase) * (e.orbit || 3);
        e.z = e.homeZ + Math.sin(e.phase) * (e.orbit || 3);
        e.y = e.anchorY + Math.sin(e.phase * 2.3 + e.seed) * 0.5;
        e.yaw = -e.phase + Math.PI / 2;
        if (dist2 < 36 && Math.random() < dt * 0.11) U.Audio.squeak(1.6);
      } else if (e.type === 'owl') {
        e.headYaw = Math.sin(time * 0.42 + e.phase) * 0.55;
        if (dist2 < 30 * 30 && e.timer <= 0) {
          e.timer = 16 + Math.random() * 22;
          U.Audio.owl();
          if (dist2 < 12 * 12 && Math.random() < 0.4) {
            self.particles.push(self._spark(e.x, e.y + 1.1, e.z, [0.78, 0.82, 1.0], 0.7));
          }
        }
        if (e.blink <= 0 && Math.random() < dt * 0.08) e.blink = 0.16;
      } else if (e.type === 'frog') {
        if (e.hop > 0) {
          e.hop -= dt * 3.2;
          var t = 1 - U.clamp(e.hop, 0, 1);
          e.x += Math.cos(e.hopDir) * dt * 1.4;
          e.z += Math.sin(e.hopDir) * dt * 1.4;
          e.y = SF.World.WATER + 0.03 + Math.sin(t * Math.PI) * 0.22;
        } else if (e.timer <= 0) {
          e.timer = 2.2 + Math.random() * 5.2;
          if (Math.random() < 0.62) {
            e.hop = 1;
            e.hopDir = Math.random() * Math.PI * 2;
            if (!e.onWater) {
              e.y = Math.max(this.world.heightAt(e.x, e.z), SF.World.WATER + 0.02);
            }
          } else if (dist2 < 22 * 22) {
            U.Audio.tone(120 + Math.random() * 40, 0.18, 'sawtooth', 0.025, 80);
            U.Audio.tone(90, 0.2, 'square', 0.015, 70, 0.16);
          }
        }
      } else if (e.type === 'hedgehog') {
        var close = dist2 < 2.6 * 2.6 && Math.abs(py - e.y) < 1.6;
        e.curled = close;
        if (!close && e.timer <= 0) {
          e.timer = 1.8 + Math.random() * 4;
          e.hopDir = e.hopDir + (Math.random() - 0.5) * 1.4;
          var nx = e.x + Math.cos(e.hopDir) * 0.35;
          var nz = e.z + Math.sin(e.hopDir) * 0.35;
          if (!this.world.waterAt(nx, nz)) {
            e.x = nx; e.z = nz;
            e.y = this.world.heightAt(nx, nz);
            e.yaw = -e.hopDir;
          }
        }
      } else if (e.type === 'moth') {
        var fire = e.fire;
        if (fire && fire.lit) {
          var fa = time * 1.8 + e.phase;
          e.x = fire.x + Math.cos(fa) * (0.65 + Math.sin(time * 0.9 + e.seed) * 0.2);
          e.z = fire.z + Math.sin(fa * 1.1) * (0.65 + Math.cos(time * 0.7 + e.seed) * 0.2);
          e.y = fire.y + 1.15 + Math.sin(fa * 1.6) * 0.28;
          if (Math.random() < dt * 3.5) {
            self.particles.push(self._spark(e.x, e.y, e.z, [1.0, 0.85, 0.5], 0.1));
          }
        } else {
          e.x = e.homeX + Math.cos(time * 0.7 + e.phase) * 1.2;
          e.z = e.homeZ + Math.sin(time * 0.6 + e.phase) * 1.2;
          e.timer -= dt;
          if (e.timer <= 0) { e.timer = 20; }
        }
      }
    });

    this._updateFireflies(dt, player, env);
    this._updateParticles(dt);
  };

  Critters.prototype._updateFireflies = function (dt, player, env) {
    this.fireflyClock -= dt;
    if (!env || !env.night || env.rain > 0.45) return;
    var target = (env.bloodMoon ? 34 : 24) - (env.fog > 0.6 ? 10 : 0);
    if (this.particles.length > 130) return;
    if (this.fireflyClock <= 0 && this._countFireflies() < target) {
      this.fireflyClock = 0.22;
      var px = player.position[0], pz = player.position[2];
      var a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 15;
      var x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
      var y = this.world.heightAt(x, z) + 0.35 + Math.random() * 2.8;
      this.particles.push({
        x: x, y: y, z: z,
        vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.1, vz: (Math.random() - 0.5) * 0.18,
        gravity: 0, life: 5 + Math.random() * 8, maxLife: 13,
        size: 0.055 + Math.random() * 0.055, alpha: 0.75, color: [0.82, 0.95, 0.5],
        additive: true, firefly: true, flicker: Math.random() * 6.28
      });
    }
  };

  Critters.prototype._countFireflies = function () {
    var n = 0;
    for (var i = 0; i < this.particles.length; i++) if (this.particles[i].firefly) n++;
    return n;
  };

  Critters.prototype._spark = function (x, y, z, color, size) {
    return {
      x: x, y: y, z: z, vx: (Math.random() - 0.5) * 0.3, vy: 0.1 + Math.random() * 0.25,
      vz: (Math.random() - 0.5) * 0.3, gravity: -0.1,
      life: 0.7 + Math.random() * 0.7, maxLife: 1.4, size: size || 0.08,
      alpha: 0.8, color: color, additive: true
    };
  };

  Critters.prototype._updateParticles = function (dt) {
    for (var i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.firefly) {
        p.vx += (Math.random() - 0.5) * dt * 0.15;
        p.vz += (Math.random() - 0.5) * dt * 0.15;
        p.alpha = 0.25 + (Math.sin(this.time * 2.2 + p.flicker) * 0.5 + 0.5) * 0.6;
      } else {
        p.vy += (p.gravity || 0) * dt;
        p.alpha = U.clamp(p.life / p.maxLife, 0, 1) * 0.8;
      }
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Interaction                                                        */
  /* ------------------------------------------------------------------ */
  Critters.prototype.interaction = function (player) {
    var px = player.position[0], py = player.position[1], pz = player.position[2];
    var best = null, bd = 3.4 * 3.4;
    for (var i = 0; i < this.entityList.length; i++) {
      var e = this.entityList[i];
      if (e.type !== 'owl') continue;
      if (Math.abs(e.y - py) > 3.2) continue;
      var d = U.dist2(e.x, e.z, px, pz);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return null;
    return {
      type: 'critter', label: '🦉 Listen to the Owl',
      sub: 'It has something to say', target: best, range: 3.4, priority: 2
    };
  };

  Critters.prototype.interact = function (player) {
    var inter = this.interaction(player);
    if (!inter) return null;
    var owl = inter.target;
    var line = WHISPERS[(this.owlsListened + Math.floor(owl.seed)) % WHISPERS.length];
    this.owlsListened++;
    owl.listen = true;
    owl.timer = 24;
    U.Audio.owl();
    for (var i = 0; i < 5; i++) {
      this.particles.push(this._spark(owl.x, owl.y + 0.9, owl.z, [0.8, 0.85, 1.0], 0.09));
    }
    this.onEvent('critter:listen', { owl: owl, line: line, total: this.owlsListened });
    return { text: line, kind: 'good', owl: owl };
  };

  /* ------------------------------------------------------------------ */
  /*  Mesh                                                               */
  /* ------------------------------------------------------------------ */
  Critters.prototype.build = function (b, time, player, reduce) {
    var px = player.position[0], py = player.position[1], pz = player.position[2];
    var count = 0;
    for (var i = 0; i < this.entityList.length; i++) {
      var e = this.entityList[i];
      var d2 = U.dist2(e.x, e.z, px, pz);
      if (d2 > 46 * 46) continue;
      if (Math.abs(e.y - py) > 38) continue;
      var near = d2 < 22 * 22;
      if (e.type === 'owl') this._buildOwl(b, e, time, near, reduce);
      else if (e.type === 'bat') this._buildBat(b, e, time, near);
      else if (e.type === 'frog') this._buildFrog(b, e, time, near);
      else if (e.type === 'hedgehog') this._buildHedgehog(b, e, time, near);
      else if (e.type === 'moth') this._buildMoth(b, e, time);
      count++;
    }
    return count;
  };

  Critters.prototype._buildOwl = function (b, e, time, near, reduce) {
    var s = e.scale;
    var blink = e.blink > 0;
    var head = e.headYaw || 0;
    b.push();
    b.translate(e.x, e.y, e.z);
    b.rotateY(e.yaw);
    b.scale(s, s, s);

    // Body and folded wings.
    b.ellipsoid(0, 0.32, 0, 0.2, 0.3, 0.19, 8, 5, [0.42, 0.31, 0.22], 0);
    b.ellipsoid(0.16, 0.3, -0.02, 0.08, 0.22, 0.15, 6, 4, [0.36, 0.26, 0.18], 0);
    b.ellipsoid(-0.16, 0.3, -0.02, 0.08, 0.22, 0.15, 6, 4, [0.36, 0.26, 0.18], 0);
    // Belly feathers.
    b.ellipsoid(0, 0.24, 0.15, 0.12, 0.16, 0.06, 6, 4, [0.62, 0.5, 0.35], 0);

    // Head turns independently.
    b.push();
    b.translate(0, 0.62, 0.02);
    b.rotateY(head);
    b.ellipsoid(0, 0.02, 0.02, 0.19, 0.18, 0.17, 8, 5, [0.46, 0.34, 0.24], 0);
    // Facial discs.
    b.ellipsoid(-0.075, 0.02, 0.13, 0.1, 0.11, 0.035, 6, 4, [0.68, 0.55, 0.4], 0);
    b.ellipsoid(0.075, 0.02, 0.13, 0.1, 0.11, 0.035, 6, 4, [0.68, 0.55, 0.4], 0);
    // Eyes.
    if (blink) {
      b.box(-0.075, 0.04, 0.165, 0.055, 0.01, 0.01, [0.12, 0.08, 0.05], 0);
      b.box(0.075, 0.04, 0.165, 0.055, 0.01, 0.01, [0.12, 0.08, 0.05], 0);
    } else {
      b.sphere(-0.075, 0.04, 0.165, 0.034, 6, 4, [1.0, 0.82, 0.3], this.lastNight ? 0.7 : 0.2);
      b.sphere(0.075, 0.04, 0.165, 0.034, 6, 4, [1.0, 0.82, 0.3], this.lastNight ? 0.7 : 0.2);
      b.sphere(-0.075, 0.045, 0.19, 0.012, 4, 3, [0.08, 0.06, 0.04], 0);
      b.sphere(0.075, 0.045, 0.19, 0.012, 4, 3, [0.08, 0.06, 0.04], 0);
    }
    // Beak.
    b.push();
    b.translate(0, -0.01, 0.17);
    b.rotateX(Math.PI / 2);
    b.cone(0, 0, 0, 0.028, 0.09, 4, [0.8, 0.6, 0.24], 0);
    b.pop();
    // Ear tufts.
    for (var t = -1; t <= 1; t += 2) {
      b.push();
      b.translate(t * 0.1, 0.17, 0);
      b.rotateZ(t * 0.3);
      b.cone(0, 0, 0, 0.035, 0.12, 4, [0.4, 0.29, 0.2], 0);
      b.pop();
    }
    b.pop();

    // Talons gripping the branch / bark.
    for (var f = -1; f <= 1; f += 2) {
      b.cylinder(f * 0.08, 0.03, 0.04, 0.018, 0.012, 0.08, 4, [0.75, 0.62, 0.3], 0, false, false);
      b.box(f * 0.08, -0.01, 0.07, 0.06, 0.018, 0.08, [0.7, 0.56, 0.26], 0);
    }

    if (near && !reduce) {
      // A few downy feathers on the breeze.
      if (Math.random() < 0.006) {
        this.particles.push(this._spark(e.x, e.y + 0.4, e.z, [0.7, 0.64, 0.55], 0.06));
      }
    }
    b.pop();
  };

  Critters.prototype._buildBat = function (b, e, time, near) {
    var s = e.scale || 1;
    var flap = Math.sin(e.wing) * 0.9;
    b.push();
    b.translate(e.x, e.y, e.z);
    b.rotateY(e.yaw);
    b.scale(s, s, s);
    // Body.
    b.ellipsoid(0, 0, 0, 0.08, 0.085, 0.17, 7, 4, [0.16, 0.13, 0.14], 0);
    b.sphere(0, 0.03, 0.15, 0.075, 6, 4, [0.2, 0.16, 0.17], 0);
    // Ears.
    for (var t = -1; t <= 1; t += 2) {
      b.push();
      b.translate(t * 0.04, 0.1, 0.13);
      b.rotateZ(t * 0.2);
      b.cone(0, 0, 0, 0.026, 0.11, 4, [0.22, 0.17, 0.18], 0);
      b.pop();
    }
    // Eyes.
    b.sphere(-0.03, 0.045, 0.2, 0.014, 4, 3, [0.8, 0.2, 0.24], 0.4);
    b.sphere(0.03, 0.045, 0.2, 0.014, 4, 3, [0.8, 0.2, 0.24], 0.4);
    // Wings: two triangular membranes each side.
    for (var side = -1; side <= 1; side += 2) {
      b.push();
      b.translate(side * 0.055, 0.02, 0);
      b.rotateZ(side * flap);
      b.tri([0, 0, -0.05], [side * 0.42, 0.12, 0.02], [side * 0.22, -0.02, 0.2],
        [0.22, 0.17, 0.2], 0);
      b.tri([side * 0.42, 0.12, 0.02], [side * 0.5, 0.03, 0.19], [side * 0.22, -0.02, 0.2],
        [0.17, 0.13, 0.16], 0);
      b.tri([side * 0.22, -0.02, 0.2], [side * 0.5, 0.03, 0.19], [side * 0.12, 0.02, 0.28],
        [0.2, 0.15, 0.18], 0);
      b.pop();
    }
    if (near) {
      b.sphere(0, 0, 0.24, 0.018, 4, 3, [0.45, 0.4, 0.4], 0);
    }
    b.pop();
  };

  Critters.prototype._buildFrog = function (b, e, time, near) {
    var s = e.scale || 1;
    var croak = e.timer < 0.4 ? 1 + Math.sin(time * 18) * 0.08 : 1;
    b.push();
    b.translate(e.x, e.y, e.z);
    b.rotateY(e.yaw);
    b.scale(s * croak, s, s * croak);

    // Lily pad beneath frogs on open water.
    if (e.onWater && near) {
      b.disc(0, -0.015, 0, 0.3, 9, [0.16, 0.34, 0.16], 0);
      b.tri([0, 0, 0], [0.3, 0, 0], [0.28, 0, 0.12], [0.08, 0.18, 0.1], 0);
    }

    // Body and head.
    b.ellipsoid(0, 0.1, 0, 0.14, 0.09, 0.18, 8, 4, [0.28, 0.52, 0.22], 0);
    b.ellipsoid(0, 0.14, 0.14, 0.12, 0.075, 0.11, 7, 4, [0.33, 0.58, 0.24], 0);
    // Eyes on top.
    for (var t = -1; t <= 1; t += 2) {
      b.sphere(t * 0.07, 0.21, 0.15, 0.05, 6, 4, [0.68, 0.78, 0.4], 0);
      b.sphere(t * 0.07, 0.225, 0.18, 0.022, 4, 3, [0.08, 0.07, 0.04], 0);
    }
    // Mouth line.
    b.box(0, 0.1, 0.225, 0.13, 0.012, 0.012, [0.16, 0.3, 0.12], 0);
    // Legs.
    for (var side = -1; side <= 1; side += 2) {
      b.push();
      b.translate(side * 0.12, 0.06, 0.1);
      b.rotateZ(side * 0.55);
      b.cylinder(0, 0, 0, 0.025, 0.02, 0.16, 4, [0.24, 0.46, 0.18], 0, false, false);
      b.pop();
      b.ellipsoid(side * 0.19, 0.04, -0.08, 0.06, 0.05, 0.1, 5, 3, [0.25, 0.48, 0.19], 0);
    }
    if (near) {
      // Throat pulse.
      b.sphere(0, 0.09, 0.19, 0.035, 5, 3, [0.55, 0.7, 0.32], 0.15);
    }
    b.pop();
  };

  Critters.prototype._buildHedgehog = function (b, e, time, near) {
    var s = e.scale || 1;
    b.push();
    b.translate(e.x, e.y, e.z);
    b.rotateY(e.yaw);
    b.scale(s, s, s);

    if (e.curled) {
      b.sphere(0, 0.18, 0, 0.22, 8, 5, [0.3, 0.22, 0.16], 0);
      for (var c = 0; c < 20; c++) {
        var ca = (c / 20) * Math.PI * 2;
        var cr = 0.18;
        b.push();
        b.translate(Math.cos(ca) * cr, 0.18 + Math.sin(ca * 2) * 0.1, Math.sin(ca) * cr);
        b.rotateZ(Math.PI / 2);
        b.rotateY(ca);
        b.cone(0, 0, 0, 0.02, 0.12, 3, [0.42, 0.34, 0.24], 0);
        b.pop();
      }
    } else {
      // Body.
      b.ellipsoid(0, 0.16, 0, 0.2, 0.14, 0.24, 8, 4, [0.36, 0.27, 0.2], 0);
      // Face.
      b.ellipsoid(0, 0.13, 0.2, 0.11, 0.09, 0.1, 6, 4, [0.62, 0.5, 0.38], 0);
      b.push();
      b.translate(0, 0.13, 0.29);
      b.rotateX(Math.PI / 2);
      b.cone(0, 0, 0, 0.04, 0.09, 4, [0.28, 0.2, 0.16], 0);
      b.pop();
      b.sphere(-0.045, 0.17, 0.27, 0.017, 4, 3, [0.06, 0.05, 0.04], 0);
      b.sphere(0.045, 0.17, 0.27, 0.017, 4, 3, [0.06, 0.05, 0.04], 0);
      // Spines on the back.
      var spines = near ? 24 : 10;
      for (var i = 0; i < spines; i++) {
        var a = (i / spines) * Math.PI * 2;
        var rr = 0.13 + (i % 3) * 0.02;
        b.push();
        b.translate(Math.cos(a) * rr, 0.2 + Math.sin(a * 3) * 0.07, Math.sin(a) * rr - 0.02);
        b.rotateZ(Math.PI / 2 + Math.sin(a) * 0.4);
        b.rotateY(a);
        b.cone(0, 0, 0, 0.019, 0.13, 3, [0.44, 0.37, 0.27], 0);
        b.pop();
      }
      // Feet.
      for (var f = -1; f <= 1; f += 2) {
        b.ellipsoid(f * 0.11, 0.035, 0.1, 0.045, 0.03, 0.07, 5, 3, [0.26, 0.19, 0.14], 0);
      }
    }
    b.pop();
  };

  Critters.prototype._buildMoth = function (b, e, time) {
    var s = e.scale || 1;
    var flap = Math.sin(time * 18 + e.phase) * 0.8;
    b.push();
    b.translate(e.x, e.y, e.z);
    b.rotateY(time * 0.8 + e.phase);
    b.scale(s, s, s);
    b.ellipsoid(0, 0, 0, 0.025, 0.025, 0.08, 5, 3, [0.62, 0.54, 0.38], 0.3);
    for (var side = -1; side <= 1; side += 2) {
      b.push();
      b.translate(0, 0, 0);
      b.rotateZ(side * flap);
      b.leaf(0, 0, 0, 0.18, 0.15, side * Math.PI / 2, 0, [0.9, 0.82, 0.55], 0.6);
      b.leaf(0, 0, -0.02, 0.13, 0.12, side * Math.PI / 2 + 0.4, 0, [0.78, 0.66, 0.4], 0.5);
      b.pop();
    }
    b.sphere(0, 0.02, 0.075, 0.016, 4, 3, [1.0, 0.9, 0.6], 0.8);
    b.pop();
  };

  /* ------------------------------------------------------------------ */
  /*  Persistence                                                        */
  /* ------------------------------------------------------------------ */
  Critters.prototype.serialize = function () {
    return {
      seen: this.seen,
      typesSeen: this.typesSeen,
      owlsListened: this.owlsListened,
      totalSeen: this.totalSeen
    };
  };

  Critters.prototype.load = function (data) {
    if (!data) return;
    this.seen = data.seen || {};
    this.typesSeen = data.typesSeen || {};
    this.owlsListened = data.owlsListened || 0;
    this.totalSeen = data.totalSeen || 0;
  };

  Critters.TYPES = TYPES;
  SF.Critters = Critters;
})(typeof window !== 'undefined' ? window : globalThis);
