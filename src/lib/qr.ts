import "server-only";
import QRCode from "qrcode";
import { absoluteUrl } from "@/lib/utils";

/** The one permanent sign-in address. It never changes, so printed codes keep working. */
export const signInUrl = () => absoluteUrl("/attend");

const opts = { errorCorrectionLevel: "H" as const, margin: 2, color: { dark: "#17458F", light: "#FFFFFF" } };

export const qrSvg = () => QRCode.toString(signInUrl(), { ...opts, type: "svg" });
export const qrPng = (width = 1200) => QRCode.toBuffer(signInUrl(), { ...opts, type: "png", width });
