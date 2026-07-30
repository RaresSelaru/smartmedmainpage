import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ConsentProvider } from "@/components/consent/consent-provider";
import { ContentRenderer } from "@/lib/content/renderer";
import type { ContentDocument } from "@/lib/content/types";

test("renderer escapes text and hardens external links", () => {
  const document: ContentDocument = {
    version: 1,
    blocks: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "<img src=x onerror=alert(1)>",
          },
          {
            type: "link",
            href: "https://example.com/source",
            text: "Sursă",
          },
        ],
      },
    ],
  };
  const html = renderToStaticMarkup(
    <ContentRenderer document={document} entryId={7} schemaVersion={1} />,
  );

  assert.equal(html.includes("<img src=x"), false);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/u);
  assert.match(html, /target="_blank"/u);
  assert.match(html, /rel="noopener noreferrer external"/u);
});

test("renderer does not contact YouTube before external-media consent", () => {
  const document: ContentDocument = {
    version: 1,
    blocks: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        type: "youtube",
        videoId: "dQw4w9WgXcQ",
        title: "Video educațional",
      },
    ],
  };
  const html = renderToStaticMarkup(
    <ConsentProvider>
      <ContentRenderer document={document} schemaVersion={1} />
    </ConsentProvider>,
  );

  assert.match(html, /data-consent-gate="external-media"/u);
  assert.match(html, /Permite și redă/u);
  assert.equal(html.includes("youtube-nocookie.com"), false);
  assert.equal(html.includes("youtube.com/embed"), false);
});

test("renderer shows image and YouTube titles below their media", () => {
  const document: ContentDocument = {
    version: 1,
    blocks: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        type: "image",
        mediaId: 24,
        decorative: false,
        alt: "Descriere accesibilă a neuronului",
        caption: "Structura unui neuron",
        credit: "SmartMed",
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        type: "youtube",
        videoId: "dQw4w9WgXcQ",
        title: "Cum funcționează neuronul",
        summary: "Explicație video pe scurt.",
      },
    ],
  };
  const html = renderToStaticMarkup(
    <ConsentProvider>
      <ContentRenderer document={document} schemaVersion={1} />
    </ConsentProvider>,
  );

  assert.match(html, /<figcaption[^>]*>[\s\S]*Structura unui neuron/u);
  assert.match(html, /Structura unui neuron[\s\S]*SmartMed[\s\S]*<\/figcaption>/u);
  assert.match(html, /<figcaption[^>]*>[\s\S]*Cum funcționează neuronul/u);
  assert.match(
    html,
    /Cum funcționează neuronul[\s\S]*Explicație video pe scurt\.[\s\S]*<\/figcaption>/u,
  );
});

test("renderer keeps numbered lists as semantic ordered lists", () => {
  const document: ContentDocument = {
    version: 1,
    blocks: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        type: "list",
        style: "ordered",
        items: [
          {
            id: "00000000-0000-4000-8000-000000000002",
            content: [{ type: "text", text: "neuroni" }],
          },
          {
            id: "00000000-0000-4000-8000-000000000003",
            content: [{ type: "text", text: "inima" }],
          },
          {
            id: "00000000-0000-4000-8000-000000000004",
            content: [{ type: "text", text: "creier" }],
          },
        ],
      },
    ],
  };
  const html = renderToStaticMarkup(
    <ContentRenderer document={document} schemaVersion={1} />,
  );

  assert.match(
    html,
    /^<ol><li><span>neuroni<\/span><\/li><li><span>inima<\/span><\/li><li><span>creier<\/span><\/li><\/ol>$/u,
  );
});

test("renderer lets an authorized preview replace only the media projection", () => {
  const document: ContentDocument = {
    version: 1,
    blocks: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        type: "image",
        mediaId: 24,
        decorative: false,
        alt: "Imagine educațională",
      },
    ],
  };
  const html = renderToStaticMarkup(
    <ContentRenderer
      document={document}
      getMediaPath={(mediaId, width) =>
        `/admin/media/cms/${mediaId}/${width}`
      }
      schemaVersion={1}
    />,
  );

  assert.match(html, /\/admin\/media\/cms\/24\/640/u);
  assert.match(html, /\/admin\/media\/cms\/24\/1280/u);
  assert.match(html, /\/admin\/media\/cms\/24\/1920/u);
  assert.equal(html.includes('src="/media/cms/24/'), false);
  assert.equal(html.includes('srcSet="/media/cms/24/'), false);
});
