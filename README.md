# SmartMed Main Page

Site-ul principal SmartMed, construit cu Next.js App Router, TypeScript, Tailwind CSS și Supabase.

## Cerințe

- Node.js 22.13 sau mai nou (`.nvmrc` fixează linia Node 22)
- npm
- acces la proiectul Supabase SmartMed

## Comenzi locale

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
```

## Variabile de mediu

Copiază `.env.example` în `.env.local` și completează valorile publice ale proiectului:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://proiectul-tau.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_cheia-ta-publica
```

Cheia publishable este destinată aplicației web. Nu pune niciodată cheia `service_role`
într-o variabilă `NEXT_PUBLIC_*`, în codul client sau în repository.

Pentru pagina `/grile`:

```bash
NEXT_PUBLIC_GRILE_URL=https://grile.smartmed.ro
```

Aceleași variabile publice Supabase trebuie configurate separat în mediul de hosting.
Fișierul `.env.local` este ignorat de Git și configurează doar dezvoltarea locală.

## Supabase

Repository-ul conține configurația și istoricul complet în folderul `supabase/`:

- `20260619000000_create_auth_profiles.sql` — profiluri și roluri compatibile cu Auth;
- `20260727164654_platform_foundation.sql` — CMS, cursuri, programări, shop, acces,
  CRM, date private și Storage;
- `20260727172332_seed_initial_cms.sql` — conținutul editorial inițial al blogului.
- `20260727174446_consolidate_authenticated_rls_policies.sql` — politici RLS
  consolidate pentru acces identic cu evaluare mai eficientă.

Fluxul recomandat:

```bash
npx supabase link --project-ref PROJECT_REF
npx supabase db push --linked --dry-run --include-all
npx supabase db push --linked --include-all
npx supabase config push
npx supabase gen types typescript --linked --schema public > src/lib/supabase/database.types.ts
npx supabase db advisors --linked --type security --level warn
npx supabase db advisors --linked --type performance --level warn
```

Nu edita manual o migrare care a fost deja aplicată într-un mediu partajat. Pentru orice
schimbare ulterioară, creează o migrare nouă cu:

```bash
npx supabase migration new numele_schimbarii
```

## Supabase Auth

Configurația versionată:

- cere confirmarea adresei de email;
- dezactivează utilizatorii anonimi;
- cere parole de minimum 8 caractere cu litere și cifre;
- folosește refresh-token rotation;
- permite callback-urile exacte:
  - `http://localhost:3000/auth/callback`
  - `http://127.0.0.1:3000/auth/callback`
  - `https://smartmedmainpage.vercel.app/auth/callback`
  - `https://smartmed.ro/auth/callback`
  - `https://www.smartmed.ro/auth/callback`
- permite separat fluxurile hosted de alegere a parolei pentru invitațiile de
  administrator;
- păstrează în `supabase/templates/` template-urile SmartMed pentru confirmare,
  recuperare, invitație, magic link, schimbarea adresei și notificarea parolei.

Înainte de lansarea publică trebuie configurat un furnizor SMTP de producție în proiectul
Supabase. Planul Free cu furnizorul implicit nu permite activarea template-urilor
personalizate, de aceea blocurile lor sunt comentate în `supabase/config.toml`. După
configurarea SMTP, acestea se decomentează și se rulează `npx supabase config push`.
Creditele SMTP/API nu se salvează în Git.

## Administrator pe hosting

Nu păstra emailul sau parola administratorului în Vercel. Proiectul folosește un
flux mai sigur: invitație unică Supabase, parolă aleasă de administrator, grant
separat în `account_roles` și TOTP obligatoriu înainte de accesul la `/admin`.

Instrucțiunile complete pentru prima configurare, verificare și revocare sunt în
[`docs/HOSTED_ADMIN_SETUP.md`](docs/HOSTED_ADMIN_SETUP.md).

## Modelul de date

- identitate: `auth.users`, `profiles`, `account_roles`;
- CMS: media, autori, categorii, taguri, articole/pagini, revizii și colecții;
- educație: cursuri, module, lecții, grupe, sesiuni, înscrieri, prezență și progres;
- programări: tipuri, disponibilitate, excepții, rezervări și istoric;
- shop: produse, variante, prețuri, inventar, coșuri, comenzi și livrări digitale;
- acces: planuri, abonamente și `entitlements`;
- CRM: solicitări de contact, newsletter și consimțământ;
- privat: plăți, webhook-uri, note interne și audit.

`account_roles` este pentru autorizare operațională. Accesul plătit nu se acordă prin rol,
ci prin `entitlements` cu perioadă de valabilitate.

## Limite de securitate intenționate

RLS este activ pe toate tabelele expuse, iar privilegiile Data API sunt declarate explicit.
Operațiunile financiare, webhook-urile, emiterea drepturilor, formularele publice și
descărcările cu limită sunt server-mediated. Implementările viitoare pentru aceste fluxuri
trebuie să includă validare, idempotency și rate limiting/CAPTCHA unde este cazul.
