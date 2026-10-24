import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Botica | Inventario y punto de venta",
    short_name: "Botica",
    description:
      "Administración de inventario por lotes, punto de venta y control de acceso para droguerías.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f3ec",
    theme_color: "#0f4939",
    lang: "es",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
