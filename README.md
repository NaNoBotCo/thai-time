# Telling Time in Thai · บอกเวลาแบบไทย

How Thai people tell time, drawn live, in English and Thai.

https://nanobotco.github.io/thai-time/ · https://nanobotco.github.io/thai-time/th/

- `tools/copy_text.py` holds all copy (EN + TH) and the data: the 24 hour names with readings and the 1900 Royal Gazette list, the sixteen Lanna watches, the วันไท names. `tools/build.py` writes `docs/index.html`, `docs/th/index.html`, `llms.txt`, `sitemap.xml`, `robots.txt` and `icon.svg`.
- `docs/app.js`: the 24-hour dial (hero and Say it), Web Audio gong, drum, bell and horn, the quiz, the floating coconut clock (Torricelli inflow into a half-sphere shell), the Lanna watch ring, the วันไท gears (anchored on 1 Jan 2022 = กาบยี from the 2022 RMUTL Lanna calendar), and sun time from the NOAA equations.
- `?t=HH:MM` fixes the moment; `?card&t=14:30` at 1200×630 renders the share card (`docs/card.jpg`).
- Pictures: public domain, Wikimedia Commons (`tools/credits.json`).

Text CC BY 4.0, NaNoBotCo. Code MIT.
