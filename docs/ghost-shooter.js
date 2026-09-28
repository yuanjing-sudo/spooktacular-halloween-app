/* Spooky Ghost Shooter — 3D Halloween Forest
 * XYZ interface, autumn trees, walking avatar, blue orb capture mechanic
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
  var particles = [];
  var score = 0;
  var captured = 0;
  var gameActive = false;
  var animFrameId = null;
  var lastTime = 0;
  var avatarX = 50;
  var avatarZ = 80;
  var keys = {};

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
    bodyGrad.setAttribute('id', 'ghostBody-' + type.name + '-' + Date.now());
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
    glowGrad.setAttribute('id', 'ghostGlow-' + type.name + '-' + Date.now());
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
    filter.setAttribute('id', 'ghostBlur-' + type.name + '-' + Date.now());
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
    glow.setAttribute('fill', 'url(#ghostGlow-' + type.name + '-' + Date.now() + ')');
    glow.setAttribute('filter', 'url(#ghostBlur-' + type.name + '-' + Date.now() + ')');
    svg.appendChild(glow);

    var body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    body.setAttribute('d', 'M50 10 C75 10 90 30 90 55 L90 90 C90 95 85 100 80 95 C75 90 70 95 65 100 C60 105 55 100 50 105 C45 100 40 105 35 100 C30 95 25 90 20 95 C15 100 10 95 10 90 L10 55 C10 30 25 10 50 10 Z');
    body.setAttribute('fill', 'url(#ghostBody-' + type.name + '-' + Date.now() + ')');
    body.setAttribute('stroke', type.bodyColor);
    body.setAttribute('stroke-width', '1.5');
    body.setAttribute('stroke-opacity', '0.5');
    svg.appendChild(body);

    var eyeGrad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    eyeGrad.setAttribute('id', 'eyeGrad-' + type.name + '-' + Date.now());
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
    leftEye.setAttribute('fill', 'url(#eyeGrad-' + type.name + '-' + Date.now() + ')');
    svg.appendChild(leftEye);

    var rightEye = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    rightEye.setAttribute('cx', '65');
    rightEye.setAttribute('cy', '45');
    rightEye.setAttribute('rx', '8');
    rightEye.setAttribute('ry', '10');
    rightEye.setAttribute('fill', 'url(#eyeGrad-' + type.name + '-' + Date.now() + ')');
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
    cheekGrad.setAttribute('id', 'cheekGrad-' + type.name + '-' + Date.now());
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
    leftCheek.setAttribute('fill', 'url(#cheekGrad-' + type.name + '-' + Date.now() + ')');
    svg.appendChild(leftCheek);

    var rightCheek = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    rightCheek.setAttribute('cx', '75');
    rightCheek.setAttribute('cy', '58');
    rightCheek.setAttribute('r', '6');
    rightCheek.setAttribute('fill', 'url(#cheekGrad-' + type.name + '-' + Date.now() + ')');
    svg.appendChild(rightCheek);

    return svg;
  }

  function createTreeSVG(x, z, scale) {
    var tree = el('div', 'gs-tree');
    tree.style.left = x + '%';
    tree.style.bottom = z + '%';
    tree.style.transform = 'scale(' + scale + ')';

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 80 160');
    svg.setAttribute('width', '80');
    svg.setAttribute('height', '160');

    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    var trunkGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    trunkGrad.setAttribute('id', 'trunkGrad' + x + z);
    trunkGrad.setAttribute('x1', '0%');
    trunkGrad.setAttribute('y1', '0%');
    trunkGrad.setAttribute('x2', '100%');
    trunkGrad.setAttribute('y2', '0%');
    var tStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    tStop1.setAttribute('offset', '0%');
    tStop1.setAttribute('stop-color', '#3d2314');
    var tStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    tStop2.setAttribute('offset', '50%');
    tStop2.setAttribute('stop-color', '#5a3a1a');
    var tStop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    tStop3.setAttribute('offset', '100%');
    tStop3.setAttribute('stop-color', '#2a1505');
    trunkGrad.appendChild(tStop1);
    trunkGrad.appendChild(tStop2);
    trunkGrad.appendChild(tStop3);
    defs.appendChild(trunkGrad);

    var leafGrad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    leafGrad.setAttribute('id', 'leafGrad' + x + z);
    leafGrad.setAttribute('cx', '50%');
    leafGrad.setAttribute('cy', '30%');
    leafGrad.setAttribute('r', '70%');
    var lStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    lStop1.setAttribute('offset', '0%');
    lStop1.setAttribute('stop-color', '#ff9f1c');
    var lStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    lStop2.setAttribute('offset', '50%');
    lStop2.setAttribute('stop-color', '#e55a00');
    var lStop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    lStop3.setAttribute('offset', '100%');
    lStop3.setAttribute('stop-color', '#8b2500');
    leafGrad.appendChild(lStop1);
    leafGrad.appendChild(lStop2);
    leafGrad.appendChild(lStop3);
    defs.appendChild(leafGrad);

    svg.appendChild(defs);

    var trunk = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    trunk.setAttribute('d', 'M35 160 L38 100 L36 80 L40 60 L44 80 L42 100 L45 160 Z');
    trunk.setAttribute('fill', 'url(#trunkGrad' + x + z + ')');
    svg.appendChild(trunk);

    var foliage1 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    foliage1.setAttribute('cx', '40');
    foliage1.setAttribute('cy', '45');
    foliage1.setAttribute('rx', '35');
    foliage1.setAttribute('ry', '40');
    foliage1.setAttribute('fill', 'url(#leafGrad' + x + z + ')');
    svg.appendChild(foliage1);

    var foliage2 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    foliage2.setAttribute('cx', '25');
    foliage2.setAttribute('cy', '60');
    foliage2.setAttribute('rx', '25');
    foliage2.setAttribute('ry', '30');
    foliage2.setAttribute('fill', 'url(#leafGrad' + x + z + ')');
    foliage2.setAttribute('opacity', '0.8');
    svg.appendChild(foliage2);

    var foliage3 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    foliage3.setAttribute('cx', '55');
    foliage3.setAttribute('cy', '60');
    foliage3.setAttribute('rx', '25');
    foliage3.setAttribute('ry', '30');
    foliage3.setAttribute('fill', 'url(#leafGrad' + x + z + ')');
    foliage3.setAttribute('opacity', '0.8');
    svg.appendChild(foliage3);

    tree.appendChild(svg);
    return tree;
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
    leftLeg.setAttribute('class', 'gs-avatar-leg left-leg');
    svg.appendChild(leftLeg);

    var rightLeg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rightLeg.setAttribute('x', '64');
    rightLeg.setAttribute('y', '130');
    rightLeg.setAttribute('width', '16');
    rightLeg.setAttribute('height', '50');
    rightLeg.setAttribute('rx', '8');
    rightLeg.setAttribute('fill', 'url(#avatarPants)');
    rightLeg.setAttribute('class', 'gs-avatar-leg right-leg');
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

  function createXYZOverlay() {
    var overlay = el('div', 'gs-xyz-overlay');

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.setAttribute('width', '200');
    svg.setAttribute('height', '200');

    var grid = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    grid.setAttribute('class', 'gs-grid');

    for (var i = 0; i <= 10; i++) {
      var x = i * 20;
      var lineX = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineX.setAttribute('x1', x);
      lineX.setAttribute('y1', '0');
      lineX.setAttribute('x2', x);
      lineX.setAttribute('y2', '200');
      lineX.setAttribute('stroke', '#6d28a8');
      lineX.setAttribute('stroke-width', '0.5');
      lineX.setAttribute('opacity', '0.3');
      grid.appendChild(lineX);

      var lineY = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineY.setAttribute('x1', '0');
      lineY.setAttribute('y1', x);
      lineY.setAttribute('x2', '200');
      lineY.setAttribute('y2', x);
      lineY.setAttribute('stroke', '#6d28a8');
      lineY.setAttribute('stroke-width', '0.5');
      lineY.setAttribute('opacity', '0.3');
      grid.appendChild(lineY);
    }
    svg.appendChild(grid);

    var xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', '10');
    xAxis.setAttribute('y1', '100');
    xAxis.setAttribute('x2', '190');
    xAxis.setAttribute('y2', '100');
    xAxis.setAttribute('stroke', '#ff4444');
    xAxis.setAttribute('stroke-width', '2');
    svg.appendChild(xAxis);

    var xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xLabel.setAttribute('x', '185');
    xLabel.setAttribute('y', '95');
    xLabel.setAttribute('fill', '#ff4444');
    xLabel.setAttribute('font-size', '14');
    xLabel.setAttribute('font-weight', 'bold');
    xLabel.textContent = 'X';
    svg.appendChild(xLabel);

    var yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', '100');
    yAxis.setAttribute('y1', '190');
    yAxis.setAttribute('x2', '100');
    yAxis.setAttribute('y2', '10');
    yAxis.setAttribute('stroke', '#44ff44');
    yAxis.setAttribute('stroke-width', '2');
    svg.appendChild(yAxis);

    var yLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yLabel.setAttribute('x', '105');
    yLabel.setAttribute('y', '20');
    yLabel.setAttribute('fill', '#44ff44');
    yLabel.setAttribute('font-size', '14');
    yLabel.setAttribute('font-weight', 'bold');
    yLabel.textContent = 'Y';
    svg.appendChild(yLabel);

    var zAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    zAxis.setAttribute('x1', '100');
    zAxis.setAttribute('y1', '100');
    zAxis.setAttribute('x2', '160');
    zAxis.setAttribute('y2', '160');
    zAxis.setAttribute('stroke', '#4444ff');
    zAxis.setAttribute('stroke-width', '2');
    svg.appendChild(zAxis);

    var zLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    zLabel.setAttribute('x', '155');
    zLabel.setAttribute('y', '175');
    zLabel.setAttribute('fill', '#4444ff');
    zLabel.setAttribute('font-size', '14');
    zLabel.setAttribute('font-weight', 'bold');
    zLabel.textContent = 'Z';
    svg.appendChild(zLabel);

    var origin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    origin.setAttribute('cx', '100');
    origin.setAttribute('cy', '100');
    origin.setAttribute('r', '4');
    origin.setAttribute('fill', '#ffd166');
    svg.appendChild(origin);

    overlay.appendChild(svg);
    return overlay;
  }

  function spawnGhost() {
    var type = GHOST_TYPES[(Math.random() * GHOST_TYPES.length) | 0];
    var ghost = el('div', 'gs-ghost');
    var svg = createGhostSVG(type);
    ghost.appendChild(svg);
    ghost.style.left = (10 + Math.random() * 60) + '%';
    ghost.style.top = (10 + Math.random() * 40) + '%';
    ghost.style.setProperty('--ghost-speed', type.speed);
    ghost.style.setProperty('--ghost-scale', type.size);
    ghost.dataset.hp = 3;
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

    var proj = el('div', 'gs-orb');
    var ar = avatar.getBoundingClientRect();
    var cr = arena.getBoundingClientRect();
    proj.style.left = (ar.left - cr.left + ar.width / 2 - 10) + 'px';
    proj.style.top = (ar.top - cr.top + 40) + 'px';
    arena.appendChild(proj);
    projectiles.push({ el: proj, x: ar.left - cr.left + ar.width / 2 - 10, y: ar.top - cr.top + 40, vy: -12, vx: (Math.random() - 0.5) * 2 });

    setTimeout(function () {
      if (proj.parentNode) proj.parentNode.removeChild(proj);
    }, 2000);
  }

  function explodeOrb(x, y) {
    var arena = document.getElementById('gs-arena');
    if (!arena) return;

    for (var i = 0; i < 12; i++) {
      var p = el('div', 'gs-particle');
      var angle = (i / 12) * Math.PI * 2;
      var speed = 2 + Math.random() * 3;
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.setProperty('--px', Math.cos(angle) * speed * 20 + 'px');
      p.style.setProperty('--py', Math.sin(angle) * speed * 20 + 'px');
      arena.appendChild(p);
      particles.push({ el: p, life: 1 });

      setTimeout(function (pp) {
        return function () {
          if (pp.parentNode) pp.parentNode.removeChild(pp);
        };
      }(p), 800);
    }

    var mist = el('div', 'gs-mist');
    mist.style.left = (x - 30) + 'px';
    mist.style.top = (y - 30) + 'px';
    arena.appendChild(mist);
    setTimeout(function () {
      if (mist.parentNode) mist.parentNode.removeChild(mist);
    }, 1200);
  }

  function updateProjectiles() {
    var arena = document.getElementById('gs-arena');
    if (!arena) return;
    var cr = arena.getBoundingClientRect();

    for (var i = projectiles.length - 1; i >= 0; i--) {
      var p = projectiles[i];
      p.y += p.vy;
      p.x += p.vx;
      p.el.style.top = p.y + 'px';
      p.el.style.left = p.x + 'px';

      var ghostEls = arena.querySelectorAll('.gs-ghost');
      for (var j = 0; j < ghostEls.length; j++) {
        var g = ghostEls[j];
        var gr = g.getBoundingClientRect();
        var gx = gr.left - cr.left;
        var gy = gr.top - cr.top;
        var gw = gr.width;
        var gh = gr.height;

        if (p.x > gx - 20 && p.x < gx + gw + 20 && p.y > gy - 20 && p.y < gy + gh + 20) {
          var hp = parseInt(g.dataset.hp) - 1;
          g.dataset.hp = hp;
          g.classList.add('gs-ghost-hit');
          setTimeout(function (gg) {
            return function () { gg.classList.remove('gs-ghost-hit'); };
          }(g), 200);

          explodeOrb(p.x, p.y);

          if (hp <= 0) {
            score += 25;
            captured++;
            var scoreEl = document.getElementById('gs-score');
            if (scoreEl) scoreEl.textContent = score;
            var capEl = document.getElementById('gs-captured');
            if (capEl) capEl.textContent = captured;
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

      if (p.y < -30 || p.x < -30 || p.x > cr.width + 30) {
        explodeOrb(p.x, p.y);
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
      if (newLeft < 8) newLeft = 8;
      if (newLeft > 70) newLeft = 70;
      if (newTop < 8) newTop = 8;
      if (newTop < 8) newTop = 8;
      if (newTop > 50) newTop = 50;
      g.style.left = newLeft + '%';
      g.style.top = newTop + '%';
    }
  }

  function updateAvatar(dt) {
    var arena = document.getElementById('gs-arena');
    if (!arena) return;
    var avatar = arena.querySelector('.gs-avatar');
    if (!avatar) return;

    var moveSpeed = 30 * dt;
    var moved = false;

    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
      avatarX -= moveSpeed;
      moved = true;
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
      avatarX += moveSpeed;
      moved = true;
    }
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
      avatarZ -= moveSpeed;
      moved = true;
    }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) {
      avatarZ += moveSpeed;
      moved = true;
    }

    if (avatarX < 5) avatarX = 5;
    if (avatarX > 85) avatarX = 85;
    if (avatarZ < 40) avatarZ = 40;
    if (avatarZ > 90) avatarZ = 90;

    avatar.style.left = avatarX + '%';
    avatar.style.bottom = (100 - avatarZ) + '%';

    if (moved) {
      avatar.classList.add('gs-avatar-walking');
    } else {
      avatar.classList.remove('gs-avatar-walking');
    }
  }

  function gameLoop(timestamp) {
    if (!gameActive) return;
    if (!lastTime) lastTime = timestamp;
    var dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    updateAvatar(dt);
    updateGhosts(dt);
    updateProjectiles();

    animFrameId = requestAnimationFrame(gameLoop);
  }

  function startGame() {
    var arena = document.getElementById('gs-arena');
    if (!arena) return;
    arena.innerHTML = '';
    projectiles = [];
    particles = [];
    score = 0;
    captured = 0;
    avatarX = 50;
    avatarZ = 80;
    gameActive = true;
    lastTime = 0;

    var scoreEl = el('div', 'gs-score-board', 'Score: <span id="gs-score">0</span> · Captured: <span id="gs-captured">0</span>');
    arena.appendChild(scoreEl);

    var xyzOverlay = createXYZOverlay();
    arena.appendChild(xyzOverlay);

    var ground = el('div', 'gs-ground');
    arena.appendChild(ground);

    var hills = el('div', 'gs-hills');
    var hillData = [
      { left: '5%', width: '30%', height: '60%' },
      { left: '25%', width: '35%', height: '80%' },
      { left: '55%', width: '28%', height: '55%' },
      { left: '75%', width: '32%', height: '70%' }
    ];
    hillData.forEach(function (h) {
      var hill = el('div', 'gs-hill');
      hill.style.left = h.left;
      hill.style.width = h.width;
      hill.style.height = h.height;
      hills.appendChild(hill);
    });
    arena.appendChild(hills);

    var clouds = el('div', 'gs-clouds');
    for (var ci = 0; ci < 6; ci++) {
      var cloud = el('div', 'gs-cloud');
      cloud.style.top = (5 + Math.random() * 25) + '%';
      cloud.style.width = (80 + Math.random() * 120) + 'px';
      cloud.style.height = (30 + Math.random() * 40) + 'px';
      cloud.style.animationDuration = (40 + Math.random() * 40) + 's';
      cloud.style.animationDelay = (-Math.random() * 30) + 's';
      clouds.appendChild(cloud);
    }
    arena.appendChild(clouds);

    var scene = el('div', 'gs-scene');
    arena.appendChild(scene);

    var trees = [
      { x: 5, z: 20, s: 0.8 }, { x: 15, z: 35, s: 1.0 }, { x: 25, z: 15, s: 0.7 },
      { x: 35, z: 40, s: 1.1 }, { x: 45, z: 25, s: 0.9 }, { x: 55, z: 45, s: 1.0 },
      { x: 65, z: 20, s: 0.8 }, { x: 75, z: 35, s: 1.1 }, { x: 85, z: 15, s: 0.7 },
      { x: 10, z: 55, s: 1.2 }, { x: 30, z: 60, s: 1.0 }, { x: 50, z: 55, s: 0.9 },
      { x: 70, z: 60, s: 1.1 }, { x: 90, z: 50, s: 0.8 }, { x: 20, z: 75, s: 1.0 },
      { x: 40, z: 80, s: 1.2 }, { x: 60, z: 75, s: 0.9 }, { x: 80, z: 80, s: 1.0 }
    ];
    trees.forEach(function (t) {
      scene.appendChild(createTreeSVG(t.x, t.z, t.s));
    });

    for (var i = 0; i < 6; i++) {
      scene.appendChild(spawnGhost());
    }

    var avatar = buildAvatar();
    scene.appendChild(avatar);

    var shootBtn = el('button', 'gs-shoot-btn', '🔵 SHOOT ORB');
    shootBtn.onclick = shoot;
    arena.appendChild(shootBtn);

    var spawnBtn = el('button', 'gs-spawn-btn', '👻 +Ghost');
    spawnBtn.onclick = function () {
      if (scene.querySelectorAll('.gs-ghost').length < 15) {
        scene.appendChild(spawnGhost());
      }
    };
    arena.appendChild(spawnBtn);

    var help = el('div', 'gs-help', 'WASD / Arrows to walk · SPACE to shoot orb');
    arena.appendChild(help);

    document.addEventListener('keydown', function (e) {
      keys[e.key] = true;
      if (e.code === 'Space' && gameActive) {
        e.preventDefault();
        shoot();
      }
    });
    document.addEventListener('keyup', function (e) {
      keys[e.key] = false;
    });

    animFrameId = requestAnimationFrame(gameLoop);
  }

  function stopGame() {
    gameActive = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  function build(box) {
    var head = el('div', 'phead', '<h2>👻 Spooky Ghost Shooter 3D</h2><div class="psub">Walk through the autumn forest, shoot blue orbs to capture ghosts!</div>');
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
