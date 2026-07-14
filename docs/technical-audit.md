# SmartMed Technical Audit

Data auditului: 19 iunie 2026
Branch inspectat: `main`
Scop: context tehnic complet pentru discuții viitoare cu ChatGPT sau cu un alt agent de implementare.

Acest document descrie ce există acum în website-ul SmartMed, unde sunt fișierele importante, ce este deja funcțional, ce este doar placeholder, ce riscuri tehnice există și care ar fi direcțiile naturale de implementare.

## Rezumat Executiv

SmartMed este în prezent un website Next.js premium, preponderent static și config-driven, construit ca experiență de prezentare pentru pregătirea la Medicină. Site-ul are o identitate vizuală puternică: fundaluri medical-academice, carduri editoriale, ilustrații custom, secțiuni mari de homepage, navigație complexă, blog local și căutare statică.

Nu există încă backend real, conturi funcționale, CMS, plăți, newsletter funcțional, formular de contact funcțional sau integrare completă cu o platformă de grile. Există însă structuri pregătite pentru aceste direcții: rute, scaffold-uri de pagini, placeholder Supabase, configurații centralizate și componente reutilizabile.

Site-ul este potrivit acum pentru:

- prezentare brand SmartMed;
- landing page premium;
- pagini statice de ofertă;
- blog local hardcodat;
- căutare statică în conținut local;
- pregătirea viitoarelor integrări.

Site-ul nu este încă potrivit, fără implementări suplimentare, pentru:

- autentificare reală;
- dashboard elev/admin;
- conținut premium protejat;
- vânzare de produse;
- newsletter;
- CMS editorial;
- analytics complet;
- management intern al cursurilor, grilelor sau simulărilor.

## Documente Existente

S-a căutat în repository după documente de tip audit, context, docs, plan sau handoff. Nu exista un audit tehnic anterior. Fișierele documentare găsite înainte de acest audit erau:

- `README.md`
- `AGENTS.md`

Acest fișier este primul audit tehnic dedicat: `docs/technical-audit.md`.

## Stack Tehnic

### Framework și runtime

Website-ul folosește:

| Zonă | Tehnologie |
| --- | --- |
| Framework | Next.js `16.2.5` |
| React | React `19.2.4` / React DOM `19.2.4` |
| Limbaj | TypeScript `5` |
| Styling | Tailwind CSS `4`, CSS global, `styled-components` |
| UI icons | `lucide-react` |
| Motion | `framer-motion` |
| Utility classes | `clsx` |
| Lint | ESLint `9` + `eslint-config-next` |

### Scripturi disponibile

În `package.json` există:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

### Config Next.js

Fișier: `next.config.ts`

Configurația este minimă:

- `compiler.styledComponents: true`

Nu există configurări custom pentru:

- imagini remote;
- redirects;
- rewrites;
- headers;
- i18n;
- output static;
- bundle analyzer;
- caching custom.

### TypeScript

Fișier: `tsconfig.json`

Observații:

- `strict: true`
- `moduleResolution: "bundler"`
- `jsx: "react-jsx"`
- alias `@/*` către `./src/*`
- include `.next/types` și `.next/dev/types`
- `noEmit: true`
- `allowJs: true`

### Tailwind și CSS

Fișiere importante:

- `src/app/globals.css`
- `postcss.config.mjs`

Proiectul folosește Tailwind v4 cu `@import "tailwindcss";` și `@theme inline` în CSS. Tema este definită în mare parte prin variabile CSS globale.

## Observație Importantă Despre Next.js

În `AGENTS.md` există instrucțiune explicită:

```text
This is NOT the Next.js you know
```

Pentru schimbări de cod Next.js trebuie citite ghidurile locale din:

```text
node_modules/next/dist/docs/
```

Motiv: proiectul folosește Next.js 16, cu API-uri și convenții care pot diferi de informațiile mai vechi despre Next.js. Pentru modificări la imagini, routing, metadata, proxy/middleware, request APIs sau caching, trebuie verificată documentația locală a versiunii instalate.

## Structură Generală Repository

Structura relevantă:

```text
src/
  app/
  components/
    animations/
    blog/
    home/
    layout/
    pages/
    ui/
  lib/
public/
  assets/
  images/
scripts/
docs/
```

Zonele principale:

