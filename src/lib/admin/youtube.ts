const youtubeIdPattern = /^[A-Za-z0-9_-]{11}$/u;
const approvedYoutubeHosts = new Set([
  "m.youtube.com",
  "www.youtube.com",
  "youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
]);

export function parseYouTubeVideoId(value: string): string | null {
  const candidate = value.trim();

  if (youtubeIdPattern.test(candidate)) {
    return candidate;
  }

  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || !approvedYoutubeHosts.has(url.hostname)) {
    return null;
  }

  let videoId = "";

  if (url.hostname === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v") ?? "";
  } else {
    const segments = url.pathname.split("/").filter(Boolean);
    if (
      segments[0] === "embed" ||
      segments[0] === "shorts" ||
      segments[0] === "live"
    ) {
      videoId = segments[1] ?? "";
    }
  }

  return youtubeIdPattern.test(videoId) ? videoId : null;
}

export function buildYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
