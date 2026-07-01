import type { NextConfig } from "next";

// Baseline security headers applied to every response. A strict Content-
// Security-Policy is intentionally omitted here — Clerk injects scripts and the
// app connects to Supabase/IGDB, so a CSP needs its own testing pass before it
// can be enabled without breaking auth or images.
const securityHeaders = [
  // Force HTTPS for two years, including subdomains. Safe on Vercel, which
  // serves everything over TLS.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Stop browsers from MIME-sniffing a response away from its declared type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow the site being framed (clickjacking protection).
  { key: "X-Frame-Options", value: "DENY" },
  // Don't leak full URLs (paths/queries) to third-party origins via Referer.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Drop ambient access to device features the app never uses.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    // IGDB serves cover/artwork images from its image CDN.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.igdb.com",
        pathname: "/igdb/image/upload/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
