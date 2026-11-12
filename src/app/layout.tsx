import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VMS — HikCentral OpenAPI Foundation",
  description: "HikCentral Professional OpenAPI V3.1.1 integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

