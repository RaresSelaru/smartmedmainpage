# SmartMed Main Page

Structură inițială pentru site-ul principal SmartMed, construită cu Next.js App Router, TypeScript și Tailwind CSS.

## Comenzi

```bash
npm run dev
npm run lint
npm run build
```

## Configurare

Variabilele pornesc din `.env.example`. Pentru pagina `/grile`, setează:

```bash
NEXT_PUBLIC_GRILE_URL=https://platforma-ta-de-grile.ro
```

Pentru autentificare și conturi, configurează Supabase Auth:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://proiectul-tau.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=cheia-ta-anon
SUPABASE_SERVICE_ROLE_KEY=cheia-service-role-pentru-operatiuni-admin-viitoare
```

Aplică migrarea din `supabase/migrations/20260619000000_create_auth_profiles.sql` și setează în Supabase Auth redirect URLs:

```text
http://localhost:3000/auth/callback
https://smartmed.ro/auth/callback
```

## Direcții pregătite

- Roluri extinse: `guest`, `user`, `premium`, `admin`
- Dashboard user și dashboard admin
- Plăți cu Stripe sau alt provider
- Emailuri automate prin Resend/Nodemailer
- CMS pentru blog/news/help
- Shop și cursuri online premium
