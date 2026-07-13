import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Material-/extra-optie foto's zijn max 5MB (zie app/lib/storage.ts);
      // laat ruimte voor multipart-overhead boven op de bestandsgrootte.
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [
      {
        source: "/portaal/:slug*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *;" }],
      },
    ];
  },
};

export default nextConfig;
