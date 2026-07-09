// Phase 6.1: dismissable "Install Aegis" pill shown on the vault screen.
// Gating logic lives in `usePwaInstallPrompt` — this component is purely
// presentational and only mounts when `canPrompt` is true.

import { Download, X } from "lucide-react";
import { useLingui } from "@lingui/react";
import { usePwaInstallPrompt } from "@/hooks/use-pwa-install";
import { BORDER, CHARCOAL, CREAM_SOFT, MUTED } from "./chrome";

export function InstallPrompt() {
  const { canPrompt, prompt, dismiss } = usePwaInstallPrompt();
  const { i18n } = useLingui();
  const t = (id: string, fallback: string) => {
    const msg = i18n._(id);
    return msg === id ? fallback : msg;
  };
  if (!canPrompt) return null;

  return (
    <div
      role="region"
      aria-label={t("install.aria", "Install Aegis")}
      className="mb-2 mt-1 flex items-center gap-3 rounded-[14px] px-3.5 py-2.5"
      style={{
        background: CREAM_SOFT,
        border: `1px solid ${BORDER}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 18px -12px rgb(var(--aegis-ink-rgb) / 0.18)",
      }}
    >
      <div
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: "rgb(var(--aegis-ink-rgb) / 0.06)" }}
      >
        <Download className="h-4 w-4" style={{ color: CHARCOAL }} strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] leading-[1.25]" style={{ color: CHARCOAL, fontWeight: 600 }}>
          {t("install.title", "Install Aegis")}
        </div>
        <div className="text-[11.5px] leading-[1.3]" style={{ color: MUTED }}>
          {t("install.body", "Open your codes from the home screen — works offline.")}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void prompt()}
        className="shrink-0 rounded-full px-3 py-1.5 text-[12px] transition-colors"
        style={{
          background: CHARCOAL,
          color: CREAM_SOFT,
          fontWeight: 600,
          letterSpacing: "-0.005em",
        }}
      >
        {t("install.cta", "Install")}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("install.dismiss", "Dismiss install prompt")}
        className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-[rgb(var(--aegis-ink-rgb)/0.06)]"
        style={{ color: MUTED }}
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
