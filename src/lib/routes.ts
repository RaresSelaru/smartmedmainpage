export type AppRoute =
  | "/"
  | "/centru-online"
  | "/centru-fizic"
  | "/lectii-speciale"
  | "/grile"
  | "/news"
  | "/simulari-smart"
  | "/blog"
  | "/shop"
  | "/despre"
  | "/contact"
  | "/cont"
  | "/termeni"
  | "/confidentialitate"
  | "/ajutor";

export type RouteItem = {
  label: string;
  href: AppRoute;
  description?: string;
};

export const navbarRoutes: RouteItem[] = [
  { label: "Acasă", href: "/" },
  { label: "Centru online", href: "/centru-online" },
  { label: "Centru fizic", href: "/centru-fizic" },
  { label: "Lecții Smart", href: "/lectii-speciale" },
  { label: "Grile", href: "/grile" },
  { label: "Simulări Smart", href: "/simulari-smart" },
  { label: "Shop", href: "/shop" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export const primaryRoutes: RouteItem[] = [
  {
    label: "Centru online",
    href: "/centru-online",
    description: "Cursuri, module, progres și acces premium.",
  },
  {
    label: "Centru fizic",
    href: "/centru-fizic",
    description: "Pregătire în sală și comunitate SmartMed.",
  },
  {
    label: "Lecții Smart",
    href: "/lectii-speciale",
    description: "Ateliere intensive și teme țintite.",
  },
  {
    label: "Grile",
    href: "/grile",
    description: "Trimitere către platforma dedicată de grile.",
  },
  {
    label: "News",
    href: "/news",
    description: "Anunțuri și noutăți SmartMed.",
  },
  {
    label: "Blog",
    href: "/blog",
    description: "Ghiduri și articole pentru admitere.",
  },
];

export const utilityRoutes: RouteItem[] = [
  { label: "Despre", href: "/despre" },
  { label: "Contact", href: "/contact" },
  { label: "Contul tău", href: "/cont" },
];

export const footerRoutes: RouteItem[] = [
  ...primaryRoutes,
  { label: "Simulări Smart", href: "/simulari-smart" },
  { label: "Shop", href: "/shop" },
  ...utilityRoutes,
  { label: "Termeni și condiții", href: "/termeni" },
  { label: "Politică de confidențialitate", href: "/confidentialitate" },
  { label: "Ajutor", href: "/ajutor" },
];
