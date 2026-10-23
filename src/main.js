// Strato di presentazione dell'Invito: sottile e senza test.
// Legge URL e orologio, chiede la vista a computeView e la disegna.
// Il nome dell'Invitato è ricordato nel browser (src/memoria.js) solo dopo un Ingresso riuscito.
import { config } from './config.js';
import { creaMemoria } from './memoria.js';
import { computeView } from './view.js';
import { creaTempoMancante } from './tempo.js';
import { leggiIstanteSimulato } from './orologio.js';

/**
 * Orologio dell'Invito. Con `?now=<data ISO>` valida (src/orologio.js), l'istante indicato è il
 * punto di partenza e poi il tempo scorre a velocità reale; altrimenti ora reale.
 */
function creaOrologio(ricerca) {
  const simulato = leggiIstanteSimulato(new URLSearchParams(ricerca).get('now'));
  if (simulato === undefined) {
    return () => Date.now();
  }
  const partenza = Date.now();
  return () => simulato + (Date.now() - partenza);
}

const adesso = creaOrologio(window.location.search);
const radice = document.getElementById('invito');
const memoria = creaMemoria(() => window.localStorage);

let nomeScritto = memoria.leggi();
let nomeDaMemoria = nomeScritto !== undefined; // il nome viene dal browser, non dall'Ingresso di questa visita
let tentativo = 0;
let scoppioFatto = false; // lo scoppio di coriandoli parte al massimo una volta per caricamento della pagina
let chiaveDisegnata;
let aggiornaCountdown = () => {};
let aggiornaMenu = () => {};

function crea(tag, testo, classe) {
  const el = document.createElement(tag);
  if (testo !== undefined) el.textContent = testo;
  if (classe) el.className = classe;
  return el;
}

// Scoppio di coriandoli: quanti pezzi e come si aprono.
const PEZZI_SCOPPIO = 32;
const CLASSI_COLORE = 5; // classi colore .c0–.c4 di .pezzo in src/style.css: se ne aggiungi una lì, alza questo numero
const FORMA_TONDA_OGNI = 3; // un pezzo ogni tre è tondo (classe .tondo), gli altri sono rettangolini
const ANGOLO_MIN_GRADI = -160; // il ventaglio va da -160 a -20 gradi: verso l'alto (y cresce verso il basso)
const ANGOLO_AMPIEZZA_GRADI = 140;
const DISTANZA_MIN_VMIN = 18; // fin dove arriva il pezzo, in vmin: resta dentro lo schermo
const DISTANZA_EXTRA_VMIN = 32; // casuale in più, sopra il minimo
const CADUTA_MIN_VMIN = 14; // di quanto cala il pezzo nell'ultima parte dell'animazione
const CADUTA_EXTRA_VMIN = 12;
const GIRO_TOTALE_GRADI = 900; // il pezzo ruota a caso tra -450 e +450 gradi
const DURATA_MIN_S = 1.3; // durata dell'animazione di un pezzo (--durata-pezzo in style.css)
const DURATA_EXTRA_S = 0.6;
const RETE_DI_SICUREZZA_MS = 3000; // oltre la durata massima: toglie i pezzi se animationend non arriva

/**
 * Lo scoppio di coriandoli all'Ingresso riuscito: una sola volta per caricamento della pagina,
 * mai con il movimento ridotto. I pezzi vanno nello strato statico `.scoppio` (index.html), che
 * non è nella scheda ridisegnata, e vengono tolti appena finiscono l'animazione.
 */
function scoppio() {
  if (scoppioFatto) return;
  scoppioFatto = true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const strato = document.querySelector('.scoppio');
  if (!strato) return;

  const pezzi = [];
  for (let i = 0; i < PEZZI_SCOPPIO; i += 1) {
    const angolo = (ANGOLO_MIN_GRADI + Math.random() * ANGOLO_AMPIEZZA_GRADI) * (Math.PI / 180);
    const distanza = DISTANZA_MIN_VMIN + Math.random() * DISTANZA_EXTRA_VMIN;
    const colore = `c${i % CLASSI_COLORE}`;
    const forma = i % FORMA_TONDA_OGNI === 0 ? ' tondo' : '';
    const pezzo = crea('span', undefined, `pezzo ${colore}${forma}`);
    pezzo.style.setProperty('--dx', `${(Math.cos(angolo) * distanza).toFixed(1)}vmin`);
    pezzo.style.setProperty('--dy', `${(Math.sin(angolo) * distanza).toFixed(1)}vmin`);
    pezzo.style.setProperty('--caduta', `${(CADUTA_MIN_VMIN + Math.random() * CADUTA_EXTRA_VMIN).toFixed(1)}vmin`);
    pezzo.style.setProperty('--giro', `${Math.round((Math.random() - 0.5) * GIRO_TOTALE_GRADI)}deg`);
    pezzo.style.setProperty('--durata-pezzo', `${(DURATA_MIN_S + Math.random() * DURATA_EXTRA_S).toFixed(2)}s`);
    pezzo.addEventListener('animationend', () => pezzo.remove(), { once: true });
    pezzi.push(pezzo);
  }
  strato.append(...pezzi);
  setTimeout(() => pezzi.forEach((pezzo) => pezzo.remove()), RETE_DI_SICUREZZA_MS);
}