- `src/app` conține rutele App Router.
- `src/components/home` conține secțiunile homepage-ului.
- `src/components/layout` conține navbar și footer.
- `src/components/blog` conține interfața blogului.
- `src/components/pages` conține pagini specializate/scaffold.
- `src/components/ui` conține componente mici reutilizabile.
- `src/lib` conține date, config, căutare, metadata, utilitare și placeholder Supabase.
- `public/assets` și `public/images` conțin imaginile și SVG-urile folosite pe site.

## Rute Existente

Website-ul folosește App Router.

Rute detectate:

| Rută | Tip | Componentă/fișier principal | Status |
| --- | --- | --- | --- |
| `/` | Homepage | `src/app/page.tsx` | Funcțional, static/premium |
| `/ajutor` | Standard page | `StandardPage` + `pageScaffolds` | Scaffold |
| `/blog` | Blog landing/list/category/search | `BlogPageContent` | Rută canonică, funcțională local |
| `/blog-principal` | Redirect permanent | `next.config.ts` | Redirect 308 către `/blog` |
| `/blog/[slug]` | Articol blog | `BlogPostPageContent` | Static params din `src/lib/blog.ts` |
| `/cautare` | Căutare site | `src/lib/search.ts` | Funcțional static |
| `/centru-fizic` | Standard page | `PageShell` | Scaffold |
| `/centru-online` | Pagină custom | `OnlineCenterPage` | Vizual funcțional, fără backend |
| `/confidentialitate` | Standard page | `PageShell` | Scaffold legal |
| `/cont` | Standard page | `PageShell` | Scaffold, fără auth |
| `/contact` | Standard page | `PageShell` | Scaffold, fără formular real |
| `/despre` | Standard page | `PageShell` | Scaffold |
| `/grile` | Referral page | `GrileReferralPage` | CTA extern/configurabil |
| `/lectii-speciale` | Standard page | `PageShell` | Scaffold |
| `/news` | Standard page | `PageShell` | Scaffold |
| `/pentru-parinti` | Standard page | `PageShell` | Scaffold |
| `/sablon-articol` | Template articol | `SablonArticolPage` | Demo/template |
| `/shop` | Standard page | `PageShell` | Scaffold, fără shop real |
| `/simulari-smart` | Standard page | `PageShell` | Scaffold |
| `/termeni` | Standard page | `PageShell` | Scaffold legal |

## Layout Global

Fișier: `src/app/layout.tsx`

Responsabilități:

- setează fonturile Google prin `next/font/google`;
- definește metadata globală;
- setează `lang="ro"`;
- aplică variabilele de font pe `<html>`;
- include `StyledComponentsRegistry`;
- include `Navbar`;
- include `<main>`;
- include `Footer`.

Fonturi folosite:

- `Manrope`
- `Cormorant Garamond`
- `Kaushan Script`
- `Barlow Condensed`

Metadata globală:

- titlu default: `SmartMed | Pregătire pentru Medicină`
- `metadataBase`: `https://smartmed.ro`
- descriere din `siteConfig`

Observație: build-ul poate avea nevoie de acces la rețea pentru fonturile Google dacă acestea nu sunt deja cache-uite. Într-un mediu fără internet, `npm run build` poate eșua la fetch de fonturi.

## Design System și Temă

Fișier principal: `src/app/globals.css`

Tema vizuală este definită prin variabile CSS:

- `--background`
- `--foreground`
- `--smart-dark`
- `--smart-abyss`
- `--smart-navy`
- `--smart-teal`
- `--smart-teal-soft`
- `--smart-aqua`
- `--smart-cream`
- `--smart-cream-deep`
- `--smart-gold`
- `--smart-gold-light`
- `--smart-white`
- `--smart-muted`
- `--smart-ink`
- `--smart-glass`
- `--smart-glass-border`

Caracter vizual:

- medical-academic;
- premium;
- editorial;
- mult dark teal/navy + ivory/cream + gold;
- fundaluri cu radial gradients;
- efecte de sticlă;
- umbre soft;
- serif mare pentru titluri;
- sans-serif lizibil pentru conținut.

Există suport pentru temă light/dark prin `html[data-theme="light"]`, dar tema este controlată client-side în navbar prin `localStorage`.

Zone CSS speciale:

- `grain-overlay`
- straturi hero neural
- scrim-uri hero
- containere `smart-container` / `smart-nav-container`
- toggle vizual de temă
- comportament header ascuns/reveal
- no-scrollbar helpers
- clase interactive pentru secțiunile de path choice
- clase pentru animații și reduced motion
- folosire de `:has()` pentru efecte interactive în anumite zone

