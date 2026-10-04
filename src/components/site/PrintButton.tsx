"use client";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";

/** Loads every lazy image first, so photos aren't blank in the PDF, then opens the print dialog. */
async function printPage() {
  const imgs = Array.from(document.images);
  for (const i of imgs) if (i.loading === "lazy") i.loading = "eager";
  await Promise.all(
    imgs
      .filter((i) => !i.complete)
      .map((i) => new Promise<void>((done) => {
        i.addEventListener("load", () => done(), { once: true });
        i.addEventListener("error", () => done(), { once: true });
        setTimeout(done, 5000);
      })),
  );
  window.print();
}

/** Opens the browser's print dialog: "Save as PDF" turns the page into a sponsor pack. */
export function PrintButton({ className, label = "Save as PDF" }: { className?: string; label?: string }) {
  return (
    <button type="button" onClick={() => void printPage()} className={cn("no-print", className)}>
      <Printer className="size-4" aria-hidden />
      {label}
    </button>
  );
}
