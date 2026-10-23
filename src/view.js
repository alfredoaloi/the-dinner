// Funzione pura che calcola la vista dell'Invito.
// Nessun accesso a DOM, orologio o storage: tutto arriva dai parametri.
//
// computeView(config, now, nomeScritto) -> vista
//   config      la configurazione dell'Invito (src/config.js)
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
//                         | { sbloccato: true, sezioni: [{ titolo, voci: [testo] }] } }
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

/** Stato del Menù: solo il tempo mancante allo sblocco, poi (dall'istante di sblocco in poi) tutte le sezioni insieme. */
function statoMenu(config, adesso) {
  const sblocco = Date.parse(config.menu.sblocco);
  if (adesso >= sblocco) {
    return { sbloccato: true, sezioni: config.menu.contenuto };
  }
  return { sbloccato: false, manca: tempoMancante(sblocco - adesso) };
}

const èTestoNonVuoto = (testo) => typeof testo === 'string' && testo.trim() !== '';

/** Lancia un errore chiaro se il Menù non è una lista di sezioni, ognuna con titolo e almeno una voce non vuota. */
function verificaMenu(menu) {
  const sezioni = menu.contenuto;
  if (!Array.isArray(sezioni) || sezioni.length === 0) {
    throw new Error('Configurazione non valida: il Menù deve essere una lista di almeno una sezione, ognuna con titolo e voci.');
  }
  sezioni.forEach((sezione, posto) => {
    if (!èTestoNonVuoto(sezione?.titolo)) {
      throw new Error(`Configurazione non valida: la sezione ${posto + 1} del Menù non ha un titolo.`);
    }
    const voci = sezione.voci;
    if (!Array.isArray(voci) || voci.length === 0 || !voci.every(èTestoNonVuoto)) {
      throw new Error(
        `Configurazione non valida: la sezione "${sezione.titolo}" del Menù deve avere almeno una voce, e nessuna voce vuota.`,
      );
    }
  });
}

/** Lancia un errore chiaro se la configurazione non è valida: Menù non a sezioni o Invitati con lo stesso nome normalizzato. */
function verificaConfigurazione(config) {
  verificaMenu(config.menu);
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
  const apertura = Date.parse(config.apertura);

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
