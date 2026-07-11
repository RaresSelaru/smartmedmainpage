---
name: adauga-sectiune-statui
description: >-
  Creează o secțiune hero în stilul celei de sus din blog-principal (fundal bleumarin cu
  gradient + grain, titlu auriu script + imagine subtitlu pe stânga, centru-acreditat.png peste
  o imagine cu statui pe dreapta cu casete interactive pe numele statuilor, arcadă/WaveSeparator
  la bază). Folosește când utilizatorul cere o secțiune „ca cea de sus din blog-principal", o
  „secțiune cu statui", un hero cu statui/centru acreditat, sau „aceeași secțiune cu alt titlu și
  alte imagini". La apelare se întreabă titlul, imaginea subtitlu, imaginea cu statui și casetele.
  Referință: src/components/blog/blog-principal-hero.tsx.
---

# Adaugă secțiune hero cu statui (stil blog-principal)

Recreează secțiunea de sus din `blog-principal` cu **același format, culori și poziționări**.
Sursa adevărului pentru markup este **`src/components/blog/blog-principal-hero.tsx`** — citește-o
înainte de a genera codul. Singura imagine **păstrată mereu** este `centru-acreditat.png` (cea de
deasupra statuilor). Restul (titlu, imagine subtitlu, imagine statui, casetele) se furnizează la
apelare.

## Pasul 1 — Întreabă utilizatorul

Folosește `AskUserQuestion` (sau întrebări simple, dacă utilizatorul a dat deja datele) pentru:

1. **Titlul** — text redat în font auriu script (ca „BLOG"). Doar string-ul.
2. **Imaginea subtitlu** — numele fișierului din `public/assets/blog/`
   (ex. `Subtitlu-module-speciale.png`) → referit ca `/assets/blog/<fișier>`. Cere și un `alt`
   descriptiv. Înlocuiește `blog-hero-text-white.png`.
3. **Imaginea cu statui** — numele fișierului (ex. `statui-module-speciale.png`) → `/assets/blog/<fișier>`.
   Cere `alt` descriptiv. Înlocuiește `Statui-transparent.png`.
4. **Pagina țintă** — în ce pagină/component se adaugă secțiunea (sus de tot). Implicit pagina pe
   care lucrează utilizatorul. **Nu crea fișier nou** decât dacă cere explicit.
5. **`WaveSeparator fill`** — culoarea secțiunii vecine de **dedesubt** (`cream` / `teal` / `dark`).
   Vezi skill-ul `adauga-arcada` pentru mapare.
6. **Casetele statuilor** — câte sunt și, pentru fiecare:
   - `id` (slug), `name` (numele afișat în aria-label, ex. în greacă)
   - `align`: `"left"` sau `"right"`
   - `hotspot`: `{ left, top, width, height }` în procente (ex. `"11%"`, `"62%"`, `"20%"`, `"9%"`)
     — poziția zonei de hover peste numele statuii. Dacă nu se știu, lasă valori placeholder de
     reglat vizual ulterior și spune utilizatorului că trebuie ajustate.
   - `title`, `subtitle` (greacă), `subtitle2`, `body` (textul casetei).

## Pasul 2 — Construiește markup-ul

Copiază structura **exact** din `blog-principal-hero.tsx`, înlocuind doar conținutul variabil:

- `<section>` cu aceleași clase:
  `relative isolate z-30 overflow-x-clip bg-smart-abyss pb-20 pt-32 text-smart-white sm:pb-24 sm:pt-36 xl:pb-6`
- Fundalul gradient (`<div className="absolute inset-0 -z-10 bg-[radial-gradient(...)...]" />`) +
  `<div className="grain-overlay" />` — neschimbate.
- `smart-container relative z-40` → `<Reveal>` → layout `flex flex-col items-center md:flex-row`.
- **Stânga**: `h1` cu `font-[family-name:var(--font-script)] ... text-smart-gold` conținând
  **titlul** furnizat, apoi `<Image>` cu **imaginea subtitlu** (păstrează clasele/aspectul).
- **Dreapta**: `<Image src="/assets/blog/centru-acreditat.png" ... />` **NESCHIMBAT** (src, clase,
  width/height/sizes), apoi `<Image>` cu **imaginea statui**, apoi stratul de hotspot-uri care
  mapează array-ul `STATUES` în `<StatueNameSpot>`.
- `<WaveSeparator fill="..." />` la final, cu fill-ul ales.
- Definește array-ul `STATUES` din răspunsurile de la Pasul 1 și include helper-ul
  **`StatueNameSpot`** (cu `useState` pentru hover/pinned/expanded) — copiat din componenta de
  referință.

Păstrează tokenii de culoare ai proiectului: `smart-abyss`, `smart-gold`, `smart-white`,
`smart-cream`, `smart-teal`, `smart-ink`, `smart-aqua`.

## Pasul 3 — Inserează în partea de sus a paginii

- Adaugă secțiunea ca **primul element** din arborele returnat de componentul paginii țintă
  (sus de tot). **Fără fișier nou**, decât dacă utilizatorul cere.
- Pune și definiția helper-ului `StatueNameSpot` + tipul `StatueSpot` + array-ul `STATUES` în
  același fișier (sau, dacă utilizatorul preferă, extrage partea interactivă într-un fișier propriu).
- **Interactivitate (hooks)**: casetele folosesc `useState`, deci fișierul trebuie să fie client
  component. Dacă nu are deja `"use client";` pe prima linie, adaug-o și **avertizează** utilizatorul
  că pagina devine client component. Dacă asta nu e acceptabil, propune extragerea într-un fișier
  client separat.
- Adaugă importurile lipsă:
  ```tsx
  import Image from "next/image";
  import { useState } from "react";
  import { Reveal } from "@/components/animations/reveal";
  import { WaveSeparator } from "@/components/ui/WaveSeparator";
  import { cn } from "@/lib/utils";
  ```

## Note
- Assets se pun în `public/assets/blog/` și se referă ca `/assets/blog/<fișier>` (fără `public`).
  Confirmă că fișierele furnizate există acolo înainte de a le referi.
- Conform `AGENTS.md`: dacă apar API-uri/convenții Next.js neclare, consultă ghidul din
  `node_modules/next/dist/docs/` înainte de a scrie cod.

## Verificare
- Pornește dev server-ul (sau reîncarcă) și fă un screenshot la secțiunea de sus: titlu auriu +
  subtitlu + `centru-acreditat.png` peste statui + arcada la bază — același aspect ca în
  `blog-principal`.
- Verifică hover/click pe numele statuilor: se deschid casetele, „Vezi mai mult / mai puțin"
  funcționează.
- Verifică consola: fără erori.
