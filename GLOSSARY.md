# The Dinner

Un sito vetrina statico che funge da invito a una cena di compleanno a casa dell'autore, condiviso con gli amici. Divertente, senza backend e senza account.

## Language

**Invito**:
Il sito stesso: la pagina che gli amici ricevono come invito alla cena.
_Avoid_: App, portale, sito web (nel codice e nei testi)

**Festeggiato**:
La persona di cui è il compleanno. Oggi coincide con l'autore, che è anche il padrone di casa. Il focus dell'Invito resta la cena, non il compleanno.
_Avoid_: Ospite d'onore, compleanno-boy

**Invitato**:
Una persona in lista, definita da un solo nome principale e da un Messaggio personalizzato. Non ha alias.
_Avoid_: Utente, ospite, account, user

**Ingresso**:
Il finto login: il cancello iniziale dove l'Invitato scrive il proprio nome. Non c'è nessuna autenticazione. Un nome non in lista non entra.
_Avoid_: Login, accesso, autenticazione

**Messaggio personalizzato**:
Il testo mostrato a un Invitato dopo l'Ingresso, diverso per ognuno.
_Avoid_: Saluto, benvenuto

**Apertura**:
L'istante in cui l'Invito smette di essere chiuso e l'Invitato può passare dall'Ingresso. Prima, l'Invito mostra solo il countdown all'Apertura. Si esprime in giorni prima della cena.
_Avoid_: Lancio, apertura del sito

**Menù**:
La parte dell'Invito, visibile solo a un Invitato entrato, che dice cosa si mangia e si beve: una lista ordinata di Sezioni, ognuna con le sue Voci. Resta un teaser con countdown fino allo Sblocco; poi si intitola "Si mangia così" (da non confondere con il `messaggioFinale` "Si mangia!", che compare alla cena).
_Avoid_: Carta, programma

**Sezione**:
Un gruppo ordinato del Menù (per esempio Antipasti): ha un titolo, un sottotitolo corto e una o più Voci. Titolo e sottotitolo sono obbligatori, e la posizione nella lista è l'ordine della cena.
_Avoid_: Portata, categoria, tessera (la tessera è solo l'aspetto grafico di una Sezione)

**Sottotitolo**:
La battuta corta sotto il titolo di una Sezione (per esempio "il round più lungo"). Obbligatorio, come il titolo.
_Avoid_: Descrizione, slogan, occhiello

**Voce**:
Un piatto o una bevanda dentro una Sezione: ha un nome e una Nota, entrambi obbligatori.
_Avoid_: Piatto, elemento, riga

**Nota**:
La battuta breve sotto il nome di una Voce. È la stessa per tutti gli Invitati, anche quando cita qualcuno per nome.
_Avoid_: Descrizione, commento, didascalia

**Sblocco**:
L'istante in cui il Menù passa da teaser a contenuto. Si esprime in giorni prima della cena, alla stessa ora della cena.
_Avoid_: Rivelazione, uscita
