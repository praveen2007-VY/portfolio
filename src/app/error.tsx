"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-sm text-accent">Something went wrong</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">This page couldn&apos;t load</h1>
        <p className="mt-3 text-muted">Please try again in a moment.</p>
        <div className="mt-8 flex justify-center gap-3">
          <button type="button" onClick={reset} className={buttonClasses("primary")}>
            Try again
          </button>
          <Link href="/" className={buttonClasses("secondary")}>
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
