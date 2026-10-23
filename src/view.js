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
//                         | { sbloccato: true, sezioni: [{ titolo, sottotitolo, voci: [{ nome, nota }] }] } }
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

/** L'istante che cade `giorni` giorni prima della cena, alla stessa ora locale di Roma. */
function giorniPrimaDellaCena(config, giorni) {
  return giorniPrima(Date.parse(config.cena), giorni);
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
  const sblocco = giorniPrimaDellaCena(config, config.menu.sblocco.giorniPrima);
  if (adesso >= sblocco) {
    return { sbloccato: true, sezioni: config.menu.contenuto };
  }
  return { sbloccato: false, manca: tempoMancante(sblocco - adesso) };
}

const testoNonVuoto = (testo) => typeof testo === 'string' && testo.trim() !== '';

/** Lancia un errore chiaro se una voce del Menù non è `{ nome, nota }` con entrambi i testi non vuoti. */
function verificaVoce(voce, posto, titoloSezione) {
  const dove = `della sezione "${titoloSezione}" del Menù`;
  const nomeVoce = testoNonVuoto(voce?.nome) ? `"${voce.nome}"` : `${posto + 1}`;
  if (voce === null || typeof voce !== 'object' || Array.isArray(voce)) {
    throw new Error(
      `Configurazione non valida: la voce ${posto + 1} ${dove} deve avere un nome e una nota (non basta il solo testo).`,
    );
  }
  if (!testoNonVuoto(voce.nome)) {
    throw new Error(`Configurazione non valida: la voce ${posto + 1} ${dove} non ha un nome.`);
  }
  if (!testoNonVuoto(voce.nota)) {
    throw new Error(`Configurazione non valida: la voce ${nomeVoce} ${dove} non ha una nota.`);
  }
}

/** Lancia un errore chiaro se il Menù non è una lista di sezioni, ognuna con titolo, sottotitolo e voci (nome e nota) non vuoti. */
function verificaMenu(menu) {
  const sezioni = menu.contenuto;
  if (!Array.isArray(sezioni) || sezioni.length === 0) {
    throw new Error(
      'Configurazione non valida: il Menù deve essere una lista di almeno una sezione, ognuna con titolo, sottotitolo e voci.',
    );
  }
  sezioni.forEach((sezione, postoSezione) => {
    if (!testoNonVuoto(sezione?.titolo)) {
      throw new Error(`Configurazione non valida: la sezione ${postoSezione + 1} del Menù non ha un titolo.`);
    }
    if (!testoNonVuoto(sezione.sottotitolo)) {
      throw new Error(`Configurazione non valida: la sezione "${sezione.titolo}" del Menù non ha un sottotitolo.`);
    }
    const voci = sezione.voci;
    if (!Array.isArray(voci) || voci.length === 0) {
      throw new Error(`Configurazione non valida: la sezione "${sezione.titolo}" del Menù deve avere almeno una voce.`);
    }
    voci.forEach((voce, postoVoce) => verificaVoce(voce, postoVoce, sezione.titolo));
  });
}

/** Lancia un errore chiaro se un anticipo sulla cena (Apertura o Sblocco) non è un numero intero di giorni. */
function verificaGiorniPrima(nome, giorni) {
  if (!Number.isInteger(giorni)) {
    throw new Error(`Configurazione non valida: ${nome} deve avere \`giorniPrima\` come numero intero di giorni prima della cena.`);
  }
}

/** Lancia un errore chiaro se la configurazione non è valida: Apertura o Sblocco senza giorniPrima intero, Menù non a sezioni o Invitati con lo stesso nome normalizzato. */
function verificaConfigurazione(config) {
  verificaGiorniPrima("l'Apertura", config.apertura?.giorniPrima);
  verificaGiorniPrima('lo Sblocco del Menù', config.menu.sblocco?.giorniPrima);
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
  const apertura = giorniPrimaDellaCena(config, config.apertura.giorniPrima);

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
