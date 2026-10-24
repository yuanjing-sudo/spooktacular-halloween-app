/* ==========================================================================
 *  ENDLESS SPOOKY FOREST — atmosphere.js
 *  Day/night cycle, dawn/dusk palettes, sun and moon, stars, aurora,
 *  weather (mist, rain, storms, leaf-storms, snow), fireflies, shooting
 *  stars and procedural ambient audio. Produces the environment packet the
 *  renderer and every other system read each frame.
 * ========================================================================== */
(function (root) {
  'use strict';

  var SF = root.SpookyForest = root.SpookyForest || {};
  var U = SF.Util;

  var WEATHERS = {
    clear: { name: 'Clear', icon: '🌙', cloud: 0.15, rain: 0, fog: 0.2, wind: 0.3, mist: 0.05 },
    mist: { name: 'Mist', icon: '🌫️', cloud: 0.4, rain: 0.04, fog: 0.6, wind: 0.12, mist: 0.75 },
    rain: { name: 'Rain', icon: '🌧️', cloud: 0.8, rain: 0.75, fog: 0.5, wind: 0.55, mist: 0.22 },
    storm: { name: 'Storm', icon: '⛈️', cloud: 1.0, rain: 1.0, fog: 0.72, wind: 0.95, mist: 0.18 },
    leaves: { name: 'Leaf Storm', icon: '🍂', cloud: 0.5, rain: 0.02, fog: 0.35, wind: 1.0, mist: 0.1 },
    snow: { name: 'Snowfall', icon: '🌨️', cloud: 0.7, rain: 0.2, fog: 0.62, wind: 0.5, mist: 0.3 },
    blood: { name: 'Blood Moon', icon: '🩸', cloud: 0.25, rain: 0.02, fog: 0.4, wind: 0.4, mist: 0.2 }
  };
  var WEATHER_KEYS = Object.keys(WEATHERS);

  function Atmosphere(world, opts) {
    opts = opts || {};
    this.world = world;
    this.timeOfDay = opts.startHour === undefined ? 17.4 : opts.startHour;
    this.dayLength = opts.dayLength || 720; // seconds for a full 24h
    this.day = 1;
    this.time = 0;
    this.weather = 'mist';
    this.weatherKey = 'mist';
    this.weatherTimer = 45;
    this.weatherBlend = { cloud: 0.4, rain: 0.04, fog: 0.6, wind: 0.12, mist: 0.5 };
    this.night = false;
    this.starAmount = 0;
    this.sunDir = [0.4, 0.7, 0.2];
    this.moonDir = [-0.4, -0.7, -0.2];
    this.sunColor = [1, 0.8, 0.55];
    this.moonColor = [0.65, 0.76, 1];
    this.skyTop = [0.03, 0.04, 0.10];
    this.skyBottom = [0.24, 0.16, 0.26];
    this.horizon = [0.55, 0.28, 0.25];
    this.fogColor = [0.10, 0.09, 0.14];
    this.ambient = [0.2, 0.21, 0.26];
    this.wind = 0.3;
    this.aurora = 0;
    this.flash = 0;
    this.flashTimer = 0;
    this.bloodMoon = false;
    this.moonPhase = 0.35;
    this.particles = [];
    this.cap = 460;
    this.particleClock = 0;
    this.ambientClock = 0;
    this.shootingStar = 0;
    this.shootingStarX = 0;
    this.quality = opts.quality === undefined ? 1 : opts.quality;
    this.onEvent = opts.onEvent || function () {};
    this.env = {};
    this.rainSound = 0;
    this._lastWeather = 'mist';
  }

  Atmosphere.prototype.reset = function (opts) {
    opts = opts || {};
    this.timeOfDay = opts.startHour === undefined ? 17.4 : opts.startHour;
    this.day = 1;
    this.weatherKey = 'mist';
    this.weather = 'mist';
    this.weatherTimer = 45;
    this.particles.length = 0;
    this.weatherBlend = { cloud: 0.4, rain: 0.04, fog: 0.6, wind: 0.12, mist: 0.5 };
    this.flash = 0;
    this.bloodMoon = false;
  };

  Atmosphere.prototype.setQuality = function (q) {
    this.quality = q;
    this.cap = q >= 2 ? 700 : q >= 1 ? 460 : 260;
  };

  /* ------------------------------------------------------------------ */
  /*  Time + palettes                                                    */
  /* ------------------------------------------------------------------ */
  Atmosphere.prototype.updateTime = function (dt) {
    this.timeOfDay += (dt / this.dayLength) * 24;
    if (this.timeOfDay >= 24) {
      this.timeOfDay -= 24;
      this.day++;
      this.onEvent('day', this.day);
    }
    var t = this.timeOfDay;
    var sunAngle = ((t - 6) / 24) * Math.PI * 2;
    var sunY = Math.sin(sunAngle);
    var sunX = Math.cos(sunAngle) * 0.62;
    var sunZ = Math.cos(sunAngle * 0.71 + 0.7) * 0.42;
    var sl = Math.sqrt(sunX * sunX + sunY * sunY + sunZ * sunZ) || 1;
    this.sunDir = [sunX / sl, sunY / sl, sunZ / sl];
    this.moonDir = [-this.sunDir[0] * 0.9, -this.sunDir[1], -this.sunDir[2] * 0.8];
    var ml = Math.sqrt(this.moonDir[0] * this.moonDir[0] + this.moonDir[1] * this.moonDir[1] + this.moonDir[2] * this.moonDir[2]) || 1;
    this.moonDir = [this.moonDir[0] / ml, this.moonDir[1] / ml, this.moonDir[2] / ml];
    this.night = sunY < -0.02;
    this.starAmount = U.smoothstep(0.02, -0.2, sunY);
    this.moonPhase = U.mod(this.day * 0.13 + 0.35, 1);

    // Keyframed sky palettes. Each stop: hour, top, horizon.
    var stops = [
      { h: 0, top: [0.012, 0.016, 0.045], horizon: [0.045, 0.055, 0.10], sun: [0.24, 0.28, 0.44], moon: [0.62, 0.72, 0.98], amb: [0.10, 0.12, 0.18] },
      { h: 4.6, top: [0.02, 0.025, 0.06], horizon: [0.10, 0.08, 0.14], sun: [0.4, 0.32, 0.42], moon: [0.62, 0.72, 0.98], amb: [0.14, 0.15, 0.21] },
      { h: 6.2, top: [0.16, 0.10, 0.18], horizon: [0.92, 0.44, 0.26], sun: [1.0, 0.58, 0.28], moon: [0.7, 0.5, 0.55], amb: [0.32, 0.24, 0.22] },
      { h: 8.5, top: [0.20, 0.34, 0.50], horizon: [0.62, 0.68, 0.68], sun: [1.0, 0.86, 0.66], moon: [0.8, 0.85, 1], amb: [0.42, 0.44, 0.46] },
      { h: 13, top: [0.26, 0.44, 0.62], horizon: [0.72, 0.78, 0.78], sun: [1.0, 0.95, 0.84], moon: [0.75, 0.8, 0.95], amb: [0.52, 0.54, 0.55] },
      { h: 17.2, top: [0.18, 0.24, 0.42], horizon: [0.92, 0.56, 0.32], sun: [1.0, 0.72, 0.42], moon: [0.8, 0.62, 0.62], amb: [0.38, 0.32, 0.32] },
      { h: 18.8, top: [0.08, 0.06, 0.16], horizon: [0.72, 0.25, 0.24], sun: [1.0, 0.44, 0.22], moon: [0.72, 0.55, 0.7], amb: [0.22, 0.17, 0.22] },
      { h: 20.5, top: [0.025, 0.03, 0.075], horizon: [0.14, 0.09, 0.15], sun: [0.34, 0.30, 0.40], moon: [0.62, 0.72, 1], amb: [0.13, 0.14, 0.20] },
      { h: 24, top: [0.012, 0.016, 0.045], horizon: [0.045, 0.055, 0.10], sun: [0.24, 0.28, 0.44], moon: [0.62, 0.72, 0.98], amb: [0.10, 0.12, 0.18] }
    ];
    var a = stops[0], b = stops[stops.length - 1];
    for (var i = 0; i < stops.length - 1; i++) {
      if (t >= stops[i].h && t <= stops[i + 1].h) { a = stops[i]; b = stops[i + 1]; break; }
    }
    var f = U.smoothstep(a.h, b.h, t);
    var top = U.mixRgb(a.top, b.top, f);
    var horizon = U.mixRgb(a.horizon, b.horizon, f);
    var sunC = U.mixRgb(a.sun, b.sun, f);
    var moonC = U.mixRgb(a.moon, b.moon, f);
    var amb = U.mixRgb(a.amb, b.amb, f);

    // Weather and blood moon tint the world.
    var wb = this.weatherBlend;
    var stormTint = [0.10, 0.11, 0.13];
    top = U.mixRgb(top, stormTint, wb.cloud * 0.42);
    horizon = U.mixRgb(horizon, [0.22, 0.20, 0.22], wb.rain * 0.34 + wb.mist * 0.28);
    amb = U.mixRgb(amb, [0.16, 0.17, 0.20], wb.cloud * 0.25);

    if (this.bloodMoon) {
      top = U.mixRgb(top, [0.18, 0.015, 0.03], 0.55);
      horizon = U.mixRgb(horizon, [0.55, 0.06, 0.07], 0.5);
      sunC = [1.0, 0.25, 0.18];
      moonC = [1.0, 0.32, 0.24];
      amb = U.mixRgb(amb, [0.22, 0.06, 0.08], 0.45);
    }

    this.skyTop = top;
    this.skyBottom = U.mixRgb(horizon, top, 0.24);
    this.horizon = horizon;
    this.sunColor = sunC;
    this.moonColor = moonC;
    this.ambient = amb;
    this.fogColor = U.mixRgb(horizon, [0.05, 0.055, 0.075], 0.45 + wb.fog * 0.2);
    this.wind = wb.wind;
    this.aurora = (this.night && (this.weather === 'clear' || this.weather === 'blood')) ?
      Math.max(0, 0.22 + Math.sin(this.day * 2.1) * 0.18) * (this.world.biomeAt(0, 0).key === 'frost' ? 1.3 : 1) : 0;
  };

  /* ------------------------------------------------------------------ */
  /*  Weather                                                            */
  /* ------------------------------------------------------------------ */
  Atmosphere.prototype.chooseWeather = function () {
    var biome = this.world.biomeAt(this._px || 0, this._pz || 0);
    var pool;
    if (biome.key === 'frost') pool = ['snow', 'snow', 'mist', 'clear', 'storm'];
    else if (biome.key === 'pumpkin') pool = ['leaves', 'clear', 'mist', 'rain', 'leaves'];
    else if (biome.key === 'deadwood') pool = ['mist', 'leaves', 'clear', 'storm'];
    else pool = ['clear', 'mist', 'rain', 'leaves', 'clear', 'storm', 'mist'];
    var next = pool[Math.floor(Math.random() * pool.length)];
    if (this.bloodMoon) next = 'blood';
    this.setWeather(next);
    this.weatherTimer = 55 + Math.random() * 85;
  };

  Atmosphere.prototype.setWeather = function (key) {
    if (!WEATHERS[key]) key = 'clear';
    this.weather = key;
    this.weatherKey = key;
    this._lastWeather = key;
    this.blend = 0;
    this.onEvent('weather', key);
    if (key === 'storm' && !this.night) this.lightning();
  };

  Atmosphere.prototype.updateWeather = function (dt) {
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0 && !this.bloodMoon) this.chooseWeather();
    var target = WEATHERS[this.weather] || WEATHERS.clear;
    var speed = 0.35;
    var wb = this.weatherBlend;
    wb.cloud = U.damp(wb.cloud, target.cloud, speed, dt);
    wb.rain = U.damp(wb.rain, target.rain, speed, dt);
    wb.fog = U.damp(wb.fog, target.fog, speed, dt);
    wb.wind = U.damp(wb.wind, target.wind, speed, dt);
    wb.mist = U.damp(wb.mist, target.mist, speed, dt);

    // Sporadic lightning.
    if (this.weather === 'storm' && !this.night && Math.random() < dt * 0.05) this.lightning();
    if (this.flash > 0) {
      this.flash -= dt * 3.2;
      if (this.flash < 0) this.flash = 0;
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.flash = 0;
    }
  };

  Atmosphere.prototype.lightning = function () {
    this.flash = 1;
    this.flashTimer = 0.18 + Math.random() * 0.2;
    U.Audio.thunder();
    this.onEvent('lightning');
  };

  /* ------------------------------------------------------------------ */
  /*  Particles                                                          */
  /* ------------------------------------------------------------------ */
  Atmosphere.prototype.updateParticles = function (dt, player) {
    if (!player) return;
    var px = player.position[0], py = player.position[1], pz = player.position[2];
    this._px = px; this._pz = pz;
    var wb = this.weatherBlend;
    var mul = this.quality >= 2 ? 1.2 : this.quality <= 0 ? 0.5 : 1;
    this.particleClock += dt;

    // Rain.
    if (wb.rain > 0.08) {
      var rainRate = 130 * wb.rain * mul;
      var budget = Math.floor(rainRate * dt) + (Math.random() < rainRate * dt % 1 ? 1 : 0);
      for (var r = 0; r < budget && this.particles.length < this.cap; r++) {
        this.particles.push({
          x: px + (Math.random() - 0.5) * 34,
          y: py + 9 + Math.random() * 8,
          z: pz + (Math.random() - 0.5) * 34,
          vx: -this.wind * 2.5, vy: -16 - Math.random() * 8, vz: this.wind * 1.2,
          gravity: 0, life: 1.1, maxLife: 1.1, size: 0.11,
          color: [0.62, 0.76, 0.9], alpha: 0.46, additive: false
        });
      }
      this.rainSound += dt;
      if (this.rainSound > 1.4) {
        this.rainSound = 0;
        U.Audio.noise(0.7, 0.02 * wb.rain, 1600);
      }
    }

    // Snow.
    if (this.weather === 'snow' || (this.weather === 'storm' && wb.cloud > 0.6)) {
      var snowRate = 42 * wb.rain * mul;
      var n = Math.floor(snowRate * dt) + (Math.random() < snowRate * dt % 1 ? 1 : 0);
      for (var s = 0; s < n && this.particles.length < this.cap; s++) {
        this.particles.push({
          x: px + (Math.random() - 0.5) * 30,
          y: py + 7 + Math.random() * 8,
          z: pz + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 0.8 + this.wind * 0.6,
          vy: -0.9 - Math.random() * 1.2, vz: (Math.random() - 0.5) * 0.8,
          gravity: 0, life: 5, maxLife: 5, size: 0.13 + Math.random() * 0.1,
          color: [0.9, 0.94, 1], alpha: 0.72, additive: false
        });
      }
    }

    // Wind-blown leaves.
    if (this.weather === 'leaves' || wb.wind > 0.85) {
      var leafRate = (this.weather === 'leaves' ? 24 : 5) * mul;
      if (Math.random() < leafRate * dt) {
        this.particles.push({
          x: px + (Math.random() - 0.5) * 28,
          y: py + 2 + Math.random() * 10,
          z: pz + (Math.random() - 0.5) * 28,
          vx: -2.4 - Math.random() * 1.6, vy: -0.4 - Math.random() * 0.6, vz: (Math.random() - 0.5) * 1.4,
          gravity: 0.05, life: 3.4, maxLife: 3.4, size: 0.24,
          color: Math.random() < 0.5 ? [0.82, 0.42, 0.12] : [0.62, 0.28, 0.10],
          alpha: 0.85, additive: false
        });
      }
    }

    // Mist banks.
    if (wb.mist > 0.25) {
      if (Math.random() < 10 * wb.mist * mul * dt && this.particles.length < this.cap) {
        this.particles.push({
          x: px + (Math.random() - 0.5) * 34,
          y: py + 0.2 + Math.random() * 2.5,
          z: pz + (Math.random() - 0.5) * 34,
          vx: (Math.random() - 0.5) * 0.18 + 0.08, vy: 0.03, vz: (Math.random() - 0.5) * 0.18,
          gravity: 0, life: 7, maxLife: 7, size: 2.8 + Math.random() * 2.6,
          color: [0.52, 0.58, 0.64], alpha: 0.07, additive: false
        });
      }
    }

    // Fireflies at night.
    if (this.night && wb.rain < 0.4 && !U.Device.reduceMotion) {
      if (Math.random() < 15 * mul * dt && this.particles.length < this.cap) {
        this.particles.push({
          x: px + (Math.random() - 0.5) * 24,
          y: py + 0.4 + Math.random() * 2.6,
          z: pz + (Math.random() - 0.5) * 24,
          vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.3) * 0.2, vz: (Math.random() - 0.5) * 0.3,
          gravity: 0, life: 3.4 + Math.random() * 3, maxLife: 6,
          size: 0.09, color: [0.82, 1.0, 0.34], alpha: 0.9, additive: true,
          blink: true, phase: Math.random() * 6.28
        });
      }
    }

    // Shooting star sparkle at night.
    if (this.night && this.weather !== 'storm') {
      if (this.shootingStar <= 0 && Math.random() < dt * 0.03) {
        this.shootingStar = 1.4;
        this.shootingStarX = Math.random();
      }
      if (this.shootingStar > 0) this.shootingStar -= dt;
    }

    // Advance particles.
    for (var i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.vy += (p.gravity || 0) * dt;
      if (p.blink) {
        p.alpha = Math.max(0, Math.sin(this.time * 2.2 + p.phase)) * Math.min(1, p.life);
      } else if (p.maxLife) {
        if (p.baseAlpha === undefined) p.baseAlpha = p.alpha;
        var edge = Math.min(1, (p.maxLife - p.life) * 2.4) * Math.min(1, p.life * 1.5);
        p.alpha = p.baseAlpha * edge;
      }
    }

    // Ambient critters.
    this.ambientClock -= dt;
    if (this.ambientClock <= 0) {
      this.ambientClock = (this.night ? 7 : 12) + Math.random() * 14;
      if (this.night && Math.random() < 0.4) U.Audio.owl();
      else if (!this.night && Math.random() < 0.7) U.Audio.chirp();
      else if (wb.wind > 0.5) U.Audio.whoosh();
    }
  };

  Atmosphere.prototype.update = function (dt, player) {
    this.time += dt;
    this.updateTime(dt);
    this.updateWeather(dt);
    this.updateParticles(dt, player);
    // Blood moons arrive rarely, on clear nights.
    if (this.night && !this.bloodMoon && this.day > 2 && Math.random() < dt * 0.00035) {
      this.bloodMoon = true;
      this.setWeather('blood');
      this.onEvent('bloodmoon');
    }
    if (!this.night && this.bloodMoon) {
      this.bloodMoon = false;
      this.setWeather('clear');
    }
    this.env = this.getEnv();
    return this.env;
  };

  Atmosphere.prototype.getEnv = function () {
    var wb = this.weatherBlend;
    var fogNear = U.lerp(18, 7, wb.fog);
    var fogFar = U.lerp(96, 34, wb.fog);
    return {
      time: this.time,
      hour: this.timeOfDay,
      day: this.day,
      night: this.night,
      bloodMoon: this.bloodMoon,
      weather: this.weather,
      weatherName: (WEATHERS[this.weather] || WEATHERS.clear).name,
      weatherIcon: (WEATHERS[this.weather] || WEATHERS.clear).icon,
      rain: wb.rain,
      fog: wb.fog,
      mist: wb.mist,
      wind: wb.wind,
      cloud: wb.cloud,
      skyTop: this.skyTop,
      skyBottom: this.skyBottom,
      horizon: this.horizon,
      fogColor: this.fogColor,
      fogNear: fogNear,
      fogFar: fogFar,
      sunDir: this.sunDir,
      sunColor: this.sunColor,
      moonDir: this.moonDir,
      moonColor: this.moonColor,
      ambient: this.ambient,
      starAmount: this.starAmount,
      aurora: this.aurora,
      flash: this.flash,
      lights: []
    };
  };

  Atmosphere.prototype.timeString = function () { return U.formatTime(this.timeOfDay); };

  Atmosphere.prototype.phaseName = function () {
    var h = this.timeOfDay;
    if (h < 4.5) return 'Deep Night';
    if (h < 6.5) return 'Dawn';
    if (h < 11) return 'Morning';
    if (h < 15) return 'Afternoon';
    if (h < 18.5) return 'Dusk';
    if (h < 22) return 'Night';
    return 'Late Night';
  };

  Atmosphere.prototype.serialize = function () {
    return {
      timeOfDay: this.timeOfDay, day: this.day,
      weather: this.weather, weatherTimer: this.weatherTimer,
      bloodMoon: this.bloodMoon
    };
  };

  Atmosphere.prototype.load = function (data) {
    if (!data) return;
    this.timeOfDay = data.timeOfDay === undefined ? 17.4 : data.timeOfDay;
    this.day = data.day || 1;
    this.weather = data.weather || 'mist';
    this.weatherKey = this.weather;
    this.weatherTimer = data.weatherTimer || 60;
    this.bloodMoon = !!data.bloodMoon;
  };

  Atmosphere.WEATHERS = WEATHERS;
  SF.Atmosphere = Atmosphere;
})(typeof window !== 'undefined' ? window : globalThis);
