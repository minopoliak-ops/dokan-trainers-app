import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DOKAN Trénerská zóna",
    short_name: "DOKAN",
    description: "Tréningy, prezenčky, semináre a štatistiky DOKAN Bratislava",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5efe3",
    theme_color: "#111111",
    icons: [
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
