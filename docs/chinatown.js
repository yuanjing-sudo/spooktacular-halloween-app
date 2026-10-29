/* Jade Moon Town — 月玉镇
 * A real-time, software-rendered 3D ancient Chinese town.
 * Canvas2D · true X/Y/Z world · perspective camera · painter's algorithm.
 * Zero dependencies, zero image assets — every texture is procedural.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var S = null;                 // live scene state
  var A = { ready: false };     // cached procedural artwork
  var ctx = null;               // the one Canvas2D context

  /* ------------------------------------------------------------------ */
  /*  Small helpers                                                      */
  /* ------------------------------------------------------------------ */

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function invLerp(a, b, v) { return clamp((v - a) / (b - a || 1), 0, 1); }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function easeInOut(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function rndi(a, b) { return Math.floor(rnd(a, b + 1)); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function dist3(ax, ay, az, bx, by, bz) {
    var dx = ax - bx, dy = ay - by, dz = az - bz;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function seedRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function hexRgb(hex) {
    if (!hex) return [255, 255, 255];
    hex = String(hex).replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    if (isNaN(n)) return [255, 255, 255];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbCss(c) {
    return 'rgb(' + clamp(Math.round(c[0]), 0, 255) + ',' +
      clamp(Math.round(c[1]), 0, 255) + ',' +
      clamp(Math.round(c[2]), 0, 255) + ')';
  }

  function rgba(hex, a) {
    var c = hexRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + clamp(a, 0, 1) + ')';
  }

  function mixHex(a, b, t) {
    var ca = hexRgb(a), cb = hexRgb(b);
    return rgbCss([lerp(ca[0], cb[0], t), lerp(ca[1], cb[1], t), lerp(ca[2], cb[2], t)]);
  }

  function shadeCss(hex, k, warm) {
    var c = hexRgb(hex);
    k = k == null ? 1 : k;
    var r = c[0] * k, g = c[1] * k, bl = c[2] * k;
    if (warm) {
      r += 26 * warm; g += 10 * warm; bl -= 2 * warm;
    }
    return rgbCss([r, g, bl]);
  }

  function angleDelta(a, b) {
    var d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  }

  /* ------------------------------------------------------------------ */
  /*  Palettes & atmosphere                                              */
  /* ------------------------------------------------------------------ */

  var PALETTES = {
    dusk: {
      skyTop: '#150b2b', skyMid: '#5a2a63', skyLow: '#ff9a5c',
      haze: '#ffb27a', fog: '#3a2145', moon: '#ffe9c7',
      m1: '#2b1740', m2: '#190d2a', m3: '#0d0718',
      water: '#16122e', waterHi: '#39305e',
      cloud: '#8a557f', star: 0.10, lantern: 1.00, window: 1.00,
      ambient: '#ffc08a', night: 0
    },
    night: {
      skyTop: '#03020a', skyMid: '#0a1028', skyLow: '#2a2050',
      haze: '#5a4a8a', fog: '#14102a', moon: '#eaf4ff',
      m1: '#16102a', m2: '#0b0716', m3: '#05030b',
      water: '#070a1c', waterHi: '#1a2450',
      cloud: '#3a3a6a', star: 1.00, lantern: 1.38, window: 1.25,
      ambient: '#9fb8ff', night: 1
    }
  };

  function palette() {
    var b = S ? S.blend : 0;
    var d = PALETTES.dusk, n = PALETTES.night;
    return {
      skyTop: mixHex(d.skyTop, n.skyTop, b),
      skyMid: mixHex(d.skyMid, n.skyMid, b),
      skyLow: mixHex(d.skyLow, n.skyLow, b),
      haze:   mixHex(d.haze, n.haze, b),
      fog:    mixHex(d.fog, n.fog, b),
      moon:   mixHex(d.moon, n.moon, b),
      m1:     mixHex(d.m1, n.m1, b),
      m2:     mixHex(d.m2, n.m2, b),
      m3:     mixHex(d.m3, n.m3, b),
      water:  mixHex(d.water, n.water, b),
      waterHi:mixHex(d.waterHi, n.waterHi, b),
      cloud:  mixHex(d.cloud, n.cloud, b),
      star:   lerp(d.star, n.star, b),
      lantern:lerp(d.lantern, n.lantern, b),
      window: lerp(d.window, n.window, b),
      ambient:mixHex(d.ambient, n.ambient, b),
      night:  b
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Procedural artwork                                                 */
  /* ------------------------------------------------------------------ */

  function canvas2d(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function glowSprite(color) {
    if (A.glow[color]) return A.glow[color];
    var c = canvas2d(128, 128), g = c.getContext('2d');
    var grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, rgba(color, 0.95));
    grd.addColorStop(0.18, rgba(color, 0.62));
    grd.addColorStop(0.48, rgba(color, 0.20));
    grd.addColorStop(1, rgba(color, 0));
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    A.glow[color] = c;
    return c;
  }

  function makeShadow() {
    var c = canvas2d(128, 128), g = c.getContext('2d');
    var grd = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    grd.addColorStop(0, 'rgba(2,1,8,0.62)');
    grd.addColorStop(0.55, 'rgba(2,1,8,0.30)');
    grd.addColorStop(1, 'rgba(2,1,8,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return c;
  }

  function makeCanopy(kind) {
    var c = canvas2d(320, 320), g = c.getContext('2d');
    var rng = seedRng(kind === 'cherry' ? 11 : kind === 'maple' ? 27 : kind === 'willow' ? 41 : 73);
    g.clearRect(0, 0, 320, 320);

    if (kind === 'pine') {
      for (var l = 0; l < 4; l++) {
        var y = 60 + l * 58, w = 150 - l * 22;
        g.beginPath();
        g.moveTo(160, y - 92);
        g.lineTo(160 - w, y + 40);
        g.lineTo(160 + w, y + 40);
        g.closePath();
        g.fillStyle = ['#0e2a26', '#123a31', '#17473a', '#1d5445'][l];
        g.fill();
        g.strokeStyle = 'rgba(80,160,120,0.18)';
        g.lineWidth = 2;
        g.stroke();
      }
      return c;
    }

    if (kind === 'willow') {
      // broad green crown
      for (var i = 0; i < 90; i++) {
        var a = rng() * TAU, r = Math.pow(rng(), 0.62) * 120;
        var x = 160 + Math.cos(a) * r, yy = 105 + Math.sin(a) * r * 0.62;
        var rad = 10 + rng() * 18;
        var grd = g.createRadialGradient(x - rad * 0.3, yy - rad * 0.3, 1, x, yy, rad);
        grd.addColorStop(0, rng() > 0.5 ? '#8fce7a' : '#6fae5e');
        grd.addColorStop(1, 'rgba(32,82,48,0)');
        g.fillStyle = grd;
        g.beginPath(); g.arc(x, yy, rad, 0, TAU); g.fill();
      }
      // drooping strands
      for (var s = 0; s < 46; s++) {
        var sx = 60 + rng() * 200;
        var len = 60 + rng() * 130;
        g.beginPath();
        g.moveTo(sx, 150 + rng() * 20);
        g.quadraticCurveTo(sx + (rng() - 0.5) * 40, 150 + len * 0.55, sx + (rng() - 0.5) * 30, 150 + len);
        g.strokeStyle = 'rgba(104,164,86,' + (0.25 + rng() * 0.3) + ')';
        g.lineWidth = 1.6;
        g.stroke();
        for (var k = 0; k < 5; k++) {
          var t = 0.25 + rng() * 0.7;
          var lx = sx + (rng() - 0.5) * 22, ly = 150 + len * t;
          g.fillStyle = 'rgba(140,200,110,' + (0.45 + rng() * 0.3) + ')';
          g.beginPath(); g.ellipse(lx, ly, 2.4, 5, rng() * TAU, 0, TAU); g.fill();
        }
      }
      return c;
    }

    var colors = kind === 'cherry'
      ? ['#ffd6e0', '#ffb7c9', '#ff8fab', '#e85d8a', '#ffe9ef']
      : ['#ffb703', '#fb8500', '#e63946', '#c1121f', '#ffd166'];

    // dark inner mass to give the canopy volume
    var core = g.createRadialGradient(150, 145, 18, 160, 160, 145);
    core.addColorStop(0, kind === 'cherry' ? 'rgba(90,20,50,0.30)' : 'rgba(90,20,10,0.34)');
    core.addColorStop(1, 'rgba(40,8,20,0)');
    g.fillStyle = core;
    g.beginPath(); g.arc(160, 160, 145, 0, TAU); g.fill();

    // blossom / leaf clusters
    var n = kind === 'cherry' ? 130 : 110;
    for (var j = 0; j < n; j++) {
      var ang = rng() * TAU, rad = Math.pow(rng(), 0.55) * 138;
      var cx = 160 + Math.cos(ang) * rad;
      var cy = 150 + Math.sin(ang) * rad * 0.78;
      var size = 5 + rng() * 14;
      var col = colors[(rng() * colors.length) | 0];
      var alpha = 0.5 + rng() * 0.5;
      var bg = g.createRadialGradient(cx - size * 0.3, cy - size * 0.3, 0, cx, cy, size);
      bg.addColorStop(0, rgba('#ffffff', 0.55 * alpha));
      bg.addColorStop(0.35, rgba(col, 0.95 * alpha));
      bg.addColorStop(1, rgba(col, 0));
      g.fillStyle = bg;
      g.beginPath(); g.arc(cx, cy, size, 0, TAU); g.fill();
      if (rng() > 0.6) {
        g.fillStyle = rgba('#fff4d6', 0.7 * alpha);
        g.beginPath(); g.arc(cx - size * 0.2, cy - size * 0.2, size * 0.18, 0, TAU); g.fill();
      }
    }
    // a few dark branch tips
    g.strokeStyle = 'rgba(40,18,28,0.5)';
    g.lineCap = 'round';
    for (var b = 0; b < 14; b++) {
      var bx = 60 + rng() * 200, by = 80 + rng() * 150;
      g.lineWidth = 1 + rng() * 2;
      g.beginPath();
      g.moveTo(160, 210);
      g.quadraticCurveTo((bx + 160) / 2, (by + 200) / 2, bx, by);
      g.stroke();
    }
    return c;
  }

  function makePerson(kind) {
    var c = canvas2d(96, 144), g = c.getContext('2d');
    g.clearRect(0, 0, 96, 144);
    var robe = kind === 'scholar' ? '#355c7d' : kind === 'lady' ? '#b34a6e' : kind === 'bearer' ? '#a8762a' : '#5a2a32';
    var trim = kind === 'lady' ? '#ffd6e0' : kind === 'scholar' ? '#b8d8e8' : '#ffcf6b';
    var skin = '#e8c39a';
    // soft ground contact
    var sg = g.createRadialGradient(48, 136, 1, 48, 136, 28);
    sg.addColorStop(0, 'rgba(0,0,0,0.35)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sg;
    g.beginPath(); g.ellipse(48, 137, 26, 7, 0, 0, TAU); g.fill();
    // robe
    g.beginPath();
    g.moveTo(36, 54); g.quadraticCurveTo(22, 96, 24, 132);
    g.lineTo(72, 132); g.quadraticCurveTo(74, 96, 60, 54);
    g.closePath();
    var rg = g.createLinearGradient(24, 60, 74, 132);
    rg.addColorStop(0, robe); rg.addColorStop(1, shadeCss(robe, 0.55));
    g.fillStyle = rg; g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.5; g.stroke();
    // sash
    g.fillStyle = trim; g.globalAlpha = 0.85;
    g.fillRect(28, 92, 40, 4); g.globalAlpha = 1;
    // sleeves
    g.fillStyle = shadeCss(robe, 0.8);
    g.beginPath(); g.ellipse(25, 82, 9, 20, -0.3, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(71, 82, 9, 20, 0.3, 0, TAU); g.fill();
    // head
    g.fillStyle = skin;
    g.beginPath(); g.arc(48, 38, 14, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; g.stroke();
    // hair
    g.fillStyle = '#1d1420';
    g.beginPath(); g.arc(48, 34, 14.5, Math.PI * 1.02, Math.PI * 1.98); g.fill();
    g.beginPath(); g.ellipse(48, 26, 8, 5, 0, 0, TAU); g.fill();
    // face hint
    g.fillStyle = 'rgba(30,16,20,0.8)';
    g.beginPath(); g.arc(43, 39, 1.2, 0, TAU); g.fill();
    g.beginPath(); g.arc(53, 39, 1.2, 0, TAU); g.fill();
    // hat / parasol / lantern
    if (kind === 'scholar') {
      g.fillStyle = '#1d2733';
      g.beginPath(); g.ellipse(48, 26, 21, 5, 0, 0, TAU); g.fill();
      g.fillRect(44, 14, 8, 12);
      // fan
      g.fillStyle = '#f2e6cf';
      g.beginPath(); g.moveTo(74, 80); g.arc(74, 80, 18, -0.9, 0.4); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(80,50,30,0.5)'; g.lineWidth = 1; g.stroke();
    } else if (kind === 'lady') {
      // parasol
      g.strokeStyle = '#e8d8c0'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(70, 78); g.lineTo(78, 30); g.stroke();
      g.fillStyle = 'rgba(220,90,120,0.9)';
      g.beginPath(); g.arc(78, 30, 24, Math.PI, TAU); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,220,200,0.6)'; g.lineWidth = 1; g.stroke();
      // hair bun
      g.fillStyle = '#1d1420';
      g.beginPath(); g.arc(48, 20, 7, 0, TAU); g.fill();
    } else if (kind === 'bearer') {
      // lantern on a pole
      g.strokeStyle = '#6a4520'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(70, 116); g.lineTo(78, 50); g.lineTo(88, 38); g.stroke();
      var lg = g.createRadialGradient(88, 44, 1, 88, 44, 18);
      lg.addColorStop(0, 'rgba(255,240,190,0.95)');
      lg.addColorStop(0.35, 'rgba(255,180,80,0.8)');
      lg.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = lg; g.beginPath(); g.arc(88, 44, 18, 0, TAU); g.fill();
      g.fillStyle = '#e05a3a'; g.beginPath(); g.ellipse(88, 44, 6, 8, 0, 0, TAU); g.fill();
    } else {
      // guard: helmet + spear
      g.fillStyle = '#3a3f4a';
      g.beginPath(); g.arc(48, 30, 15, Math.PI * 1.05, Math.PI * 1.95); g.fill();
      g.fillRect(45, 12, 6, 8);
      g.strokeStyle = '#7a5a30'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(16, 130); g.lineTo(20, 20); g.stroke();
      g.fillStyle = '#c9c2b0';
      g.beginPath(); g.moveTo(20, 20); g.lineTo(16, 34); g.lineTo(24, 34); g.closePath(); g.fill();
    }
    // warm rim light
    g.globalCompositeOperation = 'lighter';
    var rim = g.createLinearGradient(60, 20, 92, 130);
    rim.addColorStop(0, 'rgba(255,190,110,0.16)');
    rim.addColorStop(1, 'rgba(255,120,60,0)');
    g.fillStyle = rim;
    g.beginPath(); g.moveTo(48, 20); g.lineTo(92, 10); g.lineTo(92, 140); g.lineTo(48, 140); g.closePath(); g.fill();
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  function makeLion() {
    var c = canvas2d(160, 160), g = c.getContext('2d');
    g.clearRect(0, 0, 160, 160);
    var stone = '#7d8194', dark = '#4a4e5e';
    // body
    g.fillStyle = stone;
    g.beginPath();
    g.moveTo(52, 140); g.quadraticCurveTo(40, 100, 54, 78);
    g.quadraticCurveTo(68, 62, 92, 66);
    g.quadraticCurveTo(118, 70, 122, 100);
    g.quadraticCurveTo(126, 128, 112, 142);
    g.closePath(); g.fill();
    // mane
    for (var i = 0; i < 18; i++) {
      var a = (i / 18) * TAU;
      var x = 86 + Math.cos(a) * 28, y = 70 + Math.sin(a) * 26;
      g.fillStyle = i % 2 ? '#8b8fa4' : '#666a7c';
      g.beginPath(); g.arc(x, y, 11, 0, TAU); g.fill();
    }
    // head
    g.fillStyle = '#9296aa';
    g.beginPath(); g.arc(86, 68, 20, 0, TAU); g.fill();
    // ears
    g.fillStyle = dark;
    g.beginPath(); g.arc(68, 54, 6, 0, TAU); g.fill();
    g.beginPath(); g.arc(104, 54, 6, 0, TAU); g.fill();
    // eyes
    g.fillStyle = '#20222c';
    g.beginPath(); g.arc(79, 66, 3, 0, TAU); g.fill();
    g.beginPath(); g.arc(93, 66, 3, 0, TAU); g.fill();
    // nose / mouth
    g.fillStyle = dark;
    g.beginPath(); g.arc(86, 75, 4, 0, TAU); g.fill();
    g.strokeStyle = dark; g.lineWidth = 2;
    g.beginPath(); g.moveTo(86, 78); g.quadraticCurveTo(80, 84, 76, 80); g.stroke();
    g.beginPath(); g.moveTo(86, 78); g.quadraticCurveTo(92, 84, 96, 80); g.stroke();
    // paws
    g.fillStyle = '#868a9e';
    g.beginPath(); g.ellipse(60, 142, 13, 7, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(112, 142, 13, 7, 0, 0, TAU); g.fill();
    // highlights
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(200,210,255,0.08)';
    g.beginPath(); g.ellipse(70, 94, 18, 30, -0.3, 0, TAU); g.fill();
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  function makeBoat() {
    var c = canvas2d(200, 110), g = c.getContext('2d');
    g.clearRect(0, 0, 200, 110);
    // hull
    g.beginPath();
    g.moveTo(18, 74); g.quadraticCurveTo(100, 100, 182, 74);
    g.quadraticCurveTo(168, 92, 100, 96);
    g.quadraticCurveTo(32, 92, 18, 74);
    g.closePath();
    g.fillStyle = '#3a2218'; g.fill();
    g.strokeStyle = '#1c0f0c'; g.lineWidth = 2; g.stroke();
    // upturned ends
    g.strokeStyle = '#4a2c1c'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(18, 74); g.quadraticCurveTo(8, 52, 22, 36); g.stroke();
    g.beginPath(); g.moveTo(182, 74); g.quadraticCurveTo(192, 52, 178, 36); g.stroke();
    // canopy
    g.fillStyle = '#7a2a2a';
    g.beginPath();
    g.moveTo(58, 68); g.quadraticCurveTo(100, 18, 142, 68);
    g.closePath(); g.fill();
    g.strokeStyle = '#d8a85a'; g.lineWidth = 2; g.stroke();
    // ribs
    g.strokeStyle = 'rgba(255,210,130,0.35)'; g.lineWidth = 1;
    for (var i = 1; i < 6; i++) {
      var t = i / 6;
      g.beginPath(); g.moveTo(lerp(58, 142, t), 68); g.quadraticCurveTo(lerp(58, 142, t), 40, lerp(58, 142, t + 0.02), 34); g.stroke();
    }
    // lantern
    var lg = g.createRadialGradient(160, 58, 1, 160, 58, 26);
    lg.addColorStop(0, 'rgba(255,240,190,0.95)');
    lg.addColorStop(0.3, 'rgba(255,170,70,0.7)');
    lg.addColorStop(1, 'rgba(255,110,40,0)');
    g.fillStyle = lg; g.beginPath(); g.arc(160, 58, 26, 0, TAU); g.fill();
    g.fillStyle = '#e05a3a'; g.beginPath(); g.ellipse(160, 58, 6, 8, 0, 0, TAU); g.fill();
    g.strokeStyle = '#6a4520'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(160, 36); g.lineTo(160, 30); g.stroke();
    return c;
  }

  function makeDragonBody(color) {
    var c = canvas2d(120, 72), g = c.getContext('2d');
    g.clearRect(0, 0, 120, 72);
    // glow
    var grd = g.createRadialGradient(60, 36, 2, 60, 36, 54);
    grd.addColorStop(0, rgba(color, 0.5));
    grd.addColorStop(1, rgba(color, 0));
    g.fillStyle = grd; g.beginPath(); g.arc(60, 36, 54, 0, TAU); g.fill();
    // scaled body
    var body = g.createLinearGradient(0, 18, 0, 60);
    body.addColorStop(0, '#ffe6a8');
    body.addColorStop(0.45, color);
    body.addColorStop(1, shadeCss(color, 0.45));
    g.fillStyle = body;
    g.beginPath(); g.ellipse(60, 38, 44, 17, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(80,40,10,0.35)'; g.lineWidth = 1.5; g.stroke();
    // scales
    g.strokeStyle = 'rgba(255,240,190,0.28)'; g.lineWidth = 1;
    for (var i = 0; i < 7; i++) {
      var x = 26 + i * 12;
      g.beginPath(); g.arc(x, 40, 7, -0.6, 1.4); g.stroke();
    }
    // dorsal fin
    g.fillStyle = '#c1272d';
    g.beginPath();
    g.moveTo(34, 24); g.lineTo(46, 2); g.lineTo(58, 24);
    g.lineTo(70, 4); g.lineTo(82, 24); g.closePath(); g.fill();
    // legs / fins
    g.fillStyle = '#b8862b';
    g.beginPath(); g.moveTo(42, 50); g.lineTo(34, 68); g.lineTo(48, 58); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(80, 50); g.lineTo(88, 68); g.lineTo(74, 58); g.closePath(); g.fill();
    return c;
  }

  function makeDragonHead() {
    var c = canvas2d(220, 150), g = c.getContext('2d');
    g.clearRect(0, 0, 220, 150);
    // glow
    var gl = g.createRadialGradient(110, 75, 5, 110, 75, 100);
    gl.addColorStop(0, 'rgba(255,210,110,0.5)');
    gl.addColorStop(1, 'rgba(255,120,30,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(110, 75, 100, 0, TAU); g.fill();
    // mane
    g.fillStyle = '#c1272d';
    for (var i = 0; i < 12; i++) {
      var a = -0.9 + i * 0.16;
      g.beginPath();
      g.moveTo(92, 72);
      g.lineTo(92 + Math.cos(a) * 62, 72 + Math.sin(a) * 52);
      g.lineTo(100 + Math.cos(a + 0.2) * 40, 80 + Math.sin(a + 0.2) * 30);
      g.closePath(); g.fill();
    }
    // head
    var hg = g.createLinearGradient(50, 30, 180, 120);
    hg.addColorStop(0, '#ffe9b0');
    hg.addColorStop(0.4, '#ffc04a');
    hg.addColorStop(1, '#a86a18');
    g.fillStyle = hg;
    g.beginPath();
    g.moveTo(54, 84);
    g.quadraticCurveTo(76, 38, 130, 42);
    g.quadraticCurveTo(180, 46, 196, 76);
    g.quadraticCurveTo(178, 116, 122, 112);
    g.quadraticCurveTo(78, 108, 54, 84);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(90,50,10,0.5)'; g.lineWidth = 2; g.stroke();
    // snout
    g.fillStyle = '#e8a93a';
    g.beginPath(); g.ellipse(176, 88, 30, 18, 0.1, 0, TAU); g.fill();
    g.fillStyle = '#2a1408';
    g.beginPath(); g.arc(198, 82, 3.5, 0, TAU); g.fill();
    // eye
    g.fillStyle = '#fff2c0'; g.beginPath(); g.ellipse(146, 66, 13, 9, -0.2, 0, TAU); g.fill();
    g.fillStyle = '#201008'; g.beginPath(); g.ellipse(148, 66, 5, 8, -0.2, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(146, 63, 2, 0, TAU); g.fill();
    // brow
    g.strokeStyle = '#7a3a10'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(130, 52); g.quadraticCurveTo(148, 44, 164, 54); g.stroke();
    // horns
    g.strokeStyle = '#e8d8b0'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(112, 44); g.quadraticCurveTo(100, 8, 72, 4); g.stroke();
    g.beginPath(); g.moveTo(132, 40); g.quadraticCurveTo(130, 10, 108, 0); g.stroke();
    // whiskers
    g.strokeStyle = 'rgba(255,240,200,0.8)'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(184, 94); g.quadraticCurveTo(208, 118, 214, 140); g.stroke();
    g.beginPath(); g.moveTo(174, 100); g.quadraticCurveTo(190, 128, 186, 146); g.stroke();
    // teeth
    g.fillStyle = '#fff8e0';
    for (var t = 0; t < 4; t++) {
      g.beginPath(); g.moveTo(158 + t * 9, 100); g.lineTo(162 + t * 9, 112); g.lineTo(166 + t * 9, 100); g.closePath(); g.fill();
    }
    return c;
  }

  function ensureAssets() {
    if (A.ready) return;
    A.ready = true;
    A.glow = {};
    A.shadow = makeShadow();
    A.canopy = {
      cherry: makeCanopy('cherry'),
      maple: makeCanopy('maple'),
      willow: makeCanopy('willow'),
      pine: makeCanopy('pine')
    };
    A.person = {
      scholar: makePerson('scholar'),
      lady: makePerson('lady'),
      bearer: makePerson('bearer'),
      guard: makePerson('guard')
    };
    A.boat = makeBoat();
    A.lion = makeLion();
    A.dragonBody = [makeDragonBody('#ffc94a'), makeDragonBody('#59d6a8'), makeDragonBody('#ff8a5c')];
    A.dragonHead = makeDragonHead();
  }

  /* ------------------------------------------------------------------ */
  /*  Camera & projection                                                */
  /* ------------------------------------------------------------------ */

  var FOV = 52 * Math.PI / 180;
  var NEAR = 0.18;

  function cameraPos(cam) {
    var cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    return {
      x: cam.tx + Math.sin(cam.yaw) * cp * cam.dist,
      y: cam.ty + sp * cam.dist,
      z: cam.tz + Math.cos(cam.yaw) * cp * cam.dist
    };
  }

  function updateView() {
    var v = S.view;
    var pos, fx, fy, fz, pitch;
    if (S.firstPerson && S.fp) {
      var fp = S.fp;
      var fcp = Math.cos(fp.pitch), fsp = Math.sin(fp.pitch);
      pos = { x: fp.x, y: fp.y, z: fp.z };
      fx = -Math.sin(fp.yaw) * fcp;
      fy = -fsp;
      fz = -Math.cos(fp.yaw) * fcp;
      pitch = fp.pitch;
    } else {
      var cam = S.cam;
      pos = cameraPos(cam);
      var dx = cam.tx - pos.x, dy = cam.ty - pos.y, dz = cam.tz - pos.z;
      var l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      fx = dx / l; fy = dy / l; fz = dz / l;
      pitch = cam.pitch;
    }
    var rx = -fz, ry = 0, rz = fx;
    var rl = Math.sqrt(rx * rx + rz * rz) || 1;
    rx /= rl; rz /= rl;
    var ux = ry * fz - rz * fy;
    var uy = rz * fx - rx * fz;
    var uz = rx * fy - ry * fx;
    v.camX = pos.x; v.camY = pos.y; v.camZ = pos.z;
    v.fx = fx; v.fy = fy; v.fz = fz;
    v.rx = rx; v.ry = 0; v.rz = rz;
    v.ux = ux; v.uy = uy; v.uz = uz;
    v.ox = v.w * 0.5;
    v.oy = v.h * 0.5;
    var aspect = v.w / Math.max(1, v.h);
    var fov = S.firstPerson ? (62 * Math.PI / 180) : FOV;
    if (aspect < 1.25) {
      var ft = clamp((1.25 - aspect) / 0.55, 0, 1);
      fov += ft * (22 * Math.PI / 180);
    }
    v.focal = (v.h * 0.5) / Math.tan(fov * 0.5);
    v.horizon = v.oy - Math.tan(pitch) * v.focal;
  }

  function toCam(x, y, z) {
    var v = S.view;
    var dx = x - v.camX, dy = y - v.camY, dz = z - v.camZ;
    return {
      x: dx * v.rx + dy * v.ry + dz * v.rz,
      y: dx * v.ux + dy * v.uy + dz * v.uz,
      z: dx * v.fx + dy * v.fy + dz * v.fz
    };
  }

  function projectCam(p) {
    var v = S.view;
    var s = v.focal / p.z;
    return { x: v.ox + p.x * s, y: v.oy - p.y * s, s: s, d: p.z };
  }

  function project(x, y, z) {
    var p = toCam(x, y, z);
    if (p.z <= NEAR) return null;
    return projectCam(p);
  }

  function clipNear(pts) {
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length];
      var ain = a.z >= NEAR, bin = b.z >= NEAR;
      if (ain) out.push(a);
      if (ain !== bin) {
        var t = (NEAR - a.z) / (b.z - a.z);
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: NEAR });
      }
    }
    return out;
  }

  function projectPoly(points) {
    var cp = [], i, sum = 0;
    for (i = 0; i < points.length; i++) {
      var p = toCam(points[i][0], points[i][1], points[i][2]);
      cp.push(p);
      sum += p.z;
    }
    if (cp.length < 3) return null;
    if (cp[0].z < NEAR && cp[1].z < NEAR && cp[2].z < NEAR) {
      var any = false;
      for (i = 0; i < cp.length; i++) if (cp[i].z >= NEAR) { any = true; break; }
      if (!any) return null;
    }
    var clipped = clipNear(cp);
    if (clipped.length < 3) return null;
    var pts = [], minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (i = 0; i < clipped.length; i++) {
      var q = projectCam(clipped[i]);
      pts.push(q);
      if (q.x < minX) minX = q.x;
      if (q.x > maxX) maxX = q.x;
      if (q.y < minY) minY = q.y;
      if (q.y > maxY) maxY = q.y;
    }
    var w = S.view.w, h = S.view.h;
    if (maxX < -80 || minX > w + 80 || maxY < -80 || minY > h + 80) return null;
    var bw = maxX - minX, bh = maxY - minY;
    if (bw < 0.7 || bh < 0.7 || bw * bh < 1.6) return null;
    return { pts: pts, depth: sum / points.length, minX: minX, maxX: maxX, minY: minY, maxY: maxY };
  }

  function projectLine(a, b) {
    var ca = toCam(a[0], a[1], a[2]);
    var cb = toCam(b[0], b[1], b[2]);
    if (ca.z < NEAR && cb.z < NEAR) return null;
    if (ca.z < NEAR) {
      var t = (NEAR - ca.z) / (cb.z - ca.z);
      ca = { x: ca.x + (cb.x - ca.x) * t, y: ca.y + (cb.y - ca.y) * t, z: NEAR };
    } else if (cb.z < NEAR) {
      var t2 = (NEAR - cb.z) / (ca.z - cb.z);
      cb = { x: cb.x + (ca.x - cb.x) * t2, y: cb.y + (ca.y - cb.y) * t2, z: NEAR };
    }
    var pa = projectCam(ca), pb = projectCam(cb);
    if (Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y) < 0.9) return null;
    return { a: pa, b: pb, depth: (ca.z + cb.z) * 0.5, s: (pa.s + pb.s) * 0.5 };
  }

  function screenRay(px, py) {
    var v = S.view;
    var x = (px - v.ox) / v.focal;
    var y = -(py - v.oy) / v.focal;
    var dx = v.rx * x + v.ux * y + v.fx;
    var dy = v.ry * x + v.uy * y + v.fy;
    var dz = v.rz * x + v.uz * y + v.fz;
    var l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    return [dx / l, dy / l, dz / l];
  }

  /* ------------------------------------------------------------------ */
  /*  Geometry primitives                                                */
  /* ------------------------------------------------------------------ */

  function addPoly(points, hex, k, opts) {
    opts = opts || {};
    var col = shadeCss(hex, k == null ? 1 : k, opts.warm || 0);
    S.polys.push({
      p: points, col: col, e: !!opts.e, glow: opts.glow || 0,
      n: opts.n || null, c: opts.c || null, tile: !!opts.tile,
      g: opts.g || 0
    });
  }

  function addLine(a, b, hex, w, alpha) {
    S.lines.push({
      a: a, b: b,
      col: rgba(hex, alpha == null ? 1 : alpha),
      w: w == null ? 0.06 : w
    });
  }

  function box(cx, y0, cz, w, h, d, hex, opts) {
    opts = opts || {};
    var x0 = cx - w / 2, x1 = cx + w / 2;
    var z0 = cz - d / 2, z1 = cz + d / 2;
    var y1 = y0 + h;
    var p0 = [x0, y0, z1], p1 = [x1, y0, z1], p2 = [x1, y0, z0], p3 = [x0, y0, z0];
    var p4 = [x0, y1, z1], p5 = [x1, y1, z1], p6 = [x1, y1, z0], p7 = [x0, y1, z0];
    var top = opts.top || hex;
    var side = opts.side || hex;
    var back = opts.back || hex;
    var cy = y0 + h / 2, kk = opts.k || 1;
    function fo(nx, ny, nz, cxx, cyy, czz) {
      return { warm: opts.warm, e: opts.e, glow: opts.glow, n: [nx, ny, nz], c: [cxx, cyy, czz] };
    }
    addPoly([p0, p1, p5, p4], opts.front || hex, kk * 1.0, fo(0, 0, 1, cx, cy, z1));
    addPoly([p1, p2, p6, p5], side, kk * 0.82, fo(1, 0, 0, x1, cy, cz));
    addPoly([p2, p3, p7, p6], back, kk * 0.72, fo(0, 0, -1, cx, cy, z0));
    addPoly([p3, p0, p4, p7], side, kk * 0.9, fo(-1, 0, 0, x0, cy, cz));
    addPoly([p4, p5, p6, p7], top, kk * 1.1, fo(0, 1, 0, cx, y1, cz));
    if (opts.bottom) addPoly([p3, p2, p1, p0], back, kk * 0.5, fo(0, -1, 0, cx, y0, cz));
    return { x0: x0, x1: x1, z0: z0, z1: z1, y0: y0, y1: y1 };
  }

  function cylinder(cx, cz, y0, y1, r, sides, hex, opts) {
    opts = opts || {};
    var prevX = null, prevZ = null;
    var top = [];
    for (var i = 0; i <= sides; i++) {
      var a = (i % sides) / sides * TAU;
      var x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      top.push([x, y1, z]);
      if (prevX !== null) {
        var k = (opts.k == null ? 1 : opts.k) * (0.72 + 0.32 * Math.max(0, Math.cos(a - 0.8)));
        var am = (i - 0.5) / sides * TAU;
        var nx = Math.cos(am), nz = Math.sin(am);
        var fopt = { warm: opts.warm, e: opts.e, glow: opts.glow, n: [nx, 0, nz], c: [cx + nx * r, (y0 + y1) / 2, cz + nz * r] };
        addPoly([[prevX, y0, prevZ], [x, y0, z], [x, y1, z], [prevX, y1, prevZ]], hex, k, fopt);
      }
      prevX = x; prevZ = z;
    }
    if (opts.cap !== false) {
      addPoly(top, opts.top || hex, (opts.k == null ? 1 : opts.k) * 1.16, {
        warm: opts.warm, e: opts.e, glow: opts.glow, n: [0, 1, 0], c: [cx, y1, cz]
      });
    }
    return top;
  }

  function cone(cx, cz, y0, y1, r, sides, hex, opts) {
    opts = opts || {};
    for (var i = 0; i < sides; i++) {
      var a0 = i / sides * TAU, a1 = (i + 1) / sides * TAU;
      var p0 = [cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r];
      var p1 = [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r];
      addPoly([p0, p1, [cx, y1, cz]], hex, (opts.k == null ? 1 : opts.k) * (0.68 + 0.32 * Math.cos(a0 - 0.7)), opts);
    }
  }

  /* Sweeping, upturned Chinese hip roof.
   * ridgeLen: length along the ridge, crossLen: width across the ridge. */
  function addRoof(cx, cz, y, ridgeLen, crossLen, h, upturn, hex, opts) {
    opts = opts || {};
    var ridgeAxis = opts.ridge || 'x';
    var gable = !!opts.gable;
    var us = opts.us || 5, ts = opts.ts || 1;
    var rr = gable ? ridgeLen / 2 : Math.max(0, (ridgeLen - crossLen) / 2);
    var baseK = opts.k == null ? 1 : opts.k;
    var trim = opts.trim || '#e8b85f';
    var wallCol = opts.wall || '#d9c8a3';
    var surf = { e: opts.e, warm: opts.warm, glow: opts.glow, tile: opts.tiles !== false };

    function map(lx, ly, lz) {
      if (ridgeAxis === 'z') return [cx + lz, ly, cz + lx];
      return [cx + lx, ly, cz + lz];
    }

    function facePt(u, t, sz) {
      var lx = lerp((u * 2 - 1) * rr, (u * 2 - 1) * ridgeLen / 2, t);
      var lz = sz * (t * crossLen / 2);
      var ly = y + h * Math.pow(1 - t, 1.3) +
        upturn * Math.pow(Math.abs(u * 2 - 1), 3) * Math.pow(t, 2.5);
      return map(lx, ly, lz);
    }

    for (var sz = -1; sz <= 1; sz += 2) {
      for (var i = 0; i < us; i++) {
        for (var j = 0; j < ts; j++) {
          var u0 = i / us, u1 = (i + 1) / us, t0 = j / ts, t1 = (j + 1) / ts;
          var k = baseK * (0.82 + 0.22 * (1 - t0)) * (sz > 0 ? 1 : 0.8);
          k *= (i % 2 ? 0.965 : 1);
          addPoly([facePt(u0, t0, sz), facePt(u1, t0, sz), facePt(u1, t1, sz), facePt(u0, t1, sz)], hex, k, surf);
        }
      }
    }

    if (!gable) {
      for (var sx = -1; sx <= 1; sx += 2) {
        for (var e = 0; e < us; e++) {
          for (var f = 0; f < ts; f++) {
            var v0 = e / us, v1 = (e + 1) / us, w0 = f / ts, w1 = (f + 1) / ts;
            function endPt(v, t) {
              var lx = sx * lerp(rr, ridgeLen / 2, t);
              var lz = (v * 2 - 1) * lerp(0, crossLen / 2, t);
              var ly = y + h * Math.pow(1 - t, 1.3) +
                upturn * Math.pow(Math.abs(v * 2 - 1), 3) * Math.pow(t, 2.5);
              return map(lx, ly, lz);
            }
            addPoly([endPt(v0, w0), endPt(v1, w0), endPt(v1, w1), endPt(v0, w1)],
              hex, baseK * 0.76 * (0.85 + 0.2 * (1 - w0)), surf);
          }
        }
      }
    } else {
      for (var gs = -1; gs <= 1; gs += 2) {
        addPoly([
          map(gs * ridgeLen / 2, y, -crossLen / 2),
          map(gs * ridgeLen / 2, y, crossLen / 2),
          map(gs * ridgeLen / 2, y + h, 0)
        ], wallCol, baseK * 0.82, { e: opts.e, warm: opts.warm });
      }
    }

    // gold ridge beam + finials
    if (rr > 0.2) {
      if (ridgeAxis === 'z') {
        box(cx, y + h - 0.06, cz, 0.24, 0.22, rr * 2 + 0.5, trim, { k: 1.15 });
      } else {
        box(cx, y + h - 0.06, cz, rr * 2 + 0.5, 0.22, 0.24, trim, { k: 1.15 });
      }
      var ends = [[-1, 0], [1, 0]];
      if (ridgeAxis === 'z') ends = [[0, -1], [0, 1]];
      ends.forEach(function (e) {
        var ex = cx + e[0] * (rr + 0.2), ez = cz + e[1] * (rr + 0.2);
        box(ex, y + h - 0.05, ez, 0.3, 0.55, 0.3, trim, { k: 1.2 });
      });
    } else {
      cylinder(cx, cz, y + h - 0.1, y + h + 0.5, 0.18, 6, trim, { k: 1.2 });
    }

    if (opts.lines !== false) {
      // eave edges
      for (var seg = 0; seg < 4; seg++) {
        var a0 = seg / 4, a1 = (seg + 1) / 4;
        addLine(facePt(a0, 1, 1), facePt(a1, 1, 1), trim, 0.055, 0.72);
        addLine(facePt(a0, 1, -1), facePt(a1, 1, -1), trim, 0.055, 0.6);
      }
      if (!gable) {
        for (var seg2 = 0; seg2 < 3; seg2++) {
          var b0 = seg2 / 3, b1 = (seg2 + 1) / 3;
          function edgePt(v, sx) {
            var lx = sx * ridgeLen / 2;
            var lz = (v * 2 - 1) * crossLen / 2;
            var ly = y + upturn * Math.pow(Math.abs(v * 2 - 1), 3);
            return map(lx, ly, lz);
          }
          addLine(edgePt(b0, -1), edgePt(b1, -1), trim, 0.05, 0.55);
          addLine(edgePt(b0, 1), edgePt(b1, 1), trim, 0.05, 0.55);
        }
      }
    }
    return { rr: rr };
  }

  function addTierRoof(cx, cz, y, rIn, rOut, h, sides, upturn, hex, opts) {
    opts = opts || {};
    var trim = opts.trim || '#e8b85f';
    var surf = { e: opts.e, warm: opts.warm, glow: opts.glow, tile: opts.tiles !== false };
    for (var i = 0; i < sides; i++) {
      var a0 = i / sides * TAU, a1 = (i + 1) / sides * TAU;
      var p0 = [cx + Math.cos(a0) * rIn, y + h, cz + Math.sin(a0) * rIn];
      var p1 = [cx + Math.cos(a1) * rIn, y + h, cz + Math.sin(a1) * rIn];
      var p2 = [cx + Math.cos(a1) * rOut, y + upturn, cz + Math.sin(a1) * rOut];
      var p3 = [cx + Math.cos(a0) * rOut, y + upturn, cz + Math.sin(a0) * rOut];
      addPoly([p0, p1, p2, p3], hex, 0.78 + 0.22 * Math.cos(a0 - 0.7), surf);
      // upturned corner flick
      addLine(p3, [cx + Math.cos(a0) * (rOut + 0.45), y + upturn + 0.28, cz + Math.sin(a0) * (rOut + 0.45)], trim, 0.055, 0.7);
    }
    // eave ring
    for (var j = 0; j < sides; j++) {
      var b0 = j / sides * TAU, b1 = (j + 1) / sides * TAU;
      addLine(
        [cx + Math.cos(b0) * rOut, y + upturn, cz + Math.sin(b0) * rOut],
        [cx + Math.cos(b1) * rOut, y + upturn, cz + Math.sin(b1) * rOut],
        trim, 0.06, 0.7
      );
    }
    // inner cap
    cylinder(cx, cz, y + h - 0.05, y + h + 0.08, rIn * 0.98, sides, hex, { k: 0.8 });
  }

  function addStairs(cx, cz, width, steps, rise, run, hex, opts) {
    for (var i = 0; i < steps; i++) {
      box(cx, i * rise, cz + i * run, width, rise, run + 0.05, hex, opts || { k: 0.9 });
    }
  }

  function addRailing(x1, z1, x2, z2, y, hex, opts) {
    opts = opts || {};
    var len = Math.hypot(x2 - x1, z2 - z1);
    var n = Math.max(2, Math.round(len / 1.25));
    var trim = opts.trim || hex;
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      var x = lerp(x1, x2, t), z = lerp(z1, z2, t);
      addLine([x, y, z], [x, y + 0.74, z], trim, 0.055, 0.62);
    }
    addLine([x1, y + 0.70, z1], [x2, y + 0.70, z2], trim, 0.085, 0.92);
    addLine([x1, y + 0.38, z1], [x2, y + 0.38, z2], opts.mid || hex, 0.05, 0.6);
    addLine([x1, y + 0.04, z1], [x2, y + 0.04, z2], opts.base || hex, 0.05, 0.5);
  }

  function addBanner(x, y, z, w, h, hex, opts) {
    opts = opts || {};
    S.banners.push({
      x: x, y: y, z: z, w: w, h: h,
      col: hex, trim: opts.trim || '#ffcf6b',
      text: opts.text || pick(['茶', '酒', '灯', '月', '福', '春', '香']),
      phase: rnd(0, TAU), axis: opts.axis || 'x'
    });
  }

  function addLantern(x, y, z, r, opts) {
    opts = opts || {};
    S.lanterns.push({
      x: x, y: y, z: z, r: r || 0.26,
      phase: rnd(0, TAU),
      col: opts.col || '#ff6b3d',
      glow: opts.glow || '#ffb45c',
      sway: opts.sway == null ? 1 : opts.sway
    });
  }

  function addWindow(x, y, z, w, h, opts) {
    opts = opts || {};
    S.windows.push({
      x: x, y: y, z: z, w: w, h: h,
      phase: rnd(0, TAU),
      axis: opts.axis || 'z',
      glow: opts.glow || '#ffcf7a'
    });
  }

  function addPlaque(x, y, z, w, h, text, opts) {
    S.plaques.push({
      x: x, y: y, z: z, w: w, h: h, text: text,
      col: (opts && opts.col) || '#ffcf6b'
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Town layout                                                        */
  /* ------------------------------------------------------------------ */

  var HOTSPOTS = [
    {
      id: 'palace', zh: '凌霄殿', name: 'Hall of the Azure Sky',
      x: 0, y: 15.8, z: -15,
      cam: { tx: 0, ty: 5.6, tz: -14, yaw: 0.06, pitch: 0.09, dist: 27 },
      fp: { x: 0, y: 1.72, z: 1.2, yaw: 0, pitch: 0.02 },
      col: '#ffcf6b',
      desc: 'The heart of the town. Three marble terraces lift a double-eaved hall above the mist, its gold ridge beasts watching the moon.'
    },
    {
      id: 'pagoda', zh: '望月塔', name: 'Moonview Pagoda',
      x: -24, y: 24.5, z: -8,
      cam: { tx: -24, ty: 12, tz: -8, yaw: -0.62, pitch: 0.10, dist: 29 },
      fp: { x: -13, y: 1.72, z: -2.0, yaw: 1.10, pitch: -0.08 },
      col: '#7fe7d0',
      desc: 'Seven octagonal tiers climb toward the moon. Each eave carries a bronze bell; on still nights their notes drift across the canal.'
    },
    {
      id: 'belltower', zh: '钟楼', name: 'Bell Tower',
      x: 23, y: 10.8, z: -7,
      cam: { tx: 23, ty: 5.4, tz: -7, yaw: 0.53, pitch: 0.19, dist: 14.2 },
      fp: { x: 27, y: 1.72, z: -2.0, yaw: 0.675, pitch: -0.32 },
      col: '#e6c77a',
      desc: 'A bronze bell hangs in the eastern watchtower. At dusk its one deep note rolls over the roofs, and every lantern in the town seems to answer.'
    },
    {
      id: 'bridge', zh: '月桥', name: 'Moon Bridge',
      x: 0, y: 4.2, z: 4.5,
      cam: { tx: 0, ty: 0.6, tz: 4.5, yaw: 1.57, pitch: 0.12, dist: 13 },
      fp: { x: -7.0, y: 1.72, z: 8.6, yaw: -0.95, pitch: 0.02 },
      col: '#9fc9ff',
      desc: 'A single stone arch over the jade canal. Lantern light pools beneath it, and koi gather where the reflections break.'
    },
    {
      id: 'street', zh: '灯街', name: 'Lantern Street',
      x: 0, y: 7.0, z: 17,
      cam: { tx: 0, ty: 3.4, tz: 16, yaw: 0.05, pitch: 0.10, dist: 21 },
      fp: { x: 2.4, y: 1.68, z: 25.0, yaw: 0, pitch: 0.02 },
      col: '#ff9d6b',
      desc: 'Teahouses, wine shops and paper lanterns. The dragon circles here after dusk, trailing sparks over the crowd.'
    },
    {
      id: 'gate', zh: '龙门', name: 'Dragon Gate',
      x: 0, y: 12.0, z: 27,
      cam: { tx: 0, ty: 5.6, tz: 25, yaw: 0.18, pitch: 0.12, dist: 21 },
      fp: { x: 0, y: 1.72, z: 18.0, yaw: Math.PI, pitch: 0.02 },
      col: '#ffb36b',
      desc: 'Four vermilion columns and three roofs mark the entrance to the town. Stone lions guard the threshold, their manes silver with rain.'
    }
  ];

  var AERIAL = { tx: 0, ty: 5.0, tz: -2, yaw: 0.58, pitch: 0.42, dist: 54 };
  var HERO = { tx: 0, ty: 4.6, tz: -10, yaw: 0.04, pitch: 0.04, dist: 34 };
  var TOUR = ['palace', 'pagoda', 'belltower', 'bridge', 'street', 'gate'];

  /* ------------------------------------------------------------------ */
  /*  World builders                                                     */
  /* ------------------------------------------------------------------ */

  function buildWorld() {
    S.polys = [];
    S.lines = [];
    S.lions = [];
    S.lanterns = [];
    S.windows = [];
    S.banners = [];
    S.plaques = [];
    S.signs = [];
    S.trees = [];
    S.people = [];
    S.boats = [];
    S.hotspots = HOTSPOTS;
    S.petals = [];
    S.fireflies = [];
    S.skyLanterns = [];
    S.ripples = [];
    S.koi = [];
    S.birds = [];
    S.mist = [];
    S.fireworks = [];
    S.rockets = [];
    S.flashes = [];

    addGroundPlaza();
    addCanal();
    buildPalace();
    buildPagoda();
    buildGate();
    buildBellTower();
    buildStreet();
    buildBridge();
    buildCityWalls();
    buildBackgroundTown();

    // trees
    addTree(-16.2, 0.8, 'willow', 1.0);
    addTree(16.4, 1.0, 'willow', 1.0);
    addTree(-19.6, 8.4, 'willow', 0.9);
    addTree(19.8, 8.4, 'willow', 0.92);
    addTree(-22, 1.0, 'willow', 0.9);
    addTree(22, 1.0, 'willow', 0.9);
    addTree(-20.8, -6.0, 'cherry', 1.15);
    addTree(20.2, -4.5, 'cherry', 1.08);
    addTree(-17.5, 10.6, 'cherry', 1.1);
    addTree(18.6, 13.2, 'maple', 1.2);
    addTree(-27, 19.5, 'maple', 1.05);
    addTree(27.5, 22.5, 'maple', 1.1);
    addTree(-29, -4, 'pine', 1.2);
    addTree(29, -10, 'pine', 1.25);
    addTree(-19, 25.5, 'cherry', 0.9);
    addTree(19.5, 27.0, 'cherry', 0.9);

    // lantern strings across the street
    addLanternString(11.4, 6.4, -8.2, 8.2, 4);
    addLanternString(15.8, 6.7, -8.2, 8.2, 4);
    addLanternString(20.2, 6.5, -8.2, 8.2, 4);
    addLanternString(24.6, 6.8, -8.2, 8.2, 4);

    // banners along the street
    [-1, 1].forEach(function (side) {
      [10.2, 14.6, 19.0, 23.4].forEach(function (z, i) {
        addBanner(side * 6.4, 2.0, z, 0.9, 3.2, i % 2 ? '#8f1d2c' : '#a8262f', { trim: '#ffcf6b', text: ['茶', '酒', '灯', '福'][i] });
      });
    });

    // banners on the palace terrace
    [-1, 1].forEach(function (side) {
      addBanner(side * 11.5, 3.2, -7.6, 1.1, 4.0, '#8f1d2c', { trim: '#ffcf6b', text: '月' });
      addBanner(side * 8.4, 3.2, -7.6, 1.0, 3.6, '#a8262f', { trim: '#ffcf6b', text: '玉' });
    });

    // ambient life
    for (var i = 0; i < 9; i++) {
      var p = makePersonState(i);
      S.people.push(p);
    }
    for (var b = 0; b < 2; b++) {
      S.boats.push({
        x: b ? 14 : -14, z: 4.6, phase: rnd(0, TAU),
        dir: b ? -1 : 1, speed: rnd(0.35, 0.6), y: 0.06
      });
    }
    for (var k = 0; k < 5; k++) {
      S.koi.push({
        x: rnd(-20, 20), z: rnd(3, 6.6), phase: rnd(0, TAU),
        speed: rnd(0.25, 0.55), r: rnd(0.10, 0.16), col: k % 2 ? '#ff8a3d' : '#f5e6cf'
      });
    }
    for (var f = 0; f < 22; f++) {
      S.fireflies.push({
        x: rnd(-28, 28), y: rnd(0.8, 4.2), z: rnd(-16, 24),
        phase: rnd(0, TAU), speed: rnd(0.2, 0.5), r: rnd(0.035, 0.07)
      });
    }
    for (var sl = 0; sl < 9; sl++) {
      S.skyLanterns.push({
        x: rnd(-26, 26), y: rnd(5, 21), z: rnd(-22, 8),
        phase: rnd(0, TAU), speed: rnd(0.15, 0.32), r: rnd(0.06, 0.10)
      });
    }
    for (var bd = 0; bd < 7; bd++) {
      S.birds.push({
        a: rnd(0, TAU), r: rnd(7, 13), h: rnd(25, 31), speed: rnd(0.09, 0.16),
        phase: rnd(0, TAU), cx: -17, cz: -8
      });
    }
    for (var ms = 0; ms < 7; ms++) {
      S.mist.push({
        x: rnd(-30, 30), z: rnd(-24, 26), y: rnd(0.4, 1.6),
        r: rnd(3.5, 7), phase: rnd(0, TAU), speed: rnd(0.08, 0.2)
      });
    }
    S.petals = [];
    S.trees.forEach(function (t) {
      if (t.kind !== 'cherry') return;
      for (var i = 0; i < 14; i++) {
        S.petals.push(newPetal(t.x, t.z, 4 * t.s));
      }
    });
  }

  function addGroundPlaza() {
    // broad stone apron, split by the canal so the water is a real opening
    addPoly([
      [-40, 0, -34], [40, 0, -34], [40, 0, 2.0], [-40, 0, 2.0]
    ], '#33253c', 0.86, { warm: 0.03, g: 1 });
    addPoly([
      [-40, 0, 7.6], [40, 0, 7.6], [40, 0, 34], [-40, 0, 34]
    ], '#33253c', 0.86, { warm: 0.03, g: 1 });

    // central avenue
    addPoly([
      [-4.8, 0.012, 8], [4.8, 0.012, 8], [4.8, 0.012, 27], [-4.8, 0.012, 27]
    ], '#3c3042', 0.92, { warm: 0.03, g: 1 });
    // palace forecourt
    addPoly([
      [-13, 0.012, -6], [13, 0.012, -6], [13, 0.012, 1.8], [-13, 0.012, 1.8]
    ], '#3c2f46', 0.92, { warm: 0.03, g: 1 });

    // paving seams
    for (var z = -4; z <= 26; z += 4.4) {
      addLine([-4.8, 0.016, z], [4.8, 0.016, z], '#8a6c8f', 0.035, 0.22);
    }
    for (var x = -4.8; x <= 4.8; x += 2.6) {
      addLine([x, 0.017, 8], [x, 0.017, 27], '#8a6c8f', 0.028, 0.16);
    }
    // forecourt seams
    for (var z2 = -5; z2 <= 8.5; z2 += 3.4) {
      addLine([-12, 0.016, z2], [12, 0.016, z2], '#8a6c8f', 0.03, 0.16);
    }
    for (var x2 = -12; x2 <= 12; x2 += 3.4) {
      addLine([x2, 0.016, -5.5], [x2, 0.016, 8.5], '#8a6c8f', 0.03, 0.13);
    }

    // radial shadow under the palace
    for (var i = 0; i < 7; i++) {
      addPoly([
        [-18 + i, 0.01, -7 - i * 1.2], [18 - i, 0.01, -7 - i * 1.2],
        [16 - i, 0.01, -22 - i], [-16 + i, 0.01, -22 - i]
      ], '#0d0814', 0.38 - i * 0.03);
    }

    // cut stone slabs along the avenue — gives the street-level camera real texture
    var trng = seedRng(412);
    var tileCols = ['#3b2e42', '#3f3247', '#382b3e', '#43364a', '#3a2d40'];
    for (var tz = 8.2; tz < 27; tz += 2.15) {
      for (var tx = -4.8; tx < 4.8; tx += 2.4) {
        var tw = 2.28, td = 2.02;
        addPoly([
          [tx + 0.04, 0.014, tz + 0.04], [tx + tw, 0.014, tz + 0.04],
          [tx + tw, 0.014, tz + td], [tx + 0.04, 0.014, tz + td]
        ], tileCols[(trng() * tileCols.length) | 0], 0.9 + trng() * 0.13, { warm: 0.025 });
      }
    }
    for (var fz = -5.8; fz < 1.8; fz += 2.55) {
      for (var fx = -12.8; fx < 12.8; fx += 3.2) {
        addPoly([
          [fx + 0.05, 0.014, fz + 0.05], [fx + 3.1, 0.014, fz + 0.05],
          [fx + 3.1, 0.014, fz + 2.45], [fx + 0.05, 0.014, fz + 2.45]
        ], tileCols[(trng() * tileCols.length) | 0], 0.86 + trng() * 0.14, { warm: 0.02 });
      }
    }

    // rain-dark puddles holding lantern light
    var puddles = [
      [-1.35, 20.1, 1.65, 0.52, -0.12], [2.25, 16.4, 1.15, 0.38, 0.10],
      [-2.7, 12.8, 0.95, 0.32, -0.05], [1.4, 23.9, 0.72, 0.26, 0.16],
      [-0.4, 9.8, 1.3, 0.42, 0.04]
    ];
    for (var p = 0; p < puddles.length; p++) {
      var pu = puddles[p];
      var pp = [];
      for (var pa = 0; pa < 12; pa++) {
        var aa = (pa / 12) * TAU;
        var pr = 0.82 + Math.sin(aa * 3 + p) * 0.18;
        pp.push([pu[0] + Math.cos(aa) * pu[2] * pr, 0.031, pu[1] + Math.sin(aa) * pu[3] * pr]);
      }
      addPoly(pp, '#1a2a4c', 0.98, { glow: 0.65, warm: -0.02 });
    }

    // scattered cherry petals on the stones
    var prng = seedRng(881);
    for (var pe = 0; pe < 26; pe++) {
      var px = -4.4 + prng() * 8.8;
      var pz = 9.5 + prng() * 16.5;
      var ps = 0.08 + prng() * 0.10;
      addPoly([
        [px - ps, 0.034, pz - ps * 0.4], [px + ps * 0.5, 0.034, pz - ps],
        [px + ps, 0.034, pz + ps * 0.5], [px - ps * 0.4, 0.034, pz + ps]
      ], prng() > 0.35 ? '#d98a9b' : '#f0c7c0', 1.0, { e: true, glow: 0.12 });
    }
  }

  function addCanal() {
    // a dark canal bed and the water surface
    addPoly([
      [-40, -0.55, 2.0], [40, -0.55, 2.0], [40, -0.55, 7.6], [-40, -0.55, 7.6]
    ], '#0b0a18', 0.7, { g: 2 });
    addPoly([
      [-40, -0.18, 2.0], [40, -0.18, 2.0], [40, -0.18, 7.6], [-40, -0.18, 7.6]
    ], '#1b2a52', 0.98, { glow: 1, g: 1 });
    // stone banks
    box(0, -0.7, 1.6, 80, 0.9, 0.55, '#4c4054', { top: '#6a5a72', k: 0.9 });
    box(0, -0.7, 8.0, 80, 0.9, 0.55, '#4c4054', { top: '#6a5a72', k: 0.9 });
    // bank caps
    box(0, 0.18, 1.6, 80, 0.16, 0.8, '#5a4a62', { top: '#8b7894', k: 1.0 });
    box(0, 0.18, 8.0, 80, 0.16, 0.8, '#5a4a62', { top: '#8b7894', k: 1.0 });
    // steps down to the water
    [-15, 15].forEach(function (sx) {
      for (var i = 0; i < 4; i++) {
        box(sx, -0.1 - i * 0.18, 8.5 + i * 0.34, 3.2, 0.18, 0.4, '#5a4a62', { top: '#8b7894' });
      }
    });
    // lotus pads
    var rng = seedRng(77);
    for (var i = 0; i < 20; i++) {
      var lx = -30 + rng() * 60;
      var lz = 2.6 + rng() * 4.4;
      if (Math.abs(lx) < 4.5) continue;
      var r = 0.3 + rng() * 0.45;
      addPoly([
        [lx - r, -0.15, lz - r * 0.5], [lx + r, -0.15, lz - r * 0.55],
        [lx + r * 0.8, -0.15, lz + r * 0.5], [lx - r * 0.7, -0.15, lz + r * 0.45]
      ], '#3f7a52', 0.9 + rng() * 0.2);
      if (rng() > 0.72) {
        addLantern(lx, 0.05, lz, 0.09, { col: '#ff9fc0', glow: '#ffb7d0', sway: 0.2 });
      }
    }
    // reflections under the bridge lanterns
    [-3.2, 3.2].forEach(function (x) {
      addLine([x, -0.15, 4.5], [x, -0.15, 2.2], '#ffb45c', 0.08, 0.18);
    });
  }

  function buildPalace() {
    var cx = 0, cz = -14;
    // terrace tiers
    box(cx, 0, cz, 32, 1.0, 18, '#5a4c62', { top: '#766684', k: 0.9 });
    box(cx, 1.0, cz, 28, 1.0, 15, '#60526a', { top: '#7e6e8a', k: 0.92 });
    box(cx, 2.0, cz, 24, 1.0, 12, '#665872', { top: '#877792', k: 0.95 });

    // balustrades on the top tier (front and sides)
    addRailing(-11.2, -8.0, -6.2, -8.0, 3.0, '#8a7894', { trim: '#c8b6d8' });
    addRailing(6.2, -8.0, 11.2, -8.0, 3.0, '#8a7894', { trim: '#c8b6d8' });
    addRailing(-11.2, -20.0, -11.2, -8.0, 3.0, '#8a7894', { trim: '#c8b6d8' });
    addRailing(11.2, -20.0, 11.2, -8.0, 3.0, '#8a7894', { trim: '#c8b6d8' });
    addRailing(-11.2, -20.0, 11.2, -20.0, 3.0, '#8a7894', { trim: '#c8b6d8' });

    // stairs rising from the forecourt to the top terrace
    for (var st = 0; st < 12; st++) {
      box(0, st * 0.25, -3.0 - st * 0.42, 12.2, 0.25, 0.44, '#75657f', { top: '#9a87a6', k: 0.92 });
    }
    // sloped balustrade wedges
    [-1, 1].forEach(function (side) {
      var bx = side * 6.3;
      addPoly([
        [bx, 0, -2.6], [bx, 0, -8.0], [bx, 0.95, -8.0], [bx, 0.95, -2.6]
      ], '#5c4c64', side > 0 ? 0.72 : 0.9);
      addPoly([
        [bx, 3.0, -8.0], [bx, 3.0, -7.4], [bx, 3.55, -7.4], [bx, 3.55, -8.0]
      ], '#75657f', 0.9);
      addLine([bx, 0.95, -2.6], [bx, 3.55, -7.9], '#d8c8dc', 0.08, 0.8);
      for (var k = 0; k < 7; k++) {
        var t = k / 6;
        var zz = lerp(-2.6, -7.9, t);
        var yy = lerp(0.95, 3.55, t);
        box(bx, yy, zz, 0.16, 0.55, 0.16, '#8a7894', { k: 0.95 });
      }
    });
    // central carved ramp
    addPoly([
      [-1.6, 0.02, -2.4], [1.6, 0.02, -2.4], [1.6, 3.04, -7.8], [-1.6, 3.04, -7.8]
    ], '#5c4c64', 1.0);
    for (var i = 0; i < 8; i++) {
      addLine([-1.2, 0.2 + i * 0.38, -2.7 - i * 0.66], [1.2, 0.2 + i * 0.38, -2.7 - i * 0.66], '#d8b06a', 0.04, 0.35);
    }

    // main hall body
    box(cx, 3.0, cz, 18, 5.8, 10, '#cbb78f', { top: '#a89470', front: '#d6c29a', side: '#bfa980', back: '#aa966d', k: 1.0, warm: 0.03 });
    // dark timber base band
    box(cx, 3.0, cz, 18.4, 0.6, 10.4, '#4a221e', { top: '#6a3028', k: 0.9 });
    // columns
    for (var c = -3; c <= 3; c++) {
      if (c === 0) continue;
      var colX = c * 2.9;
      cylinder(colX, -8.88, 3.6, 8.5, 0.28, 8, '#8f1d2c', { k: 1.0, cap: false });
      cylinder(colX, -8.88, 3.5, 3.75, 0.42, 8, '#e0aa55', { k: 1.1, cap: false });
      cylinder(colX, -8.88, 8.35, 8.6, 0.42, 8, '#e0aa55', { k: 1.1, cap: false });
    }
    // front doors
    for (var d = -2; d <= 2; d++) {
      var dx = d * 2.0;
      addPoly([
        [dx - 0.8, 3.65, -8.94], [dx + 0.8, 3.65, -8.94],
        [dx + 0.8, 7.4, -8.94], [dx - 0.8, 7.4, -8.94]
      ], d === 0 ? '#2a100e' : '#381713', 0.9);
      // gold frame
      addLine([dx - 0.82, 3.62, -8.90], [dx + 0.82, 3.62, -8.90], '#d8a85a', 0.035, 0.8);
      addLine([dx - 0.82, 7.42, -8.90], [dx + 0.82, 7.42, -8.90], '#d8a85a', 0.035, 0.8);
      addLine([dx - 0.82, 3.62, -8.90], [dx - 0.82, 7.42, -8.90], '#d8a85a', 0.035, 0.8);
      addLine([dx + 0.82, 3.62, -8.90], [dx + 0.82, 7.42, -8.90], '#d8a85a', 0.035, 0.8);
      // lattice
      for (var l = 0; l < 4; l++) {
        addLine([dx - 0.7, 4.0 + l * 0.75, -8.92], [dx + 0.7, 4.0 + l * 0.75, -8.92], '#d8a85a', 0.025, 0.38);
      }
      addLine([dx, 3.7, -8.92], [dx, 7.3, -8.92], '#d8a85a', 0.028, 0.42);
      // gold studs
      for (var sd = 0; sd < 3; sd++) {
        addLine([dx - 0.5, 4.4 + sd * 1.1, -8.91], [dx + 0.5, 4.4 + sd * 1.1, -8.91], '#e8c06a', 0.05, 0.7);
      }
    }
    // gold plaques
    addPlaque(0, 8.05, -8.84, 4.4, 1.15, '凌霄殿', { col: '#ffcf6b' });
    addLantern(-8.2, 8.05, -8.6, 0.32);
    addLantern(8.2, 8.05, -8.6, 0.32);
    addLantern(-4.5, 8.05, -8.6, 0.26);
    addLantern(4.5, 8.05, -8.6, 0.26);

    // red lintel and gold trim above the doors
    box(cx, 7.55, -8.9, 18.2, 0.32, 0.22, '#7a1724', { top: '#95202e', k: 1.0 });
    addLine([-9.0, 7.75, -8.78], [9.0, 7.75, -8.78], '#e0aa55', 0.055, 0.85);
    // lower side windows
    [-7.55, 7.55].forEach(function (wx) {
      addWindow(wx, 5.55, -8.9, 1.0, 1.45, { axis: 'z' });
    });

    // lower sweeping roof
    addRoof(cx, cz, 8.55, 24, 15.5, 2.0, 1.2, '#256861', {
      ridge: 'x', us: 6, ts: 2, trim: '#e8b85f', k: 1.05
    });
    // roof ridge beasts
    for (var rb = -3; rb <= 3; rb++) {
      if (rb === 0) continue;
      box(rb * 1.4, 10.55, cz, 0.18, 0.36, 0.18, '#e8b85f', { k: 1.2 });
    }
    // upper storey
    box(cx, 9.35, cz, 13, 3.6, 7.4, '#d2bd94', { top: '#b8a37a', front: '#dcc79f', side: '#c4af85', back: '#b49f76', k: 1.0, warm: 0.04 });
    box(cx, 9.35, cz, 13.4, 0.45, 7.8, '#7a1724', { top: '#95202e', k: 0.95 });
    // upper columns and beams
    [-6.0, -3.3, 3.3, 6.0].forEach(function (ux) {
      cylinder(ux, -10.15, 9.5, 12.85, 0.17, 7, '#8f1d2c', { k: 1.0, cap: false });
      cylinder(ux, -10.15, 12.55, 12.82, 0.23, 7, '#e0aa55', { k: 1.1, cap: false });
    });
    box(cx, 10.0, -10.18, 13.2, 0.18, 0.16, '#7a1724', { k: 1.0 });
    addLine([-6.5, 10.2, -10.12], [6.5, 10.2, -10.12], '#e0aa55', 0.04, 0.75);
    addLine([-6.6, 12.8, -10.12], [6.6, 12.8, -10.12], '#e0aa55', 0.05, 0.8);

    // upper windows
    for (var uw = -2; uw <= 2; uw++) {
      addWindow(uw * 2.2, 11.1, -10.28, 1.15, 1.25, { axis: 'z' });
      addLine([uw * 2.2 - 0.6, 11.1, -10.23], [uw * 2.2 + 0.6, 11.1, -10.23], '#d8a85a', 0.03, 0.5);
      addLine([uw * 2.2, 10.5, -10.23], [uw * 2.2, 11.7, -10.23], '#d8a85a', 0.03, 0.5);
    }
    // upper roof
    addRoof(cx, cz, 12.95, 18, 11.5, 2.3, 1.3, '#256861', {
      ridge: 'x', us: 6, ts: 2, trim: '#e8b85f', k: 1.08
    });
    for (var rb2 = -2; rb2 <= 2; rb2++) {
      box(rb2 * 1.5, 15.15, cz, 0.2, 0.42, 0.2, '#e8b85f', { k: 1.25 });
    }
    // ridge finials
    box(-9, 15.0, cz, 0.32, 0.75, 0.32, '#e8b85f', { k: 1.25 });
    box(9, 15.0, cz, 0.32, 0.75, 0.32, '#e8b85f', { k: 1.25 });

    // side wings
    [-1, 1].forEach(function (side) {
      var wx = side * 10.15;
      box(wx, 3.0, -14.0, 2.0, 2.7, 8.0, '#d9c8a3', { top: '#b8a47c', k: 0.98 });
      [-0.62, 0.62].forEach(function (off) {
        cylinder(wx + off, -9.94, 3.3, 5.6, 0.18, 7, '#8f1d2c', { cap: false });
      });
      addRoof(wx, -14.0, 5.6, 9.0, 3.2, 1.15, 0.55, '#2a6a62', { ridge: 'z', us: 3, ts: 1, trim: '#e8b85f' });
      addLantern(wx, 5.2, -9.7, 0.20);
    });

    // terrace guards / lions
    addLion(-7.2, -0.2, 1.0, 0.72);
    addLion(7.2, -0.2, 1.0, 0.72);

    // incense burner
    cylinder(0, -0.8, 0, 0.7, 0.7, 8, '#6a5a3a', { k: 1.0, top: '#a88a4a', cap: true });
    cylinder(0, -0.8, 0.7, 1.0, 0.5, 8, '#8a7a4a', { k: 1.1, top: '#c9a85a' });
    for (var leg = 0; leg < 3; leg++) {
      var la = leg / 3 * TAU;
      cylinder(Math.cos(la) * 0.55, -0.8 + Math.sin(la) * 0.55, 0, 0.25, 0.08, 5, '#4a3a2a');
    }
  }

  function buildPagoda() {
    var cx = -24, cz = -8;
    // stone platform
    cylinder(cx, cz, 0, 1.1, 6.2, 8, '#5f5068', { top: '#887894', k: 0.95 });
    cylinder(cx, cz, 1.1, 1.45, 5.2, 8, '#6f6078', { top: '#9c8ca8', k: 0.95 });
    // steps at the base
    addStairs(cx, cz + 5.4, 3.0, 4, 0.18, 0.32, '#6f6078', { top: '#9c8ca8' });

    for (var i = 0; i < 7; i++) {
      var r = 4.2 - i * 0.34;
      var baseY = 1.45 + i * 2.85;
      var bodyH = 1.95;
      // body
      cylinder(cx, cz, baseY, baseY + bodyH, r, 8, i % 2 ? '#8f4a32' : '#7f3e2a', {
        k: 0.95, cap: false, top: '#e0b070'
      });
      // red columns / cream panels around the octagon
      for (var s = 0; s < 8; s++) {
        var a = s / 8 * TAU + Math.PI / 8;
        var px = cx + Math.cos(a) * (r + 0.02);
        var pz = cz + Math.sin(a) * (r + 0.02);
        var nx = Math.cos(a), nz = Math.sin(a);
        var tx = -nz, tz = nx;
        var w = r * 0.42;
        addPoly([
          [px + tx * w, baseY + 0.25, pz + tz * w],
          [px - tx * w, baseY + 0.25, pz - tz * w],
          [px - tx * w, baseY + bodyH - 0.25, pz - tz * w],
          [px + tx * w, baseY + bodyH - 0.25, pz + tz * w]
        ], '#a86442', 0.75 + 0.18 * Math.max(0, -nz));
        // lattice window
        if (s % 2 === 0 && i > 0) {
          addWindow(px + nx * 0.02, baseY + 1.0, pz + nz * 0.02, 0.55, 0.8, { axis: 'x' });
        }
      }
      // balcony
      cylinder(cx, cz, baseY + bodyH, baseY + bodyH + 0.16, r + 0.9, 8, '#6b4a38', { top: '#8a6248' });
      for (var p = 0; p < 8; p++) {
        var pa = p / 8 * TAU + Math.PI / 8;
        var bx = cx + Math.cos(pa) * (r + 0.78);
        var bz = cz + Math.sin(pa) * (r + 0.78);
        box(bx, baseY + bodyH + 0.16, bz, 0.08, 0.55, 0.08, '#8a6248');
      }
      // tier roof
      addTierRoof(cx, cz, baseY + bodyH + 0.1, r + 0.25, r + 1.7, 0.62, 8, 0.42, '#2a6f66', {
        trim: '#e8b85f', k: 1.02
      });
      // bells at the four cardinal corners
      for (var bell = 0; bell < 2; bell++) {
        var ba = bell / 2 * TAU + Math.PI / 8;
        addLantern(cx + Math.cos(ba) * (r + 1.5), baseY + bodyH + 0.25, cz + Math.sin(ba) * (r + 1.5), 0.07, {
          col: '#d8b06a', glow: '#ffd98a', sway: 0.5
        });
      }
    }
    // spire
    var topY = 1.45 + 7 * 2.85;
    cylinder(cx, cz, topY, topY + 0.8, 0.55, 8, '#7a5a2a', { k: 1.05, top: '#c9a85a' });
    cone(cx, cz, topY + 0.8, topY + 3.2, 0.42, 8, '#e8b85f', { k: 1.2 });
    for (var ring = 0; ring < 4; ring++) {
      cylinder(cx, cz, topY + 0.9 + ring * 0.45, topY + 1.0 + ring * 0.45, 0.55 - ring * 0.08, 8, '#ffd98a', { k: 1.2 });
    }
    addLantern(cx, topY + 2.9, cz, 0.22, { col: '#ffdf9a', glow: '#ffe9b0', sway: 0.2 });
  }

  function buildGate() {
    var z = 27;
    var cols = [-7.6, -2.8, 2.8, 7.6];
    var heights = [9.6, 8.6, 8.6, 9.6];
    cols.forEach(function (x, i) {
      cylinder(x, z, 0, heights[i], 0.38, 8, '#a8262f', { k: 1.0, cap: false });
      cylinder(x, z, 0, 0.45, 0.55, 8, '#e8b85f', { k: 1.1 });
      cylinder(x, z, heights[i] - 0.35, heights[i], 0.55, 8, '#e8b85f', { k: 1.1 });
    });
    // cross beams
    box(0, 7.3, z, 16.5, 0.5, 0.7, '#8f1d2c', { k: 1.0, top: '#b02a38' });
    box(0, 8.4, z, 16.5, 0.4, 0.65, '#8f1d2c', { k: 1.0, top: '#b02a38' });
    box(-5.2, 6.4, z, 5.0, 0.35, 0.6, '#8f1d2c', { k: 0.95 });
    box(5.2, 6.4, z, 5.0, 0.35, 0.6, '#8f1d2c', { k: 0.95 });
    // roofs
    addRoof(0, z, 9.0, 8.6, 4.2, 1.6, 0.85, '#26635d', { ridge: 'x', us: 4, ts: 1, trim: '#e8b85f' });
    addRoof(-5.6, z, 8.0, 5.2, 3.2, 1.2, 0.65, '#2a6a62', { ridge: 'x', us: 3, ts: 1, trim: '#e8b85f' });
    addRoof(5.6, z, 8.0, 5.2, 3.2, 1.2, 0.65, '#2a6a62', { ridge: 'x', us: 3, ts: 1, trim: '#e8b85f' });
    // plaque
    addPlaque(0, 7.85, z + 0.42, 3.4, 0.9, '月玉镇', { col: '#ffcf6b' });
    // lanterns
    addLantern(-4.2, 6.6, z - 0.2, 0.32);
    addLantern(4.2, 6.6, z - 0.2, 0.32);
    addLantern(-6.8, 5.6, z - 0.2, 0.24);
    addLantern(6.8, 5.6, z - 0.2, 0.24);
    // stone lions
    addLion(-9.0, z + 0.6, 1.2, 0.85);
    addLion(9.0, z + 0.6, 1.2, 0.85);
    // flanking walls
    [-1, 1].forEach(function (side) {
      box(side * 21, 0, z, 24, 4.2, 1.2, '#5a4a5e', { top: '#7a6a7e', k: 0.9 });
      for (var i = 0; i < 8; i++) {
        box(side * (11 + i * 2.7), 4.2, z, 1.2, 0.7, 1.4, '#6a5a6e', { top: '#8a7a8e' });
      }
    });
  }

  function buildBellTower() {
    var x = 23, z = -7;
    box(x, 0, z, 7, 0.8, 7, '#5f5068', { top: '#887894' });
    box(x, 0.8, z, 5.2, 5.2, 5.2, '#c9b58f', { top: '#a99470', k: 0.95 });
    cylinder(x, z, 5.6, 7.6, 2.2, 8, '#8a6248', { k: 0.9, cap: false });
    addRoof(x, z, 7.6, 8.2, 7.4, 1.9, 0.9, '#26635d', { ridge: 'x', us: 4, ts: 1, trim: '#e8b85f' });
    addLantern(x, 5.2, z - 2.4, 0.26);
    addLantern(x - 1.6, 6.2, z - 1.8, 0.2);
    // bell
    cone(x, z, 5.0, 6.2, 0.6, 8, '#7a6a3a', { k: 1.1 });
  }

  function buildStreet() {
    var features = [
      { x: -10.4, z: 11.2, w: 6.2, d: 5.4, h: 5.0, side: 1, sign: '茶', awn: true, roof: '#26635d' },
      { x: -10.8, z: 16.6, w: 7.2, d: 6.0, h: 6.0, side: 1, sign: '酒', balcony: true, roof: '#2a5a60' },
      { x: -10.2, z: 22.0, w: 6.0, d: 5.2, h: 4.8, side: 1, sign: '面', roof: '#2f5360' },
      { x: 10.4, z: 11.4, w: 6.4, d: 5.4, h: 5.2, side: -1, sign: '灯', awn: true, roof: '#2a6a62' },
      { x: 10.8, z: 16.8, w: 7.0, d: 6.0, h: 5.8, side: -1, sign: '药', balcony: true, roof: '#295a58' },
      { x: 10.2, z: 22.2, w: 6.0, d: 5.2, h: 4.9, side: -1, sign: '书', roof: '#315260' }
    ];
    features.forEach(function (f, i) {
      buildHouse(f.x, f.z, f.w, f.d, f.h, f.side, {
        sign: f.sign, awn: f.awn, balcony: f.balcony, tone: i % 2, roof: f.roof
      });
    });

    // a few larger background houses behind the shops
    var bg = [
      [-19, 10.5, 7, 6, 6.4, 1], [-21, 17.5, 8, 6.5, 7.0, 1], [-19.5, 24.0, 7, 6, 6.2, 1],
      [19, 10.5, 7, 6, 6.4, -1], [21, 17.5, 8, 6.5, 7.2, -1], [19.5, 24.0, 7, 6, 6.2, -1]
    ];
    bg.forEach(function (b, i) {
      buildHouse(b[0], b[1], b[2], b[3], b[4], b[5], { simple: true, tone: i % 2 });
    });

    // market stalls under red umbrellas
    addMarketStall(-6.0, 15.2, 1);
    addMarketStall(5.8, 12.0, -1);
    addMarketStall(6.2, 18.2, -1);
    addStoneLantern(-3.6, 18.5, 1.0);
    addStoneLantern(3.6, 18.5, 1.0);
    addStoneLantern(-3.9, 11.8, 0.86);
    addStoneLantern(3.9, 11.8, 0.86);

    // benches / stone seats
    [-3.6, 3.6].forEach(function (x) {
      [13.2, 18.4, 21.2].forEach(function (z) {
        box(x, 0, z, 0.9, 0.35, 1.6, '#5a4a62', { top: '#8b7894' });
      });
    });
  }

  function buildHouse(x, z, w, d, h, side, opts) {
    opts = opts || {};
    var tone = opts.tone || 0;
    var wall = opts.simple ? '#b9a88a' : (tone ? '#d6c19a' : '#cdb88f');
    var wood = '#4a2a22';
    // body
    box(x, 0, z, w, h, d, wall, { top: '#a89470', front: '#e0cdA8', side: '#c8b48d', back: '#b09c78', k: 0.96, warm: 0.02 });
    // timber base
    box(x, 0, z, w + 0.15, 0.55, d + 0.15, '#3e2420', { top: '#5a342a', k: 0.9 });
    // corner posts
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (c) {
      box(x + c[0] * (w / 2 - 0.12), 0.3, z + c[1] * (d / 2 - 0.12), 0.22, h - 0.2, 0.22, wood, { k: 0.85 });
    });
    // horizontal beam
    box(x, h * 0.55, z, w + 0.2, 0.22, d + 0.2, wood, { k: 0.9 });
    // roof
    var roofH = opts.simple ? 1.4 : 1.8;
    addRoof(x, z, h, d + 1.1, w + 1.3, roofH, 0.55, opts.roof || (tone ? '#295a58' : '#26635d'), {
      ridge: 'z', gable: true, us: 4, ts: 1, trim: '#c9a85a', wall: wall, k: 0.98
    });
    if (opts.simple) {
      // simple lit window on the street side
      var sx = x + side * (w / 2 + 0.02);
      addWindow(sx, h * 0.55, z, 1.0, 1.0, { axis: 'x' });
      if (seedRng((x * 13 + z * 7) | 0)() > 0.4) addLantern(sx + side * 0.3, h * 0.75, z + 1.2, 0.18);
      return;
    }
    var fx = x + side * (w / 2 + 0.02);
    // door
    var doorZ = z - d * 0.18;
    addPoly([
      [fx, 0.4, doorZ - 0.75], [fx, 0.4, doorZ + 0.75],
      [fx, 2.5, doorZ + 0.75], [fx, 2.5, doorZ - 0.75]
    ], '#3a1e18', 0.95);
    addLine([fx + side * 0.01, 0.4, doorZ], [fx + side * 0.01, 2.5, doorZ], '#d8a85a', 0.04, 0.55);
    // windows
    addWindow(fx, h * 0.56, z + d * 0.22, 1.3, 1.2, { axis: 'x' });
    addWindow(fx, h * 0.56, z - d * 0.28, 1.1, 1.1, { axis: 'x' });
    // upper windows
    addWindow(fx, h * 0.82, z + d * 0.12, 1.0, 0.9, { axis: 'x' });
    // lattice
    [z + d * 0.22, z - d * 0.28].forEach(function (wz) {
      for (var l = 0; l < 3; l++) {
        addLine([fx + side * 0.015, h * 0.56 - 0.5 + l * 0.45, wz - 0.6], [fx + side * 0.015, h * 0.56 - 0.5 + l * 0.45, wz + 0.6], '#d8a85a', 0.025, 0.38);
      }
      addLine([fx + side * 0.015, h * 0.56 - 0.55, wz], [fx + side * 0.015, h * 0.56 + 0.55, wz], '#d8a85a', 0.025, 0.38);
    });
    // signboard
    S.signs.push({
      x: fx + side * 0.25, y: h * 0.5, z: z + d * 0.32,
      text: opts.sign || '灯', side: side,
      phase: rnd(0, TAU)
    });
    // awning
    if (opts.awn) {
      for (var a = 0; a < 3; a++) {
        var ax0 = x + side * (w / 2), ax1 = x + side * (w / 2 + 1.8);
        var az0 = z - d * 0.3 + a * 0.75, az1 = az0 + 0.75;
        addPoly([
          [ax0, 3.2, az0], [ax0, 3.2, az1], [ax1, 2.8, az1], [ax1, 2.8, az0]
        ], a % 2 ? '#8f1d2c' : '#e0cdA8', 0.95);
      }
      addLine([x + side * (w / 2 + 1.8), 2.8, z - d * 0.3], [x + side * (w / 2 + 1.8), 2.8, z - d * 0.3 + 2.25], '#e8b85f', 0.05, 0.7);
    }
    // balcony
    if (opts.balcony) {
      var by = h * 0.62;
      box(x + side * (w / 2 + 0.8), by, z, 1.8, 0.18, d * 0.75, '#5a3a2a', { top: '#8a6248' });
      addRailing(x + side * (w / 2 + 1.6), z - d * 0.36, x + side * (w / 2 + 1.6), z + d * 0.36, by + 0.18, '#7a4a38', { trim: '#c9a85a' });
      addLantern(x + side * (w / 2 + 1.5), by + 1.1, z - d * 0.3, 0.22);
      addLantern(x + side * (w / 2 + 1.5), by + 1.1, z + d * 0.3, 0.22);
    } else {
      addLantern(fx + side * 0.32, h * 0.72, z + d * 0.42, 0.25);
      addLantern(fx + side * 0.32, h * 0.72, z - d * 0.42, 0.22);
    }
  }

  function buildBridge() {
    var z0 = 1.2, z1 = 8.2, x = 0, w = 5.2, arch = 2.35;
    var seg = 12;
    var deck = [];
    for (var i = 0; i <= seg; i++) {
      var t = i / seg;
      var z = lerp(z0, z1, t);
      var y = arch * Math.sin(Math.PI * t);
      deck.push({ z: z, y: y });
    }
    for (var j = 0; j < seg; j++) {
      var a = deck[j], b = deck[j + 1];
      // deck surface
      addPoly([
        [-w / 2, a.y + 0.12, a.z], [w / 2, a.y + 0.12, a.z],
        [w / 2, b.y + 0.12, b.z], [-w / 2, b.y + 0.12, b.z]
      ], '#8f7f98', 0.96, { top: '#b5a4bd' });
      // side walls
      [-1, 1].forEach(function (side) {
        addPoly([
          [side * w / 2, -0.2, a.z], [side * w / 2, -0.2, b.z],
          [side * w / 2, b.y + 0.12, b.z], [side * w / 2, a.y + 0.12, a.z]
        ], '#6f6078', 0.8, { top: '#9c8ca8' });
      });
      // underside arch
      addPoly([
        [-w / 2, a.y - 0.25, a.z], [w / 2, a.y - 0.25, a.z],
        [w / 2, b.y - 0.25, b.z], [-w / 2, b.y - 0.25, b.z]
      ], '#4a3e52', 0.6);
    }
    // stone arch openings, cut into the side walls as deep shadow
    [-1, 1].forEach(function (side) {
      var ax = side * (w / 2 + 0.018);
      var zA = 2.9, zB = 6.4, base = -0.12, spring = 0.55, rise = 0.96;
      var pts = [[ax, base, zA], [ax, base, zB], [ax, spring, zB]];
      for (var k = 1; k <= 12; k++) {
        var t = k / 12;
        pts.push([ax, spring + Math.sin(t * Math.PI) * rise, lerp(zB, zA, t)]);
      }
      pts.push([ax, spring, zA]);
      addPoly(pts, '#0c0915', 0.9);
      // a worn gilded rim around the arch
      for (var k2 = 0; k2 < 12; k2++) {
        var ta = k2 / 12, tb = (k2 + 1) / 12;
        addLine(
          [ax, spring + Math.sin(ta * Math.PI) * rise, lerp(zB, zA, ta)],
          [ax, spring + Math.sin(tb * Math.PI) * rise, lerp(zB, zA, tb)],
          '#d6b478', 0.035, 0.5
        );
      }
      addLine([ax, base, zA], [ax, spring, zA], '#b99662', 0.032, 0.42);
      addLine([ax, base, zB], [ax, spring, zB], '#b99662', 0.032, 0.42);
      // keystone
      addPoly([
        [ax + 0.01, spring + rise - 0.02, 4.55], [ax + 0.01, spring + rise + 0.16, 4.65],
        [ax + 0.01, spring + rise - 0.02, 4.75], [ax + 0.01, spring + rise - 0.12, 4.65]
      ], '#e8c987', 1.05, { e: true, glow: 0.25 });
    });

    // railings
    [-1, 1].forEach(function (side) {
      var px = side * (w / 2 - 0.12);
      for (var k = 0; k <= seg; k += 2) {
        var t2 = k / seg;
        var z3 = lerp(z0, z1, t2);
        var y3 = arch * Math.sin(Math.PI * t2);
        box(px, y3 + 0.12, z3, 0.12, 0.75, 0.12, '#a897b0', { k: 0.95 });
      }
      for (var k2 = 0; k2 < seg; k2 += 2) {
        var ta = k2 / seg, tb = Math.min(1, (k2 + 2) / seg);
        var za = lerp(z0, z1, ta), zb = lerp(z0, z1, tb);
        var ya = arch * Math.sin(Math.PI * ta), yb = arch * Math.sin(Math.PI * tb);
        addLine([px, ya + 0.86, za], [px, yb + 0.86, zb], '#d8c8dc', 0.06, 0.8);
      }
    });
    // bridge lanterns
    addLantern(-2.9, 1.1, 1.6, 0.24);
    addLantern(2.9, 1.1, 1.6, 0.24);
    addLantern(-2.9, 1.1, 7.8, 0.24);
    addLantern(2.9, 1.1, 7.8, 0.24);
    // central stone medallion
    addPoly([
      [-0.8, arch + 0.13, 4.2], [0.8, arch + 0.13, 4.2],
      [0.8, arch + 0.13, 5.0], [-0.8, arch + 0.13, 5.0]
    ], '#6f6078', 1.1);
  }

  function buildCityWalls() {
    var zs = [18, 8, -4, -16];
    [-1, 1].forEach(function (side) {
      var x = side * 33;
      // long wall
      box(x, 0, 2, 1.4, 4.6, 54, '#4f4054', { top: '#6f5f74', k: 0.86 });
      for (var i = 0; i < 12; i++) {
        box(x, 4.6, -22 + i * 4.4, 1.2, 0.7, 1.3, '#5f4f64', { top: '#7f6f84' });
      }
      // towers
      [-15, 7, 26].forEach(function (z) {
        box(x, 0, z, 4.2, 7.0, 4.2, '#5a4a5e', { top: '#7a6a7e', k: 0.9 });
        addRoof(x, z, 7.0, 6.2, 5.6, 1.7, 0.8, '#26635d', { ridge: 'z', us: 3, ts: 1, trim: '#c9a85a' });
        addLantern(x + side * 2.4, 5.2, z, 0.22);
      });
    });
    // rear wall / gate behind the palace
    box(0, 0, -30, 30, 4.0, 1.2, '#4f4054', { top: '#6f5f74', k: 0.84 });
    for (var i2 = -4; i2 <= 4; i2++) {
      box(i2 * 3.4, 4.0, -30, 1.3, 0.6, 1.3, '#5f4f64');
    }
    box(0, 0, -31, 8, 7.0, 3.0, '#5a4a5e', { top: '#7a6a7e' });
    addRoof(0, -31, 7.0, 10, 7.2, 1.8, 0.8, '#26635d', { ridge: 'z', us: 3, ts: 1, trim: '#c9a85a' });
  }

  function buildBackgroundTown() {
    var rng = seedRng(123);
    for (var i = 0; i < 10; i++) {
      var side = i % 2 ? 1 : -1;
      var x = side * (17 + rng() * 12);
      var z = -18 + rng() * 42;
      if (Math.abs(x) < 16) continue;
      var w = 4 + rng() * 4;
      var d = 4 + rng() * 4;
      var h = 3.5 + rng() * 3.5;
      box(x, 0, z, w, h, d, '#9f8e74', { top: '#7f6e58', k: 0.8 });
      addRoof(x, z, h, d + 1.2, w + 1.4, 1.2, 0.45, pick(['#1b4a49', '#2f5360', '#3a4a58', '#243f52', '#4a3e4a']), { ridge: 'z', us: 3, ts: 1, trim: '#a8884a', k: 0.8, lines: false, tiles: false });
      if (rng() > 0.7) addLantern(x, h * 0.7, z + d / 2 + 0.3, 0.16);
    }
    // distant rooftop silhouettes behind the palace
    for (var j = 0; j < 6; j++) {
      var bx = -30 + j * 8 + rng() * 3;
      var bz = -34 - rng() * 8;
      box(bx, 0, bz, 5, 4 + rng() * 3, 4, '#3a2c42', { top: '#2a1f32', k: 0.6 });
      addRoof(bx, bz, 4.5, 6, 5, 1.2, 0.4, '#17383a', { ridge: 'z', us: 3, ts: 1, k: 0.6, lines: false });
    }
  }

  function addStoneLantern(x, z, s) {
    // soft pool of shade beneath the lantern
    var sh = [];
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * TAU;
      sh.push([x + Math.cos(a) * 1.15 * s, 0.022, z + Math.sin(a) * 0.72 * s]);
    }
    addPoly(sh, '#0b0713', 0.42);
    box(x, 0, z, 0.9 * s, 0.18 * s, 0.9 * s, '#5a4a62', { top: '#8b7894' });
    box(x, 0.18 * s, z, 0.32 * s, 1.1 * s, 0.32 * s, '#6a5a6e', { top: '#8b7894' });
    box(x, 1.28 * s, z, 0.82 * s, 0.16 * s, 0.82 * s, '#5a4a62', { top: '#8b7894' });
    box(x, 1.44 * s, z, 0.52 * s, 0.46 * s, 0.52 * s, '#8b7894', { top: '#a99470', e: true, glow: 0.55 });
    cone(x, z, 1.90 * s, 2.20 * s, 0.70 * s, 4, '#4f4458', { k: 0.9 });
    addLantern(x, 1.67 * s, z, 0.12 * s);
  }

  function addTree(x, z, kind, s) {
    S.trees.push({ x: x, z: z, kind: kind, s: s, phase: rnd(0, TAU) });
    var trunkH = (kind === 'willow' ? 2.2 : 2.6) * s;
    cylinder(x, z, 0, trunkH, 0.16 * s, 6, '#3a2a2a', { k: 0.85, cap: false });
    // branches
    var rng = seedRng((x * 100 + z * 7) | 0);
    for (var i = 0; i < 4; i++) {
      var a = rng() * TAU;
      addLine([x, trunkH * (0.65 + rng() * 0.3), z],
        [x + Math.cos(a) * s * 1.2, trunkH + s * (0.6 + rng() * 0.6), z + Math.sin(a) * s * 1.2],
        '#3a2a2a', 0.08 * s, 0.9);
    }
    // for willow, drooping lines
    if (kind === 'willow') {
      for (var w = 0; w < 8; w++) {
        var wa = (w / 8) * TAU + rng() * 0.3;
        var wr = s * (1.6 + rng() * 0.9);
        addLine([x + Math.cos(wa) * wr, trunkH + s * 0.8, z + Math.sin(wa) * wr],
          [x + Math.cos(wa) * (wr + 0.4), 0.4, z + Math.sin(wa) * (wr + 0.4)],
          '#4d7a4a', 0.035, 0.5);
      }
    }
  }

  function addLanternString(z, y, x0, x1, count) {
    // catenary wire
    var prev = null;
    for (var i = 0; i <= 12; i++) {
      var t = i / 12;
      var x = lerp(x0, x1, t);
      var yy = y - Math.sin(t * Math.PI) * 0.7;
      if (prev) addLine(prev, [x, yy, z], '#5a4a3a', 0.025, 0.7);
      prev = [x, yy, z];
    }
    for (var l = 0; l < count; l++) {
      var tt = (l + 0.5) / count;
      var lx = lerp(x0, x1, tt);
      var ly = y - Math.sin(tt * Math.PI) * 0.7 - 0.28;
      addLantern(lx, ly, z, 0.19 + (l % 2) * 0.02, { sway: 0.8 });
    }
  }

  function addLion(x, z, s, scale) {
    // pedestal
    box(x, 0, z, 1.5 * s, 1.0 * s, 1.5 * s, '#6c5c74', { top: '#9b8aa4', k: 0.95 });
    S.lions = S.lions || [];
    S.lions.push({ x: x, y: 1.0 * s, z: z, s: scale || s, phase: rnd(0, TAU) });
  }

  function addMarketStall(x, z, side) {
    box(x, 0, z, 2.0, 0.8, 1.4, '#5a3a2a', { top: '#8a6248' });
    // umbrella
    var topY = 3.0;
    for (var i = 0; i < 8; i++) {
      var a0 = i / 8 * TAU, a1 = (i + 1) / 8 * TAU;
      addPoly([
        [x, topY, z],
        [x + Math.cos(a0) * 1.8, 2.2, z + Math.sin(a0) * 1.8],
        [x + Math.cos(a1) * 1.8, 2.2, z + Math.sin(a1) * 1.8]
      ], i % 2 ? '#a8262f' : '#e0cdA8', 0.95);
    }
    cylinder(x, z, 0, topY, 0.05, 5, '#6a4a2a');
    addLantern(x + side * 0.6, 2.2, z + 0.8, 0.14);
  }

  function makePersonState(i) {
    var paths = [
      { x1: -3.4, z1: 9.5, x2: 3.2, z2: 24.5, speed: 0.45 },
      { x1: 3.8, z1: 24, x2: -2.8, z2: 10, speed: 0.38 },
      { x1: -2.2, z1: 2.4, x2: 2.2, z2: 8.0, speed: 0.5 },
      { x1: 4.0, z1: 18, x2: -4.0, z2: 13, speed: 0.32 },
      { x1: -2.0, z1: 5.2, x2: 2.0, z2: 5.2, speed: 0.3 },
      { x1: 8.8, z1: 9.2, x2: 1.2, z2: 13.5, speed: 0.28 },
      { x1: -8.8, z1: 9.2, x2: -1.2, z2: 13.5, speed: 0.28 },
      { x1: 0, z1: 2.2, x2: 0, z2: 7.8, speed: 0.42 },
      { x1: -2.5, z1: -3.2, x2: 2.5, z2: -3.2, speed: 0.18 }
    ];
    var p = paths[i % paths.length];
    return {
      x1: p.x1, z1: p.z1, x2: p.x2, z2: p.z2,
      speed: p.speed, t: rnd(0, 1), dir: Math.random() > 0.5 ? 1 : -1,
      kind: i === 3 ? 'lady' : i === 5 ? 'bearer' : i === 8 ? 'guard' : i % 3 === 0 ? 'scholar' : 'bearer',
      phase: rnd(0, TAU),
      bridge: i === 2 || i === 4 || i === 7
    };
  }

  function newPetal(tx, tz, spread) {
    return {
      x: tx + rnd(-spread, spread), y: rnd(2, 8),
      z: tz + rnd(-spread, spread),
      vy: rnd(0.15, 0.4), phase: rnd(0, TAU),
      rot: rnd(0, TAU), spin: rnd(-1, 1), r: rnd(0.035, 0.07),
      col: pick(['#ffb7c9', '#ffd6e0', '#ff8fab', '#ffe9ef'])
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Procedural sprites for the renderer                                */
  /* ------------------------------------------------------------------ */

  function makeLanternSprite(col) {
    var c = canvas2d(96, 128), g = c.getContext('2d');
    g.clearRect(0, 0, 96, 128);
    g.save();
    g.translate(48, 64);
    var grd = g.createRadialGradient(-9, -12, 2, 0, 0, 40);
    grd.addColorStop(0, '#fff6cf');
    grd.addColorStop(0.28, col);
    grd.addColorStop(1, '#6f120d');
    g.fillStyle = grd;
    g.beginPath(); g.ellipse(0, 0, 29, 39, 0, 0, TAU); g.fill();
    // vertical ribs
    g.strokeStyle = 'rgba(80,16,8,0.30)';
    g.lineWidth = 1.1;
    for (var i = -2; i <= 2; i++) {
      g.beginPath();
      g.ellipse(0, 0, Math.abs(i) === 2 ? 14 : (i === 0 ? 2 : 24), 39, 0, 0, TAU);
      g.stroke();
    }
    // horizontal bands
    g.strokeStyle = 'rgba(255,220,150,0.22)';
    g.lineWidth = 1;
    for (var j = -2; j <= 2; j++) {
      g.beginPath();
      g.ellipse(0, j * 12, 29 - Math.abs(j) * 2, 4.2, 0, 0, TAU);
      g.stroke();
    }
    // caps
    g.fillStyle = '#e8b85f';
    g.fillRect(-13, -45, 26, 7);
    g.fillRect(-13, 38, 26, 7);
    g.fillStyle = '#8a5a20';
    g.fillRect(-4, -51, 8, 7);
    // tassel
    g.strokeStyle = '#e8b85f';
    g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(0, 45); g.lineTo(0, 57); g.stroke();
    g.fillStyle = '#c1272d';
    g.beginPath(); g.moveTo(-4, 56); g.lineTo(0, 66); g.lineTo(4, 56); g.closePath(); g.fill();
    // highlight
    g.globalCompositeOperation = 'lighter';
    var hi = g.createRadialGradient(-10, -14, 1, -10, -14, 22);
    hi.addColorStop(0, 'rgba(255,255,230,0.5)');
    hi.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = hi;
    g.beginPath(); g.ellipse(-9, -12, 12, 18, -0.2, 0, TAU); g.fill();
    g.restore();
    return c;
  }

  function buildLanternSprites() {
    var cols = ['#ff6b3d', '#ff9fc0', '#ffcf6b', '#d8b06a', '#ffdf9a', '#a93a2a'];
    var out = {};
    cols.forEach(function (c) { out[c] = makeLanternSprite(c); });
    return out;
  }

  function makeCloudSprite() {
    var c = canvas2d(256, 96), g = c.getContext('2d');
    var rng = seedRng(303);
    for (var i = 0; i < 12; i++) {
      var x = 30 + rng() * 196, y = 46 + (rng() - 0.5) * 28;
      var r = 18 + rng() * 34;
      var grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(255,255,255,0.34)');
      grd.addColorStop(0.55, 'rgba(255,255,255,0.12)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    return c;
  }

  function makeWindowSprite() {
    var c = canvas2d(96, 128), g = c.getContext('2d');
    g.clearRect(0, 0, 96, 128);
    g.fillStyle = '#2a120e'; g.fillRect(0, 0, 96, 128);
    g.fillStyle = '#3b1a12'; g.fillRect(5, 5, 86, 118);
    g.strokeStyle = '#c9a86a'; g.lineWidth = 2.2; g.strokeRect(7, 7, 82, 114);
    var grd = g.createLinearGradient(0, 0, 96, 128);
    grd.addColorStop(0, '#ffe7b4');
    grd.addColorStop(0.48, '#f7b25f');
    grd.addColorStop(1, '#c85a28');
    g.fillStyle = grd; g.fillRect(13, 13, 70, 102);
    g.fillStyle = 'rgba(62,28,16,0.90)';
    g.fillRect(34, 13, 5, 102);
    g.fillRect(56, 13, 5, 102);
    g.fillRect(13, 41, 70, 4);
    g.fillRect(13, 73, 70, 4);
    g.fillRect(13, 105, 70, 4);
    g.strokeStyle = 'rgba(255,244,208,0.45)'; g.lineWidth = 1;
    g.strokeRect(13, 13, 70, 102);
    var hi = g.createRadialGradient(30, 30, 2, 30, 30, 30);
    hi.addColorStop(0, 'rgba(255,255,235,0.55)');
    hi.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = hi; g.fillRect(13, 13, 70, 102);
    return c;
  }

  function makeSkyLanternSprite() {
    var c = canvas2d(48, 64), g = c.getContext('2d');
    g.clearRect(0, 0, 48, 64);
    g.fillStyle = '#e8b85f'; g.fillRect(10, 4, 28, 5);
    var grd = g.createLinearGradient(0, 8, 0, 54);
    grd.addColorStop(0, '#ffd98a');
    grd.addColorStop(0.45, '#ff9a3c');
    grd.addColorStop(1, '#c8441a');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(13, 8); g.lineTo(35, 8);
    g.quadraticCurveTo(40, 28, 36, 50);
    g.quadraticCurveTo(24, 56, 12, 50);
    g.quadraticCurveTo(8, 28, 13, 8);
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,244,190,0.6)';
    g.beginPath(); g.ellipse(20, 24, 5, 9, -0.2, 0, TAU); g.fill();
    g.fillStyle = '#7a2a12'; g.fillRect(14, 51, 20, 4);
    g.strokeStyle = '#c9a86a'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(24, 55); g.lineTo(24, 61); g.stroke();
    return c;
  }

  function ensureRenderAssets() {
    if (A.lanterns) return;
    A.lanterns = buildLanternSprites();
    A.cloud = makeCloudSprite();
    A.window = makeWindowSprite();
    A.skyLantern = makeSkyLanternSprite();
  }

  /* ------------------------------------------------------------------ */
  /*  Camera                                                             */
  /* ------------------------------------------------------------------ */

  function copyCam(c) {
    return { tx: c.tx, ty: c.ty, tz: c.tz, yaw: c.yaw, pitch: c.pitch, dist: c.dist };
  }

  function flyTo(target, instant) {
    if (!target) return;
    S.fly = {
      t: 0,
      dur: instant ? 0.001 : 1.7,
      from: copyCam(S.cam),
      to: copyCam(target)
    };
    S.camTarget = copyCam(target);
    S.lastInput = S.time;
  }

  function updateCamera(dt) {
    if (S.firstPerson) { updateFirstPerson(dt); return; }
    var cam = S.cam, tgt = S.camTarget;
    if (S.fly) {
      var f = S.fly;
      f.t += dt / f.dur;
      var e = easeInOut(Math.min(1, f.t));
      cam.tx = lerp(f.from.tx, f.to.tx, e);
      cam.ty = lerp(f.from.ty, f.to.ty, e);
      cam.tz = lerp(f.from.tz, f.to.tz, e);
      cam.pitch = lerp(f.from.pitch, f.to.pitch, e);
      cam.dist = lerp(f.from.dist, f.to.dist, e);
      cam.yaw = f.from.yaw + angleDelta(f.from.yaw, f.to.yaw) * e;
      if (f.t >= 1) {
        cam.tx = f.to.tx; cam.ty = f.to.ty; cam.tz = f.to.tz;
        cam.yaw = f.to.yaw; cam.pitch = f.to.pitch; cam.dist = f.to.dist;
        S.fly = null;
        S.camTarget = copyCam(cam);
      }
    } else {
      if (S.auto && !S.tour && S.time - S.lastInput > 5.5) {
        cam.yaw += dt * 0.020;
        tgt.yaw = cam.yaw;
      }
      var k = 1 - Math.pow(0.0008, dt);
      cam.tx += (tgt.tx - cam.tx) * k;
      cam.ty += (tgt.ty - cam.ty) * k;
      cam.tz += (tgt.tz - cam.tz) * k;
      cam.pitch += (tgt.pitch - cam.pitch) * k;
      cam.dist += (tgt.dist - cam.dist) * k;
      cam.yaw += angleDelta(cam.yaw, tgt.yaw) * k;
    }
    cam.pitch = clamp(cam.pitch, 0.02, 0.95);
    cam.dist = clamp(cam.dist, 7, 72);
    cam.ty = clamp(cam.ty, -1, 22);
    cam.tz = clamp(cam.tz, -30, 34);
    updateView();
  }

  /* ------------------------------------------------------------------ */
  /*  Sky                                                                */
  /* ------------------------------------------------------------------ */

  function drawSky(pal) {
    var w = S.view.w, h = S.view.h;
    var horizon = clamp(S.view.horizon, h * 0.12, h * 0.96);
    var g = ctx.createLinearGradient(0, 0, 0, Math.max(1, horizon + 8));
    g.addColorStop(0, pal.skyTop);
    g.addColorStop(0.52, pal.skyMid);
    g.addColorStop(0.88, pal.skyLow);
    g.addColorStop(1, pal.haze);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, horizon + 10);

    // below the horizon, a deep haze that the ground plane will cover
    ctx.fillStyle = pal.fog;
    ctx.fillRect(0, horizon, w, h - horizon);

    // horizon bloom
    var hg = ctx.createRadialGradient(w * 0.5, horizon, 0, w * 0.5, horizon, w * 0.55);
    hg.addColorStop(0, rgba(pal.haze, 0.28));
    hg.addColorStop(0.45, rgba(pal.haze, 0.08));
    hg.addColorStop(1, rgba(pal.haze, 0));
    ctx.fillStyle = hg;
    ctx.fillRect(0, Math.max(0, horizon - h * 0.32), w, h * 0.4);

    // stars
    if (pal.star > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < S.stars.length; i++) {
        var st = S.stars[i];
        var y = st.y * horizon * 0.92;
        var tw = 0.55 + 0.45 * Math.sin(S.time * st.sp + st.ph);
        var a = pal.star * st.a * tw;
        if (a < 0.02) continue;
        ctx.fillStyle = 'rgba(235,242,255,' + a.toFixed(3) + ')';
        var sz = st.s;
        ctx.fillRect(st.x * w, y, sz, sz);
        if (st.s > 1.4) {
          ctx.fillStyle = 'rgba(235,242,255,' + (a * 0.35).toFixed(3) + ')';
          ctx.fillRect(st.x * w - sz * 2, y + sz * 0.4, sz * 5, 0.8);
          ctx.fillRect(st.x * w + sz * 0.4, y - sz * 2, 0.8, sz * 5);
        }
      }
      ctx.restore();
    }

    drawShootingStars();
    drawMoon(pal, horizon);
    drawClouds(pal, horizon);
    drawMountains(pal, horizon);
  }

  function drawShootingStars() {
    if (!S.shootingStars || !S.shootingStars.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < S.shootingStars.length; i++) {
      var st = S.shootingStars[i];
      var a = clamp(st.life / st.max, 0, 1);
      var tx = st.x - st.vx * 0.10;
      var ty = st.y - st.vy * 0.10;
      var g = ctx.createLinearGradient(st.x, st.y, tx, ty);
      g.addColorStop(0, 'rgba(255,250,228,' + (0.92 * a).toFixed(3) + ')');
      g.addColorStop(0.35, 'rgba(255,231,180,' + (0.42 * a).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,220,160,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.moveTo(st.x, st.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.globalAlpha = a * 0.75;
      ctx.drawImage(glowSprite('#fff2c8'), st.x - 6, st.y - 6, 12, 12);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawMoon(pal, horizon) {
    var w = S.view.w, h = S.view.h;
    var p = project(-30, 36, -62);
    var x, y, r;
    if (p && p.d > 4 && p.x > -w * 0.3 && p.x < w * 1.3) {
      x = p.x; y = p.y;
      r = clamp(h * 0.032, 16, 38);
    } else {
      x = w * 0.19; y = horizon * 0.34; r = clamp(h * 0.032, 16, 38);
    }
    // halo
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var halo = r * 8;
    ctx.globalAlpha = 0.40;
    ctx.drawImage(glowSprite('#ffefd0'), x - halo / 2, y - halo / 2, halo, halo);
    ctx.globalAlpha = 0.22;
    ctx.drawImage(glowSprite('#ffd9a0'), x - halo * 0.8, y - halo * 0.8, halo * 1.6, halo * 1.6);
    ctx.globalAlpha = 1;
    ctx.restore();

    var mg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    mg.addColorStop(0, '#fffdf4');
    mg.addColorStop(0.62, pal.moon);
    mg.addColorStop(1, mixHex(pal.moon, '#c9a86a', 0.55));
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();

    // craters
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(120,96,80,0.16)';
    var craters = [[-0.3, -0.18, 0.22], [0.28, 0.1, 0.16], [-0.08, 0.35, 0.12], [0.12, -0.44, 0.10], [0.44, -0.26, 0.08]];
    for (var i = 0; i < craters.length; i++) {
      var c = craters[i];
      ctx.beginPath(); ctx.arc(x + c[0] * r, y + c[1] * r, c[2] * r, 0, TAU); ctx.fill();
    }
    // thin cloud across the moon
    ctx.fillStyle = rgba(pal.cloud, 0.20);
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.55, r * 1.4, r * 0.20, -0.12, 0, TAU); ctx.fill();
    ctx.restore();

    // reflection hint in the canal
    var rp = project(-30, -0.13, 4.8);
    if (rp && rp.d > 2) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var rr = clamp(h * 0.02, 8, 22);
      ctx.globalAlpha = 0.25;
      ctx.drawImage(glowSprite('#ffe9c7'), rp.x - rr * 3, rp.y - rr * 0.7, rr * 6, rr * 1.4);
      ctx.restore();
    }
  }

  function drawClouds(pal, horizon) {
    var w = S.view.w;
    if (!A.cloud) return;
    ctx.save();
    for (var i = 0; i < S.clouds.length; i++) {
      var c = S.clouds[i];
      var x = ((c.x + S.time * c.speed) % 1.35 - 0.18) * w;
      var y = horizon * c.y;
      var cw = w * c.s * 0.42, ch = cw * 0.32;
      ctx.globalAlpha = c.a * (0.35 + 0.65 * (1 - pal.night));
      ctx.drawImage(A.cloud, x - cw / 2, y - ch / 2, cw, ch);
    }
    ctx.restore();
  }

  function drawMountains(pal, horizon) {
    var w = S.view.w, h = S.view.h;
    var cols = [
      mixHex(pal.m2, pal.haze, 0.34),
      mixHex(pal.m1, pal.m2, 0.38),
      pal.m1
    ];
    var alphas = [0.62, 0.86, 0.98];
    var amps = [0.085, 0.13, 0.19];
    for (var l = 0; l < 3; l++) {
      var pts = S.ridges[l];
      ctx.beginPath();
      ctx.moveTo(0, horizon + 2);
      for (var i = 0; i < pts.length; i++) {
        var x = (i / (pts.length - 1)) * w;
        var y = horizon - pts[i] * h * amps[l] + l * h * 0.012;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, horizon + 2);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.globalAlpha = alphas[l];
      ctx.fillStyle = cols[l];
      ctx.fill();
      // misty base
      if (l < 2) {
        var mg = ctx.createLinearGradient(0, horizon - h * 0.10, 0, horizon + h * 0.05);
        mg.addColorStop(0, rgba(pal.haze, 0));
        mg.addColorStop(1, rgba(pal.haze, 0.12));
        ctx.fillStyle = mg;
        ctx.fillRect(0, horizon - h * 0.12, w, h * 0.2);
      }
    }
    ctx.globalAlpha = 1;

    // moonlit rim on the nearest ridge
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(pal.haze, 0.16);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    var rimPts = S.ridges[0];
    for (var rp = 0; rp < rimPts.length; rp++) {
      var rx = (rp / (rimPts.length - 1)) * w;
      var ry = horizon - rimPts[rp] * h * amps[0];
      if (rp === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
    }
    ctx.stroke();
    ctx.restore();

    // low mist band across the ridge
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.10 + 0.06 * (1 - pal.night);
    for (var m = 0; m < 4; m++) {
      var mx = w * (0.12 + m * 0.24) + Math.sin(S.time * 0.05 + m) * 18;
      ctx.drawImage(glowSprite('#b9a8d8'), mx - w * 0.18, horizon - h * 0.04, w * 0.36, h * 0.09);
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /*  Scene collection                                                   */
  /* ------------------------------------------------------------------ */

  function pushSprite(items, img, x, y, z, w, h, opts) {
    opts = opts || {};
    var p = project(x, y, z);
    if (!p) return;
    var sw = w * p.s, sh = h * p.s;
    if (sw < 1.2 || sh < 1.2) return;
    items.push({
      k: 2, img: img, x: p.x, y: p.y,
      w: sw, h: sh, ax: opts.ax == null ? 0.5 : opts.ax, ay: opts.ay == null ? 0.5 : opts.ay,
      a: opts.a == null ? 1 : opts.a, add: !!opts.add, flip: !!opts.flip,
      rot: opts.rot || 0, d: p.d
    });
  }

  function pushGlow(items, x, y, z, size, col, alpha, dOverride) {
    var p = project(x, y, z);
    if (!p) return;
    var s = size * p.s;
    if (s < 2) return;
    items.push({ k: 3, x: p.x, y: p.y, s: s, col: col, a: alpha == null ? 1 : alpha, d: dOverride == null ? p.d : dOverride });
  }

  function bridgeHeight(z) {
    var t = clamp((z - 1.2) / 7.0, 0, 1);
    return 2.35 * Math.sin(Math.PI * t);
  }

  function collectWorld() {
    var items = S.items;
    items.length = 0;
    var pal = S.pal;
    var t = S.time;
    var i;

    // solid geometry, with cheap backface culling for closed boxes / cylinders
    var vcam = S.view;
    for (i = 0; i < S.polys.length; i++) {
      var pl = S.polys[i];
      if (pl.n) {
        var ndx = vcam.camX - pl.c[0], ndy = vcam.camY - pl.c[1], ndz = vcam.camZ - pl.c[2];
        if (ndx * pl.n[0] + ndy * pl.n[1] + ndz * pl.n[2] <= 0) continue;
      }
      var pr = projectPoly(pl.p);
      if (!pr) continue;
      items.push({ k: 0, p: pr, col: pl.col, d: pl.g ? (100000 + pl.g) : pr.depth, e: pl.e, glow: pl.glow });
    }
    // lines
    for (i = 0; i < S.lines.length; i++) {
      var ln = S.lines[i];
      var lp = projectLine(ln.a, ln.b);
      if (!lp) continue;
      items.push({ k: 1, a: lp.a, b: lp.b, s: lp.s, col: ln.col, w: ln.w, d: lp.depth });
    }

    // windows
    for (i = 0; i < S.windows.length; i++) {
      var wd = S.windows[i];
      var wp = project(wd.x, wd.y, wd.z);
      if (!wp) continue;
      var ww = wd.w * wp.s, wh = wd.h * wp.s;
      if (ww < 1.5 || wh < 1.5) continue;
      items.push({ k: 5, x: wp.x, y: wp.y, w: ww, h: wh, d: wp.d, warm: 0.72 + 0.28 * Math.sin(t * 1.1 + wd.phase) });
    }

    // lanterns
    for (i = 0; i < S.lanterns.length; i++) {
      var lt = S.lanterns[i];
      var sway = Math.sin(t * 1.55 + lt.phase) * 0.10 * lt.sway;
      var lx = lt.x + sway, ly = lt.y + Math.cos(t * 1.9 + lt.phase) * 0.025 * lt.sway;
      var lp2 = project(lx, ly, lt.z);
      if (!lp2) continue;
      var bw = lt.r * 2.9 * lp2.s, bh = lt.r * 3.7 * lp2.s;
      if (bw < 1.2) continue;
      items.push({ k: 4, x: lp2.x, y: lp2.y, w: bw, h: bh, d: lp2.d, col: lt.col, glow: lt.glow, r: lt.r });
    }

    // plaques
    for (i = 0; i < S.plaques.length; i++) {
      var pq = S.plaques[i];
      var pp = project(pq.x, pq.y, pq.z);
      if (!pp) continue;
      var pw = pq.w * pp.s, ph = pq.h * pp.s;
      if (pw < 14) continue;
      items.push({ k: 6, x: pp.x, y: pp.y, w: pw, h: ph, text: pq.text, col: pq.col, d: pp.d });
    }

    // shop signs
    for (i = 0; i < S.signs.length; i++) {
      var sg = S.signs[i];
      var sp = project(sg.x, sg.y, sg.z);
      if (!sp) continue;
      var ss = clamp(0.95 * sp.s, 9, 64);
      items.push({ k: 7, x: sp.x, y: sp.y, s: ss, text: sg.text, d: sp.d, col: '#ffcf6b' });
    }

    // banners (cloth + character)
    for (i = 0; i < S.banners.length; i++) {
      var bn = S.banners[i];
      var sway2 = Math.sin(t * 1.05 + bn.phase) * 0.16;
      var pts;
      if (bn.axis === 'z') {
        pts = [
          [bn.x, bn.y + bn.h, bn.z - bn.w / 2], [bn.x, bn.y + bn.h, bn.z + bn.w / 2],
          [bn.x + sway2 * 0.4, bn.y, bn.z + bn.w / 2 + sway2], [bn.x + sway2 * 0.4, bn.y, bn.z - bn.w / 2 + sway2]
        ];
      } else {
        pts = [
          [bn.x - bn.w / 2, bn.y + bn.h, bn.z], [bn.x + bn.w / 2, bn.y + bn.h, bn.z],
          [bn.x + bn.w / 2 + sway2, bn.y, bn.z + sway2 * 0.5], [bn.x - bn.w / 2 + sway2, bn.y, bn.z + sway2 * 0.5]
        ];
      }
      var bpr = projectPoly(pts);
      if (bpr) items.push({ k: 0, p: bpr, col: shadeCss(bn.col, 0.95), d: bpr.depth, e: false });
      var cp = project(bn.x + sway2 * 0.35, bn.y + bn.h * 0.52, bn.z + 0.06);
      if (cp) items.push({ k: 7, x: cp.x, y: cp.y, s: clamp(bn.w * cp.s * 0.8, 8, 42), text: bn.text, d: cp.d - 0.05, col: bn.trim });
    }

    // trees
    for (i = 0; i < S.trees.length; i++) {
      var tr = S.trees[i];
      var trunkH = (tr.kind === 'willow' ? 2.2 : 2.6) * tr.s;
      var sways = Math.sin(t * 0.38 + tr.phase) * 0.10 * tr.s;
      var img = A.canopy[tr.kind] || A.canopy.cherry;
      var size, wy;
      if (tr.kind === 'willow') {
        size = 6.8 * tr.s; wy = trunkH + 1.85 * tr.s;
      } else if (tr.kind === 'pine') {
        size = 5.0 * tr.s; wy = trunkH + 2.6 * tr.s;
      } else {
        size = 5.8 * tr.s; wy = trunkH + 2.2 * tr.s;
      }
      // trunk shadow
      var sh = project(tr.x, 0.02, tr.z);
      if (sh && sh.d < 40) {
        items.push({ k: 2, img: A.shadow, x: sh.x, y: sh.y, w: size * 0.38 * sh.s, h: size * 0.16 * sh.s, ax: 0.5, ay: 0.5, a: 0.5, add: false, flip: false, rot: 0, d: sh.d - 0.02 });
      }
      pushSprite(items, img, tr.x + sways, wy, tr.z, size, tr.kind === 'pine' ? size * 1.35 : size, { ax: 0.5, ay: 0.5, a: 0.98 });
    }

    // lions
    for (i = 0; i < S.lions.length; i++) {
      var li = S.lions[i];
      pushSprite(items, A.lion, li.x, li.y, li.z, 2.0 * li.s, 2.0 * li.s, { ax: 0.5, ay: 1, a: 1 });
      var lsh = project(li.x, li.y + 0.01, li.z);
      if (lsh) items.push({ k: 2, img: A.shadow, x: lsh.x, y: lsh.y, w: 1.5 * li.s * lsh.s, h: 0.6 * li.s * lsh.s, ax: 0.5, ay: 0.5, a: 0.45, d: lsh.d - 0.01 });
    }

    // boats
    for (i = 0; i < S.boats.length; i++) {
      var bt = S.boats[i];
      var bob = Math.sin(t * 1.2 + bt.phase) * 0.03;
      pushSprite(items, A.boat, bt.x, 0.24 + bob, bt.z, 3.5, 1.9, { ax: 0.5, ay: 1, a: 1 });
      var bg = project(bt.x, -0.1, bt.z + 0.4);
      if (bg) items.push({ k: 3, x: bg.x, y: bg.y, s: 2.4 * bg.s, col: '#ffb45c', a: 0.20, d: bg.d + 0.1 });
    }

    // people
    for (i = 0; i < S.people.length; i++) {
      var pe = S.people[i];
      var px = lerp(pe.x1, pe.x2, pe.t);
      var pz = lerp(pe.z1, pe.z2, pe.t);
      var py = pe.bridge ? bridgeHeight(pz) + 0.05 : 0;
      var wob = Math.sin(t * 6 + pe.phase) * 0.025;
      var flip = pe.dir < 0;
      var shadowP = project(px, py + 0.01, pz);
      if (shadowP) {
        items.push({ k: 2, img: A.shadow, x: shadowP.x, y: shadowP.y, w: 0.7 * shadowP.s, h: 0.24 * shadowP.s, ax: 0.5, ay: 0.5, a: 0.45, d: shadowP.d - 0.01 });
      }
      pushSprite(items, A.person[pe.kind] || A.person.scholar, px, py + wob, pz, 1.15, 1.72, { ax: 0.5, ay: 1, flip: flip });
    }

    // koi
    if (A.koi === undefined) {
      // small procedural fish sprite, cached lazily
      A.koi = canvas2d(48, 24);
      var kg = A.koi.getContext('2d');
      kg.clearRect(0, 0, 48, 24);
      var kgrd = kg.createLinearGradient(0, 0, 48, 24);
      kgrd.addColorStop(0, '#ffd9a0');
      kgrd.addColorStop(1, '#e8642c');
      kg.fillStyle = kgrd;
      kg.beginPath(); kg.ellipse(24, 12, 14, 6, 0, 0, TAU); kg.fill();
      kg.beginPath(); kg.moveTo(10, 12); kg.lineTo(0, 4); kg.lineTo(0, 20); kg.closePath(); kg.fill();
      kg.fillStyle = '#f4ead8'; kg.beginPath(); kg.arc(30, 10, 2.2, 0, TAU); kg.fill();
    }
    for (i = 0; i < S.koi.length; i++) {
      var ko = S.koi[i];
      var ky = -0.12;
      pushSprite(items, A.koi, ko.x, ky, ko.z, 0.55, 0.28, { ax: 0.5, ay: 0.5, a: 0.78, flip: ko.dir !== -1 });
    }

    // petals
    for (i = 0; i < S.petals.length; i++) {
      var pt = S.petals[i];
      var pp2 = project(pt.x, pt.y, pt.z);
      if (!pp2) continue;
      var ps = Math.max(1.2, pt.r * 2 * pp2.s);
      items.push({ k: 10, x: pp2.x, y: pp2.y, s: ps, rot: pt.rot, col: pt.col, d: pp2.d, a: 0.9 });
    }

    // fireflies
    for (i = 0; i < S.fireflies.length; i++) {
      var ff = S.fireflies[i];
      var fp = project(ff.x, ff.y, ff.z);
      if (!fp) continue;
      var fa = 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(t * 1.8 + ff.phase)), 2);
      items.push({ k: 8, x: fp.x, y: fp.y, s: Math.max(2, ff.r * 4.5 * fp.s), col: '#e8ffae', a: fa * (0.35 + 0.65 * pal.night), d: fp.d });
    }

    // sky lanterns
    for (i = 0; i < S.skyLanterns.length; i++) {
      var sl = S.skyLanterns[i];
      var sp2 = project(sl.x, sl.y, sl.z);
      if (!sp2) continue;
      items.push({ k: 9, x: sp2.x, y: sp2.y, s: Math.max(2.5, sl.r * 6 * sp2.s), col: '#ffb45c', a: 0.8, d: sp2.d });
    }

    // birds
    for (i = 0; i < S.birds.length; i++) {
      var bd = S.birds[i];
      var ba = bd.a + t * bd.speed;
      var bx = bd.cx + Math.cos(ba) * bd.r;
      var bz = bd.cz + Math.sin(ba) * bd.r;
      var bp = project(bx, bd.h + Math.sin(t * 0.7 + bd.phase) * 0.6, bz);
      if (!bp) continue;
      items.push({ k: 11, x: bp.x, y: bp.y, s: Math.max(1.2, 0.22 * bp.s), d: bp.d });
    }

    // mist
    for (i = 0; i < S.mist.length; i++) {
      var mi = S.mist[i];
      var mp = project(mi.x, mi.y, mi.z);
      if (!mp) continue;
      items.push({ k: 3, x: mp.x, y: mp.y, s: mi.r * mp.s * 2.2, col: '#c8b8e8', a: 0.045 + 0.025 * (1 - pal.night), d: mp.d });
    }

    // dragon
    var dg = S.dragon;
    for (i = 0; i < dg.body.length; i++) {
      var seg = dg.body[i];
      var dp = project(seg.x, seg.y, seg.z);
      if (!dp) continue;
      var nxt = dg.body[i + 1] || dg.head;
      var np = project(nxt.x, nxt.y, nxt.z);
      var ang = 0, flip = false;
      if (np) {
        var bdx = np.x - dp.x, bdy = np.y - dp.y;
        if (bdx >= 0) { ang = Math.atan2(bdy, bdx); }
        else { ang = Math.atan2(-bdy, -bdx); flip = true; }
      }
      var dw = (1.42 - i * 0.035) * dp.s;
      if (dw < 2) continue;
      // glow
      items.push({ k: 3, x: dp.x, y: dp.y, s: dw * 2.0, col: '#ffd27a', a: 0.05, d: dp.d + 0.01 });
      items.push({ k: 2, img: A.dragonBody[0], x: dp.x, y: dp.y, w: dw * 1.75, h: dw * 0.62, ax: 0.5, ay: 0.5, a: 0.97, d: dp.d, rot: ang, flip: flip });
    }
    var hp = project(dg.head.x, dg.head.y, dg.head.z);
    if (hp) {
      var hw = 3.1 * hp.s;
      items.push({ k: 3, x: hp.x, y: hp.y, s: hw * 2.2, col: '#ffd9a0', a: 0.12, d: hp.d + 0.02 });
      items.push({ k: 2, img: A.dragonHead, x: hp.x, y: hp.y, w: hw, h: hw * 0.68, ax: 0.5, ay: 0.5, a: 1, d: hp.d, rot: dg.head.rot, flip: !!dg.head.flip });
    }
    if (dg.pearl) {
      var pep = project(dg.pearl.x, dg.pearl.y, dg.pearl.z);
      if (pep) {
        var pr2 = Math.max(3, 0.28 * pep.s);
        items.push({ k: 3, x: pep.x, y: pep.y, s: pr2 * 7, col: '#ffe2a0', a: 0.24, d: pep.d + 0.03 });
        items.push({ k: 3, x: pep.x, y: pep.y, s: pr2 * 3.2, col: '#fff3cf', a: 0.62, d: pep.d + 0.02 });
      }
    }

    // warm pools of light on the ground
    var pools = [[0, 0.05, 11.4, 5.5, 0.045], [0, 0.05, 16.6, 6.0, 0.045], [0, 0.05, 21.2, 5.0, 0.04], [0, 0.05, 26.0, 4.0, 0.035], [0, 0.05, -6.4, 8.5, 0.04], [0, 0.05, 3.4, 5.0, 0.035]];
    for (i = 0; i < pools.length; i++) {
      var pool = pools[i];
      var ppool = project(pool[0], pool[1], pool[2]);
      if (!ppool) continue;
      items.push({ k: 3, x: ppool.x, y: ppool.y, s: pool[3] * ppool.s, col: '#ff9a4a', a: pool[4] * (0.6 + 0.4 * pal.lantern), d: ppool.d });
    }

    // water shimmer: moon path and lantern reflections
    ctx.save();
    for (i = 0; i < 10; i++) {
      var wz = 2.3 + i * 0.52;
      var wx = -28 + Math.sin(t * 0.7 + i * 1.3) * 0.45;
      var wa = 0.05 + 0.045 * Math.pow(Math.max(0, Math.sin(t * 1.1 + i)), 2);
      var wl = projectLine([wx - 0.5, -0.135, wz], [wx + 0.5, -0.135, wz + 0.18]);
      if (wl) items.push({ k: 1, a: wl.a, b: wl.b, s: wl.s, col: 'rgba(255,236,190,' + wa.toFixed(3) + ')', w: 0.05, d: wl.depth, glow: true });
    }
    [-3.2, 3.2].forEach(function (x) {
      for (var k = 0; k < 3; k++) {
        var zz = 2.4 + k * 1.5 + Math.sin(t * 0.9 + k) * 0.2;
        var rr = projectLine([x - 0.08, -0.135, zz], [x + 0.08, -0.135, zz + 0.8]);
        if (rr) items.push({ k: 1, a: rr.a, b: rr.b, s: rr.s, col: 'rgba(255,180,92,0.12)', w: 0.04, d: rr.depth, glow: true });
      }
    });
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /*  Item drawing                                                       */
  /* ------------------------------------------------------------------ */

  function drawItem(it, pal) {
    switch (it.k) {
      case 0: {
        var pts = it.p.pts;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.fillStyle = it.col;
        ctx.fill();
        if (it.e) {
          ctx.strokeStyle = 'rgba(10,5,16,0.30)';
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
        if (it.tile) {
          var tps = pts;
          ctx.save();
          ctx.globalAlpha = 0.20;
          ctx.strokeStyle = 'rgba(4,28,26,0.9)';
          ctx.lineWidth = 0.55;
          for (var tv = 0.25; tv < 1; tv += 0.25) {
            var ax = lerp(tps[0].x, tps[1].x, tv), ay = lerp(tps[0].y, tps[1].y, tv);
            var bx = lerp(tps[3].x, tps[2].x, tv), by = lerp(tps[3].y, tps[2].y, tv);
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
          }
          ctx.globalAlpha = 0.13;
          ctx.strokeStyle = 'rgba(220,246,230,0.6)';
          for (var sv = 0.33; sv < 1; sv += 0.34) {
            var cx1 = lerp(tps[0].x, tps[3].x, sv), cy1 = lerp(tps[0].y, tps[3].y, sv);
            var cx2 = lerp(tps[1].x, tps[2].x, sv), cy2 = lerp(tps[1].y, tps[2].y, sv);
            ctx.beginPath(); ctx.moveTo(cx1, cy1); ctx.lineTo(cx2, cy2); ctx.stroke();
          }
          ctx.restore();
        }
        if (it.glow) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.06;
          ctx.fillStyle = '#ffd9a0';
          ctx.fill();
          ctx.restore();
        }
        if (it.d > 34) {
          var fa = Math.min(0.34, (it.d - 34) / 110);
          ctx.fillStyle = 'rgba(56,36,72,' + fa.toFixed(3) + ')';
          ctx.fill();
        }
        break;
      }
      case 1: {
        ctx.beginPath();
        ctx.moveTo(it.a.x, it.a.y);
        ctx.lineTo(it.b.x, it.b.y);
        ctx.strokeStyle = it.col;
        ctx.lineWidth = clamp(it.w * it.s, 0.45, 5);
        if (it.glow) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.stroke();
        }
        break;
      }
      case 2: {
        ctx.save();
        ctx.globalAlpha = it.a;
        if (it.add) ctx.globalCompositeOperation = 'lighter';
        ctx.translate(it.x, it.y);
        if (it.rot) ctx.rotate(it.rot);
        if (it.flip) ctx.scale(-1, 1);
        ctx.drawImage(it.img, -it.w * it.ax, -it.h * it.ay, it.w, it.h);
        ctx.restore();
        break;
      }
      case 3: {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = it.a;
        ctx.drawImage(glowSprite(it.col), it.x - it.s / 2, it.y - it.s / 2, it.s, it.s);
        ctx.restore();
        break;
      }
      case 4: {
        drawLantern(it, pal);
        break;
      }
      case 5: {
        drawWindow(it, pal);
        break;
      }
      case 6: {
        drawPlaque(it);
        break;
      }
      case 7: {
        drawSign(it);
        break;
      }
      case 8: {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = it.a;
        ctx.drawImage(glowSprite(it.col), it.x - it.s / 2, it.y - it.s / 2, it.s, it.s);
        ctx.restore();
        break;
      }
      case 9: {
        var sk = it.s;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.15;
        ctx.drawImage(glowSprite('#ff9a4a'), it.x - sk * 1.8, it.y - sk * 1.8, sk * 3.6, sk * 3.6);
        ctx.restore();
        if (A.skyLantern) ctx.drawImage(A.skyLantern, it.x - sk * 0.45, it.y - sk * 0.65, sk * 0.9, sk * 1.3);
        break;
      }
      case 10: {
        ctx.save();
        ctx.globalAlpha = it.a;
        ctx.translate(it.x, it.y);
        ctx.rotate(it.rot);
        ctx.fillStyle = it.col;
        ctx.beginPath();
        ctx.ellipse(0, 0, it.s, it.s * 0.42, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 11: {
        ctx.save();
        ctx.strokeStyle = 'rgba(20,14,26,0.65)';
        ctx.lineWidth = Math.max(0.7, it.s * 0.16);
        var f = Math.sin(S.time * 7 + it.x) * 0.5;
        ctx.beginPath();
        ctx.moveTo(it.x - it.s, it.y + f * it.s);
        ctx.quadraticCurveTo(it.x - it.s * 0.4, it.y - it.s * 0.45, it.x, it.y);
        ctx.quadraticCurveTo(it.x + it.s * 0.4, it.y - it.s * 0.45, it.x + it.s, it.y + f * it.s);
        ctx.stroke();
        ctx.restore();
        break;
      }
    }
  }

  function drawLantern(it, pal) {
    var x = it.x, y = it.y, w = it.w, h = it.h;
    // hanging cord
    ctx.strokeStyle = 'rgba(62,40,24,0.55)';
    ctx.lineWidth = Math.max(0.5, w * 0.035);
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.52);
    ctx.lineTo(x, y - h * 1.65);
    ctx.stroke();
    // glow
    var gs = w * 4.3;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.34 * pal.lantern;
    ctx.drawImage(glowSprite(it.glow), x - gs / 2, y - gs / 2, gs, gs);
    if (w > 18) {
      ctx.globalAlpha = 0.09 * pal.lantern;
      ctx.drawImage(glowSprite('#ff7a3d'), x - gs * 0.7, y - gs * 0.7, gs * 1.4, gs * 1.4);
    }
    ctx.restore();
    // body
    var img = (A.lanterns && (A.lanterns[it.col] || A.lanterns['#ff6b3d']));
    if (img) ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  }

  function drawWindow(it, pal) {
    var x = it.x, y = it.y, w = it.w, h = it.h;
    var bright = clamp(0.72 + 0.40 * pal.night, 0.7, 1.2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.14 * bright;
    ctx.drawImage(glowSprite('#ffb45c'), x - w * 1.5, y - h * 1.5, w * 3.0, h * 3.0);
    ctx.restore();
    if (A.window) {
      ctx.globalAlpha = 0.94;
      ctx.drawImage(A.window, x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4);
      ctx.globalAlpha = 1;
    }
  }

  function drawPlaque(it) {
    var x = it.x, y = it.y, w = it.w, h = it.h;
    var fs = clamp(h * 0.56, 9, 46);
    ctx.save();
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x - w / 2 + 3, y - h / 2 + 3, w, h);
    // frame
    var g = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
    g.addColorStop(0, '#5a2618');
    g.addColorStop(0.5, '#2f120e');
    g.addColorStop(1, '#6a3020');
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.strokeStyle = 'rgba(232,184,95,0.95)';
    ctx.lineWidth = Math.max(1, h * 0.06);
    ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    ctx.strokeStyle = 'rgba(232,184,95,0.45)';
    ctx.lineWidth = Math.max(0.7, h * 0.025);
    ctx.strokeRect(x - w / 2 + h * 0.10, y - h / 2 + h * 0.10, w - h * 0.20, h - h * 0.20);
    // text
    ctx.fillStyle = it.col;
    ctx.font = '700 ' + fs.toFixed(1) + 'px "Noto Serif SC","Songti SC","STSong",serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,190,80,0.55)';
    ctx.shadowBlur = Math.max(4, fs * 0.35);
    ctx.fillText(it.text, x, y + fs * 0.02);
    ctx.restore();
  }

  function drawSign(it) {
    var x = it.x, y = it.y, s = it.s;
    if (s < 6) return;
    var bw = s * 0.98, bh = s * 1.05;
    ctx.save();
    // dark board
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(40,12,12,0.92)';
    ctx.fillRect(-bw / 2 - 2, -bh / 2 - 2, bw + 4, bh + 4);
    var g = ctx.createLinearGradient(-bw / 2, -bh / 2, bw / 2, bh / 2);
    g.addColorStop(0, '#5c1d1d');
    g.addColorStop(1, '#2a0d0d');
    ctx.fillStyle = g;
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.strokeStyle = 'rgba(232,184,95,0.85)';
    ctx.lineWidth = Math.max(0.8, s * 0.045);
    ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
    ctx.fillStyle = it.col;
    ctx.font = '700 ' + (s * 0.62).toFixed(1) + 'px "Noto Serif SC","Songti SC","STSong",serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,190,80,0.55)';
    ctx.shadowBlur = Math.max(2, s * 0.22);
    ctx.fillText(it.text, 0, s * 0.01);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /*  Fireworks & atmosphere                                             */
  /* ------------------------------------------------------------------ */

  function drawFireworks(pal) {
    var w = S.view.w, h = S.view.h;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < S.rockets.length; i++) {
      var r = S.rockets[i];
      var p = project(r.x, r.y, r.z);
      if (!p) continue;
      ctx.globalAlpha = clamp(0.9 - r.age * 0.12, 0.2, 1);
      ctx.drawImage(glowSprite('#ffe0a0'), p.x - 9, p.y - 9, 18, 18);
      ctx.fillStyle = 'rgba(255,230,180,0.55)';
      ctx.fillRect(p.x - 1, p.y, 2, 12);
    }
    for (var b = 0; b < S.fireworks.length; b++) {
      var f = S.fireworks[b];
      // projected center
      var cp = project(f.x, f.y, f.z);
      if (!cp) continue;
      var fade = clamp(1 - f.age / f.life, 0, 1);
      // burst flash
      if (f.age < 0.22) {
        var fl = (1 - f.age / 0.22);
        ctx.globalAlpha = fl * 0.55;
        ctx.drawImage(glowSprite(f.col), cp.x - 90, cp.y - 90, 180, 180);
      }
      ctx.globalAlpha = fade * 0.95;
      for (var k = 0; k < f.parts.length; k++) {
        var pt = f.parts[k];
        var pp = project(pt.x, pt.y, pt.z);
        if (!pp) continue;
        var sz = clamp(1.1 + pt.r * pp.s, 0.8, 4.2);
        ctx.fillStyle = k % 5 === 0 ? '#fff4d8' : f.col;
        ctx.fillRect(pp.x - sz / 2, pp.y - sz / 2, sz, sz);
        // little trail
        ctx.globalAlpha = fade * 0.25;
        ctx.fillRect(pp.x - sz * 0.3, pp.y, sz * 0.6, sz * 2.2);
        ctx.globalAlpha = fade * 0.95;
      }
    }
    ctx.restore();
  }

  function drawAtmosphere(pal) {
    var w = S.view.w, h = S.view.h;
    // vignette
    var vg = ctx.createRadialGradient(w * 0.5, h * 0.47, h * 0.24, w * 0.5, h * 0.5, h * 0.92);
    vg.addColorStop(0, 'rgba(4,2,10,0)');
    vg.addColorStop(0.65, 'rgba(4,2,10,0.15)');
    vg.addColorStop(1, 'rgba(4,2,10,0.62)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    // bottom fade for HUD legibility
    var bg = ctx.createLinearGradient(0, h * 0.62, 0, h);
    bg.addColorStop(0, 'rgba(4,2,10,0)');
    bg.addColorStop(1, 'rgba(4,2,10,0.55)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, h * 0.62, w, h * 0.38);

    // faint warm haze in the centre
    if (pal.night < 0.7) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.045 * (1 - pal.night);
      var hz = ctx.createRadialGradient(w * 0.5, h * 0.52, 0, w * 0.5, h * 0.52, w * 0.55);
      hz.addColorStop(0, '#ffb45c');
      hz.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = hz;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  function drawWeather(pal) {
    if (!S || S.weather === 'clear') return;
    var w = S.view.w, h = S.view.h;
    var rain = S.weather === 'rain';
    ctx.save();

    if (rain) {
      ctx.fillStyle = 'rgba(11,25,48,0.10)';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(201,226,255,0.22)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (var i = 0; i < S.weatherParticles.length; i++) {
        var p = S.weatherParticles[i];
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.024, p.y - p.len);
      }
      ctx.stroke();
      // a second, brighter layer of nearer drops
      ctx.strokeStyle = 'rgba(225,240,255,0.30)';
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      for (var j = 0; j < S.weatherParticles.length; j += 5) {
        var q = S.weatherParticles[j];
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(q.x - q.vx * 0.030, q.y - q.len * 1.2);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(194,218,255,0.035)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(247,251,255,0.58)';
      ctx.beginPath();
      for (var k = 0; k < S.weatherParticles.length; k++) {
        var f = S.weatherParticles[k];
        ctx.moveTo(f.x + f.r, f.y);
        ctx.arc(f.x, f.y, f.r, 0, TAU);
      }
      ctx.fill();
      // a few large, soft flakes catch the lantern light
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,236,196,0.20)';
      for (var m = 0; m < S.weatherParticles.length; m += 17) {
        var sf = S.weatherParticles[m];
        ctx.beginPath();
        ctx.arc(sf.x, sf.y, sf.r * 3.4, 0, TAU);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    if (S.weatherFlash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(196,224,255,' + (S.weatherFlash * 0.15).toFixed(3) + ')';
      ctx.fillRect(0, 0, w, h);
      if (S.weatherBolt) {
        var ba = clamp(S.weatherBolt.life / S.weatherBolt.max, 0, 1);
        var pts = S.weatherBolt.pts;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(180,210,255,' + (0.12 * ba).toFixed(3) + ')';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (var b = 1; b < pts.length; b++) ctx.lineTo(pts[b][0], pts[b][1]);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(246,250,255,' + (0.88 * ba).toFixed(3) + ')';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(200,226,255,' + (0.46 * ba).toFixed(3) + ')';
        ctx.lineWidth = 3.6;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /*  Render loop                                                        */
  /* ------------------------------------------------------------------ */

  function resize() {
    if (!S || !S.canvas) return;
    var cw = S.canvas.clientWidth || S.panel.clientWidth || window.innerWidth;
    var ch = S.canvas.clientHeight || S.panel.clientHeight || window.innerHeight;
    if (!cw || !ch) return;
    S.dpr = Math.min(2, window.devicePixelRatio || 1);
    S.scale = clamp(S.scale || 0.86, 0.55, 1);
    S.view.w = cw;
    S.view.h = ch;
    var pw = Math.max(1, Math.round(cw * S.scale)), ph = Math.max(1, Math.round(ch * S.scale));
    if (S.canvas.width !== pw || S.canvas.height !== ph) {
      S.canvas.width = pw;
      S.canvas.height = ph;
    }
    ctx.setTransform(S.scale, 0, 0, S.scale, 0, 0);
    updateView();
  }

  function render() {
    if (!S || !S.running) return;
    S.pal = palette();
    ctx.setTransform(S.scale, 0, 0, S.scale, 0, 0);
    ctx.clearRect(0, 0, S.view.w, S.view.h);
    drawSky(S.pal);
    collectWorld();
    S.items.sort(function (a, b) { return b.d - a.d; });
    for (var i = 0; i < S.items.length; i++) drawItem(S.items[i], S.pal);
    drawFireworks(S.pal);
    drawAtmosphere(S.pal);
    drawWeather(S.pal);
    updateMarkers();
    updateFps();
  }

  /* ------------------------------------------------------------------ */
  /*  UI                                                                 */
  /* ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------ */
  /*  Procedural ambient soundscape                                      */
  /* ------------------------------------------------------------------ */

  var TownAudio = (function () {
    var ctx = null;
    var master = null;
    var on = false;
    var timers = [];
    var noiseBuffer = null;
    var SCALE = [146.83, 174.61, 196.00, 220.00, 261.63, 293.66, 349.23, 392.00];

    function later(fn, ms) {
      var id = setTimeout(fn, ms);
      timers.push({ id: id, t: 'timeout' });
      return id;
    }
    function every(fn, ms) {
      var id = setInterval(fn, ms);
      timers.push({ id: id, t: 'interval' });
      return id;
    }
    function clearTimers() {
      for (var i = 0; i < timers.length; i++) {
        if (timers[i].t === 'timeout') clearTimeout(timers[i].id);
        else clearInterval(timers[i].id);
      }
      timers = [];
    }
    function makeNoise(seconds) {
      var len = Math.floor(ctx.sampleRate * seconds);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      var last = 0;
      for (var i = 0; i < len; i++) {
        var white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      }
      return buf;
    }
    function pluck(freq, when, gain, dur) {
      if (!on || !ctx) return;
      var o = ctx.createOscillator();
      var o2 = ctx.createOscillator();
      var g = ctx.createGain();
      var f = ctx.createBiquadFilter();
      o.type = 'triangle';
      o.frequency.setValueAtTime(freq, when);
      o2.type = 'sine';
      o2.frequency.setValueAtTime(freq * 2.005, when);
      f.type = 'lowpass';
      f.frequency.setValueAtTime(2400, when);
      f.frequency.exponentialRampToValueAtTime(620, when + dur);
      f.Q.value = 0.7;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), when + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      var g2 = ctx.createGain();
      g2.gain.value = 0.18;
      o.connect(f);
      o2.connect(g2);
      g2.connect(f);
      f.connect(g);
      g.connect(master);
      o.start(when); o2.start(when);
      o.stop(when + dur + 0.06); o2.stop(when + dur + 0.06);
    }
    function bell() {
      if (!on || !ctx) return;
      var when = ctx.currentTime + 0.03;
      var base = 196;
      var partials = [1, 2.01, 3.02, 4.08, 5.43, 6.79];
      for (var i = 0; i < partials.length; i++) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = base * partials[i];
        var amp = 0.12 / (1 + i * 0.85);
        var dur = 3.8 / (1 + i * 0.22);
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(amp, when + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        o.connect(g); g.connect(master);
        o.start(when); o.stop(when + dur + 0.05);
      }
    }
    function thunder() {
      if (!on || !ctx) return;
      var when = ctx.currentTime;
      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(180, when);
      f.frequency.exponentialRampToValueAtTime(62, when + 2.2);
      f.Q.value = 0.8;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.22, when + 0.09);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 2.6);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(when); src.stop(when + 2.7);
    }
    function start() {
      if (on) return true;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
        master = ctx.createGain();
        master.gain.setValueAtTime(0.0001, ctx.currentTime);
        master.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 2.2);
        master.connect(ctx.destination);
        noiseBuffer = makeNoise(2.6);

        // low drone, like a distant guqin string and the breath of the valley
        [73.42, 110.0].forEach(function (freq, idx) {
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          var lfo = ctx.createOscillator();
          var lg = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = freq;
          g.gain.value = idx ? 0.018 : 0.026;
          lfo.type = 'sine';
          lfo.frequency.value = 0.055 + idx * 0.017;
          lg.gain.value = idx ? 0.006 : 0.009;
          lfo.connect(lg); lg.connect(g.gain);
          o.connect(g); g.connect(master);
          o.start(); lfo.start();
        });

        // canal water
        var water = ctx.createBufferSource();
        var wf = ctx.createBiquadFilter();
        var wg = ctx.createGain();
        water.buffer = noiseBuffer;
        water.loop = true;
        wf.type = 'bandpass';
        wf.frequency.value = 620;
        wf.Q.value = 0.45;
        wg.gain.value = 0.022;
        water.connect(wf); wf.connect(wg); wg.connect(master);
        water.start();

        // high wind through the eaves
        var wind = ctx.createBufferSource();
        var wnf = ctx.createBiquadFilter();
        var wng = ctx.createGain();
        wind.buffer = noiseBuffer;
        wind.loop = true;
        wnf.type = 'lowpass';
        wnf.frequency.value = 360;
        wnf.Q.value = 0.4;
        wng.gain.value = 0.012;
        wind.connect(wnf); wnf.connect(wng); wng.connect(master);
        wind.start();

        on = true;
        later(function () { if (on && ctx) pluck(SCALE[4], ctx.currentTime + 0.02, 0.055, 2.4); }, 900);
        every(function () {
          if (!on || !ctx) return;
          var note = SCALE[Math.floor(Math.random() * SCALE.length)];
          var when = ctx.currentTime + 0.02;
          pluck(note, when, 0.036 + Math.random() * 0.025, 2.2 + Math.random() * 1.6);
          if (Math.random() > 0.62) {
            later(function () {
              if (on && ctx) pluck(note * 1.5, ctx.currentTime + 0.02, 0.014, 1.7);
            }, 260 + Math.random() * 520);
          }
        }, 2300);
        later(bell, 18000);
        every(bell, 46000);
        return true;
      } catch (e) {
        try { if (ctx) ctx.close(); } catch (e2) {}
        ctx = null; master = null; on = false;
        return false;
      }
    }
    function stop() {
      on = false;
      clearTimers();
      var oldCtx = ctx, oldMaster = master;
      ctx = null; master = null;
      if (oldCtx) {
        try {
          var t = oldCtx.currentTime;
          if (oldMaster) {
            oldMaster.gain.cancelScheduledValues(t);
            oldMaster.gain.setValueAtTime(Math.max(0.0001, oldMaster.gain.value), t);
            oldMaster.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
          }
        } catch (e) {}
        setTimeout(function () { try { oldCtx.close(); } catch (e) {} }, 420);
      }
    }
    return {
      start: start,
      stop: stop,
      bell: bell,
      thunder: thunder,
      isOn: function () { return on; }
    };
  })();


  function buildUI() {
    var app = S.app;
    var hud = el('div', 'ct-hud');
    hud.innerHTML =
      '<header class="ct-title">' +
        '<div class="ct-kicker"><span class="ct-pip"></span>月玉镇 · JADE MOON TOWN</div>' +
        '<h1>月玉镇</h1>' +
        '<div class="ct-sub">A living scroll beneath the jade moon</div>' +
        '<div class="ct-seal">月玉</div>' +
      '</header>' +
      '<div class="ct-tools">' +
        '<button type="button" class="ct-tool" data-act="tour"><span class="ct-ico">🎐</span><span class="ct-label">Guided tour</span></button>' +
        '<button type="button" class="ct-tool" data-act="view"><span class="ct-ico">🎥</span><span class="ct-label">Orbit view</span></button>' +
        '<button type="button" class="ct-tool" data-act="night"><span class="ct-ico">🌙</span><span class="ct-label">Dusk</span></button>' +
        '<button type="button" class="ct-tool" data-act="weather"><span class="ct-ico">🌦️</span><span class="ct-label">Weather</span></button>' +
        '<button type="button" class="ct-tool" data-act="sound"><span class="ct-ico">🔇</span><span class="ct-label">Sound off</span></button>' +
        '<button type="button" class="ct-tool" data-act="fireworks"><span class="ct-ico">🎆</span><span class="ct-label">Fireworks</span></button>' +
        '<button type="button" class="ct-tool" data-act="photo"><span class="ct-ico">📷</span><span class="ct-label">Photo mode</span></button>' +
        '<button type="button" class="ct-tool" data-act="realms"><span class="ct-ico">🗺️</span><span class="ct-label">Realms</span></button>' +
      '</div>' +
      '<div class="ct-chips">' +
        '<button type="button" class="ct-chip" data-hotspot="aerial"><b>全景</b><span>Aerial</span></button>' +
        HOTSPOTS.map(function (h) {
          return '<button type="button" class="ct-chip" data-hotspot="' + h.id + '"><b>' + h.zh + '</b><span>' + h.name.replace('Hall of the ', '') + '</span></button>';
        }).join('') +
      '</div>' +
      '<aside class="ct-info" aria-live="polite">' +
        '<button type="button" class="ct-info-close" aria-label="Close">✕</button>' +
        '<div class="ct-info-kicker">LOCATION</div>' +
        '<div class="ct-info-zh"></div>' +
        '<div class="ct-info-name"></div>' +
        '<p class="ct-info-desc"></p>' +
        '<div class="ct-info-meta"><span class="ct-info-dot"></span><span class="ct-info-coords"></span></div>' +
      '</aside>' +
      '<div class="ct-markers"></div>' +
      '<div class="ct-help"><kbd>drag</kbd> look <span>·</span> <kbd>WASD</kbd> walk <span>·</span> <kbd>shift</kbd> run</div>' +
      '<div class="ct-walkpad" aria-label="Walk controls">' +
        '<button type="button" class="ct-walk-btn ct-walk-up" data-move="forward" aria-label="Walk forward">▲</button>' +
        '<button type="button" class="ct-walk-btn ct-walk-left" data-move="left" aria-label="Strafe left">◀</button>' +
        '<button type="button" class="ct-walk-btn ct-walk-right" data-move="right" aria-label="Strafe right">▶</button>' +
        '<button type="button" class="ct-walk-btn ct-walk-back" data-move="back" aria-label="Walk backward">▼</button>' +
      '</div>' +
      '<div class="ct-fps"></div>' +
      '<div class="ct-tourbar">' +
        '<button type="button" class="ct-tour-prev" aria-label="Previous stop">‹</button>' +
        '<div class="ct-tour-mid"><div class="ct-tour-label">Guided tour</div><div class="ct-tour-progress"><i></i></div></div>' +
        '<button type="button" class="ct-tour-next" aria-label="Next stop">›</button>' +
        '<button type="button" class="ct-tour-stop" aria-label="End tour">✕</button>' +
      '</div>' +
      '<div class="ct-toast"></div>';
    app.appendChild(hud);
    S.hud = hud;

    var photo = el('div', 'ct-photo');
    photo.innerHTML =
      '<div class="ct-photo-bar">' +
        '<span class="ct-photo-tag">PHOTO MODE</span>' +
        '<span class="ct-photo-status">Drag to compose · save the frame</span>' +
        '<button type="button" class="ct-photo-save">Save frame</button>' +
        '<button type="button" class="ct-photo-exit">Exit</button>' +
      '</div>';
    app.appendChild(photo);
    S.photoBar = photo;
    S.photoStatus = photo.querySelector('.ct-photo-status');
    photo.querySelector('.ct-photo-exit').addEventListener('click', function () { setPhoto(false); });
    photo.querySelector('.ct-photo-save').addEventListener('click', saveFrame);

    var scrim = el('div', 'ct-realms-scrim');
    var realms = el('aside', 'ct-realms');
    realms.innerHTML =
      '<div class="ct-realms-head">' +
        '<div><div class="ct-kicker">REALM INDEX</div><h2>Other worlds</h2></div>' +
        '<button type="button" class="ct-realms-close" aria-label="Close realms">✕</button>' +
      '</div>' +
      '<p class="ct-realms-sub">The old Explore paths remain open. Step out of the town and back into the maze, the mine, or the voxel wilds.</p>' +
      '<div class="ct-realm-links">' +
        '<a href="mine3d.html"><span class="ct-realm-ico">⛏️</span><span><b>Maze 3D</b><small>First-person labyrinth</small></span><i>↗</i></a>' +
        '<a href="index.html"><span class="ct-realm-ico">🗺️</span><span><b>Maze 2D</b><small>The original path</small></span><i>↗</i></a>' +
        '<a href="voxel.html#forest"><span class="ct-realm-ico">🌲</span><span><b>Voxel Forest</b><small>Lanterns in the pines</small></span><i>↗</i></a>' +
        '<a href="voxel.html#mine"><span class="ct-realm-ico">💎</span><span><b>Voxel Mine</b><small>Ore and old stone</small></span><i>↗</i></a>' +
        '<a href="voxel.html#frost"><span class="ct-realm-ico">❄️</span><span><b>Frost Reach</b><small>Blue snow, blue silence</small></span><i>↗</i></a>' +
        '<a href="voxel.html#crystal"><span class="ct-realm-ico">🔮</span><span><b>Crystal Deep</b><small>Light under the earth</small></span><i>↗</i></a>' +
      '</div>' +
      '<div class="ct-realms-divider">REGIONS WITHIN</div>' +
      '<div class="ct-region-list">' +
        ['Northgate Warren', 'Ember Deeps', 'The Heart', 'Lantern Row', 'Tangle Warrens', 'Gilded Warrens', 'Far Reaches', 'Howling Deeps'].map(function (r) {
          return '<span><i></i>' + r + '</span>';
        }).join('') +
      '</div>' +
      '<div class="ct-realms-foot">月玉镇 · a quiet town on the edge of the maze</div>';
    app.appendChild(scrim);
    app.appendChild(realms);

    var loader = el('div', 'ct-loader');
    loader.innerHTML =
      '<div class="ct-loader-moon"><span></span></div>' +
      '<div class="ct-loader-zh">月玉镇</div>' +
      '<div class="ct-loader-text">Unrolling the scroll…</div>';
    app.appendChild(loader);

    S.scrim = scrim;
    S.realms = realms;
    S.loader = loader;
    S.info = hud.querySelector('.ct-info');
    S.infoZh = hud.querySelector('.ct-info-zh');
    S.infoName = hud.querySelector('.ct-info-name');
    S.infoDesc = hud.querySelector('.ct-info-desc');
    S.infoCoords = hud.querySelector('.ct-info-coords');
    S.infoKicker = hud.querySelector('.ct-info-kicker');
    S.help = hud.querySelector('.ct-help');
    S.fpsEl = hud.querySelector('.ct-fps');
    S.tourbar = hud.querySelector('.ct-tourbar');
    S.tourProgress = hud.querySelector('.ct-tour-progress i');
    S.toast = hud.querySelector('.ct-toast');
    S.nightBtn = hud.querySelector('[data-act="night"]');
    S.tourBtn = hud.querySelector('[data-act="tour"]');
    S.viewBtn = hud.querySelector('[data-act="view"]');
    S.walkPad = hud.querySelector('.ct-walkpad');
    S.weatherBtn = hud.querySelector('[data-act="weather"]');
    S.soundBtn = hud.querySelector('[data-act="sound"]');
    S.photoBtn = hud.querySelector('[data-act="photo"]');

    // chips
    S.chipEls = Array.prototype.slice.call(hud.querySelectorAll('.ct-chip'));
    S.chipEls.forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.dataset.hotspot;
        if (id === 'aerial') {
          goAerial(false);
        } else {
          goHotspot(id, false);
        }
      });
    });

    // markers
    var markers = hud.querySelector('.ct-markers');
    S.markerEls = HOTSPOTS.map(function (h) {
      var b = el('button', 'ct-marker');
      b.type = 'button';
      b.dataset.hotspot = h.id;
      b.innerHTML = '<span class="ct-marker-dot"></span><span class="ct-marker-label">' + h.zh + '<small>' + h.name + '</small></span>';
      b.addEventListener('click', function () { goHotspot(h.id, false); });
      markers.appendChild(b);
      return b;
    });
    S.markerEls.push(null); // aerial has no marker

    // tools
    hud.querySelector('[data-act="tour"]').addEventListener('click', function () { S.tour ? endTour(true) : startTour(); });
    hud.querySelector('[data-act="view"]').addEventListener('click', function () { setFirstPerson(!S.firstPerson); });
    hud.querySelector('[data-act="night"]').addEventListener('click', function () { setNight(!S.nightOn); });
    hud.querySelector('[data-act="weather"]').addEventListener('click', function () { cycleWeather(); });
    hud.querySelector('[data-act="sound"]').addEventListener('click', function () { setSound(!S.soundOn); });
    hud.querySelector('[data-act="fireworks"]').addEventListener('click', function () { launchFirework(); launchFirework(); showToast('焰火 · fireworks'); });
    hud.querySelector('[data-act="photo"]').addEventListener('click', function () { setPhoto(true); });
    hud.querySelector('[data-act="realms"]').addEventListener('click', openRealms);
    realms.querySelector('.ct-realms-close').addEventListener('click', closeRealms);
    scrim.addEventListener('click', closeRealms);
    hud.querySelector('.ct-info-close').addEventListener('click', function () { hideInfoCard(); });
    hud.querySelector('.ct-tour-stop').addEventListener('click', function () { endTour(true); });
    hud.querySelector('.ct-tour-prev').addEventListener('click', function () { tourGo(S.tour ? (S.tour.i + TOUR.length - 1) % TOUR.length : 0); });
    hud.querySelector('.ct-tour-next').addEventListener('click', function () { tourGo(S.tour ? (S.tour.i + 1) % TOUR.length : 0); });

    if (S.walkPad) {
      Array.prototype.forEach.call(S.walkPad.querySelectorAll('[data-move]'), function (b) {
        var dir = b.dataset.move;
        function down(e) {
          if (e) e.preventDefault();
          S.fpKeys[dir] = true;
          S.fpFly = null;
          S.lastInput = S.time;
          b.classList.add('is-down');
          if (b.setPointerCapture && e && e.pointerId != null) {
            try { b.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
          }
        }
        function up(e) {
          if (e) e.preventDefault();
          S.fpKeys[dir] = false;
          b.classList.remove('is-down');
        }
        b.addEventListener('pointerdown', down);
        b.addEventListener('pointerup', up);
        b.addEventListener('pointercancel', up);
        b.addEventListener('pointerleave', up);
      });
    }
    updateViewModeUI();
  }

  /* ------------------------------------------------------------------ */
  /*  UI actions                                                         */
  /* ------------------------------------------------------------------ */

  function showInfo(h) {
    if (!h) return;
    S.infoKicker.textContent = S.tour ? ('STOP ' + ('0' + (S.tour.i + 1)).slice(-2) + ' / 0' + TOUR.length) : 'LOCATION';
    S.infoZh.textContent = h.zh;
    S.infoName.textContent = h.name;
    S.infoDesc.textContent = h.desc;
    S.infoCoords.textContent = h.x.toFixed(0) + ' , ' + h.z.toFixed(0);
    S.info.classList.add('is-on');
    if (S.panel) S.panel.classList.add('is-info');
    if (S.infoTimer) clearTimeout(S.infoTimer);
    if (!S.tour) {
      S.infoTimer = setTimeout(function () {
        hideInfoCard();
      }, 9000);
    }
  }

  function hideInfoCard() {
    if (S.info) S.info.classList.remove('is-on');
    if (S.panel) S.panel.classList.remove('is-info');
  }

  function setActive(id) {
    S.active = id;
    S.chipEls.forEach(function (b) { b.classList.toggle('is-active', b.dataset.hotspot === (id || 'aerial')); });
    S.markerEls.forEach(function (b) {
      if (b) b.classList.toggle('is-active', b.dataset.hotspot === id);
    });
  }

  function goHotspot(id, fromTour) {
    var h = null;
    for (var i = 0; i < HOTSPOTS.length; i++) if (HOTSPOTS[i].id === id) h = HOTSPOTS[i];
    if (!h) return;
    if (!fromTour && S.tour) endTour(false);
    setActive(id);
    showInfo(h);
    if (S.firstPerson && h.fp) flyToFp(h.fp, false);
    else flyTo(h.cam, false);
    S.auto = true;
    S.lastInput = S.time;
  }

  function goAerial(fromTour) {
    if (!fromTour && S.tour) endTour(false);
    if (S.firstPerson) setFirstPerson(false, true);
    setActive('aerial');
    hideInfoCard();
    flyTo(AERIAL, false);
    S.auto = true;
    S.lastInput = S.time;
  }

  /* ---------------------------------------------------------------- first-person camera */
  function updateViewModeUI() {
    if (!S) return;
    var fp = !!S.firstPerson;
    if (S.viewBtn) {
      S.viewBtn.classList.toggle('is-on', fp);
      S.viewBtn.querySelector('.ct-ico').textContent = fp ? '🎥' : '🚶';
      S.viewBtn.querySelector('.ct-label').textContent = fp ? 'Orbit view' : 'Walk the town';
    }
    if (S.help) {
      S.help.innerHTML = fp
        ? '<kbd>drag</kbd> look <span>·</span> <kbd>WASD</kbd> walk <span>·</span> <kbd>shift</kbd> run'
        : '<kbd>drag</kbd> orbit <span>·</span> <kbd>scroll</kbd> zoom <span>·</span> <kbd>double-click</kbd> aerial';
    }
    if (S.walkPad) S.walkPad.classList.toggle('is-on', fp);
  }

  function setFirstPerson(on, silent) {
    if (!S) return false;
    on = !!on;
    if (on === S.firstPerson) {
      updateViewModeUI();
      return on;
    }
    if (S.tour) endTour(false);
    if (on) {
      var last = S.lastFp;
      if (last) {
        S.fp.x = last.x; S.fp.y = 1.70; S.fp.z = last.z;
        S.fp.yaw = last.yaw; S.fp.pitch = clamp(last.pitch, -0.55, 0.75);
      } else {
        var pos = cameraPos(S.cam);
        S.fp.x = clamp(pos.x, -30, 30);
        S.fp.z = clamp(pos.z, -27, 32);
        S.fp.y = 1.70;
        S.fp.yaw = S.cam.yaw;
        S.fp.pitch = clamp(S.cam.pitch, -0.45, 0.55);
      }
      S.firstPerson = true;
      S.fpFly = null;
      S.fpKeys = {};
      S.fpRun = false;
    } else {
      S.lastFp = { x: S.fp.x, y: 1.70, z: S.fp.z, yaw: S.fp.yaw, pitch: S.fp.pitch };
      var cp = Math.cos(S.fp.pitch), sp = Math.sin(S.fp.pitch);
      var fx = -Math.sin(S.fp.yaw) * cp, fy = -sp, fz = -Math.cos(S.fp.yaw) * cp;
      var dist = 14;
      S.cam.tx = S.fp.x + fx * dist;
      S.cam.ty = S.fp.y + fy * dist;
      S.cam.tz = S.fp.z + fz * dist;
      S.cam.yaw = S.fp.yaw;
      S.cam.pitch = clamp(S.fp.pitch, 0.02, 0.95);
      S.cam.dist = dist;
      S.camTarget = copyCam(S.cam);
      S.firstPerson = false;
      S.fly = null;
      S.fpKeys = {};
      S.fpRun = false;
    }
    updateViewModeUI();
    updateView();
    if (!silent) showToast(on ? '步行 · first-person walk' : '俯瞰 · orbit view');
    return S.firstPerson;
  }

  function flyToFp(target, instant) {
    if (!target) return;
    S.fpFly = {
      t: 0,
      dur: instant ? 0.001 : 1.35,
      from: { x: S.fp.x, y: S.fp.y, z: S.fp.z, yaw: S.fp.yaw, pitch: S.fp.pitch },
      to: { x: target.x, y: target.y, z: target.z, yaw: target.yaw, pitch: target.pitch }
    };
    S.lastInput = S.time;
  }

  function updateFirstPerson(dt) {
    if (!S || !S.fp) return;
    var fp = S.fp;
    if (S.fpFly) {
      var f = S.fpFly;
      f.t += dt / f.dur;
      var e = easeInOut(Math.min(1, f.t));
      fp.x = lerp(f.from.x, f.to.x, e);
      fp.y = lerp(f.from.y, f.to.y, e);
      fp.z = lerp(f.from.z, f.to.z, e);
      fp.pitch = lerp(f.from.pitch, f.to.pitch, e);
      fp.yaw = f.from.yaw + angleDelta(f.from.yaw, f.to.yaw) * e;
      if (f.t >= 1) {
        fp.x = f.to.x; fp.y = f.to.y; fp.z = f.to.z;
        fp.yaw = f.to.yaw; fp.pitch = f.to.pitch;
        S.fpFly = null;
      }
    } else {
      var fw = 0, rt = 0;
      if (S.fpKeys.forward) fw += 1;
      if (S.fpKeys.back) fw -= 1;
      if (S.fpKeys.right) rt += 1;
      if (S.fpKeys.left) rt -= 1;
      var len = Math.hypot(fw, rt);
      var moving = len > 0;
      if (moving) {
        fw /= len; rt /= len;
        var speed = S.fpRun ? 7.0 : 4.2;
        var fx = -Math.sin(fp.yaw), fz = -Math.cos(fp.yaw);
        var rx = Math.cos(fp.yaw), rz = -Math.sin(fp.yaw);
        fp.x += (fx * fw + rx * rt) * speed * dt;
        fp.z += (fz * fw + rz * rt) * speed * dt;
        fp.x = clamp(fp.x, -30, 30);
        fp.z = clamp(fp.z, -27, 32);
        S.fpWalk += dt * speed;
        S.lastInput = S.time;
      }
      fp.y = 1.70 + (moving ? Math.sin(S.fpWalk * 2.2) * 0.022 : 0);
    }
    updateView();
  }

  function setNight(on) {
    S.nightOn = !!on;
    S.targetBlend = on ? 1 : 0;
    if (S.nightBtn) {
      S.nightBtn.classList.toggle('is-on', !!on);
      S.nightBtn.querySelector('.ct-label').textContent = on ? 'Night' : 'Dusk';
      S.nightBtn.querySelector('.ct-ico').textContent = on ? '🌌' : '🌙';
    }
    if (on) {
      S.fireworkTimer = Math.min(S.fireworkTimer, 0.55);
      showToast('夜色 · the town turns to night');
    } else {
      showToast('黄昏 · dusk settles again');
    }
  }

  function showToast(msg) {
    if (!S.toast) return;
    S.toast.textContent = msg;
    S.toast.classList.add('is-on');
    if (S.toastTimer) clearTimeout(S.toastTimer);
    S.toastTimer = setTimeout(function () { S.toast.classList.remove('is-on'); }, 2400);
  }

  /* ---------------------------------------------------------------- weather */
  function makeWeatherParticles(mode) {
    var w = S.view.w || window.innerWidth || 1280;
    var h = S.view.h || window.innerHeight || 720;
    var out = [];
    var n = mode === 'rain' ? 260 : 170;
    for (var i = 0; i < n; i++) {
      if (mode === 'rain') {
        out.push({
          x: rnd(-40, w + 40), y: rnd(-h * 0.2, h),
          vx: rnd(-110, -34), vy: rnd(560, 920),
          len: rnd(9, 26), a: rnd(0.10, 0.34)
        });
      } else {
        out.push({
          x: rnd(0, w), y: rnd(-h * 0.2, h),
          vx: rnd(-22, 22), vy: rnd(20, 58),
          r: rnd(0.7, 2.5), a: rnd(0.28, 0.78), phase: rnd(0, TAU)
        });
      }
    }
    return out;
  }

  function updateWeatherButton() {
    if (!S.weatherBtn) return;
    var mode = S.weather;
    S.weatherBtn.classList.toggle('is-on', mode !== 'clear');
    S.weatherBtn.querySelector('.ct-ico').textContent = mode === 'rain' ? '🌧️' : mode === 'snow' ? '❄️' : '🌦️';
    S.weatherBtn.querySelector('.ct-label').textContent = mode === 'rain' ? 'Rain' : mode === 'snow' ? 'Snow' : 'Weather';
  }

  function setWeather(mode) {
    if (!S) return 'clear';
    mode = (mode === 'rain' || mode === 'snow') ? mode : 'clear';
    if (mode === S.weather) {
      updateWeatherButton();
      return mode;
    }
    S.weather = mode;
    S.weatherFlash = 0;
    S.weatherBolt = null;
    S.weatherNext = mode === 'rain' ? rnd(4, 9) : 999;
    S.weatherParticles = mode === 'clear' ? [] : makeWeatherParticles(mode);
    updateWeatherButton();
    showToast(
      mode === 'rain' ? '烟雨 · rain over the jade canal' :
      mode === 'snow' ? '初雪 · snow on the tiled roofs' :
      '晴 · clear skies return'
    );
    return mode;
  }

  function cycleWeather() {
    var order = ['clear', 'rain', 'snow'];
    var i = order.indexOf(S.weather);
    return setWeather(order[(i + 1) % order.length]);
  }

  function makeBolt() {
    var w = S.view.w || 1280, h = S.view.h || 720;
    var x = rnd(w * 0.14, w * 0.86);
    var y = rnd(h * 0.035, h * 0.24);
    var pts = [[x, y]];
    for (var i = 0; i < 7; i++) {
      x += rnd(-w * 0.026, w * 0.026);
      y += rnd(h * 0.035, h * 0.072);
      pts.push([x, y]);
    }
    return { pts: pts, life: 0.42, max: 0.42 };
  }

  function updateWeather(dt) {
    if (!S || S.weather === 'clear') return;
    var w = S.view.w || 1280, h = S.view.h || 720;
    var rain = S.weather === 'rain';
    for (var i = 0; i < S.weatherParticles.length; i++) {
      var p = S.weatherParticles[i];
      p.x += (rain ? p.vx : p.vx + Math.sin(S.time * 0.75 + p.phase) * 13) * dt;
      p.y += p.vy * dt;
      if (p.y > h + 36 || p.x < -90 || p.x > w + 90) {
        p.y = rain ? rnd(-h * 0.25, -12) : rnd(-24, -4);
        p.x = rain ? rnd(-20, w + 50) : rnd(0, w);
      }
    }
    if (rain) {
      S.weatherNext -= dt;
      if (S.weatherNext <= 0) {
        S.weatherFlash = 1;
        S.weatherBolt = makeBolt();
        S.weatherNext = rnd(7, 17);
        TownAudio.thunder();
      }
    }
    if (S.weatherFlash > 0) S.weatherFlash = Math.max(0, S.weatherFlash - dt * 1.9);
    if (S.weatherBolt) {
      S.weatherBolt.life -= dt;
      if (S.weatherBolt.life <= 0) S.weatherBolt = null;
    }
  }

  /* ---------------------------------------------------------------- shooting stars */
  function spawnShootingStar() {
    var w = S.view.w || 1280, h = S.view.h || 720;
    S.shootingStars.push({
      x: rnd(w * 0.14, w * 0.82),
      y: rnd(h * 0.045, h * 0.28),
      vx: rnd(-w * 0.26, -w * 0.13),
      vy: rnd(h * 0.035, h * 0.12),
      life: rnd(0.9, 1.5), max: 1.5
    });
  }

  function updateShootingStars(dt) {
    S.shootingStarT -= dt;
    if (S.shootingStarT <= 0) {
      if (S.blend > 0.18) spawnShootingStar();
      S.shootingStarT = rnd(16, 34);
    }
    for (var i = S.shootingStars.length - 1; i >= 0; i--) {
      var st = S.shootingStars[i];
      st.x += st.vx * dt;
      st.y += st.vy * dt;
      st.life -= dt;
      if (st.life <= 0) S.shootingStars.splice(i, 1);
    }
  }

  /* ---------------------------------------------------------------- sound */
  function updateSoundButton() {
    if (!S.soundBtn) return;
    var on = !!S.soundOn;
    S.soundBtn.classList.toggle('is-on', on);
    S.soundBtn.querySelector('.ct-ico').textContent = on ? '🔊' : '🔇';
    S.soundBtn.querySelector('.ct-label').textContent = on ? 'Sound on' : 'Sound off';
  }

  function setSound(on) {
    if (!S) return false;
    on = !!on;
    if (on) {
      if (!TownAudio.start()) {
        S.soundOn = false;
        updateSoundButton();
        showToast('声音不可用 · audio unavailable');
        return false;
      }
      S.soundOn = true;
      showToast('音景 · ambient soundscape on');
    } else {
      TownAudio.stop();
      S.soundOn = false;
      showToast('寂静 · sound off');
    }
    updateSoundButton();
    return S.soundOn;
  }

  /* ---------------------------------------------------------------- photo mode */
  function setPhoto(on) {
    if (!S) return false;
    on = !!on;
    if (on && S.realms) closeRealms();
    if (on && S.tour) endTour(false);
    S.photo = on;
    if (S.panel) S.panel.classList.toggle('is-photo', on);
    document.body.classList.toggle('town-photo', on);
    if (S.photoBar) S.photoBar.classList.toggle('is-on', on);
    if (S.photoStatus) {
      S.photoStatus.textContent = on ? 'Drag to compose · save the frame' : '';
    }
    if (!on) {
      if (S.info && S.tour) hideInfoCard();
    }
    return S.photo;
  }

  function saveFrame() {
    if (!S || !S.canvas) return;
    try {
      var url = S.canvas.toDataURL('image/png');
      var a = document.createElement('a');
      a.href = url;
      a.download = 'jade-moon-town-' + Date.now() + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (S.photoStatus) S.photoStatus.textContent = 'Frame saved · 月玉镇';
      showToast('帧 · frame saved');
    } catch (e) {
      if (S.photoStatus) S.photoStatus.textContent = 'Could not save this frame';
    }
  }

  function openRealms() {
    S.realms.classList.add('is-open');
    S.scrim.classList.add('is-open');
    if (S.panel) S.panel.classList.add('is-realms-open');
  }
  function closeRealms() {
    S.realms.classList.remove('is-open');
    S.scrim.classList.remove('is-open');
    if (S.panel) S.panel.classList.remove('is-realms-open');
  }

  function startTour() {
    if (S.tour) return;
    S.tour = { i: 0, t: 0, dur: 7.2 };
    S.tourbar.classList.add('is-on');
    S.tourBtn.classList.add('is-on');
    tourGo(0);
  }

  function tourGo(i) {
    if (!S.tour) S.tour = { i: 0, t: 0, dur: 7.2 };
    S.tour.i = i;
    S.tour.t = 0;
    S.tourbar.classList.add('is-on');
    S.tourBtn.classList.add('is-on');
    var id = TOUR[i];
    var h = null;
    for (var k = 0; k < HOTSPOTS.length; k++) if (HOTSPOTS[k].id === id) h = HOTSPOTS[k];
    if (!h) return;
    setActive(id);
    showInfo(h);
    if (S.firstPerson && h.fp) flyToFp(h.fp, false);
    else flyTo(h.cam, false);
    S.tourProgress.style.width = '0%';
  }

  function updateTour(dt) {
    if (!S.tour) return;
    S.tour.t += dt;
    var p = clamp(S.tour.t / S.tour.dur, 0, 1);
    S.tourProgress.style.width = (p * 100).toFixed(1) + '%';
    if (S.tour.t >= S.tour.dur) {
      var next = S.tour.i + 1;
      if (next >= TOUR.length) {
        endTour(true);
        goAerial(true);
        showToast('游园终 · tour complete');
      } else {
        tourGo(next);
      }
    }
  }

  function endTour(showMsg) {
    if (!S.tour) return;
    S.tour = null;
    S.tourbar.classList.remove('is-on');
    S.tourBtn.classList.remove('is-on');
    hideInfoCard();
    if (showMsg) showToast('游园止 · tour ended');
  }

  function updateMarkers() {
    if (!S.markerEls) return;
    var w = S.view.w, h = S.view.h;
    for (var i = 0; i < HOTSPOTS.length; i++) {
      var m = S.markerEls[i];
      if (!m) continue;
      var hs = HOTSPOTS[i];
      var p = project(hs.x, hs.y, hs.z);
      if (!p || p.d < 2.0 || p.x < -70 || p.x > w + 70 || p.y < -70 || p.y > h + 70) {
        m.classList.remove('is-visible');
        continue;
      }
      m.style.left = p.x.toFixed(1) + 'px';
      m.style.top = p.y.toFixed(1) + 'px';
      m.style.setProperty('--marker-scale', clamp(p.s / 26, 0.7, 1.15).toFixed(2));
      m.classList.add('is-visible');
    }
  }

  function updateFps() {
    if (!S.fpsEl) return;
    var v = Math.round(S.realFps || S.fps);
    if (v !== S.fpsShown) {
      S.fpsShown = v;
      S.fpsEl.textContent = v + ' fps';
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Scene updates                                                      */
  /* ------------------------------------------------------------------ */

  function updateScene(dt) {
    var t = S.time;
    var i;

    // day / night blend
    S.blend += (S.targetBlend - S.blend) * Math.min(1, dt * 1.55);
    if (Math.abs(S.targetBlend - S.blend) < 0.002) S.blend = S.targetBlend;

    // people
    for (i = 0; i < S.people.length; i++) {
      var p = S.people[i];
      var len = Math.hypot(p.x2 - p.x1, p.z2 - p.z1) || 1;
      p.t += p.dir * p.speed * dt / len;
      if (p.t > 1) { p.t = 1; p.dir = -1; }
      else if (p.t < 0) { p.t = 0; p.dir = 1; }
    }
    // boats
    for (i = 0; i < S.boats.length; i++) {
      var b = S.boats[i];
      b.x += b.dir * b.speed * dt;
      if (b.x > 31) { b.x = -31; }
      else if (b.x < -31) { b.x = 31; }
    }
    // koi
    for (i = 0; i < S.koi.length; i++) {
      var k = S.koi[i];
      k.x += k.speed * dt * (k.dir || 1);
      k.z += Math.sin(t * 0.7 + k.phase) * 0.12 * dt;
      if (k.x > 23) { k.x = -23; }
      else if (k.x < -23) { k.x = 23; }
      if (k.z < 2.8) k.z = 2.8;
      if (k.z > 7.0) k.z = 7.0;
    }
    // petals
    for (i = 0; i < S.petals.length; i++) {
      var pt = S.petals[i];
      pt.y -= pt.vy * dt;
      pt.x += Math.sin(t * 1.3 + pt.phase) * 0.22 * dt;
      pt.z += Math.cos(t * 1.1 + pt.phase) * 0.14 * dt;
      pt.rot += pt.spin * dt;
      if (pt.y < 0.15) resetPetal(pt);
    }
    // fireflies
    for (i = 0; i < S.fireflies.length; i++) {
      var ff = S.fireflies[i];
      ff.x += Math.sin(t * 0.6 + ff.phase) * ff.speed * dt;
      ff.y += Math.cos(t * 0.9 + ff.phase * 1.3) * 0.22 * dt;
      ff.z += Math.sin(t * 0.4 + ff.phase) * ff.speed * dt;
      if (ff.y < 0.7) ff.y = 0.7;
      if (ff.y > 4.4) ff.y = 4.4;
      if (ff.x < -29) ff.x = 29;
      if (ff.x > 29) ff.x = -29;
      if (ff.z < -17) ff.z = 25;
      if (ff.z > 25) ff.z = -17;
    }
    // sky lanterns
    for (i = 0; i < S.skyLanterns.length; i++) {
      var sl = S.skyLanterns[i];
      sl.y += sl.speed * dt;
      sl.x += Math.sin(t * 0.35 + sl.phase) * 0.08 * dt;
      if (sl.y > 28) { sl.y = 1.5; sl.x = rnd(-26, 26); sl.z = rnd(-18, 25); }
    }
    // mist
    for (i = 0; i < S.mist.length; i++) {
      var mi = S.mist[i];
      mi.x += mi.speed * dt;
      if (mi.x > 34) mi.x = -34;
    }

    updateDragon(t);
    updateFireworks(dt);
    updateWeather(dt);
    updateShootingStars(dt);
  }

  function resetPetal(pt) {
    var tr = (S.cherryTrees && S.cherryTrees.length) ? pick(S.cherryTrees) : { x: 0, z: 0, s: 1 };
    var spread = 4 * tr.s;
    pt.x = tr.x + rnd(-spread, spread);
    pt.z = tr.z + rnd(-spread, spread);
    pt.y = rnd(4, 8.5) * tr.s;
    pt.vy = rnd(0.16, 0.4);
    pt.rot = rnd(0, TAU);
  }

  function updateDragon(t) {
    var a0 = t * 0.55;
    var pts = [];
    for (var i = 0; i < 18; i++) {
      var a = a0 - i * 0.052;
      pts.push({
        x: Math.sin(a) * 9.5 + Math.sin(a * 2.3) * 2.2,
        y: 10.2 + Math.sin(a * 1.7) * 1.05,
        z: 14 + Math.cos(a * 0.9) * 6.0,
        rot: 0
      });
    }
    var head = pts[0];
    var p1 = project(head.x, head.y, head.z);
    var p2 = project(pts[1].x, pts[1].y, pts[1].z);
    if (p1 && p2) {
      var hdx = p1.x - p2.x, hdy = p1.y - p2.y;
      if (hdx >= 0) { head.rot = Math.atan2(hdy, hdx); head.flip = false; }
      else { head.rot = Math.atan2(-hdy, -hdx); head.flip = true; }
    }
    S.dragon.head = head;
    S.dragon.body = pts.slice(1);
    var ah = a0 + 0.085;
    S.dragon.pearl = {
      x: Math.sin(ah) * 9.5 + Math.sin(ah * 2.3) * 2.2,
      y: 11.4 + Math.sin(ah * 1.7) * 1.05,
      z: 15.0 + Math.cos(ah * 0.9) * 6.0
    };
  }

  function launchFirework() {
    if (!S || !S.running) return;
    S.rockets.push({
      x: rnd(-18, 18), y: rnd(18, 26), z: rnd(-28, -12),
      vy: rnd(5.5, 8.5), age: 0, col: pick(['#ffcf6b', '#ff8a5c', '#7fe7d0', '#ff9fc0'])
    });
  }

  function burstRocket(r) {
    var col = pick(['#ffcf6b', '#ff8a5c', '#7fe7d0', '#ff9fc0', '#b8a8ff', '#ffe9c7']);
    var parts = [];
    var n = 34 + Math.floor(rnd(0, 20));
    for (var i = 0; i < n; i++) {
      var theta = rnd(0, TAU);
      var phi = Math.acos(rnd(-1, 1));
      var speed = rnd(2.4, 5.6);
      parts.push({
        x: r.x, y: r.y, z: r.z,
        vx: Math.sin(phi) * Math.cos(theta) * speed,
        vy: Math.cos(phi) * speed,
        vz: Math.sin(phi) * Math.sin(theta) * speed,
        r: rnd(0.03, 0.085)
      });
    }
    S.fireworks.push({ x: r.x, y: r.y, z: r.z, col: col, parts: parts, age: 0, life: rnd(1.7, 2.5) });
    if (S.fireworks.length > 5) S.fireworks.shift();
  }

  function updateFireworks(dt) {
    if (S.nightOn || S.blend > 0.55) {
      S.fireworkTimer -= dt;
      if (S.fireworkTimer <= 0) {
        launchFirework();
        S.fireworkTimer = rnd(4.5, 8.5);
      }
    }
    for (var i = S.rockets.length - 1; i >= 0; i--) {
      var r = S.rockets[i];
      r.y += r.vy * dt;
      r.vy -= 3.2 * dt;
      r.age += dt;
      if (r.vy <= 0 || r.age > 2.2) {
        burstRocket(r);
        S.rockets.splice(i, 1);
      }
    }
    for (var f = S.fireworks.length - 1; f >= 0; f--) {
      var fw = S.fireworks[f];
      fw.age += dt;
      for (var k = 0; k < fw.parts.length; k++) {
        var p = fw.parts[k];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vy -= 1.35 * dt;
        p.vx *= 0.992;
        p.vz *= 0.992;
      }
      if (fw.age > fw.life) S.fireworks.splice(f, 1);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Input                                                              */
  /* ------------------------------------------------------------------ */

  function bindInput() {
    var canvas = S.canvas;
    var pointers = new Map();
    var drag = null;
    var pinch = null;

    function cancelFly() {
      if (S.fly) {
        S.fly = null;
        S.camTarget = copyCam(S.cam);
      }
      if (S.fpFly) S.fpFly = null;
    }

    canvas.addEventListener('pointerdown', function (e) {
      if (!S.running) return;
      if (canvas.setPointerCapture && e.pointerId != null) {
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      S.lastInput = S.time;
      cancelFly();
      if (pointers.size === 1) {
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
        pinch = null;
      } else if (pointers.size === 2) {
        var arr = Array.from(pointers.values());
        pinch = { d: Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y), dist: S.camTarget.dist };
        drag = null;
      }
      if (S.auto) S.lastInput = S.time;
    });

    canvas.addEventListener('pointermove', function (e) {
      if (!S.running) return;
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1 && drag && drag.id === e.pointerId) {
        var dx = e.clientX - drag.x;
        var dy = e.clientY - drag.y;
        drag.x = e.clientX;
        drag.y = e.clientY;
        if (S.firstPerson) {
          S.fp.yaw -= dx * 0.0046;
          S.fp.pitch = clamp(S.fp.pitch + dy * 0.0034, -0.58, 0.78);
          S.fpFly = null;
        } else {
          S.camTarget.yaw -= dx * 0.0055;
          S.camTarget.pitch = clamp(S.camTarget.pitch + dy * 0.0038, 0.02, 0.95);
        }
        S.lastInput = S.time;
      } else if (pointers.size === 2 && pinch) {
        var arr = Array.from(pointers.values());
        var d = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
        if (pinch.d > 0) {
          S.camTarget.dist = clamp(pinch.dist * (pinch.d / Math.max(1, d)), 7, 72);
        }
        S.lastInput = S.time;
      }
    });

    function up(e) {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) { drag = null; pinch = null; }
      else if (pointers.size === 1) {
        var arr = Array.from(pointers.values());
        drag = { id: Array.from(pointers.keys())[0], x: arr[0].x, y: arr[0].y };
        pinch = null;
      }
    }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);

    canvas.addEventListener('wheel', function (e) {
      if (!S.running) return;
      e.preventDefault();
      cancelFly();
      if (S.firstPerson) {
        var step = -e.deltaY * 0.015;
        var fx = -Math.sin(S.fp.yaw), fz = -Math.cos(S.fp.yaw);
        S.fp.x = clamp(S.fp.x + fx * step, -30, 30);
        S.fp.z = clamp(S.fp.z + fz * step, -27, 32);
        S.fp.y = 1.70;
      } else {
        S.camTarget.dist = clamp(S.camTarget.dist * Math.exp(e.deltaY * 0.0011), 7, 72);
      }
      S.lastInput = S.time;
    }, { passive: false });

    canvas.addEventListener('dblclick', function () {
      goAerial(false);
    });

    window.addEventListener('keydown', function (e) {
      if (!S.running) return;
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      var key = (e.key || '').toLowerCase();
      var moveMap = {
        w: 'forward', a: 'left', s: 'back', d: 'right',
        arrowup: 'forward', arrowleft: 'left', arrowdown: 'back', arrowright: 'right'
      };
      if (S.firstPerson && moveMap[key]) {
        S.fpKeys[moveMap[key]] = true;
        S.lastInput = S.time;
        e.preventDefault();
        return;
      }
      if (key === 'shift') {
        S.fpRun = true;
        return;
      }
      if (key === 'escape') {
        if (S.photo) setPhoto(false);
        else if (S.realms.classList.contains('is-open')) closeRealms();
        else if (S.tour) endTour(true);
      } else if (key === 'arrowright') {
        var cur = S.active ? TOUR.indexOf(S.active) : -1;
        tourGo((cur + 1 + TOUR.length) % TOUR.length);
        S.tour = S.tour || { i: 0, t: 0, dur: 7.2 };
      } else if (key === 'arrowleft') {
        var cur2 = S.active ? TOUR.indexOf(S.active) : 0;
        tourGo((cur2 - 1 + TOUR.length) % TOUR.length);
      } else if (key === 'n') {
        setNight(!S.nightOn);
      } else if (key === 'r') {
        cycleWeather();
      } else if (key === 'm') {
        setSound(!S.soundOn);
      } else if (key === 'p') {
        setPhoto(!S.photo);
      } else if (key === 'v') {
        setFirstPerson(!S.firstPerson);
      } else if (key === ' ') {
        e.preventDefault();
        S.auto = !S.auto;
        showToast(S.auto ? 'auto-orbit on' : 'auto-orbit off');
      }
    });

    window.addEventListener('keyup', function (e) {
      if (!S) return;
      var key = (e.key || '').toLowerCase();
      var moveMap = {
        w: 'forward', a: 'left', s: 'back', d: 'right',
        arrowup: 'forward', arrowleft: 'left', arrowdown: 'back', arrowright: 'right'
      };
      if (moveMap[key]) S.fpKeys[moveMap[key]] = false;
      if (key === 'shift') S.fpRun = false;
    });

    window.addEventListener('blur', function () {
      if (!S) return;
      S.fpKeys = {};
      S.fpRun = false;
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Boot                                                               */
  /* ------------------------------------------------------------------ */

  function makeStars() {
    var rng = seedRng(909);
    var stars = [];
    for (var i = 0; i < 130; i++) {
      stars.push({
        x: rng(), y: rng(), s: 0.5 + rng() * 1.7,
        a: 0.25 + rng() * 0.75, ph: rng() * TAU, sp: 0.6 + rng() * 2.2
      });
    }
    return stars;
  }

  function makeRidge(seed, n, jag) {
    var rng = seedRng(seed);
    var out = [];
    var v = 0.45;
    for (var i = 0; i < n; i++) {
      v += (rng() - 0.5) * jag;
      v = clamp(v, 0.08, 1);
      out.push(v);
    }
    for (var pass = 0; pass < 2; pass++) {
      var s = out.slice();
      for (var j = 1; j < n - 1; j++) out[j] = (s[j - 1] + s[j] * 2 + s[j + 1]) / 4;
    }
    return out;
  }

  function makeClouds() {
    var rng = seedRng(515);
    var out = [];
    for (var i = 0; i < 7; i++) {
      out.push({
        x: rng(), y: 0.18 + rng() * 0.42, s: 0.7 + rng() * 0.9,
        speed: 0.0015 + rng() * 0.004, a: 0.35 + rng() * 0.5
      });
    }
    return out;
  }

  function build(panel) {
    if (S && S.app) {
      S.panel = panel;
      if (S.app.parentNode !== panel) panel.appendChild(S.app);
      resize();
      return;
    }

    S = {
      version: '1.0.0',
      panel: panel,
      running: false,
      started: false,
      mounted: false,
      time: 0,
      last: 0,
      raf: 0,
      fps: 60,
      fpsAcc: 0,
      fpsFrames: 0,
      fpsShown: 60,
      dpr: 1,
      scale: 0.86,
      perfT: 0,
      blend: 0,
      targetBlend: 0,
      nightOn: false,
      auto: true,
      firstPerson: true,
      fp: { x: 2.4, y: 1.70, z: 25.0, yaw: 0, pitch: 0.02 },
      fpFly: null,
      fpKeys: {},
      fpWalk: 0,
      fpRun: false,
      lastFp: null,
      lastInput: 0,
      active: null,
      tour: null,
      infoTimer: 0,
      toastTimer: 0,
      fireworkTimer: 3.0,
      weather: 'clear',
      weatherParticles: [],
      weatherFlash: 0,
      weatherBolt: null,
      weatherNext: 6,
      shootingStars: [],
      shootingStarT: 9,
      soundOn: false,
      photo: false,
      errors: [],
      view: { w: 0, h: 0, ox: 0, oy: 0, focal: 800, horizon: 300, camX: 0, camY: 0, camZ: 0, fx: 0, fy: 0, fz: 1, rx: 1, ry: 0, rz: 0, ux: 0, uy: 1, uz: 0 },
      cam: copyCam(HERO),
      camTarget: copyCam(HERO),
      items: [],
      pal: null
    };
    S.reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    S.scale = (window.devicePixelRatio || 1) > 1.4 ? 0.62 : 0.72;
    if (S.reduceMotion) S.auto = false;
    window.__jadeTownErrors = S.errors;
    window.addEventListener('error', function (ev) {
      if (S && S.errors) S.errors.push(String(ev.message || ev.error || 'unknown error'));
    });

    S.app = el('div', 'ct-app');
    S.app.id = 'ct-app';
    S.app.setAttribute('role', 'img');
    S.app.setAttribute('aria-label', 'Jade Moon Town — a live 3D ancient Chinese town');
    S.canvas = el('canvas', 'ct-canvas');
    S.canvas.id = 'ct-canvas';
    S.app.appendChild(S.canvas);
    panel.appendChild(S.app);
    S.ctx = S.canvas.getContext('2d');
    ctx = S.ctx;

    ensureAssets();
    ensureRenderAssets();

    S.pal = palette();
    buildWorld();
    S.cherryTrees = S.trees.filter(function (t) { return t.kind === 'cherry'; });
    S.stars = makeStars();
    S.ridges = [makeRidge(17, 28, 0.26), makeRidge(31, 24, 0.34), makeRidge(47, 20, 0.42)];
    S.clouds = makeClouds();
    S.dragon = { head: { x: 0, y: 9, z: 15, rot: 0 }, body: [] };
    updateDragon(0);

    buildUI();
    resize();
    S.mounted = true;
    S.started = true;
    bindInput();

    var onResize = function () { resize(); };
    window.addEventListener('resize', onResize);
    S.onResize = onResize;
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopLoop();
      else if (S && S.running) startLoop();
    });

    setTimeout(function () {
      if (S && S.loader) S.loader.classList.add('is-gone');
      if (S) S.app.classList.add('is-ready');
    }, 380);
  }

  function startLoop() {
    if (!S || !S.running) return;
    if (S.raf) cancelAnimationFrame(S.raf);
    S.last = performance.now() / 1000;
    S.raf = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (S && S.raf) cancelAnimationFrame(S.raf);
    if (S) S.raf = 0;
  }

  function loop(now) {
    if (!S || !S.running) { if (S) S.raf = 0; return; }
    var t = now / 1000;
    var raw = t - S.last;
    if (raw < 0 || raw > 4) raw = 0.016;
    var dt = clamp(raw, 0.001, 0.10);
    S.last = t;
    S.time += dt;
    S.fpsAcc += dt;
    S.fpsFrames++;
    if (S.fpsAcc >= 0.5) {
      S.fps = S.fpsFrames / S.fpsAcc;
      S.fpsAcc = 0;
      S.fpsFrames = 0;
    }
    S.realAcc = (S.realAcc || 0) + raw;
    S.realFrames = (S.realFrames || 0) + 1;
    if (S.realAcc >= 0.6) {
      S.realFps = S.realFrames / S.realAcc;
      S.realAcc = 0;
      S.realFrames = 0;
    }
    S.perfT += raw;
    if (S.perfT > 1.8) {
      if ((S.realFps || 60) < 27 && S.scale > 0.5) {
        S.scale = Math.max(0.5, S.scale - 0.07);
        resize();
      } else if ((S.realFps || 0) > 48 && S.scale < 0.9) {
        S.scale = Math.min(0.9, S.scale + 0.03);
        resize();
      }
      S.perfT = 0;
    }
    updateScene(dt);
    updateCamera(dt);
    if (S.tour) updateTour(dt);
    render();
    S.raf = requestAnimationFrame(loop);
  }

  function open(panel) {
    if (!S || !S.app) build(panel);
    if (!S || !S.app) return;
    if (S.app.parentNode !== panel) panel.appendChild(S.app);
    S.panel = panel;
    panel.classList.add('panel-town');
    S.mounted = true;
    S.running = true;
    if (!S.firstPerson) setFirstPerson(true, true);
    resize();
    updateWeatherButton();
    updateSoundButton();
    if (S.soundOn) {
      if (!TownAudio.start()) {
        S.soundOn = false;
        updateSoundButton();
      }
    }
    if (!S.raf) startLoop();
    if (S.loader) S.loader.classList.add('is-gone');
  }

  function close() {
    if (!S) return;
    S.running = false;
    stopLoop();
    if (S.photo) setPhoto(false);
    closeRealms();
    if (S.tour) endTour(false);
    if (S.infoTimer) { clearTimeout(S.infoTimer); S.infoTimer = 0; }
    S.fpKeys = {};
    S.fpRun = false;
    S.fpFly = null;
    TownAudio.stop();
  }

  function destroy() {
    if (!S) return;
    close();
    if (S.onResize) window.removeEventListener('resize', S.onResize);
    if (S.app && S.app.parentNode) S.app.parentNode.removeChild(S.app);
    S.mounted = false;
    S.app = null;
  }

  function getState() {
    if (!S) return { mounted: false, running: false, ready: false };
    return {
      ready: true,
      mounted: !!S.mounted,
      running: !!S.running,
      fps: Math.round(S.realFps || S.fps),
      fpsReal: Math.round(S.realFps || 0),
      scale: S.scale ? +S.scale.toFixed(2) : 1,
      time: +S.time.toFixed(2),
      night: !!S.nightOn,
      blend: +S.blend.toFixed(2),
      faces: S.polys ? S.polys.length : 0,
      lines: S.lines ? S.lines.length : 0,
      items: S.items ? S.items.length : 0,
      lanterns: S.lanterns ? S.lanterns.length : 0,
      windows: S.windows ? S.windows.length : 0,
      trees: S.trees ? S.trees.length : 0,
      people: S.people ? S.people.length : 0,
      hotspots: HOTSPOTS.length,
      tour: !!S.tour,
      active: S.active,
      viewMode: S.firstPerson ? 'first' : 'orbit',
      fp: S.fp ? { x: +S.fp.x.toFixed(2), y: +S.fp.y.toFixed(2), z: +S.fp.z.toFixed(2), yaw: +S.fp.yaw.toFixed(2), pitch: +S.fp.pitch.toFixed(2) } : null,
      weather: S.weather,
      weatherParticles: S.weatherParticles ? S.weatherParticles.length : 0,
      sound: !!S.soundOn,
      photo: !!S.photo,
      camera: copyCam(S.cam),
      size: [Math.round(S.view.w), Math.round(S.view.h)],
      errors: S.errors.slice(),
      renderer: 'canvas2d'
    };
  }

  function flyToHotspot(id) {
    if (id === 'aerial') { goAerial(false); return true; }
    for (var i = 0; i < HOTSPOTS.length; i++) {
      if (HOTSPOTS[i].id === id) { goHotspot(id, false); return true; }
    }
    return false;
  }

  // Expose a small, stable API for the tab shell and for tests.
  window.JadeTown = {
    open: open,
    close: close,
    destroy: destroy,
    flyTo: flyToHotspot,
    setNight: setNight,
    toggleNight: function () { setNight(!S.nightOn); },
    setFirstPerson: setFirstPerson,
    toggleFirstPerson: function () { return setFirstPerson(!S.firstPerson); },
    setWeather: setWeather,
    toggleWeather: cycleWeather,
    setSound: setSound,
    toggleSound: function () { return setSound(!S.soundOn); },
    setPhoto: setPhoto,
    togglePhoto: function () { return setPhoto(!S.photo); },
    saveFrame: saveFrame,
    startTour: startTour,
    endTour: endTour,
    launchFirework: launchFirework,
    setQuality: function (q) {
      if (!S || !S.canvas) return;
      S.scale = clamp(q, 0.5, 1);
      resize();
    },
    resize: resize,
    getState: getState,
    hotspots: HOTSPOTS,
    aerial: AERIAL,
    get scene() { return S; },
    version: '1.0.0'
  };
  window.__jadeTownReady = true;

})();
