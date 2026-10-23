/* ==========================================================================
 *  ENDLESS SPOOKY FOREST — util.js
 *  Math, noise, matrices, RNG, audio, storage and tiny DOM helpers.
 *  Raw JavaScript, no dependencies. Shared by every forest module.
 * ========================================================================== */
(function (root) {
  'use strict';

  var SF = root.SpookyForest = root.SpookyForest || {};

  /* ------------------------------------------------------------------ */
  /*  Small math                                                         */
  /* ------------------------------------------------------------------ */
  var EPS = 1e-6;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function invLerp(a, b, v) { return (v - a) / (b - a || EPS); }
  function smoothstep(a, b, v) {
    var t = clamp((v - a) / (b - a || EPS), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function smootherstep(a, b, v) {
    var t = clamp((v - a) / (b - a || EPS), 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  function mod(n, m) { return ((n % m) + m) % m; }
  function sign(v) { return v < 0 ? -1 : v > 0 ? 1 : 0; }
  function fract(v) { return v - Math.floor(v); }
  function approach(v, target, rate) {
    if (v < target) return Math.min(target, v + rate);
    return Math.max(target, v - rate);
  }
  function damp(current, target, lambda, dt) {
    return lerp(current, target, 1 - Math.exp(-lambda * dt));
  }
  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
  function lerpAngle(a, b, t) { return a + wrapAngle(b - a) * t; }
  function dist2(ax, az, bx, bz) {
    var dx = ax - bx, dz = az - bz;
    return dx * dx + dz * dz;
  }
  function dist3(ax, ay, az, bx, by, bz) {
    var dx = ax - bx, dy = ay - by, dz = az - bz;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  function len2(x, z) { return Math.sqrt(x * x + z * z); }
  function normalize2(x, z) {
    var l = len2(x, z) || 1;
    return [x / l, z / l];
  }
  function angleTo(ax, az, bx, bz) { return Math.atan2(bx - ax, bz - az); }

  var Ease = {
    linear: function (t) { return t; },
    inQuad: function (t) { return t * t; },
    outQuad: function (t) { return t * (2 - t); },
    inOutQuad: function (t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
    inCubic: function (t) { return t * t * t; },
    outCubic: function (t) { var u = t - 1; return u * u * u + 1; },
    inOutCubic: function (t) {
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    },
    outBack: function (t) {
      var c = 1.70158, u = t - 1;
      return 1 + (c + 1) * u * u * u + c * u * u;
    },
    outElastic: function (t) {
      if (t === 0 || t === 1) return t;
      var p = 0.35;
      return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (Math.PI * 2) / p) + 1;
    },
    inOutSine: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
    outBounce: function (t) {
      if (t < 1 / 2.75) return 7.5625 * t * t;
      if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75; }
      if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375; }
      t -= 2.625 / 2.75;
      return 7.5625 * t * t + 0.984375;
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Hashing + seeded randomness                                        */
  /* ------------------------------------------------------------------ */
  function hashInt(n) {
    n = (n ^ 61) ^ (n >>> 16);
    n = n + (n << 3);
    n = n ^ (n >>> 4);
    n = Math.imul(n, 0x27d4eb2d);
    n = n ^ (n >>> 15);
    return n >>> 0;
  }
  function hash2(x, y, seed) {
    return hashInt((x | 0) * 374761393 + (y | 0) * 668265263 + (seed | 0) * 1442695041);
  }
  function hash3(x, y, z, seed) {
    return hashInt((x | 0) * 374761393 + (y | 0) * 668265263 + (z | 0) * 2147483647 + (seed | 0) * 1442695041);
  }
  function hash01(x, y, seed) { return hash2(x, y, seed) / 4294967295; }
  function hash01_3(x, y, z, seed) { return hash3(x, y, z, seed) / 4294967295; }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function RNG(seed) {
    if (!(this instanceof RNG)) return new RNG(seed);
    this.seed = (seed | 0) || 1;
    this._s = this.seed >>> 0;
  }
  RNG.prototype.next = function () {
    // xorshift32 — tiny and deterministic across browsers.
    var x = this._s;
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    this._s = x || 0x9e3779b9;
    return this._s / 4294967296;
  };
  RNG.prototype.range = function (a, b) { return a + this.next() * (b - a); };
  RNG.prototype.int = function (a, b) { return Math.floor(this.range(a, b + 1)); };
  RNG.prototype.chance = function (p) { return this.next() < p; };
  RNG.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  RNG.prototype.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(this.next() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  RNG.prototype.unitCircle = function () {
    var a = this.next() * Math.PI * 2, r = Math.sqrt(this.next());
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  RNG.prototype.gauss = function () {
    var u = 1 - this.next(), v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
  };

  /* ------------------------------------------------------------------ */
  /*  Value noise + fBm (2D/3D)                                         */
  /* ------------------------------------------------------------------ */
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function grad2(ix, iy, seed) {
    var h = hash2(ix, iy, seed);
    var a = (h / 4294967295) * Math.PI * 2;
    return [Math.cos(a), Math.sin(a)];
  }
  function perlin2(x, y, seed) {
    var x0 = Math.floor(x), y0 = Math.floor(y);
    var xf = x - x0, yf = y - y0;
    var u = fade(xf), v = fade(yf);
    function dot(ix, iy, dx, dy) {
      var g = grad2(ix, iy, seed);
      return g[0] * dx + g[1] * dy;
    }
    var n00 = dot(x0, y0, xf, yf);
    var n10 = dot(x0 + 1, y0, xf - 1, yf);
    var n01 = dot(x0, y0 + 1, xf, yf - 1);
    var n11 = dot(x0 + 1, y0 + 1, xf - 1, yf - 1);
    return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
  }
  function value2(x, y, seed) {
    var x0 = Math.floor(x), y0 = Math.floor(y);
    var xf = x - x0, yf = y - y0;
    var u = fade(xf), v = fade(yf);
    var a = hash01(x0, y0, seed);
    var b = hash01(x0 + 1, y0, seed);
    var c = hash01(x0, y0 + 1, seed);
    var d = hash01(x0 + 1, y0 + 1, seed);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }
  function fbm2(x, y, seed, octaves, lacunarity, gain) {
    octaves = octaves || 4; lacunarity = lacunarity || 2; gain = gain === undefined ? 0.5 : gain;
    var sum = 0, amp = 1, freq = 1, norm = 0;
    for (var i = 0; i < octaves; i++) {
      sum += value2(x * freq, y * freq, seed + i * 1013) * amp;
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / (norm || 1);
  }
  function ridged2(x, y, seed, octaves) {
    octaves = octaves || 4;
    var sum = 0, amp = 1, freq = 1, norm = 0;
    for (var i = 0; i < octaves; i++) {
      var v = 1 - Math.abs(value2(x * freq, y * freq, seed + i * 733) * 2 - 1);
      sum += v * v * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.07;
    }
    return sum / norm;
  }
  function value3(x, y, z, seed) {
    var x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
    var xf = x - x0, yf = y - y0, zf = z - z0;
    var u = fade(xf), v = fade(yf), w = fade(zf);
    function h(i, j, k) { return hash01_3(x0 + i, y0 + j, z0 + k, seed); }
    var x00 = lerp(h(0, 0, 0), h(1, 0, 0), u);
    var x10 = lerp(h(0, 1, 0), h(1, 1, 0), u);
    var x01 = lerp(h(0, 0, 1), h(1, 0, 1), u);
    var x11 = lerp(h(0, 1, 1), h(1, 1, 1), u);
    return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
  }
  function fbm3(x, y, z, seed, octaves) {
    octaves = octaves || 3;
    var s = 0, a = 1, f = 1, n = 0;
    for (var i = 0; i < octaves; i++) {
      s += value3(x * f, y * f, z * f, seed + i * 991) * a;
      n += a; a *= 0.55; f *= 2.03;
    }
    return s / n;
  }

  /* ------------------------------------------------------------------ */
  /*  Matrices (column-major, WebGL friendly)                           */
  /* ------------------------------------------------------------------ */
  var Mat4 = {
    create: function () {
      return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    },
    identity: function (out) {
      out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0;
      out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
      out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
      out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
      return out;
    },
    copy: function (out, a) {
      for (var i = 0; i < 16; i++) out[i] = a[i];
      return out;
    },
    multiply: function (out, a, b) {
      var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      for (var i = 0; i < 4; i++) {
        var b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
        out[i * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      }
      return out;
    },
    fromTranslation: function (out, x, y, z) {
      Mat4.identity(out);
      out[12] = x; out[13] = y; out[14] = z;
      return out;
    },
    fromScale: function (out, x, y, z) {
      Mat4.identity(out);
      out[0] = x; out[5] = y; out[10] = z;
      return out;
    },
    fromRotationX: function (out, r) {
      var c = Math.cos(r), s = Math.sin(r);
      Mat4.identity(out);
      out[5] = c; out[6] = s; out[9] = -s; out[10] = c;
      return out;
    },
    fromRotationY: function (out, r) {
      var c = Math.cos(r), s = Math.sin(r);
      Mat4.identity(out);
      out[0] = c; out[2] = -s; out[8] = s; out[10] = c;
      return out;
    },
    fromRotationZ: function (out, r) {
      var c = Math.cos(r), s = Math.sin(r);
      Mat4.identity(out);
      out[0] = c; out[1] = s; out[4] = -s; out[5] = c;
      return out;
    },
    perspective: function (out, fovy, aspect, near, far) {
      var f = 1 / Math.tan(fovy / 2);
      out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
      out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
      out[8] = 0; out[9] = 0; out[10] = (far + near) / (near - far); out[11] = -1;
      out[12] = 0; out[13] = 0; out[14] = (2 * far * near) / (near - far); out[15] = 0;
      return out;
    },
    lookAt: function (out, eye, center, up) {
      var z0 = eye[0] - center[0], z1 = eye[1] - center[1], z2 = eye[2] - center[2];
      var len = Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2) || 1;
      z0 /= len; z1 /= len; z2 /= len;
      var x0 = up[1] * z2 - up[2] * z1;
      var x1 = up[2] * z0 - up[0] * z2;
      var x2 = up[0] * z1 - up[1] * z0;
      len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2) || 1;
      x0 /= len; x1 /= len; x2 /= len;
      var y0 = z1 * x2 - z2 * x1;
      var y1 = z2 * x0 - z0 * x2;
      var y2 = z0 * x1 - z1 * x0;
      out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
      out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
      out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
      out[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]);
      out[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
      out[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
      out[15] = 1;
      return out;
    },
    compose: function (out, px, py, pz, rx, ry, rz, sx, sy, sz) {
      var cx = Math.cos(rx), sxr = Math.sin(rx);
      var cy = Math.cos(ry), syr = Math.sin(ry);
      var cz = Math.cos(rz), szr = Math.sin(rz);
      // R = Ry * Rx * Rz
      var m00 = cy * cz + syr * sxr * szr;
      var m01 = cx * szr;
      var m02 = -syr * cz + cy * sxr * szr;
      var m10 = -cy * szr + syr * sxr * cz;
      var m11 = cx * cz;
      var m12 = syr * szr + cy * sxr * cz;
      var m20 = syr * cx;
      var m21 = -sxr;
      var m22 = cy * cx;
      out[0] = m00 * sx; out[1] = m01 * sx; out[2] = m02 * sx; out[3] = 0;
      out[4] = m10 * sy; out[5] = m11 * sy; out[6] = m12 * sy; out[7] = 0;
      out[8] = m20 * sz; out[9] = m21 * sz; out[10] = m22 * sz; out[11] = 0;
      out[12] = px; out[13] = py; out[14] = pz; out[15] = 1;
      return out;
    },
    transformPoint: function (m, x, y, z) {
      return [
        m[0] * x + m[4] * y + m[8] * z + m[12],
        m[1] * x + m[5] * y + m[9] * z + m[13],
        m[2] * x + m[6] * y + m[10] * z + m[14]
      ];
    },
    transformNormal: function (m, x, y, z) {
      var nx = m[0] * x + m[4] * y + m[8] * z;
      var ny = m[1] * x + m[5] * y + m[9] * z;
      var nz = m[2] * x + m[6] * y + m[10] * z;
      var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      return [nx / l, ny / l, nz / l];
    },
    invert: function (out, a) {
      var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      var b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10;
      var b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
      var b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
      var b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
      var b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31;
      var b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
      var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) return Mat4.identity(out);
      det = 1 / det;
      out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      return out;
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Frustum planes + sphere test                                      */
  /* ------------------------------------------------------------------ */
  function frustumFromMatrix(m) {
    var p = [];
    function plane(a, b, c, d) {
      var l = Math.sqrt(a * a + b * b + c * c) || 1;
      p.push([a / l, b / l, c / l, d / l]);
    }
    plane(m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]);
    plane(m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]);
    plane(m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]);
    plane(m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]);
    plane(m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]);
    plane(m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]);
    return p;
  }
  function sphereInFrustum(planes, x, y, z, r) {
    for (var i = 0; i < 6; i++) {
      var p = planes[i];
      if (p[0] * x + p[1] * y + p[2] * z + p[3] < -r) return false;
    }
    return true;
  }

  /* ------------------------------------------------------------------ */
  /*  Colors                                                             */
  /* ------------------------------------------------------------------ */
  function hexToRgb(hex) {
    if (hex.charAt(0) === '#') hex = hex.slice(1);
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return [parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255];
  }
  function rgbToHex(r, g, b) {
    function h(v) { var s = Math.round(clamp(v, 0, 1) * 255).toString(16); return s.length < 2 ? '0' + s : s; }
    return '#' + h(r) + h(g) + h(b);
  }
  function shade(rgb, f) { return [rgb[0] * f, rgb[1] * f, rgb[2] * f]; }
  function mixRgb(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  }
  function hslToRgb(h, s, l) {
    h = mod(h, 1);
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(mod(h * 6, 2) - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 1 / 6) { r = c; g = x; }
    else if (h < 2 / 6) { r = x; g = c; }
    else if (h < 3 / 6) { g = c; b = x; }
    else if (h < 4 / 6) { g = x; b = c; }
    else if (h < 5 / 6) { r = x; b = c; }
    else { r = c; b = x; }
    return [r + m, g + m, b + m];
  }
  function jitterColor(rgb, rng, amount) {
    var j = (rng.next() - 0.5) * amount;
    return [clamp(rgb[0] + j, 0, 1), clamp(rgb[1] + j, 0, 1), clamp(rgb[2] + j, 0, 1)];
  }
  function rgbCss(rgb) {
    return 'rgb(' + Math.round(clamp(rgb[0], 0, 1) * 255) + ',' +
      Math.round(clamp(rgb[1], 0, 1) * 255) + ',' +
      Math.round(clamp(rgb[2], 0, 1) * 255) + ')';
  }

  /* ------------------------------------------------------------------ */
  /*  Collections                                                        */
  /* ------------------------------------------------------------------ */
  function EventBus() { this._map = {}; }
  EventBus.prototype.on = function (name, fn) {
    (this._map[name] = this._map[name] || []).push(fn);
    return this;
  };
  EventBus.prototype.off = function (name, fn) {
    var list = this._map[name];
    if (!list) return this;
    var i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
    return this;
  };
  EventBus.prototype.emit = function (name, a, b, c) {
    var list = this._map[name];
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      try { list[i](a, b, c); } catch (e) { if (root.console) console.warn('[forest event]', name, e); }
    }
  };

  function Pool(factory, reset, size) {
    this.factory = factory;
    this.reset = reset || function () {};
    this.free = [];
    this.active = [];
    for (var i = 0; i < (size || 0); i++) this.free.push(factory());
  }
  Pool.prototype.get = function () {
    var item = this.free.pop() || this.factory();
    this.active.push(item);
    return item;
  };
  Pool.prototype.release = function (item) {
    var i = this.active.indexOf(item);
    if (i >= 0) this.active.splice(i, 1);
    this.reset(item);
    this.free.push(item);
  };

  function SpatialHash(cell) {
    this.cell = cell || 8;
    this.map = {};
  }
  SpatialHash.prototype._key = function (x, z) {
    return Math.floor(x / this.cell) + ':' + Math.floor(z / this.cell);
  };
  SpatialHash.prototype.insert = function (obj, x, z) {
    var k = this._key(x, z);
    (this.map[k] = this.map[k] || []).push(obj);
  };
  SpatialHash.prototype.near = function (x, z, radius) {
    var out = [];
    var r = Math.ceil(radius / this.cell);
    var cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell);
    for (var i = -r; i <= r; i++) for (var j = -r; j <= r; j++) {
      var list = this.map[(cx + i) + ':' + (cz + j)];
      if (!list) continue;
      for (var n = 0; n < list.length; n++) out.push(list[n]);
    }
    return out;
  };
  SpatialHash.prototype.clear = function () { this.map = {}; };

  /* ------------------------------------------------------------------ */
  /*  Device, storage, DOM, audio                                        */
  /* ------------------------------------------------------------------ */
  var Device = {
    isTouch: (typeof root.navigator !== 'undefined') &&
      ('ontouchstart' in root || (root.navigator.maxTouchPoints || 0) > 0),
    isMobile: /Android|iPhone|iPad|iPod|Mobile/i.test(
      (typeof root.navigator !== 'undefined' && root.navigator.userAgent) || ''),
    reduceMotion: (typeof root.matchMedia === 'function') &&
      root.matchMedia('(prefers-reduced-motion: reduce)').matches,
    dpr: Math.min(2, (root.devicePixelRatio || 1))
  };

  var Storage = {
    get: function (key, fallback) {
      try {
        var raw = root.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { root.localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    remove: function (key) {
      try { root.localStorage.removeItem(key); } catch (e) {}
    }
  };

  function $(sel, ctx) { return (ctx || root.document).querySelector(sel); }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || root.document).querySelectorAll(sel));
  }
  function el(tag, cls, html) {
    var e = root.document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function on(target, type, fn, opts) {
    if (!target) return;
    target.addEventListener(type, fn, opts || false);
    return fn;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function formatTime(hours) {
    var h = Math.floor(mod(hours, 24));
    var m = Math.floor(mod(hours, 1) * 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 10000) return (n / 1000).toFixed(1) + 'k';
    return String(Math.floor(n));
  }

  /* ------------------------------------------------------------------ */
  /*  Tiny WebAudio synthesiser (no assets, all procedural)             */
  /* ------------------------------------------------------------------ */
  var Audio = {
    ctx: null, master: null, enabled: true, volume: 0.55, _lastStep: 0,
    init: function () {
      if (this.ctx) return this.ctx;
      var C = root.AudioContext || root.webkitAudioContext;
      if (!C) return null;
      try {
        this.ctx = new C();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? this.volume : 0;
        this.master.connect(this.ctx.destination);
      } catch (e) { this.ctx = null; }
      return this.ctx;
    },
    resume: function () {
      var c = this.init();
      if (c && c.state === 'suspended') c.resume();
    },
    setEnabled: function (on) {
      this.enabled = !!on;
      if (this.master) this.master.gain.value = this.enabled ? this.volume : 0;
    },
    setVolume: function (v) {
      this.volume = clamp(v, 0, 1);
      if (this.master) this.master.gain.value = this.enabled ? this.volume : 0;
    },
    tone: function (freq, dur, type, gain, slideTo, delay) {
      var c = this.init();
      if (!c || !this.enabled) return;
      var t0 = c.currentTime + (delay || 0);
      var osc = c.createOscillator();
      var g = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(this.master);
      osc.start(t0); osc.stop(t0 + dur + 0.03);
    },
    noise: function (dur, gain, filterHz, delay) {
      var c = this.init();
      if (!c || !this.enabled) return;
      var t0 = c.currentTime + (delay || 0);
      var len = Math.max(1, Math.floor(c.sampleRate * dur));
      var buf = c.createBuffer(1, len, c.sampleRate);
      var data = buf.getChannelData(0);
      var last = 0;
      for (var i = 0; i < len; i++) {
        var white = Math.random() * 2 - 1;
        last = last * 0.75 + white * 0.25;
        data[i] = last;
      }
      var src = c.createBufferSource();
      src.buffer = buf;
      var f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filterHz || 900;
      var g = c.createGain();
      g.gain.setValueAtTime(gain || 0.1, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t0);
    },
    squeak: function (pitch) {
      pitch = pitch || 1;
      this.tone(880 * pitch, 0.09, 'square', 0.05, 1500 * pitch);
      this.tone(1320 * pitch, 0.06, 'sine', 0.035, 1900 * pitch, 0.05);
    },
    thump: function () {
      this.tone(90, 0.12, 'sine', 0.15, 48);
      this.noise(0.06, 0.05, 400);
    },
    chirp: function () {
      var base = 1500 + Math.random() * 1200;
      this.tone(base, 0.05, 'sine', 0.025, base * 1.4);
      this.tone(base * 1.2, 0.04, 'sine', 0.02, base * 1.7, 0.06);
    },
    crackle: function () {
      this.noise(0.05 + Math.random() * 0.09, 0.045, 2200 + Math.random() * 2500);
    },
    chime: function () {
      this.tone(660, 0.3, 'sine', 0.055, 880);
      this.tone(990, 0.4, 'sine', 0.03, 1320, 0.08);
    },
    pop: function () {
      this.tone(420, 0.07, 'triangle', 0.08, 760);
    },
    whoosh: function () {
      this.noise(0.35, 0.05, 700);
    },
    step: function (surface) {
      var now = (root.performance ? performance.now() : Date.now());
      if (now - this._lastStep < 120) return;
      this._lastStep = now;
      this.noise(0.08, 0.035, surface === 'water' ? 500 : surface === 'snow' ? 1600 : 800);
    },
    owl: function () {
      this.tone(380, 0.25, 'sine', 0.04, 300);
      this.tone(330, 0.4, 'sine', 0.03, 260, 0.32);
    },
    thunder: function () {
      this.noise(1.8, 0.16, 180);
      this.tone(42, 1.5, 'sine', 0.1, 28);
    },
    ignite: function () {
      this.noise(0.7, 0.12, 3200);
      this.tone(120, 0.4, 'sawtooth', 0.03, 60);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Names + flavour banks                                             */
  /* ------------------------------------------------------------------ */
  var NAMES = {
    rabbit: ['Thistle', 'Marlow', 'Pip', 'Hazel', 'Bramble', 'Clover', 'Nib', 'Sorrel',
      'Juniper', 'Moss', 'Pebble', 'Fennel', 'Wisp', 'Bramble', 'Dandelion', 'Soot',
      'Maple', 'Rook', 'Tansy', 'Velvet', 'Cinder', 'Willow', 'Nutmeg', 'Oat'],
    campfire: ['The Hollow Hearth', 'Widow’s Rest', 'The Ember Ring', 'Old Miner’s Fire',
      'The Lantern Circle', 'Bramble Camp', 'The Quiet Flame', 'Rook’s Roost',
      'The Sugarfire', 'Gravewatch Camp'],
    story: [
      'They say the forest counts every step you take. When the count reaches zero, the trees lean in to listen.',
      'A rabbit once dug so deep it found a star. It has been trying to put it back ever since.',
      'The campfire remembers everyone who warmed their hands here. On cold nights it whispers their names.',
      'If you hear a second set of footsteps, do not stop. The forest is only walking you home.',
      'The pumpkins are not growing. They are arriving.',
      'A lantern left burning at the edge of the pines will guide a lost ghost — or invite one.',
      'The oldest tree has no rings. It is still deciding how old it wants to be.',
      'Carrots pulled under a blood moon taste faintly of thunder.',
      'Rabbits can see the seams between worlds. That is why they blink so often.',
      'A campfire dies three times: once in the wood, once in the flame, and once in the memory of the one who lit it.'
    ]
  };

  function makeId() {
    return Math.floor(Math.random() * 0xffffffff).toString(36) +
      Date.now().toString(36).slice(-4);
  }

  function randomFrom(rng, arr) { return arr[Math.floor((rng ? rng.next() : Math.random()) * arr.length)]; }

  /* ------------------------------------------------------------------ */
  /*  Export                                                            */
  /* ------------------------------------------------------------------ */
  SF.Util = {
    EPS: EPS,
    clamp: clamp, lerp: lerp, invLerp: invLerp,
    smoothstep: smoothstep, smootherstep: smootherstep,
    mod: mod, sign: sign, fract: fract, approach: approach, damp: damp,
    wrapAngle: wrapAngle, lerpAngle: lerpAngle,
    dist2: dist2, dist3: dist3, len2: len2, normalize2: normalize2, angleTo: angleTo,
    Ease: Ease,
    hashInt: hashInt, hash2: hash2, hash3: hash3, hash01: hash01, hash01_3: hash01_3,
    mulberry32: mulberry32, RNG: RNG,
    perlin2: perlin2, value2: value2, value3: value3, fbm2: fbm2, fbm3: fbm3, ridged2: ridged2,
    Mat4: Mat4, frustumFromMatrix: frustumFromMatrix, sphereInFrustum: sphereInFrustum,
    hexToRgb: hexToRgb, rgbToHex: rgbToHex, shade: shade, mixRgb: mixRgb,
    hslToRgb: hslToRgb, jitterColor: jitterColor, rgbCss: rgbCss,
    EventBus: EventBus, Pool: Pool, SpatialHash: SpatialHash,
    Device: Device, Storage: Storage, Audio: Audio,
    $: $, $$: $$, el: el, on: on, esc: esc,
    formatTime: formatTime, formatNumber: formatNumber,
    NAMES: NAMES, makeId: makeId, randomFrom: randomFrom
  };

  SF.bus = new EventBus();
  SF.VERSION = '2.0.0-endless';
  SF.build = 19;

  if (root.console && root.console.log) {
    console.log('%c🌲 Endless Spooky Forest ' + SF.VERSION + ' util ready', 'color:#8fe388');
  }
})(typeof window !== 'undefined' ? window : globalThis);
