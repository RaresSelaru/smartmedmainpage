# SmartMed — Raport de implementare pentru control plane-ul administrativ și CMS-ul editorial

> Data raportului: 2026-07-29
>
> Revizia de bază: `2b9add19eaf91285a892b1be82a1acd0fd029b06` (`2b9add1`)
>
> Stare: implementare prezentă în worktree; validările locale disponibile sunt verzi, iar pașii care necesită identități, Docker/Podman sau acces hosted sunt marcați explicit ca neexecutați.

## 1. Executive Summary

Implementarea păstrează Supabase drept unica sursă de adevăr pentru conținut, autentificare și autorizare. Nu a fost introdus Sanity, un CMS paralel, o a doua autentificare sau o cheie privilegiată necesară în runtime-ul Next.js.

Au fost adăugate:

- un control plane administrativ modular la `/admin`, în limba română;
- capabilități tipizate și verificări pe server, completate de RPC-uri, granturi și RLS;
- TOTP MFA/AAL2 pentru administratori, cu excepție strict locală și fail-closed;
- un CMS generic Blog/News peste tabelele și reviziile existente;
- conținut structurat v1, snapshot-uri editoriale imuabile și concurență optimistă;
- preview exact și privat, pipeline media privat/public și audit tranzacțional append-only;
- Blog public autoritativ din Supabase, fără reînvierea fallback-ului bundled;
- căutare, cache/revalidare, SEO, sitemap și robots aliniate cu starea publicată;
- un singur fișier de migrare additive și un seed fără credențiale;
- tooling operator local/hosted, teste unitare, SQL/pgTAP și Playwright.

Pagina statică existentă `/news` a fost păstrată. Înregistrările CMS News pot fi create, editate și previzualizate, dar nu pot fi publicate și nu sunt conectate la routing, Blog, căutare, related content sau sitemap.

Implementarea nu a modificat automat niciun proiect hosted. Provisionarea locală, invitația/grantul hosted, înscrierea TOTP și verificarea interactivă AAL2 rămân neexecutate din lipsa credențialelor și a runtime-ului local Supabase.

## 2. Initial HEAD and Git Status

- Branch la început și la momentul raportului: `main`.
- HEAD inițial și curent: `2b9add19eaf91285a892b1be82a1acd0fd029b06`.
- Mesajul commitului de bază: `Replace module placeholders with shared artwork`.
- Fișier preexistent, untracked și păstrat: `docs/CMS_INTEGRATION_READINESS_AUDIT.md`.
- Hash-ul auditului la momentul raportului: `9de86313e82d51c6c3f6ac9cdd662783ec78f82ceb708b28ce9dde938a27edce`.
- Auditul nu a fost rescris, mutat, adăugat în staging sau șters.
- Nu s-a executat reset destructiv, checkout distructiv, commit, push, deployment sau mutație hosted.

Baseline-ul consemnat în brief avea cele șase teste existente, typecheck, lint și build verzi. Worktree-ul curent este intenționat dirty deoarece conține implementarea prezentă și auditul inițial untracked.

## 3. Audit Conclusions Revalidated Against Current HEAD

Concluzia auditului de readiness a fost `YELLOW`: fundația Supabase era adecvată, iar recomandarea era un admin SmartMed propriu, nu Sanity în paralel. Această concluzie a fost revalidată astfel:

| Concluzie audit | Stare după implementare |
| --- | --- |
| Supabase trebuie să rămână CMS autoritativ | Implementat; citirile și mutațiile CMS folosesc exclusiv Supabase |
| Sanity paralel nu este recomandat | Respectat; nicio dependență, schemă sau rută Sanity |
| Lipsea un control plane editorial | Implementat la `/admin` și `/admin/content` |
| Lipseau capabilități și o limită de mutație îngustă | Implementate în TypeScript și în RPC-uri `SECURITY DEFINER` cu granturi exacte |
| Lipseau preview, conținut structurat și media privată | Implementate pentru revizii exacte și bucket-ul privat `cms-media` |
| Fallback-ul bundled era nesigur pentru takedown | Eliminat din traseul public de producție |
| Search/SEO/sitemap nu urmăreau autoritatea CMS | Actualizate pentru Blog publicat; CMS News este exclus |
| Starea producției și topologia cache erau necunoscute | Rămân necunoscute și necesită staging |

Riscurile dependente de runtime din audit nu sunt declarate închise doar prin cod. SMTP, cookie-urile și Auth hosted, shared cache multi-instance, RLS-ul hosted, backup/restore și comportamentul real al hostingului trebuie verificate înainte de rollout.

## 4. Administrative Control Plane Architecture

Arhitectura administrativă folosește apărare în profunzime:

1. `src/proxy.ts` face numai verificarea optimistă a sesiunii și propagarea cookie-urilor.
2. `requireAdminIdentity()` validează utilizatorul Supabase Auth real, emailul confirmat, profilul, rolul DB și AAL.
3. `requireAdminCapability()` sau `authorizeAdminCapability()` protejează fiecare pagină, acțiune, preview și handler media.
4. Server Actions validează inputul și apelează exclusiv RPC-uri înguste.
5. Fiecare RPC își derivă actorul din `auth.uid()`, verifică o capabilitate fixă, blochează rândurile relevante și scrie auditul în aceeași tranzacție.
6. Granturile și RLS blochează accesul direct neautorizat la tabele, revizii și Storage.

Supabase Auth existent rămâne singurul sistem de identitate. Nu există sesiune admin separată, cookie separat sau credential store paralel.

## 5. Admin Layout and Module Registry

`/admin` are un layout dinamic, privat și `noindex`, cu:

- sidebar desktop și navigare compactă pentru tabletă/mobil;
- identitatea utilizatorului și indicator AAL/MFA;
- link către site-ul public și deconectare prin fluxul existent;
- skip link, focus vizibil și stări active pentru navigare;
- eliminarea Navbar/Footer publice pe toate rutele `/admin/**` prin wrapper-ul route-aware.

Registrul modulelor este server-only în `src/lib/admin/modules.ts`. Definiția `AdminModuleDefinition` conține `id`, etichetă și descriere în română, path `/admin`, icon key, ordine și capabilitatea obligatorie. Este înregistrat numai modulul `content`.

