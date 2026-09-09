# Planty V3.0 – Pflanzentagebuch

Aufbauend auf V2.9.

## Neu
- Pflegeaktionen werden als persönlicher Verlauf protokolliert.
- Gießen und Düngen erzeugen nach erfolgreicher Supabase-Aktualisierung einen Tagebucheintrag.
- Übersprungene Aufgaben werden ebenfalls dokumentiert.
- Pflegeverlauf im Dashboard und in der Pflanzendetailansicht.
- Historie kann komplett geöffnet werden.
- Cache-Busting auf V3.0.

## Hinweis zur Speicherung
Die vorhandenen Supabase-Felder für `plants` werden weiterhin für den aktuellen Pflegezustand verwendet. Der neue Aktionsverlauf wird in `localStorage` des jeweiligen Browsers gespeichert. Dadurch ist V3.0 ohne zusätzliche Supabase-Migration sofort mit dem bestehenden Backend kompatibel; der Verlauf ist zunächst geräte-/browsergebunden.
