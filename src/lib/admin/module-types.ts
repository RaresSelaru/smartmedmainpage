export type AdminModuleIconKey = "files";

export type AdminModuleSummary = {
  description: string;
  href: `/admin${string}`;
  icon: AdminModuleIconKey;
  id: string;
  label: string;
  order: number;
};