Browserul primește doar `AdminModuleSummary`, adică date serializabile deja filtrate. Pentru un modul viitor se adaugă o definiție în registrul server-only și se declară capabilitatea necesară; registrul nu înlocuiește autorizarea paginii sau a datelor.

## 6. Capability Model

Tuple-ul autoritativ este:

```text
admin.access
content.read
content.create
content.update
content.preview
content.publish
content.unpublish
content.archive
content.media.manage
```

Rolul DB exact `admin` rezolvă toate capabilitățile curente printr-un resolver server-side. Orice rol necunoscut, casing diferit sau capabilitate necunoscută eșuează fail-closed.

Aceeași listă este reflectată în `private.has_cms_capability()`. RPC-urile nu acceptă o capabilitate aleasă de client; fiecare invocă intern capabilitatea fixă pentru operația sa.

## 7. Normal User vs Admin Separation

Separarea este aplicată la mai multe niveluri:

- anonimii fără sesiune sunt redirecționați către login cu un return path intern sanitizat;
- conturile `user` și `premium` nu rezolvă capabilități administrative;
- un non-admin primește o negare controlată, fără detalii despre datele admin;
- un admin AAL1 este trimis la `/admin/mfa` când MFA este obligatoriu;
- signup-ul public nu poate selecta rolul `admin`;
- metadata editabilă a utilizatorului nu este folosită pentru autorizare;
- `authenticated` nu mai are drepturi directe INSERT/UPDATE/DELETE asupra tabelelor CMS/media;
- anonimii și utilizatorii obișnuiți nu pot citi reviziile de lucru, media draft sau auditul privat.

Proxy-ul nu este tratat ca limită finală de autorizare. Paginile, serviciile, acțiunile, RPC-urile și politicile verifică din nou accesul.

## 8. Authoritative Admin Role Storage

Rolul SmartMed autoritativ este `public.account_roles.role`, asociat cu `auth.users.id`. Pentru acces admin sunt obligatorii concomitent:

- un utilizator Auth real și neanonim;
- email confirmat;
- rând existent în `public.profiles`;
- rând în `public.account_roles` cu rolul exact `admin`;
- AAL2 atunci când setarea privată cere MFA.

Auto-promovarea este împiedicată prin:

- lipsa dreptului direct `UPDATE` pentru `authenticated` pe `account_roles`;
- ignorarea `raw_user_meta_data.role`;
- RPC-urile `cms_operator_grant_admin` și `cms_operator_revoke_admin` executabile numai de `service_role`;
- verificarea utilizatorului țintă confirmat/neanonim și audit operator obligatoriu.

Runtime-ul aplicației nu apelează aceste RPC-uri operator și nu importă cheia operator.

## 9. MFA and AAL2 Enforcement

`private.admin_security_settings` este singleton, privat și pornește cu `require_mfa=true`. `private.is_admin()` cere identitate confirmată, rol DB exact și `auth.jwt()->>'aal' = 'aal2'`, cu singura excepție a bypass-ului local explicit.

În aplicație:

- configurația lipsă, invalidă sau `false` în production/nonlocal eșuează fail-closed;
- `false` este permis numai în development/test cu originea Supabase exactă `http://localhost:54321` sau `http://127.0.0.1:54321`;
- `/admin/mfa` folosește `listFactors`, `enroll`, `challenge`, `verify` și `getAuthenticatorAssuranceLevel`;
- după verificare se reîmprospătează UI/sesiunea și se revine numai la un path `/admin` sanitizat;
- QR-ul și secretul TOTP trăiesc numai în starea ferestrei curente și nu sunt persistate sau logate.

Dezactivarea cerinței DB poate fi făcută numai de RPC-ul service-only `cms_operator_set_local_mfa_requirement`, care verifică URL-ul local exact și scrie audit.

Verificarea unei sesiuni interactive AAL2 reale: **NEEXECUTATĂ — CREDENȚIALE/FACTOR TOTP INDISPONIBILE**.

## 10. Local Admin Provisioning

Comanda implementată este:

```text
npm run admin:provision:local
```

Fluxul:

- acceptă numai URL-urile Supabase locale exacte;
- cere o parolă prin mediu, cu minimum 14 caractere, literă mică, literă mare, cifră și simbol;
- creează sau actualizează idempotent un utilizator confirmat;
- asigură profilul și rolul implicit;
- acordă rolul prin RPC service-only;
- autentifică separat cu clientul publishable;
- verifică `/admin` și `/admin/content`;
- creează temporar un utilizator obișnuit, verifică negarea `/admin`, apoi îl șterge;
- nu acceptă credențiale în argumente și nu le include în output.

Variabile locale:

```text
LOCAL_ADMIN_EMAIL
LOCAL_ADMIN_PASSWORD
LOCAL_ADMIN_DISPLAY_NAME
LOCAL_SUPABASE_URL
LOCAL_SUPABASE_ADMIN_KEY
LOCAL_SUPABASE_PUBLISHABLE_KEY
LOCAL_APP_URL
ADMIN_OPERATOR_REFERENCE
ADMIN_CHANGE_REASON
CMS_REQUIRE_ADMIN_MFA
```

Stare: **NOT EXECUTED — LOCAL SUPABASE/ADMIN CREDENTIALS UNAVAILABLE**. Administratorul local nu a fost creat, `/admin` și `/admin/content` nu au fost verificate cu o identitate provisionată, iar negarea unui utilizator obișnuit nu a fost verificată interactiv.

## 11. Hosted Admin Invitation

Comanda implementată:

```text
npm run admin:hosted:invite
```

Folosește `inviteUserByEmail`, după:

- `ADMIN_BOOTSTRAP_EXECUTE=true`;
- egalitate exactă între project ref așteptat și cel declarat;
- origine exactă `https://<project-ref>.supabase.co`;
- redirect HTTPS exact către fluxul existent de setare a parolei;
- email unic rezolvat exact;
- operator reference și reason obligatorii.

Template-ul Supabase a fost corectat să folosească `{{ .ConfirmationURL }}`. Acceptarea invitației trece prin fluxul existent `/cont?mode=parola-noua`, care verifică sesiunea înainte de schimbarea parolei.

