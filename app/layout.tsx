import type { Metadata } from "next";
import "./globals.css";
import "@excalidraw/excalidraw/index.css";
import AuthProvider from "@/components/AuthProvider";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "PLCR STUDIO - AI Product Composition",
  description: "Composite products into photorealistic environments using AI",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
};

const isAuthEnabled = process.env.AUTH_ENABLED === "true";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = isAuthEnabled ? await auth() : null;

  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider session={session}>{children}</AuthProvider>
      </body>
    </html>
  );
}
