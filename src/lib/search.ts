import "server-only";

import { getBlogCategory } from "@/lib/blog";
import { getPublishedBlogPosts } from "@/lib/blog-repository";
import type { PublicBlogSummary } from "@/lib/content/types";
import {
  destinationCards,
  featureCards,
  heroBenefits,
  onlineCenterModules,
  pageScaffolds,
  pathChoiceGroup1,
  pathChoiceGroup2,
  pathChoiceGroup3,
  roleRoadmap,
  siteConfig,
  smartBenefits,
  type PageKey,
} from "@/lib/site-config";

export type SearchResultType = "Pagină" | "Articol" | "Resursă";

export type SearchResult = {
  id: string;
  title: string;
  description: string;
  href: string;
  type: SearchResultType;
  eyebrow: string;
  score?: number;
};

type SearchDocument = SearchResult & {
  priority: number;
  keywords: string[];
};

const pageKeyToRoute = {
  "centru-fizic": "/centru-fizic",
  "module-speciale": "/module-speciale",
  news: "/news",
  "simulari-smart": "/simulari-smart",
  blog: "/blog",
  shop: "/shop",
  "pentru-parinti": "/pentru-parinti",
  despre: "/despre",
  contact: "/contact",
  cont: "/cont",
  termeni: "/termeni",
  confidentialitate: "/confidentialitate",
  ajutor: "/ajutor",
} satisfies Record<PageKey, string>;

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("ro-RO");
}

function buildHaystack(document: SearchDocument) {
  return normalizeSearchText(
    [
      document.title,
      document.description,
      document.eyebrow,
      document.type,
      document.href,
      document.keywords.join(" "),
    ].join(" "),
  );
}

function toSearchResult(document: SearchDocument, score?: number): SearchResult {
  return {
    id: document.id,
    title: document.title,
    description: document.description,
    href: document.href,
    type: document.type,
    eyebrow: document.eyebrow,
    score,
  };
}

const pageDocuments: SearchDocument[] = Object.entries(pageScaffolds).map(([key, page]) => ({
  id: `page-${key}`,
  title: page.title,
  description: page.description,
  href: pageKeyToRoute[key as PageKey],
  type: "Pagină" as const,
  eyebrow: page.eyebrow,
  priority: 12,
  keywords: [
    page.primaryCta.label,
    page.secondaryCta?.label,
    ...page.highlights.flatMap((highlight) => [highlight.title, highlight.description]),
    ...page.roadmap,
  ].filter(Boolean) as string[],
}));

const curatedDocuments: SearchDocument[] = [
  {
    id: "page-home",
    title: siteConfig.fullName,
    description: siteConfig.description,
    href: "/",
    type: "Pagină" as const,
    eyebrow: "Acasă",
    priority: 18,
    keywords: [
      siteConfig.name,
      "medicină academică",
      "admitere medicină",
      ...heroBenefits.map((item) => item.label),
      ...smartBenefits.flatMap((item) => [item.title, item.description]),
    ],
  },
  {
    id: "page-centru-online",
    title: "Centru SmartMed Online",
    description:
      "Cursuri online, module, progres, abonamente și acces diferențiat pentru pregătirea SmartMed.",
    href: "/centru-online",
    type: "Pagină" as const,
    eyebrow: "Centru online",
    priority: 16,
    keywords: [
      ...onlineCenterModules.flatMap((item) => [item.title, item.description]),
      ...roleRoadmap.flatMap((item) => [item.role, item.access]),
    ],
  },
  {
    id: "page-grile",
    title: "Grile SmartMed",
    description:
      "Platformă dedicată pentru grile, antrenament structurat și pregătire aplicată pentru admitere.",
    href: "/grile",
    type: "Pagină" as const,
    eyebrow: "Antrenament",
    priority: 16,
    keywords: ["grile", "exerciții", "biologie", "chimie", "platformă de grile"],
  },
  {
    id: "page-evenimente",
    title: "Evenimente SmartMed",
    description:
      "Simulări, teste, webinarii și evenimente online sau la centru, cu locuri actualizate și înscriere directă.",
    href: "/evenimente",
    type: "Pagină" as const,
    eyebrow: "Calendar SmartMed",
    priority: 17,
    keywords: [
      "înscriere",
      "evenimente",
      "simulare",
      "test",
      "webinar",
      "locuri",
    ],
  },
  {
    id: "page-inscriere",
    title: "Înscriere SmartMed",
    description:
      "Alege clasa a X-a, a XI-a sau a XII-a și descoperă programul, abonamentele și traseul de pregătire potrivit.",
    href: "/inscriere",
    type: "Pagină" as const,
    eyebrow: "Alege clasa",
    priority: 18,
    keywords: [
      "înscriere",
      "clasa a 10-a",
      "clasa a 11-a",
      "clasa a 12-a",
      "abonamente SmartMed",
      "pregătire medicină",
    ],
  },
  {
    id: "page-inscriere-clasa-10",
    title: "Program SmartMed clasa a X-a",
    description:
      "Pregătire structurată, testări regulate și mentorat până la admiterea din 2029.",
    href: "/inscriere/clasa-a-10-a",
    type: "Pagină" as const,
    eyebrow: "Admitere 2029",
    priority: 19,
    keywords: ["clasa a 10-a", "clasa a X-a", "admitere 2029", "abonamente"],
  },
  {
    id: "page-inscriere-clasa-11",
    title: "Program SmartMed clasa a XI-a",
    description:
      "Consolidare, gândire analitică și mentorat până la admiterea din 2028.",
    href: "/inscriere/clasa-a-11-a",
    type: "Pagină" as const,
    eyebrow: "Admitere 2028",
    priority: 20,
    keywords: ["clasa a 11-a", "clasa a XI-a", "admitere 2028", "abonamente"],
  },
  {
    id: "page-inscriere-clasa-12",
    title: "Program SmartMed clasa a XII-a",
    description:
      "Pregătire intensivă, testări și strategie lunară pentru admiterea din 2027.",
    href: "/inscriere/clasa-a-12-a",
    type: "Pagină" as const,
    eyebrow: "Admitere 2027",
    priority: 21,
    keywords: ["clasa a 12-a", "clasa a XII-a", "admitere 2027", "abonamente"],
  },
  {
    id: "page-evaluare",
    title: "Evaluare inițială SmartMed",
    description:
      "O discuție de 30 de minute în care clarificăm nivelul, obiectivul și traseul de pregătire potrivit.",
    href: "/evaluare",
    type: "Pagină" as const,
    eyebrow: "Primul pas SmartMed",
    priority: 19,
    keywords: [
      "programare",
      "evaluare",
      "consiliere",
      "plan personalizat",
      "centru fizic",
      "online",
    ],
  },
  ...destinationCards.map((card) => ({
    id: `destination-${card.href}`,
    title: card.title,
    description: card.subtitle,
    href: card.href,
    type: "Resursă" as const,
    eyebrow: "Secțiune SmartMed",
    priority: 9,
    keywords: [card.fallbackIcon],
  })),
  ...featureCards.map((card) => ({
    id: `feature-${card.href}`,
    title: card.title,
    description: card.description,
    href: card.href,
    type: "Resursă" as const,
    eyebrow: "Recomandare",
    priority: 8,
    keywords: [card.icon],
  })),
  ...[...pathChoiceGroup1, ...pathChoiceGroup2, ...pathChoiceGroup3].map((card) => ({
    id: `path-${card.href}`,
    title: card.title,
    description: card.benefits.join(" · "),
    href: card.href,
    type: "Resursă" as const,
    eyebrow: card.label,
    priority: 10,
    keywords: [card.cta, ...card.benefits],
  })),
];

