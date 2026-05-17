export type BlogCategorySlug =
  | "admitere"
  | "motivatie"
  | "planificare"
  | "productivitate"
  | "distrageri"
  | "time-management"
  | "eficienta"
  | "tips-tricks"
  | "psihomed"
  | "smartskill-uri"
  | "informatii"
  | "quizuri"
  | "sanatate-si-stres"
  | "istorii-medicale"
  | "mailul-de-luni";

export type BlogCategory = {
  label: string;
  slug: BlogCategorySlug;
};

export type BlogBodyBlock =
  | {
      type: "heading";
      text: string;
    }
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "list";
      items: string[];
    };

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategorySlug;
  tags: string[];
  date: string;
  coverImage: string;
  coverAlt: string;
  readTime: string;
  author: string;
  contentPreview: string;
  body: BlogBodyBlock[];
};

export type BlogNavItem = {
  label: string;
  href: string;
  priority: number;
  isBlog?: boolean;
};

export const blogHeroImage = "/assets/blog/hero.svg";

export const blogCategories = [
  { label: "Admitere", slug: "admitere" },
  { label: "Motivație", slug: "motivatie" },
  { label: "Planificare", slug: "planificare" },
  { label: "Productivitate", slug: "productivitate" },
  { label: "Distrageri", slug: "distrageri" },
  { label: "Time management", slug: "time-management" },
  { label: "Eficiență", slug: "eficienta" },
  { label: "Tips & Tricks", slug: "tips-tricks" },
  { label: "Psihomed", slug: "psihomed" },
  { label: "SmartSkill-uri", slug: "smartskill-uri" },
  { label: "Informații", slug: "informatii" },
  { label: "Quizuri", slug: "quizuri" },
  { label: "Sănătate și stres", slug: "sanatate-si-stres" },
  { label: "Istorii medicale", slug: "istorii-medicale" },
  { label: "Mailul de luni", slug: "mailul-de-luni" },
] satisfies BlogCategory[];

export const defaultBlogCategory: BlogCategorySlug = "admitere";

export const blogSecondaryNavItems = [
  { label: "Centrul SmartMed", href: "/centru-online", priority: 1 },
  { label: "Lecții speciale", href: "/lectii-speciale", priority: 2 },
  { label: "Grile", href: "/grile", priority: 3 },
  { label: "Simulări", href: "/simulari-smart", priority: 4 },
  { label: "Shop", href: "/shop", priority: 5 },
  { label: "Blog", href: "/blog", priority: 0, isBlog: true },
  { label: "Pentru părinți", href: "/pentru-parinti", priority: 6 },
  { label: "Contact", href: "/contact", priority: 7 },
] satisfies BlogNavItem[];

