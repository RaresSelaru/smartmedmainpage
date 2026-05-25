import type { AppRoute } from "@/lib/routes";

export type IconName =
  | "book-open"
  | "building"
  | "calendar"
  | "clipboard"
  | "graduation-cap"
  | "heart-pulse"
  | "help"
  | "mail"
  | "newspaper"
  | "pen-tool"
  | "shield"
  | "shopping-bag"
  | "sparkles"
  | "stethoscope"
  | "timer"
  | "user";

export type DestinationCardConfig = {
  title: string;
  subtitle: string;
  href: AppRoute;
  image?: string;
  fallbackIcon: IconName;
};

export type PageKey =
  | "centru-fizic"
  | "lectii-speciale"
  | "news"
  | "simulari-smart"
  | "blog"
  | "shop"
  | "pentru-parinti"
  | "despre"
  | "contact"
  | "cont"
  | "termeni"
  | "confidentialitate"
  | "ajutor";

export type PageScaffold = {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: {
    label: string;
    href: AppRoute;
  };
  secondaryCta?: {
    label: string;
    href: AppRoute;
  };
  highlights: Array<{
    title: string;
    description: string;
    icon: IconName;
  }>;
  roadmap: string[];
};

export const siteConfig = {
  name: "SmartMed",
  fullName: "SmartMed Academy",
  description:
    "Pregătire premium pentru admiterea la Medicină, cu structură clară, exigență și sprijin constant.",
  url: "https://smartmed.ro",
  contact: {
    email: "contact@smartmed.ro",
    phone: "+40 700 000 000",
    location: "România",
  },
  socialLinks: [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "TikTok", href: "https://tiktok.com" },
    { label: "YouTube", href: "https://youtube.com" },
    { label: "Facebook", href: "https://facebook.com" },
  ],
  newsletter: {
    title: "Newsletter",
    description: "Abonează-te pentru noutăți, sfaturi și resurse utile.",
    placeholder: "Adresa ta de email",
  },
  external: {
    grileFallbackUrl: "https://grile.smartmed.ro",
  },
} as const;

export const generatedAssets = {
  heroNeural: "/assets/generated/hero-neural.png",
  pathOnline: "/assets/generated/path-online.png",
  pathFizic: "/assets/generated/path-fizic.png",
  ctaHeart: "/assets/generated/cta-heart-stethoscope.png",
  featureCourses: "/assets/generated/feature-courses.png",
  featureLessons: "/assets/generated/feature-lessons.png",
  featureBlog: "/assets/generated/feature-blog.png",
  featureContact: "/assets/generated/feature-contact.png",
} as const;

export const heroBenefits = [
  { label: "Pregătire cu medici", icon: "shield" },
  { label: "Plan personalizat", icon: "clipboard" },
  { label: "Rezultate dovedite", icon: "sparkles" },
] satisfies Array<{ label: string; icon: IconName }>;

export type PathChoiceCard = {
  label: string;
  title: string;
  href: AppRoute;
  image: string;
  cta: string;
  benefits: string[];
};

export const pathChoiceGroup1 = [
  {
    label: "Flexibil & accesibil",
    title: "Centru online",
    href: "/centru-online",
    image: generatedAssets.pathOnline,
    cta: "Descoperă centrul online",
    benefits: [
      "Cursuri live interactive",
      "Acces 24/7 la platformă",
      "Materiale și teste dedicate",
      "Răspunsuri rapide la întrebări",
    ],
  },
  {
    label: "Interacțiune & performanță",
    title: "Centru fizic",
    href: "/centru-fizic",
    image: generatedAssets.pathFizic,
    cta: "Descoperă centrul fizic",
    benefits: [
      "Interacțiune directă cu medicii",
      "Atmosferă de studiu dedicată",
      "Comunitate și motivație",
      "Simulări și feedback constant",
    ],
  },
] satisfies PathChoiceCard[];

