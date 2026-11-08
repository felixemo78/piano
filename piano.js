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

function noteFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

if (typeof module !== 'undefined') {
  module.exports = { NOTES, ENVELOPE, noteFrequency };
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
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = noteFrequency(midi);
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(ENVELOPE.peak, t + ENVELOPE.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + ENVELOPE.attack + ENVELOPE.release);
    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + ENVELOPE.attack + ENVELOPE.release + 0.1);
  }

  function init() {
    const keys = document.getElementById('keys');
    NOTES.forEach((note, i) => {
      const key = document.createElement('button');
      key.className = 'key';
      key.style.background = note.color;
      key.textContent = note.emoji;
      key.setAttribute('aria-label', 'note ' + (i + 1));
      key.addEventListener('pointerdown', e => {
        e.preventDefault();
        playNote(note.midi);
        key.classList.add('pressed');
      });
      const release = () => key.classList.remove('pressed');
      key.addEventListener('pointerup', release);
      key.addEventListener('pointercancel', release);
      key.addEventListener('pointerleave', release);
      keys.appendChild(key);
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
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
