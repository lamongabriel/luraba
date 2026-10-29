import type { MetadataRoute } from "next";

// Makes Luraba installable. On iPhone, web push only works once the app is added to the home screen.
// TODO: add 192px and 512px PNG icons here for Chrome's install prompt.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Luraba",
    short_name: "Luraba",
    description: "Luraba — Finance Made Easy",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f3f1eb",
    theme_color: "#263d2e",
  };
}
