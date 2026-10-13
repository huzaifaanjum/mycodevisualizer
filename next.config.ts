import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Monaco is loaded from jsDelivr by @monaco-editor/react, so that origin is allowed explicitly.
const MONACO_CDN = "https://cdn.jsdelivr.net";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${MONACO_CDN}${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline' ${MONACO_CDN}`,
  `font-src 'self' data: ${MONACO_CDN}`,
  "img-src 'self' data: https://avatars.githubusercontent.com https://lh3.googleusercontent.com",
  `worker-src 'self' blob:`,
  // Narration audio is fetched from /api/narration and played from an in-memory blob: URL.
  "media-src 'self' blob:",
  `connect-src 'self' ${MONACO_CDN}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://github.com https://accounts.google.com",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Tracer sources ship with the run endpoint so the sandbox runtime can rebuild itself.
  outputFileTracingIncludes: { "/api/runs": ["./tracer/src/main/java/**/*.java"] },
  outputFileTracingExcludes: { "*": ["./tracer/build/**/*", "./tracer/src/test/**/*"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
