// ============================================================================
// L'UNICO FILE DI DATI DELL'INVITO
//
// Tutto ciò che si cambia per davvero sta qui: data della cena, Invitati,
// Messaggi personalizzati e Menù.
// Non serve toccare nient'altro.
//
// ATTENZIONE: i contenuti qui sotto sono SEGNAPOSTO (campo `segnaposto: true`).
// Sostituiscili con quelli veri, poi metti `segnaposto: false`.
//
// ATTENZIONE: il repository è pubblico, quindi anche questo file lo è.
// Non scrivere qui l'indirizzo di casa né nulla che non vuoi far leggere.
//
// Apertura e Sblocco del Menù si scrivono come `giorniPrima` (intero) la cena.
// La data della cena è ISO 8601 con offset esplicito del fuso Europe/Rome:
//   +01:00 = ora solare (da fine ottobre a fine marzo)
//   +02:00 = ora legale (da fine marzo a fine ottobre)
// ============================================================================

export const config = {
  // SEGNAPOSTO: metti false quando hai sostituito tutti i contenuti.
  segnaposto: true,

  // SEGNAPOSTO: data e ora della cena. È l'UNICO campo da cambiare per la data.
  cena: '2026-12-12T20:00:00+01:00',

  // L'Invito è chiuso fino all'Apertura: 7 giorni prima della cena, alla stessa ora della cena.
  // Spostando la cena si sposta da solo (l'ora resta quella locale di Roma, anche col cambio d'ora).
  apertura: { giorniPrima: 7 },

  // SEGNAPOSTO: Invitati. Un solo nome principale ciascuno, nessun alias.
  invitati: [
    {
      nome: 'Mario Rossi',
      messaggio: 'SEGNAPOSTO: Mario, porta fame e pazienza. Il resto lo mettiamo noi.',
    },
    {
      nome: 'Giulia Bianchi',
      messaggio: 'SEGNAPOSTO: Giulia, il tuo posto a tavola è già prenotato. Anche il bis.',
    },
  ],

  // SEGNAPOSTO: Menù. Lo Sblocco è 3 giorni prima della cena, alla stessa ora della cena;
  // anche questo si sposta da solo con la cena.
  menu: {
    contenuto: 'SEGNAPOSTO: antipasto misterioso, primo segreto, secondo a sorpresa, dolce da definire.',
    sblocco: { giorniPrima: 3 },
  },

  // Messaggio mostrato a chi scrive all'Ingresso un nome non in lista.
  // Fisso e unico: non deve mai suggerire nomi.
  messaggioRifiuto: 'Questo nome non risulta in lista. Riprova, oppure fai finta di niente e torna con un invito vero.',

  // Testo del countdown quando arriva l'ora della cena.
  messaggioFinale: 'Si mangia!',
};
