/**
 * Convert any YouTube URL variant to an embeddable `youtube-nocookie.com` URL.
 *
 * Handles:
 * - `https://www.youtube.com/watch?v=VIDEO_ID`
 * - `https://youtu.be/VIDEO_ID`
 * - `https://www.youtube.com/embed/VIDEO_ID`
 * - `https://www.youtube-nocookie.com/embed/VIDEO_ID`
 * - `https://www.youtube.com/shorts/VIDEO_ID`
 *
 * Returns `null` if the URL is not a YouTube URL or the ID cannot be extracted.
 */
export function toYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;

    if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1).split("/")[0] ?? null;
    } else if (
      u.hostname.includes("youtube.com") ||
      u.hostname.includes("youtube-nocookie.com")
    ) {
      if (u.pathname.startsWith("/embed/")) {
        videoId = u.pathname.split("/embed/")[1]?.split("/")[0] ?? null;
      } else if (u.pathname.startsWith("/shorts/")) {
        videoId = u.pathname.split("/shorts/")[1]?.split("/")[0] ?? null;
      } else {
        videoId = u.searchParams.get("v");
      }
    }

    if (!videoId) return null;

    const start = u.searchParams.get("t") ?? u.searchParams.get("start");
    const params = start ? `?start=${start}` : "";
    return `https://www.youtube-nocookie.com/embed/${videoId}${params}`;
  } catch {
    return null;
  }
}

/**
 * Extract the raw YouTube video ID from any supported YouTube URL format.
 * Returns `null` if the URL is not a YouTube URL or the ID cannot be extracted.
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);

    // youtube.com/watch?v=ID
    if (u.hostname.includes("youtube.com") && u.searchParams.has("v")) {
      return u.searchParams.get("v");
    }
    // youtu.be/ID
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).split("/")[0] ?? null;
    }
    // youtube.com/embed/ID or youtube-nocookie.com/embed/ID
    const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/);
    if (embedMatch) return embedMatch[1] ?? null;
    // youtube.com/shorts/ID
    const shortsMatch = u.pathname.match(/\/shorts\/([^/?]+)/);
    if (shortsMatch) return shortsMatch[1] ?? null;

    return null;
  } catch {
    return null;
  }
}
