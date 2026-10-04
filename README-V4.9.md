# Planty V4.9 · Pflanze löschen

- Pflanze kann direkt in der Detailansicht gelöscht werden.
- Vor dem Löschen erscheint eine Bestätigung.
- Entfernt Pflanze, Pflegeverlauf, Gesundheitschecks und Fotometadaten.
- Zugehörige Bilddateien im Supabase-Fotospeicher werden ebenfalls zur Löschung angefordert.
- Lokale Favoriten, Lichtmessungen und Journal-Einträge der Pflanze werden bereinigt.
- Nach dem Löschen wird die Übersicht automatisch aktualisiert.


## V4.9.1 – Login-Fix
- Session-Fehler blockieren die App nicht mehr.
- Netzwerk-/Supabase-Fehler werden verständlicher angezeigt.
- Cache-Version auf 4.9.1 angehoben.
- Login- und Löschfunktion von V4.9 bleiben erhalten.
