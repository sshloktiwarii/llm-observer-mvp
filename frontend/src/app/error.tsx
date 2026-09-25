"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-950 text-zinc-50">
      <h2 className="mb-4 text-xl font-semibold text-red-500">Something went wrong!</h2>
      <p className="mb-6 text-sm text-zinc-400">{error.message}</p>
      <button
        className="rounded bg-zinc-800 px-4 py-2 hover:bg-zinc-700"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