const staticSearchDocuments: SearchDocument[] = [
  ...curatedDocuments,
  ...pageDocuments,
];

function createBlogSearchDocuments(
  posts: PublicBlogSummary[],
): SearchDocument[] {
  return posts.map((post) => ({
    id: `blog-${post.slug}`,
    title: post.title,
    description: post.excerpt,
    href: `/blog/${post.slug}`,
    type: "Articol" as const,
    eyebrow: getBlogCategory(post.category)?.label ?? "Blog",
    priority: 14,
    keywords: [
      post.author,
      post.category,
      post.readTime,
      ...post.tags,
    ],
  }));
}

function selectFeaturedSearchResults(
  documents: SearchDocument[],
  limit: number,
): SearchResult[] {
  const seenHrefs = new Set<string>();

  return documents
    .slice()
    .sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title, "ro-RO"))
    .filter((document) => {
      if (seenHrefs.has(document.href)) {
        return false;
      }

      seenHrefs.add(document.href);
      return true;
    })
    .slice(0, limit)
    .map((document) => toSearchResult(document));
}

function selectSearchResults(
  query: string,
  documents: SearchDocument[],
  limit: number,
): SearchResult[] {
  const terms = normalizeSearchText(query.slice(0, 160))
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  if (!terms.length) {
    return [];
  }

  const seenHrefs = new Set<string>();

  return documents
    .map((document) => {
      const normalizedTitle = normalizeSearchText(document.title);
      const normalizedDescription = normalizeSearchText(document.description);
      const normalizedEyebrow = normalizeSearchText(document.eyebrow);
      const haystack = buildHaystack(document);

      if (!terms.every((term) => haystack.includes(term))) {
        return null;
      }

      const score = terms.reduce((total, term) => {
        if (normalizedTitle.includes(term)) {
          return total + 18;
        }

        if (normalizedEyebrow.includes(term)) {
          return total + 12;
        }

        if (normalizedDescription.includes(term)) {
          return total + 8;
        }

        return total + 3;
      }, document.priority);

      return { document, score };
    })
    .filter((item): item is { document: SearchDocument; score: number } => item !== null)
    .sort((a, b) => b.score - a.score || b.document.priority - a.document.priority)
    .filter(({ document }) => {
      if (seenHrefs.has(document.href)) {
        return false;
      }

      seenHrefs.add(document.href);
      return true;
    })
    .slice(0, limit)
    .map(({ document, score }) => toSearchResult(document, score));
}

export function getFeaturedStaticSearchResults(limit = 8): SearchResult[] {
  return selectFeaturedSearchResults(staticSearchDocuments, limit);
}

export function searchStaticSite(query: string, limit = 24): SearchResult[] {
  return selectSearchResults(query, staticSearchDocuments, limit);
}

export async function getFeaturedSearchResults(
  limit = 8,
): Promise<SearchResult[]> {
  const blogDocuments = createBlogSearchDocuments(
    await getPublishedBlogPosts(),
  );

  return selectFeaturedSearchResults(
    [...staticSearchDocuments, ...blogDocuments],
    limit,
  );
}

export async function searchSite(
  query: string,
  limit = 24,
): Promise<SearchResult[]> {
  const blogDocuments = createBlogSearchDocuments(
    await getPublishedBlogPosts(),
  );

  return selectSearchResults(
    query,
    [...staticSearchDocuments, ...blogDocuments],
    limit,
  );
}