Stare: **NOT EXECUTED — HOSTED CREDENTIALS UNAVAILABLE**. Acceptarea invitației este **PENDING**.

## 12. Hosted Admin Role Grant

Comanda implementată:

```text
npm run admin:hosted:grant
```

Grantul este separat de invitație. Înainte de mutație, CLI-ul cere:

- o singură identitate cu emailul exact;
- email confirmat;
- utilizator neanonim;
- profil SmartMed existent;
- țintă hosted validată exact;
- execute flag, operator reference și reason.

Mutația folosește `cms_operator_grant_admin`, iar CLI-ul citește înapoi `public.account_roles` pentru confirmare.

Stare: **NOT EXECUTED — HOSTED CREDENTIALS UNAVAILABLE**. Grantul rolului este **PENDING**.

## 13. Hosted Admin Verification and Revocation

Comenzile implementate:

```text
npm run admin:hosted:verify
npm run admin:hosted:revoke
```

Verify este read-only și verifică identitatea, confirmarea emailului, profilul, rolul DB și existența unui factor TOTP verificat. Nu solicită parola și nu poate demonstra singur o sesiune interactivă AAL2.

Revoke cere aceleași guard-uri de mutație ca grantul, apelează RPC-ul service-only, schimbă rolul la `user` și verifică rezultatul. Revocarea sesiunilor și a factorilor rămâne un pas operator separat.

Stări:

- hosted verify: **NOT EXECUTED — CREDENTIALS UNAVAILABLE**;
- hosted revoke: **NOT EXECUTED — CREDENTIALS UNAVAILABLE**;
- MFA enrollment: **PENDING**;
- sesiune AAL2: **NOT VERIFIED**;
- acces `/admin`: **NOT VERIFIED WITH HOSTED IDENTITY**;
- acces `/admin/content`: **NOT VERIFIED WITH HOSTED IDENTITY**;
- negare normal-user: **NOT VERIFIED INTERACTIVELY**.

Ordinea de recovery documentată este: revocă mai întâi rolul, revocă sesiunile/factorii prin controalele Supabase suportate, restabilește identitatea, apoi regrant numai după înscriere TOTP nouă și verificare AAL2.

## 14. Operator Secrets and Runtime Separation

Cheile operator sunt consumate exclusiv de `scripts/admin-provision.ts`, în afara importurilor aplicației. Runtime-ul Next.js folosește numai clientul publishable și sesiunea utilizatorului.

Controale:

- niciun nume de variabilă operator nu are prefix `NEXT_PUBLIC_`;
- `.env.admin.local` rămâne ignorat;
- sunt unignored numai `.env.example` și `.env.admin.example`;
- CLI-ul acceptă numai numele comenzii în argumente;
- sumarul țintei omite secretul;
- erorile raportează coduri, nu credențiale;
- nu a fost introdus `SUPABASE_SERVICE_ROLE_KEY` în runtime;
- uploadul, preview-ul și media publică folosesc sesiunea/publishable client plus RLS.

Nu există cont production comun, parolă implicită sau credențial creat la build/startup.

Raportul nu conține parole, tokenuri, invitații, secrete MFA, chei operator sau URL-uri media semnate.

## 15. Generic Content Architecture

Câmpul care diferențiază Blog de News este `public.content_entries.kind`:

| Admin kind | DB kind | Canal public |
| --- | --- | --- |
| `blog` | `article` | `/blog`, activ |
| `news` | `news` | niciun path, inactiv |

Nu a fost adăugat `content_kind` și nu au fost create tabele separate `blog_posts`/`news_posts`. Unicitatea globală a slugului existent este păstrată și întărită prin `private.content_slug_claims`, care rezervă simultan slugurile live și pending.

Arhitectura reutilizează `content_entries` drept proiecție publică și `content_revisions` drept istoric imuabil. `working_revision_id` și `published_revision_id` sunt independente: draftul nou nu schimbă metadata publică până la publish.

Registrul de canale este `private.content_channels`, seed-uit cu `article → true, /blog` și `news → false, null`.

UI-ul `/admin/content` validează filtrele din URL, folosește pagini server de 20 de rânduri și afișează tabel desktop/carduri mobile. Create oferă Blog/News. Edit separă metadata de body, marchează dirty state, prezintă erori pe câmp, istoric read-only, badge-uri working/published, preview exact, upload media, mutare sus/jos și confirmări pentru publish/unpublish/archive.

## 16. Blog Behavior

Blog poate fi creat, salvat, previzualizat, publicat, retras și arhivat. La publicare:

- revizia de lucru așteptată este promovată atomic;
- snapshot-ul actualizează title, slug, excerpt, autor, cover, taxonomii, SEO, note editoriale și related entries;
- numai media referită de o revizie Blog publicată poate deveni publică;
- cache-ul și căile relevante sunt invalidate numai după o mutație schimbată și confirmată.

`published_at` este păstrat după unpublish/archive ca marker „a fost publicat”, ceea ce blochează schimbarea kind-ului după prima publicare.

Listele publice sunt paginate la 18 elemente în UI și citesc proiecții summary fără body. Detaliul este rezolvat direct după `kind=article`, slug, published/public și data atinsă.

## 17. Future News Readiness

News folosește aceeași infrastructură generică:

- creare atomică și revizie v1 inițială;
- editare, validare, media și istoric de revizii;
- preview autorizat al unei revizii exacte;
- snapshot editorial și slug rezervat;
- filtrare în lista administrativă.

UI-ul afișează explicit că publicarea News nu este activată și dezactivează acțiunea. Pagina statică `/news` rămâne independentă.

Activarea publică viitoare a News trebuie făcută printr-o migrare explicită nouă și implementarea separată a routingului/read layer-ului; nu se schimbă registrul direct în production.

## 18. News Publication Gate

Publicarea News este blocată în cinci straturi:

1. UI: butonul este indisponibil și mesajul explică motivul.
2. Server Action: `publishContentAction` respinge kind-ul trusted `news`.
3. RPC: `cms_publish_content` permite numai `article` cu canal activ.
4. Trigger: orice tranziție DB la `published` pe un canal inactiv eșuează.
5. RLS/read layer: politicile cer canal public activ, iar query-urile Blog filtrează explicit `kind=article`.

