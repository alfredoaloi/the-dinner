// Funzione pura che calcola la vista dell'Invito.
// Nessun accesso a DOM, orologio o storage: tutto arriva dai parametri.
//
// computeView(config, now, nomeScritto) -> vista
//   config      la configurazione dell'Invito (src/config.js). Apertura e Sblocco del Menù
//               sono `giorniPrima` la cena, risolti qui alla stessa ora locale di Roma della cena
//   now         l'istante corrente: millisecondi epoch o Date
//   nomeScritto il nome scritto all'Ingresso (assente se non scritto)
//
// Forma della vista (le viste sono distinte dal campo `kind`):
//   { kind: 'chiuso', mancaAllApertura: Tempo }
//   { kind: 'ingresso' }
//   { kind: 'rifiutato', messaggio }
//   { kind: 'dentro', messaggio, cena: { siMangia: false, manca: Tempo }
//                                    | { siMangia: true, messaggio },
//                     menu: { sbloccato: false, manca: Tempo }
//                         | { sbloccato: true, contenuto } }
// dove Tempo = { giorni, ore, minuti, secondi }, mai negativo.

/**
 * Scompone una durata in millisecondi in giorni, ore, minuti, secondi (mai negativi).
 * I secondi si arrotondano per eccesso: finché l'istante non è arrivato non si mostra mai zero.
 */
function tempoMancante(ms) {
  const secondiTotali = Math.ceil(Math.max(0, ms) / 1000);
  return {
    giorni: Math.floor(secondiTotali / 86400),
    ore: Math.floor((secondiTotali % 86400) / 3600),
    minuti: Math.floor((secondiTotali % 3600) / 60),
    secondi: secondiTotali % 60,
  };
}

const FORMATO_ROMA = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Rome',
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

/** Ora a muro di Europe/Rome in quell'istante, scritta come se fosse UTC (millisecondi epoch). */
function muroRoma(istante) {
  const v = Object.fromEntries(FORMATO_ROMA.formatToParts(new Date(istante)).map((p) => [p.type, Number(p.value)]));
  return Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second) + (((istante % 1000) + 1000) % 1000);
}

/** Istante che a Roma ha quell'ora a muro (scritta come se fosse UTC). */
function istanteDaMuroRoma(muro) {
  const primo = muro - (muroRoma(muro) - muro);
  return muro - (muroRoma(primo) - primo);
}

/**
 * L'istante `giorni` giorni di calendario prima di `istante`, alla stessa ora locale di Roma.
 * Non sono `giorni * 24` ore: attraversando un cambio di ora legale l'ora a muro resta quella.
 */
function giorniPrima(istante, giorni) {
  return istanteDaMuroRoma(muroRoma(istante) - giorni * 86400_000);
}

/**
 * Forma normalizzata di un nome: senza spazi ai bordi, con gli spazi interni
 * ridotti a uno, senza maiuscole e senza accenti. Assente -> stringa vuota.
 */
export function normalizzaNome(nome) {
  return String(nome ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Stato del countdown alla cena: tempo mancante, oppure "Si mangia!" dalla cena in poi. */
function statoCena(config, adesso) {
  const cena = Date.parse(config.cena);
  if (adesso >= cena) {
    return { siMangia: true, messaggio: config.messaggioFinale };
  }
  return { siMangia: false, manca: tempoMancante(cena - adesso) };
}

/** Stato del Menù: solo il tempo mancante allo sblocco, poi (dall'istante di sblocco in poi) il contenuto. */
function statoMenu(config, adesso) {
  const sblocco = giorniPrima(Date.parse(config.cena), config.menu.sblocco.giorniPrima);
  if (adesso >= sblocco) {
    return { sbloccato: true, contenuto: config.menu.contenuto };
  }
  return { sbloccato: false, manca: tempoMancante(sblocco - adesso) };
}

/** Lancia un errore chiaro se due Invitati hanno lo stesso nome normalizzato. */
function verificaConfigurazione(config) {
  const visti = new Map();
  for (const invitato of config.invitati) {
    const chiave = normalizzaNome(invitato.nome);
    if (visti.has(chiave)) {
      throw new Error(
        `Configurazione non valida: Invitati duplicati, "${visti.get(chiave)}" e "${invitato.nome}" ` +
          'sono lo stesso nome una volta normalizzato (maiuscole, spazi e accenti non contano).',
      );
    }
    visti.set(chiave, invitato.nome);
  }
}

export function computeView(config, now, nomeScritto) {
  verificaConfigurazione(config);
  const adesso = Number(now);
  const apertura = giorniPrima(Date.parse(config.cena), config.apertura.giorniPrima);

  if (adesso < apertura) {
    return { kind: 'chiuso', mancaAllApertura: tempoMancante(apertura - adesso) };
  }
  const nome = normalizzaNome(nomeScritto);
  if (nome === '') {
    return { kind: 'ingresso' };
  }
  const invitato = config.invitati.find((i) => normalizzaNome(i.nome) === nome);
  if (!invitato) {
    return { kind: 'rifiutato', messaggio: config.messaggioRifiuto };
  }
  return {
    kind: 'dentro',
    messaggio: invitato.messaggio,
    cena: statoCena(config, adesso),
    menu: statoMenu(config, adesso),
  };
}
