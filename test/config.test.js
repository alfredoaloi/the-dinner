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

test("ogni istante in config ha l'offset Europe/Rome corretto per quella data", () => {
  const istanti = {
    cena: config.cena,
    apertura: config.apertura,
    'menu.sblocco': config.menu.sblocco,
    ...Object.fromEntries(config.curiosita.map((c, i) => [`curiosita[${i}].sblocco`, c.sblocco])),
  };
  for (const [nome, iso] of Object.entries(istanti)) {
    const scritto = iso.slice(-6);
    assert.equal(scritto, offsetRoma(istante(iso)), `${nome}: offset ${scritto} sbagliato per ${iso}`);
  }
});

test('ogni Invitato ha un nome e un Messaggio personalizzato', () => {
  assert.ok(config.invitati.length > 0, 'serve almeno un Invitato');
  for (const invitato of config.invitati) {
    assert.ok(invitato.nome.trim().length > 0);
    assert.ok(invitato.messaggio.trim().length > 0);
  }
});

test('ogni Curiosità ha un testo e una data di sblocco esplicita tra apertura e cena', () => {
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

test('i testi hanno il marcatore SEGNAPOSTO se e solo se config.segnaposto è true', () => {
  const testi = [
    ...config.invitati.map((i) => i.messaggio),
    ...config.curiosita.map((c) => c.testo),
    config.menu.contenuto,
  ];
  for (const testo of testi) {
    assert.equal(
      testo.includes('SEGNAPOSTO'),
      config.segnaposto === true,
      config.segnaposto
        ? `testo senza marcatore SEGNAPOSTO: "${testo}"`
        : `marcatore SEGNAPOSTO rimasto con segnaposto: false: "${testo}"`,
    );
  }
});
