import type { ImageLoaderProps } from "next/image";

import { clientEnv } from "./env/client";

const imageProxyUrl = new URL(clientEnv.NEXT_PUBLIC_IMAGE_PROXY_URL);
const imageProxyOrigin = imageProxyUrl.origin;
const imageProxyPathname = imageProxyUrl.pathname;

function isPassthroughSrc(src: string): boolean {
  return src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:");
}

function isProxiedImageUrl(url: URL): boolean {
  return url.origin === imageProxyOrigin && url.pathname === imageProxyPathname;
}

function getProxyUrl(src: string): URL | null {
  try {
    const url = new URL(src);

    if (isProxiedImageUrl(url)) return url;

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    const proxyUrl = new URL(clientEnv.NEXT_PUBLIC_IMAGE_PROXY_URL);
    proxyUrl.searchParams.set("url", url.href);
    return proxyUrl;
  } catch {
    return null;
  }
}

export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  if (isPassthroughSrc(src)) return src;

  const proxyUrl = getProxyUrl(src);
  if (!proxyUrl) return src;

  proxyUrl.searchParams.set("w", String(width));
  proxyUrl.searchParams.set("q", String(quality ?? 75));
  proxyUrl.searchParams.set("format", "auto");

  return proxyUrl.href;
}
