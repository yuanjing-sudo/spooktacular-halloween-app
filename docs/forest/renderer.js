/* ==========================================================================
 *  ENDLESS SPOOKY FOREST — renderer.js
 *  A dependency-free WebGL 1 renderer: lit low-poly geometry, a procedural
 *  sky with sun/moon/stars/aurora, translucent water, glowing campfire
 *  lights and soft additive particles. Chunks are uploaded once and drawn
 *  with a per-chunk model matrix so world coordinates can grow forever.
 * ========================================================================== */
(function (root) {
  'use strict';

  var SF = root.SpookyForest = root.SpookyForest || {};
  var U = SF.Util;
  var M = U.Mat4;

  var MAX_LIGHTS = 8;

  function compile(gl, type, src, label) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(s);
      if (root.console) console.error('[forest shader] ' + label + ': ' + log + '\n' + src);
      throw new Error('Shader compile failed (' + label + '): ' + log);
    }
    return s;
  }
  function program(gl, vs, fs, label) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs, label + ':vs'));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs, label + ':fs'));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      var log = gl.getProgramInfoLog(p);
      if (root.console) console.error('[forest shader] ' + label + ': ' + log);
      throw new Error('Program link failed (' + label + '): ' + log);
    }
    return p;
  }

  /* ------------------------------------------------------------------ */
  /*  Shader sources                                                     */
  /* ------------------------------------------------------------------ */
  var LIT_VS = [
    'precision highp float;',
    'attribute vec3 aPos;',
    'attribute vec3 aNormal;',
    'attribute vec3 aColor;',
    'attribute float aEmissive;',
    'uniform mat4 uProj;',
    'uniform mat4 uView;',
    'uniform mat4 uModel;',
    'uniform float uTime;',
    'uniform float uSway;',
    'varying vec3 vWorld;',
    'varying vec3 vNormal;',
    'varying vec3 vColor;',
    'varying float vEmissive;',
    'varying float vDepth;',
    'void main(){',
    '  vec3 p = aPos;',
    '  float heightSway = max(0.0, p.y - 2.0) * uSway;',
    '  p.x += sin(uTime * 1.1 + p.z * 0.21 + p.y * 0.17) * heightSway * 0.012;',
    '  p.z += cos(uTime * 0.9 + p.x * 0.19 + p.y * 0.13) * heightSway * 0.010;',
    '  vec4 wp = uModel * vec4(p, 1.0);',
    '  vec4 vp = uView * wp;',
    '  gl_Position = uProj * vp;',
    '  vWorld = wp.xyz;',
    '  vNormal = mat3(uModel) * aNormal;',
    '  vColor = aColor;',
    '  vEmissive = aEmissive;',
    '  vDepth = -vp.z;',
    '}'
  ].join('\n');

  var LIT_FS = [
    'precision highp float;',
    'varying vec3 vWorld;',
    'varying vec3 vNormal;',
    'varying vec3 vColor;',
    'varying float vEmissive;',
    'varying float vDepth;',
    'uniform vec3 uSunDir;',
    'uniform vec3 uSunColor;',
    'uniform vec3 uAmbient;',
    'uniform vec3 uFogColor;',
    'uniform vec2 uFogRange;',
    'uniform float uAlpha;',
    'uniform float uTime;',
    'uniform int uLightCount;',
    'uniform vec4 uLights[' + MAX_LIGHTS + '];',
    'uniform vec3 uLightColors[' + MAX_LIGHTS + '];',
    'void main(){',
    '  vec3 N = normalize(vNormal);',
    '  vec3 L = normalize(uSunDir);',
    '  float ndl = max(dot(N, L), 0.0);',
    '  vec3 col = vColor * (uAmbient + uSunColor * ndl);',
    '  for (int i = 0; i < ' + MAX_LIGHTS + '; i++) {',
    '    if (i < uLightCount) {',
    '      vec3 toLight = uLights[i].xyz - vWorld;',
    '      float dist = length(toLight);',
    '      float radius = max(uLights[i].w, 0.001);',
    '      float atten = clamp(1.0 - dist / radius, 0.0, 1.0);',
    '      atten = atten * atten;',
    '      float lambert = max(dot(N, normalize(toLight)), 0.0);',
    '      vec3 lc = uLightColors[i];',
    '      col += vColor * lc * lambert * atten;',
    '      col += vColor * lc * atten * 0.16;',
    '    }',
    '  }',
    '  col += vColor * vEmissive * (0.82 + 0.18 * sin(uTime * 3.0 + vWorld.x * 2.0 + vWorld.z));',
    '  float fog = smoothstep(uFogRange.x, uFogRange.y, vDepth);',
    '  col = mix(col, uFogColor, fog);',
    '  gl_FragColor = vec4(col, uAlpha);',
    '}'
  ].join('\n');

  var SKY_VS = [
    'precision highp float;',
    'attribute vec2 aPos;',
    'varying vec2 vNdc;',
    'void main(){',
    '  vNdc = aPos;',
    '  gl_Position = vec4(aPos, 1.0, 1.0);',
    '}'
  ].join('\n');

  var SKY_FS = [
    'precision highp float;',
    'varying vec2 vNdc;',
    'uniform vec3 uCamRight;',
    'uniform vec3 uCamUp;',
    'uniform vec3 uCamForward;',
    'uniform float uTanHalfFov;',
    'uniform float uAspect;',
    'uniform vec3 uTop;',
    'uniform vec3 uBottom;',
    'uniform vec3 uHorizon;',
    'uniform vec3 uSunDir;',
    'uniform vec3 uSunColor;',
    'uniform vec3 uMoonDir;',
    'uniform vec3 uMoonColor;',
    'uniform float uStar;',
    'uniform float uAurora;',
    'uniform float uTime;',
    'uniform float uCloud;',
    'float hash31(vec3 p){',
    '  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));',
    '  p *= 17.0;',
    '  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));',
    '}',
    'float noise3(vec3 p){',
    '  vec3 i = floor(p);',
    '  vec3 f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  float n000 = hash31(i);',
    '  float n100 = hash31(i + vec3(1,0,0));',
    '  float n010 = hash31(i + vec3(0,1,0));',
    '  float n110 = hash31(i + vec3(1,1,0));',
    '  float n001 = hash31(i + vec3(0,0,1));',
    '  float n101 = hash31(i + vec3(1,0,1));',
    '  float n011 = hash31(i + vec3(0,1,1));',
    '  float n111 = hash31(i + vec3(1,1,1));',
    '  float nx00 = mix(n000, n100, f.x);',
    '  float nx10 = mix(n010, n110, f.x);',
    '  float nx01 = mix(n001, n101, f.x);',
    '  float nx11 = mix(n011, n111, f.x);',
    '  float nxy0 = mix(nx00, nx10, f.y);',
    '  float nxy1 = mix(nx01, nx11, f.y);',
    '  return mix(nxy0, nxy1, f.z);',
    '}',
    'void main(){',
    '  vec3 dir = normalize(uCamRight * (vNdc.x * uTanHalfFov * uAspect) + uCamUp * (vNdc.y * uTanHalfFov) + uCamForward);',
    '  float up = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);',
    '  vec3 col = mix(uBottom, uTop, smoothstep(0.35, 0.95, up));',
    '  col = mix(col, uHorizon, pow(1.0 - clamp(abs(dir.y), 0.0, 1.0), 5.0) * 0.7);',
    '  float sd = max(dot(dir, normalize(uSunDir)), 0.0);',
    '  float sunDisc = pow(sd, 2400.0);',
    '  float sunHalo = pow(sd, 16.0);',
    '  col += uSunColor * (sunDisc * 2.6 + sunHalo * 0.22);',
    '  float md = max(dot(dir, normalize(uMoonDir)), 0.0);',
    '  float moonDisc = pow(md, 3200.0);',
    '  float moonHalo = pow(md, 40.0);',
    '  col += uMoonColor * (moonDisc * 2.2 + moonHalo * 0.12);',
    '  if (uStar > 0.01 && dir.y > -0.05) {',
    '    vec3 sp = floor(dir * 420.0);',
    '    float st = hash31(sp);',
    '    float twinkle = 0.65 + 0.35 * sin(uTime * 2.2 + st * 32.0);',
    '    float star = step(0.9972, st) * twinkle * uStar;',
    '    col += vec3(0.85, 0.9, 1.0) * star * 1.3;',
    '  }',
    '  if (uAurora > 0.01) {',
    '    float band = smoothstep(0.06, 0.55, dir.y);',
    '    float wave = sin(dir.x * 7.0 + uTime * 0.18) * 0.5 + 0.5;',
    '    wave *= sin(dir.z * 5.0 - uTime * 0.11) * 0.5 + 0.5;',
    '    vec3 aurora = mix(vec3(0.1, 0.85, 0.42), vec3(0.55, 0.25, 0.9), wave);',
    '    col += aurora * band * wave * uAurora * 0.28;',
    '  }',
    '  if (uCloud > 0.01) {',
    '    vec3 cp = dir * 2.3 + vec3(uTime * 0.006, 0.0, uTime * 0.003);',
    '    float cn = noise3(cp) * 0.55 + noise3(cp * 2.1) * 0.3;',
    '    float cloud = smoothstep(0.55, 0.78, cn) * smoothstep(0.0, 0.25, dir.y) * uCloud;',
    '    col = mix(col, mix(uHorizon, vec3(0.85, 0.88, 0.95), 0.35), cloud * 0.42);',
    '  }',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  var PART_VS = [
    'precision highp float;',
    'attribute vec3 aPos;',
    'attribute vec3 aColor;',
    'attribute float aSize;',
    'attribute float aAlpha;',
    'uniform mat4 uProj;',
    'uniform mat4 uView;',
    'uniform float uPixelScale;',
    'varying vec3 vColor;',
    'varying float vAlpha;',
    'void main(){',
    '  vec4 vp = uView * vec4(aPos, 1.0);',
    '  gl_Position = uProj * vp;',
    '  float size = aSize * uPixelScale / max(0.6, -vp.z);',
    '  gl_PointSize = clamp(size, 1.0, 64.0);',
    '  vColor = aColor;',
    '  vAlpha = aAlpha;',
    '}'
  ].join('\n');

  var PART_FS = [
    'precision highp float;',
    'varying vec3 vColor;',
    'varying float vAlpha;',
    'uniform float uSoft;',
    'void main(){',
    '  vec2 d = gl_PointCoord - vec2(0.5);',
    '  float r = length(d) * 2.0;',
    '  float a = smoothstep(1.0, 0.0, r);',
    '  a = pow(a, uSoft);',
    '  if (a < 0.01) discard;',
    '  gl_FragColor = vec4(vColor, a * vAlpha);',
    '}'
  ].join('\n');

  /* ------------------------------------------------------------------ */
  /*  Renderer                                                           */
  /* ------------------------------------------------------------------ */
  function Renderer(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.opts = opts;
    this.gl = null;
    this.ready = false;
    this.width = 1;
    this.height = 1;
    this.dpr = Math.min(2, root.devicePixelRatio || 1);
    this.origin = [0, 0];
    this.chunks = new Map();
    this.proj = M.create();
    this.view = M.create();
    this.vp = M.create();
    this.model = M.create();
    this.frustum = null;
    this.eye = [0, 0, 0];
    this.env = null;
    this.fogNear = 20;
    this.fogFar = 92;
    this.drawDistance = 7;
    this.info = {
      fps: 60, frameMs: 0, chunks: 0, drawnChunks: 0, vertices: 0,
      particles: 0, dynamicVerts: 0, calls: 0
    };
    this._frameCount = 0;
    this._fpsTime = 0;
    this._lastNow = 0;
    this._dyn = { pos: null, nrm: null, col: null, emi: null, count: 0 };
    this._part = { pos: null, col: null, size: null, alpha: null, count: 0 };
    this._lost = false;
  }

  Renderer.prototype.init = function () {
    var gl = this.canvas.getContext('webgl', {
      antialias: true, alpha: false, depth: true, stencil: false,
      premultipliedAlpha: false, preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    }) || this.canvas.getContext('experimental-webgl');
    if (!gl) throw new Error('WebGL is not available in this browser.');
    this.gl = gl;
    this._initPrograms();
    this._initBuffers();
    this.resize();
    this.ready = true;
    var self = this;
    this.canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      self._lost = true;
      self.ready = false;
      if (root.console) console.warn('[forest] WebGL context lost');
    }, false);
    this.canvas.addEventListener('webglcontextrestored', function () {
      self._lost = false;
      self.ready = false;
      try {
        self._initPrograms();
        self._initBuffers();
        self.chunks.clear();
        self.ready = true;
        if (SF.bus) SF.bus.emit('renderer:restored');
      } catch (err) {
        if (root.console) console.error('[forest] context restore failed', err);
      }
    }, false);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.clearColor(0.04, 0.05, 0.08, 1);
    return this;
  };

  Renderer.prototype._initPrograms = function () {
    var gl = this.gl;
    this.lit = program(gl, LIT_VS, LIT_FS, 'lit');
    this.litU = {};
    ['uProj', 'uView', 'uModel', 'uSunDir', 'uSunColor', 'uAmbient',
      'uFogColor', 'uFogRange', 'uAlpha', 'uTime', 'uSway',
      'uLightCount', 'uLights', 'uLightColors'].forEach(function (n) {
      this.litU[n] = gl.getUniformLocation(this.lit, n);
    }, this);
    this.litA = {
      pos: gl.getAttribLocation(this.lit, 'aPos'),
      nrm: gl.getAttribLocation(this.lit, 'aNormal'),
      col: gl.getAttribLocation(this.lit, 'aColor'),
      emi: gl.getAttribLocation(this.lit, 'aEmissive')
    };

    this.sky = program(gl, SKY_VS, SKY_FS, 'sky');
    this.skyU = {};
    ['uCamRight', 'uCamUp', 'uCamForward', 'uTanHalfFov', 'uAspect',
      'uTop', 'uBottom', 'uHorizon', 'uSunDir', 'uSunColor',
      'uMoonDir', 'uMoonColor', 'uStar', 'uAurora', 'uTime', 'uCloud'].forEach(function (n) {
      this.skyU[n] = gl.getUniformLocation(this.sky, n);
    }, this);
    this.skyA = gl.getAttribLocation(this.sky, 'aPos');

    this.part = program(gl, PART_VS, PART_FS, 'particles');
    this.partU = {};
    ['uProj', 'uView', 'uPixelScale', 'uSoft'].forEach(function (n) {
      this.partU[n] = gl.getUniformLocation(this.part, n);
    }, this);
    this.partA = {
      pos: gl.getAttribLocation(this.part, 'aPos'),
      col: gl.getAttribLocation(this.part, 'aColor'),
      size: gl.getAttribLocation(this.part, 'aSize'),
      alpha: gl.getAttribLocation(this.part, 'aAlpha')
    };
  };

  Renderer.prototype._initBuffers = function () {
    var gl = this.gl;
    this.skyBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.skyBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 3, -1, -1, 3
    ]), gl.STATIC_DRAW);

    this.dynBuf = {
      pos: gl.createBuffer(), nrm: gl.createBuffer(),
      col: gl.createBuffer(), emi: gl.createBuffer()
    };
    this.partBuf = {
      pos: gl.createBuffer(), col: gl.createBuffer(),
      size: gl.createBuffer(), alpha: gl.createBuffer()
    };
  };

  Renderer.prototype.resize = function () {
    var gl = this.gl;
    if (!gl) return;
    var rect = this.canvas.getBoundingClientRect();
    var w = Math.max(1, Math.floor(rect.width || this.canvas.clientWidth || 640));
    var h = Math.max(1, Math.floor(rect.height || this.canvas.clientHeight || 360));
    var dpr = this.dpr;
    var pw = Math.floor(w * dpr), ph = Math.floor(h * dpr);
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    this.width = pw;
    this.height = ph;
    gl.viewport(0, 0, pw, ph);
  };

  Renderer.prototype.setDpr = function (dpr) {
    this.dpr = U.clamp(dpr, 0.75, 2.5);
    this.resize();
  };

  Renderer.prototype.setDrawDistance = function (d) {
    this.drawDistance = U.clamp(d, 3, 12);
    this.fogFar = this.drawDistance * SF.CHUNK * 0.92;
    this.fogNear = this.fogFar * 0.22;
  };

  /* ------------------------------------------------------------------ */
  /*  Chunk upload / eviction                                            */
  /* ------------------------------------------------------------------ */
  Renderer.prototype._uploadMesh = function (mesh) {
    var gl = this.gl;
    var vbo = {
      pos: gl.createBuffer(), nrm: gl.createBuffer(),
      col: gl.createBuffer(), emi: gl.createBuffer(),
      count: mesh.vertices
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo.pos);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo.nrm);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo.col);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.colors, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo.emi);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.emissive, gl.STATIC_DRAW);
    return vbo;
  };

  Renderer.prototype._freeMesh = function (gpu) {
    if (!gpu) return;
    var gl = this.gl;
    if (gpu.pos) gl.deleteBuffer(gpu.pos);
    if (gpu.nrm) gl.deleteBuffer(gpu.nrm);
    if (gpu.col) gl.deleteBuffer(gpu.col);
    if (gpu.emi) gl.deleteBuffer(gpu.emi);
  };

  Renderer.prototype.clearChunks = function () {
    var self = this;
    this.chunks.forEach(function (entry) {
      self._freeMesh(entry.mesh);
      self._freeMesh(entry.water);
    });
    this.chunks.clear();
    this.info.chunks = 0;
  };

  Renderer.prototype.syncChunks = function (world) {    if (!this.ready) return;
    var live = new Set();
    var self = this;
    world.forEachChunk(function (chunk) {
      live.add(chunk.key);
      if (self.chunks.has(chunk.key)) return;
      if (!chunk.meshData) return;
      var entry = {
        key: chunk.key,
        cx: chunk.cx, cz: chunk.cz,
        mesh: self._uploadMesh(chunk.meshData),
        water: chunk.waterData ? self._uploadMesh(chunk.waterData) : null,
        bounds: chunk.bounds,
        verts: chunk.meshData.vertices + (chunk.waterData ? chunk.waterData.vertices : 0)
      };
      self.chunks.set(chunk.key, entry);
    });
    this.chunks.forEach(function (entry, key) {
      if (!live.has(key)) {
        self._freeMesh(entry.mesh);
        self._freeMesh(entry.water);
        self.chunks.delete(key);
      }
    });
    this.info.chunks = this.chunks.size;
  };

  /* ------------------------------------------------------------------ */
  /*  Camera / frame setup                                               */
  /* ------------------------------------------------------------------ */
  Renderer.prototype.begin = function (camera, env, now) {
    if (!this.ready) return false;
    var gl = this.gl;
    this.resize();
    this.env = env;
    this.eye = camera.eye;

    // Floating origin: keep model/view coordinates small forever.
    var ox = this.origin[0], oz = this.origin[1];
    if (Math.abs(camera.eye[0] - ox) > 220 || Math.abs(camera.eye[2] - oz) > 220) {
      this.origin[0] = Math.round(camera.eye[0] / 64) * 64;
      this.origin[1] = Math.round(camera.eye[2] / 64) * 64;
      ox = this.origin[0]; oz = this.origin[1];
    }
    var ex = camera.eye[0] - ox, ey = camera.eye[1], ez = camera.eye[2] - oz;

    var aspect = this.width / Math.max(1, this.height);
    var fov = (camera.fov || 70) * Math.PI / 180;
    var near = 0.08, far = Math.max(160, this.fogFar + 50);
    M.perspective(this.proj, fov, aspect, near, far);

    var cp = Math.cos(camera.pitch || 0);
    var fx = Math.sin(camera.yaw || 0) * cp;
    var fy = Math.sin(camera.pitch || 0);
    var fz = Math.cos(camera.yaw || 0) * cp;
    var target = [ex + fx, ey + fy, ez + fz];
    M.lookAt(this.view, [ex, ey, ez], target, [0, 1, 0]);
    M.multiply(this.vp, this.proj, this.view);
    this.frustum = U.frustumFromMatrix(this.vp);
    this._ex = ex; this._ey = ey; this._ez = ez;
    this._fx = fx; this._fy = fy; this._fz = fz;
    this._camRight = [Math.cos(camera.yaw || 0), 0, -Math.sin(camera.yaw || 0)];
    this._camUp = [0, 1, 0];
    this._camForward = [fx, fy, fz];
    this._tanHalfFov = Math.tan(fov / 2);
    this._aspect = aspect;

    gl.viewport(0, 0, this.width, this.height);
    var fog = env.fogColor || [0.05, 0.06, 0.08];
    gl.clearColor(fog[0], fog[1], fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.info.drawnChunks = 0;
    this.info.vertices = 0;
    this.info.calls = 0;
    this.info.particles = 0;
    this.info.dynamicVerts = 0;

    this._frameCount++;
    this._lastNow = now || (root.performance ? performance.now() : Date.now());
    return true;
  };

  Renderer.prototype.drawSky = function () {
    if (!this.ready) return;
    var gl = this.gl, env = this.env;
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.useProgram(this.sky);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.skyBuf);
    gl.enableVertexAttribArray(this.skyA);
    gl.vertexAttribPointer(this.skyA, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3fv(this.skyU.uCamRight, this._camRight);
    gl.uniform3fv(this.skyU.uCamUp, this._camUp);
    gl.uniform3fv(this.skyU.uCamForward, this._camForward);
    gl.uniform1f(this.skyU.uTanHalfFov, this._tanHalfFov);
    gl.uniform1f(this.skyU.uAspect, this._aspect);
    gl.uniform3fv(this.skyU.uTop, env.skyTop || [0.02, 0.03, 0.08]);
    gl.uniform3fv(this.skyU.uBottom, env.skyBottom || [0.18, 0.12, 0.24]);
    gl.uniform3fv(this.skyU.uHorizon, env.horizon || env.fogColor || [0.1, 0.1, 0.14]);
    gl.uniform3fv(this.skyU.uSunDir, env.sunDir || [0.3, 0.7, 0.2]);
    gl.uniform3fv(this.skyU.uSunColor, env.sunColor || [1, 0.8, 0.5]);
    gl.uniform3fv(this.skyU.uMoonDir, env.moonDir || [-0.3, -0.7, -0.2]);
    gl.uniform3fv(this.skyU.uMoonColor, env.moonColor || [0.7, 0.8, 1]);
    gl.uniform1f(this.skyU.uStar, env.starAmount === undefined ? 0 : env.starAmount);
    gl.uniform1f(this.skyU.uAurora, env.aurora || 0);
    gl.uniform1f(this.skyU.uTime, env.time || 0);
    gl.uniform1f(this.skyU.uCloud, env.cloud || 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    this.info.calls++;
  };

  Renderer.prototype._setLitUniforms = function (alpha) {
    var gl = this.gl, env = this.env, u = this.litU;
    gl.useProgram(this.lit);
    gl.uniformMatrix4fv(u.uProj, false, this.proj);
    gl.uniformMatrix4fv(u.uView, false, this.view);
    gl.uniform3fv(u.uSunDir, env.sunDir || [0.3, 0.7, 0.2]);
    gl.uniform3fv(u.uSunColor, env.sunColor || [1, 0.9, 0.7]);
    gl.uniform3fv(u.uAmbient, env.ambient || [0.25, 0.27, 0.32]);
    gl.uniform3fv(u.uFogColor, env.fogColor || [0.08, 0.1, 0.12]);
    gl.uniform2f(u.uFogRange, this.fogNear, this.fogFar);
    gl.uniform1f(u.uAlpha, alpha === undefined ? 1 : alpha);
    gl.uniform1f(u.uTime, env.time || 0);
    gl.uniform1f(u.uSway, env.wind === undefined ? 0.3 : env.wind);

    var lights = (env.lights || []).slice(0, MAX_LIGHTS);
    var lp = new Float32Array(MAX_LIGHTS * 4);
    var lc = new Float32Array(MAX_LIGHTS * 3);
    for (var i = 0; i < lights.length; i++) {
      var l = lights[i];
      lp[i * 4] = l.x - this.origin[0];
      lp[i * 4 + 1] = l.y;
      lp[i * 4 + 2] = l.z - this.origin[1];
      lp[i * 4 + 3] = l.radius || 8;
      lc[i * 3] = (l.color ? l.color[0] : 1) * (l.intensity === undefined ? 1 : l.intensity);
      lc[i * 3 + 1] = (l.color ? l.color[1] : 0.6) * (l.intensity === undefined ? 1 : l.intensity);
      lc[i * 3 + 2] = (l.color ? l.color[2] : 0.2) * (l.intensity === undefined ? 1 : l.intensity);
    }
    gl.uniform1i(u.uLightCount, lights.length);
    gl.uniform4fv(u.uLights, lp);
    gl.uniform3fv(u.uLightColors, lc);
  };

  Renderer.prototype._bindMesh = function (gpu) {
    var gl = this.gl, a = this.litA;
    gl.bindBuffer(gl.ARRAY_BUFFER, gpu.pos);
    gl.enableVertexAttribArray(a.pos);
    gl.vertexAttribPointer(a.pos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, gpu.nrm);
    gl.enableVertexAttribArray(a.nrm);
    gl.vertexAttribPointer(a.nrm, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, gpu.col);
    gl.enableVertexAttribArray(a.col);
    gl.vertexAttribPointer(a.col, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, gpu.emi);
    gl.enableVertexAttribArray(a.emi);
    gl.vertexAttribPointer(a.emi, 1, gl.FLOAT, false, 0, 0);
  };

  Renderer.prototype.drawChunks = function (opaque) {
    if (!this.ready) return;
    var gl = this.gl;
    this._setLitUniforms(opaque ? 1 : 0.74);
    if (!opaque) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.disable(gl.CULL_FACE);
    } else {
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      gl.enable(gl.CULL_FACE);
    }
    var ox = this.origin[0], oz = this.origin[1];
    var self = this;
    this.chunks.forEach(function (entry) {
      var gpu = opaque ? entry.mesh : entry.water;
      if (!gpu) return;
      var b = entry.bounds;
      var wx = entry.cx * SF.CHUNK + b.center[0] - ox;
      var wy = b.center[1];
      var wz = entry.cz * SF.CHUNK + b.center[2] - oz;
      if (!U.sphereInFrustum(self.frustum, wx, wy, wz, b.radius)) return;
      M.fromTranslation(self.model, entry.cx * SF.CHUNK - ox, 0, entry.cz * SF.CHUNK - oz);
      gl.uniformMatrix4fv(self.litU.uModel, false, self.model);
      self._bindMesh(gpu);
      gl.drawArrays(gl.TRIANGLES, 0, gpu.count);
      self.info.drawnChunks++;
      self.info.vertices += gpu.count;
      self.info.calls++;
    });
    if (!opaque) {
      gl.enable(gl.CULL_FACE);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
  };

  Renderer.prototype._uploadDynamic = function (builder) {
    var gl = this.gl;
    if (!builder || builder.count === 0) return 0;
    var pos = builder.pos.subarray(0, builder.count * 3);
    var nrm = builder.nrm.subarray(0, builder.count * 3);
    var col = builder.col.subarray(0, builder.count * 3);
    var emi = builder.emi.subarray(0, builder.count);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynBuf.pos);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynBuf.nrm);
    gl.bufferData(gl.ARRAY_BUFFER, nrm, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynBuf.col);
    gl.bufferData(gl.ARRAY_BUFFER, col, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynBuf.emi);
    gl.bufferData(gl.ARRAY_BUFFER, emi, gl.DYNAMIC_DRAW);
    return builder.count;
  };

  Renderer.prototype.drawDynamic = function (builder) {
    if (!this.ready || !builder || builder.count === 0) return;
    var gl = this.gl;
    var count = this._uploadDynamic(builder);
    this._setLitUniforms(1);
    M.fromTranslation(this.model, -this.origin[0], 0, -this.origin[1]);
    gl.uniformMatrix4fv(this.litU.uModel, false, this.model);
    this._bindMesh({
      pos: this.dynBuf.pos, nrm: this.dynBuf.nrm,
      col: this.dynBuf.col, emi: this.dynBuf.emi
    });
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    gl.drawArrays(gl.TRIANGLES, 0, count);
    this.info.dynamicVerts = count;
    this.info.calls++;
  };

  Renderer.prototype._uploadParticles = function (list) {
    var gl = this.gl;
    var n = list.length;
    var pos = new Float32Array(n * 3);
    var col = new Float32Array(n * 3);
    var size = new Float32Array(n);
    var alpha = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var p = list[i];
      pos[i * 3] = p.x - this.origin[0];
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z - this.origin[1];
      col[i * 3] = p.color ? p.color[0] : 1;
      col[i * 3 + 1] = p.color ? p.color[1] : 1;
      col[i * 3 + 2] = p.color ? p.color[2] : 1;
      size[i] = p.size || 1;
      alpha[i] = p.alpha === undefined ? (p.life !== undefined ? Math.min(1, p.life) : 1) : p.alpha;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf.pos);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf.col);
    gl.bufferData(gl.ARRAY_BUFFER, col, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf.size);
    gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf.alpha);
    gl.bufferData(gl.ARRAY_BUFFER, alpha, gl.DYNAMIC_DRAW);
    return n;
  };

  Renderer.prototype._drawParticleGroup = function (list, additive) {
    if (!list.length) return;
    var gl = this.gl;
    this._uploadParticles(list);
    gl.useProgram(this.part);
    gl.uniformMatrix4fv(this.partU.uProj, false, this.proj);
    gl.uniformMatrix4fv(this.partU.uView, false, this.view);
    gl.uniform1f(this.partU.uPixelScale, this.height * 0.09 * this.dpr);
    gl.uniform1f(this.partU.uSoft, additive ? 1.45 : 1.1);
    var a = this.partA;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf.pos);
    gl.enableVertexAttribArray(a.pos);
    gl.vertexAttribPointer(a.pos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf.col);
    gl.enableVertexAttribArray(a.col);
    gl.vertexAttribPointer(a.col, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf.size);
    gl.enableVertexAttribArray(a.size);
    gl.vertexAttribPointer(a.size, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf.alpha);
    gl.enableVertexAttribArray(a.alpha);
    gl.vertexAttribPointer(a.alpha, 1, gl.FLOAT, false, 0, 0);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    if (additive) gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.POINTS, 0, list.length);
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    this.info.particles += list.length;
    this.info.calls++;
  };

  Renderer.prototype.drawParticles = function (list) {
    if (!this.ready || !list || list.length === 0) return;
    var additive = [], normal = [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (p.alpha !== undefined && p.alpha <= 0.01) continue;
      if (p.additive === false) normal.push(p);
      else additive.push(p);
    }
    this._drawParticleGroup(additive, true);
    this._drawParticleGroup(normal, false);
  };

  Renderer.prototype.end = function (now) {
    if (!this.ready) return;
    this._updateFPS(now);
  };

  Renderer.prototype._updateFPS = function (now) {
    now = now || (root.performance ? performance.now() : Date.now());
    if (!this._fpsTime) this._fpsTime = now;
    var elapsed = now - this._fpsTime;
    if (elapsed >= 500) {
      var fps = (this._frameCount * 1000) / elapsed;
      this.info.fps = Math.round(fps * 10) / 10;
      this._frameCount = 0;
      this._fpsTime = now;
    }
  };

  Renderer.prototype.screenPosition = function (x, y, z) {
    if (!this.ready) return null;
    var ox = this.origin[0], oz = this.origin[1];
    var px = x - ox, py = y, pz = z - oz;
    var m = this.vp;
    var cx = m[0] * px + m[4] * py + m[8] * pz + m[12];
    var cy = m[1] * px + m[5] * py + m[9] * pz + m[13];
    var cw = m[3] * px + m[7] * py + m[11] * pz + m[15];
    if (cw <= 0.001) return null;
    return {
      x: (cx / cw * 0.5 + 0.5) * (this.canvas.clientWidth || this.width),
      y: (1 - (cy / cw * 0.5 + 0.5)) * (this.canvas.clientHeight || this.height),
      depth: cw
    };
  };

  SF.Renderer = Renderer;
  SF.MAX_LIGHTS = MAX_LIGHTS;
})(typeof window !== 'undefined' ? window : globalThis);
