import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CashMate",
    short_name: "CashMate",
    description: "Centralized app to track shared family balance - add income and expenses, see who added each transaction",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#6366f1",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/cashmate_wallet_logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    categories: ["finance", "productivity"],
    shortcuts: [
      {
        name: "Add Transaction",
        short_name: "Add",
        description: "Quickly add a new transaction",
        url: "/?action=add",
      },
    ],
  };
}
