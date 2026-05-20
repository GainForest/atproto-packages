import { Buffer } from "node:buffer";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { authBaseUrl, configureEnv, env } from "./env.js";

configureEnv(process.env);
const { route } = await import("./app.js");

async function nodeRequestToWebRequest(message: IncomingMessage): Promise<Request> {
  const host = message.headers.host ?? "localhost";
  const protocol = message.headers["x-forwarded-proto"]?.toString() ?? "http";
  const url = `${protocol}://${host}${message.url ?? "/"}`;
  const headers = new Headers();

  for (const [name, value] of Object.entries(message.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  const chunks: Buffer[] = [];
  for await (const chunk of message) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
  return new Request(url, {
    method: message.method,
    headers,
    body,
  });
}

async function sendWebResponse(response: Response, serverResponse: ServerResponse) {
  serverResponse.statusCode = response.status;
  const headersWithCookies = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies = headersWithCookies.getSetCookie?.() ?? [];

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") {
      serverResponse.setHeader(key, value);
    }
  });
  if (setCookies.length > 0) {
    serverResponse.setHeader("set-cookie", setCookies);
  }

  if (!response.body) {
    serverResponse.end();
    return;
  }

  const body = Buffer.from(await response.arrayBuffer());
  serverResponse.end(body);
}

createServer(async (message, serverResponse) => {
  try {
    const request = await nodeRequestToWebRequest(message);
    await sendWebResponse(await route(request), serverResponse);
  } catch (error) {
    console.error("[auth] Unhandled request error", error);
    serverResponse.statusCode = 500;
    serverResponse.end("Internal server error");
  }
}).listen(env.PORT, () => {
  console.log(`[auth] listening on ${authBaseUrl} (port ${env.PORT})`);
});
