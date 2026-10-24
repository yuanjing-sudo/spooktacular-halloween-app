/* ==========================================================================
 *  ENDLESS SPOOKY FOREST — pumpkins.js
 *  Carving the forest's wild pumpkins into jack-o'-lanterns. The pumpkin
 *  bodies already live in the static chunk meshes; this module adds glowing
 *  carved faces, candle light, interaction and persistence.
 * ========================================================================== */
(function (root) {
  'use strict';

  var SF = root.SpookyForest = root.SpookyForest || {};
  var U = SF.Util;

  var CARVE_RANGE = 3.2;
  var MAX_CARVED_LIGHTS = 3;

  function Pumpkins(world, opts) {
    opts = opts || {};
    this.world = world;
    this.onEvent = opts.onEvent || function () {};
    this.carved = {};          // key -> facing angle
    this.carvedCount = 0;
    this.near = [];
    this.syncClock = 0;
    this.time = 0;
    this.night = false;
    this.player = null;
    this.lastCarveAt = -100;
  }

  Pumpkins.prototype.reset = function () {
    this.carved = {};
    this.carvedCount = 0;
    this.near = [];
    this.syncClock = 0;
    this.time = 0;
    this.player = null;
    this.lastCarveAt = -100;
  };

  /* Stable identity for a wild pumpkin. */
  Pumpkins.prototype.key = function (p) {
    return 'pumpkin|' + Math.round(p.x * 10) + '|' + Math.round(p.z * 10) + '|' + Math.round(p.seed || 0);
  };

  Pumpkins.prototype.radiusOf = function (p) {
    var rng = new U.RNG(((p.seed || 0) * 1000) | 0);
    return rng.range(0.45, 0.85);
  };

  /* ------------------------------------------------------------------ */
  /*  Simulation                                                         */
  /* ------------------------------------------------------------------ */
  Pumpkins.prototype.sync = function (player) {
    this.player = player;
    var p = player.position;
    this.near = this.world.nearbyPumpkins(p[0], p[2], 38);
  };

  Pumpkins.prototype.update = function (dt, time, player, env) {
    this.time = time;
    this.night = !!(env && env.night);
    this.syncClock -= dt;
    if (this.syncClock <= 0) {
      this.syncClock = 0.55;
      this.sync(player);
    }
  };

  Pumpkins.prototype.nearestUncarved = function (player, range) {
    range = range || CARVE_RANGE;
    var px = player.position[0], py = player.position[1], pz = player.position[2];
    var best = null, bd = range * range;
    for (var i = 0; i < this.near.length; i++) {
      var p = this.near[i];
      if (this.carved[this.key(p)]) continue;
      if (Math.abs(p.y - py) > 2.1) continue;
      var d = U.dist2(p.x, p.z, px, pz);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  };

  Pumpkins.prototype.nearestCarved = function (player, range) {
    range = range || 2.7;
    var px = player.position[0], py = player.position[1], pz = player.position[2];
    var best = null, bd = range * range;
    for (var i = 0; i < this.near.length; i++) {
      var p = this.near[i];
      if (!this.carved[this.key(p)]) continue;
      if (Math.abs(p.y - py) > 2.1) continue;
      var d = U.dist2(p.x, p.z, px, pz);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  };

  Pumpkins.prototype.interaction = function (player) {
    var p = this.nearestUncarved(player);
    if (!p) return null;
    return {
      type: 'pumpkin', label: '🎃 Carve Jack-o’-Lantern',
      sub: 'A candle waits inside', target: p, range: CARVE_RANGE, priority: 4
    };
  };

  Pumpkins.prototype.carve = function (player, target) {
    var p = target || this.nearestUncarved(player);
    if (!p) return null;
    var key = this.key(p);
    if (this.carved[key] !== undefined) return null;
    var angle = Math.atan2(player.position[0] - p.x, player.position[2] - p.z);
    // Quantise so tiny movements do not make the saved face jitter.
    angle = Math.round(angle * 20) / 20;
    this.carved[key] = angle;
    this.carvedCount++;
    this.lastCarveAt = this.time;
    U.Audio.pop();
    U.Audio.noise(0.18, 0.04, 1400);
    this.onEvent('pumpkin:carved', { pumpkin: p, key: key, total: this.carvedCount });
    return { pumpkin: p, key: key, total: this.carvedCount };
  };

  /* ------------------------------------------------------------------ */
  /*  Lights                                                             */
  /* ------------------------------------------------------------------ */
  Pumpkins.prototype.collectLights = function (player, out) {
    if (!this.night || !out || !player) return;
    var px = player.position[0], pz = player.position[2];
    var added = 0;
    for (var i = 0; i < this.near.length && added < MAX_CARVED_LIGHTS; i++) {
      var p = this.near[i];
      if (this.carved[this.key(p)] === undefined) continue;
      var d2 = U.dist2(p.x, p.z, px, pz);
      if (d2 > 22 * 22) continue;
      var flicker = 0.5 + Math.sin(this.time * 6.1 + p.x * 2.7) * 0.06;
      out.push({
        x: p.x, y: p.y + 0.85, z: p.z,
        radius: 4.4, color: [1.0, 0.55, 0.16], intensity: flicker,
        pumpkin: true
      });
      added++;
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Mesh                                                               */
  /* ------------------------------------------------------------------ */
  Pumpkins.prototype.build = function (b, time, player, reduce, env) {
    var night = this.night || !!(env && env.night);
    var px = player.position[0], pz = player.position[2];
    var count = 0;
    for (var i = 0; i < this.near.length; i++) {
      var p = this.near[i];
      var key = this.key(p);
      var angle = this.carved[key];
      if (angle === undefined) continue;
      var d2 = U.dist2(p.x, p.z, px, pz);
      if (d2 > 42 * 42) continue;
      this._buildFace(b, p, angle, time, night, reduce, d2 < 20 * 20);
      count++;
    }
    return count;
  };

  Pumpkins.prototype._buildFace = function (b, p, angle, time, night, reduce, near) {
    var r = this.radiusOf(p);
    var flicker = 0.82 + Math.sin(time * 5.7 + p.x * 3.1) * 0.1 +
      (reduce ? 0 : Math.sin(time * 17.3 + p.z) * 0.035);
    var glow = night ? 2.0 * flicker : 1.05;
    var eye = [1.0, 0.62 * flicker + 0.2, 0.12];
    var mouth = [1.0, 0.5 * flicker + 0.16, 0.09];
    var cx = p.x;
    var cy = p.y + r * 0.62;
    var cz = p.z;
    var zf = r * 1.005;

    b.push();
    b.translate(cx, cy, cz);
    b.rotateY(angle);
    b.scale(1, 1, 1);

    // Two triangular eyes, cut through the shell.
    b.tri([-r * 0.58, r * 0.26, zf - 0.01],
      [-r * 0.28, r * 0.08, zf - 0.01],
      [-r * 0.22, r * 0.4, zf - 0.01], eye, glow, [0, 0, 1]);
    b.tri([r * 0.58, r * 0.26, zf - 0.01],
      [r * 0.28, r * 0.08, zf - 0.01],
      [r * 0.22, r * 0.4, zf - 0.01], eye, glow, [0, 0, 1]);

    // A small nose wedge.
    b.tri([0, r * 0.04, zf - 0.01],
      [-r * 0.1, -r * 0.08, zf - 0.01],
      [r * 0.1, -r * 0.08, zf - 0.01], mouth, glow * 0.8, [0, 0, 1]);

    // Jagged smile: four little teeth of flame.
    var teeth = near ? 5 : 3;
    for (var t = 0; t < teeth; t++) {
      var x0 = -r * 0.5 + (t / teeth) * r * 1.0;
      var x1 = -r * 0.5 + ((t + 0.55) / teeth) * r * 1.0;
      var drop = (t % 2 === 0) ? r * 0.2 : r * 0.1;
      b.tri([x0, -r * 0.18, zf - 0.01],
        [(x0 + x1) / 2, -r * 0.18 - drop, zf - 0.01],
        [x1, -r * 0.18, zf - 0.01],
        mouth, glow, [0, 0, 1]);
    }

    // Candle halo and a faint inner glow visible at the cut edges.
    if (near) {
      b.sphere(0, 0, 0, r * 0.18, 5, 3, [1.0, 0.68, 0.24], night ? 1.5 : 0.5);
      for (var s = 0; s < 3; s++) {
        var sa = time * 1.4 + s * 2.1 + p.x;
        b.sphere(Math.cos(sa) * r * 0.34, -r * 0.02 + Math.sin(time * 2.3 + s) * 0.04,
          zf - 0.05, 0.014, 4, 3, [1.0, 0.72, 0.3], 1.8);
      }
    }

    // A little curl of vine on top, so carved pumpkins still feel wild.
    if (near) {
      b.cylinder(0, r * 0.7, 0, 0.022, 0.014, r * 0.5, 4, [0.24, 0.34, 0.1], 0, false, false);
      b.sphere(0, r * 1.2, 0, 0.035, 4, 3, [0.32, 0.44, 0.14], 0);
    }

    b.pop();
  };

  /* ------------------------------------------------------------------ */
  /*  Persistence                                                        */
  /* ------------------------------------------------------------------ */
  Pumpkins.prototype.serialize = function () {
    return { carved: this.carved, carvedCount: this.carvedCount };
  };

  Pumpkins.prototype.load = function (data) {
    if (!data) return;
    this.carved = data.carved || {};
    this.carvedCount = data.carvedCount || Object.keys(this.carved).length;
  };

  SF.Pumpkins = Pumpkins;
})(typeof window !== 'undefined' ? window : globalThis);