export const pathChoiceGroup2 = [
  {
    label: "Antrenament focus",
    title: "Grile SmartMed",
    href: "/grile",
    image: generatedAssets.featureCourses,
    cta: "Exersează pe grile",
    benefits: [
      "Bază extinsă de grile organizate pe discipline",
      "Antrenament zilnic structurat și progresiv",
      "Explicații concise aferente fiecărei grile",
      "Filtrare după capitole și nivel de dificultate",
    ],
  },
  {
    label: "Antrenament realist",
    title: "Simulări Smart",
    href: "/simulari-smart",
    image: generatedAssets.ctaHeart,
    cta: "Pregătește simularea",
    benefits: [
      "Simulări desfășurate în condiții de examen",
      "Monitorizarea evoluției scorurilor în timp",
      "Feedback structurat pe capitole",
      "Analiză comparativă la nivel de grupă",
    ],
  },
] satisfies PathChoiceCard[];

export type CarouselItem = {
  eyebrow: string;
  title: string;
  description: string;
  href: AppRoute;
  accent: "aqua" | "gold" | "teal" | "cream";
  icon: IconName;
};

export const lectiiSpecialeCarousel = [
  {
    eyebrow: "Biologie · Capitole grele",
    title: "Genetica explicată simplu",
    description: "Atelier intensiv pentru codul genetic, mutații și moștenire — cu hărți vizuale și exerciții pe tipuri de probleme.",
    href: "/lectii-speciale",
    accent: "aqua",
    icon: "sparkles",
  },
  {
    eyebrow: "Chimie organică",
    title: "Reacții cheie pentru admitere",
    description: "Mecanisme de reacție explicate pas cu pas, cu pattern-uri pentru a recunoaște tipul de exercițiu rapid.",
    href: "/lectii-speciale",
    accent: "gold",
    icon: "book-open",
  },
  {
    eyebrow: "Anatomie funcțională",
    title: "Sistemul nervos central",
    description: "Recapitulare completă a SNC cu scheme clare, conexiuni clinice și aplicații pe grile reprezentative.",
    href: "/lectii-speciale",
    accent: "cream",
    icon: "stethoscope",
  },
  {
    eyebrow: "Strategie de examen",
    title: "Tehnica de rezolvare grile",
    description: "Cum citești enunțul, cum elimini variantele și cum gestionezi timpul în ultimele 30 de minute.",
    href: "/lectii-speciale",
    accent: "teal",
    icon: "clipboard",
  },
  {
    eyebrow: "Biochimie aplicată",
    title: "Metabolism integrat",
    description: "Legăturile dintre glucide, lipide și proteine, prezentate într-un singur cadru ușor de reținut.",
    href: "/lectii-speciale",
    accent: "aqua",
    icon: "pen-tool",
  },
  {
    eyebrow: "Recapitulare finală",
    title: "Sprint pre-admitere",
    description: "Sesiune de recapitulare densă cu cele 30 de teme cu probabilitate mare la examen.",
    href: "/lectii-speciale",
    accent: "gold",
    icon: "timer",
  },
] satisfies CarouselItem[];

export const newsCarousel = [
  {
    eyebrow: "Admitere 2026",
    title: "Calendar oficial publicat",
    description: "Datele exacte pentru înscrieri, examen, contestații și afișarea rezultatelor — totul într-un singur loc.",
    href: "/news",
    accent: "aqua",
    icon: "calendar",
  },
  {
    eyebrow: "SmartMed Update",
    title: "Sesiune nouă de simulări",
    description: "Lansăm o nouă serie de simulări cu regim de examen, pentru ultimele luni de pregătire.",
    href: "/news",
    accent: "gold",
    icon: "timer",
  },
  {
    eyebrow: "Programe speciale",
    title: "Lecții bonus pentru olimpici",
    description: "Sesiuni dedicate pentru elevii cu rezultate la olimpiade, focus pe capitole avansate.",
    href: "/news",
    accent: "teal",
    icon: "sparkles",
  },
  {
    eyebrow: "Universități",
    title: "Modificări la criteriile UMF",
    description: "Sumar al ajustărilor recente anunțate de universitățile de Medicină — ce să urmărești.",
    href: "/news",
    accent: "cream",
    icon: "newspaper",
  },
  {
    eyebrow: "Resurse libere",
    title: "Bibliotecă deschisă de grile",
    description: "Am publicat un set extins de grile cu explicații, accesibile gratuit pe platformă.",
    href: "/news",
    accent: "aqua",
    icon: "book-open",
  },
  {
    eyebrow: "Comunitate",
    title: "Întâlnire cu medici rezidenți",
    description: "Eveniment online cu medici tineri care răspund întrebărilor despre drumul după admitere.",
    href: "/news",
    accent: "gold",
    icon: "heart-pulse",
  },
] satisfies CarouselItem[];

