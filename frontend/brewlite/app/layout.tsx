import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/AppProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrewLite - Đặt đồ uống",
  description: "Xem menu, chọn size/topping và đặt đồ uống nhanh với BrewLite.",
  applicationName: "BrewLite",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#3b2a20",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}