export const blogPosts = [
  {
    id: "post-admitere-ritm",
    slug: "cum-iti-construiesti-ritmul-pentru-admitere",
    title: "Cum îți construiești ritmul pentru admitere fără să te epuizezi",
    excerpt:
      "Un cadru simplu pentru a transforma pregătirea într-un sistem săptămânal clar, cu recapitulare, grile și pauze reale.",
    category: "admitere",
    tags: ["Admitere", "Planificare", "Ritm"],
    date: "2026-04-22",
    coverImage: "/assets/generated/feature-blog.png",
    coverAlt: "Studentă la medicină studiind într-un ambient albastru premium",
    readTime: "6 min",
    author: "Echipa SmartMed",
    contentPreview:
      "Admiterea cere constanță, nu sprinturi rare. Începe cu un ritm realist, apoi crește dificultatea pe capitolele care contează.",
    body: [
      {
        type: "paragraph",
        text: "Pregătirea pentru Medicină devine mai ușor de dus atunci când fiecare săptămână are un scop clar. Nu ai nevoie de un program perfect, ci de unul pe care îl poți repeta.",
      },
      {
        type: "heading",
        text: "Pornește de la blocuri mici, repetabile",
      },
      {
        type: "paragraph",
        text: "Alege două intervale fixe pentru teorie, două pentru grile și unul pentru recapitulare. Dacă săptămâna devine aglomerată, păstrează recapitularea: ea ține sistemul coerent.",
      },
      {
        type: "list",
        items: [
          "notează capitolul prioritar al săptămânii",
          "separă grilele de învățarea teoriei",
          "revino la greșeli după 48 de ore",
        ],
      },
    ],
  },
  {
    id: "post-admitere-grile",
    slug: "grilele-ca-instrument-de-diagnostic",
    title: "Grilele ca instrument de diagnostic, nu doar de verificare",
    excerpt:
      "Cum citești scorurile, greșelile și ezitările ca să știi exact ce capitol merită următoarea sesiune de lucru.",
    category: "admitere",
    tags: ["Grile", "Feedback", "Strategie"],
    date: "2026-04-15",
    coverImage: "/assets/generated/feature-courses.png",
    coverAlt: "Interfață educațională medicală cu accente turcoaz",
    readTime: "5 min",
    author: "SmartMed Academy",
    contentPreview:
      "O grilă greșită nu este un eșec, ci un semnal. Întrebarea importantă este ce tip de greșeală ai făcut.",
    body: [
      {
        type: "paragraph",
        text: "Când tratezi grilele ca pe un diagnostic, scorul devine mai puțin important decât tiparul greșelilor. Acolo se vede ce trebuie reparat.",
      },
      {
        type: "heading",
        text: "Separă neatenția de lipsa de înțelegere",
      },
      {
        type: "paragraph",
        text: "Marchează grilele în trei categorii: nu știam conceptul, am confundat termenii, am citit prea repede. Fiecare categorie cere o intervenție diferită.",
      },
    ],
  },
  {
    id: "post-admitere-calendar",
    slug: "calendarul-de-recapitulare-inainte-de-examen",
    title: "Calendarul de recapitulare înainte de examen",
    excerpt:
      "Un model editorial pentru ultimele săptămâni: ce repeți, ce lași deoparte și cum păstrezi energia pentru ziua testului.",
    category: "admitere",
    tags: ["Recapitulare", "Calendar", "Examen"],
    date: "2026-04-08",
    coverImage: "/assets/generated/path-online.png",
    coverAlt: "Spațiu digital de pregătire medicală cu lumină caldă",
    readTime: "7 min",
    author: "Echipa SmartMed",
    contentPreview:
      "Ultimele săptămâni nu sunt pentru haos. Sunt pentru claritate, prioritizare și repetarea capitolelor cu cel mai mare impact.",
    body: [
      {
        type: "paragraph",
        text: "Înainte de examen, obiectivul nu este să reînveți totul. Obiectivul este să reduci incertitudinea și să recunoști rapid tiparele de întrebare.",
      },
      {
        type: "list",
        items: [
          "prima trecere: capitole cu scor mic",
          "a doua trecere: capitole cu greșeli repetitive",
          "ultima trecere: formule, excepții și noțiuni ușor de confundat",
        ],
      },
    ],
  },
  {
    id: "post-motivatie",
    slug: "motivatia-care-nu-depinde-de-zile-perfecte",
    title: "Motivația care nu depinde de zile perfecte",
    excerpt:
      "Cum îți creezi un cadru în care poți continua și în zilele mai lente, fără să transformi fiecare pauză într-o vină.",
    category: "motivatie",
    tags: ["Motivație", "Mindset", "Constanță"],
    date: "2026-03-29",
    coverImage: "/assets/generated/path-fizic.png",
    coverAlt: "Centru de studiu medical cu atmosferă calmă",
    readTime: "4 min",
    author: "SmartMed Academy",
    contentPreview:
      "Motivația e utilă, dar nu trebuie să fie singurul motor. Sistemul tău trebuie să funcționeze și când entuziasmul scade.",
    body: [
      {
        type: "paragraph",
        text: "Zilele perfecte sunt rare. Pregătirea bună se construiește cu reguli simple care te readuc la masă chiar și când energia nu este ideală.",
      },
      {
        type: "heading",
        text: "Fă următorul pas foarte clar",
      },
      {
        type: "paragraph",
        text: "În loc să îți propui să recuperezi tot, notează următoarea acțiune mică: 20 de minute de teorie, 15 grile sau refacerea greșelilor de ieri.",
      },
    ],
  },
  {
    id: "post-time-management",
    slug: "time-management-pentru-elevii-care-au-si-scoala",
    title: "Time management pentru elevii care au și școală",
    excerpt:
      "Un sistem de prioritizare pentru perioadele în care pregătirea SmartMed trebuie să conviețuiască elegant cu temele și testele de la liceu.",
    category: "time-management",
    tags: ["Time management", "Școală", "Priorități"],
    date: "2026-03-18",
    coverImage: "/assets/generated/feature-lessons.png",
    coverAlt: "Materiale de învățare medicală organizate pe capitole",
    readTime: "5 min",
    author: "Echipa SmartMed",
    contentPreview:
      "Nu toate sarcinile au aceeași miză. Când timpul e puțin, ordinea corectă valorează cât o oră în plus.",
    body: [
      {
        type: "paragraph",
        text: "În săptămânile aglomerate, nu încerca să faci totul la aceeași intensitate. Alege lucrurile cu impact mare și lasă loc pentru recuperare.",
      },
      {
        type: "list",
        items: [
          "capitolele slabe înaintea celor confortabile",
          "grile scurte în zilele cu multe ore",
          "recapitulare amplă în weekend",
        ],
      },
    ],
  },
  {
    id: "post-stres",
    slug: "stresul-inainte-de-simulare",
    title: "Stresul înainte de simulare: cum îl folosești corect",
    excerpt:
      "O perspectivă psihomed despre emoții, presiune și ritualuri mici care te ajută să intri stabil într-o simulare.",
    category: "sanatate-si-stres",
    tags: ["Psihomed", "Stres", "Simulări"],
    date: "2026-03-07",
    coverImage: "/assets/generated/cta-heart-stethoscope.png",
    coverAlt: "Inimă medicală cu stetoscop pe fundal luminos",
    readTime: "6 min",
    author: "SmartMed Academy",
    contentPreview:
      "Stresul nu dispare complet, dar poate fi canalizat. Diferența o face ritualul dinaintea probei și felul în care citești emoția.",
    body: [
      {
        type: "paragraph",
        text: "Înainte de o simulare, corpul îți spune că miza contează. Scopul nu este să elimini complet presiunea, ci să o transformi în atenție.",
      },
      {
        type: "heading",
        text: "Stabilește ritualul dinainte",
      },
      {
        type: "paragraph",
        text: "Cu o seară înainte, pregătește materialele și ora de trezire. În dimineața simulării, evită recapitulările masive și păstrează rutina simplă.",
      },
    ],
  },
] satisfies BlogPost[];

