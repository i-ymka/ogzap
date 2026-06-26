import type { Metadata } from "next";
import OgzapLanding from "@/app/components/OgzapLanding";

export const metadata: Metadata = {
  title: "ogzap — One request. Perfect preview.",
  description:
    "ogzap generates OG images for any URL on-demand — headless rendered, CDN-cached, delivered in milliseconds. Add it in one line.",
  openGraph: {
    title: "ogzap — One request. Perfect preview.",
    description:
      "ogzap generates OG images for any URL on-demand — headless rendered, CDN-cached, delivered in milliseconds.",
    url: "https://ogzap.com",
    siteName: "ogzap",
    type: "website",
  },
};

export default function HomePage() {
  return <OgzapLanding />;
}
