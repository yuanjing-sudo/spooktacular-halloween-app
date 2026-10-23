/* ==========================================================================
 *  ENDLESS SPOOKY FOREST — mesh.js
 *  A small procedural geometry builder. Everything in the forest is made
 *  from these primitives: low-poly boxes, ellipsoids, cylinders, cones,
 *  leaves, rocks and stars. Static chunks and animated critters share it.
 * ========================================================================== */
(function (root) {
  'use strict';

  var SF = root.SpookyForest = root.SpookyForest || {};
  var U = SF.Util;
  var M = U.Mat4;

  function MeshBuilder(capacity) {
    capacity = capacity || 4096;
    this.pos = new Float32Array(capacity * 3);
    this.nrm = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.emi = new Float32Array(capacity);
    this.count = 0;
    this.capacity = capacity;
    this.matrix = M.create();
    this.stack = [];
    this.color = [1, 1, 1];
    this.emissive = 0;
    this.alpha = 1;
    this._tmp = M.create();
  }

  MeshBuilder.prototype._grow = function (need) {
    if (this.count + need <= this.capacity) return;
    var cap = this.capacity;
    while (cap < this.count + need) cap *= 2;
    var pos = new Float32Array(cap * 3);
    var nrm = new Float32Array(cap * 3);
    var col = new Float32Array(cap * 3);
    var emi = new Float32Array(cap);
    pos.set(this.pos); nrm.set(this.nrm); col.set(this.col); emi.set(this.emi);
    this.pos = pos; this.nrm = nrm; this.col = col; this.emi = emi;
    this.capacity = cap;
  };

  MeshBuilder.prototype.setColor = function (r, g, b) {
    if (Array.isArray(r)) { this.color = [r[0], r[1], r[2]]; }
    else { this.color = [r, g, b]; }
    return this;
  };
  MeshBuilder.prototype.setEmissive = function (v) { this.emissive = v; return this; };
  MeshBuilder.prototype.resetStyle = function () {
    this.emissive = 0; this.alpha = 1;
    return this;
  };
  MeshBuilder.prototype.push = function () {
    var c = M.create();
    M.copy(c, this.matrix);
    this.stack.push(c);
    return this;
  };
  MeshBuilder.prototype.pop = function () {
    var m = this.stack.pop();
    if (m) this.matrix = m;
    return this;
  };
  MeshBuilder.prototype.identity = function () {
    M.identity(this.matrix);
    return this;
  };
  MeshBuilder.prototype.translate = function (x, y, z) {
    M.fromTranslation(this._tmp, x, y, z);
    M.multiply(this.matrix, this.matrix, this._tmp);
    return this;
  };
  MeshBuilder.prototype.rotateX = function (r) {
    M.fromRotationX(this._tmp, r);
    M.multiply(this.matrix, this.matrix, this._tmp);
    return this;
  };
  MeshBuilder.prototype.rotateY = function (r) {
    M.fromRotationY(this._tmp, r);
    M.multiply(this.matrix, this.matrix, this._tmp);
    return this;
  };
  MeshBuilder.prototype.rotateZ = function (r) {
    M.fromRotationZ(this._tmp, r);
    M.multiply(this.matrix, this.matrix, this._tmp);
    return this;
  };
  MeshBuilder.prototype.scale = function (x, y, z) {
    M.fromScale(this._tmp, x, y === undefined ? x : y, z === undefined ? x : z);
    M.multiply(this.matrix, this.matrix, this._tmp);
    return this;
  };
  MeshBuilder.prototype.apply = function (mat) {
    M.multiply(this.matrix, this.matrix, mat);
    return this;
  };
  MeshBuilder.prototype.setMatrix = function (mat) {
    M.copy(this.matrix, mat);
    return this;
  };

  MeshBuilder.prototype.vertex = function (x, y, z, nx, ny, nz, r, g, b, e) {
    this._grow(1);
    var i = this.count;
    var p = M.transformPoint(this.matrix, x, y, z);
    var n = M.transformNormal(this.matrix, nx, ny, nz);
    this.pos[i * 3] = p[0]; this.pos[i * 3 + 1] = p[1]; this.pos[i * 3 + 2] = p[2];
    this.nrm[i * 3] = n[0]; this.nrm[i * 3 + 1] = n[1]; this.nrm[i * 3 + 2] = n[2];
    if (r === undefined) { r = this.color[0]; g = this.color[1]; b = this.color[2]; }
    this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b;
    this.emi[i] = e === undefined ? this.emissive : e;
    this.count++;
    return this;
  };

  /* Flat triangle. Winding must be counter-clockwise when seen from the
   * direction the normal points. */
  MeshBuilder.prototype.tri = function (a, b, c, color, emissive, normal) {
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    var vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    var nx = uy * vz - uz * vy;
    var ny = uz * vx - ux * vz;
    var nz = ux * vy - uy * vx;
    var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    if (normal) { nx = normal[0]; ny = normal[1]; nz = normal[2]; }
    else { nx /= l; ny /= l; nz /= l; }
    var col = color || this.color;
    var e = emissive === undefined ? this.emissive : emissive;
    this.vertex(a[0], a[1], a[2], nx, ny, nz, col[0], col[1], col[2], e);
    this.vertex(b[0], b[1], b[2], nx, ny, nz, col[0], col[1], col[2], e);
    this.vertex(c[0], c[1], c[2], nx, ny, nz, col[0], col[1], col[2], e);
    return this;
  };

  /* Quad as two triangles. p0..p3 clockwise or counter-clockwise works:
   * the normal is derived from the first triangle and used for both. */
  MeshBuilder.prototype.quad = function (p0, p1, p2, p3, color, emissive, normal) {
    var ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
    var vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
    var nx = uy * vz - uz * vy;
    var ny = uz * vx - ux * vz;
    var nz = ux * vy - uy * vx;
    var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    if (normal) { nx = normal[0]; ny = normal[1]; nz = normal[2]; }
    else { nx /= l; ny /= l; nz /= l; }
    var col = color || this.color;
    var e = emissive === undefined ? this.emissive : emissive;
    this.vertex(p0[0], p0[1], p0[2], nx, ny, nz, col[0], col[1], col[2], e);
    this.vertex(p1[0], p1[1], p1[2], nx, ny, nz, col[0], col[1], col[2], e);
    this.vertex(p2[0], p2[1], p2[2], nx, ny, nz, col[0], col[1], col[2], e);
    this.vertex(p0[0], p0[1], p0[2], nx, ny, nz, col[0], col[1], col[2], e);
    this.vertex(p2[0], p2[1], p2[2], nx, ny, nz, col[0], col[1], col[2], e);
    this.vertex(p3[0], p3[1], p3[2], nx, ny, nz, col[0], col[1], col[2], e);
    return this;
  };

  MeshBuilder.prototype.box = function (cx, cy, cz, sx, sy, sz, color, emissive) {
    var x0 = cx - sx / 2, x1 = cx + sx / 2;
    var y0 = cy - sy / 2, y1 = cy + sy / 2;
    var z0 = cz - sz / 2, z1 = cz + sz / 2;
    var c = color || this.color;
    var e = emissive === undefined ? this.emissive : emissive;
    // Slight per-face tint keeps boxes readable without textures.
    var fs = 0.92, ft = 1.0, fb = 0.55, fz = 0.82;
    this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0],
      [c[0] * ft, c[1] * ft, c[2] * ft], e);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
      [c[0] * fb, c[1] * fb, c[2] * fb], e);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
      [c[0] * fz, c[1] * fz, c[2] * fz], e);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0],
      [c[0] * fz, c[1] * fz, c[2] * fz], e);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1],
      [c[0] * fs, c[1] * fs, c[2] * fs], e);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0],
      [c[0] * fs, c[1] * fs, c[2] * fs], e);
    return this;
  };

  MeshBuilder.prototype.boxRot = function (cx, cy, cz, sx, sy, sz, rx, ry, rz, color, emissive) {
    this.push();
    this.translate(cx, cy, cz);
    this.rotateY(ry);
    this.rotateX(rx);
    this.rotateZ(rz);
    this.box(0, 0, 0, sx, sy, sz, color, emissive);
    this.pop();
    return this;
  };

  MeshBuilder.prototype.ellipsoid = function (cx, cy, cz, rx, ry, rz, segs, rings, color, emissive, squashBottom) {
    segs = Math.max(4, segs || 10);
    rings = Math.max(3, rings || 6);
    var c = color || this.color;
    var e = emissive === undefined ? this.emissive : emissive;
    var pi = Math.PI;
    for (var j = 0; j < rings; j++) {
      var phi0 = (j / rings) * pi;
      var phi1 = ((j + 1) / rings) * pi;
      for (var i = 0; i < segs; i++) {
        var th0 = (i / segs) * pi * 2;
        var th1 = ((i + 1) / segs) * pi * 2;
        var p00 = [
          cx + rx * Math.sin(phi0) * Math.cos(th0),
          cy + ry * Math.cos(phi0),
          cz + rz * Math.sin(phi0) * Math.sin(th0)
        ];
        var p10 = [
          cx + rx * Math.sin(phi0) * Math.cos(th1),
          cy + ry * Math.cos(phi0),
          cz + rz * Math.sin(phi0) * Math.sin(th1)
        ];
        var p11 = [
          cx + rx * Math.sin(phi1) * Math.cos(th1),
          cy + ry * Math.cos(phi1),
          cz + rz * Math.sin(phi1) * Math.sin(th1)
        ];
        var p01 = [
          cx + rx * Math.sin(phi1) * Math.cos(th0),
          cy + ry * Math.cos(phi1),
          cz + rz * Math.sin(phi1) * Math.sin(th0)
        ];
        if (squashBottom) {
          p00[1] = Math.max(p00[1], cy - ry * 0.55);
          p10[1] = Math.max(p10[1], cy - ry * 0.55);
          p11[1] = Math.max(p11[1], cy - ry * 0.55);
          p01[1] = Math.max(p01[1], cy - ry * 0.55);
        }
        var n00 = [Math.sin(phi0) * Math.cos(th0), Math.cos(phi0), Math.sin(phi0) * Math.sin(th0)];
        var n10 = [Math.sin(phi0) * Math.cos(th1), Math.cos(phi0), Math.sin(phi0) * Math.sin(th1)];
        var n11 = [Math.sin(phi1) * Math.cos(th1), Math.cos(phi1), Math.sin(phi1) * Math.sin(th1)];
        var n01 = [Math.sin(phi1) * Math.cos(th0), Math.cos(phi1), Math.sin(phi1) * Math.sin(th0)];
        // Two triangles with smooth normals.
        this.vertex(p00[0], p00[1], p00[2], n00[0], n00[1], n00[2], c[0], c[1], c[2], e);
        this.vertex(p10[0], p10[1], p10[2], n10[0], n10[1], n10[2], c[0], c[1], c[2], e);
        this.vertex(p11[0], p11[1], p11[2], n11[0], n11[1], n11[2], c[0], c[1], c[2], e);
        this.vertex(p00[0], p00[1], p00[2], n00[0], n00[1], n00[2], c[0], c[1], c[2], e);
        this.vertex(p11[0], p11[1], p11[2], n11[0], n11[1], n11[2], c[0], c[1], c[2], e);
        this.vertex(p01[0], p01[1], p01[2], n01[0], n01[1], n01[2], c[0], c[1], c[2], e);
      }
    }
    return this;
  };

  MeshBuilder.prototype.sphere = function (cx, cy, cz, r, segs, rings, color, emissive) {
    return this.ellipsoid(cx, cy, cz, r, r, r, segs, rings, color, emissive);
  };

  /* Cylinder along +Y. Bottoms are centered at cy. */
  MeshBuilder.prototype.cylinder = function (cx, cy, cz, rBottom, rTop, height, segs, color, emissive, capTop, capBottom) {
    segs = Math.max(4, segs || 8);
    var c = color || this.color;
    var e = emissive === undefined ? this.emissive : emissive;
    var y0 = cy, y1 = cy + height;
    for (var i = 0; i < segs; i++) {
      var a0 = (i / segs) * Math.PI * 2;
      var a1 = ((i + 1) / segs) * Math.PI * 2;
      var c0 = Math.cos(a0), s0 = Math.sin(a0);
      var c1 = Math.cos(a1), s1 = Math.sin(a1);
      var p0 = [cx + c0 * rBottom, y0, cz + s0 * rBottom];
      var p1 = [cx + c1 * rBottom, y0, cz + s1 * rBottom];
      var p2 = [cx + c1 * rTop, y1, cz + s1 * rTop];
      var p3 = [cx + c0 * rTop, y1, cz + s0 * rTop];
      var n0 = [c0, 0, s0], n1 = [c1, 0, s1];
      this.vertex(p0[0], p0[1], p0[2], n0[0], n0[1], n0[2], c[0] * 0.86, c[1] * 0.86, c[2] * 0.86, e);
      this.vertex(p1[0], p1[1], p1[2], n1[0], n1[1], n1[2], c[0] * 0.86, c[1] * 0.86, c[2] * 0.86, e);
      this.vertex(p2[0], p2[1], p2[2], n1[0], n1[1], n1[2], c[0], c[1], c[2], e);
      this.vertex(p0[0], p0[1], p0[2], n0[0], n0[1], n0[2], c[0] * 0.86, c[1] * 0.86, c[2] * 0.86, e);
      this.vertex(p2[0], p2[1], p2[2], n1[0], n1[1], n1[2], c[0], c[1], c[2], e);
      this.vertex(p3[0], p3[1], p3[2], n0[0], n0[1], n0[2], c[0], c[1], c[2], e);
      if (capTop && rTop > 0) {
        this.vertex(cx, y1, cz, 0, 1, 0, c[0], c[1], c[2], e);
        this.vertex(p3[0], p3[1], p3[2], 0, 1, 0, c[0], c[1], c[2], e);
        this.vertex(p2[0], p2[1], p2[2], 0, 1, 0, c[0], c[1], c[2], e);
      }
      if (capBottom && rBottom > 0) {
        this.vertex(cx, y0, cz, 0, -1, 0, c[0] * 0.5, c[1] * 0.5, c[2] * 0.5, e);
        this.vertex(p1[0], p1[1], p1[2], 0, -1, 0, c[0] * 0.5, c[1] * 0.5, c[2] * 0.5, e);
        this.vertex(p0[0], p0[1], p0[2], 0, -1, 0, c[0] * 0.5, c[1] * 0.5, c[2] * 0.5, e);
      }
    }
    return this;
  };

  MeshBuilder.prototype.cone = function (cx, cy, cz, r, height, segs, color, emissive) {
    return this.cylinder(cx, cy, cz, r, 0, height, segs || 7, color, emissive, false, true);
  };

  MeshBuilder.prototype.disc = function (cx, cy, cz, r, segs, color, emissive, normalUp) {
    segs = Math.max(3, segs || 10);
    var c = color || this.color;
    var e = emissive === undefined ? this.emissive : emissive;
    var ny = normalUp === false ? -1 : 1;
    for (var i = 0; i < segs; i++) {
      var a0 = (i / segs) * Math.PI * 2;
      var a1 = ((i + 1) / segs) * Math.PI * 2;
      var p0 = [cx + Math.cos(a0) * r, cy, cz + Math.sin(a0) * r];
      var p1 = [cx + Math.cos(a1) * r, cy, cz + Math.sin(a1) * r];
      if (ny > 0) {
        this.vertex(cx, cy, cz, 0, 1, 0, c[0], c[1], c[2], e);
        this.vertex(p0[0], p0[1], p0[2], 0, 1, 0, c[0], c[1], c[2], e);
        this.vertex(p1[0], p1[1], p1[2], 0, 1, 0, c[0], c[1], c[2], e);
      } else {
        this.vertex(cx, cy, cz, 0, -1, 0, c[0], c[1], c[2], e);
        this.vertex(p1[0], p1[1], p1[2], 0, -1, 0, c[0], c[1], c[2], e);
        this.vertex(p0[0], p0[1], p0[2], 0, -1, 0, c[0], c[1], c[2], e);
      }
    }
    return this;
  };

  /* A leaf is a thin, slightly folded diamond, usually arranged in fans. */
  MeshBuilder.prototype.leaf = function (x, y, z, length, width, yaw, pitch, color, emissive) {
    this.push();
    this.translate(x, y, z);
    this.rotateY(yaw);
    this.rotateX(pitch);
    var c = color || this.color;
    var e = emissive === undefined ? this.emissive : emissive;
    var hw = width / 2;
    var p0 = [0, 0, 0];
    var p1 = [0, hw, length * 0.45];
    var p2 = [0, 0, length];
    var p3 = [0, -hw, length * 0.45];
    // Double-sided leaf.
    this.quad(p0, p1, p2, p3, c, e, [1, 0.15, 0]);
    this.quad(p3, p2, p1, p0, c, e, [-1, -0.15, 0]);
    this.pop();
    return this;
  };

  MeshBuilder.prototype.rock = function (cx, cy, cz, r, rng, color, emissive) {
    var c = color || this.color;
    var e = emissive === undefined ? this.emissive : emissive;
    var verts = [];
    var rings = 3, segs = 6;
    for (var j = 0; j <= rings; j++) {
      var phi = (j / rings) * Math.PI;
      var row = [];
      for (var i = 0; i < segs; i++) {
        var th = (i / segs) * Math.PI * 2 + (j % 2) * 0.3;
        var rr = r * (0.72 + rng.next() * 0.4);
        var y = Math.cos(phi) * r * (j === 0 || j === rings ? 0.55 : 1) * (0.8 + rng.next() * 0.3);
        row.push([
          cx + Math.sin(phi) * Math.cos(th) * rr,
          cy + y,
          cz + Math.sin(phi) * Math.sin(th) * rr
        ]);
      }
      verts.push(row);
    }
    for (var j2 = 0; j2 < rings; j2++) {
      for (var i2 = 0; i2 < segs; i2++) {
        var a = verts[j2][i2];
        var b = verts[j2][(i2 + 1) % segs];
        var cc = verts[j2 + 1][(i2 + 1) % segs];
        var d = verts[j2 + 1][i2];
        var shade = 0.75 + rng.next() * 0.35;
        this.quad(a, b, cc, d, [c[0] * shade, c[1] * shade, c[2] * shade], e);
      }
    }
    return this;
  };

  MeshBuilder.prototype.torus = function (cx, cy, cz, ringR, tubeR, segs, tubeSegs, color, emissive) {
    var c = color || this.color;
    var e = emissive === undefined ? this.emissive : emissive;
    segs = segs || 10; tubeSegs = tubeSegs || 5;
    for (var i = 0; i < segs; i++) {
      var a0 = (i / segs) * Math.PI * 2;
      var a1 = ((i + 1) / segs) * Math.PI * 2;
      for (var j = 0; j < tubeSegs; j++) {
        var b0 = (j / tubeSegs) * Math.PI * 2;
        var b1 = ((j + 1) / tubeSegs) * Math.PI * 2;
        var p00 = [
          cx + (ringR + tubeR * Math.cos(b0)) * Math.cos(a0),
          cy + tubeR * Math.sin(b0),
          cz + (ringR + tubeR * Math.cos(b0)) * Math.sin(a0)
        ];
        var p10 = [
          cx + (ringR + tubeR * Math.cos(b0)) * Math.cos(a1),
          cy + tubeR * Math.sin(b0),
          cz + (ringR + tubeR * Math.cos(b0)) * Math.sin(a1)
        ];
        var p11 = [
          cx + (ringR + tubeR * Math.cos(b1)) * Math.cos(a1),
          cy + tubeR * Math.sin(b1),
          cz + (ringR + tubeR * Math.cos(b1)) * Math.sin(a1)
        ];
        var p01 = [
          cx + (ringR + tubeR * Math.cos(b1)) * Math.cos(a0),
          cy + tubeR * Math.sin(b1),
          cz + (ringR + tubeR * Math.cos(b1)) * Math.sin(a0)
        ];
        this.quad(p00, p10, p11, p01, c, e);
      }
    }
    return this;
  };

  MeshBuilder.prototype.star = function (cx, cy, cz, r, points, thickness, color, emissive) {
    // A flat star in the XY plane, extruded slightly.
    var c = color || this.color;
    var e = emissive === undefined ? this.emissive : emissive;
    points = Math.max(3, points || 5);
    var inner = r * 0.45;
    var front = [], back = [];
    for (var i = 0; i < points * 2; i++) {
      var a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      var rad = i % 2 === 0 ? r : inner;
      var x = cx + Math.cos(a) * rad;
      var y = cy + Math.sin(a) * rad;
      front.push([x, y, cz + thickness / 2]);
      back.push([x, y, cz - thickness / 2]);
    }
    for (var j = 0; j < front.length; j++) {
      var k = (j + 1) % front.length;
      this.tri([cx, cy, cz + thickness / 2], front[j], front[k], c, e, [0, 0, 1]);
      this.tri([cx, cy, cz - thickness / 2], back[k], back[j], c, e, [0, 0, -1]);
    }
    return this;
  };

  MeshBuilder.prototype.bounds = function () {
    if (this.count === 0) return { min: [0, 0, 0], max: [0, 0, 0], center: [0, 0, 0], radius: 0 };
    var minX = Infinity, minY = Infinity, minZ = Infinity;
    var maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (var i = 0; i < this.count; i++) {
      var x = this.pos[i * 3], y = this.pos[i * 3 + 1], z = this.pos[i * 3 + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
    var rx = (maxX - minX) / 2, ry = (maxY - minY) / 2, rz = (maxZ - minZ) / 2;
    return {
      min: [minX, minY, minZ], max: [maxX, maxY, maxZ],
      center: [cx, cy, cz], radius: Math.sqrt(rx * rx + ry * ry + rz * rz)
    };
  };

  MeshBuilder.prototype.reset = function () {
    this.count = 0;
    this.stack.length = 0;
    this.matrix = M.create();
    this.color = [1, 1, 1];
    this.emissive = 0;
    this.alpha = 1;
    return this;
  };

  MeshBuilder.prototype.trim = function () {
    var n = this.count;
    this.pos = this.pos.subarray(0, n * 3);
    this.nrm = this.nrm.subarray(0, n * 3);
    this.col = this.col.subarray(0, n * 3);
    this.emi = this.emi.subarray(0, n);
    this.capacity = n;
    return this;
  };

  MeshBuilder.prototype.append = function (other, matrix) {
    if (!other || other.count === 0) return this;
    var oldMatrix = this.matrix;
    if (matrix) this.matrix = matrix;
    for (var i = 0; i < other.count; i++) {
      this.vertex(
        other.pos[i * 3], other.pos[i * 3 + 1], other.pos[i * 3 + 2],
        other.nrm[i * 3], other.nrm[i * 3 + 1], other.nrm[i * 3 + 2],
        other.col[i * 3], other.col[i * 3 + 1], other.col[i * 3 + 2],
        other.emi[i]
      );
    }
    this.matrix = oldMatrix;
    return this;
  };

  MeshBuilder.prototype.clone = function () {
    var b = new MeshBuilder(Math.max(16, this.count));
    b.pos.set(this.pos); b.nrm.set(this.nrm); b.col.set(this.col); b.emi.set(this.emi);
    b.count = this.count;
    return b;
  };

  MeshBuilder.prototype.toArrays = function () {
    return {
      positions: this.pos.subarray(0, this.count * 3),
      normals: this.nrm.subarray(0, this.count * 3),
      colors: this.col.subarray(0, this.count * 3),
      emissive: this.emi.subarray(0, this.count),
      vertices: this.count
    };
  };

  /* ------------------------------------------------------------------ */
  /*  Convenience compound shapes                                        */
  /* ------------------------------------------------------------------ */
  function branch(builder, x, y, z, yaw, pitch, length, radius, color, taper) {
    builder.push();
    builder.translate(x, y, z);
    builder.rotateY(yaw);
    builder.rotateX(pitch);
    builder.cylinder(0, 0, 0, radius, taper === undefined ? radius * 0.45 : taper, length, 6, color, 0, true, false);
    builder.pop();
    return [x + Math.sin(yaw) * Math.sin(pitch) * length, y + Math.cos(pitch) * length, z + Math.cos(yaw) * Math.sin(pitch) * length];
  }

  function vine(builder, x, y, z, length, color, rng) {
    var segs = Math.max(2, Math.floor(length / 0.5));
    builder.push();
    builder.translate(x, y, z);
    for (var i = 0; i < segs; i++) {
      builder.push();
      builder.translate(Math.sin(i * 0.9 + (rng ? rng.next() : 0)) * 0.18, -i * 0.5, Math.cos(i * 0.7) * 0.14);
      builder.leaf(0, 0, 0, 0.5, 0.32, i * 1.7, 0.1, color);
      builder.pop();
    }
    builder.pop();
    return builder;
  }

  SF.MeshBuilder = MeshBuilder;
  SF.Mesh = { branch: branch, vine: vine };
})(typeof window !== 'undefined' ? window : globalThis);
