import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"]
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"]
});

export const metadata = {
  title: "Golden Triad Agentic System",
  description: "A tri-provider agentic system with Golden Rule model routing."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
