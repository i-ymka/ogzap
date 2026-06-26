import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the headless-Chromium packages external so Next doesn't try to bundle
  // the chromium binary into the serverless function.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // Force Vercel file-tracing to include the chromium binary (bin/*.br) for the
  // /og function — it's loaded by path at runtime, so tracing misses it otherwise.
  outputFileTracingIncludes: {
    "/og": [
      "./node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
  },
};

export default nextConfig;
