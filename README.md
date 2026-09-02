# Planty V2.3 – große Pflanzen-Datenbank

Enthält 91 Pflanzen mit:
- deutschem Namen
- botanischem Namen
- Lichtbedarf
- Start-Gießintervall
- Start-Düngeintervall

`plant-database.js` ist absichtlich separat gehalten. Dadurch kann die bestehende Planty-App die Datenbank übernehmen, ohne die Supabase-Struktur zu verändern.

Hinweis: Pflegeintervalle sind Startwerte und sollten je nach Standort, Topf, Substrat, Jahreszeit und Pflanze angepasst werden.
