# Aktien-Planspiel fuer den Vortrag

Die Website ist jetzt komplett statisch und GitHub-Pages-tauglich:

- `index.html` fuer die Auswahl auf den Handys
- `results.html` fuer den persoenlichen Depotvergleich
- `dashboard.html` fuer dein Sammelgeraet mit Saeulendiagramm

## Bedienung

- Pro Aktie wird nur mit ganzen Aktien gearbeitet.
- Jede Person oeffnet ihren `Depotvergleich`.
- Auf der Ergebnis-Seite wird ein Sammelcode erzeugt.
- Auf deinem Sammelgeraet fuegst du diesen Code in `dashboard.html` ein.
- Das Sammelgeraet zeigt alle importierten Gewinne und Verluste als Saeulendiagramm.

## Starten

```powershell
python -m http.server 8080
```

Danach im Browser aufrufen:

- `http://127.0.0.1:8080/` fuer die Teilnehmer
- `http://127.0.0.1:8080/dashboard.html` fuer dein Sammelgeraet

## GitHub Pages

Du kannst die komplette Website statisch auf GitHub Pages hosten. Es wird kein Server und keine Datenbank benoetigt.

Praktischer Ablauf:

1. Publikum benutzt die GitHub-Seite
2. Jeder erzeugt auf `results.html` seinen Sammelcode
3. Du oeffnest `dashboard.html` auf einem einzigen Geraet
4. Dort fuegst du die Codes nacheinander ein

Das muss nicht live passieren. Die importierten Codes bleiben auf dem Sammelgeraet im Browser gespeichert.

## Dateien

- `index.html` enthaelt die Auswahlseite
- `results.html` enthaelt den persoenlichen Depotvergleich und den Sammelcode
- `dashboard.html` enthaelt das Live-Dashboard
- `styles.css` enthaelt das Layout
- `app.js` enthaelt die Auswahl- und Budgetlogik
- `results.js` erzeugt das Diagramm und den Sammelcode
- `dashboard.js` importiert Sammelcodes und zeigt das Saeulendiagramm
- `submission-codec.js` kodiert und dekodiert Sammelcodes
- `data.js` enthaelt die Aktien und Jahreskurse

## Daten anpassen

Wenn du spaeter andere Vergleichskurse verwenden willst, kannst du sie direkt in `data.js` unter `prices` anpassen.
