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

## Direcții pregătite

- Supabase Auth și roluri: `guest`, `user`, `premium`, `admin`
- Dashboard user și dashboard admin
- Plăți cu Stripe sau alt provider
- Emailuri automate prin Resend/Nodemailer
- CMS pentru blog/news/help
- Shop și cursuri online premium
