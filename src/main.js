// Pagina segnaposto dell'Invito: mostra solo il countdown alla cena.
// Le viste vere (chiuso, Ingresso, Invitato) arrivano con i ticket successivi.
import { config } from './config.js';

const elemento = document.getElementById('countdown');
const cena = Date.parse(config.cena);

function aggiorna() {
  const mancano = Math.max(0, cena - Date.now());
  if (mancano === 0) {
    elemento.textContent = config.messaggioFinale;
    return;
  }
  const secondiTotali = Math.floor(mancano / 1000);
  const giorni = Math.floor(secondiTotali / 86400);
  const ore = Math.floor((secondiTotali % 86400) / 3600);
  const minuti = Math.floor((secondiTotali % 3600) / 60);
  const secondi = secondiTotali % 60;
  elemento.textContent = `${giorni}g ${ore}h ${minuti}m ${secondi}s`;
}

aggiorna();
setInterval(aggiorna, 1000);
