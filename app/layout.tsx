import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Counter Check",
  description: "Check a car repair quote before you pay.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
              <span aria-hidden className="grid size-6 place-items-center rounded-md bg-accent text-white">
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3.2 3L13 4.5" /></svg>
              </span>
              Counter Check
            </Link>
            <a href="#check" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep">
              Check a quote
            </a>
          </div>
        </header>
        {children}
        <footer className="mx-auto max-w-6xl px-4 py-8 text-xs leading-relaxed text-muted sm:px-6">
          <p>Counter Check gives estimates to help you ask better questions. It is not a diagnosis or legal advice.</p>
          <p className="mt-1">
            Car photos are from Wikimedia Commons under Creative Commons licences, backgrounds removed.{" "}
            <a className="underline underline-offset-2 hover:text-ink" href="/cars/CREDITS.md">Photo credits</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