Riscuri:

- `:has()` cere browser modern.
- tema citită din `localStorage` poate produce flicker sau warning de hidratare dacă HTML-ul server-side nu se potrivește cu primul render client-side.
- CSS-ul global este mare și include multe clase specializate; schimbările trebuie făcute cu grijă ca să nu afecteze secțiuni aparent separate.

## Config Central și Date

Fișier cheie: `src/lib/site-config.ts`

Acesta este principalul centru de conținut și configurare. Include:

- `siteConfig`
- `generatedAssets`
- `heroCopy`
- `heroBenefits`
- `pathChoiceGroup1`
- `pathChoiceGroup2`
- `pathChoiceGroup3`
- `lectiiSpecialeCarousel`
- `newsCarousel`
- `featureCards`
- `homeStats`
- `destinationCards`
- `smartBenefits`
- `onlineCenterModules`
- `roleRoadmap`
- `pageScaffolds`

Acest fișier este foarte important pentru orice implementare viitoare. Multe schimbări de text, CTA-uri, rute, carduri și imagini se pot face direct aici fără refactor major.

### `siteConfig`

Conține:

- numele brandului;
- numele complet;
- descriere;
- URL public;
- date de contact placeholder;
- social links placeholder;
- newsletter placeholder;
- fallback URL extern pentru platforma de grile.

Datele de contact și social media sunt în mare parte placeholder și trebuie înlocuite înainte de producție reală.

### `heroCopy`

Conține textele principale din hero:

- `titleLead`
- `titleHighlight`
- `subtitle`
- `primaryCta`
- `secondaryCta`
- `academicTagline`

Acest obiect permite modificarea rapidă a headline-ului homepage fără edit direct în componentă.

### `pageScaffolds`

Conține date pentru multe pagini standard:

- eyebrow;
- titlu;
- descriere;
- CTA-uri;
- highlights;
- roadmap;
- variant vizual.

Acestea alimentează `PageShell` și `StandardPage`. Multe pagini sunt pregătite conceptual, dar nu au încă funcționalitate reală.

## Rute și Navigație

Fișier: `src/lib/routes.ts`

Conține:

- `AppRoute`
- `RouteItem`
- `primaryNavRoutes`
- `utilityRoutes`
- `legalRoutes`
- `footerColumns`

Navigația principală include:

- Centrul SmartMed
- Module speciale
- Grile
- Simulări
- Shop
- Blog principal
- Pentru părinți
- Contact

Fișier navbar: `src/components/layout/navbar.tsx`

Navbar-ul este componentă client-side și include:

- detectare rută activă prin `usePathname`;
- navigare programatică prin `useRouter`;
- search overlay/input;
- mobile menu;
- show/hide pe scroll;
- reveal când pointerul este aproape de top;
- switch pentru light/dark theme;
- stocare temă în `localStorage`;
- acțiuni pentru shop și cont;
- integrare specială cu navigația de blog.

Navbar-ul este unul dintre fișierele cele mai complexe din proiect. Orice schimbare aici trebuie testată desktop + mobile.

Riscuri:

- are mult state client-side;
- poate genera mismatch dacă tema inițială client-side diferă de server;
- aria/focus trebuie păstrate atent la search și meniul mobile;
- blog nav are logică separată de restul site-ului.

## Homepage

Fișier: `src/app/page.tsx`

Ordinea actuală a homepage-ului:

1. `HeroSection`
2. `AcademicCreationSection`
3. `PathChoiceSection`
4. `SpecialModulesSection`
5. `PathChoiceSectionGroup2`
6. `HorizontalScrollSection`
7. `PathChoiceSectionGroup3`
8. `FinalCTASection`

Homepage-ul este construit din secțiuni mari, nu dintr-un singur fișier monolitic. Totuși, unele componente individuale sunt mari.

### `HeroSection`

Fișier: `src/components/home/HeroSection.tsx`

Caracteristici:

- folosește `heroCopy` din config;
- fundal neural generat;
- CTA principal și secundar;
- dovadă socială / proof items;
- imagine academică de brand;
- wave separator.

Este o secțiune statică server-side. CTA-urile vin din config/rute.

### `AcademicCreationSection`

Fișier: `src/components/home/AcademicCreationSection.tsx`

Include:

