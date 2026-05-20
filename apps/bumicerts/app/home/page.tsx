import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { links } from "@/lib/links";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

export default function HomePage() {
  redirect(links.explore);
}
