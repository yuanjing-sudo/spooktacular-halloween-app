/* Spooktacular Mine 3D — raw WebGL voxel mine, zero dependencies.
 * Same engine data as the 2D game (spooky.js): seeded DFS mazes, A* ghost,
 * combo/streak scoring, picks/shop/relics/fishing/XP/achievements.
 * Diorama orbit mode stands in for the iOS AR dioramas (no phone camera needed). */
(function () {
  'use strict';
  var S = window.Spooky;
  var WALL_H = 2.4, EYE = 1.15;
  var DEPTHS = [
    { layer: 'Dirt Tunnels', size: 15, candies: 8, crystals: 2, ghostSpeed: 3.4, ghostThink: 0.55, wall: [0.23, 0.11, 0.37], wallTop: [0.32, 0.18, 0.48], fog: [0.04, 0.02, 0.10] },
    { layer: 'Crystal Hollows', size: 19, candies: 12, crystals: 3, ghostSpeed: 3.8, ghostThink: 0.45, wall: [0.05, 0.29, 0.37], wallTop: [0.10, 0.40, 0.50], fog: [0.02, 0.06, 0.12] },
    { layer: 'Magma Core', size: 23, candies: 16, crystals: 4, ghostSpeed: 4.2, ghostThink: 0.35, wall: [0.37, 0.11, 0.11], wallTop: [0.50, 0.16, 0.14], fog: [0.10, 0.03, 0.03] }
  ];

  var canvas = document.getElementById('game3d');

  // ==================== VISUAL EFFECTS SYSTEM ====================
  var FX = {
    particles: [],
    shockwaves: [],
    floatingTexts: [],
    screenShake: { mag: 0, decay: 0.92, x: 0, y: 0 },
    glowPulses: [],
    trailPoints: [],
    ambientParticles: [],
    sparkleBursts: [],
    colorOverlays: [],
    vignetteIntensity: 0.3,
    bloomIntensity: 0.5,
    chromaticAberration: 0,
    time: 0,
    lastTime: 0,
    deltaTime: 0.016,
    cameraShakeEnabled: true,
    particleBudget: 500,
    activeEffects: 0,
    fps: 60,
    fpsHistory: [],
    performanceMode: false,
    qualityLevel: 2,
    maxParticles: 500,
    maxShockwaves: 10,
    maxFloatingTexts: 20,
    maxTrailPoints: 100,
    maxAmbientParticles: 50,
    maxSparkleBursts: 30,
    maxColorOverlays: 5,
    effectPool: [],
    poolSize: 100,
    initialized: false
  };

  function fxInit() {
    if (FX.initialized) return;
    FX.initialized = true;
    FX.lastTime = performance.now();
    fxInitParticlePool();
    fxInitAmbientParticles();
    fxDetectPerformanceMode();
  }

  function fxInitParticlePool() {
    FX.effectPool = [];
    for (var i = 0; i < FX.poolSize; i++) {
      FX.effectPool.push({
        active: false,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        life: 0, maxLife: 1,
        size: 3, color: '#fff',
        alpha: 1, decay: 0.02,
        gravity: 0, friction: 0.98,
        type: 'circle', rotation: 0,
        rotationSpeed: 0, scale: 1,
        scaleSpeed: 0, glow: 0,
        trail: false, trailLength: 0,
        bounce: false, bounceFactor: 0.5,
        fadeIn: 0, fadeOut: 0.5,
        customData: null
      });
    }
  }

  function fxGetFromPool() {
    for (var i = 0; i < FX.effectPool.length; i++) {
      if (!FX.effectPool[i].active) return FX.effectPool[i];
    }
    return null;
  }

  function fxReturnToPool(p) {
    p.active = false;
    p.customData = null;
  }

  function fxInitAmbientParticles() {
    FX.ambientParticles = [];
    var count = FX.performanceMode ? 20 : 50;
    for (var i = 0; i < count; i++) {
      FX.ambientParticles.push({
        x: Math.random() * G.maze.w,
        y: Math.random() * 2,
        z: Math.random() * G.maze.d,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2,
        vz: (Math.random() - 0.5) * 0.3,
        size: 1 + Math.random() * 2,
        alpha: 0.1 + Math.random() * 0.3,
        color: ['#ffd166', '#59e6ff', '#ff69b4', '#c44dff'][Math.floor(Math.random() * 4)],
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.5 + Math.random() * 1.5
      });
    }
  }

  function fxDetectPerformanceMode() {
    var testFrames = 0;
    var testTime = 0;
    var testStart = performance.now();
    function testLoop() {
      testFrames++;
      testTime = performance.now() - testStart;
      if (testTime < 1000) {
        requestAnimationFrame(testLoop);
      } else {
        FX.fps = testFrames;
        FX.performanceMode = testFrames < 30;
        FX.maxParticles = FX.performanceMode ? 200 : 500;
        FX.maxAmbientParticles = FX.performanceMode ? 20 : 50;
        if (FX.performanceMode) {
          fxInitAmbientParticles();
        }
      }
    }
    requestAnimationFrame(testLoop);
  }

  function fxUpdate(dt) {
    FX.time += dt;
    FX.deltaTime = dt;
    fxUpdateParticles(dt);
    fxUpdateShockwaves(dt);
    fxUpdateFloatingTexts(dt);
    fxUpdateScreenShake(dt);
    fxUpdateGlowPulses(dt);
    fxUpdateTrailPoints(dt);
    fxUpdateAmbientParticles(dt);
    fxUpdateSparkleBursts(dt);
    fxUpdateColorOverlays(dt);
    fxUpdateFPS(dt);
    FX.activeEffects = FX.particles.length + FX.shockwaves.length + FX.floatingTexts.length;
  }

  function fxUpdateParticles(dt) {
    for (var i = FX.particles.length - 1; i >= 0; i--) {
      var p = FX.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        fxReturnToPool(p);
        FX.particles.splice(i, 1);
        continue;
      }
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.vz *= p.friction;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.z += p.vz * dt * 60;
      p.rotation += p.rotationSpeed * dt;
      p.scale += p.scaleSpeed * dt;
      if (p.bounce && p.y < 0) {
        p.y = 0;
        p.vy *= -p.bounceFactor;
      }
      var lifeRatio = p.life / p.maxLife;
      if (lifeRatio < p.fadeOut) {
        p.alpha = lifeRatio / p.fadeOut;
      } else if (lifeRatio > (1 - p.fadeIn)) {
        p.alpha = (1 - lifeRatio) / p.fadeIn;
      } else {
        p.alpha = 1;
      }
    }
  }

  function fxUpdateShockwaves(dt) {
    for (var i = FX.shockwaves.length - 1; i >= 0; i--) {
      var s = FX.shockwaves[i];
      s.life -= dt;
      s.r += s.speed * dt;
      if (s.life <= 0) FX.shockwaves.splice(i, 1);
    }
  }

  function fxUpdateFloatingTexts(dt) {
    for (var i = FX.floatingTexts.length - 1; i >= 0; i--) {
      var t = FX.floatingTexts[i];
      t.life -= dt;
      t.y += t.vy * dt * 60;
      t.vy *= 0.98;
      if (t.life <= 0) FX.floatingTexts.splice(i, 1);
    }
  }

  function fxUpdateScreenShake(dt) {
    if (FX.screenShake.mag > 0.1) {
      FX.screenShake.x = (Math.random() - 0.5) * FX.screenShake.mag;
      FX.screenShake.y = (Math.random() - 0.5) * FX.screenShake.mag;
      FX.screenShake.mag *= FX.screenShake.decay;
    } else {
      FX.screenShake.mag = 0;
      FX.screenShake.x = 0;
      FX.screenShake.y = 0;
    }
  }

  function fxUpdateGlowPulses(dt) {
    for (var i = FX.glowPulses.length - 1; i >= 0; i--) {
      var g = FX.glowPulses[i];
      g.life -= dt;
      g.intensity = Math.sin(g.life * Math.PI) * g.maxIntensity;
      if (g.life <= 0) FX.glowPulses.splice(i, 1);
    }
  }

  function fxUpdateTrailPoints(dt) {
    for (var i = FX.trailPoints.length - 1; i >= 0; i--) {
      var t = FX.trailPoints[i];
      t.life -= dt;
      if (t.life <= 0) FX.trailPoints.splice(i, 1);
    }
  }

  function fxUpdateAmbientParticles(dt) {
    for (var i = 0; i < FX.ambientParticles.length; i++) {
      var p = FX.ambientParticles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.z += p.vz * dt * 60;
      p.pulse += p.pulseSpeed * dt;
      p.alpha = 0.1 + Math.sin(p.pulse) * 0.15;
      if (p.x < 0) p.x = G.maze.w;
      if (p.x > G.maze.w) p.x = 0;
      if (p.z < 0) p.z = G.maze.d;
      if (p.z > G.maze.d) p.z = 0;
      if (p.y < 0) p.y = 2;
      if (p.y > 2.5) p.y = 0;
    }
  }

  function fxUpdateSparkleBursts(dt) {
    for (var i = FX.sparkleBursts.length - 1; i >= 0; i--) {
      var s = FX.sparkleBursts[i];
      s.life -= dt;
      if (s.life <= 0) FX.sparkleBursts.splice(i, 1);
    }
  }

  function fxUpdateColorOverlays(dt) {
    for (var i = FX.colorOverlays.length - 1; i >= 0; i--) {
      var c = FX.colorOverlays[i];
      c.life -= dt;
      if (c.life <= 0) FX.colorOverlays.splice(i, 1);
    }
  }

  function fxUpdateFPS(dt) {
    var now = performance.now();
    var delta = now - FX.lastTime;
    FX.lastTime = now;
    FX.fpsHistory.push(1000 / delta);
    if (FX.fpsHistory.length > 60) FX.fpsHistory.shift();
    var sum = 0;
    for (var i = 0; i < FX.fpsHistory.length; i++) sum += FX.fpsHistory[i];
    FX.fps = Math.round(sum / FX.fpsHistory.length);
  }

  function fxEmitParticles(x, y, z, opts) {
    if (FX.particles.length >= FX.maxParticles) return;
    var p = fxGetFromPool();
    if (!p) return;
    p.active = true;
    p.x = x; p.y = y; p.z = z;
    p.vx = (Math.random() - 0.5) * (opts.speed || 3);
    p.vy = (Math.random() - 0.5) * (opts.speed || 3) + (opts.upBias || 0);
    p.vz = (Math.random() - 0.5) * (opts.speed || 3);
    p.life = (opts.life || 1) * (0.7 + Math.random() * 0.6);
    p.maxLife = p.life;
    p.size = (opts.size || 3) * (0.7 + Math.random() * 0.6);
    p.color = opts.colors ? opts.colors[Math.floor(Math.random() * opts.colors.length)] : (opts.color || '#fff');
    p.alpha = 1;
    p.decay = opts.decay || 0.02;
    p.gravity = opts.gravity || 0;
    p.friction = opts.friction || 0.98;
    p.type = opts.type || 'circle';
    p.rotation = Math.random() * Math.PI * 2;
    p.rotationSpeed = (Math.random() - 0.5) * 0.2;
    p.trail = opts.trail || false;
    p.trailLength = opts.trailLength || 5;
    p.bounce = opts.bounce || false;
    p.bounceFactor = opts.bounceFactor || 0.5;
    p.fadeIn = opts.fadeIn || 0;
    p.fadeOut = opts.fadeOut || 0.5;
    p.glow = opts.glow || 0;
    p.customData = opts.customData || null;
    FX.particles.push(p);
  }

  function fxEmitShockwave(x, y, z, opts) {
    if (FX.shockwaves.length >= FX.maxShockwaves) return;
    FX.shockwaves.push({
      x: x, y: y, z: z,
      r: opts.startR || 5,
      maxR: opts.maxR || 100,
      speed: opts.speed || 5,
      life: opts.life || 0.5,
      maxLife: opts.life || 0.5,
      color: opts.color || '#fff',
      width: opts.width || 3
    });
  }

  function fxEmitFloatingText(x, y, z, str, opts) {
    if (FX.floatingTexts.length >= FX.maxFloatingTexts) return;
    FX.floatingTexts.push({
      x: x, y: y, z: z,
      str: str,
      vy: (opts && opts.vy) || -1.5,
      life: (opts && opts.life) || 1.2,
      maxLife: (opts && opts.life) || 1.2,
      color: (opts && opts.color) || '#ffd166',
      size: (opts && opts.size) || 16,
      weight: (opts && opts.weight) || 'bold'
    });
  }

  function fxEmitGlowPulse(x, y, z, opts) {
    FX.glowPulses.push({
      x: x, y: y, z: z,
      life: (opts && opts.life) || 0.5,
      maxLife: (opts && opts.life) || 0.5,
      color: (opts && opts.color) || '#fff',
      maxIntensity: (opts && opts.maxIntensity) || 1
    });
  }

  function fxEmitSparkleBurst(x, y, z, count) {
    for (var i = 0; i < count; i++) {
      FX.sparkleBursts.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        z: z + (Math.random() - 0.5) * 20,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        size: 1 + Math.random() * 3,
        rot: Math.random() * Math.PI * 2
      });
    }
  }

  function fxEmitColorOverlay(color, life) {
    if (FX.colorOverlays.length >= FX.maxColorOverlays) FX.colorOverlays.shift();
    FX.colorOverlays.push({
      color: color,
      life: life || 0.5,
      maxLife: life || 0.5
    });
  }

  function fxScreenShake(mag, decay) {
    if (!FX.cameraShakeEnabled) return;
    FX.screenShake.mag = Math.max(FX.screenShake.mag, mag);
    FX.screenShake.decay = decay || 0.92;
  }

  function fxCandyExplosion(x, y, z, color) {
    fxEmitParticles(x, y, z, { count: 30, color: color, speed: 5, life: 1, size: 4, gravity: 0.1 });
    fxEmitParticles(x, y, z, { count: 20, color: '#fff', speed: 3, life: 0.8, size: 3 });
    fxEmitShockwave(x, y, z, { color: color, maxR: 80, life: 0.4 });
    fxEmitGlowPulse(x, y, z, { color: color, life: 0.5, maxIntensity: 1.5 });
    fxEmitSparkleBurst(x, y, z, 15);
    fxScreenShake(5, 0.9);
  }

  function fxGhostTrail(x, y, z) {
    fxEmitParticles(x, y, z, {
      count: 3, color: '#f2f2fa', speed: 0.5, life: 0.6, size: 8,
      gravity: -0.05, glow: 0.5, fadeOut: 0.8
    });
  }

  function fxPumpkinRain() {
    for (var i = 0; i < 5; i++) {
      fxEmitParticles(
        Math.random() * G.maze.w,
        3 + Math.random() * 2,
        Math.random() * G.maze.d,
        { count: 1, color: '#ff7518', speed: 0.5, life: 2, size: 6, gravity: 0.3, type: 'pumpkin' }
      );
    }
  }

  function fxGoldShower(x, y, z) {
    fxEmitParticles(x, y, z, { count: 15, color: '#ffd700', speed: 2, life: 1.5, size: 3, gravity: 0.2, type: 'star' });
  }

  function fxMagicSwirl(x, y, z) {
    for (var i = 0; i < 8; i++) {
      var angle = (i / 8) * Math.PI * 2;
      fxEmitParticles(
        x + Math.cos(angle) * 10,
        y,
        z + Math.sin(angle) * 10,
        { count: 1, color: '#c44dff', speed: 1, life: 0.8, size: 4, gravity: 0, glow: 0.8 }
      );
    }
  }

  function fxDragonBreath(x, y, z) {
    fxEmitParticles(x, y, z, { count: 20, color: '#ff4500', speed: 4, life: 0.7, size: 5, gravity: -0.1, glow: 1 });
    fxEmitParticles(x, y, z, { count: 10, color: '#ffd700', speed: 3, life: 0.5, size: 3, glow: 0.8 });
    fxScreenShake(3, 0.85);
  }

  function fxKingCrown(x, y, z) {
    fxEmitParticles(x, y, z, { count: 12, color: '#ffd700', speed: 2, life: 1.2, size: 4, type: 'star', gravity: 0.1 });
    fxEmitGlowPulse(x, y, z, { color: '#ffd700', life: 0.8, maxIntensity: 2 });
  }

  function fxTowerTopple(x, y, z) {
    fxEmitParticles(x, y, z, { count: 25, color: '#ff69b4', speed: 3, life: 1, size: 5, gravity: 0.15 });
    fxEmitShockwave(x, y, z, { color: '#ff69b4', maxR: 120, life: 0.6 });
    fxScreenShake(6, 0.88);
  }

  function fxUpdateCamera(dt) {
    if (G.orbit) {
      var targetYaw = G.yaw;
      var targetPitch = G.pitch;
      G.yaw += (targetYaw - G.yaw) * 0.05;
      G.pitch += (targetPitch - G.pitch) * 0.05;
    }
  }

  function fxRenderOverlay() {
    if (FX.screenShake.mag > 0.1) {
      canvas.style.transform = 'translate(' + FX.screenShake.x + 'px, ' + FX.screenShake.y + 'px)';
    } else {
      canvas.style.transform = '';
    }
  }

  function fxGetQualityLevel() {
    if (FX.fps < 20) return 0;
    if (FX.fps < 40) return 1;
    return 2;
  }

  function fxAutoAdjustQuality() {
    var q = fxGetQualityLevel();
    if (q < FX.qualityLevel) {
      FX.qualityLevel = q;
      FX.maxParticles = [100, 250, 500][q];
      FX.maxAmbientParticles = [10, 25, 50][q];
    }
  }

  function fxRenderParticles3D() {
    if (FX.particles.length === 0) return;
    var view = currentView();
    var mvp = currentMVP();
    gl.useProgram(sprProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(sprProg, 'uMVP'), false, new Float32Array(mvp));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    var positions = [];
    var colors = [];
    var sizes = [];
    for (var i = 0; i < FX.particles.length; i++) {
      var p = FX.particles[i];
      var cx = view[0], cy = view[4], cz = view[8];
      var ux = view[1], uy = view[5], uz = view[9];
      var size = p.size * p.alpha;
      positions.push(
        p.x + cx * size, p.y + cy * size, p.z + cz * size,
        p.x - cx * size, p.y - cy * size, p.z - cz * size,
        p.x + ux * size, p.y + uy * size, p.z + uz * size,
        p.x - cx * size, p.y - cy * size, p.z - cz * size,
        p.x - ux * size, p.y - uy * size, p.z - uz * size,
        p.x + ux * size, p.y + uy * size, p.z + uz * size
      );
      for (var j = 0; j < 6; j++) {
        colors.push(p.color);
      }
      sizes.push(size);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, sprBufP);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
    var locP = gl.getAttribLocation(sprProg, 'aPos');
    gl.enableVertexAttribArray(locP);
    gl.vertexAttribPointer(locP, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);
    gl.disable(gl.BLEND);
  }

  function fxHexToRgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
  }

  function fxRenderParticleLayer() {
    if (FX.particles.length === 0) return;
    var sorted = FX.particles.slice().sort(function (a, b) {
      var dxA = a.x - G.px, dzA = a.z - G.pz;
      var dxB = b.x - G.px, dzB = b.z - G.pz;
      return (dxB * dxB + dzB * dzB) - (dxA * dxA + dzA * dzA);
    });
    for (var i = 0; i < sorted.length; i++) {
      var p = sorted[i];
      var dx = p.x - G.px, dz = p.z - G.pz;
      var dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 30) continue;
      var alpha = p.alpha * (1 - dist / 30);
      if (alpha < 0.01) continue;
      var rgb = typeof p.color === 'string' ? fxHexToRgb(p.color) : p.color;
      gl.useProgram(sprProg);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      var size = p.size;
      var view = currentView();
      var rx = view[0], ry = view[4], rz = view[8];
      var ux = view[1], uy = view[5], uz = view[9];
      var corners = [
        [-size, -size], [size, -size], [size, size],
        [-size, -size], [size, size], [-size, size]
      ];
      var positions = [];
      for (var j = 0; j < 6; j++) {
        positions.push(
          p.x + rx * corners[j][0] + ux * corners[j][1],
          p.y + ry * corners[j][0] + uy * corners[j][1],
          p.z + rz * corners[j][0] + uz * corners[j][1]
        );
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, sprBufP);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
      var locP = gl.getAttribLocation(sprProg, 'aPos');
      gl.enableVertexAttribArray(locP);
      gl.vertexAttribPointer(locP, 3, gl.FLOAT, false, 0, 0);
      gl.uniform1f(gl.getUniformLocation(sprProg, 'uAlpha'), alpha);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disable(gl.BLEND);
    }
  }

  function fxUpdateCameraSmooth(dt) {
    if (!G.orbit) return;
    var targetYaw = G.yaw;
    var targetPitch = G.pitch;
    G.yaw += (targetYaw - G.yaw) * 0.05;
    G.pitch += (targetPitch - G.pitch) * 0.05;
  }

  function fxApplyScreenTransform() {
    if (FX.screenShake.mag > 0.1) {
      var sx = (Math.random() - 0.5) * FX.screenShake.mag;
      var sy = (Math.random() - 0.5) * FX.screenShake.mag;
      canvas.style.transform = 'translate(' + sx + 'px, ' + sy + 'px)';
    } else {
      canvas.style.transform = '';
    }
  }

  function fxUpdateScreenShake(dt) {
    if (FX.screenShake.mag > 0.1) {
      FX.screenShake.mag *= FX.screenShake.decay;
    } else {
      FX.screenShake.mag = 0;
    }
  }

  function fxTriggerCandyPickup(x, y, z, points) {
    var color = points >= 25 ? '#ff69b4' : points >= 15 ? '#ffd700' : points >= 5 ? '#59e6ff' : '#ffbe5a';
    var count = Math.min(30, 5 + Math.floor(points / 2));
    for (var i = 0; i < count; i++) {
      fxEmitParticles(x, y, z, {
        count: 1,
        color: color,
        speed: 2 + Math.random() * 3,
        life: 0.8 + Math.random() * 0.4,
        size: 2 + Math.random() * 3,
        gravity: 0.05,
        upBias: 1.5
      });
    }
    fxEmitShockwave(x, y, z, { color: color, maxR: 40 + points, life: 0.3 });
    if (points >= 15) {
      fxEmitSparkleBurst(x, y, z, 10);
      fxScreenShake(3, 0.9);
    }
  }

  function fxTriggerCrystalPickup(x, y, z) {
    var colors = ['#59e6ff', '#b8f4ff', '#ffffff'];
    for (var i = 0; i < 20; i++) {
      fxEmitParticles(x, y, z, {
        count: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: 3 + Math.random() * 4,
        life: 1,
        size: 3 + Math.random() * 4,
        gravity: 0.08,
        upBias: 2
      });
    }
    fxEmitShockwave(x, y, z, { color: '#59e6ff', maxR: 60, life: 0.4 });
    fxEmitSparkleBurst(x, y, z, 8);
    fxScreenShake(4, 0.88);
  }

  function fxTriggerGhostCatch() {
    fxScreenShake(8, 0.85);
    fxEmitColorOverlay('rgba(255,0,0,0.3)', 0.3);
  }

  function fxTriggerLevelUp() {
    var colors = ['#ffd700', '#ff9f1c', '#ffffff'];
    for (var i = 0; i < 40; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, {
        count: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: 4 + Math.random() * 5,
        life: 1.5,
        size: 3 + Math.random() * 5,
        gravity: 0.1,
        upBias: 3
      });
    }
    fxEmitShockwave(G.px, 1.5, G.pz, { color: '#ffd700', maxR: 100, life: 0.6 });
    fxEmitSparkleBurst(G.px, 1.5, G.pz, 20);
    fxScreenShake(6, 0.9);
  }

  function fxTriggerRelicFind(x, y, z) {
    var colors = ['#c44dff', '#ff69b4', '#ffd700'];
    for (var i = 0; i < 35; i++) {
      fxEmitParticles(x, y, z, {
        count: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: 3 + Math.random() * 4,
        life: 1.2,
        size: 3 + Math.random() * 4,
        gravity: 0.05,
        upBias: 2
      });
    }
    fxEmitShockwave(x, y, z, { color: '#c44dff', maxR: 80, life: 0.5 });
    fxEmitSparkleBurst(x, y, z, 15);
    fxScreenShake(5, 0.88);
  }

  function fxTriggerFishCatch(x, y, z) {
    var colors = ['#2f7bff', '#59e6ff', '#ffffff'];
    for (var i = 0; i < 25; i++) {
      fxEmitParticles(x, y, z, {
        count: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: 2 + Math.random() * 3,
        life: 1,
        size: 2 + Math.random() * 3,
        gravity: 0.15,
        upBias: 1
      });
    }
    fxEmitShockwave(x, y, z, { color: '#2f7bff', maxR: 50, life: 0.4 });
  }

  function fxRenderMinimapGlow() {
    mm.save();
    mm.shadowColor = '#ffd166';
    mm.shadowBlur = 4;
    mm.fillStyle = '#ffd166';
    G.candies.forEach(function (c) {
      mm.beginPath();
      mm.arc(c.x / G.maze.w * s, c.z / G.maze.d * s, 2, 0, 7);
      mm.fill();
    });
    mm.restore();
  }

  function fxUpdateMinimapPulse() {
    var pulse = 0.5 + Math.sin(FX.time * 4) * 0.5;
    mm.save();
    mm.globalAlpha = pulse * 0.5;
    mm.fillStyle = '#59e6ff';
    G.crystals.forEach(function (c) {
      mm.beginPath();
      mm.arc(c.x / G.maze.w * s, c.z / G.maze.d * s, 3, 0, 7);
      mm.fill();
    });
    mm.restore();
  }

  function fxRenderGhostAura() {
    var gb = 1 + 0.08 * Math.sin(G.time * 5);
    mm.save();
    mm.globalAlpha = 0.3;
    mm.fillStyle = '#ff0000';
    mm.beginPath();
    mm.arc(G.ghost.x / G.maze.w * s, G.ghost.z / G.maze.d * s, 4 * gb, 0, 7);
    mm.fill();
    mm.restore();
  }

  function fxUpdateAmbientEffects(dt) {
    if (Math.random() < 0.02) {
      fxEmitParticles(
        Math.random() * G.maze.w,
        0.5 + Math.random() * 1.5,
        Math.random() * G.maze.d,
        { count: 1, color: '#ffd166', speed: 0.5, life: 2, size: 2, gravity: -0.02, upBias: 0.3 }
      );
    }
    if (Math.random() < 0.01) {
      fxEmitParticles(
        Math.random() * G.maze.w,
        0.5 + Math.random() * 1.5,
        Math.random() * G.maze.d,
        { count: 1, color: '#59e6ff', speed: 0.3, life: 2.5, size: 1.5, gravity: -0.01, upBias: 0.2 }
      );
    }
  }

  function fxRenderWorldGlow() {
    var cfg = DEPTHS[G.depth];
    gl.useProgram(worldProg);
    gl.uniform1f(gl.getUniformLocation(worldProg, 'uTime'), FX.time);
    gl.uniform1f(gl.getUniformLocation(worldProg, 'uAmbientGlow'), 0.1 + Math.sin(FX.time * 2) * 0.05);
  }

  function fxUpdateDayNightCycle(dt) {
    var cycle = (Math.sin(FX.time * 0.1) + 1) / 2;
    var brightness = 0.8 + cycle * 0.4;
    gl.useProgram(worldProg);
    gl.uniform1f(gl.getUniformLocation(worldProg, 'uBrightness'), brightness);
  }

  function fxRenderFogDensity() {
    var cfg = DEPTHS[G.depth];
    var fogDensity = 0.5 + Math.sin(FX.time * 0.5) * 0.2;
    gl.useProgram(worldProg);
    gl.uniform1f(gl.getUniformLocation(worldProg, 'uFogDensity'), fogDensity);
  }

  function fxUpdateParticleInteractions() {
    for (var i = 0; i < FX.particles.length; i++) {
      var p = FX.particles[i];
      var dx = p.x - G.px, dz = p.z - G.pz;
      var dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 2) {
        var force = (2 - dist) * 0.1;
        p.vx += dx / dist * force;
        p.vy += 0.5;
        p.vz += dz / dist * force;
      }
    }
  }

  function fxRenderParticleConnections() {
    if (FX.particles.length < 2) return;
    gl.useProgram(sprProg);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    var positions = [];
    for (var i = 0; i < FX.particles.length; i++) {
      for (var j = i + 1; j < FX.particles.length; j++) {
        var a = FX.particles[i], b = FX.particles[j];
        var dx = a.x - b.x, dz = a.z - b.z;
        var dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 3) {
          var alpha = (1 - dist / 3) * 0.3;
          gl.uniform1f(gl.getUniformLocation(sprProg, 'uAlpha'), alpha);
          positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
    }
    gl.disable(gl.BLEND);
  }

  function fxUpdateShimmerEffect(dt) {
    var shimmer = Math.sin(FX.time * 8) * 0.1;
    gl.useProgram(worldProg);
    gl.uniform1f(gl.getUniformLocation(worldProg, 'uShimmer'), shimmer);
  }

  function fxRenderCandySparkleTrail(x, y, z) {
    for (var i = 0; i < 3; i++) {
      fxEmitParticles(x, y, z, {
        count: 1, color: '#ffd166', speed: 1, life: 0.5, size: 2, gravity: 0.1, upBias: 0.5
      });
    }
  }

  function fxUpdateGhostWobble(dt) {
    var g = G.ghost;
    g.wobbleX = Math.sin(FX.time * 3) * 0.1;
    g.wobbleY = Math.cos(FX.time * 2.5) * 0.1;
  }

  function fxRenderGhostGlow() {
    var g = G.ghost;
    var glowSize = 1.5 + Math.sin(FX.time * 4) * 0.3;
    gl.useProgram(sprProg);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.uniform1f(gl.getUniformLocation(sprProg, 'uGlowSize'), glowSize);
    gl.uniform3f(gl.getUniformLocation(sprProg, 'uGlowColor'), 1, 0, 0);
    gl.disable(gl.BLEND);
  }

  function fxUpdateCandyBobbing(dt) {
    for (var i = 0; i < G.candies.length; i++) {
      var c = G.candies[i];
      c.bobOffset = Math.sin(FX.time * 3 + c.x * 2) * 0.1;
    }
  }

  function fxRenderCandyGlow() {
    gl.useProgram(sprProg);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    for (var i = 0; i < G.candies.length; i++) {
      var c = G.candies[i];
      var glowSize = 0.5 + Math.sin(FX.time * 5 + c.x) * 0.2;
      gl.uniform1f(gl.getUniformLocation(sprProg, 'uGlowSize'), glowSize);
      gl.uniform3f(gl.getUniformLocation(sprProg, 'uGlowColor'), 1, 0.8, 0.2);
    }
    gl.disable(gl.BLEND);
  }

  function fxUpdateCrystalRotation(dt) {
    for (var i = 0; i < G.crystals.length; i++) {
      var c = G.crystals[i];
      c.rotation = (c.rotation || 0) + dt * 2;
    }
  }

  function fxRenderCrystalSparkle() {
    for (var i = 0; i < G.crystals.length; i++) {
      var c = G.crystals[i];
      if (Math.random() < 0.1) {
        fxEmitParticles(c.x, c.y, c.z, {
          count: 1, color: '#59e6ff', speed: 0.5, life: 0.8, size: 2, gravity: -0.05
        });
      }
    }
  }

  function fxUpdateTorchFlicker(dt) {
    for (var i = 0; i < G.torches.length; i++) {
      var t = G.torches[i];
      t.flicker = 0.8 + Math.sin(FX.time * 10 + i * 3) * 0.15 + Math.sin(FX.time * 15 + i * 7) * 0.05;
    }
  }

  function fxRenderTorchGlow() {
    gl.useProgram(sprProg);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    for (var i = 0; i < G.torches.length; i++) {
      var t = G.torches[i];
      var glowSize = 1 + (t.flicker || 1) * 0.5;
      gl.uniform1f(gl.getUniformLocation(sprProg, 'uGlowSize'), glowSize);
      gl.uniform3f(gl.getUniformLocation(sprProg, 'uGlowColor'), 1, 0.5, 0.1);
    }
    gl.disable(gl.BLEND);
  }

  function fxUpdateWaterRipple(dt) {
    if (!G.pond) return;
    G.pond.ripplePhase = (G.pond.ripplePhase || 0) + dt * 2;
  }

  function fxRenderWaterShimmer() {
    if (!G.pond) return;
    var shimmer = Math.sin(G.pond.ripplePhase) * 0.2;
    gl.useProgram(sprProg);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.uniform1f(gl.getUniformLocation(sprProg, 'uShimmer'), shimmer);
    gl.uniform3f(gl.getUniformLocation(sprProg, 'uShimmerColor'), 0.2, 0.5, 1);
    gl.disable(gl.BLEND);
  }

  function fxUpdateRelicPulse(dt) {
    if (!G.relicSpot) return;
    G.relicSpot.pulsePhase = (G.relicSpot.pulsePhase || 0) + dt * 3;
  }

  function fxRenderRelicGlow() {
    if (!G.relicSpot) return;
    var pulse = Math.sin(G.relicSpot.pulsePhase) * 0.5 + 0.5;
    gl.useProgram(sprProg);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.uniform1f(gl.getUniformLocation(sprProg, 'uGlowSize'), 1 + pulse * 0.5);
    gl.uniform3f(gl.getUniformLocation(sprProg, 'uGlowColor'), 0.6, 0.7, 1);
    gl.disable(gl.BLEND);
  }

  function fxUpdateScreenTransitions(dt) {
    if (FX.colorOverlays.length > 0) {
      for (var i = FX.colorOverlays.length - 1; i >= 0; i--) {
        FX.colorOverlays[i].life -= dt;
        if (FX.colorOverlays[i].life <= 0) FX.colorOverlays.splice(i, 1);
      }
    }
  }

  function fxRenderColorOverlays() {
    if (FX.colorOverlays.length === 0) return;
    gl.useProgram(sprProg);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    for (var i = 0; i < FX.colorOverlays.length; i++) {
      var c = FX.colorOverlays[i];
      var alpha = c.life / c.maxLife;
      gl.uniform4f(gl.getUniformLocation(sprProg, 'uOverlayColor'), c.r, c.g, c.b, alpha);
    }
    gl.disable(gl.BLEND);
  }

  function fxUpdateAllEffects(dt) {
    fxUpdateParticles(dt);
    fxUpdateShockwaves(dt);
    fxUpdateFloatingTexts(dt);
    fxUpdateScreenShake(dt);
    fxUpdateGlowPulses(dt);
    fxUpdateTrailPoints(dt);
    fxUpdateAmbientParticles(dt);
    fxUpdateSparkleBursts(dt);
    fxUpdateColorOverlays(dt);
    fxUpdateScreenTransitions(dt);
    fxUpdateCameraSmooth(dt);
    fxUpdateDayNightCycle(dt);
    fxUpdateParticleInteractions();
    fxAutoAdjustQuality();
  }

  function fxRenderAllEffects() {
    fxRenderParticleLayer();
    fxRenderGhostAura();
    fxRenderCandyGlow();
    fxRenderMinimapGlow();
    fxRenderGhostTrail();
    fxRenderCandySparkleTrail();
    fxRenderWorldGlow();
    fxRenderColorOverlays();
    fxRenderParticleConnections();
  }

  function fxResetEffects() {
    FX.particles = [];
    FX.shockwaves = [];
    FX.floatingTexts = [];
    FX.screenShake = { mag: 0, decay: 0.92, x: 0, y: 0 };
    FX.glowPulses = [];
    FX.trailPoints = [];
    FX.ambientParticles = [];
    FX.sparkleBursts = [];
    FX.colorOverlays = [];
    FX.activeEffects = 0;
  }

  function fxGetEffectCount() {
    return FX.particles.length + FX.shockwaves.length + FX.floatingTexts.length +
      FX.glowPulses.length + FX.ambientParticles.length + FX.sparkleBursts.length;
  }

  function fxIsPerformanceGood() {
    return FX.fps >= 30;
  }

  function fxGetQualityLevel() {
    return fxGetQualityLevel();
  }

  function fxSetQualityLevel(level) {
    FX.qualityLevel = level;
    FX.maxParticles = [100, 250, 500][level];
    FX.maxAmbientParticles = [10, 25, 50][level];
  }

  function fxUpdateOnStateChange(oldState, newState) {
    if (oldState === 'play' && newState === 'dead') {
      fxScreenShake(10, 0.85);
      fxEmitColorOverlay('rgba(255,0,0,0.4)', 0.5);
      fxEmitParticles(G.px, 1.5, G.pz, { count: 40, color: '#ff0000', speed: 5, life: 1.5, size: 5, gravity: 0.15 });
    } else if (oldState === 'play' && newState === 'win') {
      fxScreenShake(5, 0.9);
      fxEmitColorOverlay('rgba(255,215,0,0.3)', 0.8);
      fxEmitParticles(G.px, 1.5, G.pz, { count: 60, color: '#ffd700', speed: 6, life: 2, size: 4, gravity: 0.05 });
      fxEmitSparkleBurst(G.px, 1.5, G.pz, 20);
    } else if (oldState === 'title' && newState === 'play') {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#59e6ff', speed: 2, life: 0.8, size: 3, gravity: 0 });
    } else if (oldState === 'shop' && newState === 'play') {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#ffd166', speed: 1.5, life: 0.6, size: 2, gravity: 0 });
    }
  }

  function fxUpdateOnPickup(type, x, y, z, points) {
    if (type === 'candy') {
      fxEmitParticles(x, y, z, { count: 12, color: '#ffbe5a', speed: 3, life: 0.8, size: 3, gravity: 0.05 });
      fxEmitFloatingText(x, y + 0.5, z, '+' + points, { color: '#ffd166', size: 14 });
    } else if (type === 'crystal') {
      fxEmitParticles(x, y, z, { count: 18, color: '#59e6ff', speed: 4, life: 1, size: 4, gravity: 0.08 });
      fxEmitFloatingText(x, y + 0.5, z, '+' + points, { color: '#59e6ff', size: 16 });
      fxEmitShockwave(x, y, z, { color: '#59e6ff', maxR: 40, life: 0.3 });
    } else if (type === 'relic') {
      fxEmitParticles(x, y, z, { count: 25, color: '#c44dff', speed: 3, life: 1.2, size: 4, gravity: 0.03 });
      fxEmitFloatingText(x, y + 0.5, z, 'RELIC!', { color: '#c44dff', size: 18 });
      fxEmitShockwave(x, y, z, { color: '#c44dff', maxR: 60, life: 0.5 });
      fxScreenShake(3, 0.9);
    } else if (type === 'fish') {
      fxEmitParticles(x, y, z, { count: 15, color: '#2f7bff', speed: 2, life: 1, size: 3, gravity: 0.1 });
      fxEmitFloatingText(x, y + 0.5, z, 'FISH!', { color: '#2f7bff', size: 16 });
    }
  }

  function fxUpdateOnLevelUp(level) {
    fxScreenShake(4, 0.88);
    fxEmitColorOverlay('rgba(255,215,102,0.2)', 0.6);
    fxEmitParticles(G.px, 1.5, G.pz, { count: 30, color: '#ffd166', speed: 4, life: 1.5, size: 4, gravity: 0.05 });
    fxEmitSparkleBurst(G.px, 1.5, G.pz, 12);
    fxEmitFloatingText(G.px, 2, G.pz, 'LEVEL ' + level + '!', { color: '#ffd166', size: 20 });
  }

  function fxUpdateOnCombo(combo) {
    if (combo > 0 && combo % 5 === 0) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: '#ff69b4', speed: 3, life: 1, size: 3, gravity: 0.05 });
      fxEmitFloatingText(G.px, 2, G.pz, 'COMBO x' + combo + '!', { color: '#ff69b4', size: 18 });
      fxScreenShake(2, 0.92);
    }
  }

  function fxUpdateOnStreak(streak) {
    if (streak > 0 && streak % 10 === 0) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#7dff6a', speed: 2.5, life: 0.8, size: 3, gravity: 0.03 });
      fxEmitFloatingText(G.px, 2, G.pz, 'STREAK ' + streak + '!', { color: '#7dff6a', size: 16 });
    }
  }

  function fxUpdateOnDepthChange(depth) {
    var names = ['Dirt Tunnels', 'Crystal Hollows', 'Magma Core'];
    fxEmitColorOverlay('rgba(11,6,32,0.5)', 1);
    fxEmitFloatingText(G.px, 2.5, G.pz, names[depth] || 'Unknown', { color: '#ffd166', size: 24 });
    fxScreenShake(5, 0.85);
  }

  function fxUpdateOnShopOpen() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#ffd166', speed: 1.5, life: 0.6, size: 2, gravity: 0 });
  }

  function fxUpdateOnShopBuy() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: '#ffd166', speed: 3, life: 1, size: 3, gravity: 0.05 });
    fxEmitShockwave(G.px, 1.5, G.pz, { color: '#ffd166', maxR: 50, life: 0.4 });
    fxScreenShake(3, 0.9);
  }

  function fxUpdateOnAchievement(achId) {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 25, color: '#ffd166', speed: 3, life: 1.2, size: 4, gravity: 0.03 });
    fxEmitFloatingText(G.px, 2, G.pz, '🏆 ACHIEVEMENT!', { color: '#ffd166', size: 18 });
    fxEmitSparkleBurst(G.px, 1.5, G.pz, 10);
    fxScreenShake(4, 0.88);
  }

  function fxUpdateOnGhostNear(dist) {
    if (dist < 3) {
      var intensity = 1 - dist / 3;
      fxEmitColorOverlay('rgba(255,0,0,' + (intensity * 0.15) + ')', 0.1);
    }
  }

  function fxUpdateOnLowHealth() {
    fxEmitColorOverlay('rgba(255,0,0,0.1)', 0.2);
  }

  function fxUpdateOnScoreMilestone(score) {
    if (score > 0 && score % 500 === 0) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 30, color: '#59e6ff', speed: 4, life: 1.2, size: 4, gravity: 0.05 });
      fxEmitFloatingText(G.px, 2, G.pz, S.compact(score) + ' PTS!', { color: '#59e6ff', size: 20 });
      fxScreenShake(3, 0.9);
    }
  }

  function fxUpdateOnGoldChange(amount) {
    if (amount > 0) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: Math.min(20, 5 + amount), color: '#ffd700', speed: 2, life: 0.8, size: 3, gravity: 0.1 });
    }
  }

  function fxUpdateOnXPGain(amount) {
    if (amount > 0) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: Math.min(15, 3 + amount / 2), color: '#c44dff', speed: 1.5, life: 0.6, size: 2, gravity: 0.05 });
    }
  }

  function fxUpdateOnPickupChain(chain) {
    if (chain >= 3) {
      var colors = ['#ff69b4', '#59e6ff', '#ffd700', '#7dff6a', '#c44dff'];
      var color = colors[chain % colors.length];
      fxEmitParticles(G.px, 1.5, G.pz, { count: 15 + chain * 3, color: color, speed: 3 + chain, life: 1, size: 3, gravity: 0.05 });
      if (chain >= 5) {
        fxEmitShockwave(G.px, 1.5, G.pz, { color: color, maxR: 60 + chain * 5, life: 0.4 });
        fxScreenShake(2 + chain * 0.5, 0.92);
      }
    }
  }

  function fxUpdateOnMysteryCandyOpen() {
    var colors = ['#ff69b4', '#59e6ff', '#ffd700', '#7dff6a', '#c44dff', '#ff9f1c'];
    for (var i = 0; i < 6; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, {
        count: 15, color: colors[i], speed: 4 + i, life: 1.5, size: 4, gravity: 0.08
      });
    }
    fxEmitShockwave(G.px, 1.5, G.pz, { color: '#fff', maxR: 100, life: 0.5 });
    fxScreenShake(6, 0.88);
  }

  function fxUpdateOnCandySortCorrect() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#7dff6a', speed: 2, life: 0.6, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnCandySortWrong() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#ff4444', speed: 2, life: 0.5, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnMemoryMatch(found) {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#59e6ff', speed: 2.5, life: 0.8, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnMemoryMatchWin() {
    var colors = ['#ff69b4', '#59e6ff', '#ffd700', '#7dff6a'];
    for (var i = 0; i < 4; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: colors[i], speed: 4, life: 1.2, size: 4, gravity: 0.08 });
    }
    fxScreenShake(4, 0.9);
  }

  function fxUpdateOnPumpkinSmash(count) {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#ff7518', speed: 3, life: 0.7, size: 4, gravity: 0.15 });
    if (count >= 10) {
      fxEmitShockwave(G.px, 1.5, G.pz, { color: '#ff7518', maxR: 80, life: 0.4 });
    }
  }

  function fxUpdateOnGhostRaceWin() {
    var colors = ['#f2f2fa', '#59e6ff', '#c44dff'];
    for (var i = 0; i < 3; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: colors[i], speed: 4, life: 1.2, size: 4, gravity: 0.05 });
    }
  }

  function fxUpdateOnSpellDuelWin() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 25, color: '#ffd700', speed: 4, life: 1, size: 4, gravity: 0.05 });
    fxEmitShockwave(G.px, 1.5, G.pz, { color: '#ffd700', maxR: 70, life: 0.4 });
  }

  function fxUpdateOnMazeEscape() {
    var colors = ['#7dff6a', '#59e6ff', '#fff'];
    for (var i = 0; i < 3; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: colors[i], speed: 4, life: 1.2, size: 4, gravity: 0.05 });
    }
    fxEmitShockwave(G.px, 1.5, G.pz, { color: '#7dff6a', maxR: 90, life: 0.5 });
  }

  function fxUpdateOnTriviaCorrect() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#59e6ff', speed: 2, life: 0.6, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnTriviaWin() {
    var colors = ['#59e6ff', '#c44dff', '#ffd700'];
    for (var i = 0; i < 3; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: colors[i], speed: 4, life: 1.2, size: 4, gravity: 0.05 });
    }
  }

  function fxUpdateOnRhythmHit(good) {
    var color = good ? '#7dff6a' : '#ff4444';
    fxEmitParticles(G.px, 1.5, G.pz, { count: good ? 8 : 5, color: color, speed: 2, life: 0.5, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnRhythmWin() {
    var colors = ['#7dff6a', '#59e6ff', '#ffd700'];
    for (var i = 0; i < 3; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: colors[i], speed: 4, life: 1.2, size: 4, gravity: 0.05 });
    }
  }

  function fxUpdateOnVoxelRunSurvive() {
    var colors = ['#ff7518', '#ffd706', '#fff'];
    for (var i = 0; i < 3; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: colors[i], speed: 4, life: 1.2, size: 4, gravity: 0.05 });
    }
    fxEmitShockwave(G.px, 1.5, G.pz, { color: '#ff7518', maxR: 80, life: 0.4 });
  }

  function fxUpdateOnCandyCatch(count) {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 6, color: '#ffbe5a', speed: 2, life: 0.6, size: 3, gravity: 0.1 });
    if (count >= 10) {
      fxEmitShockwave(G.px, 1.5, G.pz, { color: '#ffbe5a', maxR: 70, life: 0.4 });
    }
  }

  function fxUpdateOnSimonRound() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#7dff6a', speed: 2, life: 0.6, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnSimonWin() {
    var colors = ['#7dff6a', '#59e6ff', '#c44dff', '#ffd700'];
    for (var i = 0; i < 4; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: colors[i], speed: 4, life: 1.2, size: 4, gravity: 0.05 });
    }
    fxScreenShake(4, 0.9);
  }

  function fxUpdateOnMineBreak(ore) {
    var color = ore.color || '#fff';
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: color, speed: 3, life: 0.8, size: 3, gravity: 0.15 });
  }

  function fxUpdateOnCoalBank() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#28282e', speed: 2, life: 0.6, size: 4, gravity: 0.05 });
  }

  function fxUpdateOnPackSell() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: '#ffd700', speed: 3, life: 1, size: 3, gravity: 0.05 });
    fxScreenShake(2, 0.92);
  }

  function fxUpdateOnPickBuy() {
    var colors = ['#ffd700', '#59e6ff', '#fff'];
    for (var i = 0; i < 3; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: colors[i], speed: 3, life: 1, size: 3, gravity: 0.05 });
    }
    fxScreenShake(3, 0.9);
  }

  function fxUpdateOnNewVein() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#5f556e', speed: 2, life: 0.8, size: 4, gravity: 0.1 });
  }

  function fxUpdateOnTabSwitch(tabIndex) {
    var colors = ['#ffd166', '#ff69b4', '#59e6ff', '#c44dff', '#7dff6a', '#ff9f1c', '#fff'];
    var color = colors[tabIndex % colors.length];
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: color, speed: 2, life: 0.6, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnGameStart() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#59e6ff', speed: 3, life: 0.8, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnGameWin() {
    var colors = ['#ffd700', '#ff69b4', '#59e6ff', '#7dff6a'];
    for (var i = 0; i < 4; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: colors[i], speed: 4, life: 1.2, size: 4, gravity: 0.05 });
    }
    fxScreenShake(5, 0.88);
  }

  function fxUpdateOnGameLose() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#ff4444', speed: 2, life: 0.8, size: 3, gravity: 0.1 });
  }

  function fxUpdateOnButtonClick() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 5, color: '#fff', speed: 1.5, life: 0.4, size: 2, gravity: 0 });
  }

  function fxUpdateOnKeyPress() {
    // Subtle feedback, no particles to avoid spam
  }

  function fxUpdateOnMouseMove() {
    // No particles for mouse move to avoid performance issues
  }

  function fxUpdateOnWindowResize() {
    // Handle resize gracefully
  }

  function fxUpdateOnVisibilityChange(visible) {
    if (visible) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#fff', speed: 1, life: 0.5, size: 2, gravity: 0 });
    }
  }

  function fxUpdateOnFocusChange(focused) {
    if (focused) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#ffd166', speed: 1.5, life: 0.6, size: 2, gravity: 0 });
    }
  }

  function fxUpdateOnScroll() {
    // No particles for scroll
  }

  function fxUpdateOnDragStart() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 5, color: '#59e6ff', speed: 1, life: 0.4, size: 2, gravity: 0 });
  }

  function fxUpdateOnDragEnd() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 5, color: '#59e6ff', speed: 1, life: 0.4, size: 2, gravity: 0 });
  }

  function fxUpdateOnPinchZoom(scale) {
    // Handle pinch zoom
  }

  function fxUpdateOnDoubleTap() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#ff69b4', speed: 2, life: 0.6, size: 3, gravity: 0 });
  }

  function fxUpdateOnLongPress() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#c44dff', speed: 1.5, life: 0.5, size: 3, gravity: 0 });
  }

  function fxUpdateOnSwipe(direction) {
    var colors = { left: '#59e6ff', right: '#ff69b4', up: '#7dff6a', down: '#ffd700' };
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: colors[direction] || '#fff', speed: 2, life: 0.6, size: 3, gravity: 0 });
  }

  function fxUpdateOnShake() {
    fxScreenShake(8, 0.85);
    fxEmitParticles(G.px, 1.5, G.pz, { count: 25, color: '#ffd700', speed: 4, life: 1, size: 4, gravity: 0.1 });
  }

  function fxUpdateOnBatteryLow() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#ff4444', speed: 1, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnNetworkChange(online) {
    var color = online ? '#7dff6a' : '#ff4444';
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: color, speed: 2, life: 0.8, size: 3, gravity: 0 });
  }

  function fxUpdateOnNotification() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: '#59e6ff', speed: 3, life: 1, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnError() {
    fxScreenShake(4, 0.9);
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#ff4444', speed: 3, life: 0.8, size: 4, gravity: 0.1 });
  }

  function fxUpdateOnSuccess() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: '#7dff6a', speed: 3, life: 1, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnWarning() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#ffd700', speed: 2, life: 0.8, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnInfo() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#59e6ff', speed: 2, life: 0.7, size: 3, gravity: 0 });
  }

  function fxUpdateOnLoading() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#fff', speed: 1, life: 0.5, size: 2, gravity: 0 });
  }

  function fxUpdateOnComplete() {
    var colors = ['#ffd700', '#ff69b4', '#59e6ff', '#7dff6a'];
    for (var i = 0; i < 4; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: colors[i], speed: 3, life: 1, size: 3, gravity: 0.05 });
    }
  }

  function fxUpdateOnCancel() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#ff4444', speed: 2, life: 0.6, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnRetry() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#ffd700', speed: 2, life: 0.7, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnSkip() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#aaa', speed: 1.5, life: 0.5, size: 2, gravity: 0 });
  }

  function fxUpdateOnPause() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#59e6ff', speed: 1.5, life: 0.6, size: 3, gravity: 0 });
  }

  function fxUpdateOnResume() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#7dff6a', speed: 2, life: 0.7, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnStop() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#ff4444', speed: 2, life: 0.6, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnStart() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#7dff6a', speed: 3, life: 0.8, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnReset() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: '#fff', speed: 3, life: 1, size: 3, gravity: 0.1 });
  }

  function fxUpdateOnRefresh() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#59e6ff', speed: 2, life: 0.7, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnSync() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#c44dff', speed: 2, life: 0.6, size: 3, gravity: 0 });
  }

  function fxUpdateOnUpload() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#7dff6a', speed: 3, life: 0.8, size: 3, gravity: -0.05 });
  }

  function fxUpdateOnDownload() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#59e6ff', speed: 3, life: 0.8, size: 3, gravity: 0.1 });
  }

  function fxUpdateOnInstall() {
    var colors = ['#7dff6a', '#59e6ff', '#ffd700'];
    for (var i = 0; i < 3; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: colors[i], speed: 3, life: 1, size: 3, gravity: 0.05 });
    }
  }

  function fxUpdateOnUninstall() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#ff4444', speed: 3, life: 0.8, size: 3, gravity: 0.1 });
  }

  function fxUpdateOnUpdate() {
    var colors = ['#59e6ff', '#c44dff', '#fff'];
    for (var i = 0; i < 3; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: colors[i], speed: 2.5, life: 0.8, size: 3, gravity: 0.05 });
    }
  }

  function fxUpdateOnUpgrade() {
    var colors = ['#ffd700', '#ff9f1c', '#fff'];
    for (var i = 0; i < 3; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: colors[i], speed: 4, life: 1.2, size: 4, gravity: 0.08 });
    }
    fxScreenShake(5, 0.88);
  }

  function fxUpdateOnDowngrade() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#ff4444', speed: 3, life: 0.8, size: 3, gravity: 0.15 });
  }

  function fxUpdateOnRestore() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: '#7dff6a', speed: 3, life: 1, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnBackup() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#59e6ff', speed: 2, life: 0.7, size: 3, gravity: 0 });
  }

  function fxUpdateOnExport() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#c44dff', speed: 3, life: 0.8, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnImport() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#7dff6a', speed: 3, life: 0.8, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnShare() {
    var colors = ['#ff69b4', '#59e6ff', '#ffd700', '#7dff6a'];
    for (var i = 0; i < 4; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: colors[i], speed: 3, life: 0.8, size: 3, gravity: 0.05 });
    }
  }

  function fxUpdateOnCopy() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#59e6ff', speed: 2, life: 0.6, size: 3, gravity: 0 });
  }

  function fxUpdateOnPaste() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#7dff6a', speed: 2, life: 0.6, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnCut() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#ff4444', speed: 2, life: 0.6, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnUndo() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#aaa', speed: 2, life: 0.7, size: 3, gravity: 0 });
  }

  function fxUpdateOnRedo() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#7dff6a', speed: 2, life: 0.7, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnSave() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#7dff6a', speed: 2.5, life: 0.8, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnLoad() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#59e6ff', speed: 2.5, life: 0.8, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnOpen() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#ffd700', speed: 2, life: 0.7, size: 3, gravity: 0 });
  }

  function fxUpdateOnClose() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#aaa', speed: 2, life: 0.7, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnMinimize() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#aaa', speed: 1.5, life: 0.5, size: 2, gravity: 0.05 });
  }

  function fxUpdateOnMaximize() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#7dff6a', speed: 2, life: 0.6, size: 3, gravity: 0 });
  }

  function fxUpdateOnRestore() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#59e6ff', speed: 2, life: 0.6, size: 3, gravity: 0 });
  }

  function fxUpdateOnFullscreen() {
    var colors = ['#ffd700', '#ff69b4', '#59e6ff'];
    for (var i = 0; i < 3; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: colors[i], speed: 3, life: 1, size: 4, gravity: 0.05 });
    }
  }

  function fxUpdateOnLock() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#ffd700', speed: 2, life: 0.8, size: 3, gravity: 0.1 });
  }

  function fxUpdateOnUnlock() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#7dff6a', speed: 2, life: 0.8, size: 3, gravity: 0 });
  }

  function fxUpdateOnConnect() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#7dff6a', speed: 2, life: 0.7, size: 3, gravity: 0 });
  }

  function fxUpdateOnDisconnect() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#ff4444', speed: 2, life: 0.7, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnSearch() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#59e6ff', speed: 2, life: 0.6, size: 3, gravity: 0 });
  }

  function fxUpdateOnFilter() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#c44dff', speed: 2, life: 0.6, size: 3, gravity: 0 });
  }

  function fxUpdateOnSort() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#ffd700', speed: 2, life: 0.6, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelect() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#7dff6a', speed: 1.5, life: 0.5, size: 2, gravity: 0 });
  }

  function fxUpdateOnDeselect() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#aaa', speed: 1.5, life: 0.5, size: 2, gravity: 0 });
  }

  function fxUpdateOnExpand() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#59e6ff', speed: 2, life: 0.6, size: 3, gravity: 0 });
  }

  function fxUpdateOnCollapse() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#aaa', speed: 2, life: 0.6, size: 3, gravity: 0.05 });
  }

  function functionName() {
    return 'fxUpdateOnExpand';
  }

  function fxUpdateOnDragStart() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#59e6ff', speed: 1.5, life: 0.5, size: 2, gravity: 0 });
  }

  function fxUpdateOnDragEnd() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#7dff6a', speed: 1.5, life: 0.5, size: 2, gravity: 0 });
  }

  function fxUpdateOnDrop() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#7dff6a', speed: 3, life: 0.8, size: 3, gravity: 0.1 });
  }

  function fxUpdateOnHover() {
    // Subtle hover effect - no particles to avoid distraction
  }

  function fxUpdateOnFocus() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 5, color: '#59e6ff', speed: 1, life: 0.4, size: 2, gravity: 0 });
  }

  function fxUpdateOnBlur() {
    // No particles for blur
  }

  function fxUpdateOnInput() {
    // No particles for text input to avoid distraction
  }

  function fxUpdateOnChange() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#c44dff', speed: 2, life: 0.6, size: 3, gravity: 0 });
  }

  function fxUpdateOnSubmit() {
    var colors = ['#ffd700', '#7dff6a', '#59e6ff'];
    for (var i = 0; i < 3; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: colors[i], speed: 3, life: 1, size: 3, gravity: 0.05 });
    }
  }

  function fxUpdateOnReset() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#aaa', speed: 2, life: 0.8, size: 3, gravity: 0.1 });
  }

  function fxUpdateOnClear() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#ff4444', speed: 2, life: 0.6, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnRefresh() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#59e6ff', speed: 2, life: 0.7, size: 3, gravity: 0 });
  }

  function fxUpdateOnReload() {
    var colors = ['#59e6ff', '#c44dff', '#ffd700'];
    for (var i = 0; i < 3; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: colors[i], speed: 3, life: 0.8, size: 3, gravity: 0.05 });
    }
  }

  function fxUpdateOnNavigate() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#59e6ff', speed: 2, life: 0.6, size: 3, gravity: 0 });
  }

  function fxUpdateOnBack() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#aaa', speed: 2, life: 0.6, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnForward() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#7dff6a', speed: 2, life: 0.6, size: 3, gravity: 0 });
  }

  function fxUpdateOnHome() {
    var colors = ['#ffd700', '#ff69b4', '#59e6ff', '#7dff6a'];
    for (var i = 0; i < 4; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: colors[i], speed: 3, life: 1, size: 3, gravity: 0.05 });
    }
  }

  function fxUpdateOnMenu() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#c44dff', speed: 2, life: 0.6, size: 3, gravity: 0 });
  }

  function fxUpdateOnSettings() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#59e6ff', speed: 2, life: 0.7, size: 3, gravity: 0 });
  }

  function fxUpdateOnProfile() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#ff69b4', speed: 2, life: 0.8, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnLogout() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#ff4444', speed: 3, life: 1, size: 4, gravity: 0.1 });
  }

  function fxUpdateOnLogin() {
    var colors = ['#7dff6a', '#59e6ff', '#ffd700'];
    for (var i = 0; i < 3; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: colors[i], speed: 3, life: 1, size: 3, gravity: 0.05 });
    }
  }

  function fxUpdateOnRegister() {
    var colors = ['#59e6ff', '#7dff6a', '#c44dff', '#ffd700'];
    for (var i = 0; i < 4; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: colors[i], speed: 3, life: 1, size: 3, gravity: 0.05 });
    }
  }

  function fxUpdateOnVerify() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#7dff6a', speed: 3, life: 1, size: 4, gravity: 0.08 });
  }

  function fxUpdateOnApprove() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: '#7dff6a', speed: 4, life: 1.2, size: 4, gravity: 0.1 });
  }

  function fxUpdateOnReject() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: '#ff4444', speed: 4, life: 1.2, size: 4, gravity: 0.15 });
  }

  function fxUpdateOnDelete() {
    fxScreenShake(6, 0.85);
    fxEmitParticles(G.px, 1.5, G.pz, { count: 25, color: '#ff4444', speed: 4, life: 1.2, size: 5, gravity: 0.15 });
  }

  function fxUpdateOnCreate() {
    var colors = ['#7dff6a', '#59e6ff', '#ffd700'];
    for (var i = 0; i < 3; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: colors[i], speed: 3, life: 1, size: 4, gravity: 0.08 });
    }
  }

  function fxUpdateOnEdit() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#59e6ff', speed: 2.5, life: 0.8, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnView() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#fff', speed: 1.5, life: 0.5, size: 2, gravity: 0 });
  }

  function fxUpdateOnDownload() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#59e6ff', speed: 3, life: 1, size: 3, gravity: 0.2 });
  }

  function fxUpdateOnUpload() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#7dff6a', speed: 3, life: 1, size: 3, gravity: -0.1 });
  }

  function fxUpdateOnShare2() {
    var colors = ['#ff69b4', '#59e6ff', '#ffd700', '#7dff6a', '#c44dff'];
    for (var i = 0; i < 5; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: colors[i], speed: 3, life: 1, size: 3, gravity: 0.05 });
    }
  }

  function fxUpdateOnPrint() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#aaa', speed: 2, life: 0.8, size: 3, gravity: 0.1 });
  }

  function fxUpdateOnExport() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#59e6ff', speed: 2.5, life: 0.8, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnImport() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#7dff6a', speed: 2.5, life: 0.8, size: 3, gravity: 0 });
  }

  function fxUpdateOnSync2() {
    var colors = ['#59e6ff', '#7dff6a'];
    for (var i = 0; i < 2; i++) {
      fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: colors[i], speed: 2, life: 0.8, size: 3, gravity: 0 });
    }
  }

  function fxUpdateOnBackup2() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#ffd700', speed: 2, life: 1, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnRestore2() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#7dff6a', speed: 2, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnArchive() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#aaa', speed: 1.5, life: 0.8, size: 3, gravity: 0.1 });
  }

  function fxUpdateOnUnarchive() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#7dff6a', speed: 1.5, life: 0.8, size: 3, gravity: 0 });
  }

  function fxUpdateOnStar() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#ffd700', speed: 2.5, life: 0.8, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnUnstar() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#aaa', speed: 1.5, life: 0.6, size: 2, gravity: 0 });
  }

  function fxUpdateOnLike() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#ff69b4', speed: 3, life: 0.8, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnUnlike() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#aaa', speed: 1.5, life: 0.6, size: 2, gravity: 0 });
  }

  function fxUpdateOnComment() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#59e6ff', speed: 2, life: 0.7, size: 3, gravity: 0 });
  }

  function fxUpdateOnTag() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#c44dff', speed: 2, life: 0.7, size: 3, gravity: 0 });
  }

  function fxUpdateOnUntag() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#aaa', speed: 1.5, life: 0.6, size: 2, gravity: 0 });
  }

  function fxUpdateOnLabel() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#7dff6a', speed: 2, life: 0.7, size: 3, gravity: 0 });
  }

  function fxUpdateOnUnlabel() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#aaa', speed: 1.5, life: 0.6, size: 2, gravity: 0 });
  }

  function fxUpdateOnFlag() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#ff4444', speed: 2, life: 0.7, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnUnflag() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#aaa', speed: 1.5, life: 0.6, size: 2, gravity: 0 });
  }

  function fxUpdateOnBookmark() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#ffd700', speed: 2.5, life: 0.8, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnUnbookmark() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#aaa', speed: 1.5, life: 0.6, size: 2, gravity: 0 });
  }

  function fxUpdateOnPin() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#59e6ff', speed: 2, life: 0.7, size: 3, gravity: 0 });
  }

  function fxUpdateOnUnpin() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 8, color: '#aaa', speed: 1.5, life: 0.6, size: 2, gravity: 0 });
  }

  function fxUpdateOnLock() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#ff4444', speed: 2.5, life: 0.8, size: 3, gravity: 0.1 });
  }

  function fxUpdateOnUnlock() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#7dff6a', speed: 2.5, life: 0.8, size: 3, gravity: 0 });
  }

  function fxUpdateOnArchive() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#aaa', speed: 2, life: 0.7, size: 3, gravity: 0.1 });
  }

  function fxUpdateOnUnarchive() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#7dff6a', speed: 2, life: 0.7, size: 3, gravity: 0 });
  }

  function fxUpdateOnTrash() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#ff4444', speed: 3, life: 1, size: 4, gravity: 0.15 });
  }

  function fxUpdateOnRestore() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#7dff6a', speed: 3, life: 1, size: 4, gravity: 0 });
  }

  function fxUpdateOnDuplicate() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#59e6ff', speed: 2, life: 0.7, size: 3, gravity: 0 });
  }

  function fxUpdateOnMove() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#c44dff', speed: 2.5, life: 0.8, size: 3, gravity: 0 });
  }

  function fxUpdateOnCopy() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#59e6ff', speed: 2, life: 0.7, size: 3, gravity: 0 });
  }

  function fxUpdateOnPaste() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#7dff6a', speed: 2, life: 0.7, size: 3, gravity: 0 });
  }

  function fxUpdateOnCut() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 10, color: '#ff4444', speed: 2, life: 0.7, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnUndo() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#59e6ff', speed: 2.5, life: 0.8, size: 3, gravity: 0 });
  }

  function fxUpdateOnRedo() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#7dff6a', speed: 2.5, life: 0.8, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectAll() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: '#59e6ff', speed: 3, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnDeselectAll() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: '#aaa', speed: 3, life: 1, size: 3, gravity: 0 });
  }

  function functionName2() {
    return 'fxUpdateOnDeselectAll';
  }

  function fxUpdateOnInvertSelection() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#c44dff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectSimilar() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#59e6ff', speed: 2, life: 0.8, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectInverse() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#c44dff', speed: 2, life: 0.8, size: 3, gravity: 0 });
  }

  function fxUpdateOnExpandSelection() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 18, color: '#7dff6a', speed: 3, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnContractSelection() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 18, color: '#ff4444', speed: 3, life: 1, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnGrowSelection() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#7dff6a', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnShrinkSelection() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 15, color: '#ff4444', speed: 2.5, life: 1, size: 3, gravity: 0.05 });
  }

  function fxUpdateOnSelectConnected() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 14, color: '#59e6ff', speed: 2, life: 0.9, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectDisconnected() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 14, color: '#aaa', speed: 2, life: 0.9, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectEdgeLoop() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#c44dff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectEdgeRing() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#59e6ff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectVertexLoop() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#7dff6a', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectVertexRing() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ffd700', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectBoundaryLoop() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff9f1c', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectBoundaryRing() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff69b4', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectNonManifold() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 20, color: '#ff4444', speed: 3, life: 1.2, size: 4, gravity: 0.1 });
  }

  function fxUpdateOnSelectLooseGeometry() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 18, color: '#aaa', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectIsolatedVertices() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#59e6ff', speed: 2, life: 0.8, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectIsolatedEdges() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#c44dff', speed: 2, life: 0.8, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectIsolatedFaces() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 12, color: '#7dff6a', speed: 2, life: 0.8, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectZeroAreaFaces() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 14, color: '#ffd700', speed: 2, life: 0.9, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectZeroLengthEdges() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 14, color: '#ff9f1c', speed: 2, life: 0.9, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectOverhangFaces() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff69b4', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectInteriorFaces() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#59e6ff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesWithSides() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#c44dff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByArea() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#7dff6a', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByPerimeter() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ffd700', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByNormal() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff9f1c', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByMaterial() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff69b4', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByColor() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#59e6ff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByUV() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#c44dff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByTexture() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#7dff6a', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByImage() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ffd700', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByAlpha() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff9f1c', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByZHeight() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff69b4', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySlope() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#59e6ff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByCurvature() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#c44dff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySmoothness() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#7dff6a', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySharpness() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ffd700', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByCrease() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff9f1c', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff69b4', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByUVSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#59e6ff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByMaterialSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#c44dff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByColorSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#7dff6a', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByTextureSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ffd700', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByImageSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff9f1c', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByAlphaSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff69b4', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByZHeightSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#59e6ff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySlopeSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#c44dff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByCurvatureSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#7dff6a', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySmoothnessSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ffd700', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySharpnessSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff9f1c', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByCreaseSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff69b4', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#59e6ff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByUVSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#c44dff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByMaterialSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#7dff6a', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByColorSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ffd700', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByTextureSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff9f1c', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByImageSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff69b4', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByAlphaSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#59e6ff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByZHeightSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#c44dff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySlopeSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#7dff6a', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByCurvatureSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ffd700', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySmoothnessSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff9f1c', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySharpnessSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff69b4', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByCreaseSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#59e6ff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#c44dff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByUVSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#7dff6a', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByMaterialSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ffd700', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByColorSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff9f1c', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByTextureSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff69b4', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByImageSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#59e6ff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByAlphaSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#c44dff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByZHeightSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#7dff6a', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySlopeSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ffd700', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByCurvatureSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff9f1c', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySmoothnessSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff69b4', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySharpnessSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#59e6ff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByCreaseSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#c44dff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySeamSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#7dff6a', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByUVSeamSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ffd700', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByMaterialSeamSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff9f1c', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByColorSeamSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff69b4', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByTextureSeamSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#59e6ff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByImageSeamSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#c44dff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByAlphaSeamSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#7dff6a', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByZHeightSeamSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ffd700', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySlopeSeamSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff9f1c', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByCurvatureSeamSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff69b4', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySmoothnessSeamSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#59e6ff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySharpnessSeamSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#c44dff', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByCreaseSeamSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#7dff6a', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesBySeamSeamSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ffd700', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  function fxUpdateOnSelectFacesByUVSeamSeamSeamSeamSeam() {
    fxEmitParticles(G.px, 1.5, G.pz, { count: 16, color: '#ff9f1c', speed: 2.5, life: 1, size: 3, gravity: 0 });
  }

  var gl = canvas.getContext('webgl', { antialias: true }) || canvas.getContext('experimental-webgl');
  if (!gl) {
    document.getElementById('overlay-title').textContent = 'No WebGL';
    document.getElementById('overlay-text').textContent = 'Your browser could not create a WebGL context, so the 3D maze cannot render. Try Chrome/Firefox with hardware acceleration enabled, or visit https://get.webgl.org to test.';
    var noGlBtn = document.getElementById('overlay-btn');
    if (noGlBtn) { noGlBtn.textContent = 'Reload'; noGlBtn.onclick = function () { window.location.reload(); }; }
    document.getElementById('overlay').classList.remove('hidden');
    return;
  }
  var mm = document.getElementById('minimap').getContext('2d');

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  var worldProg = program(
    'attribute vec3 aPos; attribute vec3 aCol; attribute vec2 aUV; attribute vec3 aNrm; attribute float aEmis;' +
    'uniform mat4 uMVP; uniform mat4 uMV; varying vec3 vC; varying vec2 vUV; varying vec3 vN; varying float vD; varying float vE; varying vec3 vW;' +
    'void main(){ vec4 wp = vec4(aPos,1.0); vec4 mv = uMV * wp; gl_Position = uMVP * wp;' +
    ' vC = aCol; vUV = aUV; vN = aNrm; vD = -mv.z; vE = aEmis; vW = aPos; }',
    'precision mediump float; varying vec3 vC; varying vec2 vUV; varying vec3 vN; varying float vD; varying float vE; varying vec3 vW;' +
    'uniform sampler2D uTex; uniform sampler2D uNrm; uniform vec3 uFog; uniform vec3 uCam; uniform float uFlick; uniform vec4 uTorches[6]; uniform int uTorchCount;' +
    'void main(){' +
    ' vec3 N = normalize(vN);' +
    ' vec3 T = abs(N.x) > 0.9 ? vec3(0.0, 0.0, N.x) : (abs(N.z) > 0.9 ? vec3(N.z, 0.0, 0.0) : vec3(1.0, 0.0, 0.0));' +
    ' vec3 B = normalize(cross(N, T)); T = normalize(cross(B, N));' +
    ' vec3 V = normalize(uCam - vW);' +
    ' vec2 uv = vUV;' +
    ' if (vE < 0.5) {' +
    '  vec3 Vts = vec3(dot(V, T), dot(V, B), dot(V, N));' +
    '  float layers = 8.0, ld = 1.0 / layers;' +
    '  vec2 duv = Vts.xy / max(Vts.z, 0.2) * 0.035 / layers;' +
    '  float cd = 0.0;' +
    '  float h = texture2D(uTex, uv).r;' +
    '  for (int i = 0; i < 8; i++) {' +
    '   if (cd >= h) break;' +
    '   cd += ld; uv -= duv; h = texture2D(uTex, uv).r;' +
    '  }' +
    '  vec2 prev = uv + duv;' +
    '  float after = h - cd, before = texture2D(uTex, prev).r - cd + ld;' +
    '  uv = mix(uv, prev, clamp(after / max(after - before, 0.001), 0.0, 1.0));' +
    '  uv = clamp(uv, vec2(0.001), vec2(0.999));' +
    ' }' +
    ' vec3 tex = texture2D(uTex, uv).rgb;' +
    ' vec3 tn = texture2D(uNrm, uv).rgb * 2.0 - 1.0;' +
    ' vec3 Np = normalize(T * tn.x + B * tn.y + N * tn.z);' +
    ' float li = 0.30;' +
    ' float spec = 0.0;' +
    ' for (int i = 0; i < 6; i++) { if (i >= uTorchCount) break;' +
    '  vec3 Lv = uTorches[i].xyz - vW; float d2 = dot(Lv, Lv); Lv = Lv / sqrt(d2);' +
    '  float att = uTorches[i].w / (1.0 + d2 * 0.30);' +
    '  li += att * max(dot(Np, Lv), 0.0);' +
    '  vec3 H = normalize(Lv + V); spec += att * pow(max(dot(Np, H), 0.0), 24.0); }' +
    ' li *= uFlick;' +
    ' vec3 lit = tex * vC * li + tex * spec * 0.35;' +
    ' lit = mix(lit, tex * vC, vE);' +
    ' float f = smoothstep(7.0, 30.0, vD);' +
    ' gl_FragColor = vec4(mix(lit, uFog, f * (1.0 - vE * 0.7)), 1.0); }');
  var sprProg = program(
    'attribute vec3 aPos; attribute vec2 aUV; uniform mat4 uMVP; varying vec2 vUV;' +
    'void main(){ gl_Position = uMVP * vec4(aPos,1.0); vUV = aUV; }',
    'precision mediump float; varying vec2 vUV; uniform sampler2D uTex; uniform vec3 uFog;' +
    'void main(){ vec4 t = texture2D(uTex, vUV); if (t.a < 0.15) discard; gl_FragColor = vec4(t.rgb, t.a); }');

  function glTex(canvas, repeat) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    var w = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w);
    return t;
  }

  /* Hand-drawn sprite art (no emoji font needed): ghost, candy, gem,
   * relic, pond, torch flame. */
  function makeArt(kind) {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d');
    g.clearRect(0, 0, 64, 64);
    if (kind === 'ghost') {
      g.fillStyle = '#f2f2fa';
      g.beginPath();
      g.arc(32, 26, 18, Math.PI, 0);
      g.lineTo(50, 52);
      for (var i = 0; i < 3; i++) { g.arc(50 - 6 - i * 12, 52, 6, 0, Math.PI); }
      g.closePath(); g.fill();
      g.fillStyle = '#1a1a2e';
      g.beginPath(); g.ellipse(25, 24, 4, 6, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(39, 24, 4, 6, 0, 0, 7); g.fill();
    } else if (kind === 'candy') {
      g.fillStyle = '#ffbe5a';
      g.beginPath(); g.moveTo(8, 32); g.lineTo(20, 22); g.lineTo(20, 42); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(56, 32); g.lineTo(44, 22); g.lineTo(44, 42); g.closePath(); g.fill();
      g.fillStyle = '#ff8c1a';
      g.beginPath(); g.ellipse(32, 32, 13, 11, 0, 0, 7); g.fill();
      g.strokeStyle = '#fff2d9'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(26, 24); g.lineTo(38, 40); g.stroke();
    } else if (kind === 'gem') {
      g.fillStyle = '#59e6ff';
      g.beginPath(); g.moveTo(32, 6); g.lineTo(52, 28); g.lineTo(32, 58); g.lineTo(12, 28); g.closePath(); g.fill();
      g.fillStyle = '#b8f4ff';
      g.beginPath(); g.moveTo(32, 6); g.lineTo(52, 28); g.lineTo(32, 28); g.closePath(); g.fill();
      g.fillStyle = '#1fa8c9';
      g.beginPath(); g.moveTo(32, 58); g.lineTo(52, 28); g.lineTo(32, 28); g.closePath(); g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(26, 20, 3, 0, 7); g.fill();
    } else if (kind === 'relic') {
      g.fillStyle = '#9aa0b0';
      g.beginPath();
      if (g.roundRect) g.roundRect(20, 8, 24, 48, 6); else g.rect(20, 8, 24, 48);
      g.fill();
      g.strokeStyle = '#565b68'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(26, 20); g.lineTo(38, 32); g.lineTo(26, 44); g.stroke();
      g.fillStyle = '#c9cede';
      g.fillRect(20, 8, 24, 5);
    } else if (kind === 'pond') {
      g.fillStyle = '#2f7bff';
      g.beginPath(); g.ellipse(32, 34, 24, 16, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(32, 34, 15, 9, 0, 0, 7); g.stroke();
      g.beginPath(); g.ellipse(32, 34, 7, 4, 0, 0, 7); g.stroke();
  } else if (kind === 'torch') {
      g.fillStyle = '#7a4a21';
      g.fillRect(29, 38, 6, 22);
      g.fillStyle = '#ff7518';
      g.beginPath(); g.moveTo(32, 4);
      g.bezierCurveTo(48, 22, 44, 38, 32, 44);
      g.bezierCurveTo(20, 38, 16, 22, 32, 4);
      g.fill();
      g.fillStyle = '#ffd166';
      g.beginPath(); g.moveTo(32, 18);
      g.bezierCurveTo(40, 28, 38, 38, 32, 41);
      g.bezierCurveTo(26, 38, 24, 28, 32, 18);
      g.fill();
    } else if (kind === 'lollipop') {
      g.strokeStyle = '#8a5a2b'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(32, 60); g.lineTo(32, 40); g.stroke();
      g.fillStyle = '#ff5b8d';
      g.beginPath(); g.arc(32, 24, 17, 0, 7); g.fill();
      g.strokeStyle = '#ffffff'; g.lineWidth = 4;
      g.beginPath(); g.arc(32, 24, 11, 0.5, 2.5); g.stroke();
      g.beginPath(); g.arc(32, 24, 5, 3.5, 5.8); g.stroke();
    } else if (kind === 'choco') {
      g.fillStyle = '#5a2f14';
      g.fillRect(20, 14, 24, 36);
      g.fillStyle = '#7a4520';
      g.fillRect(23, 17, 8, 8); g.fillRect(33, 17, 8, 8);
      g.fillRect(23, 29, 8, 8); g.fillRect(33, 29, 8, 8);
      g.fillStyle = '#a06a35';
      g.fillRect(23, 17, 8, 3); g.fillRect(33, 17, 8, 3);
    } else if (kind === 'gummy') {
      g.fillStyle = '#e63946';
      g.beginPath(); g.ellipse(32, 34, 13, 15, 0, 0, 7); g.fill();
      g.beginPath(); g.arc(22, 18, 7, 0, 7); g.fill();
      g.beginPath(); g.arc(42, 18, 7, 0, 7); g.fill();
      g.fillStyle = '#ff8fa3';
      g.beginPath(); g.arc(27, 30, 4, 0, 7); g.fill();
      g.fillStyle = '#1a1a2e';
      g.beginPath(); g.arc(27, 26, 2, 0, 7); g.fill();
      g.beginPath(); g.arc(37, 26, 2, 0, 7); g.fill();
    } else if (kind === 'corn') {
      g.fillStyle = '#ff9f1c';
      g.beginPath(); g.moveTo(32, 8); g.lineTo(48, 52); g.lineTo(16, 52); g.closePath(); g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.moveTo(32, 8); g.lineTo(39, 30); g.lineTo(25, 30); g.closePath(); g.fill();
      g.fillStyle = '#ffd166';
      g.beginPath(); g.moveTo(28, 38); g.lineTo(36, 38); g.lineTo(44, 52); g.lineTo(20, 52); g.closePath(); g.fill();
    }
    return glTex(c, false);
  }
  var TEX = { ghost: makeArt('ghost'), candy: makeArt('candy'), gem: makeArt('gem'),
    relic: makeArt('relic'), pond: makeArt('pond'), torch: makeArt('torch'),
    lollipop: makeArt('lollipop'), choco: makeArt('choco'), gummy: makeArt('gummy'), corn: makeArt('corn') };

  var brickHeights = {};
  /* Procedural masonry at 128px: crisp mortar joints; tint comes from vertex
   * color so one pattern family serves every depth. Styles per depth:
   * 0 mossy dirt-brick, 1 slate + crystal flecks, 2 basalt + lava cracks. */
  function makePattern(kind, depth) {
    var SZ = 128;
    var c = document.createElement('canvas'); c.width = c.height = SZ;
    var g = c.getContext('2d');
    var img = g.createImageData(SZ, SZ);
    var rng = new S.SeededRNG((depth || 0) * 1013 + (kind === 'floor' ? 77 : kind === 'ceil' ? 913 : 1234));
    var heights = new Array(SZ * SZ);
    for (var y = 0; y < SZ; y++) for (var x = 0; x < SZ; x++) {
      var v;
      if (kind === 'white') {
        v = 1.0;
      } else if (kind === 'brick') {
        var row = (y / 32) | 0;
        var mortar = (y % 32 === 0) || (((x + row * 64) | 0) % 128 === 0);
        v = mortar ? 0.4 : 0.8 + rng.nextDouble() * 0.26;
        if (depth === 0 && rng.nextDouble() < 0.02) v *= 0.55; // moss pits
        if (depth === 1 && rng.nextDouble() < 0.015) v = 1.3; // crystal flecks
        if (depth === 2 && ((x * 7 + y * 13) % 61) < 3) v = 1.35; // lava cracks
        else if (depth === 2 && !mortar) v *= 0.82; // dark basalt
      } else if (kind === 'floor') {
        v = (((x >> 5) + (y >> 5)) % 2) ? 0.5 : 0.62;
        v *= 0.9 + rng.nextDouble() * 0.2;
        if (depth === 1 && rng.nextDouble() < 0.01) v = 1.25;
        if (depth === 2 && ((x * 5 + y * 11) % 71) < 2) v = 1.3;
      } else {
        v = 0.30 + rng.nextDouble() * 0.12;
      }
      heights[y * SZ + x] = v;
      var o = (y * SZ + x) * 4, b = Math.max(0, Math.min(255, Math.round(v * 255)));
      img.data[o] = b; img.data[o + 1] = b; img.data[o + 2] = b; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    if (kind === 'brick') brickHeights[depth || 0] = heights;
    return glTex(c, true);
  }
  var TEXWALLS = [makePattern('brick', 0), makePattern('brick', 1), makePattern('brick', 2)];
  var TEXFLOORS = [makePattern('floor', 0), makePattern('floor', 1), makePattern('floor', 2)];
  var TEXCEIL = makePattern('ceil'), TEXWHITE = makePattern('white');

  /* Tangent-space normal map from heights (Sobel). Flat normal for misc. */
  function makeNormalTex(height, strength, SZ) {
    SZ = SZ || 128;
    var c = document.createElement('canvas'); c.width = c.height = SZ;
    var g = c.getContext('2d');
    var img = g.createImageData(SZ, SZ);
    function h(x, y) {
      x = (x + SZ) % SZ; y = (y + SZ) % SZ;
      return height ? height[y * SZ + x] : 0.5;
    }
    for (var y = 0; y < SZ; y++) for (var x = 0; x < SZ; x++) {
      var dx = (h(x + 1, y) - h(x - 1, y)) * (strength || 2);
      var dy = (h(x, y + 1) - h(x, y - 1)) * (strength || 2);
      var inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      var o = (y * SZ + x) * 4;
      img.data[o] = Math.round((-dx * inv * 0.5 + 0.5) * 255);
      img.data[o + 1] = Math.round((-dy * inv * 0.5 + 0.5) * 255);
      img.data[o + 2] = Math.round(inv * 255);
      img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return glTex(c, true);
  }
  var NRMWALLS = [makeNormalTex(brickHeights[0], 2.2), makeNormalTex(brickHeights[1], 2.2), makeNormalTex(brickHeights[2], 2.2)];
  var NRMFLAT = makeNormalTex(null, 0);

  function buf(data, size, prog, name) {
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, name);
    return { b: b, loc: loc, size: size };
  }
  function bindAttr(a, stride, offset) {
    gl.bindBuffer(gl.ARRAY_BUFFER, a.b);
    gl.enableVertexAttribArray(a.loc);
    gl.vertexAttribPointer(a.loc, a.size, gl.FLOAT, false, stride * 4, offset * 4);
  }

  // ---------- game state (same systems as game.js) ----------
  var G = null;
  function meta() { return G.meta; }
  function goldMult() { var m = 1; meta().relics.forEach(function (r) { if (r.effect === 'Gold') m += r.value; }); return m; }
  function dmgMult() { var m = 1; meta().relics.forEach(function (r) { if (r.effect === 'Damage') m += r.value; }); return m; }
  function speedMult() { var m = 1; meta().relics.forEach(function (r) { if (r.effect === 'Speed') m += r.value; }); return m; }
  function packBonus() { var n = 0; meta().relics.forEach(function (r) { if (r.effect === 'Pack') n++; }); return Math.min(2, n); }
  function moveSpeed() { return (2.6 + meta().pickIdx * 0.35) * speedMult(); }
  function ach(id, name) { if (!meta().ach[id]) { meta().ach[id] = true; flash('🏆 ' + name, 3); } }

  function newGame(seed) {
    var best = 0;
    try { best = +localStorage.getItem('spooky_best3d') || 0; } catch (e) {}
    G = { seed: seed, depth: 0, score: 0, combo: 0, streak: 0, state: 'title', time: 0, tab: 0, picked: 0,
      meta: { gold: 0, coal: 0, level: 1, xp: 0, pickIdx: 0, relics: [], ach: {}, best: best },
      px: 1.5, pz: 1.5, yaw: 0, pitch: 0, orbit: false,
      ghost: { x: 1, y: 1, fx: 1, fz: 1, t: 1, path: [], think: 0 },
      candies: [], crystals: [], relicSpot: null, pond: null, pondUsed: false, torches: [],
      maze: null, rng: null, world: null };
    loadDepth(0);
  }
  function loadDepth(d) {
    var cfg = DEPTHS[d];
    var rng = new S.SeededRNG(G.seed + d * 7919);
    var maze = S.carveDFS(cfg.size, cfg.size, G.seed + d * 7919);
    var rooms = [];
    for (var k in maze.cells) {
      var p = k.split(',');
      if (+p[0] % 2 === 1 && +p[1] % 2 === 1 && !(+p[0] === 1 && +p[1] === 1)) rooms.push([+p[0], +p[1]]);
    }
    for (var i = rooms.length - 1; i > 0; i--) { var j = rng.nextInt(i + 1), t = rooms[i]; rooms[i] = rooms[j]; rooms[j] = t; }
    G.maze = maze; G.rng = rng; G.depth = d;
    var n = 0, map = function (r) { return { x: r[0] + 0.5, z: r[1] + 0.5 }; };
    G.candies = rooms.slice(n, n + cfg.candies).map(function (r) {
      var c = map(r);
      c.sweet = S.pickSweet(rng);
      return c;
    });
    n += cfg.candies;
    G.crystals = rooms.slice(n, n + cfg.crystals + packBonus()).map(map); n += cfg.crystals + packBonus();
    G.relicSpot = rooms[n] ? map(rooms[n]) : null; n++;
    G.pond = rooms[n] ? map(rooms[n]) : null; G.pondUsed = false;
    G.torches = rooms.filter(function (_, k) { return k % 3 === 0; }).slice(0, 24).map(map);
    var gx = 1.5, gz = 1.5, best = -1;
    rooms.forEach(function (r) {
      var dist = Math.abs(r[0] - 1) + Math.abs(r[1] - 1);
      if (dist > best) { best = dist; gx = r[0] + 0.5; gz = r[1] + 0.5; }
    });
    G.ghost = { x: gx, y: gz, fx: gx, fz: gz, t: 1, path: [], think: 0 };
    G.px = 1.5; G.pz = 1.5; G.yaw = Math.PI * 0.25; G.pitch = -0.05;
    buildWorld();
  }
  function walkable(x, z) { return !!G.maze.cells[S.key(x, z)]; }
  function solidAt(wx, wz) {
    var cx = Math.floor(wx), cz = Math.floor(wz);
    return !walkable(cx, cz);
  }

  // ---------- world geometry (merged static buffers per material) ----------
  function newGroup() { return { P: [], C: [], U: [], N: [], E: [] }; }
  function quad(G8, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, col, emis, uRep, vRep, nx, ny, nz) {
    uRep = uRep || 1; vRep = vRep || 1;
    G8.P.push(ax, ay, az, bx, by, bz, cx, cy, cz, ax, ay, az, cx, cy, cz, dx, dy, dz);
    var uvs = [0, 0, uRep, 0, uRep, vRep, 0, 0, uRep, vRep, 0, vRep];
    for (var i = 0; i < 6; i++) {
      G8.C.push(col[0], col[1], col[2]);
      G8.U.push(uvs[i * 2], uvs[i * 2 + 1]);
      G8.N.push(nx, ny, nz);
      G8.E.push(emis);
    }
  }
  function buildWorld() {
    var cfg = DEPTHS[G.depth];
    var wall = newGroup(), floor = newGroup(), ceil = newGroup(), glow = newGroup();
    var w0 = cfg.wall, w1 = cfg.wallTop;
    var x, z, len;
    for (x = 0; x < G.maze.w; x++) for (z = 0; z < G.maze.d; z++) {
      var open = walkable(x, z);
      if (!open) {
        // top
        quad(wall, x, WALL_H, z, x + 1, WALL_H, z, x + 1, WALL_H, z + 1, x, WALL_H, z + 1, w1, 0, 1, 1, 0, 1, 0);
        // sides facing open neighbors (plus outer shell)
        if (walkable(x + 1, z)) quad(wall, x + 1, 0, z, x + 1, 0, z + 1, x + 1, WALL_H, z + 1, x + 1, WALL_H, z, w0, 0, 1, 2, 1, 0, 0);
        if (walkable(x - 1, z)) quad(wall, x, 0, z + 1, x, 0, z, x, WALL_H, z, x, WALL_H, z + 1, w0, 0, 1, 2, -1, 0, 0);
        if (walkable(x, z + 1)) quad(wall, x, 0, z + 1, x + 1, 0, z + 1, x + 1, WALL_H, z + 1, x, WALL_H, z + 1, w0, 0, 1, 2, 0, 0, 1);
        if (walkable(x, z - 1)) quad(wall, x + 1, 0, z, x, 0, z, x, WALL_H, z, x + 1, WALL_H, z, w0, 0, 1, 2, 0, 0, -1);
      } else {
        // ceiling over open cells (enclosed mine) + checkered floor
        quad(ceil, x, WALL_H, z + 1, x + 1, WALL_H, z + 1, x + 1, WALL_H, z, x, WALL_H, z, [0.10, 0.07, 0.16], 0, 1, 1, 0, -1, 0);
        var f = ((x + z) % 2) ? [0.16, 0.11, 0.28] : [0.11, 0.08, 0.20];
        quad(floor, x, 0, z, x, 0, z + 1, x + 1, 0, z + 1, x + 1, 0, z, f, 0, 1, 1, 0, 1, 0);
      }
    }
    // glowing crystal clusters on some wall tops
    var rng = new S.SeededRNG(G.seed + G.depth * 131);
    for (var ci = 0; ci < 26; ci++) {
      x = 1 + rng.nextInt(G.maze.w - 2); z = 1 + rng.nextInt(G.maze.d - 2);
      if (walkable(x, z)) continue;
      var s = 0.18 + rng.nextDouble() * 0.22, ox = x + 0.2 + rng.nextDouble() * 0.6, oz = z + 0.2 + rng.nextDouble() * 0.6;
      var cc = rng.nextDouble() < 0.5 ? [0.3, 0.85, 1.0] : [0.75, 0.45, 1.0];
      quad(glow, ox - s, WALL_H, oz - s, ox + s, WALL_H, oz - s, ox + s, WALL_H + s * 2, oz, ox - s, WALL_H + s * 2, oz, cc, 0.9, 1, 1, 0, 0, 1);
      quad(glow, ox - s, WALL_H, oz + s, ox - s, WALL_H, oz - s, ox - s, WALL_H + s * 2, oz, ox - s, WALL_H + s * 2, oz + s, cc, 0.9, 1, 1, 0, 0, -1);
    }
    // magma depth: lava veins drooling down random walls + floor pools
    if (G.depth === 2) {
      for (var li = 0; li < 16; li++) {
        var lx = 1 + rng.nextInt(G.maze.w - 2), lz = 1 + rng.nextInt(G.maze.d - 2);
        if (!walkable(lx, lz)) continue;
        var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        var dd = dirs[rng.nextInt(4)];
        var wx = lx + dd[0], wz = lz + dd[1];
        if (walkable(wx, wz)) continue;
        var wcol = [1.2, 0.35, 0.08];
        var off = 0.02, vh = 0.4 + rng.nextDouble() * 1.4;
        if (dd[0] === 1) quad(glow, wx + off, 0.2, wz + 0.15, wx + off, 0.2, wz + 0.85, wx + off, 0.2 + vh, wz + 0.85, wx + off, 0.2 + vh, wz + 0.15, wcol, 0.95, 1, 1, 1, 0, 0);
        else if (dd[0] === -1) quad(glow, wx + 1 - off, 0.2, wz + 0.85, wx + 1 - off, 0.2, wz + 0.15, wx + 1 - off, 0.2 + vh, wz + 0.15, wx + 1 - off, 0.2 + vh, wz + 0.85, wcol, 0.95, 1, 1, -1, 0, 0);
        else if (dd[1] === 1) quad(glow, wx + 0.15, 0.2, wz + off, wx + 0.85, 0.2, wz + off, wx + 0.85, 0.2 + vh, wz + off, wx + 0.15, 0.2 + vh, wz + off, wcol, 0.95, 1, 1, 0, 0, 1);
        else quad(glow, wx + 0.85, 0.2, wz + 1 - off, wx + 0.15, 0.2, wz + 1 - off, wx + 0.15, 0.2 + vh, wz + 1 - off, wx + 0.85, 0.2 + vh, wz + 1 - off, wcol, 0.95, 1, 1, 0, 0, -1);
      }
      for (var pi = 0; pi < 8; pi++) {
        var qx = 1 + rng.nextInt(G.maze.w - 2), qz = 1 + rng.nextInt(G.maze.d - 2);
        if (!walkable(qx, qz)) continue;
        var ps = 0.3 + rng.nextDouble() * 0.25, px0 = qx + 0.2 + rng.nextDouble() * 0.4, pz0 = qz + 0.2 + rng.nextDouble() * 0.4;
        quad(glow, px0 - ps, 0.03, pz0 - ps, px0 + ps, 0.03, pz0 - ps, px0 + ps, 0.03, pz0 + ps, px0 - ps, 0.03, pz0 + ps, [1.1, 0.4, 0.1], 0.9, 1, 1, 0, 1, 0);
      }
    }
    function freeze(G8, tex, nrm) {
      return { n: G8.P.length / 3, tex: tex, nrm: nrm,
        pos: buf(G8.P, 3, worldProg, 'aPos'), col: buf(G8.C, 3, worldProg, 'aCol'),
        uv: buf(G8.U, 2, worldProg, 'aUV'), nrmA: buf(G8.N, 3, worldProg, 'aNrm'),
        em: buf(G8.E, 1, worldProg, 'aEmis') };
    }
    G.world = [freeze(wall, TEXWALLS[G.depth], NRMWALLS[G.depth]), freeze(floor, TEXFLOORS[G.depth], NRMFLAT),
      freeze(ceil, TEXCEIL, NRMFLAT), freeze(glow, TEXWHITE, NRMFLAT)];
  }

  // ---------- sprites ----------
  var sprPos = [], sprUV = [];
  var sprBufP = null, sprBufU = null;
  function initSprites() {
    sprBufP = gl.createBuffer(); sprBufU = gl.createBuffer();
  }
  function drawSprites(list, time) {
    // group by texture
    var groups = {};
    list.forEach(function (sp) { (groups[sp.tex] = groups[sp.tex] || []).push(sp); });
    var V = currentView();
    var rx = V[0], ry = V[4], rz = V[8], ux = V[1], uy = V[5], uz = V[9];
    Object.keys(groups).forEach(function (key) {
      sprPos = []; sprUV = [];
      groups[key].forEach(function (sp) {
        var hw = sp.size / 2, hh = sp.size / 2, bob = sp.bob ? Math.sin(time * 3 + sp.x) * 0.06 : 0;
        var cxp = sp.x, cyp = sp.y + bob, czp = sp.z;
        var corners = [[-hw, -hh, 0, 0], [hw, -hh, 1, 0], [hw, hh, 1, 1], [-hw, -hh, 0, 0], [hw, hh, 1, 1], [-hw, hh, 0, 1]];
        corners.forEach(function (cr) {
          sprPos.push(cxp + rx * cr[0] + ux * cr[1], cyp + ry * cr[0] + uy * cr[1], czp + rz * cr[0] + uz * cr[1]);
          sprUV.push(cr[2], cr[3]);
        });
      });
      gl.useProgram(sprProg);
      gl.uniformMatrix4fv(gl.getUniformLocation(sprProg, 'uMVP'), false, new Float32Array(currentMVP()));
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, TEX[key]);
      gl.uniform1i(gl.getUniformLocation(sprProg, 'uTex'), 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, sprBufP);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sprPos), gl.DYNAMIC_DRAW);
      var locP = gl.getAttribLocation(sprProg, 'aPos');
      gl.enableVertexAttribArray(locP);
      gl.vertexAttribPointer(locP, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, sprBufU);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sprUV), gl.DYNAMIC_DRAW);
      var locU = gl.getAttribLocation(sprProg, 'aUV');
      gl.enableVertexAttribArray(locU);
      gl.vertexAttribPointer(locU, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, sprPos.length / 3);
    });
  }

  // ---------- camera ----------
  function eyePos() { return [G.px, EYE, G.pz]; }
  function lookDir() {
    return [Math.sin(G.yaw) * Math.cos(G.pitch), Math.sin(G.pitch), -Math.cos(G.yaw) * Math.cos(G.pitch)];
  }
  function currentView() {
    var t = G.time;
    if (G.orbit) {
      var cx = G.maze.w / 2, cz = G.maze.d / 2, r = Math.max(G.maze.w, G.maze.d) * 0.85;
      var a = t * 0.12;
      return S.mLookAt(cx + Math.sin(a) * r, r * 0.75, cz + Math.cos(a) * r, cx, 0, cz, 0, 1, 0);
    }
    var e = eyePos(), d = lookDir();
    return S.mLookAt(e[0], e[1], e[2], e[0] + d[0], e[1] + d[1], e[2] + d[2], 0, 1, 0);
  }
  function currentMVP() {
    var aspect = canvas.width / canvas.height;
    return S.mMul(S.mPerspective(Math.PI / 3.2, aspect, 0.05, 120), currentView());
  }

  // ---------- update ----------
  function gainXP(n) {
    var m = meta();
    m.xp += n;
    while (m.xp >= S.xpNext(m.level)) {
      m.xp -= S.xpNext(m.level); m.level++;
      m.gold += 25; G.score += 100;
      flash('⬆️ Level ' + m.level + '! +25 gold', 2.2);
      if (m.level >= 5) ach('level-5', 'Living Myth — reach level 5');
    }
  }
  function fish() {
    var bag = [];
    S.FISH.forEach(function (f) { for (var i = 0; i < S.FISH_WEIGHT[f.rarity]; i++) bag.push(f); });
    return G.rng.pick(bag);
  }
  function near(ax, az, bx, bz, r) { var dx = ax - bx, dz = az - bz; return dx * dx + dz * dz < r * r; }

  var keys = {};
  function update(dt) {
    if (G.state !== 'play' || G.tab !== 0) return;
    G.time += dt;
    var m = meta(), cfg = DEPTHS[G.depth], g = G.ghost;
    // move
    var sp = moveSpeed() * dt, fw = 0, st = 0;
    if (keys.w || keys.arrowup) fw += 1;
    if (keys.s || keys.arrowdown) fw -= 1;
    if (keys.a || keys.arrowleft) st -= 1;
    if (keys.d || keys.arrowright) st += 1;
    fw += joy.y; st += joy.x;
    var sy = Math.sin(G.yaw), cy = Math.cos(G.yaw);
    var dx = (sy * fw + cy * st) * sp, dz = (-cy * fw + sy * st) * sp;
    moveWithCollision(dx, 0); moveWithCollision(0, dz);
    // ghost A*
    g.think -= dt;
    if (g.think <= 0) {
      g.think = cfg.ghostThink;
      var p = S.astar(Math.floor(g.x), Math.floor(g.y), Math.floor(G.px), Math.floor(G.pz), walkable, 600);
      g.path = p && p.length > 1 ? p.slice(1).map(function (n) { return { x: n[0] + 0.5, z: n[1] + 0.5 }; }) : [];
    }
    var gs = cfg.ghostSpeed * dt;
    while (gs > 0 && g.path.length) {
      var t = g.path[0], ddx = t.x - g.x, ddz = t.z - g.z, dist = Math.hypot(ddx, ddz);
      if (dist < 1e-4) { g.path.shift(); continue; }
      var step = Math.min(gs, dist);
      g.x += ddx / dist * step; g.z += ddz / dist * step; gs -= step;
      if (step >= dist - 1e-6) g.path.shift();
    }
    // pickups
    var i;
    for (i = G.candies.length - 1; i >= 0; i--) {
      var c = G.candies[i];
      if (near(G.px, G.pz, c.x, c.z, 0.7)) {
        G.candies.splice(i, 1); G.combo++; G.streak++; G.picked++;
        var sw = c.sweet || S.SWEETS[0];
        G.score += Math.round((sw.points * S.comboMult(G.combo) + S.streakBonus(G.streak)) * dmgMult());
        m.gold += Math.round(2 * goldMult()); gainXP(8);
        if (sw.name !== 'Candy') flash('🍬 ' + sw.name + ' +' + sw.points + ' (combo x' + S.comboMult(G.combo).toFixed(2) + ')', 1.4);
        if (G.score >= 1000) ach('score-1k', 'Score Legend — 1,000 points');
      }
    }
    for (i = G.crystals.length - 1; i >= 0; i--) {
      var r = G.crystals[i];
      if (near(G.px, G.pz, r.x, r.z, 0.7)) {
        G.crystals.splice(i, 1); G.combo += 2;
        G.score += Math.round(50 * S.comboMult(G.combo) * dmgMult());
        m.gold += Math.round(5 * goldMult()); gainXP(20);
      }
    }
    if (G.relicSpot && near(G.px, G.pz, G.relicSpot.x, G.relicSpot.z, 0.7)) {
      var owned = m.relics.map(function (x) { return x.name; });
      var pool = S.RELICS.filter(function (x) { return owned.indexOf(x.name) < 0; });
      if (pool.length) {
        var relic = G.rng.pick(pool);
        m.relics.push(relic); G.score += 150;
        flash('🗿 ' + relic.name + ' (' + relic.effect + ' +' + Math.round(relic.value * 100) + '%)', 3);
      }
      G.relicSpot = null;
    }
    if (G.pond && !G.pondUsed && near(G.px, G.pz, G.pond.x, G.pond.z, 0.8)) {
      G.pondUsed = true;
      var f = fish(), gv = Math.round(f.value * goldMult());
      m.gold += gv; G.score += Math.round(f.value * dmgMult());
      flash('🎣 ' + f.name + ' (' + f.rarity + ') +' + gv + ' gold', 3);
    }
    if (near(G.px, G.pz, g.x, g.z, 0.8)) return die();
    if (!G.candies.length && !G.crystals.length) {
      if (G.depth >= DEPTHS.length - 1) return win();
      G.score += 250 * (G.depth + 1); m.gold += 30;
      ach('clear-1', 'Pathfinder — clear a depth');
      loadDepth(G.depth + 1);
      openShop();
      return;
    }
    renderHUD();
  }
  function moveWithCollision(dx, dz) {
    var r = 0.32, nx = G.px + dx, nz = G.pz + dz;
    if (!circleHitsWall(nx, G.pz, r)) G.px = nx;
    if (!circleHitsWall(G.px, nz, r)) G.pz = nz;
    G.px = Math.max(0.4, Math.min(G.maze.w - 0.4, G.px));
    G.pz = Math.max(0.4, Math.min(G.maze.d - 0.4, G.pz));
  }
  function circleHitsWall(wx, wz, r) {
    for (var ox = -1; ox <= 1; ox++) for (var oz = -1; oz <= 1; oz++) {
      var cx = Math.floor(wx) + ox, cz = Math.floor(wz) + oz;
      if (walkable(cx, cz)) continue;
      var nx = Math.max(cx, Math.min(wx, cx + 1)), nz = Math.max(cz, Math.min(wz, cz + 1));
      var ddx = wx - nx, ddz = wz - nz;
      if (ddx * ddx + ddz * ddz < r * r) return true;
    }
    return false;
  }

  // ---------- overlays / HUD (same loop as 2D) ----------
  var flashMsg = '', flashT = 0;
  function flash(msg, dur) { flashMsg = msg; flashT = dur || 2.2; }
  var overlay = document.getElementById('overlay');
  function hud(id) { return document.getElementById(id); }
  function renderHUD() {
    var m = meta();
    hud('score').textContent = S.compact(G.score);
    hud('depth').textContent = DEPTHS[G.depth].layer;
    hud('candy').textContent = G.candies.length + G.crystals.length;
    hud('gold').textContent = S.compact(m.gold);
    hud('level').textContent = m.level;
    hud('pick').textContent = S.PICKS[m.pickIdx].name;
  }
  function saveBest() {
    if (G.score > meta().best) {
      meta().best = G.score;
      try { localStorage.setItem('spooky_best3d', String(G.score)); } catch (e) {}
    }
  }
  function achList() {
    var ids = Object.keys(meta().ach);
    return ids.length ? ' 🏆 ' + ids.length : '';
  }
  function showOverlay(t, txt, btn, btn2, buyFn) {
    hud('overlay-title').textContent = t; hud('overlay-text').textContent = txt;
    var b1 = hud('overlay-btn'), b2 = hud('overlay-btn2');
    b1.textContent = btn;
    b1.onclick = function () {
      if (G.state === 'shop' && buyFn) {
        if (buyFn() === false) return;
        openShop();
        if (meta().pickIdx >= S.PICKS.length - 1) { G.state = 'play'; hideOverlay(); }
        renderHUD();
        return;
      }
      hideOverlay();
      if (G.state === 'title' || G.state === 'shop') G.state = 'play';
      else { newGame((Math.random() * 1e9) | 0); G.state = 'play'; }
      renderHUD();
    };
    if (btn2) { b2.style.display = ''; b2.textContent = btn2; b2.onclick = function () { hideOverlay(); G.state = 'play'; renderHUD(); }; }
    else b2.style.display = 'none';
    overlay.classList.remove('hidden');
  }
  function hideOverlay() { overlay.classList.add('hidden'); }
  function die() {
    G.state = 'dead'; G.combo = 0; saveBest();
    showOverlay('☠️ Caught in the ' + DEPTHS[G.depth].layer + '!',
      'Score ' + S.compact(G.score) + ' · Lv ' + meta().level + ' · ' + S.PICKS[meta().pickIdx].name +
      ' · Best ' + S.compact(meta().best) + achList(), 'Try again', null, null);
  }
  function win() {
    G.state = 'win'; G.score += 1000; saveBest();
    showOverlay('🎃 Spooktacular! All 3 depths cleared!',
      'Score ' + S.compact(G.score) + ' · Lv ' + meta().level + ' · ' + meta().relics.length +
      '/12 relics · Best ' + S.compact(meta().best) + achList(), 'Play again', null, null);
    renderHUD();
  }
  function openShop() {
    G.state = 'shop';
    var m = meta(), next = S.PICKS[m.pickIdx + 1];
    var txt = 'Depth cleared! Now entering the ' + DEPTHS[G.depth].layer +
      '. Gold: ' + m.gold + '. Wielding: ' + S.PICKS[m.pickIdx].name + '.';
    if (next) {
      txt += ' Next: ' + next.name + ' (' + next.cost + ' gold).';
      var can = m.gold >= next.cost;
      showOverlay('🛒 Mine Shop', txt, can ? 'Buy ' + next.name : 'Need ' + (next.cost - m.gold) + ' more gold',
        'Descend ↓', function () {
          if (m.gold < next.cost) return false;
          m.gold -= next.cost; m.pickIdx++; G.score += 50;
          if (m.pickIdx === 1) ach('first-pick', 'New Edge — first upgrade');
          if (S.PICKS[m.pickIdx].name === 'Void Drill') ach('void-drill', 'Maximum Spin — own the Void Drill');
          return true;
        });
    } else showOverlay('🛒 Mine Shop', txt + ' You wield the ultimate tool.', 'Descend ↓', null, null);
    renderHUD();
  }

  // ---------- render ----------
  function resize() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = canvas.clientWidth * dpr, h = canvas.clientHeight * dpr;
    if (canvas.width !== Math.round(w) || canvas.height !== Math.round(h)) {
      canvas.width = Math.round(w); canvas.height = Math.round(h);
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function render() {
    resize();
    var cfg = DEPTHS[G.depth];
    gl.clearColor(cfg.fog[0] * 0.6, cfg.fog[1] * 0.6, cfg.fog[2] * 0.6, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    var flick = 0.9 + 0.07 * Math.sin(G.time * 7) + 0.03 * Math.sin(G.time * 13);
    var mvp = currentMVP(), mv = currentView();
    gl.useProgram(worldProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(worldProg, 'uMVP'), false, new Float32Array(mvp));
    gl.uniformMatrix4fv(gl.getUniformLocation(worldProg, 'uMV'), false, new Float32Array(mv));
    gl.uniform1f(gl.getUniformLocation(worldProg, 'uFlick'), flick);
    gl.uniform3fv(gl.getUniformLocation(worldProg, 'uFog'), new Float32Array(cfg.fog));
    // 6 nearest torches as point lights
    var sorted = G.torches.map(function (t) {
      var dx = t.x - G.px, dz = t.z - G.pz;
      return { t: t, d: dx * dx + dz * dz };
    }).sort(function (a, b) { return a.d - b.d; }).slice(0, 6);
    var tarr = [];
    sorted.forEach(function (o) { tarr.push(o.t.x, 1.9, o.t.z, 1.5); });
    while (tarr.length < 24) tarr.push(0, -10, 0, 0);
    gl.uniform4fv(gl.getUniformLocation(worldProg, 'uTorches'), new Float32Array(tarr));
    gl.uniform1i(gl.getUniformLocation(worldProg, 'uTorchCount'), sorted.length);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(gl.getUniformLocation(worldProg, 'uTex'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.uniform1i(gl.getUniformLocation(worldProg, 'uNrm'), 1);
    var eye = eyePos();
    gl.uniform3fv(gl.getUniformLocation(worldProg, 'uCam'), new Float32Array(eye));
    G.world.forEach(function (grp) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, grp.tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, grp.nrm);
      bindAttr(grp.pos, 3, 0); bindAttr(grp.col, 3, 0);
      bindAttr(grp.uv, 2, 0); bindAttr(grp.nrmA, 3, 0); bindAttr(grp.em, 1, 0);
      gl.drawArrays(gl.TRIANGLES, 0, grp.n);
    });
    // sprites
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    var list = [];
    G.candies.forEach(function (c) { list.push({ tex: (c.sweet || S.SWEETS[0]).tex, x: c.x, y: 0.8, z: c.z, size: 0.55, bob: true }); });
    G.crystals.forEach(function (c) { list.push({ tex: 'gem', x: c.x, y: 0.9, z: c.z, size: 0.7, bob: true }); });
    if (G.relicSpot) list.push({ tex: 'relic', x: G.relicSpot.x, y: 0.8, z: G.relicSpot.z, size: 0.9, bob: false });
    if (G.pond) list.push({ tex: 'pond', x: G.pond.x, y: 0.7, z: G.pond.z, size: 0.9, bob: false });
    G.torches.forEach(function (t) { list.push({ tex: 'torch', x: t.x, y: 1.7, z: t.z, size: 0.5, bob: false }); });
    var gb = 1 + 0.08 * Math.sin(G.time * 5);
    list.push({ tex: 'ghost', x: gX(), y: 1.2, z: gZ(), size: 1.1 * gb, bob: true });
    drawSprites(list, G.time);
    gl.disable(gl.BLEND);
    drawMinimap();
    if (flashT > 0) {
      // DOM-free flash: draw on minimap canvas? use overlay div text via title
      document.title = '🎃 ' + flashMsg;
    }
  }
  function gX() { return G.ghost.x; }
  function gZ() { return G.ghost.z; }
  function drawMinimap() {
    var s = 132, n = G.maze.w, k = s / n;
    mm.clearRect(0, 0, s, s);
    mm.fillStyle = '#0b0620'; mm.fillRect(0, 0, s, s);
    for (var x = 0; x < n; x++) for (var z = 0; z < G.maze.d; z++) {
      if (walkable(x, z)) { mm.fillStyle = '#2a1a55'; mm.fillRect(x * k, z * k, k, k); }
    }
    mm.fillStyle = '#ffd166';
    G.candies.forEach(function (c) { mm.fillRect((c.x - 0.5) * k + k / 3, (c.z - 0.5) * k + k / 3, 2, 2); });
    mm.fillStyle = '#7df9ff';
    G.crystals.forEach(function (c) { mm.fillRect((c.x - 0.5) * k + k / 3, (c.z - 0.5) * k + k / 3, 2, 2); });
    mm.fillStyle = '#ff5555';
    mm.beginPath(); mm.arc(G.ghost.x / n * s, G.ghost.z / G.maze.d * s, 3, 0, 7); mm.fill();
    mm.fillStyle = '#ff9f1c';
    mm.beginPath(); mm.arc(G.px / n * s, G.pz / G.maze.d * s, 3, 0, 7); mm.fill();
    // view direction
    mm.strokeStyle = '#ff9f1c'; mm.beginPath();
    mm.moveTo(G.px / n * s, G.pz / G.maze.d * s);
    mm.lineTo((G.px + Math.sin(G.yaw) * 2) / n * s, (G.pz - Math.cos(G.yaw) * 2) / G.maze.d * s);
    mm.stroke();
  }

  // ---------- input ----------
  document.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    keys[k] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) >= 0) e.preventDefault();
    if (k === 'o') G.orbit = !G.orbit;
    if (k === 'enter' && !overlay.classList.contains('hidden')) hud('overlay-btn').click();
  });
  document.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  var joy = { x: 0, y: 0 };
  var drag = null;
  canvas.addEventListener('mousedown', function (e) { drag = [e.clientX, e.clientY]; });
  document.addEventListener('mousemove', function (e) {
    if (!drag) return;
    G.yaw -= (e.clientX - drag[0]) * 0.004;
    G.pitch = Math.max(-1.2, Math.min(1.2, G.pitch - (e.clientY - drag[1]) * 0.003));
    drag = [e.clientX, e.clientY];
  });
  document.addEventListener('mouseup', function () { drag = null; });
  var lastTouch = null, stickId = null, lookId = null, stickC = null;
  var stick = document.getElementById('stick'), nub = document.getElementById('nub');
  if ('ontouchstart' in window) stick.style.display = 'block';
  canvas.addEventListener('touchstart', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.clientX < window.innerWidth * 0.4 && stickId === null) { stickId = t.identifier; stickC = [t.clientX, t.clientY]; }
      else if (lookId === null) { lookId = t.identifier; lastTouch = [t.clientX, t.clientY]; }
    }
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === stickId) {
        var dx = (t.clientX - stickC[0]) / 40, dy = (t.clientY - stickC[1]) / 40;
        var l = Math.hypot(dx, dy) || 1, cl = Math.min(1, l);
        joy.x = dx / l * cl; joy.y = -dy / l * cl;
        nub.style.left = (32 + joy.x * 30) + 'px'; nub.style.top = (32 - joy.y * 30) + 'px';
      } else if (t.identifier === lookId && lastTouch) {
        G.yaw -= (t.clientX - lastTouch[0]) * 0.006;
        G.pitch = Math.max(-1.2, Math.min(1.2, G.pitch - (t.clientY - lastTouch[1]) * 0.004));
        lastTouch = [t.clientX, t.clientY];
      }
    }
    e.preventDefault();
  }, { passive: false });
  function endTouch(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === stickId) { stickId = null; joy.x = joy.y = 0; nub.style.left = '32px'; nub.style.top = '32px'; }
      if (t.identifier === lookId) { lookId = null; lastTouch = null; }
    }
  }
  canvas.addEventListener('touchend', endTouch);
  canvas.addEventListener('touchcancel', endTouch);

  document.getElementById('newmaze').addEventListener('click', function () {
    newGame((Math.random() * 1e9) | 0); G.state = 'play'; hideOverlay(); renderHUD();
  });
  document.getElementById('shopbtn').addEventListener('click', function () {
    if (G.state === 'play') openShop();
  });
  document.getElementById('orbitbtn').addEventListener('click', function () { G.orbit = !G.orbit; });

  // ---------- main loop ----------
  var last = 0;
  function loop(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    if (flashT > 0) { flashT -= dt; if (flashT <= 0) document.title = '🎃 Spooktacular Mine 3D'; }
    update(dt);
    if (G.world) render();
    requestAnimationFrame(loop);
  }

  initSprites();
  newGame(20261031);
  G.state = 'title';
  renderHUD();
  window.SpookyTabs.init({
    tabsId: 'tabs', panelsId: 'tabpanels',
    snapshot: function () {
      var m = meta();
      return { score: G.score, layer: DEPTHS[G.depth].layer, left: G.candies.length + G.crystals.length,
        gold: m.gold, level: m.level, pick: S.PICKS[m.pickIdx].name, seed: G.seed,
        relics: m.relics.length, ach: m.ach, collected: G.picked };
    },
    onSelect: function (i) { G.tab = i; },
    actions: {
      openShop: function () { if (G.state === 'play') openShop(); },
      newMaze: function () { document.getElementById('newmaze').click(); }
    },
    host: { onUnlock: function (id, name) { meta().ach[id] = name; } },
    profile: makeProfile()
  });
  function makeProfile() {
    return {
      gold: function () { return meta().gold; },
      addGold: function (n) { meta().gold += n; renderHUD(); },
      spendGold: function (n) { if (meta().gold < n) return false; meta().gold -= n; renderHUD(); return true; },
      coal: function () { return meta().coal || 0; },
      addCoal: function (n) { meta().coal = (meta().coal || 0) + n; renderHUD(); },
      spendCoal: function (n) { if ((meta().coal || 0) < n) return false; meta().coal -= n; renderHUD(); return true; },
      level: function () { return meta().level; },
      pickIdx: function () { return meta().pickIdx; },
      setPick: function (i) { meta().pickIdx = i; renderHUD(); },
      pickDamage: function () { return S.PICKS[meta().pickIdx].speed; },
      goldMult: function () { return goldMult(); },
      gainXP: gainXP,
      addScore: function (n) { G.score += n; renderHUD(); },
      unlock: function (id, name) { ach(id, name); },
      flash: flash,
      hud: renderHUD
    };
  }
  showOverlay('🎃 Spooktacular Mine 3D',
    'Same mine, real 3D. WASD + drag to walk the ' + DEPTHS[0].layer + '. Grab 🍬💎, find 🗿, fish 🎣, buy picks 🛒, dodge the 👻. Press O for the AR-style diorama orbit.',
    'Descend ⛏️', null, null);
  requestAnimationFrame(loop);
})();
