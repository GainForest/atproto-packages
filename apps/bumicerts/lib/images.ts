import { clientEnv } from "./env/client";

const imageProxyPrefix = clientEnv.NEXT_PUBLIC_IMAGE_PROXY_URL;
const imageProxyOrigin = new URL(imageProxyPrefix).origin;

function isPassthroughImageSrc(src: string): boolean {
  return src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:");
}

function shouldProxyImageUrl(url: URL): boolean {
  if (url.origin === imageProxyOrigin) return false;
  return url.protocol === "https:" || url.protocol === "http:";
}

export function getProxiedImageUrl(src: string): string {
  if (isPassthroughImageSrc(src)) return src;

  try {
    const url = new URL(src);
    if (!shouldProxyImageUrl(url)) return src;
    return `${imageProxyPrefix}${encodeURIComponent(url.href)}`;
  } catch {
    return src;
  }
}
