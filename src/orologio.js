// Lettura del parametro `?now=` che simula la data corrente.
// Funzione pura: accetta solo una data o data-ora ISO 8601, non tutto ciò che
// Date.parse tollera (per esempio `1` o `2026` non sono date valide qui).

const ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;

/** Millisecondi dell'istante indicato, oppure `undefined` se il testo non è una data ISO valida. */
export function leggiIstanteSimulato(testo) {
  if (typeof testo !== 'string' || !ISO.test(testo)) return undefined;
  const ms = Date.parse(testo);
  return Number.isNaN(ms) ? undefined : ms;
}
