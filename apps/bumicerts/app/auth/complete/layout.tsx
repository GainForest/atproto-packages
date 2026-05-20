import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Completing sign in",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthCompleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
