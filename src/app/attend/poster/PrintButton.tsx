"use client";
export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="rounded-full bg-royal px-5 py-2.5 text-sm font-semibold text-white">Print</button>;
}
