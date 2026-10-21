import { test } from 'node:test';
import assert from 'node:assert/strict';

import { creaMemoria } from '../src/memoria.js';

/** Uno storage finto con la stessa interfaccia di localStorage. */
function storageFinto() {
  const dati = new Map();
  return {
    getItem: (chiave) => (dati.has(chiave) ? dati.get(chiave) : null),
    setItem: (chiave, valore) => dati.set(chiave, String(valore)),
    removeItem: (chiave) => dati.delete(chiave),
  };
}

test("il nome salvato si rilegge, e dimenticato non c'è più", () => {
  const storage = storageFinto();
  const m = creaMemoria(() => storage);
  assert.equal(m.leggi(), undefined);
  m.salva('Mario Rossi');
  assert.equal(m.leggi(), 'Mario Rossi');
  assert.equal(creaMemoria(() => storage).leggi(), 'Mario Rossi');
  m.dimentica();
  assert.equal(m.leggi(), undefined);
});

test('con lo storage bloccato (accesso che lancia) la memoria non si rompe', () => {
  const m = creaMemoria(() => {
    throw new Error('SecurityError');
  });
  assert.equal(m.leggi(), undefined);
  assert.doesNotThrow(() => m.salva('Mario Rossi'));
  assert.doesNotThrow(() => m.dimentica());
});

test('con lo storage che lancia in lettura e scrittura la memoria non si rompe', () => {
  const rotto = () => {
    throw new Error('QuotaExceededError');
  };
  const m = creaMemoria(() => ({ getItem: rotto, setItem: rotto, removeItem: rotto }));
  assert.equal(m.leggi(), undefined);
  assert.doesNotThrow(() => m.salva('Mario Rossi'));
  assert.doesNotThrow(() => m.dimentica());
});

test('uno storage assente (undefined) funziona senza memoria', () => {
  const m = creaMemoria(() => undefined);
  assert.equal(m.leggi(), undefined);
  assert.doesNotThrow(() => m.salva('Mario Rossi'));
});
