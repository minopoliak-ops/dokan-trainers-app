import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOKAN Trénerská zóna",
  description: "Interná aplikácia pre DOKAN",
  applicationName: "DOKAN",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DOKAN",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      <body className="min-h-screen bg-[#f5f0e6]">
        {children}
      </body>
    </html>
  );
}