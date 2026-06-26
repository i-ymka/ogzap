import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "ogzap — One request. Perfect preview.",
  description:
    "ogzap generates OG images for any URL on-demand — headless rendered, CDN-cached, delivered in milliseconds. Add it in one line.",
  metadataBase: new URL("https://ogzap.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-ZCSBXLT64Z" strategy="afterInteractive" />
        <Script id="ga" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-ZCSBXLT64Z');
        `}</Script>
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
