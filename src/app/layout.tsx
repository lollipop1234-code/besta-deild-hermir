import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Besta deild hermir",
  description: "Leiktu þér að leikjafyrirkomulagi Bestu deildarinnar.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="is">
      <body>{children}</body>
    </html>
  );
}