- `PreparationSystemSection`;
- text editorial despre sistemul de pregătire;
- imagine SVG cu statui / facerea lui Adam: `public/assets/generated/smartmed-academy-creation.svg`;
- an animat de admitere;
- carduri pentru clasele X, XI, XII.

Imaginea SVG a fost recent înlocuită cu varianta Canva modificată și curățată de fundal alb evident. Este servită cu `unoptimized`.

### `PreparationSystemSection`

Fișier: `src/components/home/PreparationSystemSection.tsx`

Prezintă 4 pași:

- Înveți cu medici
- Exersezi pe grile
- Simulări continue
- Feedback constant

Folosește imagini din:

```text
public/images/offer-steps/
```

### `PathChoiceSection`

Fișier: `src/components/home/PathChoiceSection.tsx`

Este cel mai mare fișier din zona homepage. Conține mai multe grupuri vizuale:

- alegere între online și centru fizic;
- zone pentru grile și simulări;
- zone pentru blog și shop;
- vizualuri custom interactive;
- cards și layout-uri dedicate.

Folosește configurații din `site-config.ts`:

- `pathChoiceGroup1`
- `pathChoiceGroup2`
- `pathChoiceGroup3`

Riscuri:

- fișier mare, greu de modificat rapid;
- multe clase Tailwind și CSS global asociate;
- posibil candidat pentru refactor pe subcomponente dacă se lucrează masiv aici.

### `SpecialModulesSection`

Fișier: `src/components/home/SpecialModulesSection.tsx`

Aceasta este secțiunea "Module speciale". Este componentă client-side.

Funcționalitate:

- carusel orizontal cu scroll;
- săgeți stânga/dreapta;
- indicator dots;
- scroll progress;
- `ResizeObserver`;
- card semnătură;
- carduri verticale speciale.

Datele vin din:

```text
lectiiSpecialeCarousel
```

din `src/lib/site-config.ts`.

Cardurile suportă:

- `title`
- `description`
- `href`
- `accent`
- `image`
- `imageSrc`
- `imageUrl`
- `imageAlt`
- `imageFit`
- `imagePosition`

Imagini curente pentru module:

```text
public/images/special-modules/cards/lectiile-smart.png
public/images/special-modules/cards/sutura-smart.png
public/images/special-modules/cards/radiografia-smart.png
public/images/special-modules/cards/disectia-smart.png
public/images/special-modules/cards/diferentialul-smart.png
public/images/special-modules/cards/imagistica-smart.png
public/images/special-modules/cards/laboratorul-smart.png
public/images/special-modules/cards/problema-cu-problemele.png
```

Există și:

```text
public/images/special-modules/signature-smartmed.png
```

Stil actual card special:

- card vertical cu `overflow-hidden`;
- fundal `#fbf6ec`;
- colțuri rotunjite;
- shadow premium soft;
- zonă imagine sus cu `next/image fill`;
- gradient de fade către cream;
- badge numerotat auriu centrat;
- text jos centrat;
- hover lift + shadow.

Important pentru viitor: nu hardcoda imagini direct în JSX. Schimbările de imagine trebuie făcute în `lectiiSpecialeCarousel`.

### `HorizontalScrollSection`

Fișier: `src/components/home/HorizontalScrollSection.tsx`

Secțiune client-side cu `framer-motion`:

- marquee/scroll orizontal;
- dublare de items pentru loop;
- pause pe hover/touch;
- butoane pentru nudge;
- respect pentru reduced motion.

Este folosită pentru `newsCarousel`.

### `FinalCTASection`

Fișier: `src/components/home/FinalCTASection.tsx`

Ultima secțiune CTA:

- fundal dark;
- text editorial;
- citat;
- imagine statuie cont: `smartmed-account-statue.png`;
- CTA către cont.

## Blog și Conținut Editorial

Fișier date: `src/lib/blog.ts`

Blogul este complet local/hardcodat în TypeScript. Nu există CMS sau MDX.

Conține:

- categorii blog;
- imagine hero blog;
- secondary nav items;
- postări blog;
- body blocks pentru articole;
- funcții de filtrare/căutare/relații.

Funcții importante:

- `getBlogPosts`
- `getBlogPostBySlug`
- `getBlogCategory`
- `getBlogPostsByCategory`
- `searchBlogPosts`
- `getRelatedBlogPosts`
- `formatBlogDate`

Rute blog:

- `/blog`
- `/blog/[slug]`
- `/sablon-articol`

