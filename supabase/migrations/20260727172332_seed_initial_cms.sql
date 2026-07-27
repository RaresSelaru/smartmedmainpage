-- Initial CMS content imported from src/lib/blog.ts.
--
-- This seed is deliberately additive:
--   * rows are identified by stable slugs rather than fixed database IDs;
--   * existing editorial rows and revisions are never overwritten;
--   * missing relationships are added without removing later editorial choices;
--   * only entries inserted by this migration are published automatically.

begin;

create temporary table seed_initial_cms_authors (
  display_name text not null,
  slug text not null
) on commit drop;

insert into seed_initial_cms_authors (display_name, slug)
values
  ('Echipa SmartMed', 'echipa-smartmed'),
  ('SmartMed Academy', 'smartmed-academy');

create temporary table seed_initial_cms_categories (
  label text not null,
  slug text not null,
  sort_order integer not null
) on commit drop;

insert into seed_initial_cms_categories (label, slug, sort_order)
values
  ('Admitere', 'admitere', 0),
  ('Motivație', 'motivatie', 1),
  ('Planificare', 'planificare', 2),
  ('Productivitate', 'productivitate', 3),
  ('Distrageri', 'distrageri', 4),
  ('Time management', 'time-management', 5),
  ('Eficiență', 'eficienta', 6),
  ('Tips & Tricks', 'tips-tricks', 7),
  ('Psihomed', 'psihomed', 8),
  ('SmartSkill-uri', 'smartskill-uri', 9),
  ('Informații', 'informatii', 10),
  ('Quizuri', 'quizuri', 11),
  ('Sănătate și stres', 'sanatate-si-stres', 12),
  ('Istorii medicale', 'istorii-medicale', 13),
  ('Mailul de luni', 'mailul-de-luni', 14);

create temporary table seed_initial_cms_tags (
  name text not null,
  slug text not null
) on commit drop;

insert into seed_initial_cms_tags (name, slug)
values
  ('Admitere', 'admitere'),
  ('Planificare', 'planificare'),
  ('Ritm', 'ritm'),
  ('Grile', 'grile'),
  ('Feedback', 'feedback'),
  ('Strategie', 'strategie'),
  ('Recapitulare', 'recapitulare'),
  ('Calendar', 'calendar'),
  ('Examen', 'examen'),
  ('Motivație', 'motivatie'),
  ('Mindset', 'mindset'),
  ('Constanță', 'constanta'),
  ('Time management', 'time-management'),
  ('Școală', 'scoala'),
  ('Priorități', 'prioritati'),
  ('Psihomed', 'psihomed'),
  ('Stres', 'stres'),
  ('Simulări', 'simulari');

create temporary table seed_initial_cms_posts
on commit drop
as
select
  post.id as seed_id,
  post.slug,
  post.title,
  post.excerpt,
  post.category as category_slug,
  post.tags,
  post."date" as published_date,
  post."coverImage" as cover_image,
  post."coverAlt" as cover_alt,
  post."readTime" as read_time,
  post.author,
  post."contentPreview" as content_preview,
  post.body