Migrarea se oprește dacă există deja un rând News publicat. Testele SQL verifică faptul că respingerea nu schimbă starea.

CMS News nu apare în `/blog`, global search, related content, sitemap sau media publică.

## 19. Existing Schema Reused

Au fost reutilizate, fără rescrierea migrărilor istorice:

- `public.content_entries`;
- `public.content_revisions`;
- `public.content_authors`;
- `public.content_categories`;
- `public.content_tags`;
- `public.content_entry_categories`;
- `public.content_entry_tags`;
- `public.content_relations`;
- `public.media_assets`;
- `public.profiles`;
- `public.account_roles`;
- `private.audit_log`;
- Supabase Auth și Storage.

`content_entries` și join-urile de taxonomie rămân proiecția publică. Metadata draft rămâne în snapshot-ul reviziei de lucru până la publish.

## 20. Additive Migrations Created

Da, a fost necesară o migrare. A fost creată o singură migrare:

```text
supabase/migrations/20260729104112_secure_admin_cms.sql
```

Migrarea este additive și:

- face preflight pentru News publicat;
- creează registrele private pentru canale, MFA și slug claims;
- adaugă `working_revision_id`, `schema_version` și `editorial_snapshot`;
- marchează body-urile existente cu schema legacy `0`;
- backfill-uiește working pointers, snapshot-uri și slug claims;
- creează relația imuabilă `content_revision_media` și indexurile aferente;
- extinde auditul cu correlation/operator/reason/context;
- adaugă validatorii document/snapshot/link și trigger-ele de ownership;
- adaugă RPC-urile admin/media/operator;
- restrânge granturile și actualizează RLS/Storage policies;
- creează bucket-ul privat `cms-media`;
- face reviziile, relațiile media și auditul append-only.

Suprafața RPC este: `cms_list_content`, `cms_get_content`, `cms_get_revision`, `cms_create_content`, `cms_save_draft`, `cms_publish_content`, `cms_unpublish_content`, `cms_archive_content`, `cms_register_media`, `cms_archive_media`, `cms_operator_grant_admin`, `cms_operator_revoke_admin` și `cms_operator_set_local_mfa_requirement`.

`supabase/seed.sql` este fără credențiale și verifică doar configurația canalelor. Nu creează identități.

Lanțul complet de migrări plus seed a fost aplicat cu exit 0 pe PostgreSQL 18.3 izolat, cu scheme minime de compatibilitate Auth/Storage deoarece Docker nu era disponibil. Comenzile de reproducere folosite au fost:

