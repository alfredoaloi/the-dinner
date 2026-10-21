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
//            curiosita: { sbloccate: [testo], prossima: Tempo | undefined } }
//   curiosita.sbloccate  i testi delle Curiosità sbloccate, in ordine di data di sblocco
//   curiosita.prossima   tempo mancante alla prossima ancora bloccata; assente se sono tutte sbloccate
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

/**
 * Sezione Curiosità: i testi già sbloccati in ordine di data di sblocco, più il tempo
 * mancante alla prossima ancora bloccata (`prossima` è undefined quando sono tutte sbloccate).
 * Una Curiosità è sbloccata dall'istante di sblocco in poi.
 */
function statoCuriosita(config, adesso) {
  const ordinate = (config.curiosita ?? [])
    .map((c) => ({ testo: c.testo, sblocco: Date.parse(c.sblocco) }))
    .sort((a, b) => a.sblocco - b.sblocco);
  const prossima = ordinate.find((c) => c.sblocco > adesso);
  return {
    sbloccate: ordinate.filter((c) => c.sblocco <= adesso).map((c) => c.testo),
    prossima: prossima && tempoMancante(prossima.sblocco - adesso),
  };
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
    curiosita: statoCuriosita(config, adesso),
  };
}
