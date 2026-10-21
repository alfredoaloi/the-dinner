// Visualizzazione del tempo mancante (giorni, ore, minuti, secondi).
// Riusabile da ogni sezione: countdown alla cena, teaser di Curiosità e Menù, Invito chiuso.
// Sta nello strato di presentazione: tocca il DOM, ma non l'orologio né lo storage.
//
// creaTempoMancante(etichetta) -> { elemento, aggiorna }
//   etichetta  nome accessibile e STATICO del countdown (es. "Tempo che manca alla cena")
//   aggiorna(x)  x è un Tempo ({ giorni, ore, minuti, secondi }) oppure un testo
//                (es. "Si mangia!"). Va chiamato a ogni tick: scrive nel DOM solo
//                ciò che è cambiato.
//
// Accessibilità: l'elemento NON è una regione live (niente aria-live, niente role="timer"),
// quindi i lettori di schermo non annunciano i secondi che scorrono; chi naviga
// fino al countdown ne legge l'etichetta statica e il valore corrente.

const UNITA = [
  { chiave: 'giorni', singolare: 'giorno', plurale: 'giorni' },
  { chiave: 'ore', singolare: 'ora', plurale: 'ore' },
  { chiave: 'minuti', singolare: 'minuto', plurale: 'minuti' },
  { chiave: 'secondi', singolare: 'secondo', plurale: 'secondi' },
];

function creaUnita({ chiave }) {
  const cella = document.createElement('span');
  cella.className = 'unita';
  const valore = document.createElement('span');
  valore.className = 'valore';
  const nome = document.createElement('span');
  nome.className = 'nome-unita';
  cella.append(valore, ' ', nome);
  return { chiave, cella, valore, nome };
}

export function creaTempoMancante(etichetta) {
  const elemento = document.createElement('div');
  elemento.className = 'countdown';
  elemento.setAttribute('role', 'group');
  elemento.setAttribute('aria-label', etichetta);

  const celle = UNITA.map((unita) => ({ ...unita, ...creaUnita(unita) }));
  let mostraTesto = true; // forza il primo disegno
  let testoMostrato;

  function aggiorna(tempoOTesto) {
    if (typeof tempoOTesto === 'string') {
      if (!mostraTesto || tempoOTesto !== testoMostrato) elemento.textContent = tempoOTesto;
      elemento.classList.add('countdown-testo');
      mostraTesto = true;
      testoMostrato = tempoOTesto;
      return;
    }
    if (mostraTesto) {
      elemento.replaceChildren(...celle.flatMap((c) => [c.cella, ' ']));
      elemento.classList.remove('countdown-testo');
      mostraTesto = false;
    }
    for (const c of celle) {
      const n = tempoOTesto[c.chiave];
      const testo = String(n);
      if (c.valore.textContent !== testo) c.valore.textContent = testo;
      const nome = n === 1 ? c.singolare : c.plurale;
      if (c.nome.textContent !== nome) c.nome.textContent = nome;
    }
  }

  return { elemento, aggiorna };
}
