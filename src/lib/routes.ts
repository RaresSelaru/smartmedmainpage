export type AppRoute =
  | "/"
  | "/centru-online"
  | "/centru-fizic"
  | "/module-speciale"
  | "/grile"
  | "/news"
  | "/simulari-smart"
  | "/blog"
  | "/blog-principal"
  | "/shop"
  | "/pentru-parinti"
  | "/despre"
  | "/contact"
  | "/cont"
  | "/cautare"
  | "/termeni"
  | "/confidentialitate"
  | "/ajutor";

export type RouteItem = {
  label: string;
  href: AppRoute;
  description?: string;
};

export const navbarRoutes: RouteItem[] = [
  { label: "Centrul SmartMed", href: "/" },
  { label: "Module speciale", href: "/module-speciale" },
  { label: "Grile", href: "/grile" },
  { label: "Simulări Smart", href: "/simulari-smart" },
  { label: "Shop", href: "/shop" },
  { label: "Blog", href: "/blog-principal" },
  { label: "Pentru părinți", href: "/pentru-parinti" },
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
    href: "/module-speciale",
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
    href: "/blog-principal",
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