export const pathChoiceGroup3 = [
  {
    label: "Ghiduri și claritate",
    title: "SmartMed Blog",
    href: "/blog",
    image: generatedAssets.featureBlog,
    cta: "Explorează articolele",
    benefits: [
      "Informații despre admitere",
      "Strategii eficiente de învățare",
      "Pagina de psihologie",
      "Mailul de luni",
    ],
  },
  {
    label: "Resurse educaționale",
    title: "SmartMed Shop",
    href: "/shop",
    image: generatedAssets.heroNeural,
    cta: "Vezi produsele",
    benefits: [
      "Materiale digitale",
      "Oferte speciale",
      "SmartMed Cards",
      "Culegere de grile cu explicații",
    ],
  },
] satisfies PathChoiceCard[];

export const featureCards = [
  {
    title: "Cursuri",
    description: "Programe complete structurate pe materii și niveluri de pregătire.",
    href: "/centru-online",
    image: generatedAssets.featureCourses,
    icon: "book-open",
  },
  {
    title: "Lecții Smart",
    description: "Explicații clare, exemple relevante și metode moderne de învățare.",
    href: "/lectii-speciale",
    image: generatedAssets.featureLessons,
    icon: "sparkles",
  },
  {
    title: "Blog",
    description: "Articole utile, sfaturi și noutăți din lumea pregătirii medicale.",
    href: "/blog",
    image: generatedAssets.featureBlog,
    icon: "pen-tool",
  },
  {
    title: "Contact",
    description: "Echipa noastră este aici să te ajute oricând ai nevoie.",
    href: "/contact",
    image: generatedAssets.featureContact,
    icon: "mail",
  },
] satisfies Array<{
  title: string;
  description: string;
  href: AppRoute;
  image: string;
  icon: IconName;
}>;

export const homeStats = [
  { value: "2026", label: "admitere vizată" },
  { value: "3E", label: "exigență, excelență, experiență" },
  { value: "360°", label: "online, fizic, grile, simulări" },
] as const;

export const destinationCards: DestinationCardConfig[] = [
  {
    title: "Centru SmartMed Online",
    subtitle: "Cursuri, module, progres și acces pregătit pentru abonamente.",
    href: "/centru-online",
    image: "/assets/page-icons/online.svg",
    fallbackIcon: "book-open",
  },
  {
    title: "Centru SmartMed Fizic",
    subtitle: "Pregătire în sală, ritm constant și comunitate de viitori medici.",
    href: "/centru-fizic",
    fallbackIcon: "building",
  },
  {
    title: "Lecții SmartMed Speciale",
    subtitle: "Ateliere concentrate pentru capitole grele și recapitulări cu miză.",
    href: "/lectii-speciale",
    image: "/assets/page-icons/lectii-speciale.svg",
    fallbackIcon: "sparkles",
  },
  {
    title: "Grile SmartMed",
    subtitle: "Acces rapid către platforma separată de grile și antrenament.",
    href: "/grile",
    image: "/assets/page-icons/grile.svg",
    fallbackIcon: "clipboard",
  },
  {
    title: "SmartMed News",
    subtitle: "Anunțuri, noutăți despre admitere și actualizări importante.",
    href: "/news",
    image: "/assets/page-icons/news.svg",
    fallbackIcon: "newspaper",
  },
  {
    title: "Simulări Smart",
    subtitle: "Simulări realiste, scoruri urmărite și analiză pentru progres.",
    href: "/simulari-smart",
    image: "/assets/page-icons/simulari.svg",
    fallbackIcon: "timer",
  },
  {
    title: "SmartMed Blog",
    subtitle: "Strategii de învățare, ghiduri și clarificări pentru admitere.",
    href: "/blog",
    image: "/assets/page-icons/blog.svg",
    fallbackIcon: "pen-tool",
  },
  {
    title: "SmartMed Shop",
    subtitle: "Materiale, caiete, resurse și produse educaționale SmartMed.",
    href: "/shop",
    image: "/assets/page-icons/shop.svg",
    fallbackIcon: "shopping-bag",
  },
];

