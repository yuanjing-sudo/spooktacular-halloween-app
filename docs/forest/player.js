/* ==========================================================================
 *  ENDLESS SPOOKY FOREST — player.js
 *  First/third-person walking, running, jumping, swimming, flying, mouse
 *  look, touch controls, head-bob, footstep dust and a detailed lantern
 *  keeper avatar for third-person and photo mode.
 * ========================================================================== */
(function (root) {
  'use strict';

  var SF = root.SpookyForest = root.SpookyForest || {};
  var U = SF.Util;

  var EYE = 1.68;

  function Player(world, opts) {
    opts = opts || {};
    this.world = world;
    this.position = [0.5, 2.5, 0.5];
    this.velocity = [0, 0, 0];
    this.yaw = 0;
    this.pitch = -0.04;
    this.eyeHeight = EYE;
    this.radius = 0.32;
    this.height = 1.78;
    this.onGround = false;
    this.inWater = false;
    this.flying = false;
    this.thirdPerson = false;
    this.sprinting = false;
    this.crouching = false;
    this.jumpQueued = false;
    this.bob = 0;
    this.bobPhase = 0;
    this.stepClock = 0;
    this.stamina = 100;
    this.maxStamina = 100;
    this.warmth = 100;
    this.maxWarmth = 100;
    this.health = 100;
    this.maxHealth = 100;
    this.wood = 7;
    this.marshmallows = 3;
    this.hasLantern = true;
    this.sitting = 0;
    this.photoMode = false;
    this.photoEye = null;
    this.photoYaw = 0;
    this.photoPitch = 0;
    this.enabled = false;
    this.mouseSensitivity = 0.0022;
    this.touchSensitivity = 0.004;
    this.invertY = false;
    this.showBody = true;
    this.fallPeak = null;
    this.footParticles = [];
    this.distanceWalked = 0;
    this.jumps = 0;
    this.biome = null;
    this.surface = 'grass';
    this.lastPos = [0, 0, 0];
    this.keys = {};
    this.joystick = { x: 0, y: 0 };
    this.touchLook = { x: 0, y: 0 };
    this.onAction = opts.onAction || function () {};
    this.onStep = opts.onStep || function () {};
    this._bound = false;
    this._pointerLocked = false;
    this._canvas = null;
  }

  Player.prototype.reset = function (spawn) {
    spawn = spawn || this.world.findSpawn();
    this.position = [spawn.x, spawn.y + 0.05, spawn.z];
    this.velocity = [0, 0, 0];
    this.yaw = 0; this.pitch = -0.04;
    this.flying = false; this.thirdPerson = false;
    this.crouching = false; this.jumpQueued = false;
    this.keys = {}; this.sprinting = false;
    this.health = 100; this.stamina = 100; this.warmth = 100;
    this.footParticles.length = 0;
    this.fallPeak = null;
    this.sitting = 0;
    this.distanceWalked = 0;
  };

  /* ------------------------------------------------------------------ */
  /*  Input                                                              */
  /* ------------------------------------------------------------------ */
  Player.prototype.attach = function (canvas) {
    if (this._bound) return;
    this._bound = true;
    this._canvas = canvas;
    var self = this;

    this._onKeyDown = function (e) {
      if (!self.enabled) return;
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      self.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) {
        e.preventDefault();
      }
      if (e.repeat) return;
      self._handleAction(e.code);
    };
    this._onKeyUp = function (e) {
      self.keys[e.code] = false;
    };
    this._onMouseDown = function (e) {
      if (!self.enabled) return;
      if (e.button === 0 && !self._isTouch()) {
        if (root.document.pointerLockElement !== canvas) {
          try { canvas.requestPointerLock(); } catch (err) {}
        }
      }
    };
    this._onMouseMove = function (e) {
      if (!self.enabled || self.photoMode) return;
      if (root.document.pointerLockElement === canvas || (e.buttons & 1) === 1) {
        self.look(e.movementX || 0, e.movementY || 0, 1);
      }
    };
    this._onPointerLock = function () {
      self._pointerLocked = root.document.pointerLockElement === canvas;
    };
    this._onBlur = function () {
      self.keys = {};
      self.joystick.x = 0; self.joystick.y = 0;
    };

    root.document.addEventListener('keydown', this._onKeyDown, false);
    root.document.addEventListener('keyup', this._onKeyUp, false);
    root.document.addEventListener('mousemove', this._onMouseMove, false);
    root.document.addEventListener('pointerlockchange', this._onPointerLock, false);
    root.addEventListener('blur', this._onBlur, false);
    canvas.addEventListener('mousedown', this._onMouseDown, false);
  };

  Player.prototype._isTouch = function () { return U.Device.isTouch; };

  Player.prototype._handleAction = function (code) {
    if (code === 'KeyF') {
      this.flying = !this.flying;
      this.velocity[1] = 0;
      this.onAction('fly', this.flying);
      return;
    }
    if (code === 'KeyV') {
      this.thirdPerson = !this.thirdPerson;
      this.onAction('camera', this.thirdPerson ? 'third' : 'first');
      return;
    }
    if (code === 'KeyP') {
      this.togglePhoto();
      return;
    }
    if (code === 'KeyE' || code === 'Space') {
      if (code === 'Space' && this._isTouch()) return;
      this.onAction(code === 'Space' ? 'jump' : 'interact');
      return;
    }
    if (code === 'KeyQ') { this.onAction('call'); return; }
    if (code === 'KeyJ') { this.onAction('journal'); return; }
    if (code === 'KeyM') { this.onAction('map'); return; }
    if (code === 'KeyR') { this.onAction('up'); return; }
    if (code === 'KeyX') { this.onAction('down'); return; }
    if (code === 'Escape') { this.onAction('pause'); return; }
    if (code === 'Digit1') { this.onAction('slot', 1); return; }
    if (code === 'Digit2') { this.onAction('slot', 2); return; }
    if (code === 'Digit3') { this.onAction('slot', 3); return; }
    if (code === 'Digit4') { this.onAction('slot', 4); return; }
    if (code === 'Digit5') { this.onAction('slot', 5); return; }
    if (code === 'Digit6') { this.onAction('slot', 6); return; }
    if (code === 'Tab') { this.onAction('map'); return; }
  };

  Player.prototype.look = function (dx, dy, scale) {
    scale = scale || 1;
    var s = this._isTouch() ? this.touchSensitivity : this.mouseSensitivity;
    // Yaw increases clockwise (east at +90°), matching the camera forward vector.
    this.yaw += dx * s * scale;
    var py = this.pitch - dy * s * scale * (this.invertY ? -1 : 1);
    this.pitch = U.clamp(py, -1.45, 1.45);
    this.yaw = U.wrapAngle(this.yaw);
  };

  Player.prototype.touchLook = function (dx, dy) {
    if (!this.photoMode) this.look(dx, dy, 1);
    else {
      this.photoYaw -= dx * this.touchSensitivity;
      this.photoPitch = U.clamp(this.photoPitch - dy * this.touchSensitivity, -1.45, 1.45);
    }
  };

  Player.prototype.setJoystick = function (x, y) {
    this.joystick.x = U.clamp(x, -1, 1);
    this.joystick.y = U.clamp(y, -1, 1);
  };

  Player.prototype.togglePhoto = function () {
    this.photoMode = !this.photoMode;
    if (this.photoMode) {
      this.photoEye = [this.position[0], this.position[1] + this.eyeHeight, this.position[2]];
      this.photoYaw = this.yaw;
      this.photoPitch = this.pitch;
    }
    this.onAction('photo', this.photoMode);
  };

  Player.prototype.trigger = function (action, value) {
    if (action === 'jump') { this.jumpQueued = true; this.onAction('jump'); }
    else if (action === 'interact') this.onAction('interact');
    else if (action === 'fly') { this.flying = !this.flying; this.velocity[1] = 0; this.onAction('fly', this.flying); }
    else if (action === 'sprint') this.sprinting = !this.sprinting;
    else if (action === 'camera') { this.thirdPerson = !this.thirdPerson; this.onAction('camera', this.thirdPerson ? 'third' : 'first'); }
    else if (action === 'journal') this.onAction('journal');
    else if (action === 'map') this.onAction('map');
    else if (action === 'pause') this.onAction('pause');
    else if (action === 'call') this.onAction('call');
    else this.onAction(action, value);
  };

  /* ------------------------------------------------------------------ */
  /*  Update                                                             */
  /* ------------------------------------------------------------------ */
  Player.prototype.update = function (dt, world, env, campfires) {
    env = env || {};
    if (this.photoMode) {
      this._updatePhoto(dt, env);
      return;
    }
    if (this.sitting > 0) {
      this.sitting -= dt;
      this.velocity[0] *= 0.8; this.velocity[2] *= 0.8;
    }

    var forward = 0, strafe = 0;
    if (this.enabled) {
      if (this.keys['KeyW'] || this.keys['ArrowUp']) forward += 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) forward -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) strafe += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) strafe -= 1;
      forward += -this.joystick.y;
      strafe += this.joystick.x;
      if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) this.sprinting = true;
      else if (!this._isTouch()) this.sprinting = false;
      this.crouching = !!(this.keys['ControlLeft'] || this.keys['ControlRight']);
    }
    var mag = Math.sqrt(forward * forward + strafe * strafe);
    if (mag > 1) { forward /= mag; strafe /= mag; mag = 1; }
    if (this.sitting > 0) { forward = 0; strafe = 0; }

    var biome = world.biomeAt(this.position[0], this.position[2]);
    this.biome = biome;
    this.inWater = this.position[1] < SF.WATER + 0.55 && world.heightAt(this.position[0], this.position[2]) < SF.WATER;
    var frost = biome.key === 'frost';
    var baseSpeed = this.flying ? 13 : (this.sprinting ? 8.4 : 4.8);
    if (this.crouching) baseSpeed *= 0.45;
    if (this.inWater) baseSpeed *= 0.52;
    if (this.sitting > 0) baseSpeed = 0;

    // Stamina.
    if (this.sprinting && !this.flying && mag > 0.2 && this.stamina > 0) {
      this.stamina = Math.max(0, this.stamina - dt * 13);
      if (this.stamina <= 0) this.sprinting = false;
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + dt * (this.sitting > 0 ? 14 : 7));
    }

    // Warmth drains in the cold/night, fires restore it in campfires.update.
    if (!this.flying) {
      var drain = (frost ? 1.8 : 0.55) * (env.night ? 1.5 : 0.55);
      if (this.sitting > 0) drain *= 0.3;
      this.warmth = Math.max(0, this.warmth - dt * drain);
      if (this.warmth <= 0) this.health = Math.max(0, this.health - dt * 2.2);
      else if (this.warmth > 65) this.health = Math.min(this.maxHealth, this.health + dt * 0.7);
    }

    // Desired horizontal velocity in camera space.
    var sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    var wishX = (sy * forward + cy * strafe) * baseSpeed;
    var wishZ = (cy * forward - sy * strafe) * baseSpeed;
    var accel = this.onGround ? 14 : 5;
    if (this.flying) accel = 8;
    this.velocity[0] = U.damp(this.velocity[0], wishX, accel, dt);
    this.velocity[2] = U.damp(this.velocity[2], wishZ, accel, dt);

    // Vertical.
    if (this.flying) {
      var flyY = 0;
      if (this.keys['Space'] || this.jumpQueued) flyY += 1;
      if (this.keys['KeyC'] || this.keys['ShiftLeft'] || this.keys['ShiftRight']) flyY -= 1;
      if (this.keys['KeyR']) flyY += 1;
      if (this.keys['KeyX']) flyY -= 1;
      this.velocity[1] = U.damp(this.velocity[1], flyY * 8, 8, dt);
      this.position[1] += this.velocity[1] * dt;
      this.fallPeak = null;
    } else {
      var gravity = this.inWater ? 5 : 22;
      this.velocity[1] -= gravity * dt;
      if ((this.keys['Space'] || this.jumpQueued) && this.onGround) {
        this.velocity[1] = this.inWater ? 4.2 : 7.2;
        this.onGround = false;
        this.jumps++;
        U.Audio.step('grass');
      }
      if (this.inWater && (this.keys['Space'] || this.jumpQueued)) this.velocity[1] = Math.max(this.velocity[1], 3.4);
      this.position[1] += this.velocity[1] * dt;
    }
    this.jumpQueued = false;

    // Horizontal movement with collision.
    var nx = this.position[0] + this.velocity[0] * dt;
    var nz = this.position[2] + this.velocity[2] * dt;
    var prevSlope = world.heightAt(this.position[0], this.position[2]);
    var nextSlope = world.heightAt(nx, nz);
    if (!this.flying && nextSlope - prevSlope > 1.05 && nextSlope > this.position[1] + 0.4) {
      // Too steep to climb: slide along instead of clipping into a wall.
      var resolved = world.resolveCollision(nx, nz, this.radius);
      nx = resolved[0]; nz = resolved[1];
    } else {
      var res = world.resolveCollision(nx, nz, this.radius);
      nx = res[0]; nz = res[1];
    }
    this.position[0] = nx;
    this.position[2] = nz;

    // Terrain floor.
    var ground = world.heightAt(this.position[0], this.position[2]);
    var floor = ground;
    if (this.inWater) floor = Math.max(ground, SF.WATER - 0.42);
    if (this.position[1] <= floor) {
      if (this.fallPeak !== null) {
        var fall = this.fallPeak - floor;
        if (fall > 7.5) {
          var dmg = Math.round((fall - 7.5) * 4.5);
          if (dmg > 0) {
            this.health = Math.max(0, this.health - dmg);
            U.Audio.thump();
            this.onAction('hurt', dmg);
          }
        }
      }
      this.position[1] = floor;
      this.velocity[1] = 0;
      this.onGround = true;
      this.fallPeak = null;
      if (this.inWater) this.onAction('splash');
    } else {
      this.onGround = false;
      if (this.position[1] > ground + 0.2) {
        this.fallPeak = this.fallPeak === null ? this.position[1] : Math.max(this.fallPeak, this.position[1]);
      }
    }

    // Footstep rhythm + bob.
    var horizSpeed = Math.sqrt(this.velocity[0] * this.velocity[0] + this.velocity[2] * this.velocity[2]);
    this.distanceWalked += horizSpeed * dt;
    if (this.onGround && horizSpeed > 0.8) {
      this.bobPhase += dt * (this.sprinting ? 12 : 8.5);
      this.stepClock -= dt * (this.sprinting ? 1.7 : 1);
      if (this.stepClock <= 0) {
        this.stepClock = 0.42;
        var surface = this.inWater ? 'water' : (frost ? 'snow' : 'grass');
        U.Audio.step(surface);
        this._footDust(surface);
        this.onStep(surface);
      }
    } else {
      this.bobPhase += dt * 1.4;
    }
    this.bob = this.onGround ? Math.sin(this.bobPhase) * (this.sprinting ? 0.045 : 0.026) : 0;

    // Update foot particles.
    for (var i = this.footParticles.length - 1; i >= 0; i--) {
      var p = this.footParticles[i];
      p.life -= dt;
      if (p.life <= 0) { this.footParticles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.vy += p.gravity * dt;
      p.alpha = Math.max(0, p.life / p.maxLife) * 0.55;
      p.size += dt * 0.4;
    }

    if (this.health <= 0) {
      this.health = 100;
      this.warmth = 100;
      this.stamina = 100;
      var spawn = world.findSpawn();
      this.position = [spawn.x, spawn.y + 0.1, spawn.z];
      this.velocity = [0, 0, 0];
      this.onAction('respawn');
    }

    this.lastPos = [this.position[0], this.position[1], this.position[2]];
  };

  Player.prototype._updatePhoto = function (dt, env) {
    var speed = (this.keys['ShiftLeft'] || this.keys['ShiftRight']) ? 15 : 6;
    var forward = 0, strafe = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) forward += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) forward -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) strafe += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) strafe -= 1;
    forward += -this.joystick.y; strafe += this.joystick.x;
    var sy = Math.sin(this.photoYaw), cy = Math.cos(this.photoYaw);
    var cp = Math.cos(this.photoPitch), sp = Math.sin(this.photoPitch);
    var fx = sy * cp, fy = sp, fz = cy * cp;
    var rx = cy, rz = -sy;
    if (this.keys['Space']) this.photoEye[1] += speed * dt;
    if (this.keys['KeyC'] || this.keys['KeyX']) this.photoEye[1] -= speed * dt;
    this.photoEye[0] += (fx * forward + rx * strafe) * speed * dt;
    this.photoEye[1] += fy * forward * speed * dt;
    this.photoEye[2] += (fz * forward + rz * strafe) * speed * dt;
  };

  Player.prototype._footDust = function (surface) {
    var color = surface === 'snow' ? [0.88, 0.9, 0.95] : surface === 'water' ? [0.3, 0.5, 0.65] : [0.42, 0.34, 0.24];
    for (var i = 0; i < 2; i++) {
      this.footParticles.push({
        x: this.position[0] + (Math.random() - 0.5) * 0.3,
        y: this.position[1] + 0.03,
        z: this.position[2] + (Math.random() - 0.5) * 0.3,
        vx: (Math.random() - 0.5) * 0.35, vy: 0.15 + Math.random() * 0.2, vz: (Math.random() - 0.5) * 0.35,
        gravity: -0.4, life: 0.4 + Math.random() * 0.3, maxLife: 0.7,
        size: 0.13, alpha: 0.5, color: color, additive: false
      });
    }
  };

  Player.prototype.getCamera = function () {
    if (this.photoMode && this.photoEye) {
      return {
        eye: [this.photoEye[0], this.photoEye[1], this.photoEye[2]],
        yaw: this.photoYaw, pitch: this.photoPitch, fov: 60
      };
    }
    var eye = [this.position[0], this.position[1] + this.eyeHeight + this.bob, this.position[2]];
    if (this.sitting > 0) eye[1] -= 0.55;
    if (this.thirdPerson) {
      var cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      var fx = Math.sin(this.yaw) * cp, fy = sp, fz = Math.cos(this.yaw) * cp;
      eye[0] -= fx * 3.6;
      eye[1] -= fy * 3.6 - 0.45;
      eye[2] -= fz * 3.6;
    }
    return { eye: eye, yaw: this.yaw, pitch: this.pitch, fov: 70 };
  };

  Player.prototype.getForward = function () {
    var cp = Math.cos(this.pitch);
    return [Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp];
  };

  Player.prototype.interactionOrigin = function () {
    return [this.position[0], this.position[1] + this.eyeHeight * 0.75, this.position[2]];
  };

  /* ------------------------------------------------------------------ */
  /*  Avatar mesh (third person / photo mode)                            */
  /* ------------------------------------------------------------------ */
  Player.prototype.build = function (b, time, env) {
    if (!this.showBody) return;
    if (!this.thirdPerson && !this.photoMode) return;
    var s = 1;
    var moving = Math.sqrt(this.velocity[0] * this.velocity[0] + this.velocity[2] * this.velocity[2]) > 0.5;
    var step = Math.sin(this.bobPhase);
    var coat = [0.20, 0.16, 0.26];
    var coatDark = [0.13, 0.10, 0.17];
    var trim = [0.78, 0.40, 0.18];
    var skin = [0.86, 0.68, 0.52];
    var boots = [0.12, 0.09, 0.07];

    b.push();
    b.translate(this.position[0], this.position[1], this.position[2]);
    b.rotateY(this.yaw);
    // Shadow.
    b.disc(0, 0.012, 0, 0.34, 10, [0.04, 0.035, 0.03], 0);

    // Legs.
    for (var l = -1; l <= 1; l += 2) {
      b.push();
      b.translate(l * 0.13, 0.44, 0);
      b.rotateX(step * 0.45 * l * (moving ? 1 : 0.15));
      b.scale(s, s, s);
      b.cylinder(0, -0.42, 0, 0.085, 0.075, 0.46, 6, coatDark, 0, true, false);
      b.box(0, -0.42, 0.05, 0.17, 0.13, 0.27, boots, 0);
      b.pop();
    }

    // Coat / torso.
    b.push();
    b.translate(0, 0.98, 0);
    b.scale(s, s, s);
    b.cylinder(0, -0.28, 0, 0.24, 0.28, 0.62, 8, coat, 0, true, false);
    b.ellipsoid(0, 0.3, 0, 0.27, 0.13, 0.2, 8, 4, coat, 0);
    // Belt and buckle.
    b.cylinder(0, -0.02, 0, 0.285, 0.285, 0.06, 10, coatDark, 0, false, false);
    b.box(0, 0.01, 0.27, 0.1, 0.08, 0.04, trim, 0.2);
    // Scarf.
    b.torus(0, 0.34, 0, 0.18, 0.045, 9, 5, [0.62, 0.16, 0.18], 0);
    b.box(0.02, 0.18, 0.2, 0.12, 0.28, 0.05, [0.62, 0.16, 0.18], 0);
    // Satchel.
    b.box(-0.25, -0.04, 0.02, 0.2, 0.24, 0.13, [0.34, 0.22, 0.12], 0);
    b.box(-0.25, -0.04, 0.09, 0.08, 0.06, 0.02, [0.8, 0.64, 0.26], 0.1);
    b.pop();

    // Arms.
    for (var a = -1; a <= 1; a += 2) {
      b.push();
      b.translate(a * 0.32, 1.22, 0);
      b.rotateX(-step * 0.35 * a * (moving ? 1 : 0) - 0.12);
      b.rotateZ(a * 0.08);
      b.scale(s, s, s);
      b.cylinder(0, -0.5, 0, 0.075, 0.06, 0.48, 6, coat, 0, true, false);
      b.sphere(0, -0.52, 0, 0.075, 6, 4, skin, 0);
      b.pop();
    }

    // Head + hood + face shadow.
    b.push();
    b.translate(0, 1.55, 0);
    b.scale(s, s, s);
    b.sphere(0, 0.02, 0.01, 0.19, 8, 5, skin, 0);
    // Hood.
    b.ellipsoid(0, 0.06, -0.04, 0.23, 0.24, 0.23, 8, 5, coatDark, 0);
    b.ellipsoid(0, 0.06, 0.10, 0.18, 0.16, 0.13, 8, 4, [0.09, 0.07, 0.11], 0);
    // Glowing eyes in the dark hood.
    b.sphere(-0.065, 0.06, 0.20, 0.022, 5, 3, [1.0, 0.72, 0.32], 1.35);
    b.sphere(0.065, 0.06, 0.20, 0.022, 5, 3, [1.0, 0.72, 0.32], 1.35);
    // Hood point.
    b.cone(0, 0.2, -0.12, 0.15, 0.3, 5, coatDark, 0);
    b.pop();

    // Lantern in the right hand.
    b.push();
    b.translate(0.4, 1.02, 0.12);
    b.rotateZ(-0.16);
    b.box(0, -0.15, 0, 0.02, 0.26, 0.02, [0.2, 0.18, 0.16], 0);
    b.box(0, -0.3, 0, 0.18, 0.24, 0.18, [0.16, 0.14, 0.12], 0);
    b.sphere(0, -0.3, 0, 0.1, 6, 4, [1.0, 0.72, 0.3], 1.8);
    b.cone(0, -0.16, 0, 0.14, 0.1, 4, [0.14, 0.12, 0.1], 0);
    b.pop();

    b.pop();
  };

  /* ------------------------------------------------------------------ */
  /*  Persistence                                                        */
  /* ------------------------------------------------------------------ */
  Player.prototype.serialize = function () {
    return {
      position: this.position.slice(),
      yaw: this.yaw, pitch: this.pitch,
      health: this.health, stamina: this.stamina, warmth: this.warmth,
      wood: this.wood, marshmallows: this.marshmallows,
      thirdPerson: this.thirdPerson, flying: this.flying,
      distanceWalked: this.distanceWalked, jumps: this.jumps
    };
  };

  Player.prototype.load = function (data, spawn) {
    if (!data) { this.reset(spawn); return; }
    this.position = data.position ? data.position.slice() : this.position;
    this.yaw = data.yaw || 0;
    this.pitch = data.pitch || 0;
    this.health = data.health === undefined ? 100 : data.health;
    this.stamina = data.stamina === undefined ? 100 : data.stamina;
    this.warmth = data.warmth === undefined ? 100 : data.warmth;
    this.wood = data.wood === undefined ? 7 : data.wood;
    this.marshmallows = data.marshmallows === undefined ? 3 : data.marshmallows;
    this.thirdPerson = !!data.thirdPerson;
    this.flying = !!data.flying;
    this.distanceWalked = data.distanceWalked || 0;
    this.jumps = data.jumps || 0;
    // Snap to terrain if the save is from an older world seed.
    var h = this.world.heightAt(this.position[0], this.position[2]);
    if (this.position[1] < h - 0.5 || this.position[1] > h + 40) this.position[1] = h + 0.1;
  };

  SF.Player = Player;
  SF.EYE = EYE;
})(typeof window !== 'undefined' ? window : globalThis);
