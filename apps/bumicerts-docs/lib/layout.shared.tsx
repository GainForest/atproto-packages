import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "Bumicerts Docs",
    },
    links: [
      {
        text: "GitHub",
        url: "https://github.com/gainforest/atproto-packages",
        external: true,
      },
    ],
  };
}