export function getBlogPosts() {
  return [...blogPosts].sort((a, b) => b.date.localeCompare(a.date));
}

export function getBlogPostBySlug(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export function getBlogCategory(slug?: string) {
  return blogCategories.find((category) => category.slug === slug);
}

export function getBlogPostsByCategory(category: BlogCategorySlug) {
  return getBlogPosts().filter((post) => post.category === category);
}

export function searchBlogPosts(query: string) {
  const normalized = query.trim().toLocaleLowerCase("ro-RO");

  if (!normalized) {
    return getBlogPostsByCategory(defaultBlogCategory);
  }

  return getBlogPosts().filter((post) => {
    const haystack = [
      post.title,
      post.excerpt,
      post.category,
      post.tags.join(" "),
      post.contentPreview,
    ]
      .join(" ")
      .toLocaleLowerCase("ro-RO");

    return haystack.includes(normalized);
  });
}

export function getRelatedBlogPosts(post: BlogPost, limit = 3) {
  return getBlogPosts()
    .filter((candidate) => candidate.slug !== post.slug)
    .sort((a, b) => {
      const aScore = a.category === post.category ? 0 : 1;
      const bScore = b.category === post.category ? 0 : 1;

      return aScore - bScore || b.date.localeCompare(a.date);
    })
    .slice(0, limit);
}

export function formatBlogDate(date: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}
