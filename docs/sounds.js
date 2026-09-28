/* SpookySfx — one shared procedural sound engine for every game on the site.
 * Zero assets: all sounds synthesized with Web Audio (oscillators + noise).
 * Autoplay-safe: the context resumes on first pointer/key interaction.
 * Mute persisted; floating toggle button injected on every page.
 * Usage: SpookySfx.play('pickup') — unknown names are ignored silently.
 */
(function () {
  'use strict';
  var ctx = null, master = null, muted = false;
  try { muted = localStorage.getItem('spooky_mute') === '1'; } catch (e) {}

  function ac() {
    if (ctx) {
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
      return ctx;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return ctx;
    } catch (e) { return null; }
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (muted) return;
    var c = ac();
    if (!c) return;
    try {
      var t0 = c.currentTime + (delay || 0);
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.1, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(master);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) {}
  }

  function noise(dur, vol, lowpass, delay) {
    if (muted) return;
    var c = ac();
    if (!c) return;
    try {
      var t0 = c.currentTime + (delay || 0);
      var len = Math.max(1, Math.floor(c.sampleRate * dur));
      var buf = c.createBuffer(1, len, c.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = c.createBufferSource();
      src.buffer = buf;
      var f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass || 1200;
      var g = c.createGain();
      g.gain.value = vol || 0.12;
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t0);
    } catch (e) {}
  }

  var RECIPES = {
    click: function () { tone(800, 0.07, 'square', 0.06); },
    tab: function () { tone(520, 0.06, 'triangle', 0.07); tone(780, 0.07, 'triangle', 0.06, null, 0.05); },
    pickup: function () { tone(660, 0.09, 'sine', 0.1, 990); },
    crystal: function () { tone(880, 0.1, 'sine', 0.09); tone(1174, 0.12, 'sine', 0.09, null, 0.08); tone(1568, 0.14, 'sine', 0.07, null, 0.16); },
    coin: function () { tone(988, 0.07, 'square', 0.06); tone(1319, 0.12, 'square', 0.05, null, 0.06); },
    swing: function () { noise(0.08, 0.05, 900); },
    break: function () { noise(0.16, 0.14, 700); tone(140, 0.12, 'triangle', 0.08, 60); },
    splash: function () { noise(0.2, 0.1, 1600); tone(500, 0.15, 'sine', 0.06, 900); },
    zap: function () { tone(1200, 0.14, 'sawtooth', 0.07, 200); },
    hurt: function () { tone(180, 0.22, 'sawtooth', 0.1, 70); },
    die: function () { tone(300, 0.4, 'sawtooth', 0.1, 50); noise(0.3, 0.08, 500, 0.1); },
    win: function () { tone(523, 0.12, 'triangle', 0.1); tone(659, 0.12, 'triangle', 0.1, null, 0.1); tone(784, 0.12, 'triangle', 0.1, null, 0.2); tone(1046, 0.25, 'triangle', 0.1, null, 0.3); },
    levelup: function () { tone(440, 0.1, 'square', 0.07); tone(554, 0.1, 'square', 0.07, null, 0.09); tone(659, 0.1, 'square', 0.07, null, 0.18); tone(880, 0.2, 'square', 0.07, null, 0.27); },
    buy: function () { tone(740, 0.08, 'square', 0.07); tone(1108, 0.14, 'square', 0.06, null, 0.07); },
    sell: function () { tone(880, 0.08, 'square', 0.06); tone(1174, 0.08, 'square', 0.06, null, 0.07); tone(1568, 0.16, 'square', 0.05, null, 0.14); },
    portal: function () { tone(200, 0.35, 'sine', 0.09, 1200); tone(400, 0.3, 'triangle', 0.06, 1600, 0.08); },
    objective: function () { tone(659, 0.1, 'triangle', 0.09); tone(988, 0.18, 'triangle', 0.09, null, 0.1); },
    heal: function () { tone(420, 0.12, 'sine', 0.08, 700); },
    toast: function () { tone(700, 0.08, 'sine', 0.06, 1050); }
  };

  function play(name) {
    var fn = RECIPES[name];
    if (fn) { try { fn(); } catch (e) {} }
  }

  function toggle() {
    muted = !muted;
    try { localStorage.setItem('spooky_mute', muted ? '1' : '0'); } catch (e) {}
    paint();
    return muted;
  }

  var btnEl = null;
  function paint() {
    if (btnEl) btnEl.textContent = muted ? '🔇' : '🔊';
  }

  function init() {
    try {
      var unlock = function () { ac(); };
      document.addEventListener('pointerdown', unlock, { once: true });
      document.addEventListener('keydown', unlock, { once: true });
      btnEl = document.createElement('button');
      btnEl.title = 'Sound on/off';
      btnEl.style.cssText = 'position:fixed;top:10px;right:10px;z-index:200;font-size:1.1rem;' +
        'background:#1a1038;color:#ffd166;border:1px solid #6d28a8;border-radius:8px;padding:4px 8px;cursor:pointer;';
      btnEl.onclick = function () { toggle(); };
      paint();
      document.body.appendChild(btnEl);
    } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.SpookySfx = { play: play, toggle: toggle, isMuted: function () { return muted; } };
})();
