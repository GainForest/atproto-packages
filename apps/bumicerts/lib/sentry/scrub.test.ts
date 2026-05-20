import { describe, expect, test } from "bun:test";
import { scrubEvent } from "./scrub";

describe("scrubEvent", () => {
  test("redacts sensitive URL params in query strings and fragments", () => {
    const result = scrubEvent({
      request: {
        url: "https://example.com/callback?code=abc#access_token=secret&ok=1",
      },
      message: "Redirected to https://example.com/#refresh_token=secret",
      breadcrumbs: [
        {
          data: {
            url: "https://example.com/path?state=csrf#id_token=jwt",
          },
        },
      ],
    });

    expect(result.request?.url).toBe(
      "https://example.com/callback?code=[Filtered]#access_token=[Filtered]&ok=1",
    );
    expect(result.message).toBe(
      "Redirected to https://example.com/#refresh_token=[Filtered]",
    );
    expect(result.breadcrumbs?.[0]?.data?.url).toBe(
      "https://example.com/path?state=[Filtered]#id_token=[Filtered]",
    );
  });

  test("redacts sensitive keys inside nested arrays", () => {
    const result = scrubEvent({
      extra: {
        safe: "visible",
        items: [
          { access_token: "secret", nested: [{ password: "hidden" }] },
          [
            { api_key: "key" },
          ],
        ],
      },
      contexts: {
        auth: {
          values: [{ authorization: "Bearer secret" }],
        },
      },
    });

    expect(result.extra).toEqual({
      safe: "visible",
      items: [
        { access_token: "[Filtered]", nested: [{ password: "[Filtered]" }] },
        [
          { api_key: "[Filtered]" },
        ],
      ],
    });
    expect(result.contexts).toEqual({
      auth: {
        values: [{ authorization: "[Filtered]" }],
      },
    });
  });
});
