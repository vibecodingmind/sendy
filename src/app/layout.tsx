import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Monogram Mail — Enterprise Email Platform",
  description: "Secure, reliable, carrier-grade business email platform and administration portal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${inter.className}`}>
      <body className="h-full bg-slate-50 text-slate-900 antialiased flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
