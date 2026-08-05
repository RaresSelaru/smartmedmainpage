# Administrator SmartMed pe hosting

SmartMed nu citește o parolă de administrator din Vercel și nu creează automat
un administrator la pornirea aplicației. Contul este o identitate Supabase Auth
normală, iar permisiunea administrativă este acordată separat în baza de date și
protejată prin TOTP. Există un singur **super administrator**. Numai acesta poate
invita sau revoca alți administratori din consola SmartMed.

Acest model evită o parolă comună, păstrată ca secret de deployment, și permite
auditarea și revocarea fiecărui administrator în parte.

## 1. Pregătirea proiectului hosted

1. Aplică toate migrările din repository în proiectul Supabase țintă înainte de
   a publica versiunea aplicației care depinde de ele.
2. În Supabase Dashboard, la **Authentication → URL Configuration**, setează
   domeniul public corect ca Site URL.
3. Adaugă în Redirect URLs domeniul folosit efectiv:
   - `https://smartmedmainpage.vercel.app/auth/callback`
   - `https://smartmedmainpage.vercel.app/cont?mode=parola-noua`
   - `https://smartmed.ro/auth/callback`
   - `https://smartmed.ro/cont?mode=parola-noua`
   - `https://www.smartmed.ro/auth/callback`
   - `https://www.smartmed.ro/cont?mode=parola-noua`
4. Configurează SMTP în Supabase Auth. Poți folosi credențialele SMTP Resend,
   astfel încât invitația și recuperarea parolei să ajungă de pe domeniul
   SmartMed verificat.

Păstrează în listă doar domeniile folosite în mediul respectiv.

## 2. Creează o cheie temporară de operator

În Supabase Dashboard creează o cheie secretă dedicată pentru operația de
provisionare, în formatul curent `sb_secret_...`. Cheia ocolește RLS, deci:

- nu o pune într-o variabilă `NEXT_PUBLIC_*`;
- nu o salva în repository;
- nu o pune în Vercel doar pentru crearea administratorului;
- revoc-o imediat după verificarea finală.

## 3. Configurează operația local

Creează fișierul local ignorat de Git:

```bash
cp .env.admin.example .env.admin.local
```

Completează numai secțiunea hosted:

```dotenv
ADMIN_BOOTSTRAP_ENVIRONMENT=production
ADMIN_BOOTSTRAP_EXECUTE=true
BOOTSTRAP_ADMIN_EMAIL=adresa-ta@domeniu.ro
EXPECTED_SUPABASE_PROJECT_REF=referinta-proiectului
SUPABASE_PROJECT_REF=referinta-proiectului
SUPABASE_URL=https://referinta-proiectului.supabase.co
SUPABASE_OPERATOR_SECRET_KEY=sb_secret_cheia-temporara
ADMIN_INVITE_REDIRECT_URL=https://smartmed.ro/cont?mode=parola-noua
ADMIN_OPERATOR_REFERENCE=ADMIN-INITIAL-2026
ADMIN_CHANGE_REASON=Crearea administratorului initial SmartMed
```

Cele două referințe de proiect trebuie să fie identice. Scriptul refuză URL-uri
aproximative, proiecte diferite, redirecturi nepermise și orice mutație fără
`ADMIN_BOOTSTRAP_EXECUTE=true`.

## 4. Invită și activează administratorul

Trimite invitația:

```bash
npm run admin:hosted:invite
```

Deschide emailul primit și alege o parolă puternică, unică. Parola este procesată
de Supabase Auth și nu este văzută de script sau de Vercel.

După confirmarea identității, acordă rolul administrativ:

```bash
npm run admin:hosted:grant
```

Atribuie apoi proprietarul unic al consolei:

```bash
npm run admin:hosted:grant-super-admin
```

Operația este idempotentă pentru proprietarul curent. Transferul de proprietate
este o operație de recuperare separată, disponibilă numai prin cheia temporară
de operator; nu este expusă în browser.

Intră pe `https://smartmed.ro/admin`. Aplicația te va conduce la configurarea
TOTP. Scanează codul cu o aplicație de autentificare și confirmă primul cod.

Verifică apoi starea hosted:

```bash
npm run admin:hosted:verify
```

Rezultatul așteptat este `READY_FOR_INTERACTIVE_AAL2_CHECK`. Verificarea finală
este un login real urmat de acces la `/admin` după codul TOTP.

## 5. Curățare după provisionare

1. Revocă cheia temporară `sb_secret_...` din Supabase Dashboard.
2. Șterge `.env.admin.local` sau elimină cel puțin cheia operatorului.
3. Nu adăuga în Vercel `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
   `BOOTSTRAP_ADMIN_EMAIL` sau `SUPABASE_OPERATOR_SECRET_KEY`.

În Vercel rămân doar configurația normală a aplicației și politica MFA:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://referinta-proiectului.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_cheia-publica
CMS_REQUIRE_ADMIN_MFA=true
```

`SUPABASE_SECRET_KEY` poate exista separat în Vercel numai dacă worker-ele
server-side pentru emailuri au nevoie de ea. Nu reprezintă identitatea sau parola
administratorului și nu trebuie expusă browserului.

## Administratori suplimentari și revocare

Super administratorul folosește pagina **Admin → Administratori**. Introduce
emailul colegului și motivul acordării accesului, iar sistemul trimite o invitație
individuală. Rolul devine activ numai după confirmarea acelei adrese. Fiecare
administrator folosește propriul cont și propriul TOTP; conturile comune nu sunt
acceptate.

Administratorii obișnuiți nu văd modulul de gestiune a echipei și nu pot acorda,
revoca sau transfera roluri nici prin apeluri directe la API. Super
administratorul își reconfirmă TOTP pentru invitații și revocări, iar fiecare
operație este auditată cu actor, motiv și identificator de corelare.

În cazul unui incident, accesul unui administrator se revocă din aceeași pagină,
cu reintroducerea exactă a emailului și un motiv obligatoriu. Pentru recuperarea
proprietarului unic se folosește numai procedura service-only
`admin:hosted:grant-super-admin`, cu o cheie temporară revocată imediat după
operație.