export const smartBenefits = [
  {
    title: "Pregătire cu medici",
    description:
      "Conținut explicat de oameni care înțeleg examenul și drumul de după admitere.",
    icon: "stethoscope",
  },
  {
    title: "Metodă structurată",
    description:
      "Module clare, recapitulări și rutine de lucru care reduc haosul din pregătire.",
    icon: "graduation-cap",
  },
  {
    title: "Simulări realiste",
    description:
      "Antrenament cu presiune controlată, feedback și direcții precise de îmbunătățire.",
    icon: "timer",
  },
  {
    title: "Ecosistem scalabil",
    description:
      "Gândit pentru conturi, roluri, cursuri premium, plăți, emailuri și CMS.",
    icon: "shield",
  },
] satisfies Array<{
  title: string;
  description: string;
  icon: IconName;
}>;

export const onlineCenterModules = [
  {
    title: "Cursuri și module",
    description:
      "Spațiu pregătit pentru video, suporturi de curs, recapitulări și materiale premium.",
    icon: "book-open",
  },
  {
    title: "Progres personal",
    description:
      "Structură pentru lecții parcurse, scoruri, obiective și recomandări pe capitole.",
    icon: "calendar",
  },
  {
    title: "Acces diferențiat",
    description:
      "Bază pentru guest, user logat, premium și admin fără logică de auth activă încă.",
    icon: "shield",
  },
] satisfies Array<{
  title: string;
  description: string;
  icon: IconName;
}>;

export const roleRoadmap = [
  {
    role: "Guest",
    access: "preview cursuri, pagini publice, CTA către cont",
  },
  {
    role: "User",
    access: "profil, progres de bază, materiale gratuite",
  },
  {
    role: "Premium",
    access: "module plătite, simulări extinse, conținut blocat/deblocat",
  },
  {
    role: "Admin",
    access: "management cursuri, comenzi, utilizatori, conținut și analytics",
  },
] as const;

