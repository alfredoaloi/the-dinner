// Strato di presentazione dell'Invito: sottile e senza test.
// Legge URL e orologio, chiede la vista a computeView e la disegna.
// Il nome dell'Invitato è ricordato nel browser (src/memoria.js) solo dopo un Ingresso riuscito.
import { config } from './config.js';
import { creaMemoria } from './memoria.js';
import { computeView } from './view.js';
import { creaTempoMancante } from './tempo.js';

/**
 * Orologio dell'Invito. Con `?now=<data ISO>` valida, l'istante indicato è il
 * punto di partenza e poi il tempo scorre a velocità reale; altrimenti ora reale.
 */
function creaOrologio(ricerca) {
  const simulato = Date.parse(new URLSearchParams(ricerca).get('now') ?? '');
  if (Number.isNaN(simulato)) {
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
let chiaveDisegnata;
let aggiornaCountdown = () => {};
let aggiornaMenu = () => {};

function crea(tag, testo, classe) {
  const el = document.createElement(tag);
  if (testo !== undefined) el.textContent = testo;
  if (classe) el.className = classe;
  return el;
}

/** Un countdown che si aggiorna sul posto; `leggi(vista)` restituisce il Tempo (o il testo finale) da mostrare. */
function countdown(etichetta, leggi) {
  const { elemento, aggiorna } = creaTempoMancante(etichetta);
  elemento.id = 'countdown';
  aggiornaCountdown = (vista) => aggiorna(leggi(vista));
  return elemento;
}

/**
 * La sezione Menù: finché è bloccata mostra solo il teaser con il countdown allo
 * sblocco; dall'istante di sblocco mostra il contenuto. Si aggiorna sul posto
 * (`aggiornaMenu`), quindi passa da teaser a contenuto senza ridisegnare la pagina.
 */
function sezioneMenu() {
  const sezione = crea('section', undefined, 'menu');
  let sbloccatoMostrato; // assente finché la sezione non è stata disegnata
  let aggiornaTempo = () => {};

  aggiornaMenu = ({ menu }) => {
    if (menu.sbloccato !== sbloccatoMostrato) {
      sbloccatoMostrato = menu.sbloccato;
      const titolo = crea('h2', 'Menù');
      if (menu.sbloccato) {
        aggiornaTempo = () => {};
        sezione.replaceChildren(titolo, crea('p', menu.contenuto));
      } else {
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
    const rifiuto = crea('p', messaggioRifiuto, 'rifiuto');
    rifiuto.setAttribute('role', 'alert');
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

function disegnaVista(vista) {
  const titolo = crea('h1', 'Un invito a cena');
  const etichetta = crea('p', 'Area riservata', 'etichetta');
  const contenuto = [etichetta, titolo];
  let campoDaFocalizzare;

  switch (vista.kind) {
    case 'chiuso':
      contenuto.push(
        crea('p', "L'Invito non è ancora aperto. Torna tra:"),
        countdown("Tempo che manca all'apertura dell'Invito", (v) => v.mancaAllApertura),
      );
      break;
    case 'ingresso':
    case 'rifiutato': {
      contenuto.push(crea('p', 'Scrivi il tuo nome per entrare.'));
      const { form, campo } = modulo(vista.kind === 'rifiutato' ? vista.messaggio : undefined);
      contenuto.push(form);
      campoDaFocalizzare = campo;
      break;
    }
    case 'dentro':
      contenuto.push(
        crea('p', vista.messaggio, 'messaggio'),
        countdown('Tempo che manca alla cena', (v) => (v.cena.siMangia ? v.cena.messaggio : v.cena.manca)),
        sezioneMenu(),
        nonSeiTu(),
      );
      break;
  }

  radice.replaceChildren(...contenuto);
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
  if (vista.kind === 'dentro') aggiornaMenu(vista);
}

try {
  disegna();
  setInterval(disegna, 1000);
} catch (errore) {
  // Configurazione non valida (per esempio Invitati duplicati): errore chiaro a schermo.
  radice.replaceChildren(crea('h1', 'Invito non disponibile'), crea('p', errore.message));
  throw errore;
}