from jsonb_to_recordset(
  $seed_posts$
  [
    {
      "id": "post-admitere-ritm",
      "slug": "cum-iti-construiesti-ritmul-pentru-admitere",
      "title": "Cum îți construiești ritmul pentru admitere fără să te epuizezi",
      "excerpt": "Un cadru simplu pentru a transforma pregătirea într-un sistem săptămânal clar, cu recapitulare, grile și pauze reale.",
      "category": "admitere",
      "tags": ["Admitere", "Planificare", "Ritm"],
      "date": "2026-04-22",
      "coverImage": "/assets/generated/feature-blog.png",
      "coverAlt": "Studentă la medicină studiind într-un ambient albastru premium",
      "readTime": "6 min",
      "author": "Echipa SmartMed",
      "contentPreview": "Admiterea cere constanță, nu sprinturi rare. Începe cu un ritm realist, apoi crește dificultatea pe capitolele care contează.",
      "body": [
        {
          "type": "paragraph",
          "text": "Pregătirea pentru Medicină devine mai ușor de dus atunci când fiecare săptămână are un scop clar. Nu ai nevoie de un program perfect, ci de unul pe care îl poți repeta."
        },
        {
          "type": "heading",
          "text": "Pornește de la blocuri mici, repetabile"
        },
        {
          "type": "paragraph",
          "text": "Alege două intervale fixe pentru teorie, două pentru grile și unul pentru recapitulare. Dacă săptămâna devine aglomerată, păstrează recapitularea: ea ține sistemul coerent."
        },
        {
          "type": "list",
          "items": [
            "notează capitolul prioritar al săptămânii",
            "separă grilele de învățarea teoriei",
            "revino la greșeli după 48 de ore"
          ]
        }
      ]
    },
    {
      "id": "post-admitere-grile",
      "slug": "grilele-ca-instrument-de-diagnostic",
      "title": "Grilele ca instrument de diagnostic, nu doar de verificare",
      "excerpt": "Cum citești scorurile, greșelile și ezitările ca să știi exact ce capitol merită următoarea sesiune de lucru.",
      "category": "admitere",
      "tags": ["Grile", "Feedback", "Strategie"],
      "date": "2026-04-15",
      "coverImage": "/assets/generated/feature-courses.png",
      "coverAlt": "Interfață educațională medicală cu accente turcoaz",
      "readTime": "5 min",
      "author": "SmartMed Academy",
      "contentPreview": "O grilă greșită nu este un eșec, ci un semnal. Întrebarea importantă este ce tip de greșeală ai făcut.",
      "body": [
        {
          "type": "paragraph",
          "text": "Când tratezi grilele ca pe un diagnostic, scorul devine mai puțin important decât tiparul greșelilor. Acolo se vede ce trebuie reparat."
        },
        {
          "type": "heading",
          "text": "Separă neatenția de lipsa de înțelegere"
        },
        {
          "type": "paragraph",
          "text": "Marchează grilele în trei categorii: nu știam conceptul, am confundat termenii, am citit prea repede. Fiecare categorie cere o intervenție diferită."
        }
      ]
    },
    {
      "id": "post-admitere-calendar",
      "slug": "calendarul-de-recapitulare-inainte-de-examen",
      "title": "Calendarul de recapitulare înainte de examen",
      "excerpt": "Un model editorial pentru ultimele săptămâni: ce repeți, ce lași deoparte și cum păstrezi energia pentru ziua testului.",
      "category": "admitere",
      "tags": ["Recapitulare", "Calendar", "Examen"],
      "date": "2026-04-08",
      "coverImage": "/assets/generated/path-online.png",
      "coverAlt": "Spațiu digital de pregătire medicală cu lumină caldă",
      "readTime": "7 min",
      "author": "Echipa SmartMed",
      "contentPreview": "Ultimele săptămâni nu sunt pentru haos. Sunt pentru claritate, prioritizare și repetarea capitolelor cu cel mai mare impact.",
      "body": [
        {
          "type": "paragraph",
          "text": "Înainte de examen, obiectivul nu este să reînveți totul. Obiectivul este să reduci incertitudinea și să recunoști rapid tiparele de întrebare."
        },
        {
          "type": "list",
          "items": [
            "prima trecere: capitole cu scor mic",
            "a doua trecere: capitole cu greșeli repetitive",
            "ultima trecere: formule, excepții și noțiuni ușor de confundat"
          ]
        }
      ]
    },
    {
      "id": "post-motivatie",
      "slug": "motivatia-care-nu-depinde-de-zile-perfecte",
      "title": "Motivația care nu depinde de zile perfecte",
      "excerpt": "Cum îți creezi un cadru în care poți continua și în zilele mai lente, fără să transformi fiecare pauză într-o vină.",
      "category": "motivatie",
      "tags": ["Motivație", "Mindset", "Constanță"],
      "date": "2026-03-29",
      "coverImage": "/assets/generated/path-fizic.png",
      "coverAlt": "Centru de studiu medical cu atmosferă calmă",
      "readTime": "4 min",
      "author": "SmartMed Academy",
      "contentPreview": "Motivația e utilă, dar nu trebuie să fie singurul motor. Sistemul tău trebuie să funcționeze și când entuziasmul scade.",
      "body": [
        {
          "type": "paragraph",
          "text": "Zilele perfecte sunt rare. Pregătirea bună se construiește cu reguli simple care te readuc la masă chiar și când energia nu este ideală."
        },
        {
          "type": "heading",
          "text": "Fă următorul pas foarte clar"
        },
        {
          "type": "paragraph",
          "text": "În loc să îți propui să recuperezi tot, notează următoarea acțiune mică: 20 de minute de teorie, 15 grile sau refacerea greșelilor de ieri."
        }
      ]
    },
    {
      "id": "post-time-management",
      "slug": "time-management-pentru-elevii-care-au-si-scoala",
      "title": "Time management pentru elevii care au și școală",
      "excerpt": "Un sistem de prioritizare pentru perioadele în care pregătirea SmartMed trebuie să conviețuiască elegant cu temele și testele de la liceu.",
      "category": "time-management",
      "tags": ["Time management", "Școală", "Priorități"],
      "date": "2026-03-18",
      "coverImage": "/assets/generated/feature-lessons.png",
      "coverAlt": "Materiale de învățare medicală organizate pe capitole",
      "readTime": "5 min",
      "author": "Echipa SmartMed",
      "contentPreview": "Nu toate sarcinile au aceeași miză. Când timpul e puțin, ordinea corectă valorează cât o oră în plus.",
      "body": [
        {
          "type": "paragraph",
          "text": "În săptămânile aglomerate, nu încerca să faci totul la aceeași intensitate. Alege lucrurile cu impact mare și lasă loc pentru recuperare."
        },
        {
          "type": "list",
          "items": [
            "capitolele slabe înaintea celor confortabile",
            "grile scurte în zilele cu multe ore",
            "recapitulare amplă în weekend"
          ]
        }
      ]
    },
    {
      "id": "post-stres",
      "slug": "stresul-inainte-de-simulare",
      "title": "Stresul înainte de simulare: cum îl folosești corect",
      "excerpt": "O perspectivă psihomed despre emoții, presiune și ritualuri mici care te ajută să intri stabil într-o simulare.",
      "category": "sanatate-si-stres",
      "tags": ["Psihomed", "Stres", "Simulări"],
      "date": "2026-03-07",
      "coverImage": "/assets/generated/cta-heart-stethoscope.png",
      "coverAlt": "Inimă medicală cu stetoscop pe fundal luminos",
      "readTime": "6 min",
      "author": "SmartMed Academy",
      "contentPreview": "Stresul nu dispare complet, dar poate fi canalizat. Diferența o face ritualul dinaintea probei și felul în care citești emoția.",
      "body": [
        {
          "type": "paragraph",
          "text": "Înainte de o simulare, corpul îți spune că miza contează. Scopul nu este să elimini complet presiunea, ci să o transformi în atenție."
        },
        {
          "type": "heading",
          "text": "Stabilește ritualul dinainte"
        },
        {
          "type": "paragraph",
          "text": "Cu o seară înainte, pregătește materialele și ora de trezire. În dimineața simulării, evită recapitulările masive și păstrează rutina simplă."
        }
      ]
    }
  ]
  $seed_posts$::jsonb
) as post (
  id text,
  slug text,
  title text,
  excerpt text,
  category text,
  tags jsonb,
  "date" text,
  "coverImage" text,
  "coverAlt" text,
  "readTime" text,
  author text,
  "contentPreview" text,
  body jsonb
);

