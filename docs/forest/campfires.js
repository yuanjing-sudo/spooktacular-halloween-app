/* ==========================================================================
 *  ENDLESS SPOOKY FOREST — campfires.js
 *  Full campfire simulation: stone rings, teepee logs, animated layered
 *  flames, embers, smoke, flickering light, fuel, cooking, marshmallows,
 *  log seats, story circles and roaming rabbits who come to warm themselves.
 * ========================================================================== */
(function (root) {
  'use strict';

  var SF = root.SpookyForest = root.SpookyForest || {};
  var U = SF.Util;

  var FIRE_RADIUS = 4.6;
  var MAX_PARTICLES = 520;

  function Campfires(world, opts) {
    opts = opts || {};
    this.world = world;
    this.fires = new Map();
    this.particles = [];
    this.savedStates = {};
    this.activeStories = {};
    this.totalLit = 0;
    this.totalWood = 0;
    this.totalCooked = 0;
    this.totalMarshmallows = 0;
    this.particlesCap = opts.particles || MAX_PARTICLES;
    this.onEvent = opts.onEvent || function () {};
    this.time = 0;
    this.nearFire = null;
  }

  Campfires.prototype.reset = function () {
    this.fires.clear();
    this.particles.length = 0;
    this.savedStates = {};
    this.activeStories = {};
    this.totalLit = 0;
    this.totalWood = 0;
    this.totalCooked = 0;
    this.totalMarshmallows = 0;
  };

  Campfires.prototype.sync = function (px, pz) {
    var sites = this.world.nearbyCampfires(px, pz, 54);
    var seen = new Set();
    for (var i = 0; i < sites.length; i++) {
      var site = sites[i];
      seen.add(site.id);
      if (this.fires.has(site.id)) continue;
      var saved = this.savedStates[site.id] || null;
      var fire = {
        id: site.id, x: site.x, y: site.y, z: site.z,
        name: site.name || 'A Quiet Fire',
        variant: site.variant || 'ring',
        home: !!site.home,
        lit: saved ? !!saved.lit : false,
        fuel: saved && saved.fuel !== undefined ? saved.fuel : 0.52,
        glow: 0, targetGlow: 0,
        flicker: Math.random() * 6.28,
        flickerSpeed: 3.6 + Math.random() * 1.6,
        discovered: saved ? !!saved.discovered : false,
        cook: saved && saved.cook ? saved.cook : { state: 'idle', t: 0, glow: false },
        stories: 0, lastStory: -99,
        particleClock: 0, soundClock: 0,
        visitors: 0, benchSeats: 0,
        rainDoused: 0,
        phase: Math.random() * 6.28
      };
      this.fires.set(site.id, fire);
      this._seedDecor(fire);
      if (fire.lit) this.totalLit++;
    }
    // Drop far fires; keep saved state so they come back the same.
    var self = this;
    this.fires.forEach(function (fire, id) {
      if (!seen.has(id) && U.dist2(fire.x, fire.z, px, pz) > 76 * 76) {
        self._saveFire(fire);
        self.fires.delete(id);
      }
    });
  };

  Campfires.prototype._seedDecor = function (fire) {
    var rng = new U.RNG(U.hash2(Math.floor(fire.x * 10), Math.floor(fire.z * 10), 777));
    fire.decor = {
      stoneCount: 7 + rng.int(0, 4),
      stoneR: 1.05 + rng.next() * 0.25,
      logAngle: rng.next() * 6.28,
      logCount: 3 + rng.int(0, 3),
      pot: rng.chance(fire.home ? 0.95 : 0.55),
      spit: rng.chance(0.4),
      skull: fire.variant === 'skull' || rng.chance(0.14),
      benches: fire.home || rng.chance(0.55),
      lantern: fire.home || rng.chance(0.28),
      mushrooms: rng.chance(0.35),
      bones: rng.chance(0.22),
      banner: rng.chance(0.18),
      stones: [],
      logs: [],
      seats: [],
      marshmallows: []
    };
    for (var i = 0; i < fire.decor.stoneCount; i++) {
      var a = (i / fire.decor.stoneCount) * Math.PI * 2 + rng.range(-0.18, 0.18);
      fire.decor.stones.push({
        a: a, r: fire.decor.stoneR + rng.range(-0.08, 0.12),
        s: rng.range(0.28, 0.5), h: rng.range(0.2, 0.44),
        seed: rng.next() * 9999
      });
    }
    for (var l = 0; l < fire.decor.logCount; l++) {
      fire.decor.logs.push({
        a: fire.decor.logAngle + (l / fire.decor.logCount) * Math.PI * 2 + rng.range(-0.2, 0.2),
        tilt: rng.range(0.42, 0.72),
        len: rng.range(0.85, 1.35),
        r: rng.range(0.09, 0.14)
      });
    }
    for (var b = 0; b < 3; b++) {
      fire.decor.seats.push({
        a: rng.next() * Math.PI * 2,
        r: rng.range(2.1, 3.1),
        len: rng.range(1.2, 2.0)
      });
    }
    fire.decor.marshmallows = [
      { a: rng.next() * 6.28, r: 1.0, h: rng.range(0.35, 0.7), burnt: rng.chance(0.2) },
      { a: rng.next() * 6.28, r: 0.9, h: rng.range(0.3, 0.6), burnt: rng.chance(0.1) }
    ];
  };

  /* ------------------------------------------------------------------ */
  /*  Update                                                             */
  /* ------------------------------------------------------------------ */
  Campfires.prototype.update = function (dt, time, player, env) {
    this.time = time;
    if (player) this.sync(player.position[0], player.position[2]);
    var self = this;

    this.fires.forEach(function (fire) {
      fire.flicker += dt * fire.flickerSpeed;
      fire.targetGlow = fire.lit ? (0.55 + fire.fuel * 0.65) : 0;
      fire.glow = U.damp(fire.glow, fire.targetGlow, 5, dt);
      if (fire.lit) {
        fire.fuel = Math.max(0, fire.fuel - dt * 0.0032);
        if (fire.fuel <= 0) {
          fire.lit = false;
          fire.glow = 0;
          self.onEvent('fire:out', fire);
        }
        if (env && env.rain > 0.5) {
          fire.rainDoused += dt * env.rain;
          if (fire.rainDoused > 16 + Math.random() * 20) {
            fire.lit = false;
            fire.rainDoused = 0;
            self.onEvent('fire:doused', fire);
          }
        }
      }
      // Cooking timer.
      if (fire.cook && fire.cook.state === 'cooking') {
        fire.cook.t += dt;
        if (fire.cook.t > 3.1 && fire.cook.state === 'cooking') {
          fire.cook.state = 'ready';
          U.Audio.chime();
          self.onEvent('fire:cook-ready', fire);
        }
        if (fire.cook.t > 11) {
          fire.cook.state = 'burnt';
          self.onEvent('fire:cook-burnt', fire);
        }
      }
      // Ambient crackle.
      fire.soundClock -= dt;
      if (fire.lit && fire.soundClock <= 0) {
        fire.soundClock = 0.4 + Math.random() * 2.0;
        if (player && U.dist2(player.position[0], player.position[2], fire.x, fire.z) < 18 * 18) {
          U.Audio.crackle();
        }
      }
      // Particle emission.
      if (fire.lit) {
        var rate = 26 * fire.glow;
        fire.particleClock += dt * rate;
        while (fire.particleClock >= 1) {
          fire.particleClock -= 1;
          if (self.particles.length < self.particlesCap) self._spawnParticle(fire, player);
        }
      } else {
        fire.particleClock = 0;
      }
      // Warm the player.
      if (fire.lit && player) {
        var d2 = U.dist2(player.position[0], player.position[2], fire.x, fire.z);
        if (d2 < FIRE_RADIUS * FIRE_RADIUS && Math.abs(player.position[1] - fire.y) < 3) {
          var warmth = (1 - Math.sqrt(d2) / FIRE_RADIUS) * 18;
          player.warmth = Math.min(player.maxWarmth || 100, (player.warmth || 0) + warmth * dt);
          player.stamina = Math.min(player.maxStamina || 100, (player.stamina || 0) + warmth * 0.14 * dt);
          if (!fire.discovered) {
            fire.discovered = true;
            self.onEvent('fire:discovered', fire);
          }
        }
      }
    });

    // Update particles.
    for (var i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.vy += (p.gravity || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vx *= (1 - dt * 0.8);
      p.vz *= (1 - dt * 0.8);
      if (p.kind === 'smoke') {
        p.size += dt * 1.7;
        p.alpha = Math.max(0, (p.life / p.maxLife) * 0.34);
      } else {
        p.alpha = Math.max(0, p.life / p.maxLife);
        p.size *= (1 - dt * 0.35);
      }
    }

    // Nearest fire for UI.
    this.nearFire = null;
    var best = Infinity;
    if (player) {
      this.fires.forEach(function (fire) {
        var d2 = U.dist2(player.position[0], player.position[2], fire.x, fire.z);
        if (d2 < best && d2 < 3.8 * 3.8) { best = d2; self.nearFire = fire; }
      });
    }
  };

  Campfires.prototype._spawnParticle = function (fire, player) {
    var rng = Math.random;
    var kindRoll = rng();
    var p;
    if (kindRoll < 0.56) {
      // Flame tongue.
      p = {
        kind: 'flame', x: fire.x + (rng() - 0.5) * 0.7,
        y: fire.y + 0.25 + rng() * 0.35,
        z: fire.z + (rng() - 0.5) * 0.7,
        vx: (rng() - 0.5) * 0.35, vy: 1.0 + rng() * 1.7, vz: (rng() - 0.5) * 0.35,
        gravity: 1.2, life: 0.35 + rng() * 0.5, maxLife: 0.85,
        size: (0.28 + rng() * 0.55) * fire.glow,
        color: rng() < 0.45 ? [1.0, 0.78, 0.22] : (rng() < 0.6 ? [1.0, 0.42, 0.08] : [1.0, 0.92, 0.55]),
        alpha: 0.9, additive: true
      };
    } else if (kindRoll < 0.78) {
      // Ember.
      p = {
        kind: 'ember', x: fire.x + (rng() - 0.5) * 0.8,
        y: fire.y + 0.4 + rng() * 0.8,
        z: fire.z + (rng() - 0.5) * 0.8,
        vx: (rng() - 0.5) * 0.7, vy: 1.8 + rng() * 2.6, vz: (rng() - 0.5) * 0.7,
        gravity: -0.2, life: 1.1 + rng() * 1.6, maxLife: 2.7,
        size: 0.10 + rng() * 0.18, color: [1.0, 0.58, 0.14],
        alpha: 1, additive: true
      };
    } else {
      // Smoke.
      p = {
        kind: 'smoke', x: fire.x + (rng() - 0.5) * 0.55,
        y: fire.y + 0.9 + rng() * 0.4,
        z: fire.z + (rng() - 0.5) * 0.55,
        vx: (rng() - 0.5) * 0.28 + 0.08, vy: 0.55 + rng() * 0.55, vz: (rng() - 0.5) * 0.28,
        gravity: -0.04, life: 2.2 + rng() * 2.4, maxLife: 4.6,
        size: 0.55 + rng() * 0.6, color: [0.36, 0.36, 0.38],
        alpha: 0.24, additive: false
      };
    }
    this.particles.push(p);
  };

  /* ------------------------------------------------------------------ */
  /*  Lighting                                                           */
  /* ------------------------------------------------------------------ */
  Campfires.prototype.collectLights = function (player, out) {
    out = out || [];
    var self = this;
    var list = [];
    this.fires.forEach(function (fire) {
      if (!fire.lit || fire.glow < 0.05) return;
      var flick = 0.82 + Math.sin(fire.flicker) * 0.1 + Math.sin(fire.flicker * 2.7) * 0.06;
      list.push({
        x: fire.x, y: fire.y + 0.8, z: fire.z,
        radius: 5.4 + fire.glow * 2.4,
        color: [1.0, 0.52, 0.16],
        intensity: (0.95 + fire.glow * 0.45) * flick,
        fire: fire
      });
    });
    // Keep the nearest eight so the shader stays fast.
    if (player) {
      list.sort(function (a, b) {
        return U.dist2(a.x, a.z, player.position[0], player.position[2]) -
          U.dist2(b.x, b.z, player.position[0], player.position[2]);
      });
    }
    for (var i = 0; i < list.length && i < SF.MAX_LIGHTS; i++) out.push(list[i]);
    return out;
  };

  /* ------------------------------------------------------------------ */
  /*  Actions                                                            */
  /* ------------------------------------------------------------------ */
  Campfires.prototype.actions = function (fire, player, carrots) {
    if (!fire) return [];
    var out = [];
    if (!fire.lit) {
      out.push({
        id: 'light', label: '🔥 Light Campfire',
        sub: player.wood > 0 ? 'Uses 1 wood' : 'You need wood',
        disabled: !(player.wood > 0), priority: 5
      });
      return out;
    }
    if (fire.cook.state === 'ready' || fire.cook.state === 'burnt') {
      out.push({
        id: 'take-food', label: fire.cook.state === 'burnt' ? '🥀 Take Burnt Carrot' : '🍠 Take Roasted Carrot',
        sub: fire.cook.state === 'burnt' ? 'A little crunchy' : 'Perfectly glazed', priority: 6
      });
    } else if (fire.cook.state === 'cooking') {
      out.push({
        id: 'cook-wait', label: '🍠 Cooking… ' + Math.max(0, Math.ceil(3.1 - fire.cook.t)) + 's',
        sub: 'Let it turn golden', disabled: true, priority: 2
      });
    } else {
      out.push({
        id: 'cook-carrot', label: '🍠 Cook Carrot',
        sub: carrots && carrots.count > 0 ? 'Uses 1 carrot' : 'No carrots in your pack',
        disabled: !(carrots && carrots.count > 0), priority: 4
      });
    }
    out.push({
      id: 'roast-marshmallow', label: '🍡 Roast Marshmallow',
      sub: player.marshmallows > 0 ? 'Uses 1 marshmallow' : 'No marshmallows',
      disabled: !(player.marshmallows > 0), priority: 3
    });
    out.push({
      id: 'add-wood', label: '🪵 Add Wood',
      sub: player.wood > 0 ? 'Feed the fire (+fuel)' : 'No wood in your pack',
      disabled: !(player.wood > 0) || fire.fuel > 0.96, priority: 3
    });
    out.push({
      id: 'warm', label: '🔥 Warm Your Hands',
      sub: 'Restore warmth and stamina', priority: 2
    });
    out.push({
      id: 'sit', label: '🪑 Sit & Listen',
      sub: fire.stories ? 'Hear another story' : 'Stories are best told at night', priority: 1
    });
    out.push({
      id: 'extinguish', label: '💨 Extinguish',
      sub: 'Save the wood for later', priority: 0
    });
    return out;
  };

  Campfires.prototype.perform = function (actionId, fire, ctx) {
    if (!actionId || !fire) return null;
    ctx = ctx || {};
    var player = ctx.player || {};
    var carrots = ctx.carrots || null;
    var game = ctx.game || null;

    if (actionId === 'light') {
      if (player.wood <= 0) return { text: 'You need wood to light a fire.', kind: 'warn' };
      player.wood--;
      fire.lit = true;
      fire.fuel = Math.max(fire.fuel, 0.32);
      fire.discovered = true;
      this.totalLit++;
      U.Audio.ignite();
      this.onEvent('fire:lit', fire);
      return { text: '🔥 ' + fire.name + ' catches. The dark leans back.', kind: 'good' };
    }
    if (actionId === 'add-wood') {
      if (player.wood <= 0) return { text: 'No wood to add.', kind: 'warn' };
      player.wood--;
      fire.fuel = Math.min(1, fire.fuel + 0.3);
      fire.lit = true;
      this.totalWood++;
      U.Audio.noise(0.25, 0.08, 1200);
      this.onEvent('fire:fuel', fire);
      return { text: '🪵 The fire crackles brighter.', kind: 'good' };
    }
    if (actionId === 'cook-carrot') {
      if (!carrots || carrots.count <= 0) return { text: 'No carrots to cook.', kind: 'warn' };
      carrots.count--;
      fire.cook = { state: 'cooking', t: 0, glow: (carrots.bestCarrot >= 2) };
      U.Audio.noise(0.18, 0.05, 900);
      return { text: '🍠 Carrot laid on the stones. Watch it closely.', kind: 'good' };
    }
    if (actionId === 'take-food') {
      var burnt = fire.cook.state === 'burnt';
      if (carrots) {
        if (burnt) { carrots.roasted += 0; } else { carrots.roasted++; }
        this.totalCooked++;
      }
      fire.cook = { state: 'idle', t: 0, glow: false };
      U.Audio.pop();
      if (burnt) return { text: '🥀 Burnt carrot. Still food. Probably.', kind: 'warn' };
      return { text: '🍠 Roasted carrot! Sweet and smoky.', kind: 'good' };
    }
    if (actionId === 'roast-marshmallow') {
      if (player.marshmallows <= 0) return { text: 'No marshmallows.', kind: 'warn' };
      player.marshmallows--;
      this.totalMarshmallows++;
      player.marshmallowsRoasted = (player.marshmallowsRoasted || 0) + 1;
      U.Audio.pop();
      this.onEvent('fire:marshmallow', fire);
      return { text: '🍡 Marshmallow toasted to a perfect amber.', kind: 'good' };
    }
    if (actionId === 'warm') {
      player.warmth = Math.min(player.maxWarmth || 100, (player.warmth || 0) + 35);
      player.stamina = Math.min(player.maxStamina || 100, (player.stamina || 0) + 20);
      U.Audio.chime();
      return { text: 'The cold loosens its grip. You feel human again.', kind: 'good' };
    }
    if (actionId === 'sit') {
      var story = U.NAMES.story[(fire.stories + Math.floor(fire.x + fire.z)) % U.NAMES.story.length];
      fire.stories++;
      fire.lastStory = this.time;
      player.sitting = 2.4;
      this.onEvent('fire:story', { fire: fire, story: story });
      return { text: '📖 ' + story, kind: 'story', story: story };
    }
    if (actionId === 'extinguish') {
      fire.lit = false;
      fire.glow = 0;
      U.Audio.noise(0.6, 0.06, 500);
      this.onEvent('fire:extinguished', fire);
      return { text: '💨 The flames fold down into smoke.', kind: 'warn' };
    }
    return null;
  };

  Campfires.prototype.primary = function (fire, player, carrots) {
    if (!fire) return null;
    var actions = this.actions(fire, player, carrots);
    for (var i = 0; i < actions.length; i++) {
      if (!actions[i].disabled) return actions[i].id;
    }
    return null;
  };

  /* ------------------------------------------------------------------ */
  /*  Mesh                                                               */
  /* ------------------------------------------------------------------ */
  Campfires.prototype.build = function (b, time, player, reduce) {
    var self = this;
    var count = 0;
    this.fires.forEach(function (fire) {
      self._buildFire(b, fire, time, reduce);
      count++;
    });
    return count;
  };

  Campfires.prototype._buildFire = function (b, fire, time, reduce) {
    var y = fire.y;
    var pow = fire.glow;
    var rng = new U.RNG(U.hash2(Math.floor(fire.x * 10), Math.floor(fire.z * 10), 777));
    var stone = [0.34, 0.32, 0.30];
    var ash = [0.14, 0.12, 0.11];
    var wood = [0.25, 0.16, 0.09];
    var charred = [0.08, 0.065, 0.055];

    b.push();
    b.translate(fire.x, y, fire.z);

    // Scorched ground.
    b.disc(0, 0.025, 0, 1.45, 16, ash, 0);
    b.disc(0, 0.03, 0, 0.8, 12, [0.07, 0.06, 0.055], 0);

    // Stone ring.
    for (var s = 0; s < fire.decor.stones.length; s++) {
      var st = fire.decor.stones[s];
      var sx = Math.cos(st.a) * st.r, sz = Math.sin(st.a) * st.r;
      var rr = new U.RNG((st.seed * 1000) | 0);
      b.rock(sx, 0.13, sz, st.s, rr, stone, 0);
      if (rr.chance(0.25)) b.ellipsoid(sx, st.h + 0.13, sz, st.s * 0.8, 0.04, st.s * 0.6, 6, 3, [0.2, 0.4, 0.16], 0);
    }

    // Teepee logs leaning into the centre.
    for (var l = 0; l < fire.decor.logs.length; l++) {
      var lg = fire.decor.logs[l];
      var lx = Math.cos(lg.a) * 0.38, lz = Math.sin(lg.a) * 0.38;
      b.push();
      b.translate(lx, 0.1, lz);
      b.rotateY(lg.a);
      b.rotateZ(Math.PI / 2 - lg.tilt);
      b.cylinder(0, 0, 0, lg.r, lg.r * 0.65, lg.len, 6, l % 2 ? wood : charred, 0, true, false);
      b.pop();
    }

    // Log benches.
    if (fire.decor.benches) {
      for (var be = 0; be < fire.decor.seats.length; be++) {
        var seat = fire.decor.seats[be];
        var bx = Math.cos(seat.a) * seat.r, bz = Math.sin(seat.a) * seat.r;
        b.push();
        b.translate(bx, 0.22, bz);
        b.rotateY(-seat.a + Math.PI / 2);
        b.rotateZ(Math.PI / 2);
        b.cylinder(-seat.len / 2, 0, 0, 0.18, 0.15, seat.len, 7, wood, 0, true, true);
        b.pop();
        // Little legs.
        b.box(bx, 0.11, bz, 0.8, 0.16, 0.25, charred, 0);
      }
    }

    // Cooking tripod and pot.
    if (fire.decor.pot) {
      var legs = 3;
      for (var tl = 0; tl < legs; tl++) {
        var ta = (tl / legs) * Math.PI * 2;
        b.push();
        b.translate(Math.cos(ta) * 0.62, 0.05, Math.sin(ta) * 0.62);
        b.rotateY(-ta);
        b.rotateZ(0.34);
        b.cylinder(0, 0, 0, 0.045, 0.025, 1.55, 4, charred, 0, false, false);
        b.pop();
      }
      b.torus(0, 1.46, 0, 0.14, 0.02, 8, 4, [0.22, 0.2, 0.18], 0);
      // Pot hangs above the flame.
      b.ellipsoid(0, 1.27, 0, 0.28, 0.22, 0.28, 8, 5, [0.12, 0.12, 0.13], 0.06);
      b.cylinder(0, 1.44, 0, 0.22, 0.24, 0.08, 8, [0.16, 0.15, 0.15], 0, true, false);
      b.torus(0, 1.48, 0, 0.22, 0.025, 8, 4, [0.3, 0.28, 0.26], 0);
      if (fire.lit && pow > 0.2) {
        b.ellipsoid(0, 1.27, 0, 0.23, 0.045, 0.23, 8, 3, [0.55, 0.35, 0.12], 0.2);
        if (!reduce) {
          for (var st2 = 0; st2 < 3; st2++) {
            var sa = (time * 0.5 + st2 * 2.1) % 6.28;
            b.sphere(Math.cos(sa) * 0.08, 1.48 + Math.sin(time * 2 + st2) * 0.05, Math.sin(sa) * 0.08, 0.03, 4, 3, [0.8, 0.8, 0.8], 0.3);
          }
        }
      }
    }

    // Spit / marshmallow sticks.
    for (var m = 0; m < fire.decor.marshmallows.length; m++) {
      var mm = fire.decor.marshmallows[m];
      b.push();
      b.translate(Math.cos(mm.a) * mm.r, 0.08, Math.sin(mm.a) * mm.r);
      b.rotateY(-mm.a);
      b.rotateZ(0.62);
      b.cylinder(0, 0, 0, 0.018, 0.012, 1.15, 4, [0.32, 0.23, 0.14], 0, false, false);
      b.pop();
      b.box(Math.cos(mm.a) * mm.r + Math.sin(mm.a) * 0.0, 0.95 + mm.h * 0.3, Math.sin(mm.a) * mm.r,
        0.11, 0.11, 0.11, mm.burnt ? [0.2, 0.12, 0.06] : [0.96, 0.9, 0.78], 0);
    }

    // Skull variant.
    if (fire.decor.skull) {
      b.push();
      b.translate(1.25, 0.22, -0.65);
      b.rotateY(0.7);
      b.ellipsoid(0, 0.1, 0, 0.18, 0.16, 0.16, 7, 4, [0.78, 0.75, 0.66], 0);
      b.box(0, -0.02, 0.12, 0.18, 0.1, 0.1, [0.7, 0.67, 0.58], 0);
      b.sphere(-0.07, 0.12, 0.14, 0.035, 4, 3, [0.04, 0.04, 0.04], 0);
      b.sphere(0.07, 0.12, 0.14, 0.035, 4, 3, [0.04, 0.04, 0.04], 0);
      b.pop();
    }
    // Bones.
    if (fire.decor.bones) {
      for (var bo = 0; bo < 3; bo++) {
        b.box(0.9 + bo * 0.12, 0.08, 0.9 - bo * 0.06, 0.35, 0.05, 0.05, [0.76, 0.72, 0.62], 0);
      }
    }
    // Lantern post.
    if (fire.decor.lantern) {
      b.cylinder(-2.0, 0, -1.3, 0.06, 0.04, 1.7, 5, charred, 0, false, false);
      b.box(-2.0, 1.78, -1.3, 0.26, 0.32, 0.26, [0.95, 0.62, 0.2], fire.lit ? 1.4 : 0.2);
      b.cone(-2.0, 1.94, -1.3, 0.22, 0.16, 4, charred, 0);
    }
    // Mushroom ring.
    if (fire.decor.mushrooms) {
      for (var mr = 0; mr < 4; mr++) {
        var ma = (mr / 4) * 6.28 + 0.4;
        var mx = Math.cos(ma) * 1.8, mz = Math.sin(ma) * 1.8;
        b.cylinder(mx, 0.05, mz, 0.05, 0.035, 0.26, 4, [0.82, 0.78, 0.68], 0, true, false);
        b.ellipsoid(mx, 0.32, mz, 0.15, 0.09, 0.15, 6, 3, [0.72, 0.28, 0.22], 0.15);
      }
    }

    // The flames: layered emissive cones that flicker and lean.
    if (fire.lit && pow > 0.03) {
      var flick = 0.85 + Math.sin(fire.flicker) * 0.1 + Math.sin(fire.flicker * 2.3) * 0.06;
      var lean = Math.sin(fire.flicker * 0.7) * 0.08;
      var flameH = (0.65 + pow * 0.95) * flick;
      b.push();
      b.translate(lean, 0.08, 0);
      b.cone(0, 0, 0, 0.55 * pow + 0.15, flameH, 6, [1.0, 0.35, 0.05], 1.6);
      b.cone(0, 0.05, 0, 0.36 * pow + 0.1, flameH * 0.78, 6, [1.0, 0.62, 0.12], 2.1);
      b.cone(0, 0.08, 0, 0.2 * pow + 0.07, flameH * 0.5, 5, [1.0, 0.9, 0.5], 2.8);
      b.sphere(0, 0.28, 0, 0.3 * pow + 0.08, 7, 4, [1.0, 0.55, 0.12], 1.4);
      b.pop();
      // Ground glow pool.
      b.disc(0, 0.045, 0, 2.4 * pow, 14, [1.0, 0.38, 0.06], 0.32);
    } else {
      // Cold remains.
      b.disc(0, 0.04, 0, 0.5, 10, [0.10, 0.09, 0.08], 0);
      if (fire.decor.pot) b.ellipsoid(0, 1.27, 0, 0.28, 0.22, 0.28, 8, 5, [0.12, 0.12, 0.13], 0);
    }

    b.pop();
  };

  /* ------------------------------------------------------------------ */
  /*  Persistence                                                        */
  /* ------------------------------------------------------------------ */
  Campfires.prototype._saveFire = function (fire) {
    this.savedStates[fire.id] = {
      lit: fire.lit, fuel: fire.fuel, discovered: fire.discovered,
      cook: fire.cook
    };
  };

  Campfires.prototype.serialize = function () {
    var self = this;
    this.fires.forEach(function (f) { self._saveFire(f); });
    return {
      states: this.savedStates,
      totalLit: this.totalLit,
      totalWood: this.totalWood,
      totalCooked: this.totalCooked,
      totalMarshmallows: this.totalMarshmallows
    };
  };

  Campfires.prototype.load = function (data) {
    if (!data) return;
    this.savedStates = data.states || {};
    this.totalLit = data.totalLit || 0;
    this.totalWood = data.totalWood || 0;
    this.totalCooked = data.totalCooked || 0;
    this.totalMarshmallows = data.totalMarshmallows || 0;
  };

  Campfires.prototype.nearest = function (player, maxDist) {
    maxDist = maxDist || 3.8;
    var best = null, bd = maxDist * maxDist;
    this.fires.forEach(function (fire) {
      var d = U.dist2(fire.x, fire.z, player.position[0], player.position[2]);
      if (d < bd) { bd = d; best = fire; }
    });
    return best;
  };

  Campfires.prototype.interaction = function (player, carrots) {
    var fire = this.nearest(player, 3.8);
    if (!fire) return null;
    var actions = this.actions(fire, player, carrots);
    var primary = null;
    for (var i = 0; i < actions.length; i++) {
      if (!actions[i].disabled) { primary = actions[i]; break; }
    }
    return {
      type: 'campfire', label: fire.lit ? (fire.cook.state === 'ready' ? 'Take Roasted Carrot' :
        (primary ? primary.label : 'Warm Your Hands')) : 'Light Campfire',
      sub: fire.name + (fire.lit ? ' · ' + Math.round(fire.fuel * 100) + '% fuel' : ' · cold ashes'),
      target: fire, actions: actions, range: 3.8, priority: 4
    };
  };

  Campfires.prototype.getGatheringSpots = function () {
    var out = [];
    this.fires.forEach(function (f) {
      if (f.lit && f.glow > 0.25) out.push(f);
    });
    return out;
  };

  SF.Campfires = Campfires;
  SF.CAMPFIRE_RADIUS = FIRE_RADIUS;
})(typeof window !== 'undefined' ? window : globalThis);
