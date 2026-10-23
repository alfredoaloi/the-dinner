import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Garanzia di leggibilità della palette: legge le variabili colore da src/style.css
// (blocco :root) e controlla le coppie principali contro le soglie WCAG 2.x.
// Non guarda nomi di classi né dove i colori sono usati: se cambi un colore, questo
// test dice se la leggibilità è ancora garantita.

const TESTO_NORMALE = 4.5; // testo normale
const TESTO_GRANDE_E_BORDI = 3; // testo grande, bordi dei campi, anello del focus

function leggiPalette() {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  const radice = css.match(/:root\s*\{([^}]*)\}/);
  assert.ok(radice, 'src/style.css deve avere un blocco :root con le variabili colore');
  const palette = {};
  for (const [, nome, valore] of radice[1].matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    palette[nome] = valore;
  }
  return palette;
}

function luminanza(esadecimale) {
  const n = parseInt(esadecimale.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((canale) => {
    const c = canale / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrasto(a, b) {
  const [chiaro, scuro] = [luminanza(a), luminanza(b)].sort((x, y) => y - x);
  return (chiaro + 0.05) / (scuro + 0.05);
}

function colore(palette, nome) {
  assert.ok(palette[nome], `manca la variabile colore --${nome} in :root di src/style.css`);
  return palette[nome];
}

function verifica(palette, descrizione, primo, secondo, soglia) {
  const valore = contrasto(colore(palette, primo), colore(palette, secondo));
  assert.ok(
    valore >= soglia,
    `${descrizione}: --${primo} su --${secondo} ha contrasto ${valore.toFixed(2)}:1, ne servono almeno ${soglia}:1`,
  );
}

test('il calcolo del contrasto torna sui valori noti di WCAG', () => {
  assert.equal(Math.round(contrasto('#000000', '#ffffff') * 100) / 100, 21);
  assert.equal(Math.round(contrasto('#ffffff', '#ffffff') * 100) / 100, 1);
  // grigio #767676 su bianco: il classico caso limite da 4.54:1
  assert.equal(Math.round(contrasto('#767676', '#ffffff') * 100) / 100, 4.54);
});

test('il testo e il testo tenue sono leggibili sulla scheda', () => {
  const palette = leggiPalette();
  verifica(palette, 'testo su scheda', 'testo', 'carta', TESTO_NORMALE);
  verifica(palette, 'testo su scheda in rilievo', 'testo', 'carta-alta', TESTO_NORMALE);
  verifica(palette, 'testo tenue su scheda', 'tenue', 'carta', TESTO_NORMALE);
  verifica(palette, 'testo tenue su scheda in rilievo', 'tenue', 'carta-alta', TESTO_NORMALE);
});

test('il testo dei pulsanti è leggibile sul colore del pulsante', () => {
  const palette = leggiPalette();
  verifica(palette, 'testo del pulsante', 'su-bottone', 'bottone', TESTO_NORMALE);
});

test('i bordi dei campi si vedono sulla scheda', () => {
  const palette = leggiPalette();
  verifica(palette, 'bordo del campo su scheda', 'bordo-campo', 'carta', TESTO_GRANDE_E_BORDI);
  verifica(palette, 'bordo del campo su scheda in rilievo', 'bordo-campo', 'carta-alta', TESTO_GRANDE_E_BORDI);
});

test("l'anello del focus si vede su scheda, scheda in rilievo e sfondo della pagina", () => {
  const palette = leggiPalette();
  verifica(palette, 'focus su scheda', 'focus', 'carta', TESTO_GRANDE_E_BORDI);
  verifica(palette, 'focus su scheda in rilievo', 'focus', 'carta-alta', TESTO_GRANDE_E_BORDI);
  verifica(palette, 'focus su sfondo', 'focus', 'sfondo', TESTO_GRANDE_E_BORDI);
});

test("il messaggio di rifiuto è leggibile e il suo bordo si vede", () => {
  const palette = leggiPalette();
  verifica(palette, 'testo del rifiuto', 'negato', 'negato-sfondo', TESTO_NORMALE);
  verifica(palette, 'bordo del rifiuto (stesso colore del testo)', 'negato', 'carta', TESTO_GRANDE_E_BORDI);
});

test('gli accenti usati come testo sono leggibili sulla scheda', () => {
  const palette = leggiPalette();
  for (const accento of ['viola', 'corallo-scuro', 'turchese-scuro']) {
    verifica(palette, `accento ${accento} usato come testo`, accento, 'carta', TESTO_NORMALE);
  }
});

test('il testo bianco sulla tessera viola del Menù è leggibile', () => {
  const palette = leggiPalette();
  verifica(palette, 'testo bianco su tessera viola', 'carta', 'viola', TESTO_NORMALE);
});

test('il testo sulle tessere colorate del countdown è leggibile', () => {
  const palette = leggiPalette();
  for (const fondo of ['corallo', 'giallo', 'turchese', 'rosa']) {
    verifica(palette, `testo su tessera ${fondo}`, 'testo', fondo, TESTO_NORMALE);
  }
});