```text
for migration in supabase/migrations/*.sql; do /Users/raresselaru/Applications/Postgres.app/Contents/Versions/latest/bin/psql -h /tmp/smartmed-pg-Zw367G -p 55439 -U postgres -d cms_validation3 -v ON_ERROR_STOP=1 -f "$migration"; done
/Users/raresselaru/Applications/Postgres.app/Contents/Versions/latest/bin/psql -h /tmp/smartmed-pg-Zw367G -p 55439 -U postgres -d cms_validation3 -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

Această validare nu înlocuiește `supabase db reset` într-un runtime Supabase real.

Typegen CLI a fost încercat, dar generatorul container-backed a cerut Podman indisponibil. `src/lib/supabase/database.types.ts` a fost sincronizat manual din schema validată și introspecția exactă a funcțiilor. Regenerarea oficială după aplicarea migrării rămâne pas obligatoriu în staging.

## 21. Article and Revision Lifecycle

- **Create:** creează entry draft și revizia v1 numărul 1, atașează media și rezervă slugul.
- **Save:** cere `expectedWorkingRevisionId`; stale input primește conflict `40001` și nu suprascrie. Se inserează o revizie nouă; istoricul nu este modificat.
- **Published save:** actualizează numai working pointer/snapshot; proiecția publică rămâne fixată.
- **Publish:** promovează exact working revision și snapshot-ul său, taxonomiile, relațiile, slugul și media.
- **No-op publish:** returnează `changed=false` și nu invalidează public.
- **Unpublish:** setează `draft`, golește published pointer și accesul media, dar păstrează istoricul și `published_at`.
- **Archive:** elimină vizibilitatea publică, păstrează istoria și face conținutul read-only.
- **Restore/delete/revert:** în afara domeniului.

RPC-urile returnează receipt-ul cu revizia afectată și slugurile vechi/noi. Actorul persistat este derivat din `auth.uid()`.

Server Actions folosesc contractul unificat `{ok:true,data}` sau `{ok:false,code,message,fieldErrors?}` și traduc conflictele, slug collisions, canalul dezactivat, referințele indisponibile și starea archived în erori controlate.

## 22. Structured Content Format

Formatul persistat este exclusiv:

```text
ContentDocument { version: 1, blocks: ContentBlock[] }
```

Blocuri aprobate:

- paragraph;
- heading H2/H3;
- ordered/unordered list;
- blockquote;
- image;
- YouTube;
- callout `important`, `warning`, `medical-note`;
- references structurate.

Textul folosește numai run-uri text/link, cu marks bold/italic. Blocurile și item-urile au UUID stabil. Nu se persistă HTML, MDX, atribute iframe, target sau JSON nativ editorului.

Limitele implementate sunt:

| Câmp | Limită |
| --- | ---: |
| title / slug | 160 |
| excerpt | 320 |
| SEO title / description | 70 / 180 |
| heading / YouTube title | 200 |
| paragraph | 5.000 |
| list item | 1.000 |
| URL | 2.048 |
| annotation | 500 |
| blocks | 300 |
| list/reference items | 100 |
| text total | 100.000 |
| document serializat | 512 KiB |

Linkurile interne sunt normalizate și rămân în aceeași fereastră. Linkurile externe acceptă numai HTTPS și sunt randate cu `target="_blank"` și `rel="noopener noreferrer external"`. YouTube stochează numai ID exact de 11 caractere și produce hostul fix `youtube-nocookie.com`.

Validarea există în Zod și SQL. Inputul invalid este respins, nu trunchiat. Citirea legacy v0 adaptează doar blocurile cunoscute. La render, un bloc persistat malformat este omis individual și diagnosticul este sanitizat; articolul complet nu execută markup și nu se prăbușește.

## 23. Editor Dependency Decision

Dependențele au fost pin-uite exact:

```text
lexical 0.48.0
@lexical/react 0.48.0
@lexical/rich-text 0.48.0
@lexical/list 0.48.0
@lexical/link 0.48.0
```

Lexical a fost ales pentru editare rich-text controlată și extensibilă, fără a transforma formatul editorului în modelul de persistență. Este client-only și gestionează editarea inline cu bold, italic și linkuri. Sunt allowlist-uite Heading, Quote, List, ListItem și Link, plus noduri stricte SmartMed pentru image, YouTube, callout și references.

Nodurile SmartMed:

- validează payload-ul prin schema canonică;
- nu au cale de HTML import;
- nu exportă DOM/HTML;
- au teste de round-trip;
- nu sunt persistate ca JSON Lexical.

Controalele structurale și ordinea blocurilor rămân application-owned. Rendererul public importă numai `ContentDocument`, niciodată Lexical.

## 24. Media Pipeline

`sharp` este dependență server directă, pin-uită la `0.35.3`.

Uploadul:

- este Route Handler same-origin, Node runtime, dinamic și no-store;
- cere `content.media.manage`, rol admin exact și AAL2;
- acceptă JPEG, PNG și WebP numai când extensia, MIME, magic bytes și decoderul sunt de acord;
- respinge SVG, input animat, fișier gol, mismatch, dimensiuni și mărimi excesive;
- folosește limite implicite 6 MiB și 4096×4096, override-uri validate și hard caps 10 MiB/6000×6000;
- auto-orientează, elimină metadata prin re-encodare WebP quality 82 și calculează SHA-256;
- generează 640, 1280, 1920 și original capped, fără upscale;
- folosește UUID aleator pentru path și nu folosește numele uploadat ca path;
- încearcă best-effort cleanup dacă uploadul sau înregistrarea eșuează.

Bucket-ul `cms-media` este privat. Preview-ul folosește `/admin/media/...`, cu autorizare și cache privat. Publicarea recalculează `access_level` în funcție de toate reviziile Blog încă publicate. Unpublish/archive retrag imediat accesul când nu mai există referințe publice.

Ruta publică `/media/cms/...` folosește clientul publishable și Storage RLS, ETag și `must-revalidate`. Bucket-urile existente nu sunt modificate.

## 25. Preview Behavior

Preview-ul este:

- `/admin/content/[id]/preview?revision=<id>`;
- dinamic, privat, no-store și noindex;
- protejat cu `content.preview`;
- citit prin `cms_get_revision(entryId, revisionId)`;
- legat de entry-ul exact și revizia imuabilă exactă;
- randat prin același `ContentRenderer` ca articolul public;
- conectat la resolverul media admin, nu la media publică.

Nu există preview partajabil, token public, Draft Mode sau URL semnat. Istoricul este read-only; revert este amânat.

## 26. Cache and Revalidation Behavior

Proiecțiile Blog publice folosesc:

- React `cache()` pentru deduplicare în request;
- `unstable_cache` încapsulat, tag `public-blog`;
- TTL de siguranță 60 secunde;
- preflight de configurație înaintea cache-ului, astfel încât lipsa configurației să nu returneze o proiecție cache-uită anterior.

După o mutație Blog schimbată și confirmată:

- `updateTag("public-blog")`;
- revalidare `/blog`;
- revalidare vechiul și noul `/blog/<slug>`;
- revalidare `/cautare`;
- revalidare `/sitemap.xml`.

Draft save, News, no-op și operațiile eșuate nu invalidează public. Unpublish/archive refuză mutația dacă kind-ul trusted nu poate fi citit, apoi invalidează numai Blog.

Shared invalidation multi-instance nu a fost verificat. Dacă hostingul real nu garantează propagarea, rollout-ul trebuie să dezactiveze cache-ul pentru citirile CMS publice, nu să accepte un takedown stale.

## 27. Public Blog Read-Layer Changes

`src/lib/blog-repository.ts` este acum o fațadă peste repository-ul public CMS.

Comportament:

- nu mai există fallback production la articole bundled;
- eroarea de configurație/outage este distinctă de un slug inexistent;
- outage-ul produce o stare românească controlată, fără a „resuscita” articole retrase;
- summary select nu conține body;
- detail select rezolvă direct slugul și published revision;
- toate query-urile filtrează explicit `kind=article`, `status=published`, `visibility=public` și `published_at <= now`;
- RLS cere în plus canal public activ;
- citirea listelor este batch-uită și limitată;
- related entries sunt verificate ca Blog publicat, cu fallback de scor tot peste summaries publice.

`generateStaticParams()` a fost eliminat. CMS News nu poate trece mapperul deoarece `kind` trebuie să fie exact `article`.

## 28. Search, SEO and Sitemap

Căutarea globală este asincronă și combină paginile statice cu Blog summaries autoritative. Pagina statică `/news` rămâne în indexul static; înregistrările CMS News nu intră în search.

SEO Blog include:

- canonical;
- Open Graph `article`;
- Twitter large image;
- date de publicare și modificare;
- imagine socială;
- `<time dateTime>`;
- JSON-LD `Article` sau `MedicalWebPage` când există reviewer.

JSON-LD este serializat cu neutralizarea caracterelor care pot închide scriptul și este randat drept text al elementului `<script>`, fără `dangerouslySetInnerHTML`.

`sitemap.ts` include rutele statice și numai Blog publicat. La outage CMS păstrează numai sitemap-ul static. `robots.ts` exclude admin/auth/search/account/template. `/sablon-articol` și toate rutele admin sunt `noindex`.

## 29. Administrative Audit Infrastructure

`private.audit_log` a fost extins cu:

- `correlation_id`;
- `operator_reference`;
- `reason`;
- `context` JSON obiect;
- index pe correlation/time.

Evenimentele acoperă create/save/publish/unpublish/archive, media register/archive, grant/revoke admin și schimbarea cerinței MFA locale.

Auditul:

- se scrie în aceeași tranzacție cu mutația;
- leagă actorul de `auth.uid()` sau actor service explicit;
- conține stări înainte/după nesensibile, kind, IDs și context operațional;
- nu conține body, credențiale, tokenuri, secrete MFA, chei sau signed URLs;
- este append-only prin trigger;
- păstrează UUID-ul istoric al actorului chiar dacă identitatea Auth este ulterior eliminată.

## 30. Security Controls Implemented

- verificare server-side a identității, rolului, capabilității și AAL;
- resolver fail-closed și registru module server-only;
- RPC-uri înguste `SECURITY DEFINER`, `search_path=''`, row locking și actor binding;
- granturi explicite și revocarea direct writes pentru `authenticated`;
- RLS pentru entry/revision/taxonomy/relation/media/Storage;
- News gate în UI, serviciu, RPC, trigger și RLS;
- revizii, relații media și audit append-only;
- slug claims globale live/pending și ownership triggers;
- Zod + SQL validation pentru content/snapshot/link/media;
- fără HTML/MDX/arbitrary components și fără `dangerouslySetInnerHTML` în renderer;
- HTTPS-only extern și YouTube ID allowlist;
- same-origin `Origin` obligatoriu pentru uploadul cookie-authenticated;
- bucket media privat, publicare derivată din referințe și ETag;
- no-store/noindex pentru admin și preview;
- CSP cu origini Supabase configurate și `youtube-nocookie.com`;
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`;
- nosniff, DENY framing, strict-origin referrer și Permissions Policy conservatoare;
- guard-uri stricte pentru țintele operator local/hosted;
- nicio cheie operator în bundle/runtime;
- template de invitație cu ConfirmationURL;
- HSTS amânat intenționat.

