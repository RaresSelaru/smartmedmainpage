import assert from "node:assert/strict";
import test from "node:test";

import { buildYouTubeUrl, parseYouTubeVideoId } from "./youtube.ts";

test("YouTube links from supported public formats resolve to the stored video ID", () => {
  const id = "dQw4w9WgXcQ";

  assert.equal(parseYouTubeVideoId(id), id);
  assert.equal(
    parseYouTubeVideoId(`https://www.youtube.com/watch?v=${id}&t=20`),
    id,
  );
  assert.equal(parseYouTubeVideoId(`https://youtu.be/${id}`), id);
  assert.equal(parseYouTubeVideoId(`https://youtube.com/shorts/${id}`), id);
  assert.equal(parseYouTubeVideoId(`https://youtube.com/embed/${id}`), id);
  assert.equal(parseYouTubeVideoId(`https://youtube.com/live/${id}`), id);
  assert.equal(buildYouTubeUrl(id), `https://www.youtube.com/watch?v=${id}`);
});

test("YouTube parser rejects lookalike, insecure and malformed links", () => {
  assert.equal(
    parseYouTubeVideoId(
      "https://youtube.com.example.org/watch?v=dQw4w9WgXcQ",
    ),
    null,
  );
  assert.equal(
    parseYouTubeVideoId("http://youtube.com/watch?v=dQw4w9WgXcQ"),
    null,
  );
  assert.equal(parseYouTubeVideoId("https://youtube.com/watch?v=short"), null);
  assert.equal(parseYouTubeVideoId("<iframe>"), null);
});
