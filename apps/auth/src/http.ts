export function jsonResponse(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function redirectResponse(location: string, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("location", location);
  return new Response(null, { ...init, status: init?.status ?? 302, headers });
}

export function notFound(): Response {
  return new Response("Not found", { status: 404 });
}

export function methodNotAllowed(): Response {
  return new Response("Method not allowed", { status: 405 });
}

export function htmlResponse(html: string, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  return new Response(html, { ...init, headers });
}
