import type { Metadata } from "next";
import { Albert_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const albertSans = Albert_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

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
    <html lang="en" className={`${albertSans.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-[var(--ks-paper)] text-[var(--ks-text)]">
        {children}
      </body>
    </html>
  );
}
