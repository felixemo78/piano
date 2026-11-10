// Toddler piano — pure data + math (works in Node and the browser).
const NOTES = [
  { midi: 60, color: '#FF595E', emoji: '🐶' },
  { midi: 62, color: '#FF924C', emoji: '🐱' },
  { midi: 64, color: '#FFCA3A', emoji: '🐰' },
  { midi: 65, color: '#8AC926', emoji: '🐸' },
  { midi: 67, color: '#1982C4', emoji: '🐵' },
  { midi: 69, color: '#6A4C93', emoji: '🐻' },
  { midi: 71, color: '#FF70A6', emoji: '🐥' },
  { midi: 72, color: '#3EC1D3', emoji: '🐳' },
];

const ENVELOPE = { peak: 0.3, attack: 0.01, release: 1.2 };
const SPARKLES = ['⭐', '✨', '🎵', '💖', '🌈'];
const MAX_SPARKLES = 60; // keeps mashing from flooding the page

function noteFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Lock (full screen + screen stays on) only on a phone/tablet held sideways.
function shouldLock(isMobile, isLandscape) {
  return isMobile && isLandscape;
}

if (typeof module !== 'undefined') {
  module.exports = { NOTES, ENVELOPE, noteFrequency, shouldLock };
}

// --- Browser wiring (runs only in a page) ---
if (typeof document !== 'undefined') {
  let audio = null;
  function getAudio() {
    if (!audio) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const out = ctx.createDynamicsCompressor();
      out.connect(ctx.destination);
      audio = { ctx, out };
    }
    audio.ctx.resume();
    return audio;
  }

  function playNote(midi) {
    const { ctx, out } = getAudio();
    const t = ctx.currentTime;
    const end = t + ENVELOPE.attack + ENVELOPE.release;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(ENVELOPE.peak, t + ENVELOPE.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    gain.connect(out);
    // Main tone plus a quiet octave above it gives a soft bell sound.
    [[1, 'triangle', 0.8], [2, 'sine', 0.2]].forEach(([mult, type, level]) => {
      const osc = ctx.createOscillator();
      const part = ctx.createGain();
      osc.type = type;
      osc.frequency.value = noteFrequency(midi) * mult;
      part.gain.value = level;
      osc.connect(part);
      part.connect(gain);
      osc.start(t);
      osc.stop(end + 0.1);
    });
  }

  function sparkle(x, y, emoji) {
    if (document.querySelectorAll('.fx').length >= MAX_SPARKLES) return;
    for (let i = 0; i < 6; i++) {
      const s = document.createElement('span');
      s.className = 'fx';
      s.textContent = i === 0 ? emoji : SPARKLES[Math.floor(Math.random() * SPARKLES.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 90;
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(angle) * dist - 60 + 'px');
      s.style.setProperty('--rot', Math.random() * 360 - 180 + 'deg');
      setTimeout(() => s.remove(), 1000); // timer, not animationend: that never fires with reduced motion
      document.body.appendChild(s);
    }
  }

  const mobile = window.matchMedia('(pointer: coarse)');
  const landscape = window.matchMedia('(orientation: landscape)');
  let wake = null;

  // Must run inside a tap: browsers only allow full screen from a user gesture.
  function lock() {
    if (!shouldLock(mobile.matches, landscape.matches)) return;
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    }
    if (!wake && navigator.wakeLock) {
      navigator.wakeLock.request('screen').then(w => {
        wake = w;
        w.addEventListener('release', () => { wake = null; });
      }).catch(() => {});
    }
    document.body.classList.add('locked');
  }

  function unlock() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (wake) wake.release();
    document.body.classList.remove('locked');
  }

  function init() {
    const keys = document.getElementById('keys');
    NOTES.forEach((note, i) => {
      const key = document.createElement('button');
      key.className = 'key';
      key.style.setProperty('--c', note.color);
      key.setAttribute('aria-label', 'note ' + (i + 1));
      const face = document.createElement('span');
      face.className = 'face';
      face.textContent = note.emoji;
      key.appendChild(face);
      key.addEventListener('pointerdown', e => {
        e.preventDefault();
        lock();
        playNote(note.midi);
        key.classList.add('pressed');
        const r = key.getBoundingClientRect();
        sparkle(e.clientX || r.left + r.width / 2, e.clientY || r.top + r.height / 2, note.emoji);
      });
      const release = () => key.classList.remove('pressed');
      key.addEventListener('pointerup', release);
      key.addEventListener('pointercancel', release);
      key.addEventListener('pointerleave', release);
      keys.appendChild(key);
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
    // Turning the phone upright undoes the lock.
    landscape.addEventListener('change', () => {
      if (!shouldLock(mobile.matches, landscape.matches)) unlock();
    });
  }

  // Expose for in-browser checks.
  window.getAudio = getAudio;
  window.playNote = playNote;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