`/blog/[slug]` folosește:

- `generateStaticParams`
- `generateMetadata`
- `dynamicParams = false`

Prin urmare, articolele sunt generate static doar pentru slug-urile existente în `src/lib/blog.ts`.

Riscuri / limitări:

- fără CMS;
- fără editor;
- fără preview mode;
- fără paginare reală;
- fără tag-uri persistente în backend;
- fără imagini per articol gestionate editorial;
- orice articol nou cere deploy.

## Căutare

Fișier: `src/lib/search.ts`
Rută: `src/app/cautare/page.tsx`

Căutarea este statică și locală.

Construiește rezultate din:

- pagini din `pageScaffolds`;
- rute principale;
- destination cards;
- feature/path cards;
- blog posts.

Caracteristici:

- normalizează diacriticele;
- caută în titlu, descriere, eyebrow și conținut;
- are rezultate recomandate când nu există query;
- suportă query prin `q` sau `cautare`.

Limitări:

- nu este fuzzy search;
- nu are ranking avansat;
- nu are index server-side separat;
- nu caută în conținut extern;
- nu are analytics pe query-uri.

## Pagini Standard și PageShell

Fișiere:

- `src/components/pages/standard-page.tsx`
- `src/components/layout/PageShell.tsx`
- `src/lib/site-config.ts`

Multe rute folosesc același mecanism:

```tsx
<StandardPage pageKey="..." />
```

`PageShell` randă:

- hero;
- highlights;
- roadmap;
- CTA;
- variante vizuale.

Acest pattern este bun pentru pagini statice coerente, dar nu înseamnă că funcționalitatea există. De exemplu, `/shop`, `/cont`, `/contact`, `/simulari-smart` sunt în mare parte pagini de prezentare/scaffold.

## Pagini Specializate

### `OnlineCenterPage`

Fișier: `src/components/pages/online-center-page.tsx`

Este o pagină custom pentru centrul online. Include:

- preview vizual de dashboard;
- module online;
- progres;
- roadmap pe roluri.

Nu are încă auth, date reale sau dashboard funcțional.

### `GrileReferralPage`

Fișier: `src/components/pages/grile-referral-page.tsx`

Pagina `/grile` păstrează ruta internă, dar CTA-ul duce către o platformă externă. URL-ul extern este:

```text
NEXT_PUBLIC_GRILE_URL
```

dacă există, altfel fallback din:

```text
siteConfig.external.grileFallbackUrl
```

Aceasta este o zonă naturală pentru integrare SSO/deep linking în viitor.

## UI Primitives și Componente Reutilizabile

### `Reveal`

Fișier: `src/components/animations/reveal.tsx`

Momentan este un wrapper simplu:

- primește `children`, `className`, `delay`, `y`;
- returnează un `<div>`;
- nu mai rulează animații reale.

Implicație: multe componente folosesc `Reveal`, dar nu există cost mare de motion aici. Dacă se reintroduc animații, impactul va fi global.

### `PremiumButton`

Fișier: `src/components/ui/PremiumButton.tsx`

Buton/link premium reutilizabil.

Suportă variante:

- `primary`
- `outline`
- `cream`
- `ghost`

Are logică pentru link extern:

- `target="_blank"`
- `rel="noopener noreferrer"`

### `SmartIcon`

Fișier: `src/components/ui/SmartIcon.tsx`

Mapează `IconName` din config către iconuri `lucide-react`. Dacă se adaugă nume noi de icon în `site-config.ts`, trebuie extins și `SmartIcon`.

### Alte UI components

Există și:

- `GlassCard`
- `SectionLabel`
- `WaveSeparator`
- `asset-icon`
- `button-link`
- `icon-symbol`
- `section-shell`

Acestea păstrează limbajul vizual premium și ar trebui refolosite înainte de a introduce componente noi.

## Assets

Zone importante:

```text
public/assets/blog/
public/assets/brand/
public/assets/generated/
public/assets/page-icons/
public/images/offer-steps/
public/images/special-modules/
```

### Assets blog

Exemple:

- `Statui-transparent.png`
- `blog-hero-text-white.png`
- `blog-hero-text.jpeg`
- `centru-acreditat.png`
- `educatie-medicala.jpeg`
- `hero.svg`
- `statui.jpeg`

### Assets brand/generated

Exemple:

