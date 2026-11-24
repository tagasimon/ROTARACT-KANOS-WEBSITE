"use client";
import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Share a page: the phone's share sheet where there is one, otherwise copy the link. Plus a WhatsApp link. */
export function ShareButtons({ url, title, text, dark, className }: { url: string; title: string; text?: string; dark?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false);
  const message = text ? `${text} ${url}` : `${title} ${url}`;

  async function share() {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* the visitor closed the share sheet, or the clipboard is blocked: nothing to do */
    }
  }

  const btn = dark ? "btn-ghost-light" : "btn-ghost";
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <button type="button" onClick={share} className={btn}>
        {copied ? <Check className="size-4" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
        <span aria-live="polite">{copied ? "Link copied" : "Share this campaign"}</span>
      </button>
      <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={btn}>
        Share on WhatsApp
      </a>
    </div>
  );
}
