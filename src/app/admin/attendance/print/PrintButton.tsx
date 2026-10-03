"use client";
export function PrintButton() {
  return <button onClick={() => window.print()} className="btn-ink btn-sm print:hidden">Print</button>;
}
