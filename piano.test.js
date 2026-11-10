const test = require('node:test');
const assert = require('node:assert');
const { NOTES, ENVELOPE, noteFrequency, shouldLock } = require('./piano.js');

test('noteFrequency matches standard tuning', () => {
  assert.ok(Math.abs(noteFrequency(69) - 440) < 0.01);
  assert.ok(Math.abs(noteFrequency(60) - 261.63) < 0.01);
  assert.ok(Math.abs(noteFrequency(72) - 523.25) < 0.01);
});

test('NOTES is one C major octave with unique colors and pictures', () => {
  assert.deepStrictEqual(NOTES.map(n => n.midi), [60, 62, 64, 65, 67, 69, 71, 72]);
  assert.strictEqual(new Set(NOTES.map(n => n.color)).size, 8);
  assert.strictEqual(new Set(NOTES.map(n => n.emoji)).size, 8);
});

test('ENVELOPE keeps volume gentle and notes short', () => {
  assert.ok(ENVELOPE.peak <= 0.3);
  assert.ok(ENVELOPE.attack + ENVELOPE.release <= 1.5);
});

test('locks only on a mobile device held sideways', () => {
  assert.strictEqual(shouldLock(true, true), true);
  assert.strictEqual(shouldLock(true, false), false);
  assert.strictEqual(shouldLock(false, true), false);
});