/** Un countdown che si aggiorna sul posto; `leggi(vista)` restituisce il Tempo (o il testo finale) da mostrare. */
function countdown(etichetta, leggi) {
  const { elemento, aggiorna } = creaTempoMancante(etichetta);
  elemento.id = 'countdown';
  aggiornaCountdown = (vista) => aggiorna(leggi(vista));
  return elemento;
}

/** Una Voce del Menù: il nome seguito dalla Nota. Solo testo (textContent), mai HTML interpretato. */
function voceDelMenu({ nome, nota }) {
  const voce = crea('li');
  voce.append(crea('strong', nome, 'voce-nome'), crea('em', nota, 'voce-nota'));
  return voce;
}

/**
 * Una Sezione del Menù sbloccato: una tessera (<li> dell'elenco ordinato) con titolo, sottotitolo e
 * l'elenco delle sue Voci. Numero e colore vengono dalla posizione, via CSS (src/style.css).
 */
function sezioneDelMenu({ titolo, sottotitolo, voci }) {
  const tessera = crea('li', undefined, 'menu-sezione');
  const corpo = crea('div', undefined, 'menu-corpo');
  const elenco = crea('ul', undefined, 'menu-voci');
  elenco.setAttribute('role', 'list');
  elenco.append(...voci.map(voceDelMenu));
  corpo.append(crea('h3', titolo), crea('p', sottotitolo, 'menu-sottotitolo'), elenco);
  tessera.append(corpo);
  return tessera;
}

/**
 * La sezione Menù: finché è bloccata mostra solo il teaser con il countdown allo
 * sblocco; dall'istante di sblocco mostra "Si mangia così" e tutte le sezioni (titolo, sottotitolo e voci con nota)
 * come tessere numerate. Si aggiorna sul posto
 * (`aggiornaMenu`), quindi passa da teaser a contenuto senza ridisegnare la pagina.
 */
function sezioneMenu() {
  const sezione = crea('section', undefined, 'menu');
  let sbloccatoMostrato; // assente finché la sezione non è stata disegnata
  let aggiornaTempo = () => {};

  aggiornaMenu = ({ menu }) => {
    if (menu.sbloccato !== sbloccatoMostrato) {
      sbloccatoMostrato = menu.sbloccato;
      if (menu.sbloccato) {
        aggiornaTempo = () => {};
        const elenco = crea('ol', undefined, 'menu-sezioni');
        elenco.setAttribute('role', 'list'); // con list-style: none Safari toglie la semantica di elenco
        elenco.append(...menu.sezioni.map(sezioneDelMenu));
        sezione.replaceChildren(crea('h2', 'Si mangia così', 'menu-titolo'), elenco);
      } else {
        const titolo = crea('h2', 'Menù');
        const { elemento, aggiorna } = creaTempoMancante('Tempo che manca allo sblocco del Menù');
        aggiornaTempo = aggiorna;
        sezione.replaceChildren(titolo, crea('p', 'Il Menù è ancora un segreto. Si sblocca tra:'), elemento);
      }
    }
    if (!menu.sbloccato) aggiornaTempo(menu.manca);
  };
  return sezione;
}

/** L'Ingresso: campo del nome con etichetta, più l'eventuale messaggio di rifiuto. */
function modulo(messaggioRifiuto) {
  const form = crea('form', undefined, 'ingresso');
  form.noValidate = true;

  const etichetta = crea('label', 'Il tuo nome');
  etichetta.htmlFor = 'nome';
  const campo = crea('input');
  campo.id = 'nome';
  campo.name = 'nome';
  campo.type = 'text';
  campo.autocomplete = 'off';
  campo.autocapitalize = 'words';
  campo.spellcheck = false;
  const bottone = crea('button', 'Entra');
  bottone.type = 'submit';

  form.append(etichetta, campo, bottone);
  if (messaggioRifiuto) {
    const rifiuto = crea('div', undefined, 'rifiuto');
    rifiuto.setAttribute('role', 'alert');
    rifiuto.append(crea('strong', 'Ingresso negato'), crea('span', messaggioRifiuto));
    form.append(rifiuto);
  }

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    nomeScritto = campo.value;
    nomeDaMemoria = false;
    tentativo += 1;
    disegna(true);
  });
  return { form, campo };
}

