import "./globals.css";

export const metadata = {
  title: "DOKAN Trénerská zóna",
  description: "Trénerská aplikácia DOKAN Bratislava",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      <body className="bg-[#f7f2e8] text-black">
        {children}
      </body>
    </html>
  );
}