## 31. Tests Added

### Unitare TypeScript

Acoperă:

- capability tuple, role mapping și fail-closed;
- filtrele listei și construirea linkurilor paginate;
- MFA env/local origin guards și redirect sanitization;
- guard-uri de provisionare, parole locale și redaction;
- toate blocurile ContentDocument, limitele, UUID-urile și snapshot-ul;
- linkuri nesigure, surse imagine HTTPS și YouTube;
- adaptare legacy și omiterea blocurilor corupte;
- Lexical inline și nodurile custom fără HTML;
- renderer safety, preview parity și JSON-LD escaping;
- channel mapping și revalidation paths;
- upload same-origin, MIME/signature/decode/dimensions;
- WebP variants/checksum/config caps și fallback fără upscale.

### SQL/pgTAP

Acoperă schema, backfill, canale, MFA implicit, granturi, direct-write revocation, ownership, append-only, AAL1/AAL2, metadata spoofing, create/save/conflict/preview/publish/unpublish/archive, News gate, slug rename/promotion, media privacy/retragere, service-only grant/revoke și bypass local.

### Playwright

Tooling-ul este pin-uit la `tsx 4.22.5` și `@playwright/test 1.62.0`. Sunt configurate Chromium, trace/video/screenshot off și:

- redirect anonim `/admin`;
- pagina statică `/news`;
- noindex template;
- outage Blog fail-closed fără fallback;
- security headers;
- smoke admin/content și News draft, conditionate de credențiale.

## 32. Validation Results

| Comandă / verificare | Rezultat | Observații |
| --- | --- | --- |
| `npm run test:unit` | **PASS — 54/54** | Fără fail/skipped |
| Replay migrări + seed pe PostgreSQL 18.3 izolat | **PASS** | Exit 0; Auth/Storage compatibility stubs |
| SQL/pgTAP behavior suite | **PASS — 62/62** | Include HTTPS source parity și rename slug-claim; tranzacția a fost rollback |
| `npm run typecheck` | **PASS** | `tsc --noEmit --incremental false` |
| `npm run lint` | **PASS** | ESLint fără erori la rularea finală |
| `npm run build` | **PASS** | Next 16.2.12; 33 pagini/rute generate; rutele admin, MFA, upload și media protejată sunt dinamice |
| `npm run test:e2e` | **PASS — 5 passed, 2 skipped** | Skip-urile sunt fluxurile cu admin provisionat/TOTP; 0 failures |
| `git diff --check` | **PASS** | Fără whitespace errors |
| `npx supabase status` | **NEEXECUTABIL LOCAL** | Docker/Podman indisponibil |
| `npm run test:db` prin runner Supabase real | **NEEXECUTAT** | Necesită Docker/Podman; harness-ul izolat este documentat separat |
| `supabase db reset` | **NEEXECUTAT** | Runtime Supabase local indisponibil |
| `supabase db lint` | **NEEXECUTAT** | Runtime Supabase local indisponibil |
| Supabase typegen container-backed | **ÎNCERCAT, INDISPONIBIL** | Podman indisponibil; tipurile au fost sincronizate manual din schema validată |
| Provisionare locală și acces real | **NEEXECUTAT** | Credențiale/servicii locale indisponibile |
| Hosted invite/grant/MFA/access | **NEEXECUTAT** | Credențiale hosted indisponibile |
| Codex Security diff scan | **PENDING** | Trebuie rulat după înghețarea diff-ului final |

Comanda exactă pentru suite-ul SQL izolat:

```text
/Users/raresselaru/Applications/Postgres.app/Contents/Versions/latest/bin/psql -h /tmp/smartmed-pg-Zw367G -p 55439 -U postgres -d cms_validation3 -v ON_ERROR_STOP=1 -f /tmp/smartmed-pg-Zw367G/pgtap_stub.sql -f supabase/tests/database/secure_admin_cms.test.sql
```

Browserul Playwright a emis warning-uri de hidratare pentru tema preexistentă; testele nu au eșuat. Aceste warning-uri nu sunt clasificate drept dovadă de regresie CMS, dar trebuie urmărite separat.

## 33. Environment Variable Names Added

Runtime:

```text
CMS_REQUIRE_ADMIN_MFA
CMS_MAX_IMAGE_BYTES
CMS_MAX_IMAGE_WIDTH
CMS_MAX_IMAGE_HEIGHT
```

Configurația publică Supabase existentă continuă să folosească:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Operator local:

