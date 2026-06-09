---
name: adauga-arcada
description: >-
  Adaugă „arcada" (separatorul curbat dintre secțiuni) într-o secțiune dată. Folosește când
  utilizatorul cere să pună arcada / arch / arcade / wave separator / curba de tranziție la
  finalul (sau începutul) unei secțiuni, ca pe homepage la baza hero-ului. Componenta este
  WaveSeparator din src/components/ui/WaveSeparator.tsx.
---

# Adaugă arcada (WaveSeparator)

„Arcada" din acest proiect este componenta **`WaveSeparator`**
(`src/components/ui/WaveSeparator.tsx`) — o curbă decorativă, `pointer-events-none` /
`aria-hidden`, poziționată absolut la baza (sau vârful) unei secțiuni, care creează tranziția
lină spre secțiunea vecină. Exemplu canonic: la baza hero-ului de pe homepage
(`src/components/home/HeroSection.tsx`, `<WaveSeparator fill="cream" />`).

## Props
- `fill: "cream" | "teal" | "dark"` — **obligatoriu**. Trebuie să fie **culoarea secțiunii
  vecine** în care „intră" curba (nu a secțiunii curente). Mapare culori:
  - `cream` → secțiunea vecină are `bg-smart-cream`
  - `teal` → secțiunea vecină are `bg-smart-teal`
  - `dark` → secțiunea vecină are fundal închis (`bg-smart-deep`/`bg-smart-dark`)
- `position?: "top" | "bottom"` — implicit `"bottom"`. `bottom` = curba la baza secțiunii
  (tranziție spre secțiunea de **dedesubt**). `top` = la vârf (se rotește automat 180°,
  tranziție dinspre secțiunea de **deasupra**).
- `className?: string` — opțional, pentru ajustări (ex. `translate-y-8`).

## Pași
1. **Identifică secțiunea țintă** și **secțiunea vecină** spre care vrei tranziția.
2. **Alege `fill`** = culoarea de fundal a secțiunii vecine (vezi maparea de mai sus).
3. **Asigură-te că `<section>`-ul țintă este `relative`** (WaveSeparator e poziționat `absolute`).
   Dacă nu e, adaugă clasa `relative`.
4. **Importă** componenta:
   ```tsx
   import { WaveSeparator } from "@/components/ui/WaveSeparator";
   ```
5. **Pune-o ca ULTIM copil** al `<section>`-ului (chiar înainte de `</section>`):
   ```tsx
   <section className="relative ...">
     {/* ...conținutul secțiunii... */}
     <WaveSeparator fill="cream" />
   </section>
   ```
   Pentru tranziție dinspre secțiunea de deasupra, folosește `position="top"`.

## Note
- Curba are înălțime `h-32 sm:h-44` și se suprapune peste baza secțiunii. Dacă acoperă conținut
  important (ex. o imagine care ajunge până jos), adaugă puțin `padding-bottom` pe secțiune ca
  să rămână loc sub conținut.
- Este pur decorativă (nu prinde click-uri).

## Verificare
- Reîncarcă pagina și fă un screenshot la granița dintre cele două secțiuni: curba trebuie să
  aibă culoarea secțiunii vecine și să se îmbine lin (ca la baza hero-ului de pe homepage).
- Verifică consola: fără erori.