- `hero-neural.png`
- `path-online.png`
- `path-fizic.png`
- `feature-*.png`
- `smartmed-academy-creation.svg`
- `smartmed-account-statue.png`
- `smartmed-center-*`
- `smartmed-eyes-infinity.svg`
- `smartmed-training-brain-cutout.svg`

### Observații de performanță assets

Unele imagini/SVG-uri sunt mari. Exemplele speciale de carduri și SVG-urile generate pot avea dimensiuni de ordinul MB.

Riscuri:

- First Load mai mare;
- LCP afectat dacă imaginile hero sunt prea grele;
- SVG-uri mari pot bloca parsing/rendering;
- imaginile `unoptimized` nu beneficiază de optimizarea automată Next Image.

Recomandări:

- convertire PNG mari în WebP/AVIF acolo unde este posibil;
- păstrarea PNG doar dacă transparența/calitatea o cere;
- optimizare SVG-uri generate;
- analiză bundle + image payload;
- definire de dimensiuni clare și `sizes` corecte;
- eventual self-host pentru fonturi dacă build-ul trebuie să fie robust offline/CI.

## Backend și Integrări

Autentificarea este acum pregătită prin Supabase Auth, dar restul backend-ului de produs
este încă în mare parte neimplementat.

Fișier relevant:

```text
src/lib/auth/
supabase/migrations/20260619000000_create_auth_profiles.sql
```

Zona de auth definește:

- `SmartMedRole`
- `SmartMedSession`
- `getCurrentSmartMedSession`
- formulare și Server Actions pentru login/signup/reset/profil/logout
- config centralizat pentru rute protejate
- migrare SQL pentru `profiles` și `account_roles`

Limitări rămase:

- Supabase trebuie configurat prin env vars;
- migrarea SQL trebuie aplicată în proiectul Supabase;
- zonele premium nu sunt încă blocate efectiv;
- dashboard-urile user/admin nu sunt încă implementate;
- rolurile premium/admin trebuie gestionate server-side.

Env vars necesare:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Implementarea păstrează inițializarea lazy, nu la module scope, ca `next build` să nu pice când env vars lipsesc în preview/CI.

## Funcționalități Neimplementate Încă

Lista zonelor care arată pregătite vizual, dar nu sunt încă implementate complet:

| Zonă | Status actual |
| --- | --- |
| Auth / cont elev | Implementat cu Supabase, necesită env + migrare aplicată |
| Dashboard elev | Preview vizual |
| Dashboard admin | Inexistent |
| Premium gates | Config central pregătit, fără rute premium blocate încă |
| CMS blog/news | Inexistent |
| Newsletter | Vizual în footer, fără submit real |
| Formular contact | Scaffold, fără handler real |
| Shop | Scaffold, fără produse/coș/plată |
| Stripe/plăți | Inexistent |
| Email transactional | Inexistent |
| Platformă grile | Link extern configurabil |
| Simulări | Pagină scaffold |
| Analytics | Nu apare integrare dedicată |
| Cookie consent | Nu apare implementare |
| Legal final copy | Parțial/scaffold |
| Search avansat | Static local |
| Sitemap/robots custom | Nu apar fișiere dedicate detectate |

## SEO și Metadata

Metadata globală este definită în `layout.tsx`.

Metadata pentru pagini standard este generată cu:

```text
src/lib/metadata.ts
```

Funcția:

```ts
createPageMetadata(pageKey)
```

folosește `pageScaffolds`.

Blog posts au metadata dinamică în:

```text
src/app/blog/[slug]/page.tsx
```

Observații:

- Open Graph de bază există;
- nu s-au detectat sitemap/robots dedicate;
- nu s-au detectat structured data/schema.org;
- imaginile OG par generice sau lipsesc pe multe pagini;
- blogul are metadata per articol, dar conținutul este local.

Recomandări SEO:

- adaugă `src/app/sitemap.ts`;
- adaugă `src/app/robots.ts`;
- metadata unică pentru paginile importante;
- OG images coerente;
- schema.org pentru organizație, articole, cursuri/educație;
- păstrează `/blog` drept singura rută canonică pentru landing, categorii și căutare;
- verificare titluri și descrieri reale înainte de producție.

## Accesibilitate

Puncte bune:

- multe butoane au `aria-label`;
- iconurile decorative folosesc `aria-hidden`;
- există `sr-only` pentru search;
- focus visible este folosit în multe locuri;
- `reduced motion` este luat în calcul în CSS și în carousel/marquee.

