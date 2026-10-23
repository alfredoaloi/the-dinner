// ============================================================================
// L'UNICO FILE DI DATI DELL'INVITO
//
// Tutto ciò che si cambia per davvero sta qui: data della cena, Invitati,
// Messaggi personalizzati e Menù (a sezioni, con sottotitolo e nota su ogni voce).
// Non serve toccare nient'altro.
//
// ATTENZIONE: il repository è pubblico, quindi anche questo file lo è.
// Non scrivere qui l'indirizzo di casa né nulla che non vuoi far leggere.
//
// Apertura e Sblocco del Menù si scrivono come `giorniPrima`: un numero intero di giorni prima della cena.
// La data della cena è ISO 8601 con offset esplicito del fuso Europe/Rome:
//   +01:00 = ora solare (da fine ottobre a fine marzo)
//   +02:00 = ora legale (da fine marzo a fine ottobre)
// ============================================================================

export const config = {
  // Data e ora della cena. È l'UNICO campo da cambiare per la data.
  cena: '2026-11-02T20:00:00+01:00',

  // L'Invito è chiuso fino all'Apertura: 7 giorni prima della cena, alla stessa ora della cena.
  // Spostando la cena si sposta da solo (l'ora resta quella locale di Roma, anche col cambio d'ora).
  apertura: { giorniPrima: 7 },

  // Invitati. Un solo nome principale ciascuno (il nome di battesimo), nessun alias.
  invitati: [
    {
      nome: 'Mauro',
      messaggio: 'Ao so proprio contento de sta qui, ma il gatto lo possiamo portare?',
    },
    {
      nome: 'Martina',
      messaggio: 'Io me magno tutto, pure il parmigiano, basta che non lo so',
    },
    {
      nome: 'Malvina',
      messaggio: 'Ripetiamo insieme: senza lattosio non vuol dire senza caseina',
    },
    {
      nome: 'Lorenzo',
      messaggio: "Ce l'abbiamo il vino, si?",
    },
    {
      nome: 'Graziana',
      messaggio: 'Già senza glutine è difficile, ma pure senza caseina che dobbiamo mangiare?',
    },
    {
      nome: 'Alfredo',
      messaggio: 'Ma la soppressata la possono mangiare tutti? e il caciocavallo?',
    },
  ],

  // Menù. Lo Sblocco è 3 giorni prima della cena, alla stessa ora della cena;
  // anche questo si sposta da solo con la cena.
  //
  // `contenuto` è una lista ORDINATA di Sezioni: l'Invito le mostra nello stesso ordine.
  // Ogni Sezione ha tre campi, tutti obbligatori e non vuoti:
  //   titolo       il nome della Sezione (per esempio "Antipasti")
  //   sottotitolo  una battuta corta sotto il titolo (per esempio "il round più lungo")
  //   voci         la lista ORDINATA delle Voci, almeno una
  // Ogni Voce è un oggetto `{ nome, nota }`, entrambi obbligatori e non vuoti:
  //   nome         il piatto o la bevanda
  //   nota         la battuta sotto il nome
  // Il vecchio formato (una Voce scritta come semplice stringa) non è più valido.
  // Se manca qualcosa l'Invito non parte e mostra un errore chiaro che nomina la Sezione o la Voce.
  // Prima dello sblocco nessun titolo, sottotitolo, nome o nota arriva alla pagina: c'è solo il teaser.
  menu: {
    contenuto: [
      {
        titolo: 'Aperitivo',
        sottotitolo: "per ingannare l'attesa",
        voci: [
          { nome: 'Patatine', nota: 'Il minimo sindacale. Si comincia bassi.' },
          { nome: 'Taralli', nota: "Pericolo: uno tira l'altro." },
        ],
      },
      {
        titolo: 'Antipasti',
        sottotitolo: 'il round più lungo',
        voci: [
          { nome: 'Focaccia bianca', nota: 'Qui si capisce chi è venuto per mangiare davvero.' },
          { nome: 'Soppressata', nota: "Graziana, questa è tutta tua: è l'unica carne della serata." },
          {
            nome: 'Caciocavallo',
            nota: "Malvina: qui c'è caseina, guardalo da lontano. Tutti gli altri: felicità.",
          },
          {
            nome: 'Melanzane e zucchine grigliate e condite con menta',
            nota: 'Verdura, ma con la menta: quindi è raffinata.',
          },
          { nome: 'Polenta nel forno con maionese', nota: 'La maionese è un gruppo alimentare.' },
          {
            nome: 'Polpette di verdure con maionese',
            nota: 'Sì, ancora maionese. Nessuno ha chiesto se bastasse.',
          },
          {
            nome: 'Bicchierini di riso Venere con verdurine e gamberetti',
            nota: "Quello da foto. Mangiatelo prima che si sgonfi l'hype.",
          },
        ],
      },
      {
        titolo: 'Secondo',
        sottotitolo: 'il piatto forte',
        voci: [
          {
            nome: 'Spiedini di calamari gratinati al forno con contorno di polpette di patate',
            nota: 'Il pezzo forte. Non è carne, è mare: vale lo stesso.',
          },
        ],
      },
      {
        titolo: 'Dolce',
        sottotitolo: 'chi lascia, perde',
        voci: [{ nome: 'Crostata di mele cotogne', nota: 'Cotta bene, che da crude le cotogne non perdonano.' }],
      },
      {
        titolo: 'Bevande',
        sottotitolo: 'per annaffiare il tutto',
        voci: [
          { nome: 'Vino bianco', nota: "Lorenzo: sì, ce l'abbiamo." },
          { nome: 'Prosecco (con il dolce)', nota: 'Arriva col dolce. Chi lo stappa prima sta fuori.' },
        ],
      },
    ],
    sblocco: { giorniPrima: 3 },
  },

  // Messaggio mostrato a chi scrive all'Ingresso un nome non in lista.
  // Fisso e unico: non deve mai suggerire nomi.
  messaggioRifiuto: 'Questo nome non risulta in lista. Riprova, oppure fai finta di niente e torna con un invito vero.',

  // Testo del countdown quando arriva l'ora della cena.
  messaggioFinale: 'Si mangia!',
};
