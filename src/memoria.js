// Memoria del nome dell'Invitato nel browser (localStorage).
// Vive nello strato di presentazione: la funzione di vista non la tocca mai.
//
// Lo storage arriva da una funzione `ottieniStorage`, così si può iniettare uno
// storage finto nei test e il solo accesso a `window.localStorage` (che in alcuni
// browser lancia se è bloccato) resta dentro il try/catch. Qualunque errore
// significa "nessuna memoria": la pagina funziona lo stesso.

const CHIAVE = 'the-dinner:nome';

/**
 * @param {() => Storage | undefined} ottieniStorage
 * @returns {{ leggi(): string | undefined, salva(nome: string): void, dimentica(): void }}
 */
export function creaMemoria(ottieniStorage) {
  /** Esegue `azione(storage)`; se lo storage manca o lancia, restituisce undefined. */
  function provaCon(azione) {
    try {
      const storage = ottieniStorage();
      return storage ? azione(storage) : undefined;
    } catch {
      return undefined;
    }
  }

  return {
    /** Il nome salvato, oppure undefined se non c'è (o lo storage non è disponibile). */
    leggi: () => provaCon((s) => s.getItem(CHIAVE)) ?? undefined,
    salva: (nome) => void provaCon((s) => s.setItem(CHIAVE, nome)),
    dimentica: () => void provaCon((s) => s.removeItem(CHIAVE)),
  };
}
