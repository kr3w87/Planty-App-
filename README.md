# Planty V3.4 – Dauerhafter Pflegeverlauf

V3.4 speichert Gießen, Düngen und Überspringen dauerhaft in Supabase über die neue Tabelle `plant_care_logs`. Der Pflegekalender kombiniert diese Pflegeaktionen mit Wachstumsfotos und Gesundheitsbeobachtungen.

## Einrichten
1. In Supabase SQL Editor die Datei `supabase-v3.4-care-log.sql` ausführen.
2. Danach `index.html` öffnen bzw. auf GitHub Pages deployen.
3. Bereits vorhandene lokale V3.0/V3.3-Pflegeeinträge werden beim ersten Login automatisch nach Supabase übernommen.

Ohne die neue Tabelle bleibt Planty als Fallback mit lokalem Pflegeverlauf funktionsfähig.
