import assert from 'node:assert/strict';
import test from 'node:test';
import { elegirMimeGrabacion, extensionAudio, verificarAudioGrabado, MAX_BYTES_AUDIO_IA } from '../../src/features/pa03-asistencia-generacion-automatica/cu12-conversaciones-ia/helpers/audio-ia.helpers.ts';

test('CU09 voz: formato preferido para navegador con WebM', () => {
  assert.equal(elegirMimeGrabacion((tipo) => tipo === 'audio/webm;codecs=opus'), 'audio/webm;codecs=opus');
});
test('CU09 voz: formato alternativo M4A y ausencia de soporte', () => {
  assert.equal(elegirMimeGrabacion((tipo) => tipo === 'audio/mp4'), 'audio/mp4');
  assert.equal(elegirMimeGrabacion(() => false), null);
});
test('CU09 voz: determina extensión sin interpretar parámetros de códec', () => {
  assert.equal(extensionAudio('audio/webm;codecs=opus'), 'webm');
  assert.equal(extensionAudio('audio/mp4'), 'm4a');
  assert.equal(extensionAudio('application/json'), null);
});
test('CU09 voz: rechaza audio vacío, formatos no válidos y archivos grandes', () => {
  assert.equal(verificarAudioGrabado('audio/webm;codecs=opus', 50), 'webm');
  assert.throws(() => verificarAudioGrabado('audio/webm', 0));
  assert.throws(() => verificarAudioGrabado('video/webm', 100));
  assert.throws(() => verificarAudioGrabado('audio/webm', MAX_BYTES_AUDIO_IA + 1));
});
