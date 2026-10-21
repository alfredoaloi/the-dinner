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

test('il countdown alla cena scende di un secondo alla volta, riportando minuti, ore e giorni', () => {
  const attesi = [
    [CENA - 86400_000 - 1000, { giorni: 1, ore: 0, minuti: 0, secondi: 1 }],
    [CENA - 86400_000, { giorni: 1, ore: 0, minuti: 0, secondi: 0 }],
    [CENA - 86400_000 + 1000, { giorni: 0, ore: 23, minuti: 59, secondi: 59 }],
    [CENA - 3600_000 - 1000, { giorni: 0, ore: 1, minuti: 0, secondi: 1 }],
    [CENA - 60_000 - 1000, { giorni: 0, ore: 0, minuti: 1, secondi: 1 }],
    [CENA - 60_000 + 1000, { giorni: 0, ore: 0, minuti: 0, secondi: 59 }],
    [CENA - 1000, { giorni: 0, ore: 0, minuti: 0, secondi: 1 }],
  ];
  for (const [ora, manca] of attesi) {
    const { cena } = computeView(config, ora, 'Mario Rossi');
    assert.deepEqual(cena, { siMangia: false, manca }, new Date(ora).toISOString());
  }
});

test('finché non è l\'ora della cena il countdown non mostra mai zero, nemmeno a frazioni di secondo', () => {
  const { cena } = computeView(config, CENA - 1, 'Mario Rossi');
  assert.deepEqual(cena, { siMangia: false, manca: { giorni: 0, ore: 0, minuti: 0, secondi: 1 } });
  const meta = computeView(config, CENA - 500, 'Mario Rossi').cena;
  assert.deepEqual(meta, { siMangia: false, manca: { giorni: 0, ore: 0, minuti: 0, secondi: 1 } });
});

test("l'istante è accettato anche come Date e dà la stessa vista", () => {
  const ora = CENA - 90_000;
  assert.deepEqual(computeView(config, new Date(ora), 'Mario Rossi'), computeView(config, ora, 'Mario Rossi'));
});

test('a cena iniziata e a cena passata c\'è solo "Si mangia!": nessun numero, nemmeno negativo', () => {
  for (const scarto of [0, 1, 999, 1000, 60_000, 86400_000, 365 * 86400_000]) {
    const view = computeView(config, CENA + scarto, 'Mario Rossi');
    assert.deepEqual(view.cena, { siMangia: true, messaggio: 'Si mangia!' }, `+${scarto}ms`);
  }
});

test('attorno alla cena nessun valore del tempo mancante è negativo o fuori scala', () => {
  for (let ora = CENA - 3 * 86400_000; ora <= CENA + 3 * 86400_000; ora += 7919_000 + 137) {
    const { cena } = computeView(config, ora, 'Mario Rossi');
    if (cena.siMangia) {
      assert.ok(ora >= CENA, `Si mangia! troppo presto a ${ora}`);
      assert.deepEqual(Object.keys(cena).sort(), ['messaggio', 'siMangia']);
      continue;
    }
    assert.ok(ora < CENA);
    const { giorni, ore, minuti, secondi } = cena.manca;
    for (const n of [giorni, ore, minuti, secondi]) assert.ok(Number.isInteger(n) && n >= 0, `${ora}`);
    assert.ok(ore < 24 && minuti < 60 && secondi < 60, `${ora}`);
  }
});

test('il countdown a cavallo del passaggio all\'ora solare (ottobre) conta il tempo reale di Europe/Rome', () => {
  const cambio = {
    ...config,
    cena: '2030-10-27T20:00:00+01:00',
    apertura: '2030-10-01T20:00:00+02:00',
  };
  // Il 27 ottobre 2030 alle 01:00 locale (+02:00) mancano 20 ore reali, non 19, alle 20:00 (+01:00).
  const ora = Date.parse('2030-10-27T01:00:00+02:00');
  assert.deepEqual(computeView(cambio, ora, 'Mario Rossi').cena.manca, { giorni: 0, ore: 20, minuti: 0, secondi: 0 });
  // Alla mezzanotte locale del giorno prima (+02:00) mancano 45 ore reali: 1 giorno e 21 ore.
  const sera = Date.parse('2030-10-26T00:00:00+02:00');
  assert.deepEqual(computeView(cambio, sera, 'Mario Rossi').cena.manca, { giorni: 1, ore: 21, minuti: 0, secondi: 0 });
});

test('il countdown di una cena a cavallo del cambio ora legale passa da un\'ora locale all\'altra senza salti', () => {
  const cambio = {
    ...config,
    cena: '2030-03-31T20:00:00+02:00',
    apertura: '2030-03-01T20:00:00+01:00',
  };
  // Un secondo prima e un secondo dopo il salto delle 02:00 locali (01:00 UTC): il tempo reale scorre di un solo secondo.
  const prima = computeView(cambio, Date.parse('2030-03-31T01:59:59+01:00'), 'Mario Rossi').cena.manca;
  const dopo = computeView(cambio, Date.parse('2030-03-31T03:00:00+02:00'), 'Mario Rossi').cena.manca;
  assert.deepEqual(prima, { giorni: 0, ore: 17, minuti: 0, secondi: 1 });
  assert.deepEqual(dopo, { giorni: 0, ore: 17, minuti: 0, secondi: 0 });
});
