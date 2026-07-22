export type AppRoute =
  | "/"
  | "/centru-online"
  | "/centru-fizic"
  | "/module-speciale"
  | "/module-speciale/lectiile-smart"
  | "/module-speciale/sutura-smart"
  | "/module-speciale/imagistica-smart"
  | "/module-speciale/radiografia-smart"
  | "/module-speciale/disectia-smart"
  | "/module-speciale/diferentialul-smart"
  | "/grile"
  | "/news"
  | "/simulari-smart"
  | "/blog"
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
  children?: RouteItem[];
};

export const navbarRoutes: RouteItem[] = [
  { label: "Centrul SmartMed", href: "/" },
  {
    label: "Module speciale",
    href: "/module-speciale",
    children: [
      { label: "Lecțiile SMART", href: "/module-speciale/lectiile-smart" },
      { label: "Sutura SMART", href: "/module-speciale/sutura-smart" },
      { label: "Radiografia SMART", href: "/module-speciale/radiografia-smart" },
      { label: "Disecția SMART", href: "/module-speciale/disectia-smart" },
      { label: "Diferențialul SMART", href: "/module-speciale/diferentialul-smart" },
      { label: "Imagistica SMART", href: "/module-speciale/imagistica-smart" },
    ],
  },
  { label: "Grile", href: "/grile" },
  { label: "Simulări Smart", href: "/simulari-smart" },
  { label: "Shop", href: "/shop" },
  { label: "Blog", href: "/blog" },
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
    label: "Module Speciale",
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
