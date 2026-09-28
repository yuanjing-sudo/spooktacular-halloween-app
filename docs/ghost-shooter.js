/* Spooky Ghost Shooter — Halloween 3D tab game
 * Smooth SVG ghosts, glowing projectiles, Roblox-like avatar
 */
(function () {
  'use strict';

  var GHOST_TYPES = [
    { name: 'Blinky', bodyColor: '#ff6b9d', glowColor: '#ff6b9d', eyeColor: '#fff', speed: 1.2, size: 1.0 },
    { name: 'Casper', bodyColor: '#c44dff', glowColor: '#c44dff', eyeColor: '#fff', speed: 0.9, size: 1.15 },
    { name: 'Spooky', bodyColor: '#00ffcc', glowColor: '#00ffcc', eyeColor: '#0b0620', speed: 1.5, size: 0.9 },
    { name: 'Phantom', bodyColor: '#ffd166', glowColor: '#ffd166', eyeColor: '#1a0b00', speed: 1.0, size: 1.05 },
    { name: 'Wraith', bodyColor: '#ff4500', glowColor: '#ff4500', eyeColor: '#fff', speed: 1.3, size: 0.95 },
    { name: 'Specter', bodyColor: '#59e6ff', glowColor: '#59e6ff', eyeColor: '#0b0620', speed: 0.8, size: 1.2 },
    { name: 'Shade', bodyColor: '#7dff6a', glowColor: '#7dff6a', eyeColor: '#1a0b00', speed: 1.1, size: 1.0 },
    { name: 'Banshee', bodyColor: '#ff9f1c', glowColor: '#ff9f1c', eyeColor: '#fff', speed: 1.4, size: 0.92 }
  ];

  var projectiles = [];
  var score = 0;
  var gameActive = false;
  var animFrameId = null;
  var lastTime = 0;
  var ghostCount = 0;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function createGhostSVG(type) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 120');
    svg.setAttribute('width', '100');
    svg.setAttribute('height', '120');
    svg.style.overflow = 'visible';

    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    var bodyGrad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    bodyGrad.setAttribute('id', 'ghostBody-' + type.name);
    bodyGrad.setAttribute('cx', '50%');
    bodyGrad.setAttribute('cy', '35%');
    bodyGrad.setAttribute('r', '60%');
    var stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#ffffff');
    stop1.setAttribute('stop-opacity', '0.95');
    var stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '40%');
    stop2.setAttribute('stop-color', type.bodyColor);
    stop2.setAttribute('stop-opacity', '0.85');
    var stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop3.setAttribute('offset', '100%');
    stop3.setAttribute('stop-color', type.bodyColor);
    stop3.setAttribute('stop-opacity', '0.3');
    bodyGrad.appendChild(stop1);
    bodyGrad.appendChild(stop2);
    bodyGrad.appendChild(stop3);
    defs.appendChild(bodyGrad);

    var glowGrad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    glowGrad.setAttribute('id', 'ghostGlow-' + type.name);
    var gStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    gStop1.setAttribute('offset', '0%');
    gStop1.setAttribute('stop-color', type.glowColor);
    gStop1.setAttribute('stop-opacity', '0.6');
    var gStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    gStop2.setAttribute('offset', '100%');
    gStop2.setAttribute('stop-color', type.glowColor);
    gStop2.setAttribute('stop-opacity', '0');
    glowGrad.appendChild(gStop1);
    glowGrad.appendChild(gStop2);
    defs.appendChild(glowGrad);

    var filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'ghostBlur-' + type.name);
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');
    var feGaussian = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    feGaussian.setAttribute('stdDeviation', '3');
    filter.appendChild(feGaussian);
    defs.appendChild(filter);

    svg.appendChild(defs);

    var glow = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    glow.setAttribute('cx', '50');
    glow.setAttribute('cy', '55');
    glow.setAttribute('rx', '45');
    glow.setAttribute('ry', '55');
    glow.setAttribute('fill', 'url(#ghostGlow-' + type.name + ')');
    glow.setAttribute('filter', 'url(#ghostBlur-' + type.name + ')');
    svg.appendChild(glow);

    var body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    body.setAttribute('d', 'M50 10 C75 10 90 30 90 55 L90 90 C90 95 85 100 80 95 C75 90 70 95 65 100 C60 105 55 100 50 105 C45 100 40 105 35 100 C30 95 25 90 20 95 C15 100 10 95 10 90 L10 55 C10 30 25 10 50 10 Z');
    body.setAttribute('fill', 'url(#ghostBody-' + type.name + ')');
    body.setAttribute('stroke', type.bodyColor);
    body.setAttribute('stroke-width', '1.5');
    body.setAttribute('stroke-opacity', '0.5');
    svg.appendChild(body);

    var eyeGrad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    eyeGrad.setAttribute('id', 'eyeGrad-' + type.name);
    var eStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    eStop1.setAttribute('offset', '0%');
    eStop1.setAttribute('stop-color', '#ffffff');
    eStop1.setAttribute('stop-opacity', '1');
    var eStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    eStop2.setAttribute('offset', '100%');
    eStop2.setAttribute('stop-color', type.eyeColor);
    eStop2.setAttribute('stop-opacity', '1');
    eyeGrad.appendChild(eStop1);
    eyeGrad.appendChild(eStop2);
    defs.appendChild(eyeGrad);

    var leftEye = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    leftEye.setAttribute('cx', '35');
    leftEye.setAttribute('cy', '45');
    leftEye.setAttribute('rx', '8');
    leftEye.setAttribute('ry', '10');
    leftEye.setAttribute('fill', 'url(#eyeGrad-' + type.name + ')');
    svg.appendChild(leftEye);

    var rightEye = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    rightEye.setAttribute('cx', '65');
    rightEye.setAttribute('cy', '45');
    rightEye.setAttribute('rx', '8');
    rightEye.setAttribute('ry', '10');
    rightEye.setAttribute('fill', 'url(#eyeGrad-' + type.name + ')');
    svg.appendChild(rightEye);

    var leftPupil = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    leftPupil.setAttribute('cx', '35');
    leftPupil.setAttribute('cy', '47');
    leftPupil.setAttribute('r', '4');
    leftPupil.setAttribute('fill', type.eyeColor);
    svg.appendChild(leftPupil);

    var rightPupil = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    rightPupil.setAttribute('cx', '65');
    rightPupil.setAttribute('cy', '47');
    rightPupil.setAttribute('r', '4');
    rightPupil.setAttribute('fill', type.eyeColor);
    svg.appendChild(rightPupil);

    var mouth = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    mouth.setAttribute('cx', '50');
    mouth.setAttribute('cy', '70');
    mouth.setAttribute('rx', '6');
    mouth.setAttribute('ry', '8');
    mouth.setAttribute('fill', type.eyeColor);
    mouth.setAttribute('opacity', '0.8');
    svg.appendChild(mouth);

    var cheekGrad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    cheekGrad.setAttribute('id', 'cheekGrad-' + type.name);
    var cStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    cStop1.setAttribute('offset', '0%');
    cStop1.setAttribute('stop-color', '#ffffff');
    cStop1.setAttribute('stop-opacity', '0.4');
    var cStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    cStop2.setAttribute('offset', '100%');
    cStop2.setAttribute('stop-color', '#ffffff');
    cStop2.setAttribute('stop-opacity', '0');
    cheekGrad.appendChild(cStop1);
    cheekGrad.appendChild(cStop2);
    defs.appendChild(cheekGrad);

    var leftCheek = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    leftCheek.setAttribute('cx', '25');
    leftCheek.setAttribute('cy', '58');
    leftCheek.setAttribute('r', '6');
    leftCheek.setAttribute('fill', 'url(#cheekGrad-' + type.name + ')');
    svg.appendChild(leftCheek);

    var rightCheek = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    rightCheek.setAttribute('cx', '75');
    rightCheek.setAttribute('cy', '58');
    rightCheek.setAttribute('r', '6');
    rightCheek.setAttribute('fill', 'url(#cheekGrad-' + type.name + ')');
    svg.appendChild(rightCheek);

    return svg;
  }

  function buildAvatar() {
    var avatar = el('div', 'gs-avatar');

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 120 200');
    svg.setAttribute('width', '120');
    svg.setAttribute('height', '200');
    svg.style.overflow = 'visible';

    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    var skinGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    skinGrad.setAttribute('id', 'avatarSkin');
    skinGrad.setAttribute('x1', '0%');
    skinGrad.setAttribute('y1', '0%');
    skinGrad.setAttribute('x2', '100%');
    skinGrad.setAttribute('y2', '100%');
    var sStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    sStop1.setAttribute('offset', '0%');
    sStop1.setAttribute('stop-color', '#ffd166');
    var sStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    sStop2.setAttribute('offset', '100%');
    sStop2.setAttribute('stop-color', '#ffb347');
    skinGrad.appendChild(sStop1);
    skinGrad.appendChild(sStop2);
    defs.appendChild(skinGrad);

    var shirtGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    shirtGrad.setAttribute('id', 'avatarShirt');
    shirtGrad.setAttribute('x1', '0%');
    shirtGrad.setAttribute('y1', '0%');
    shirtGrad.setAttribute('x2', '100%');
    shirtGrad.setAttribute('y2', '100%');
    var shStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    shStop1.setAttribute('offset', '0%');
    shStop1.setAttribute('stop-color', '#7c3aed');
    var shStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    shStop2.setAttribute('offset', '100%');
    shStop2.setAttribute('stop-color', '#4b1d7a');
    shirtGrad.appendChild(shStop1);
    shirtGrad.appendChild(shStop2);
    defs.appendChild(shirtGrad);

    var pantsGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    pantsGrad.setAttribute('id', 'avatarPants');
    pantsGrad.setAttribute('x1', '0%');
    pantsGrad.setAttribute('y1', '0%');
    pantsGrad.setAttribute('x2', '100%');
    pantsGrad.setAttribute('y2', '100%');
    var pStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    pStop1.setAttribute('offset', '0%');
    pStop1.setAttribute('stop-color', '#3b1d5e');
    var pStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    pStop2.setAttribute('offset', '100%');
    pStop2.setAttribute('stop-color', '#1a0b30');
    pantsGrad.appendChild(pStop1);
    pantsGrad.appendChild(pStop2);
    defs.appendChild(pantsGrad);

    var hairGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    hairGrad.setAttribute('id', 'avatarHair');
    hairGrad.setAttribute('x1', '0%');
    hairGrad.setAttribute('y1', '0%');
    hairGrad.setAttribute('x2', '100%');
    hairGrad.setAttribute('y2', '100%');
    var hStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    hStop1.setAttribute('offset', '0%');
    hStop1.setAttribute('stop-color', '#5a3a1a');
    var hStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    hStop2.setAttribute('offset', '100%');
    hStop2.setAttribute('stop-color', '#2a1505');
    hairGrad.appendChild(hStop1);
    hairGrad.appendChild(hStop2);
    defs.appendChild(hairGrad);

    svg.appendChild(defs);

    var leftArm = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    leftArm.setAttribute('x', '18');
    leftArm.setAttribute('y', '75');
    leftArm.setAttribute('width', '16');
    leftArm.setAttribute('height', '55');
    leftArm.setAttribute('rx', '8');
    leftArm.setAttribute('fill', 'url(#avatarSkin)');
    leftArm.setAttribute('class', 'gs-avatar-limb left-arm');
    svg.appendChild(leftArm);

    var rightArm = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rightArm.setAttribute('x', '86');
    rightArm.setAttribute('y', '75');
    rightArm.setAttribute('width', '16');
    rightArm.setAttribute('height', '55');
    rightArm.setAttribute('rx', '8');
    rightArm.setAttribute('fill', 'url(#avatarSkin)');
    rightArm.setAttribute('class', 'gs-avatar-limb right-arm');
    svg.appendChild(rightArm);

    var leftHand = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    leftHand.setAttribute('cx', '26');
    leftHand.setAttribute('cy', '132');
    leftHand.setAttribute('r', '9');
    leftHand.setAttribute('fill', 'url(#avatarSkin)');
    svg.appendChild(leftHand);

    var rightHand = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    rightHand.setAttribute('cx', '94');
    rightHand.setAttribute('cy', '132');
    rightHand.setAttribute('r', '9');
    rightHand.setAttribute('fill', 'url(#avatarSkin)');
    svg.appendChild(rightHand);

    var torso = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    torso.setAttribute('x', '35');
    torso.setAttribute('y', '70');
    torso.setAttribute('width', '50');
    torso.setAttribute('height', '60');
    torso.setAttribute('rx', '14');
    torso.setAttribute('fill', 'url(#avatarShirt)');
    svg.appendChild(torso);

    var collar = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    collar.setAttribute('d', 'M45 70 Q60 80 75 70');
    collar.setAttribute('fill', 'none');
    collar.setAttribute('stroke', '#ffd166');
    collar.setAttribute('stroke-width', '2');
    collar.setAttribute('stroke-linecap', 'round');
    svg.appendChild(collar);

    var leftLeg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    leftLeg.setAttribute('x', '40');
    leftLeg.setAttribute('y', '130');
    leftLeg.setAttribute('width', '16');
    leftLeg.setAttribute('height', '50');
    leftLeg.setAttribute('rx', '8');
    leftLeg.setAttribute('fill', 'url(#avatarPants)');
    svg.appendChild(leftLeg);

    var rightLeg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rightLeg.setAttribute('x', '64');
    rightLeg.setAttribute('y', '130');
    rightLeg.setAttribute('width', '16');
    rightLeg.setAttribute('height', '50');
    rightLeg.setAttribute('rx', '8');
    rightLeg.setAttribute('fill', 'url(#avatarPants)');
    svg.appendChild(rightLeg);

    var leftFoot = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    leftFoot.setAttribute('cx', '48');
    leftFoot.setAttribute('cy', '182');
    leftFoot.setAttribute('rx', '12');
    leftFoot.setAttribute('ry', '6');
    leftFoot.setAttribute('fill', '#1a0b00');
    svg.appendChild(leftFoot);

    var rightFoot = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    rightFoot.setAttribute('cx', '72');
    rightFoot.setAttribute('cy', '182');
    rightFoot.setAttribute('rx', '12');
    rightFoot.setAttribute('ry', '6');
    rightFoot.setAttribute('fill', '#1a0b00');
    svg.appendChild(rightFoot);

    var head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    head.setAttribute('cx', '60');
    head.setAttribute('cy', '40');
    head.setAttribute('r', '28');
    head.setAttribute('fill', 'url(#avatarSkin)');
    svg.appendChild(head);

    var hair = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hair.setAttribute('d', 'M32 35 Q35 10 60 10 Q85 10 88 35 Q85 25 60 22 Q35 25 32 35 Z');
    hair.setAttribute('fill', 'url(#avatarHair)');
    svg.appendChild(hair);

    var leftEyeWhite = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    leftEyeWhite.setAttribute('cx', '50');
    leftEyeWhite.setAttribute('cy', '38');
    leftEyeWhite.setAttribute('rx', '7');
    leftEyeWhite.setAttribute('ry', '8');
    leftEyeWhite.setAttribute('fill', '#ffffff');
    svg.appendChild(leftEyeWhite);

    var rightEyeWhite = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    rightEyeWhite.setAttribute('cx', '70');
    rightEyeWhite.setAttribute('cy', '38');
    rightEyeWhite.setAttribute('rx', '7');
    rightEyeWhite.setAttribute('ry', '8');
    rightEyeWhite.setAttribute('fill', '#ffffff');
    svg.appendChild(rightEyeWhite);

    var leftPupil = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    leftPupil.setAttribute('cx', '50');
    leftPupil.setAttribute('cy', '40');
    leftPupil.setAttribute('r', '4');
    leftPupil.setAttribute('fill', '#1a0b00');
    svg.appendChild(leftPupil);

    var rightPupil = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    rightPupil.setAttribute('cx', '70');
    rightPupil.setAttribute('cy', '40');
    rightPupil.setAttribute('r', '4');
    rightPupil.setAttribute('fill', '#1a0b00');
    svg.appendChild(rightPupil);

    var leftHighlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    leftHighlight.setAttribute('cx', '52');
    leftHighlight.setAttribute('cy', '37');
    leftHighlight.setAttribute('r', '1.5');
    leftHighlight.setAttribute('fill', '#ffffff');
    svg.appendChild(leftHighlight);

    var rightHighlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    rightHighlight.setAttribute('cx', '72');
    rightHighlight.setAttribute('cy', '37');
    rightHighlight.setAttribute('r', '1.5');
    rightHighlight.setAttribute('fill', '#ffffff');
    svg.appendChild(rightHighlight);

    var mouth = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    mouth.setAttribute('d', 'M52 52 Q60 58 68 52');
    mouth.setAttribute('fill', 'none');
    mouth.setAttribute('stroke', '#1a0b00');
    mouth.setAttribute('stroke-width', '2');
    mouth.setAttribute('stroke-linecap', 'round');
    svg.appendChild(mouth);

    var leftBrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    leftBrow.setAttribute('d', 'M43 30 Q50 27 57 30');
    leftBrow.setAttribute('fill', 'none');
    leftBrow.setAttribute('stroke', '#2a1505');
    leftBrow.setAttribute('stroke-width', '2');
    leftBrow.setAttribute('stroke-linecap', 'round');
    svg.appendChild(leftBrow);

    var rightBrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    rightBrow.setAttribute('d', 'M63 30 Q70 27 77 30');
    rightBrow.setAttribute('fill', 'none');
    rightBrow.setAttribute('stroke', '#2a1505');
    rightBrow.setAttribute('stroke-width', '2');
    rightBrow.setAttribute('stroke-linecap', 'round');
    svg.appendChild(rightBrow);

    avatar.appendChild(svg);
    return avatar;
  }

  function spawnGhost() {
    var type = GHOST_TYPES[(Math.random() * GHOST_TYPES.length) | 0];
    var ghost = el('div', 'gs-ghost');
    var svg = createGhostSVG(type);
    ghost.appendChild(svg);
    ghost.style.left = (8 + Math.random() * 65) + '%';
    ghost.style.top = (5 + Math.random() * 35) + '%';
    ghost.style.setProperty('--ghost-speed', type.speed);
    ghost.style.setProperty('--ghost-scale', type.size);
    ghost.dataset.hp = 2;
    ghost.dataset.name = type.name;
    ghost.style.transform = 'scale(' + type.size + ')';
    return ghost;
  }

  function shoot() {
    if (!gameActive) return;
    var arena = document.getElementById('gs-arena');
    if (!arena) return;
    var avatar = arena.querySelector('.gs-avatar');
    if (!avatar) return;

    var proj = el('div', 'gs-projectile');
    var ar = avatar.getBoundingClientRect();
    var cr = arena.getBoundingClientRect();
    proj.style.left = (ar.left - cr.left + ar.width / 2 - 8) + 'px';
    proj.style.top = (ar.top - cr.top + 30) + 'px';
    arena.appendChild(proj);
    projectiles.push({ el: proj, x: ar.left - cr.left + ar.width / 2 - 8, y: ar.top - cr.top + 30, vy: -10 });

    setTimeout(function () {
      if (proj.parentNode) proj.parentNode.removeChild(proj);
    }, 1500);
  }

  function updateProjectiles() {
    var arena = document.getElementById('gs-arena');
    if (!arena) return;
    var cr = arena.getBoundingClientRect();

    for (var i = projectiles.length - 1; i >= 0; i--) {
      var p = projectiles[i];
      p.y += p.vy;
      p.el.style.top = p.y + 'px';

      var ghostEls = arena.querySelectorAll('.gs-ghost');
      for (var j = 0; j < ghostEls.length; j++) {
        var g = ghostEls[j];
        var gr = g.getBoundingClientRect();
        var gx = gr.left - cr.left;
        var gy = gr.top - cr.top;
        var gw = gr.width;
        var gh = gr.height;

        if (p.x > gx - 15 && p.x < gx + gw + 15 && p.y > gy - 15 && p.y < gy + gh + 15) {
          var hp = parseInt(g.dataset.hp) - 1;
          g.dataset.hp = hp;
          g.classList.add('gs-ghost-hit');
          setTimeout(function (gg) {
            return function () { gg.classList.remove('gs-ghost-hit'); };
          }(g), 200);

          if (hp <= 0) {
            score += 10;
            var scoreEl = document.getElementById('gs-score');
            if (scoreEl) scoreEl.textContent = score;
            g.classList.add('gs-ghost-dying');
            setTimeout(function (gg) {
              return function () {
                if (gg.parentNode) gg.parentNode.removeChild(gg);
              };
            }(g), 600);
          }

          if (p.el.parentNode) p.el.parentNode.removeChild(p.el);
          projectiles.splice(i, 1);
          break;
        }
      }

      if (p.y < -30) {
        if (p.el.parentNode) p.el.parentNode.removeChild(p.el);
        projectiles.splice(i, 1);
      }
    }
  }

  function updateGhosts(dt) {
    var arena = document.getElementById('gs-arena');
    if (!arena) return;

    var ghostEls = arena.querySelectorAll('.gs-ghost');
    for (var i = 0; i < ghostEls.length; i++) {
      var g = ghostEls[i];
      if (g.classList.contains('gs-ghost-dying')) continue;
      var speed = parseFloat(g.style.getPropertyValue('--ghost-speed')) || 1;
      var curLeft = parseFloat(g.style.left) || 50;
      var curTop = parseFloat(g.style.top) || 20;
      var drift = Math.sin(Date.now() / (1000 / speed) + i * 1.7) * 0.4;
      var newLeft = curLeft + drift * speed * dt * 60;
      var newTop = curTop + Math.cos(Date.now() / (1200 / speed) + i * 2.3) * 0.25 * speed * dt * 60;
      if (newLeft < 5) newLeft = 5;
      if (newLeft > 72) newLeft = 72;
      if (newTop < 5) newTop = 5;
      if (newTop > 50) newTop = 50;
      g.style.left = newLeft + '%';
      g.style.top = newTop + '%';
    }
  }

  function gameLoop(timestamp) {
    if (!gameActive) return;
    if (!lastTime) lastTime = timestamp;
    var dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    updateGhosts(dt);
    updateProjectiles();

    animFrameId = requestAnimationFrame(gameLoop);
  }

  function startGame() {
    var arena = document.getElementById('gs-arena');
    if (!arena) return;
    arena.innerHTML = '';
    projectiles = [];
    score = 0;
    ghostCount = 0;
    gameActive = true;
    lastTime = 0;

    var scoreEl = el('div', 'gs-score-board', 'Score: <span id="gs-score">0</span> · Ghosts: <span id="gs-count">0</span>');
    arena.appendChild(scoreEl);

    var scene = el('div', 'gs-scene');
    arena.appendChild(scene);

    for (var i = 0; i < 5; i++) {
      var g = spawnGhost();
      scene.appendChild(g);
      ghostCount++;
    }

    var avatar = buildAvatar();
    scene.appendChild(avatar);

    var shootBtn = el('button', 'gs-shoot-btn', '🔫 SHOOT');
    shootBtn.onclick = shoot;
    arena.appendChild(shootBtn);

    var spawnBtn = el('button', 'gs-spawn-btn', '👻 +Ghost');
    spawnBtn.onclick = function () {
      if (scene.querySelectorAll('.gs-ghost').length < 12) {
        scene.appendChild(spawnGhost());
        ghostCount++;
        var countEl = document.getElementById('gs-count');
        if (countEl) countEl.textContent = ghostCount;
      }
    };
    arena.appendChild(spawnBtn);

    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space' && gameActive) {
        e.preventDefault();
        shoot();
      }
    });

    animFrameId = requestAnimationFrame(gameLoop);
  }

  function stopGame() {
    gameActive = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  function build(box) {
    var head = el('div', 'phead', '<h2>👻 Spooky Ghost Shooter</h2><div class="psub">Blast the floating ghosts! Smooth SVG Halloween action.</div>');
    box.appendChild(head);

    var arena = el('div', 'gs-arena');
    arena.id = 'gs-arena';
    box.appendChild(arena);

    var startBtn = el('button', 'gs-start-btn', '▶ Start Game');
    startBtn.onclick = startGame;
    box.appendChild(startBtn);

    var stopBtn = el('button', 'gs-stop-btn', '⏹ Stop');
    stopBtn.onclick = stopGame;
    box.appendChild(stopBtn);

    var back = el('button', '', '⛏️ Back to Maze');
    back.onclick = function () {
      stopGame();
      if (window.SpookyTabs) window.SpookyTabs.select(0);
    };
    box.appendChild(back);

    return box;
  }

  window.SpookyGhostShooter = { build: build, start: startGame, stop: stopGame };
})();
