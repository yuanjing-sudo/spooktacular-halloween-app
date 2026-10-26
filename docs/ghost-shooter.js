/* Spooky Ghost Shooter — 2D Halloween Forest
 * Painted 2D haunted-forest arena, glowing ghost varieties, orb capture.
 */
(function () {
  'use strict';

  var GHOST_TYPES = [
    { name: 'Blinky',   bodyColor: '#ff6b9d', glowColor: '#ff6b9d', eyeColor: '#fff',    speed: 1.2, size: 1.00, variant: 'classic' },
    { name: 'Casper',   bodyColor: '#c44dff', glowColor: '#c44dff', eyeColor: '#fff',    speed: 0.9, size: 1.15, variant: 'classic' },
    { name: 'Spooky',   bodyColor: '#00ffcc', glowColor: '#00ffcc', eyeColor: '#0b0620', speed: 1.5, size: 0.90, variant: 'classic' },
    { name: 'Phantom',  bodyColor: '#ffd166', glowColor: '#ffd166', eyeColor: '#1a0b00', speed: 1.0, size: 1.05, variant: 'classic' },
    { name: 'Wraith',   bodyColor: '#ff4500', glowColor: '#ff4500', eyeColor: '#fff',    speed: 1.3, size: 0.95, variant: 'classic' },
    { name: 'Specter',  bodyColor: '#59e6ff', glowColor: '#59e6ff', eyeColor: '#0b0620', speed: 0.8, size: 1.20, variant: 'classic' },
    { name: 'Shade',    bodyColor: '#7dff6a', glowColor: '#7dff6a', eyeColor: '#1a0b00', speed: 1.1, size: 1.00, variant: 'classic' },
    { name: 'Banshee',  bodyColor: '#ff9f1c', glowColor: '#ff9f1c', eyeColor: '#fff',    speed: 1.4, size: 0.92, variant: 'classic' },
    { name: 'Pumpkin',  bodyColor: '#ff8c1a', glowColor: '#ff8c1a', eyeColor: '#3a1400', speed: 0.95, size: 1.08, variant: 'pumpkin', points: 40 },
    { name: 'Imp',      bodyColor: '#d45bff', glowColor: '#d45bff', eyeColor: '#fff',    speed: 1.45, size: 0.95, variant: 'horns',   points: 35 },
    { name: 'Monarch',  bodyColor: '#ffd166', glowColor: '#ffe08a', eyeColor: '#2a1505', speed: 0.85, size: 1.10, variant: 'crown',   points: 45 },
    { name: 'Witch',    bodyColor: '#9d4edd', glowColor: '#c77dff', eyeColor: '#fff',    speed: 1.05, size: 1.05, variant: 'witch',   points: 40 },
    { name: 'Cyclops',  bodyColor: '#3ddc97', glowColor: '#3ddc97', eyeColor: '#0b0620', speed: 1.15, size: 1.02, variant: 'cyclops', points: 35 },
    { name: 'Count',    bodyColor: '#ff3355', glowColor: '#ff3355', eyeColor: '#fff',    speed: 1.25, size: 1.00, variant: 'vampire', points: 45, brows: true },
    { name: 'Reaper',   bodyColor: '#b8b8d0', glowColor: '#8f8fff', eyeColor: '#1a0b00', speed: 0.9, size: 1.12, variant: 'reaper',  points: 50, mouth: false },
    { name: 'Dapper',   bodyColor: '#6ee7ff', glowColor: '#6ee7ff', eyeColor: '#1a0b00', speed: 1.0, size: 1.00, variant: 'tophat',  points: 35 },
    { name: 'Mummy',    bodyColor: '#e8d8a8', glowColor: '#ffe9b0', eyeColor: '#3a2a10', speed: 0.75, size: 1.10, variant: 'mummy',   points: 40 },
    { name: 'Twinkle',  bodyColor: '#b388ff', glowColor: '#d4b8ff', eyeColor: '#2a1505', speed: 1.35, size: 0.92, variant: 'star',    points: 50 }
  ];

  var projectiles = [];
  var particles = [];
  var score = 0;
  var captured = 0;
  var gameActive = false;
  var animFrameId = null;
  var lastTime = 0;
  var avatarX = 50;
  var avatarY = 18;
  var keys = {};
  var uid = 0;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function svgNode(tag, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    }
    return n;
  }

  function createGhostSVG(type) {
    var variant = type.variant || 'classic';
    var base = 'gsv' + (++uid);
    var svg = svgNode('svg', { viewBox: '0 0 100 120', width: '100', height: '120', 'aria-hidden': 'true' });
    svg.style.overflow = 'visible';

    var defs = svgNode('defs');

    var bodyGrad = svgNode('radialGradient', { id: base + 'Body', cx: '50%', cy: '32%', r: '68%' });
    [
      ['0%', '#ffffff', '0.92'],
      ['38%', type.bodyColor, '0.82'],
      ['100%', type.bodyColor, '0.22']
    ].forEach(function (stop) {
      bodyGrad.appendChild(svgNode('stop', { offset: stop[0], 'stop-color': stop[1], 'stop-opacity': stop[2] }));
    });
    defs.appendChild(bodyGrad);

    var glowGrad = svgNode('radialGradient', { id: base + 'Glow', cx: '50%', cy: '50%', r: '50%' });
    glowGrad.appendChild(svgNode('stop', { offset: '0%', 'stop-color': type.glowColor, 'stop-opacity': '0.6' }));
    glowGrad.appendChild(svgNode('stop', { offset: '65%', 'stop-color': type.glowColor, 'stop-opacity': '0.14' }));
    glowGrad.appendChild(svgNode('stop', { offset: '100%', 'stop-color': type.glowColor, 'stop-opacity': '0' }));
    defs.appendChild(glowGrad);

    var blur = svgNode('filter', { id: base + 'Blur', x: '-60%', y: '-60%', width: '220%', height: '220%' });
    blur.appendChild(svgNode('feGaussianBlur', { stdDeviation: '4' }));
    defs.appendChild(blur);

    var eyeGrad = svgNode('radialGradient', { id: base + 'Eye', cx: '50%', cy: '38%', r: '70%' });
    eyeGrad.appendChild(svgNode('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': '1' }));
    eyeGrad.appendChild(svgNode('stop', { offset: '100%', 'stop-color': type.eyeColor, 'stop-opacity': '1' }));
    defs.appendChild(eyeGrad);

    var cheekGrad = svgNode('radialGradient', { id: base + 'Cheek', cx: '50%', cy: '50%', r: '50%' });
    cheekGrad.appendChild(svgNode('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': '0.42' }));
    cheekGrad.appendChild(svgNode('stop', { offset: '100%', 'stop-color': '#ffffff', 'stop-opacity': '0' }));
    defs.appendChild(cheekGrad);

    svg.appendChild(defs);

    svg.appendChild(svgNode('ellipse', {
      cx: '50', cy: '55', rx: '47', ry: '57',
      fill: 'url(#' + base + 'Glow)', filter: 'url(#' + base + 'Blur)'
    }));

    var body = svgNode('path', {
      d: 'M50 10 C75 10 90 30 90 55 L90 90 C90 95 85 100 80 95 C75 90 70 95 65 100 C60 105 55 100 50 105 C45 100 40 105 35 100 C30 95 25 90 20 95 C15 100 10 95 10 90 L10 55 C10 30 25 10 50 10 Z',
      fill: 'url(#' + base + 'Body)',
      stroke: type.bodyColor,
      'stroke-width': '1.5',
      'stroke-opacity': '0.55'
    });
    svg.appendChild(body);

    if (variant === 'mummy') {
      ['M18 55 Q50 62 82 54', 'M18 68 Q50 75 82 67', 'M20 82 Q50 89 80 81', 'M24 94 Q50 100 76 93'].forEach(function (d) {
        svg.appendChild(svgNode('path', {
          d: d, fill: 'none', stroke: '#fff8dc', 'stroke-width': '5',
          'stroke-linecap': 'round', opacity: '0.34'
        }));
      });
    }

    if (variant === 'pumpkin') {
      // Raised pumpkin ridges make the orange ghost read as a jack-o'-lantern.
      ['M30 24 Q24 58 30 96', 'M70 24 Q76 58 70 96'].forEach(function (d) {
        svg.appendChild(svgNode('path', {
          d: d, fill: 'none', stroke: '#c45f00', 'stroke-width': '1.5', opacity: '0.38'
        }));
      });
    }

    if (variant === 'vampire') {
      svg.appendChild(svgNode('path', {
        d: 'M20 23 Q27 5 50 5 Q73 5 80 23 Q65 15 50 18 Q35 15 20 23 Z',
        fill: '#1a0b00', opacity: '0.82'
      }));
    }

    if (variant === 'reaper') {
      svg.appendChild(svgNode('path', {
        d: 'M14 46 Q14 4 50 4 Q86 4 86 46 Q72 25 50 25 Q28 25 14 46 Z',
        fill: '#2a2038', opacity: '0.88'
      }));
    }

    if (variant === 'pumpkin') {
      svg.appendChild(svgNode('path', { d: 'M28 38 L42 50 L27 50 Z', fill: type.eyeColor, opacity: '0.92' }));
      svg.appendChild(svgNode('path', { d: 'M72 38 L58 50 L73 50 Z', fill: type.eyeColor, opacity: '0.92' }));
      svg.appendChild(svgNode('path', {
        d: 'M33 69 L41 61 L49 71 L57 61 L65 69 L58 81 L50 75 L42 81 Z',
        fill: type.eyeColor, opacity: '0.9'
      }));
    } else if (variant === 'cyclops') {
      svg.appendChild(svgNode('ellipse', {
        cx: '50', cy: '45', rx: '15', ry: '13', fill: 'url(#' + base + 'Eye)',
        stroke: type.eyeColor, 'stroke-width': '1', 'stroke-opacity': '0.25'
      }));
      svg.appendChild(svgNode('circle', { cx: '50', cy: '47', r: '5.5', fill: type.eyeColor }));
      svg.appendChild(svgNode('path', {
        d: 'M35 37 Q50 29 65 37', fill: 'none', stroke: type.bodyColor,
        'stroke-width': '2', 'stroke-linecap': 'round', opacity: '0.55'
      }));
      svg.appendChild(svgNode('ellipse', {
        cx: '50', cy: '72', rx: '5', ry: '6', fill: type.eyeColor, opacity: '0.72'
      }));
    } else {
      [35, 65].forEach(function (cx) {
        svg.appendChild(svgNode('ellipse', {
          cx: String(cx), cy: '45', rx: '8', ry: '10',
          fill: 'url(#' + base + 'Eye)'
        }));
        svg.appendChild(svgNode('circle', {
          cx: String(cx), cy: '47', r: '4', fill: type.eyeColor
        }));
      });
      if (type.brows) {
        svg.appendChild(svgNode('path', {
          d: 'M27 32 L42 37', fill: 'none', stroke: '#2a1505',
          'stroke-width': '2.4', 'stroke-linecap': 'round'
        }));
        svg.appendChild(svgNode('path', {
          d: 'M73 32 L58 37', fill: 'none', stroke: '#2a1505',
          'stroke-width': '2.4', 'stroke-linecap': 'round'
        }));
      }
      if (type.mouth !== false) {
        svg.appendChild(svgNode('ellipse', {
          cx: '50', cy: '70', rx: '6', ry: '8', fill: type.eyeColor, opacity: '0.78'
        }));
      }
    }

    if (variant !== 'pumpkin') {
      [25, 75].forEach(function (cx) {
        svg.appendChild(svgNode('circle', {
          cx: String(cx), cy: '58', r: '6', fill: 'url(#' + base + 'Cheek)'
        }));
      });
    }

    if (variant === 'vampire') {
      svg.appendChild(svgNode('path', { d: 'M43 77 L47 87 L50 78 Z', fill: '#fff' }));
      svg.appendChild(svgNode('path', { d: 'M57 77 L53 87 L50 78 Z', fill: '#fff' }));
      svg.appendChild(svgNode('path', { d: 'M44 87 L50 84 L56 87 L50 92 Z', fill: '#1a0b00' }));
      svg.appendChild(svgNode('circle', { cx: '50', cy: '87', r: '2.2', fill: '#ff3355' }));
    }

    if (variant === 'horns') {
      svg.appendChild(svgNode('path', {
        d: 'M29 15 Q20 3 17 -8 Q30 -2 37 12 Z',
        fill: '#6b1a1a', stroke: '#2a0606', 'stroke-width': '1'
      }));
      svg.appendChild(svgNode('path', {
        d: 'M71 15 Q80 3 83 -8 Q70 -2 63 12 Z',
        fill: '#6b1a1a', stroke: '#2a0606', 'stroke-width': '1'
      }));
    }

    if (variant === 'crown') {
      svg.appendChild(svgNode('path', {
        d: 'M35 13 L39 1 L45 9 L50 -2 L55 9 L61 1 L65 13 Z',
        fill: '#ffd166', stroke: '#b8860b', 'stroke-width': '1.2', 'stroke-linejoin': 'round'
      }));
      [[39, 6, '#ff3355'], [50, 3, '#59e6ff'], [61, 6, '#7dff6a']].forEach(function (j) {
        svg.appendChild(svgNode('circle', { cx: String(j[0]), cy: String(j[1]), r: '1.8', fill: j[2] }));
      });
    }

    if (variant === 'witch') {
      svg.appendChild(svgNode('ellipse', {
        cx: '50', cy: '13', rx: '36', ry: '7', fill: '#24103f',
        stroke: '#6d28a8', 'stroke-width': '1'
      }));
      svg.appendChild(svgNode('path', {
        d: 'M28 13 L50 -25 L72 13 Z', fill: '#3c1a66',
        stroke: '#6d28a8', 'stroke-width': '1.2', 'stroke-linejoin': 'round'
      }));
      svg.appendChild(svgNode('rect', { x: '37', y: '3', width: '26', height: '7', rx: '2', fill: '#ffd166' }));
      svg.appendChild(svgNode('path', {
        d: 'M52 -6 L54 -10 L56 -6 L60 -5 L57 -2 L57 2 L53 0 L49 2 L50 -2 L47 -5 Z',
        fill: '#ffd166', opacity: '0.9'
      }));
    }

    if (variant === 'tophat') {
      svg.appendChild(svgNode('rect', { x: '27', y: '8', width: '46', height: '6', rx: '3', fill: '#111018' }));
      svg.appendChild(svgNode('rect', { x: '34', y: '-24', width: '32', height: '31', rx: '2', fill: '#1a1a22' }));
      svg.appendChild(svgNode('rect', { x: '34', y: '-1', width: '32', height: '6', fill: '#6d28a8' }));
      svg.appendChild(svgNode('rect', { x: '38', y: '-21', width: '4', height: '22', rx: '2', fill: '#3a3a4a', opacity: '0.55' }));
    }

    if (variant === 'pumpkin') {
      svg.appendChild(svgNode('path', {
        d: 'M47 13 Q47 4 55 2 Q52 8 53 13 Z', fill: '#3c7a2d', stroke: '#24501a', 'stroke-width': '1'
      }));
      svg.appendChild(svgNode('path', {
        d: 'M55 5 Q62 2 65 7 Q59 9 55 5 Z', fill: '#4f9a3a', opacity: '0.9'
      }));
    }

    if (variant === 'star') {
      svg.appendChild(svgNode('line', {
        x1: '50', y1: '9', x2: '50', y2: '-10', stroke: '#d4b8ff', 'stroke-width': '2'
      }));
      svg.appendChild(svgNode('path', {
        d: 'M50 -23 L53 -15 L62 -14 L55 -8 L57 1 L50 -4 L43 1 L45 -8 L38 -14 L47 -15 Z',
        fill: '#ffe08a', opacity: '0.95'
      }));
      [[20, 28, 2], [82, 22, 1.5], [78, 78, 1.8]].forEach(function (sp) {
        svg.appendChild(svgNode('circle', {
          cx: String(sp[0]), cy: String(sp[1]), r: String(sp[2]), fill: '#f5e9ff', opacity: '0.8'
        }));
      });
    }

    return svg;
  }

  function createTreeSVG(x, z, scale, tall) {
    var tree = el('div', 'gs-tree');
    tree.style.left = x + '%';
    tree.style.bottom = z + '%';
    tree.style.transform = 'scale(' + scale + ')';

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', tall ? '0 0 80 240' : '0 0 80 160');
    svg.setAttribute('width', '80');
    svg.setAttribute('height', tall ? '240' : '160');

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

    var trunkH = tall ? 240 : 160;
    var trunk = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    trunk.setAttribute('d', tall
      ? 'M33 240 L37 160 L35 120 L39 80 L43 120 L41 160 L45 240 Z'
      : 'M35 160 L38 100 L36 80 L40 60 L44 80 L42 100 L45 160 Z');
    trunk.setAttribute('fill', 'url(#trunkGrad' + x + z + ')');
    svg.appendChild(trunk);

    if (tall) {
      var branch1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      branch1.setAttribute('d', 'M37 140 Q20 130 10 110');
      branch1.setAttribute('fill', 'none');
      branch1.setAttribute('stroke', '#3d2314');
      branch1.setAttribute('stroke-width', '4');
      branch1.setAttribute('stroke-linecap', 'round');
      svg.appendChild(branch1);

      var branch2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      branch2.setAttribute('d', 'M41 120 Q60 110 70 90');
      branch2.setAttribute('fill', 'none');
      branch2.setAttribute('stroke', '#3d2314');
      branch2.setAttribute('stroke-width', '3');
      branch2.setAttribute('stroke-linecap', 'round');
      svg.appendChild(branch2);

      var foliage1 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      foliage1.setAttribute('cx', '40');
      foliage1.setAttribute('cy', '50');
      foliage1.setAttribute('rx', '38');
      foliage1.setAttribute('ry', '50');
      foliage1.setAttribute('fill', 'url(#leafGrad' + x + z + ')');
      svg.appendChild(foliage1);

      var foliage2 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      foliage2.setAttribute('cx', '20');
      foliage2.setAttribute('cy', '80');
      foliage2.setAttribute('rx', '28');
      foliage2.setAttribute('ry', '35');
      foliage2.setAttribute('fill', 'url(#leafGrad' + x + z + ')');
      foliage2.setAttribute('opacity', '0.8');
      svg.appendChild(foliage2);

      var foliage3 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      foliage3.setAttribute('cx', '60');
      foliage3.setAttribute('cy', '75');
      foliage3.setAttribute('rx', '26');
      foliage3.setAttribute('ry', '32');
      foliage3.setAttribute('fill', 'url(#leafGrad' + x + z + ')');
      foliage3.setAttribute('opacity', '0.8');
      svg.appendChild(foliage3);

      var foliage4 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      foliage4.setAttribute('cx', '40');
      foliage4.setAttribute('cy', '25');
      foliage4.setAttribute('rx', '30');
      foliage4.setAttribute('ry', '35');
      foliage4.setAttribute('fill', 'url(#leafGrad' + x + z + ')');
      foliage4.setAttribute('opacity', '0.9');
      svg.appendChild(foliage4);
    } else {
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
    }

    tree.appendChild(svg);
    return tree;
  }

  function createTombstoneSVG(x, z, scale) {
    var tomb = el('div', 'gs-tombstone');
    tomb.style.left = x + '%';
    tomb.style.bottom = z + '%';
    tomb.style.transform = 'scale(' + scale + ')';

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 60 80');
    svg.setAttribute('width', '60');
    svg.setAttribute('height', '80');

    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    var stoneGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    stoneGrad.setAttribute('id', 'stoneGrad' + x + z);
    stoneGrad.setAttribute('x1', '0%');
    stoneGrad.setAttribute('y1', '0%');
    stoneGrad.setAttribute('x2', '100%');
    stoneGrad.setAttribute('y2', '100%');
    var sStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    sStop1.setAttribute('offset', '0%');
    sStop1.setAttribute('stop-color', '#8a8a9a');
    var sStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    sStop2.setAttribute('offset', '50%');
    sStop2.setAttribute('stop-color', '#6a6a7a');
    var sStop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    sStop3.setAttribute('offset', '100%');
    sStop3.setAttribute('stop-color', '#4a4a5a');
    stoneGrad.appendChild(sStop1);
    stoneGrad.appendChild(sStop2);
    stoneGrad.appendChild(sStop3);
    defs.appendChild(stoneGrad);

    svg.appendChild(defs);

    var base = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    base.setAttribute('x', '5');
    base.setAttribute('y', '70');
    base.setAttribute('width', '50');
    base.setAttribute('height', '8');
    base.setAttribute('rx', '2');
    base.setAttribute('fill', '#3a3a4a');
    svg.appendChild(base);

    var stone = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    stone.setAttribute('d', 'M10 70 L10 25 Q10 5 30 5 Q50 5 50 25 L50 70 Z');
    stone.setAttribute('fill', 'url(#stoneGrad' + x + z + ')');
    stone.setAttribute('stroke', '#5a5a6a');
    stone.setAttribute('stroke-width', '1');
    svg.appendChild(stone);

    var crack1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    crack1.setAttribute('d', 'M25 15 L28 25 L24 35 L27 45');
    crack1.setAttribute('fill', 'none');
    crack1.setAttribute('stroke', '#3a3a4a');
    crack1.setAttribute('stroke-width', '1');
    crack1.setAttribute('opacity', '0.6');
    svg.appendChild(crack1);

    var crack2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    crack2.setAttribute('d', 'M35 20 L33 30 L36 40');
    crack2.setAttribute('fill', 'none');
    crack2.setAttribute('stroke', '#3a3a4a');
    crack2.setAttribute('stroke-width', '0.8');
    crack2.setAttribute('opacity', '0.5');
    svg.appendChild(crack2);

    var rip = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    rip.setAttribute('x', '30');
    rip.setAttribute('y', '40');
    rip.setAttribute('text-anchor', 'middle');
    rip.setAttribute('fill', '#3a3a4a');
    rip.setAttribute('font-size', '10');
    rip.setAttribute('font-family', 'serif');
    rip.setAttribute('opacity', '0.7');
    rip.textContent = 'RIP';
    svg.appendChild(rip);

    var cross1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    cross1.setAttribute('x', '28');
    cross1.setAttribute('y', '48');
    cross1.setAttribute('width', '4');
    cross1.setAttribute('height', '16');
    cross1.setAttribute('rx', '1');
    cross1.setAttribute('fill', '#3a3a4a');
    cross1.setAttribute('opacity', '0.5');
    svg.appendChild(cross1);

    var cross2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    cross2.setAttribute('x', '24');
    cross2.setAttribute('y', '52');
    cross2.setAttribute('width', '12');
    cross2.setAttribute('height', '4');
    cross2.setAttribute('rx', '1');
    cross2.setAttribute('fill', '#3a3a4a');
    cross2.setAttribute('opacity', '0.5');
    svg.appendChild(cross2);

    var moss = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    moss.setAttribute('cx', '15');
    moss.setAttribute('cy', '68');
    moss.setAttribute('rx', '8');
    moss.setAttribute('ry', '4');
    moss.setAttribute('fill', '#2d5a1e');
    moss.setAttribute('opacity', '0.4');
    svg.appendChild(moss);

    var moss2 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    moss2.setAttribute('cx', '45');
    moss2.setAttribute('cy', '69');
    moss2.setAttribute('rx', '6');
    moss2.setAttribute('ry', '3');
    moss2.setAttribute('fill', '#2d5a1e');
    moss2.setAttribute('opacity', '0.3');
    svg.appendChild(moss2);

    tomb.appendChild(svg);
    return tomb;
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

  function spawnGhost() {
    var type = GHOST_TYPES[(Math.random() * GHOST_TYPES.length) | 0];
    var ghost = el('div', 'gs-ghost');
    var svg = createGhostSVG(type);
    ghost.appendChild(svg);
    ghost.style.left = (8 + Math.random() * 64) + '%';
    ghost.style.top = (6 + Math.random() * 42) + '%';
    ghost.style.setProperty('--ghost-speed', type.speed);
    ghost.style.setProperty('--ghost-scale', type.size);
    ghost.style.setProperty('--ghost-glow', type.glowColor);
    ghost.dataset.hp = type.hp || 3;
    ghost.dataset.points = type.points || 25;
    ghost.dataset.name = type.name;
    ghost.title = type.name + ' · ' + (type.points || 25) + ' pts';
    ghost.setAttribute('aria-label', type.name + ' ghost');
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

  function showScorePop(x, y, pts) {
    var arena = document.getElementById('gs-arena');
    if (!arena) return;
    var pop = el('div', 'gs-score-pop', '+' + pts);
    pop.style.left = x + 'px';
    pop.style.top = y + 'px';
    arena.appendChild(pop);
    setTimeout(function () {
      if (pop.parentNode) pop.parentNode.removeChild(pop);
    }, 750);
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
            var pts = parseInt(g.dataset.points || '25', 10);
            score += pts;
            captured++;
            showScorePop(p.x, p.y, pts);
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
      avatarY += moveSpeed;
      moved = true;
    }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) {
      avatarY -= moveSpeed;
      moved = true;
    }

    if (avatarX < 5) avatarX = 5;
    if (avatarX > 85) avatarX = 85;
    if (avatarY < 8) avatarY = 8;
    if (avatarY > 42) avatarY = 42;

    avatar.style.left = avatarX + '%';
    avatar.style.bottom = avatarY + '%';

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
    avatarY = 18;
    gameActive = true;
    lastTime = 0;

    var scoreEl = el('div', 'gs-score-board', 'Score: <span id="gs-score">0</span> · Captured: <span id="gs-captured">0</span>');
    arena.appendChild(scoreEl);

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
      { x: 3, z: 10, s: 1.8, tall: true }, { x: 12, z: 25, s: 0.6 }, { x: 22, z: 8, s: 2.0, tall: true },
      { x: 32, z: 30, s: 0.5 }, { x: 42, z: 12, s: 1.6, tall: true }, { x: 52, z: 28, s: 0.7 },
      { x: 62, z: 6, s: 2.2, tall: true }, { x: 72, z: 32, s: 0.55 }, { x: 82, z: 10, s: 1.9, tall: true },
      { x: 8, z: 50, s: 0.65 }, { x: 18, z: 65, s: 1.4, tall: true }, { x: 28, z: 45, s: 0.5 },
      { x: 38, z: 70, s: 0.75 }, { x: 48, z: 50, s: 1.7, tall: true }, { x: 58, z: 68, s: 0.6 },
      { x: 68, z: 42, s: 0.55 }, { x: 78, z: 72, s: 1.5, tall: true }, { x: 88, z: 48, s: 0.7 },
      { x: 5, z: 85, s: 1.3, tall: true }, { x: 15, z: 90, s: 0.5 }, { x: 25, z: 82, s: 1.8, tall: true },
      { x: 35, z: 88, s: 0.65 }, { x: 45, z: 80, s: 0.55 }, { x: 55, z: 92, s: 1.6, tall: true },
      { x: 65, z: 78, s: 0.7 }, { x: 75, z: 88, s: 0.5 }, { x: 85, z: 82, s: 1.4, tall: true }
    ];
    trees.forEach(function (t) {
      scene.appendChild(createTreeSVG(t.x, t.z, t.s, t.tall));
    });

    var tombstones = [
      { x: 10, z: 38, s: 0.9 }, { x: 30, z: 52, s: 1.1 }, { x: 50, z: 35, s: 0.8 },
      { x: 70, z: 55, s: 1.0 }, { x: 88, z: 30, s: 0.85 }, { x: 20, z: 70, s: 1.2 },
      { x: 60, z: 72, s: 0.95 }, { x: 40, z: 65, s: 1.05 }
    ];
    tombstones.forEach(function (t) {
      scene.appendChild(createTombstoneSVG(t.x, t.z, t.s));
    });

    for (var i = 0; i < 8; i++) {
      scene.appendChild(spawnGhost());
    }

    var avatar = buildAvatar();
    scene.appendChild(avatar);

    var shootBtn = el('button', 'gs-shoot-btn', '🔵 SHOOT ORB');
    shootBtn.onclick = shoot;
    arena.appendChild(shootBtn);

    var spawnBtn = el('button', 'gs-spawn-btn', '👻 +Ghost');
    spawnBtn.onclick = function () {
      if (scene.querySelectorAll('.gs-ghost').length < 18) {
        scene.appendChild(spawnGhost());
      }
    };
    arena.appendChild(spawnBtn);

    var help = el('div', 'gs-help', 'WASD / Arrows to move · SPACE to shoot orbs');
    arena.appendChild(help);

    animFrameId = requestAnimationFrame(gameLoop);
  }

  function stopGame() {
    gameActive = false;
    keys = {};
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  function build(box) {
    var head = el('div', 'phead', '<h2>👻 Spooky Ghost Shooter</h2><div class="psub">A 2D haunted forest full of glowing ghost varieties. Move, aim, and fire blue orbs!</div>');
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

    return box;
  }

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

  // The host Tabs component supplies the Back to Maze button. Stop the
  // animation whenever the user leaves the panel so it cannot keep running
  // invisibly in the background.
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var b = t.closest('button');
    if (t.closest('.tabbtn') || t.closest('.panel-close') ||
        (b && b.textContent.indexOf('Back to Maze') >= 0)) stopGame();
  }, true);

  window.SpookyGhostShooter = { build: build, start: startGame, stop: stopGame };
})();
