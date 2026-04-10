import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "안전기술본부 스마트 안전관리 시스템",
    short_name: "안전관리",
    description: "한국농어촌공사 안전작업허가 전자결재 시스템",
    start_url: "/",
    display: "standalone",
    background_color: "#f0f4f8",
    theme_color: "#1e3a5f",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
