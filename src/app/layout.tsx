import type { Metadata, Viewport } from "next";
import { Lexend_Deca } from "next/font/google";
import "./globals.css";

const lexendDeca = Lexend_Deca({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://proofclean.ca"),
  title: {
    default: "Commercial Cleaning Software with Photo Proof — ProofClean",
    template: "%s — ProofClean",
  },
  description:
    "Photo-proof job software for commercial cleaning companies. Dispatch crews, track jobs on a live map, and auto-send clients photo proof. Flat $59/mo, unlimited cleaners & locations.",
  keywords: [
    "commercial cleaning software",
    "janitorial software",
    "cleaning company software",
    "proof of cleaning",
    "photo proof cleaning app",
    "cleaning crew dispatch",
  ],
  openGraph: {
    title: "Commercial Cleaning Software with Photo Proof — ProofClean",
    description:
      "Photo-proof job software for commercial cleaning companies. Dispatch crews, track jobs on a live map, and auto-send clients photo proof. Flat $59/mo, unlimited cleaners & locations.",
    url: "https://proofclean.ca",
    siteName: "ProofClean",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ProofClean — Commercial Cleaning Software with Photo Proof",
    description:
      "Photo-proof job software for commercial cleaning companies. Dispatch crews, track jobs on a live map, and auto-send clients photo proof. Flat $59/mo, unlimited cleaners & locations.",
  },
  manifest: "/manifest.json",
  icons: {
    // The bolder favicon.ico (src/app/favicon.ico) is emitted automatically by
    // the App Router file convention. These PNGs add crisp high-DPI variants.
    icon: [
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${lexendDeca.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}