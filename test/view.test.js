import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeView } from '../src/view.js';
import { config as configReale } from '../src/config.js';

// Sezioni del Menù di prova: stesse nella configurazione di prova e nelle attese.
const SEZIONI = [
  { titolo: 'Antipasti', voci: ['Bruschette', 'Olive'] },
  { titolo: 'Primo', voci: ['Tagliatelle al ragù'] },
  { titolo: 'Dolce', voci: ['Tiramisù'] },
];

// Configurazione di prova, indipendente dai contenuti reali dell'Invito.
const config = {
  cena: '2030-06-15T20:00:00+02:00',
  apertura: { giorniPrima: 7 },
  invitati: [
    { nome: 'Mario Rossi', messaggio: 'Ciao Mario' },
    { nome: 'Àgata Müller', messaggio: 'Ciao Àgata' },
  ],
  menu: {
    contenuto: SEZIONI,
    sblocco: { giorniPrima: 3 },
  },
  messaggioRifiuto: 'Non risulti in lista.',
  messaggioFinale: 'Si mangia!',
};

// Istanti attesi scritti a mano: 7 e 3 giorni prima della cena, alla stessa ora locale (20:00).
const APERTURA = Date.parse('2030-06-08T20:00:00+02:00');
const CENA = Date.parse(config.cena);
const SBLOCCO_MENU = Date.parse('2030-06-12T20:00:00+02:00');
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
  };
  // Il 31 marzo 2030 alle 01:00 locale (+01:00) mancano 18 ore reali, non 19, alle 20:00 (+02:00).
  const ora = Date.parse('2030-03-31T01:00:00+01:00');
  const view = computeView(cambio, ora, 'Mario Rossi');
  assert.deepEqual(view.cena.manca, { giorni: 0, ore: 18, minuti: 0, secondi: 0 });
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
  };
  // Un secondo prima e un secondo dopo il salto delle 02:00 locali (01:00 UTC): il tempo reale scorre di un solo secondo.
  const prima = computeView(cambio, Date.parse('2030-03-31T01:59:59+01:00'), 'Mario Rossi').cena.manca;
  const dopo = computeView(cambio, Date.parse('2030-03-31T03:00:00+02:00'), 'Mario Rossi').cena.manca;
  assert.deepEqual(prima, { giorni: 0, ore: 17, minuti: 0, secondi: 1 });
  assert.deepEqual(dopo, { giorni: 0, ore: 17, minuti: 0, secondi: 0 });
});

