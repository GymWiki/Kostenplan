import type { MetadataRoute } from "next";

// Kostenplan als app op het beginscherm (PWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kostenplan",
    short_name: "Kostenplan",
    description: "Je aanvragen en rekentools, altijd bij de hand.",
    lang: "nl",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7faf8",
    theme_color: "#15803d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
