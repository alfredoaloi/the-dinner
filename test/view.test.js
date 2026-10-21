import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeView } from '../src/view.js';
import { config as configReale } from '../src/config.js';

// Configurazione di prova, indipendente dai contenuti segnaposto reali.
const config = {
  cena: '2030-06-15T20:00:00+02:00',
  apertura: '2030-06-01T20:00:00+02:00',
  invitati: [
    { nome: 'Mario Rossi', messaggio: 'Ciao Mario' },
    { nome: 'Àgata Müller', messaggio: 'Ciao Àgata' },
  ],
  messaggioRifiuto: 'Non risulti in lista.',
  messaggioFinale: 'Si mangia!',
};

const APERTURA = Date.parse(config.apertura);
const CENA = Date.parse(config.cena);
const DOPO_APERTURA = APERTURA + 60_000;

test("prima dell'apertura l'Invito è chiuso e dice quanto manca all'apertura", () => {
  const ora = APERTURA - (3 * 86400 + 4 * 3600 + 5 * 60 + 6) * 1000;
  const view = computeView(config, ora, undefined);
  assert.equal(view.kind, 'chiuso');
  assert.deepEqual(view.mancaAllApertura, { giorni: 3, ore: 4, minuti: 5, secondi: 6 });
});

test('da chiuso un nome scritto non apre nulla', () => {
  const view = computeView(config, APERTURA - 1000, 'Mario Rossi');
  assert.equal(view.kind, 'chiuso');
});

test("un secondo prima dell'apertura è ancora chiuso, all'istante di apertura c'è l'Ingresso", () => {
  const prima = computeView(config, APERTURA - 1000, undefined);
  assert.equal(prima.kind, 'chiuso');
  assert.deepEqual(prima.mancaAllApertura, { giorni: 0, ore: 0, minuti: 0, secondi: 1 });
  assert.equal(computeView(config, APERTURA, undefined).kind, 'ingresso');
});

test('aperto e nessun nome scritto: Ingresso', () => {
  for (const nome of [undefined, null, '', '   ']) {
    assert.equal(computeView(config, DOPO_APERTURA, nome).kind, 'ingresso');
  }
});

test('un Invitato in lista entra e vede il suo Messaggio personalizzato', () => {
  const view = computeView(config, DOPO_APERTURA, 'Mario Rossi');
  assert.equal(view.kind, 'dentro');
  assert.equal(view.messaggio, 'Ciao Mario');
});

test('il nome è riconosciuto con maiuscole, spazi e accenti diversi', () => {
  for (const scritto of ['mario rossi', 'MARIO ROSSI', '  Mario Rossi  ', 'Mario    Rossi', ' mArIo \t rossi ']) {
    const view = computeView(config, DOPO_APERTURA, scritto);
    assert.equal(view.kind, 'dentro', scritto);
    assert.equal(view.messaggio, 'Ciao Mario', scritto);
  }
  for (const scritto of ['agata muller', 'ÀGATA MÜLLER', 'Ágata  Muller']) {
    const view = computeView(config, DOPO_APERTURA, scritto);
    assert.equal(view.kind, 'dentro', scritto);
    assert.equal(view.messaggio, 'Ciao Àgata', scritto);
  }
});

test('un nome non in lista è rifiutato con il messaggio fisso, senza suggerimenti, ogni volta', () => {
  for (const scritto of ['Luigi Verdi', 'Mario', 'Mario Rossi Jr', 'Mari0 Rossi']) {
    const view = computeView(config, DOPO_APERTURA, scritto);
    assert.deepEqual(view, { kind: 'rifiutato', messaggio: 'Non risulti in lista.' });
  }
});

test("il tempo alla cena scende a zero e poi resta 'Si mangia!', mai negativo", () => {
  const prima = computeView(config, CENA - 1000, 'Mario Rossi');
  assert.deepEqual(prima.cena, { siMangia: false, manca: { giorni: 0, ore: 0, minuti: 0, secondi: 1 } });

  for (const ora of [CENA, CENA + 1000, CENA + 400 * 86400 * 1000]) {
    const view = computeView(config, ora, 'Mario Rossi');
    assert.deepEqual(view.cena, { siMangia: true, messaggio: 'Si mangia!' });
  }
});

test('il countdown alla cena a cavallo del cambio ora legale usa gli offset della configurazione', () => {
  const cambio = {
    ...config,
    cena: '2030-03-31T20:00:00+02:00',
    apertura: '2030-03-01T20:00:00+01:00',
  };
  // Il 31 marzo 2030 alle 01:00 locale (+01:00) mancano 18 ore reali, non 19, alle 20:00 (+02:00).
  const ora = Date.parse('2030-03-31T01:00:00+01:00');
  const view = computeView(cambio, ora, 'Mario Rossi');
  assert.deepEqual(view.cena.manca, { giorni: 0, ore: 18, minuti: 0, secondi: 0 });
});

test("la configurazione dell'Invito che andrà online è valida e fa entrare ogni suo Invitato", () => {
  const dopoApertura = Date.parse(configReale.apertura) + 1000;
  for (const invitato of configReale.invitati) {
    const view = computeView(configReale, dopoApertura, invitato.nome);
    assert.equal(view.kind, 'dentro', invitato.nome);
    assert.equal(view.messaggio, invitato.messaggio);
  }
});

test('due Invitati con lo stesso nome normalizzato fanno fallire la configurazione con un errore chiaro', () => {
  const doppia = {
    ...config,
    invitati: [
      { nome: 'Mario Rossi', messaggio: 'uno' },
      { nome: '  màrio   ROSSI ', messaggio: 'due' },
    ],
  };
  for (const ora of [APERTURA - 1000, DOPO_APERTURA]) {
    for (const nome of [undefined, 'Mario Rossi']) {
      assert.throws(() => computeView(doppia, ora, nome), /Invitati.*duplicat|duplicat.*Invitati/i);
    }
  }
});