test('prima dello sblocco il Menù mostra solo il tempo mancante allo sblocco, senza voci né titoli', () => {
  const ora = SBLOCCO_MENU - (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000;
  const view = computeView(config, ora, 'Mario Rossi');
  assert.deepEqual(view.menu, { sbloccato: false, manca: { giorni: 2, ore: 3, minuti: 4, secondi: 5 } });
  const esposto = JSON.stringify(view);
  for (const { titolo, voci } of SEZIONI) {
    for (const testo of [titolo, ...voci]) {
      assert.ok(!esposto.includes(testo), `"${testo}" esposto con il Menù bloccato`);
    }
  }
});

test('un secondo prima dello sblocco il Menù è ancora bloccato, mai a zero', () => {
  const { menu } = computeView(config, SBLOCCO_MENU - 1000, 'Mario Rossi');
  assert.deepEqual(menu, { sbloccato: false, manca: { giorni: 0, ore: 0, minuti: 0, secondi: 1 } });
  const quasi = computeView(config, SBLOCCO_MENU - 1, 'Mario Rossi').menu;
  assert.deepEqual(quasi, { sbloccato: false, manca: { giorni: 0, ore: 0, minuti: 0, secondi: 1 } });
});

test("all'istante di sblocco e subito dopo il Menù mostra tutte le sezioni, nell'ordine della configurazione", () => {
  for (const scarto of [0, 1, 1000]) {
    const { menu } = computeView(config, SBLOCCO_MENU + scarto, 'Mario Rossi');
    assert.deepEqual(menu, { sbloccato: true, sezioni: SEZIONI }, `+${scarto}ms`);
  }
});

test("le sezioni del Menù seguono l'ordine della configurazione, non quello alfabetico", () => {
  const ordine = [
    { titolo: 'Dolce', voci: ['Torta'] },
    { titolo: 'Aperitivo', voci: ['Patatine', 'Taralli'] },
  ];
  const invertito = { ...config, menu: { ...config.menu, contenuto: ordine } };
  const { menu } = computeView(invertito, SBLOCCO_MENU, 'Mario Rossi');
  assert.deepEqual(menu.sezioni.map((s) => s.titolo), ['Dolce', 'Aperitivo']);
  assert.deepEqual(menu.sezioni[1].voci, ['Patatine', 'Taralli']);
});

test('il Menù resta sbloccato fino alla cena e dopo', () => {
  for (const ora of [CENA - 1000, CENA, CENA + 86400_000]) {
    const { menu } = computeView(config, ora, 'Mario Rossi');
    assert.equal(menu.sbloccato, true, new Date(ora).toISOString());
  }
});

test("il Menù compare solo dentro l'Invito", () => {
  for (const [ora, nome] of [[APERTURA - 1000, 'Mario Rossi'], [DOPO_APERTURA, undefined], [DOPO_APERTURA, 'Nessuno']]) {
    assert.equal('menu' in computeView(config, ora, nome), false);
  }
});

// ---- Configurazione reale: istanti attesi scritti a mano, non derivati dal codice ----

const INVITATI_REALI = [
  ['Mauro', 'Ao so proprio contento de sta qui, ma il gatto lo possiamo portare?'],
  ['Martina', 'Io me magno tutto, pure il parmigiano, basta che non lo so'],
  ['Malvina', 'Ripetiamo insieme: senza lattosio non vuol dire senza caseina'],
  ['Lorenzo', "Ce l'abbiamo il vino, si?"],
  ['Graziana', 'Già senza glutine è difficile, ma pure senza caseina che dobbiamo mangiare?'],
  ['Alfredo', 'Ma la soppressata la possono mangiare tutti? e il caciocavallo?'],
];
const APERTURA_REALE = Date.parse('2026-10-26T20:00:00+01:00');
const SBLOCCO_REALE = Date.parse('2026-10-30T20:00:00+01:00');
const CENA_REALE = Date.parse('2026-11-02T20:00:00+01:00');

test('la cena reale è lunedì 2 novembre 2026 alle 20:00 a Roma', () => {
  assert.equal(configReale.cena, '2026-11-02T20:00:00+01:00');
});

test('i sei Invitati reali entrano con il loro Messaggio personalizzato identico, e sono solo loro', () => {
  assert.deepEqual(
    configReale.invitati.map((i) => [i.nome, i.messaggio]),
    INVITATI_REALI,
  );
  for (const [nome, messaggio] of INVITATI_REALI) {
    for (const scritto of [nome, nome.toUpperCase(), `  ${nome.toLowerCase()}  `]) {
      const view = computeView(configReale, APERTURA_REALE, scritto);
      assert.equal(view.kind, 'dentro', scritto);
      assert.equal(view.messaggio, messaggio);
    }
  }
});

test("i nomi accentati a sproposito entrano; i vecchi nomi di prova non entrano più", () => {
  assert.equal(computeView(configReale, APERTURA_REALE, 'MÀURO').kind, 'dentro');
  for (const nome of ['Mario Rossi', 'Giulia Bianchi']) {
    const view = computeView(configReale, APERTURA_REALE, nome);
    assert.equal(view.kind, 'rifiutato', nome);
    assert.equal(view.messaggio, configReale.messaggioRifiuto);
  }
});

test("l'Invito reale è chiuso fino a lunedì 26/10 alle 20:00 e aperto da lì", () => {
  assert.equal(computeView(configReale, APERTURA_REALE - 1000, undefined).kind, 'chiuso');
  assert.equal(computeView(configReale, APERTURA_REALE - 1000, 'Mauro').kind, 'chiuso');
  assert.equal(computeView(configReale, APERTURA_REALE, undefined).kind, 'ingresso');
});

test('il Menù reale è teaser fino a venerdì 30/10 alle 20:00 e sbloccato da lì', () => {
  const prima = computeView(configReale, SBLOCCO_REALE - 1000, 'Mauro').menu;
  assert.equal(prima.sbloccato, false);
  assert.equal('sezioni' in prima, false);
  for (const ora of [SBLOCCO_REALE, CENA_REALE, CENA_REALE + 86400_000]) {
    assert.equal(computeView(configReale, ora, 'Mauro').menu.sbloccato, true);
  }
});

test("il Menù reale sbloccato mostra tutte le sezioni e le voci concordate, nell'ordine", () => {
  const { menu } = computeView(configReale, SBLOCCO_REALE, 'Mauro');
  assert.deepEqual(menu.sezioni, [
    { titolo: 'Aperitivo', voci: ['Patatine', 'Taralli'] },
    {
      titolo: 'Antipasti',
      voci: [
        'Focaccia bianca',
        'Soppressata',
        'Caciocavallo',
        'Melanzane e zucchine grigliate e condite con menta',
        'Polenta nel forno con maionese',
        'Polpette di verdure con maionese',
        'Bicchierini di riso Venere con verdurine e gamberetti',
      ],
    },
    {
      titolo: 'Secondo',
      voci: ['Spiedini di calamari gratinati al forno con contorno di polpette di patate'],
    },
    { titolo: 'Dolce', voci: ['Crostata di mele cotogne'] },
    { titolo: 'Bevande', voci: ['Vino bianco', 'Prosecco (con il dolce)'] },
  ]);
});

test('dalla cena reale in poi c\'è solo "Si mangia!"', () => {
  const { cena } = computeView(configReale, CENA_REALE, 'Mauro');
  assert.equal(cena.siMangia, true);
  assert.equal(cena.messaggio, 'Si mangia!');
});

test("Apertura e Sblocco si spostano insieme alla cena", () => {
  const spostata = { ...config, cena: '2030-07-20T20:00:00+02:00' };
  const apertura = Date.parse('2030-07-13T20:00:00+02:00');
  const sblocco = Date.parse('2030-07-17T20:00:00+02:00');
  assert.equal(computeView(spostata, apertura - 1000, undefined).kind, 'chiuso');
  assert.equal(computeView(spostata, apertura, undefined).kind, 'ingresso');
  assert.equal(computeView(spostata, sblocco - 1000, 'Mario Rossi').menu.sbloccato, false);
  assert.equal(computeView(spostata, sblocco, 'Mario Rossi').menu.sbloccato, true);
});

test("l'Apertura cade alla stessa ora locale della cena anche a cavallo del passaggio all'ora legale", () => {
  const cambio = { ...config, cena: '2030-03-31T20:00:00+02:00' };
  // 7 giorni prima: 24 marzo alle 20:00 locali (+01:00), non alle 21:00 come darebbero 168 ore reali.
  assert.equal(computeView(cambio, Date.parse('2030-03-24T19:59:59+01:00'), undefined).kind, 'chiuso');
  assert.equal(computeView(cambio, Date.parse('2030-03-24T20:00:00+01:00'), undefined).kind, 'ingresso');
});

test("l'Apertura cade alla stessa ora locale della cena anche a cavallo del passaggio all'ora solare", () => {
  const cambio = { ...config, cena: '2030-10-27T20:00:00+01:00' };
  // 7 giorni prima: 20 ottobre alle 20:00 locali (+02:00), non alle 19:00 come darebbero 168 ore reali.
  assert.equal(computeView(cambio, Date.parse('2030-10-20T19:59:59+02:00'), undefined).kind, 'chiuso');
  assert.equal(computeView(cambio, Date.parse('2030-10-20T20:00:00+02:00'), undefined).kind, 'ingresso');
});

test('lo Sblocco del Menù cade alla stessa ora locale della cena a cavallo del cambio ora legale', () => {
  for (const [cena, sblocco] of [
    ['2030-03-31T20:00:00+02:00', '2030-03-28T20:00:00+01:00'],
    ['2030-10-27T20:00:00+01:00', '2030-10-24T20:00:00+02:00'],
  ]) {
    const cambio = { ...config, cena };
    const istante = Date.parse(sblocco);
    assert.equal(computeView(cambio, istante - 1000, 'Mario Rossi').menu.sbloccato, false, sblocco);
    assert.equal(computeView(cambio, istante, 'Mario Rossi').menu.sbloccato, true, sblocco);
  }
});

test('la vista di un Invitato dentro non ha più il campo curiosita', () => {
  assert.equal('curiosita' in computeView(config, DOPO_APERTURA, 'Mario Rossi'), false);
});

test('una sezione del Menù senza titolo, senza voci o con voci vuote fa fallire la configurazione con un errore chiaro', () => {
  const sezioniNonValide = {
    'titolo mancante': [{ voci: ['Olive'] }],
    'titolo vuoto': [{ titolo: '   ', voci: ['Olive'] }],
    'voci mancanti': [{ titolo: 'Antipasti' }],
    'nessuna voce': [{ titolo: 'Antipasti', voci: [] }],
    'solo voci vuote': [{ titolo: 'Antipasti', voci: ['', '  '] }],
    'una voce vuota tra le altre': [{ titolo: 'Antipasti', voci: ['Olive', ' '] }],
    'contenuto senza sezioni': [],
    'contenuto stringa': 'Tagliatelle',
  };
  for (const [caso, contenuto] of Object.entries(sezioniNonValide)) {
    const nonValida = { ...config, menu: { ...config.menu, contenuto } };
    for (const ora of [DOPO_APERTURA, SBLOCCO_MENU]) {
      assert.throws(() => computeView(nonValida, ora, 'Mario Rossi'), /Menù/, caso);
    }
  }
});

test("l'Apertura e lo Sblocco senza giorniPrima intero fanno fallire la configurazione con un errore chiaro", () => {
  for (const valore of [undefined, null, '7', 7.5, NaN, Infinity]) {
    const senzaApertura = { ...config, apertura: { giorniPrima: valore } };
    const senzaSblocco = { ...config, menu: { ...config.menu, sblocco: { giorniPrima: valore } } };
    for (const ora of [APERTURA - 1000, DOPO_APERTURA, SBLOCCO_MENU]) {
      assert.throws(() => computeView(senzaApertura, ora, 'Mario Rossi'), /Apertura.*giorniPrima/, `apertura ${valore}`);
      assert.throws(() => computeView(senzaSblocco, ora, 'Mario Rossi'), /Sblocco.*giorniPrima/, `sblocco ${valore}`);
    }
  }
  assert.throws(() => computeView({ ...config, apertura: undefined }, DOPO_APERTURA, undefined), /Apertura.*giorniPrima/);
  const menuSenzaSblocco = { ...config, menu: { contenuto: config.menu.contenuto } };
  assert.throws(() => computeView(menuSenzaSblocco, DOPO_APERTURA, undefined), /Sblocco.*giorniPrima/);
});
