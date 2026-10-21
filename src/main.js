// Strato di presentazione dell'Invito: sottile e senza test.
// Legge URL e orologio, chiede la vista a computeView e la disegna.
// Il nome scritto all'Ingresso vive solo in memoria (il salvataggio nel browser è un altro ticket).
import { config } from './config.js';
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

let nomeScritto;
let tentativo = 0;
let chiaveDisegnata;
let aggiornaCountdown = () => {};

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
    tentativo += 1;
    disegna(true);
  });
  return { form, campo };
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
  const chiave = `${vista.kind}:${vista.kind === 'dentro' ? vista.messaggio : tentativo}`;
  if (chiave !== chiaveDisegnata) {
    chiaveDisegnata = chiave;
    aggiornaCountdown = () => {};
    const campo = disegnaVista(vista);
    if (campo && dopoTentativo) campo.focus();
  }
  aggiornaCountdown(vista);
}

try {
  disegna();
  setInterval(disegna, 1000);
} catch (errore) {
  // Configurazione non valida (per esempio Invitati duplicati): errore chiaro a schermo.
  radice.replaceChildren(crea('h1', 'Invito non disponibile'), crea('p', errore.message));
  throw errore;
}