```text
LOCAL_ADMIN_EMAIL
LOCAL_ADMIN_PASSWORD
LOCAL_ADMIN_DISPLAY_NAME
LOCAL_SUPABASE_URL
LOCAL_SUPABASE_ADMIN_KEY
LOCAL_SUPABASE_PUBLISHABLE_KEY
LOCAL_APP_URL
```

Operator hosted:

```text
ADMIN_BOOTSTRAP_ENVIRONMENT
ADMIN_BOOTSTRAP_EXECUTE
BOOTSTRAP_ADMIN_EMAIL
EXPECTED_SUPABASE_PROJECT_REF
SUPABASE_PROJECT_REF
SUPABASE_URL
SUPABASE_OPERATOR_SECRET_KEY
ADMIN_INVITE_REDIRECT_URL
ADMIN_OPERATOR_REFERENCE
ADMIN_CHANGE_REASON
```

E2E credential-gated:

```text
PLAYWRIGHT_BASE_URL
E2E_ADMIN_EMAIL
E2E_ADMIN_PASSWORD
```

Nu a fost adăugat `APP_CANONICAL_URL`; canonical URLs continuă să folosească `siteConfig.url`.

## 34. Files Created

Fișiere create de implementare:

```text
.env.admin.example
playwright.config.ts
scripts/admin-provision-lib.test.ts
scripts/admin-provision-lib.ts
scripts/admin-provision.ts
src/app/admin/api/media/route.ts
src/app/admin/content/[id]/page.tsx
src/app/admin/content/[id]/preview/page.tsx
src/app/admin/content/actions.ts
src/app/admin/content/new/page.tsx
src/app/admin/content/page.tsx
src/app/admin/layout.tsx
src/app/admin/media/[id]/[variant]/route.ts
src/app/admin/mfa/page.tsx
src/app/admin/page.tsx
src/app/blog/[slug]/not-found.tsx
src/app/blog/error.tsx
src/app/media/cms/[id]/[variant]/route.ts
src/app/robots.ts
src/app/sitemap.ts
src/components/admin/admin-shell.tsx
src/components/admin/content-block-editor.tsx
src/components/admin/content-editor-form.tsx
src/components/admin/inline-lexical-editor.tsx
src/components/admin/lexical-content-nodes.test.ts
src/components/admin/lexical-content-nodes.ts
src/components/admin/mfa-panel.tsx
src/components/admin/new-content-form.tsx
src/components/layout/route-aware-public-chrome.tsx
src/lib/admin/action-result.ts
src/lib/admin/auth.ts
src/lib/admin/capabilities.test.ts
src/lib/admin/capabilities.ts
src/lib/admin/config.test.ts
src/lib/admin/config.ts
src/lib/admin/content-filters.test.ts
src/lib/admin/content-filters.ts
src/lib/admin/content-form-utils.test.ts
src/lib/admin/content-form-utils.ts
src/lib/admin/content-repository.ts
src/lib/admin/content-types.ts
src/lib/admin/lexical-conversion.test.ts
src/lib/admin/lexical-conversion.ts
src/lib/admin/module-types.ts
src/lib/admin/modules.ts
src/lib/admin/redirects.test.ts
src/lib/admin/redirects.ts
src/lib/content/cache.ts
src/lib/content/channels.ts
src/lib/content/index.ts
src/lib/content/legacy.ts
src/lib/content/media.ts
src/lib/content/public-repository.ts
src/lib/content/renderer.test.tsx
src/lib/content/renderer.tsx
src/lib/content/revalidation.ts
src/lib/content/schema.test.ts
src/lib/content/schema.ts
src/lib/content/seo.ts
src/lib/content/text.ts
src/lib/content/types.ts
src/lib/media/cms-media-record.test.ts
src/lib/media/cms-media-record.ts
src/lib/media/cms-media-upload.test.ts
src/lib/media/cms-media-upload.ts
src/lib/media/cms-media.test.ts
src/lib/media/cms-media.ts
supabase/migrations/20260729104112_secure_admin_cms.sql
supabase/seed.sql
supabase/tests/database/secure_admin_cms.test.sql
tests/e2e/admin-content-smoke.spec.ts
tests/e2e/public-and-admin-boundaries.spec.ts
docs/CMS_IMPLEMENTATION_REPORT.md
```

`docs/CMS_INTEGRATION_READINESS_AUDIT.md` era deja untracked la început și este exclus din lista fișierelor create de această implementare.

## 35. Files Modified

Fișiere tracked modificate:

```text
.env.example
.gitignore
next.config.ts
package-lock.json
package.json
src/app/blog/[slug]/page.tsx
src/app/blog/page.tsx
src/app/cautare/page.tsx
src/app/globals.css
src/app/layout.tsx
src/app/sablon-articol/page.tsx
src/components/account/AccountHub.tsx
src/components/blog/blog-page.tsx
src/components/blog/blog-post-page.tsx
src/components/blog/blog-principal-hero.tsx
src/lib/auth/access-control.test.ts
src/lib/auth/access-control.ts
src/lib/blog-repository.ts
src/lib/search.ts
src/lib/supabase/database.types.ts
src/proxy.ts
supabase/templates/invite.html
```

Nicio migrare istorică nu a fost modificată.

## 36. Explicitly Deferred Functionality

- routing public pentru CMS News;
- publicare programată;
- workflow formal de reviewer/aprobare;
- roluri delegate editor/reviewer/publisher;
- module User Management și Comment Moderation;
- preview shareable;
- colaborare în timp real și autosave merge;
- drag-and-drop page building;
- HTML, MDX sau componente React arbitrare;
- webhook/outbox și semnare revalidation;
- ștergere automată/orphan garbage collection;
- restore și delete pentru conținut;
- revert din istoricul reviziilor;
- recovery codes sau bypass ascuns;
- revocarea automată a sesiunilor/factorilor la role revoke;
- HSTS înainte de confirmarea domeniului/deploymentului.

## 37. Known Limitations

