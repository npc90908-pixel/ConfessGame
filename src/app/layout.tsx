import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { story } from "@/config/story";
import "./globals.css";

const cormorant = localFont({
  src: [
    {
      path: "../../public/fonts/CormorantGaramond-Variable.woff2",
      style: "normal",
      weight: "300 700",
    },
    {
      path: "../../public/fonts/CormorantGaramond-VariableItalic.woff2",
      style: "italic",
      weight: "300 700",
    },
  ],
  variable: "--font-cormorant",
  display: "swap",
});

const manrope = localFont({
  src: "../../public/fonts/Manrope-Variable.woff2",
  variable: "--font-manrope",
  weight: "200 800",
  display: "swap",
});

const dancing = localFont({
  src: "../../public/fonts/DancingScript-Variable.woff2",
  variable: "--font-dancing",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: story.title,
  description: story.tagline,
  applicationName: story.title,
  openGraph: {
    title: story.title,
    description: story.tagline,
    type: "website",
    images: [{ url: "/images/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: story.title,
    description: story.tagline,
    images: ["/images/og-image.jpg"],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0718",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang={story.language === "id" ? "id" : "en"}
      className={`${cormorant.variable} ${manrope.variable} ${dancing.variable} h-full antialiased`}
    >
      <body className="h-full bg-midnight-950 text-ink">{children}</body>
    </html>
  );
}
