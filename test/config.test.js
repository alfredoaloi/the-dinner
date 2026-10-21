import { test } from 'node:test';
import assert from 'node:assert/strict';

import { config } from '../src/config.js';

const ISO_CON_OFFSET_ROMA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?\+0[12]:00$/;
const DUE_SETTIMANE_MS = 14 * 24 * 3600 * 1000;
const UNA_SETTIMANA_MS = 7 * 24 * 3600 * 1000;

function istante(iso) {
  const ms = Date.parse(iso);
  assert.ok(!Number.isNaN(ms), `data non valida: ${iso}`);
  return ms;
}

test('la data della cena è un solo campo con offset Europe/Rome', () => {
  assert.match(config.cena, ISO_CON_OFFSET_ROMA);
  istante(config.cena);
});

test("l'Invito si apre due settimane prima della cena", () => {
  assert.match(config.apertura, ISO_CON_OFFSET_ROMA);
  assert.equal(istante(config.cena) - istante(config.apertura), DUE_SETTIMANE_MS);
});

test('il Menù si sblocca una settimana prima della cena', () => {
  assert.match(config.menu.sblocco, ISO_CON_OFFSET_ROMA);
  assert.equal(istante(config.cena) - istante(config.menu.sblocco), UNA_SETTIMANA_MS);
  assert.ok(config.menu.contenuto.trim().length > 0);
});

test('ogni Invitato ha un nome e un Messaggio personalizzato', () => {
  assert.ok(config.invitati.length > 0);
  for (const invitato of config.invitati) {
    assert.ok(invitato.nome.trim().length > 0);
    assert.ok(invitato.messaggio.trim().length > 0);
  }
});

test('ogni Curiosità ha un testo e una data di sblocco esplicita tra apertura e cena', () => {
  assert.ok(config.curiosita.length > 0);
  for (const curiosita of config.curiosita) {
    assert.ok(curiosita.testo.trim().length > 0);
    assert.match(curiosita.sblocco, ISO_CON_OFFSET_ROMA);
    const quando = istante(curiosita.sblocco);
    assert.ok(quando >= istante(config.apertura), "sblocco prima dell'apertura");
    assert.ok(quando < istante(config.cena), 'sblocco dopo la cena');
  }
});

test('il messaggio di rifiuto è fisso e il messaggio finale è "Si mangia!"', () => {
  assert.ok(config.messaggioRifiuto.trim().length > 0);
  assert.equal(config.messaggioFinale, 'Si mangia!');
});

test('i contenuti segnaposto sono marcati', () => {
  assert.equal(config.segnaposto, true);
});
