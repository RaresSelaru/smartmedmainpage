import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

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

test("renderer uses only the fixed privacy-enhanced YouTube origin", () => {
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
    <ContentRenderer document={document} schemaVersion={1} />,
  );

  assert.match(
    html,
    /https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/u,
  );
  assert.equal(html.includes("youtube.com/embed"), false);
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
