import { test } from 'node:test';
import assert from 'node:assert/strict';

import { leggiIstanteSimulato } from '../src/orologio.js';

test("una data-ora ISO con offset o Z è valida e indica l'istante giusto", () => {
  assert.equal(leggiIstanteSimulato('2026-11-28T20:00:00+01:00'), Date.UTC(2026, 10, 28, 19, 0, 0));
  assert.equal(leggiIstanteSimulato('2026-11-28T19:00:00Z'), Date.UTC(2026, 10, 28, 19, 0, 0));
  assert.equal(leggiIstanteSimulato('2026-11-28T20:00+01:00'), Date.UTC(2026, 10, 28, 19, 0, 0));
});

test('una data-ora ISO senza offset è valida (ora locale del browser)', () => {
  assert.equal(leggiIstanteSimulato('2026-11-28T20:00:00'), new Date(2026, 10, 28, 20, 0, 0).getTime());
});

test('una sola data ISO è valida', () => {
  assert.equal(leggiIstanteSimulato('2026-11-28'), Date.UTC(2026, 10, 28));
});

test('tutto ciò che non è una data ISO viene ignorato', () => {
  for (const valore of ['1', '2026', '2026-11', 'Nov 28 2026', '28/11/2026', 'garbage', '', ' ', '2026-13-45', '2026-11-28T25:00:00']) {
    assert.equal(leggiIstanteSimulato(valore), undefined, `"${valore}" dovrebbe essere ignorato`);
  }
});

test('un parametro assente (null) viene ignorato', () => {
  assert.equal(leggiIstanteSimulato(null), undefined);
});
