import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import WalletProvider from "@/components/WalletProvider";
import WalletButton from "@/components/WalletButton";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PMarket - Prediction Market on Solana",
  description:
    "Decentralized prediction market with evidence-based resolution",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <WalletProvider>
          <div className="min-h-screen flex flex-col">
            <nav className="sticky top-0 z-50 border-b border-border-primary bg-bg-primary/80 backdrop-blur-xl">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                  <div className="flex items-center gap-8">
                    <Link
                      href="/"
                      className="text-xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent"
                    >
                      PMarket
                    </Link>
                    <div className="hidden md:flex items-center gap-1">
                      <Link href="/" className="btn-ghost text-sm">
                        Markets
                      </Link>
                      <Link href="/create" className="btn-ghost text-sm">
                        Create
                      </Link>
                      <Link href="/admin" className="btn-ghost text-sm">
                        Admin
                      </Link>
                    </div>
                  </div>
                  <WalletButton />
                </div>
              </div>
            </nav>
            <main className="flex-1 w-full overflow-hidden">
              {children}
            </main>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
