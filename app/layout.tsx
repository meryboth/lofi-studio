import type { Metadata, Viewport } from "next";
import "./globals.css";

const description = "Un estudio lo-fi para trabajar con música de fondo: elegí un vinilo, escuchá radio en vivo y mirá cómo la aurora y la nieve se mueven con la música.";

export const metadata: Metadata = {
  title: "Lo Fi Studio",
  description,
  applicationName: "Lo Fi Studio",
  keywords: ["lo-fi", "música para concentrarse", "ambient", "radio", "vinilo", "focus"],
  openGraph: { title: "Lo Fi Studio", description, type: "website", locale: "es_AR", siteName: "Lo Fi Studio" },
};

export const viewport: Viewport = { themeColor: "#1c1b2e" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
