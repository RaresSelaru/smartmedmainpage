---
name: adauga-news-si-cta
description: >-
  Adaugă blocul „SmartMed News + CTA cont" (secțiunea de știri cu carusel orizontal urmată de
  secțiunea de creare cont) într-o pagină sau mai multe pagini ale proiectului. Folosește când
  utilizatorul cere să pună secțiunea de news și/sau cea de creare cont într-o pagină, să copieze
  aceste secțiuni din blog-principal în altă parte, sau să adauge „news + cta", „carouselul de
  news", „secțiunea de creare cont" sau „FinalCTASection" undeva în proiect. Declanșează
  întotdeauna dacă se menționează „SmartMed News", „news carousel", „creare cont", „FinalCTASection"
  sau combinații de tipul „news + cta" în contextul adăugării lor în altă pagină.
---

# Adaugă SmartMed News + CTA (creare cont)

Adaugă trei elemente consecutive, copiate din `blog-principal`:

1. **Arcadă/val teal** — bridge div cu `WaveSeparator fill="teal" variant="relaxed"` care creează tranziția vizuală de la fundalul crem la secțiunea teal de News
2. **SmartMed News** — carusel orizontal cu știri, componentă `HorizontalScrollSection`
3. **CTA creare cont** — secțiunea cu imaginea, citatul și butonul „Creează cont", componentă `FinalCTASection`

## Componentele

### Arcadă/val teal (bridge div)
Un `<div>` cu fundal crem și `WaveSeparator` teal care face tranziția vizuală de la secțiunea anterioară (crem) la secțiunea SmartMed News (teal). Se pune **imediat deasupra** `HorizontalScrollSection`:
```tsx
<div className="relative bg-smart-cream pb-36 sm:pb-48">
  <WaveSeparator fill="teal" variant="relaxed" />
</div>
```

Componentă: `WaveSeparator` din `src/components/ui/WaveSeparator.tsx`

### HorizontalScrollSection (SmartMed News)
Fișier: `src/components/home/HorizontalScrollSection.tsx`

Props exacte de folosit (identice cu cele din blog-principal):
```tsx
<HorizontalScrollSection
  bottomWave="cream"
  description="Anunțuri oficiale, modificări de calendar, evenimente și actualizări relevante pentru admiterea 2026."
  eyebrow="Mereu la curent"
  heading="SmartMed News"
  items={newsCarousel}
/>
```

### FinalCTASection
Fișier: `src/components/home/FinalCTASection.tsx`

Se folosește fără props:
```tsx
<FinalCTASection />
```

### Tranziție vizuală
- **Deasupra News**: bridge div-ul cu `WaveSeparator fill="teal" variant="relaxed"` creează valul teal pe fundal crem → tranziție lină în secțiunea teal de News.
- **Sub News**: `bottomWave="cream"` pe `HorizontalScrollSection` generează automat un wave separator crem la baza sa.
- **FinalCTASection** are fundal `bg-smart-cream`, deci tranziția e fără sudură — nu e nevoie de `WaveSeparator` suplimentar între ele.

Verifică totuși secțiunea **care urmează după `FinalCTASection`** (de obicei footer-ul) — dacă fontul/fundalul nu se îmbină lin, adaugă `<WaveSeparator />` adecvat (consultă skill-ul `adauga-arcada`).

**Important**: Dacă secțiunea de deasupra bridge div-ului **nu** are fundal crem (`bg-smart-cream`), ajustează fundalul bridge div-ului să se potrivească cu secțiunea anterioară.

## Importuri necesare

```tsx
import { FinalCTASection } from "@/components/home/FinalCTASection";
import { HorizontalScrollSection } from "@/components/home/HorizontalScrollSection";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import { newsCarousel } from "@/lib/site-config";
```

Adaugă-le **doar dacă nu există deja** în fișier (verifică înainte de a edita).

## Pași

1. **Identifică fișierul(ele) țintă** din promptul utilizatorului (page component sau page-content component).
   - Dacă nu e clar, întreabă care pagină/fișier.

2. **Citește fișierul** cu `Read` ca să înțelegi structura JSX și să știi după ce element inserezi.

3. **Inserează blocul** după elementul indicat (sau la sfârșitul listei de secțiuni, înainte de `</>` sau `</>`):
   ```tsx
   <div className="relative bg-smart-cream pb-36 sm:pb-48">
     <WaveSeparator fill="teal" variant="relaxed" />
   </div>
   <HorizontalScrollSection
     bottomWave="cream"
     description="Anunțuri oficiale, modificări de calendar, evenimente și actualizări relevante pentru admiterea 2026."
     eyebrow="Mereu la curent"
     heading="SmartMed News"
     items={newsCarousel}
   />
   <FinalCTASection />
   ```

4. **Adaugă importurile** la bloc (în ordine alfabetică față de importurile existente, respectă convenția din fișier).

5. **Repetă** pentru fiecare pagină țintă dacă sunt mai multe.

## Verificare

- Pornește dev server-ul (sau reîncarcă) și navighează la pagina modificată.
- Scrollează jos: trebuie să apară valul teal, apoi caruselul SmartMed News, urmat de secțiunea cu citatul și butonul „Creează cont".
- Verifică tranziția vizuală: val teal pe fundal crem → secțiune teal News → wave crem → fundal crem CTA.
- Verifică că valul teal nu acoperă elemente din secțiunea de deasupra.
- Verifică consola: fără erori.
