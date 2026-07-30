import Link from "next/link";
import type { ReactNode } from "react";

import { ConsentYouTubeEmbed } from "@/components/consent/consent-youtube-embed";
import { readStoredContentDocument } from "@/lib/content/legacy";
import {
  getPublicCmsMediaPath,
  type PublicCmsMediaWidth,
} from "@/lib/content/media";
import { isInternalContentHref } from "@/lib/content/schema";
import type {
  CalloutBlock,
  ContentBlock,
  ContentDocument,
  ContentInline,
  ContentReadIssue,
  ImageBlock,
  ReferencesBlock,
} from "@/lib/content/types";

export type ContentMediaPathResolver = (
  mediaId: number,
  width: PublicCmsMediaWidth,
) => string;

type ContentRendererProps = {
  document: ContentDocument | unknown;
  entryId?: number;
  getMediaPath?: ContentMediaPathResolver;
  schemaVersion?: number | null;
};

const calloutLabels: Record<CalloutBlock["variant"], string> = {
  important: "Important",
  warning: "Atenție",
  "medical-note": "Notă medicală",
};

function reportReadIssues(entryId: number | undefined, issues: ContentReadIssue[]) {
  if (!issues.length) {
    return;
  }

  console.warn("SmartMed omitted malformed public content.", {
    entryId,
    issueCount: issues.length,
    issues: issues.slice(0, 10),
  });
}

export function ContentRenderer({
  document: documentValue,
  entryId,
  getMediaPath = getPublicCmsMediaPath,
  schemaVersion,
}: ContentRendererProps) {
  const { document, issues } = readStoredContentDocument(documentValue, schemaVersion);
  reportReadIssues(entryId, issues);

  if (!document.blocks.length) {
    return (
      <p role="status">
        Conținutul acestui articol nu este disponibil momentan.
      </p>
    );
  }

  return document.blocks.map((block) => (
    <ContentBlockRenderer
      block={block}
      getMediaPath={getMediaPath}
      key={block.id}
    />
  ));
}

function ContentBlockRenderer({
  block,
  getMediaPath,
}: {
  block: ContentBlock;
  getMediaPath: ContentMediaPathResolver;
}) {
  if (block.type === "paragraph") {
    return (
      <p>
        <InlineRenderer content={block.content} />
      </p>
    );
  }

  if (block.type === "heading") {
    return block.level === 3 ? (
      <h3>
        <InlineRenderer content={block.content} />
      </h3>
    ) : (
      <h2>
        <InlineRenderer content={block.content} />
      </h2>
    );
  }

  if (block.type === "list") {
    const items = block.items.map((item) => (
      <li key={item.id}>
        <InlineRenderer content={item.content} />
      </li>
    ));

    return block.style === "ordered" ? <ol>{items}</ol> : <ul>{items}</ul>;
  }

  if (block.type === "blockquote") {
    return (
      <blockquote className="border-l-4 border-smart-teal/45 pl-5 font-serif text-2xl italic text-smart-ink">
        <InlineRenderer content={block.content} />
      </blockquote>
    );
  }

  if (block.type === "image") {
    return <ContentImage block={block} getMediaPath={getMediaPath} />;
  }

  if (block.type === "youtube") {
    return (
      <figure>
        <div className="aspect-video overflow-hidden rounded-3xl bg-smart-abyss">
          <ConsentYouTubeEmbed title={block.title} videoId={block.videoId} />
        </div>
        <figcaption className="text-sm leading-6 text-smart-ink/64">
          <span className="block font-semibold text-smart-ink/82">
            {block.title}
          </span>
          {block.summary ? (
            <span className="mt-1 block">{block.summary}</span>
          ) : null}
        </figcaption>
      </figure>
    );
  }

  if (block.type === "callout") {
    return (
      <aside
        className="rounded-3xl border border-smart-teal/25 bg-smart-teal/8 p-6"
        role={block.variant === "warning" ? "alert" : "note"}
      >
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-smart-teal">
          {calloutLabels[block.variant]}
        </p>
        {block.title ? (
          <h3 className="mt-2 font-serif text-3xl font-semibold text-smart-ink">
            {block.title}
          </h3>
        ) : null}
        <p className="mt-3">
          <InlineRenderer content={block.content} />
        </p>
      </aside>
    );
  }

  return <References block={block} />;
}

function ContentImage({
  block,
  getMediaPath,
}: {
  block: ImageBlock;
  getMediaPath: ContentMediaPathResolver;
}) {
  const metadataParts = [block.credit, block.source, block.rights].filter(
    (value): value is string => Boolean(value),
  );

  return (
    <figure>
      <picture className="flex max-h-[720px] items-center justify-center overflow-hidden rounded-3xl bg-smart-cream/70">
        <source
          media="(max-width: 700px)"
          srcSet={getMediaPath(block.mediaId, 640)}
        />
        <source
          media="(max-width: 1400px)"
          srcSet={getMediaPath(block.mediaId, 1280)}
        />
        <img
          alt={block.decorative ? "" : block.alt}
          className="block max-h-[720px] w-auto max-w-full object-contain"
          decoding="async"
          loading="lazy"
          src={getMediaPath(block.mediaId, 1920)}
        />
      </picture>
      {block.caption || metadataParts.length ? (
        <figcaption className="text-sm leading-6 text-smart-ink/64">
          {block.caption ? (
            <span className="block font-semibold text-smart-ink/82">
              {block.caption}
            </span>
          ) : null}
          {metadataParts.length ? (
            <span className={block.caption ? "mt-1 block" : "block"}>
              {metadataParts.join(" · ")}
            </span>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

function References({ block }: { block: ReferencesBlock }) {
  return (
    <section aria-labelledby={`${block.id}-title`}>
      <h2 id={`${block.id}-title`}>{block.title ?? "Referințe"}</h2>
      <ol>
        {block.items.map((item) => (
          <li key={item.id}>
            {item.url ? (
              <SafeContentLink href={item.url}>{item.label}</SafeContentLink>
            ) : (
              item.label
            )}
            {item.note ? <span> — {item.note}</span> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function InlineRenderer({ content }: { content: ContentInline[] }) {
  return content.map((run, index) => {
    let child: ReactNode = run.text;

    if (run.italic) {
      child = <em>{child}</em>;
    }

    if (run.bold) {
      child = <strong>{child}</strong>;
    }

    if (run.type === "link") {
      child = <SafeContentLink href={run.href}>{child}</SafeContentLink>;
    }

    return <span key={`${run.type}-${index}`}>{child}</span>;
  });
}

function SafeContentLink({ children, href }: { children: ReactNode; href: string }) {
  if (isInternalContentHref(href)) {
    return <Link href={href}>{children}</Link>;
  }

  return (
    <a href={href} rel="noopener noreferrer external" target="_blank">
      {children}
    </a>
  );
}
