# Aktien-Planspiel fuer den Vortrag

Die Website ist jetzt auf automatische Uebertragung umgestellt:

- `index.html` fuer die Auswahl auf den Handys
- `results.html` fuer den persoenlichen Depotvergleich mit automatischem Senden
- `dashboard.html` fuer dein Live-Dashboard auf deinem Rechner

## Bedienung

- Pro Aktie wird nur mit ganzen Aktien gearbeitet.
- Jede Person oeffnet ihren `Depotvergleich`.
- Die Ergebnis-Seite sendet automatisch an dein Dashboard.
- Dein Dashboard auf dem Rechner aktualisiert sich selbst.

## Starten

```powershell
node server.js
```

Danach im Browser aufrufen:

- `https://brokkoli17.github.io/aktien-planspiel/` fuer die Teilnehmer
- `http://127.0.0.1:8787/dashboard.html` fuer dein Live-Dashboard

## Wichtiger Hinweis

Damit die automatische Uebertragung von der GitHub-Seite zu deinem Rechner funktioniert, braucht dein lokaler Dashboard-Server eine erreichbare `https`-Adresse. Diese richte ich ueber einen Tunnel ein.

Vor jedem Vortrag sollte deshalb laufen:

1. `node server.js`
2. Tunnel starten
3. `config.js` mit der Tunnel-URL in GitHub Pages aktualisieren

## Dateien

- `index.html` enthaelt die Auswahlseite
- `results.html` enthaelt den persoenlichen Depotvergleich
- `dashboard.html` enthaelt das Live-Dashboard
- `styles.css` enthaelt das Layout
- `app.js` enthaelt die Auswahl- und Budgetlogik
- `results.js` erzeugt das Diagramm und sendet automatisch
- `dashboard.js` laedt automatisch alle Einsendungen
- `config.js` enthaelt die Zieladresse des Sammelservers
- `server.js` ist dein lokaler Sammelserver
- `data.js` enthaelt die Aktien und Jahreskurse

## Daten anpassen

Wenn du spaeter andere Vergleichskurse verwenden willst, kannst du sie direkt in `data.js` unter `prices` anpassen.