Zone de verificat:

- meniul mobile din navbar;
- search overlay/nav search;
- caruselul Module speciale cu keyboard;
- contrast în mod light/dark;
- text pe imagini/fundaluri gradients;
- linkuri externe și CTA-uri;
- aria pentru secțiunile interactive decorative.

## Responsiveness

Site-ul folosește intensiv clase Tailwind responsive:

- `sm:`
- `lg:`
- `xl:`
- grid-uri adaptabile;
- carduri cu dimensiuni fixe pe carusel;
- containere max-width;
- overflow-x pentru carusele.

Zone care trebuie testate mereu pe mobile:

- navbar + mobile menu;
- hero;
- Module speciale;
- path choice sections;
- blog list;
- search results;
- footer;
- carduri cu titluri lungi.

## Performanță

Riscuri principale:

1. Assets mari.
   - Multe PNG/SVG-uri generate sunt vizual premium, dar pot fi grele.

2. Next Image parțial bypassed.
   - Unele imagini folosesc `unoptimized`, mai ales SVG-uri sau asset-uri speciale.

3. Fonturi Google la build.
   - Dacă mediul nu are acces la rețea, build-ul poate eșua.

4. CSS global mare.
   - Sunt multe reguli specializate și gradients.

5. Componente client-side mari.
   - Navbar, SpecialModulesSection și HorizontalScrollSection rulează client-side.

6. Lipsă analiză bundle.
   - Nu există bundle analyzer configurat.

Recomandări:

- optimizează imaginile principale;
- rulează Lighthouse pe homepage și mobile;
- verifică LCP pe hero;
- self-host fonts dacă deployment-ul cere predictibilitate;
- adaugă `next/image` cu static imports unde se potrivește;
- evită încărcarea componentelor client-side mari dacă pot rămâne server-side;
- folosește dynamic import doar unde are sens real.

## Calitatea Codului

Puncte bune:

- TypeScript strict;
- config centralizat;
- componente separate pe domenii;
- App Router curat;
- multe tipuri exportate;
- iconuri și UI primitives reutilizabile;
- fără dependențe inutile pentru backend neimplementat;
- build-ul a trecut după schimbările recente când a avut acces la rețea.

Puncte de atenție:

- `PathChoiceSection.tsx` este foarte mare;
- `navbar.tsx` este complex și client-heavy;
- conținutul din `site-config.ts` este mare și ar putea deveni greu de administrat;
- nu există teste automate vizibile;
- nu există Playwright/Cypress pentru smoke tests;
- nu există unit tests pentru search/config;
- multe pagini sunt scaffold și pot crea impresia de funcționalitate completă.

## Stare Git Observată

La momentul auditului, branch-ul local era:

```text
main
```

Existau modificări locale necomise în:

```text
public/assets/generated/smartmed-academy-creation.svg
src/components/home/FinalCTASection.tsx
src/components/home/HeroSection.tsx
src/lib/site-config.ts
```

Auditul nu trebuie să presupună că aceste modificări sunt deja împinse sau deployate. Pentru orice implementare viitoare, se recomandă verificare cu:

```bash
git status -sb
npm run lint
npm run build
```

## Priorități Recomandate Pentru Implementări Noi

### 1. Stabilizarea conținutului și a configurației

Înainte de funcționalități mari, merită clarificat ce rămâne local în `site-config.ts` și ce va merge într-un CMS.

Recomandare:

- păstrează homepage config local pe termen scurt;
- mută blog/news într-un CMS când devine editorial real;
- definește schema pentru module speciale, CTA-uri și pagini standard;
- înlocuiește datele placeholder de contact/social/legal.

### 2. Auth și conturi

Există deja un placeholder Supabase, deci direcția naturală este Supabase Auth.

Implementare sugerată:

- instalează `@supabase/supabase-js`;
- configurează env vars;
- implementează client lazy;
- creează session helper server-side;
- protejează `/cont`;
- adaugă roluri `guest`, `user`, `premium`, `admin`;
- creează dashboard minim;
- păstrează build-safe initialization.

Pentru Next.js 16, dacă se adaugă protecție la nivel de request, trebuie verificată documentația locală pentru proxy/middleware.

### 3. Contact și newsletter

Zone vizuale există deja, dar nu trimit nimic.

Implementare sugerată:

- formular contact cu validare;
- server action sau route handler;
- anti-spam simplu;
- integrare email, de exemplu Resend;
- newsletter cu listă reală;
- mesaje de succes/eroare accesibile.