1. Docker/Podman nu este disponibil; `supabase db reset`, runnerul Supabase pgTAP, DB lint și typegen oficial nu au rulat.
2. Harness-ul PostgreSQL 18.3 cu stubs oferă dovadă SQL importantă, dar nu înlocuiește un stack Supabase real.
3. Tipurile DB au fost sincronizate manual; repository-ul admin păstrează un cast îngust pentru RPC până la regenerarea post-migrare.
4. Fluxurile Playwright cu admin provisionat și TOTP au fost sărite; nu există încă dovadă interactivă pentru create/save/preview/publish/unpublish/archive/media/MFA.
5. Credențialele locale și hosted lipsesc; niciun administrator real nu a fost creat sau verificat.
6. SMTP, redirectul invitației, acceptarea parolei și factorii Auth hosted nu au fost testați.
7. Shared cache invalidation pe mai multe instanțe nu a fost verificat.
8. Starea schemei/RLS/Storage în proiectul hosted este necunoscută.
9. HSTS, cookie attributes, WAF/rate limits, backup/restore și monitoring sunt deployment-dependent.
10. Security diff scan este încă pending la momentul acestui raport.
11. Testele E2E credential-gated nu acoperă încă matricea completă cerută de brief.
12. Registrul de module este typechecked și folosit de UI, dar nu are încă un test unitar dedicat pentru filtrare/duplicate.
13. Matricea completă anon/user/premium/admin peste un stack Supabase real rămâne un gate de staging.

## 38. Manual Staging and Production Steps

1. Inventariază rândurile News publicate; migrarea trebuie să se oprească dacă există vreunul.
2. Inventariază administratorii existenți și planifică înscrierea lor TOTP înainte de enforcement pentru a evita lockout.
3. Creează un proiect/staging backup și verifică procedura de restore.
4. Aplică mai întâi migrarea additive, apoi `supabase/seed.sql`; nu deploya aplicația dependentă de RPC înaintea schemei.
5. Rulează într-un Supabase real: reset/migration replay, `npm run test:db`, database lint și typegen oficial.
6. Compară tipurile generate cu `src/lib/supabase/database.types.ts` și elimină cast-ul temporar dacă generatorul acoperă RPC-urile.
7. Configurează valorile runtime și operator în secret store; nu expune cheile operator către runtime/browser.
8. Configurează URL-urile Auth permise și template-ul de invitație; verifică SMTP și redirectul de setare a parolei.
9. Rulează invite, acceptare, grant, TOTP enrollment și verify în staging, cu identitate individuală.
10. Verifică AAL1→MFA→AAL2, `/admin`, `/admin/content` și negarea unui user/premium real.
11. Rulează lifecycle complet Blog și News, inclusiv conflict, dirty state, history și publication gate.
12. Verifică upload mismatch/oversize/metadata stripping/variants/checksum și confidențialitatea draftului.
13. Verifică publish/unpublish pe listă, direct slug, media, search, related și sitemap.
14. Verifică same-origin media și response headers prin domeniul real.
15. Verifică propagarea `public-blog` pe mai multe instanțe; dacă nu este garantată, dezactivează cache-ul public CMS.
16. Rulează Playwright credential-gated, testele MFA fără artifacts și suita completă de non-regresie.
17. Rulează Codex Security diff scan, validează manual authorization/RLS/lifecycle și repară constatările confirmate.
18. Aplică production numai cu execute flag explicit și project ref verificat; nu rula automat în build/startup.

## 39. Hosted Provisioning Status

| Operație | Comandă | Stare |
| --- | --- | --- |
| Invitație | `npm run admin:hosted:invite` | **NOT EXECUTED — CREDENTIALS UNAVAILABLE** |
| Acceptarea invitației | pas uman | **PENDING** |
| Grant rol | `npm run admin:hosted:grant` | **NOT EXECUTED — PENDING** |
| Înscriere TOTP | pas uman | **PENDING** |
| Verify stare identitate/factor | `npm run admin:hosted:verify` | **NOT EXECUTED** |
| Sesiune AAL2 | login interactiv | **NOT VERIFIED** |
| `/admin` | login interactiv | **NOT VERIFIED** |
| `/admin/content` | login interactiv | **NOT VERIFIED** |
| Negare normal-user | login interactiv | **NOT VERIFIED** |
| Revoke | `npm run admin:hosted:revoke` | **NOT EXECUTED** |

Niciun proiect hosted nu a fost citit sau mutat în cadrul implementării.

## 40. Rollback Procedure

Codul aplicației poate fi rollback-uit independent la versiunea anterioară deoarece schema nouă este additive.

Pentru baza de date:

- nu edita și nu șterge migrarea deja aplicată;
- nu elimina reviziile v1, snapshot-urile, media references sau auditul;
- creează o migrare forward nouă care restaurează granturile/politicile necesare versiunii aplicației rollback;
- păstrează canalele fail-closed, în special News;
- invalidează cache-ul public după schimbarea aplicației;
- verifică direct slug/list/search/sitemap/media după rollback.

Pentru un incident de identitate admin:

1. revocă rolul DB;
2. revocă sesiunile și factorii prin controalele Supabase suportate;
3. restabilește identitatea;
4. cere un TOTP nou și verificare AAL2;
5. regrant numai cu operator reference și reason.

Un rollback destructiv al datelor v1 este interzis.

## 41. Final Git Status and Diff Summary

Starea la momentul raportului:

- HEAD rămâne `2b9add19eaf91285a892b1be82a1acd0fd029b06`;
- branch `main`;
- 22 de fișiere tracked modificate;
- fișierele noi sunt enumerate în secțiunea 34;
- auditul readiness inițial rămâne untracked și păstrat;
- `git diff --check`: **PASS**;
- diff-ul tracked curent: 2.691 inserții și 1.200 ștergeri înainte de includerea fișierelor untracked;
- nu există commit, staging, push sau pull request creat de această implementare;
- nu a fost efectuată nicio mutație production/hosted;
- nu a fost observată expunerea vreunui secret.

Confirmări finale:

- **Supabase este autoritatea unică pentru CMS și autorizare.**
- **Nu există CMS paralel.**
- **Runtime-ul aplicației nu necesită o cheie service-role/operator.**
- **CMS News nu are suprafață publică și nu poate fi publicat.**
- **Modificările fără legătură și auditul readiness au fost păstrate.**
- **Pașii care necesită credențiale sau infrastructură externă sunt raportați ca neexecutați, nu presupuşi reușiți.**
