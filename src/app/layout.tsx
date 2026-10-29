import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Monogram Mail — Enterprise Email Platform",
  description:
    "Secure business email hosting: domains, mailboxes, DNS verification, and billing in one control plane.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${jakarta.variable} ${dmSans.variable}`}>
      <body className="h-full font-sans antialiased flex flex-col">{children}</body>
    </html>
  );
}