export const pageScaffolds: Record<PageKey, PageScaffold> = {
  "centru-fizic": {
    eyebrow: "Pregătire în sală",
    title: "Centru SmartMed Fizic",
    description:
      "O zonă pregătită pentru grupe, programări, locații, calendare și comunicare cu elevii care aleg ritmul offline.",
    primaryCta: { label: "Cere detalii", href: "/contact" },
    secondaryCta: { label: "Vezi centrul online", href: "/centru-online" },
    highlights: [
      {
        title: "Grupe organizate",
        description: "Structură pentru serii, niveluri și program pe capitole.",
        icon: "building",
      },
      {
        title: "Pregătire cu medici",
        description: "Spațiu pentru traineri, orar și descrieri de sesiuni.",
        icon: "stethoscope",
      },
      {
        title: "Comunitate locală",
        description: "Bază pentru înscrieri, liste de așteptare și anunțuri.",
        icon: "heart-pulse",
      },
    ],
    roadmap: [
      "Integrare calendar pentru grupe și sesiuni",
      "Formulare de înscriere și liste de așteptare",
      "Conectare cu profilul elevului și progresul online",
    ],
  },
  "lectii-speciale": {
    eyebrow: "Ateliere intensive",
    title: "Lecții SmartMed Speciale",
    description:
      "O pagină pregătită pentru workshopuri tematice, recapitulări rapide, lecții premium și evenimente educaționale.",
    primaryCta: { label: "Urmărește lecțiile", href: "/cont" },
    secondaryCta: { label: "Contact pentru program", href: "/contact" },
    highlights: [
      {
        title: "Capitole dificile",
        description: "Teme punctuale, explicate clar și aplicate pe exerciții.",
        icon: "sparkles",
      },
      {
        title: "Evenimente live",
        description: "Structură pentru sesiuni limitate și acces pe bază de rol.",
        icon: "calendar",
      },
      {
        title: "Materiale premium",
        description: "Pregătit pentru resurse descărcabile și bibliotecă de lecții.",
        icon: "book-open",
      },
    ],
    roadmap: [
      "Catalog lecții speciale cu filtre pe materie",
      "Acces premium pentru workshopuri și replay-uri",
      "Emailuri automate pentru înscriere și reminder",
    ],
  },
  news: {
    eyebrow: "Actualizări importante",
    title: "SmartMed News",
    description:
      "Hub editorial pentru anunțuri, noutăți despre admitere, modificări de program și informații relevante pentru elevi.",
    primaryCta: { label: "Vezi noutățile", href: "/news" },
    secondaryCta: { label: "Citește blogul", href: "/blog" },
    highlights: [
      {
        title: "Anunțuri SmartMed",
        description: "Spațiu pentru lansări, perioade de înscriere și update-uri.",
        icon: "newspaper",
      },
      {
        title: "Admitere",
        description: "Loc pentru știri și clarificări despre calendarul universităților.",
        icon: "graduation-cap",
      },
      {
        title: "Newsletter",
        description: "Pregătit pentru integrare cu Resend sau alt serviciu de email.",
        icon: "mail",
      },
    ],
    roadmap: [
      "CMS pentru articole scurte și anunțuri",
      "Categorii, taguri și arhivă cronologică",
      "Emailuri automate pentru noutăți importante",
    ],
  },
  "simulari-smart": {
    eyebrow: "Antrenament realist",
    title: "Simulări Smart",
    description:
      "O zonă gândită pentru sesiuni de simulare, scoruri, leaderboard-uri controlate și feedback pe capitole.",
    primaryCta: { label: "Pregătește simularea", href: "/cont" },
    secondaryCta: { label: "Exersează grile", href: "/grile" },
    highlights: [
      {
        title: "Scoruri urmărite",
        description: "Bază pentru rezultate, comparații și progres în timp.",
        icon: "timer",
      },
      {
        title: "Feedback pe capitole",
        description: "Pregătit pentru analiză după fiecare test complet.",
        icon: "clipboard",
      },
      {
        title: "Regim de examen",
        description: "Structură pentru timer, reguli și sesiuni cu acces controlat.",
        icon: "shield",
      },
    ],
    roadmap: [
      "Calendar simulări și înscrieri",
      "Rezultate conectate la profilul utilizatorului",
      "Rapoarte premium și recomandări personalizate",
    ],
  },
  blog: {
    eyebrow: "Ghiduri și claritate",
    title: "SmartMed Blog",
    description:
      "Spațiu pentru articole educaționale, metode de învățare, explicații și povești utile pentru admiterea la Medicină.",
    primaryCta: { label: "Explorează articole", href: "/blog" },
    secondaryCta: { label: "Vezi news", href: "/news" },
    highlights: [
      {
        title: "Strategii de învățare",
        description: "Articole despre ritm, repetiție, recapitulare și focus.",
        icon: "pen-tool",
      },
      {
        title: "Explicații medicale",
        description: "Conținut pregătit pentru serii tematice și autori invitați.",
        icon: "stethoscope",
      },
      {
        title: "SEO și CMS",
        description: "Structură potrivită pentru slug-uri, categorii și autori.",
        icon: "newspaper",
      },
    ],
    roadmap: [
      "Colecții CMS pentru articole și autori",
      "Categorii, căutare și pagini dinamice de articol",
      "Newsletter și recomandări de conținut",
    ],
  },
  shop: {
    eyebrow: "Resurse educaționale",
    title: "SmartMed Shop",
    description:
      "Fundație pentru produse educaționale, materiale tipărite, pachete digitale, comenzi și plăți online.",
    primaryCta: { label: "Vezi produsele", href: "/shop" },
    secondaryCta: { label: "Întreabă despre materiale", href: "/contact" },
    highlights: [
      {
        title: "Produse digitale",
        description: "Bază pentru PDF-uri, pachete și acces după achiziție.",
        icon: "shopping-bag",
      },
      {
        title: "Plăți viitoare",
        description: "Pregătit pentru Stripe sau alt provider de plată.",
        icon: "shield",
      },
      {
        title: "Comenzi și emailuri",
        description: "Loc pentru confirmări automate și status de comandă.",
        icon: "mail",
      },
    ],
    roadmap: [
      "Catalog produse cu stoc și categorii",
      "Checkout cu cardul și facturare",
      "Emailuri automate pentru comandă și livrare",
    ],
  },
  "pentru-parinti": {
    eyebrow: "Ghid pentru familie",
    title: "Pentru părinți",
    description:
      "O pagină pregătită pentru părinții care vor să înțeleagă parcursul SmartMed, ritmul de pregătire și felul în care își pot susține copilul fără presiune inutilă.",
    primaryCta: { label: "Contactează echipa", href: "/contact" },
    secondaryCta: { label: "Vezi centrul SmartMed", href: "/" },
    highlights: [
      {
        title: "Ritm clar",
        description: "Structură pentru program, obiective și progres urmărit în timp.",
        icon: "calendar",
      },
      {
        title: "Sprijin echilibrat",
        description: "Cadru pentru comunicare, feedback și susținere fără haos.",
        icon: "heart-pulse",
      },
      {
        title: "Transparență",
        description: "Loc pentru explicații despre module, simulări, rezultate și pașii următori.",
        icon: "shield",
      },
    ],
    roadmap: [
      "Ghid pentru alegerea formatului potrivit",
      "Întrebări frecvente despre progres și simulări",
      "Canal dedicat pentru comunicarea cu echipa SmartMed",
    ],
  },
  despre: {
    eyebrow: "Identitate SmartMed",
    title: "Despre SmartMed",
    description:
      "Pagina pentru povestea SmartMed, echipă, principii, rezultate și felul în care arată pregătirea la standarde înalte.",
    primaryCta: { label: "Contactează echipa", href: "/contact" },
    secondaryCta: { label: "Descoperă centrul online", href: "/centru-online" },
    highlights: [
      {
        title: "Exigență",
        description: "Pregătire cu standarde clare și feedback onest.",
        icon: "shield",
      },
      {
        title: "Excelență",
        description: "Conținut rafinat, predare clară și ritm de progres.",
        icon: "sparkles",
      },
      {
        title: "Experiență",
        description: "O echipă care înțelege admiterea și presiunea ei.",
        icon: "stethoscope",
      },
    ],
    roadmap: [
      "Profiluri pentru echipă și traineri",
      "Rezultate, testimoniale și metodologie",
      "Media kit și resurse de brand",
    ],
  },
  contact: {
    eyebrow: "Hai să vorbim",
    title: "Contact SmartMed",
    description:
      "Pagină pregătită pentru formulare, programări, întrebări despre cursuri, abonamente și centrele SmartMed.",
    primaryCta: { label: "Intră în cont", href: "/cont" },
    secondaryCta: { label: "Vezi ajutor", href: "/ajutor" },
    highlights: [
      {
        title: "Întrebări despre cursuri",
        description: "Loc pentru formular conectat ulterior la email automat.",
        icon: "mail",
      },
      {
        title: "Programări",
        description: "Bază pentru apeluri, consultații și înscrieri.",
        icon: "calendar",
      },
      {
        title: "Suport pentru cont",
        description: "Pregătit pentru ticketing sau mesaje către echipă.",
        icon: "help",
      },
    ],
    roadmap: [
      "Formular validat și trimitere prin Resend/Nodemailer",
      "CRM simplu pentru lead-uri și cereri",
      "Răspunsuri automate și notificări interne",
    ],
  },
  cont: {
    eyebrow: "Profil și acces",
    title: "Contul tău SmartMed",
    description:
      "Placeholder premium pentru autentificare, profil, progres, abonamente, cursuri salvate și acces diferențiat.",
    primaryCta: { label: "Vezi centrul online", href: "/centru-online" },
    secondaryCta: { label: "Contact suport", href: "/contact" },
    highlights: [
      {
        title: "Autentificare",
        description: "Pregătit pentru Supabase Auth și sesiuni securizate.",
        icon: "user",
      },
      {
        title: "Roluri",
        description: "Guest, user, premium și admin ca model de acces.",
        icon: "shield",
      },
      {
        title: "Dashboard",
        description: "Spațiu pentru progres, cursuri, comenzi și notificări.",
        icon: "calendar",
      },
    ],
    roadmap: [
      "Supabase Auth și profil utilizator",
      "Protejare rute premium cu middleware",
      "Dashboard user și dashboard admin",
    ],
  },
  termeni: {
    eyebrow: "Cadru legal",
    title: "Termeni și condiții",
    description:
      "Structură pentru termenii de utilizare, achiziții, acces la cursuri, drepturi și responsabilități.",
    primaryCta: { label: "Contact legal", href: "/contact" },
    secondaryCta: { label: "Confidențialitate", href: "/confidentialitate" },
    highlights: [
      {
        title: "Utilizare platformă",
        description: "Loc pentru regulile de acces, conturi și conținut.",
        icon: "shield",
      },
      {
        title: "Plăți și abonamente",
        description: "Pregătit pentru termeni legați de checkout și refund.",
        icon: "shopping-bag",
      },
      {
        title: "Conținut educațional",
        description: "Bază pentru licențe, materiale și drepturi de autor.",
        icon: "book-open",
      },
    ],
    roadmap: [
      "Text juridic final validat",
      "Versiuni și istoric actualizări",
      "Legături cu checkout, cont și shop",
    ],
  },
  confidentialitate: {
    eyebrow: "Date și încredere",
    title: "Politică de confidențialitate",
    description:
      "Pagină pregătită pentru politica GDPR, cookie-uri, date de cont, plăți și comunicări automate.",
    primaryCta: { label: "Contact pentru date", href: "/contact" },
    secondaryCta: { label: "Termeni", href: "/termeni" },
    highlights: [
      {
        title: "Date de cont",
        description: "Structură pentru profil, progres și preferințe.",
        icon: "user",
      },
      {
        title: "Procesatori",
        description: "Loc pentru Supabase, Stripe, Resend și analytics.",
        icon: "shield",
      },
      {
        title: "Consimțământ",
        description: "Pregătit pentru cookie banner și preferințe email.",
        icon: "clipboard",
      },
    ],
    roadmap: [
      "Politică GDPR completă",
      "Management cookie-uri și consimțământ",
      "Documentare procesatori și retenție date",
    ],
  },
  ajutor: {
    eyebrow: "Suport SmartMed",
    title: "Ajutor",
    description:
      "Centru de suport pregătit pentru întrebări frecvente, ghiduri de cont, acces la cursuri și contact rapid.",
    primaryCta: { label: "Contact suport", href: "/contact" },
    secondaryCta: { label: "Contul tău", href: "/cont" },
    highlights: [
      {
        title: "Întrebări frecvente",
        description: "Spațiu pentru categorii și răspunsuri rapide.",
        icon: "help",
      },
      {
        title: "Ghiduri cont",
        description: "Pregătit pentru tutoriale despre acces și abonamente.",
        icon: "user",
      },
      {
        title: "Suport cursuri",
        description: "Loc pentru probleme legate de lecții, plăți și materiale.",
        icon: "mail",
      },
    ],
    roadmap: [
      "FAQ administrabil din CMS",
      "Căutare în articole de ajutor",
      "Ticketing sau formular conectat la email",
    ],
  },
};
