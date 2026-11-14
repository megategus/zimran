import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Counter Check",
    short_name: "Counter Check",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111111", // placeholder until the design system (Task 9)
  };
}