insert into public.content_authors (
  display_name,
  slug,
  status
)
select
  seed.display_name,
  seed.slug,
  'active'
from seed_initial_cms_authors as seed
on conflict (slug) do nothing;

insert into public.content_categories (
  name,
  slug,
  sort_order,
  is_active
)
select
  seed.label,
  seed.slug,
  seed.sort_order,
  true
from seed_initial_cms_categories as seed
on conflict (slug) do nothing;

insert into public.content_tags (name, slug)
select seed.name, seed.slug
from seed_initial_cms_tags as seed
on conflict (slug) do nothing;

create temporary table seed_initial_cms_inserted_entries (
  id bigint primary key
) on commit drop;

with inserted_entries as (
  insert into public.content_entries (
    kind,
    slug,
    title,
    excerpt,
    status,
    visibility,
    author_id,
    published_at,
    metadata
  )
  select
    'article',
    post.slug,
    post.title,
    post.excerpt,
    'draft',
    'public',
    author.id,
    null::timestamptz,
    jsonb_build_object(
      'id', post.seed_id,
      'date', post.published_date,
      'coverImage', post.cover_image,
      'coverAlt', post.cover_alt,
      'readTime', post.read_time,
      'contentPreview', post.content_preview,
      'tags', post.tags,
      'seedSource', 'src/lib/blog.ts'
    )
  from seed_initial_cms_posts as post
  join seed_initial_cms_authors as seed_author
    on seed_author.display_name = post.author
  join public.content_authors as author
    on author.slug = seed_author.slug
  on conflict (slug) do nothing
  returning id
)
insert into seed_initial_cms_inserted_entries (id)
select inserted.id
from inserted_entries as inserted;

insert into public.content_revisions (
  content_entry_id,
  revision_no,
  body,
  created_at
)
select
  entry.id,
  1,
  post.body,
  post.published_date::date::timestamp
    at time zone 'Europe/Bucharest'
from seed_initial_cms_posts as post
join public.content_entries as entry
  on entry.slug = post.slug
where not exists (
  select 1
  from public.content_revisions as existing_revision
  where existing_revision.content_entry_id = entry.id
    and existing_revision.revision_no = 1
)
on conflict (content_entry_id, revision_no) do nothing;

insert into public.content_entry_categories (
  content_entry_id,
  category_id,
  is_primary
)
select
  entry.id,
  category.id,
  not exists (
    select 1
    from public.content_entry_categories as existing_primary
    where existing_primary.content_entry_id = entry.id
      and existing_primary.is_primary
  )
from seed_initial_cms_posts as post
join public.content_entries as entry
  on entry.slug = post.slug
join public.content_categories as category
  on category.slug = post.category_slug
on conflict (content_entry_id, category_id) do nothing;

insert into public.content_entry_tags (
  content_entry_id,
  tag_id
)
select
  entry.id,
  tag.id
from seed_initial_cms_posts as post
join public.content_entries as entry
  on entry.slug = post.slug
cross join lateral jsonb_array_elements_text(post.tags) as source_tag(name)
join seed_initial_cms_tags as seed_tag
  on seed_tag.name = source_tag.name
join public.content_tags as tag
  on tag.slug = seed_tag.slug
on conflict (content_entry_id, tag_id) do nothing;

update public.content_entries as entry
set
  published_revision_id = revision.id,
  status = 'published',
  published_at = post.published_date::date::timestamp
    at time zone 'Europe/Bucharest'
from seed_initial_cms_posts as post,
     public.content_revisions as revision,
     seed_initial_cms_inserted_entries as inserted
where entry.slug = post.slug
  and inserted.id = entry.id
  and revision.content_entry_id = entry.id
  and revision.revision_no = 1;

commit;