### 4. Blog/CMS

Blogul este local, bun pentru prototip, limitat pentru producție editorială.

Direcții:

- Sanity/Contentful/Dato/Storyblok sau alt CMS;
- schema pentru articol, categorie, autor, featured image;
- preview mode;
- slug-uri stabile;
- metadata/OG automate;
- migrare graduală din `src/lib/blog.ts`.

### 5. Shop și plăți

`/shop` este scaffold.

Direcții:

- catalog produse;
- checkout Stripe;
- produse digitale/fizice definite clar;
- webhook pentru confirmare plată;
- acces premium după plată;
- email confirmare.

### 6. Integrarea cu platforma de grile

Momentan `/grile` este referral extern.

Direcții:

- setare corectă `NEXT_PUBLIC_GRILE_URL`;
- deep links către capitole/teste;
- SSO dacă platforma externă permite;
- sincronizare progres doar dacă există API;
- fallback elegant când platforma externă nu este disponibilă.

### 7. Performanță vizuală

Site-ul are multe assets premium. Optimizarea imaginilor va conta mult.

Direcții:

- audit dimensiuni imagini;
- convertire WebP/AVIF;
- optimizare SVG;
- verificare LCP;
- verificare CLS;
- lazy/eager corect pe imagini hero;
- eliminare asset-uri nefolosite.

### 8. Testare

Nu există o suită de teste clară.

Direcții:

- Playwright smoke tests pentru:
  - homepage load;
  - navbar desktop/mobile;
  - search;
  - blog post;
  - special modules carousel;
  - CTA principale;
- unit tests pentru `searchSite`;
- verificare build în CI.

### 9. SEO și indexare

Adaugă infrastructură SEO completă:

- sitemap;
- robots;
- schema.org;
- canonical URLs;
- OG images;
- metadata pentru toate paginile majore.

### 10. Refactor controlat

Nu este recomandat un rewrite general.

Refactor util:

- sparge `PathChoiceSection.tsx` în subcomponente când se lucrează acolo;
- extrage părți din `navbar.tsx` dacă se adaugă auth/search complex;
- păstrează `site-config.ts` ca single source pe termen scurt;
- evită librării noi fără necesitate clară.

## Ghid Pentru Oricine Cere Modificări Cu ChatGPT

Când ceri opinii sau implementări noi pe baza acestui audit, include aceste reguli:

1. Nu redesena tot site-ul dacă schimbarea este locală.
2. Folosește pattern-urile existente: config în `site-config.ts`, componente în `components/home`, `PageShell` pentru pagini standard.
3. Nu hardcoda imagini în JSX dacă există deja structură de date.
4. Pentru Next.js 16, verifică documentația locală instalată înainte de schimbări la routing, metadata, images, request APIs sau proxy.
5. Păstrează Server Components by default și folosește `"use client"` doar unde este interacțiune reală.
6. Nu inițializa SDK-uri externe la module scope dacă env vars pot lipsi în build.
7. Testează desktop + mobile pentru navbar, carduri, carusele și hero.
8. Rulează cel puțin `npm run lint` și, pentru schimbări de runtime, `npm run build`.

## Prompt Scurt De Folosit Cu ChatGPT

Poți copia auditul de mai sus, apoi adăuga:

```text
Pe baza acestui audit tehnic al website-ului SmartMed, vreau să îmi propui o implementare pentru [descrie funcționalitatea].

Te rog:
- nu propune rewrite general;
- respectă structura Next.js 16 App Router existentă;
- spune exact ce fișiere trebuie modificate;
- spune ce date trebuie mutate în config;
- menționează riscurile de UX, SEO, performanță și accesibilitate;
- propune un plan incremental cu pași mici;
- indică ce teste/verificări ar trebui rulate.
```

## Concluzie

SmartMed este un frontend premium bine conturat, cu structură bună pentru un site de brand educațional medical. Valoarea actuală este în prezentare, design, assets, configurare și arhitectură statică. Următorul salt tehnic ar trebui făcut incremental: întâi conținut și date curate, apoi auth/contact/newsletter, apoi CMS/shop/platformă de grile, apoi testare și optimizare de performanță.

Cel mai important principiu pentru lucrările viitoare: păstrează identitatea vizuală și arhitectura existentă, dar transformă gradual scaffold-urile în funcționalități reale.
