import { test } from 'node:test';
import assert from 'node:assert/strict';

import { config } from '../src/config.js';

const ISO_CON_OFFSET_ROMA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?\+0[12]:00$/;

function istante(iso) {
  const ms = Date.parse(iso);
  assert.ok(!Number.isNaN(ms), `data non valida: ${iso}`);
  return ms;
}

test('la data della cena è un solo campo con offset Europe/Rome', () => {
  assert.match(config.cena, ISO_CON_OFFSET_ROMA);
  istante(config.cena);
});

test("l'Apertura e lo Sblocco del Menù sono giorni prima della cena, interi, e non date assolute", () => {
  assert.deepEqual(config.apertura, { giorniPrima: 7 });
  assert.deepEqual(config.menu.sblocco, { giorniPrima: 3 });
});

/** Offset reale di Europe/Rome (es. "+01:00") nell'istante dato, calcolato da Intl. */
function offsetRoma(ms) {
  const parti = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(ms));
  const v = Object.fromEntries(parti.map((p) => [p.type, Number(p.value)]));
  const comeUtc = Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second);
  const minuti = Math.round((comeUtc - Math.floor(ms / 1000) * 1000) / 60000);
  const segno = minuti >= 0 ? '+' : '-';
  const ore = String(Math.floor(Math.abs(minuti) / 60)).padStart(2, '0');
  const min = String(Math.abs(minuti) % 60).padStart(2, '0');
  return `${segno}${ore}:${min}`;
}

test("la cena in config ha l'offset Europe/Rome corretto per quella data", () => {
  const scritto = config.cena.slice(-6);
  assert.equal(scritto, offsetRoma(istante(config.cena)), `cena: offset ${scritto} sbagliato per ${config.cena}`);
});

test('ogni Invitato ha un nome e un Messaggio personalizzato', () => {
  assert.ok(config.invitati.length > 0, 'serve almeno un Invitato');
  for (const invitato of config.invitati) {
    assert.ok(invitato.nome.trim().length > 0);
    assert.ok(invitato.messaggio.trim().length > 0);
  }
});

test('il messaggio di rifiuto è fisso e il messaggio finale è "Si mangia!"', () => {
  assert.ok(config.messaggioRifiuto.trim().length > 0);
  assert.equal(config.messaggioFinale, 'Si mangia!');
});

/** Tutte le stringhe della configurazione, a qualunque profondità, con chiavi e valori. */
function tutteLeStringhe(valore, fuori = []) {
  if (typeof valore === 'string') fuori.push(valore);
  else if (valore && typeof valore === 'object') {
    for (const [chiave, v] of Object.entries(valore)) {
      fuori.push(chiave);
      tutteLeStringhe(v, fuori);
    }
  }
  return fuori;
}

test('nessun testo né chiave della configurazione contiene SEGNAPOSTO, e il flag segnaposto non esiste', () => {
  for (const testo of tutteLeStringhe(config)) {
    assert.ok(!/segnaposto/i.test(testo), `segnaposto rimasto: "${testo}"`);
  }
  assert.equal('segnaposto' in config, false);
});

test('il campo curiosita non esiste più in configurazione', () => {
  assert.equal('curiosita' in config, false);
});

test('ogni sezione del Menù reale ha un titolo e voci non vuote', () => {
  assert.ok(config.menu.contenuto.length > 0);
  for (const { titolo, voci } of config.menu.contenuto) {
    assert.ok(titolo.trim().length > 0);
    assert.ok(voci.length > 0 && voci.every((v) => v.trim().length > 0));
  }
});
