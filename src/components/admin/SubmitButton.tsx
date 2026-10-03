"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className = "btn-ink", pendingText = "Saving…", name, value }: { children: React.ReactNode; className?: string; pendingText?: string; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending} name={name} value={value}>{pending ? pendingText : children}</button>;
}

export function ConfirmButton({ children, message, className = "btn-danger btn-sm" }: { children: React.ReactNode; message: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      disabled={pending}
      onClick={(e) => {
        // inline confirmation without a blocking browser dialog
        const b = e.currentTarget;
        if (b.dataset.armed !== "1") {
          e.preventDefault();
          b.dataset.armed = "1";
          b.textContent = message;
          setTimeout(() => { b.dataset.armed = "0"; b.textContent = String(children); }, 4000);
        }
      }}
    >
      {children}
    </button>
  );
}