/** Il link "non sei tu?": cancella il nome ricordato e riporta all'Ingresso. */
function nonSeiTu() {
  const bottone = crea('button', 'non sei tu?', 'non-sei-tu');
  bottone.type = 'button';
  bottone.addEventListener('click', () => {
    memoria.dimentica();
    nomeScritto = undefined;
    nomeDaMemoria = false;
    disegna(true);
  });
  return bottone;
}

/** La riga di stato in alto: spia, etichetta "Lista invitati" e un timbro che dice a che punto siamo. */
function rigaDiStato(testoTimbro, riconosciuto = false) {
  const spia = crea('span', undefined, 'spia');
  spia.setAttribute('aria-hidden', 'true');
  const etichetta = crea('p', undefined, 'etichetta');
  etichetta.append(spia, 'Lista invitati');
  const timbro = crea('p', testoTimbro, riconosciuto ? 'timbro timbro-ok' : 'timbro');
  const riga = crea('div', undefined, 'stato');
  riga.append(etichetta, timbro);
  return riga;
}

function disegnaVista(vista) {
  const titolo = crea('h1', 'Un invito a cena');
  const contenuto = [titolo, crea('p', 'per festeggiare il mio compleanno', 'sottotitolo')];
  let riga;
  let campoDaFocalizzare;

  switch (vista.kind) {
    case 'chiuso':
      riga = rigaDiStato('Ancora chiuso');
      contenuto.push(
        crea('p', "L'Invito non è ancora aperto: stiamo ancora gonfiando i palloncini."),
        crea('p', 'Torna tra:', 'didascalia'),
        countdown("Tempo che manca all'apertura dell'Invito", (v) => v.mancaAllApertura),
      );
      break;
    case 'ingresso':
    case 'rifiutato': {
      riga = rigaDiStato(vista.kind === 'rifiutato' ? 'Non in lista' : 'Solo invitati');
      contenuto.push(crea('p', 'Festa a numero chiuso. Scrivi il tuo nome per entrare: niente password, ci fidiamo (quasi).'));
      const { form, campo } = modulo(vista.kind === 'rifiutato' ? vista.messaggio : undefined);
      contenuto.push(form);
      campoDaFocalizzare = campo;
      break;
    }
    case 'dentro': {
      riga = rigaDiStato('Sei in lista!', true);
      const didascalia = crea('p', 'Alla cena mancano:', 'didascalia');
      const conto = countdown('Tempo che manca alla cena', (v) => (v.cena.siMangia ? v.cena.messaggio : v.cena.manca));
      const aggiornaTempoCena = aggiornaCountdown;
      aggiornaCountdown = (v) => {
        aggiornaTempoCena(v);
        didascalia.hidden = v.cena.siMangia; // "Si mangia!" non ha bisogno di didascalia
      };
      contenuto.push(crea('p', vista.messaggio, 'messaggio'), didascalia, conto, sezioneMenu(), nonSeiTu());
      break;
    }
  }

  radice.replaceChildren(riga, ...contenuto);
  return campoDaFocalizzare;
}

/**
 * Ricalcola la vista. Ridisegna tutto solo se la vista è cambiata (o dopo un
 * tentativo all'Ingresso); altrimenti aggiorna sul posto il countdown, così
 * il tick di ogni secondo non cancella quello che l'Invitato sta scrivendo.
 */
function disegna(dopoTentativo = false) {
  const vista = computeView(config, adesso(), nomeScritto);
  if (vista.kind === 'rifiutato' && nomeDaMemoria) {
    // Il nome ricordato non è più in lista: lo si dimentica e si torna all'Ingresso.
    memoria.dimentica();
    nomeScritto = undefined;
    nomeDaMemoria = false;
    return disegna(dopoTentativo);
  }
  if (vista.kind === 'dentro' && dopoTentativo && !nomeDaMemoria) {
    memoria.salva(nomeScritto); // solo dopo un Ingresso riuscito
    scoppio(); // e solo qui: un nome ricordato o il tick non lo fanno partire
  }
  const chiave = `${vista.kind}:${vista.kind === 'dentro' ? vista.messaggio : tentativo}`;
  if (chiave !== chiaveDisegnata) {
    chiaveDisegnata = chiave;
    aggiornaCountdown = () => {};
    aggiornaMenu = () => {};
    const campo = disegnaVista(vista);
    if (campo && dopoTentativo) campo.focus();
  }
  aggiornaCountdown(vista);
  if (vista.kind === 'dentro') {
    aggiornaMenu(vista);
  }
}

try {
  disegna();
  setInterval(disegna, 1000);
} catch (errore) {
  // Configurazione non valida (per esempio Invitati duplicati): errore chiaro a schermo.
  radice.replaceChildren(crea('h1', 'Invito non disponibile'), crea('p', errore.message));
  throw errore;
}
