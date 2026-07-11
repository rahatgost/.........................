import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock } from "lucide-react";
import {
  BORDER,
  CHARCOAL,
  CREAM_SOFT,
  MUTED,
  inputClass,
  inputStyle,
  soft,
} from "@/components/aegis/chrome";
import { evaluatePassphrase, preloadZxcvbn } from "@/lib/zxcvbn";


interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
  minLength?: number;
  autoFocus?: boolean;
  required?: boolean;
  delay?: number;
  icon?: React.ReactNode;
  testId?: string;
}

/** Password / passphrase input with show-hide toggle + caps-lock warning. */
export function PasswordField({
  value,
  onChange,
  placeholder,
  autoComplete = "current-password",
  minLength,
  autoFocus,
  required = true,
  delay = 0,
  icon,
  testId,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [caps, setCaps] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typeof e.getModifierState === "function") {
        setCaps(e.getModifierState("CapsLock"));
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...soft, delay }}
        className="flex h-[48px] items-center gap-2.5 rounded-[12px] px-3.5"
        style={{
          background: CREAM_SOFT,
          border: `1px solid ${BORDER}`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        <span style={{ color: MUTED }}>
          {icon ?? <Lock className="h-4 w-4" strokeWidth={1.6} />}
        </span>
        <input
          data-testid={testId}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          autoFocus={autoFocus}
          minLength={minLength}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          style={inputStyle}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          data-testid={testId ? `${testId}-visibility-button` : undefined}
          className="rounded p-1 transition-opacity hover:opacity-100"
          style={{ color: MUTED, opacity: 0.7 }}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" strokeWidth={1.6} />
          ) : (
            <Eye className="h-4 w-4" strokeWidth={1.6} />
          )}
        </button>
      </motion.div>
      {caps && value.length > 0 && (
        <p className="px-1 text-[11.5px]" style={{ color: MUTED }}>
          Caps Lock is on.
        </p>
      )}
    </div>
  );
}

/** Simple 0-4 strength score based on length + character variety. */
export function scoreStrength(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

const STRENGTH_LABELS = ["Too short", "Weak", "Okay", "Strong", "Excellent"];
const STRENGTH_COLORS = [
  "rgb(var(--aegis-danger-rgb) / 0.85)",
  "rgba(200,110,40,0.9)",
  "rgba(180,150,40,0.9)",
  "rgba(60,140,90,0.9)",
  "rgba(40,120,70,0.95)",
];

export function StrengthMeter({ value }: { value: string }) {
  const score = scoreStrength(value);
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 px-1">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{
              background: i < score ? STRENGTH_COLORS[score] : "rgb(var(--aegis-ink-rgb) / 0.08)",
            }}
          />
        ))}
      </div>
      <span className="text-[11px] tabular-nums" style={{ color: CHARCOAL, opacity: 0.75 }}>
        {STRENGTH_LABELS[score]}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  zxcvbn-backed strength meter                                              */
/* -------------------------------------------------------------------------- */

const ZXCVBN_LABELS = ["Too weak", "Weak", "Fair", "Strong", "Excellent"];
const ZXCVBN_COLORS = [
  "rgb(var(--aegis-danger-rgb) / 0.85)",
  "rgba(200,110,40,0.9)",
  "rgba(180,150,40,0.9)",
  "rgba(60,140,90,0.9)",
  "rgba(40,120,70,0.95)",
];

export interface ZxcvbnFeedback {
  score: 0 | 1 | 2 | 3 | 4;
  warning: string;
  suggestions: string[];
}

/**
 * Async, zxcvbn-backed passphrase strength meter. Renders four segments,
 * a label, and any warning/first-suggestion returned by zxcvbn. Reports the
 * numeric score up via onScore so parents can gate submit on it.
 */
export function ZxcvbnMeter({
  value,
  onScore,
  minScore = 3,
}: {
  value: string;
  onScore?: (score: 0 | 1 | 2 | 3 | 4) => void;
  /** Draws a subtle marker at this threshold, e.g. required minimum. */
  minScore?: number;
}) {
  const [feedback, setFeedback] = useState<ZxcvbnFeedback>({
    score: 0,
    warning: "",
    suggestions: [],
  });
  const seq = useRef(0);

  // Warm the dictionaries the first time the meter mounts so the first
  // keystroke doesn't wait on a 140KB import.
  useEffect(() => {
    preloadZxcvbn();
  }, []);

  useEffect(() => {
    const mySeq = ++seq.current;
    if (!value) {
      setFeedback({ score: 0, warning: "", suggestions: [] });
      onScore?.(0);
      return;
    }
    let cancelled = false;
    // Debounce evaluation slightly to keep typing snappy.
    const t = window.setTimeout(() => {
      void evaluatePassphrase(value).then((r) => {
        if (cancelled || mySeq !== seq.current) return;
        setFeedback({
          score: r.score,
          warning: r.warning,
          suggestions: r.suggestions,
        });
        onScore?.(r.score);
      });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // onScore is expected to be stable enough — parents typically pass a
    // useState setter. Intentionally omitting from deps to avoid re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!value) return null;
  const { score, warning, suggestions } = feedback;
  const meetsMin = score >= minScore;

  return (
    <div className="flex flex-col gap-1.5 px-1">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{
                background:
                  i < score
                    ? ZXCVBN_COLORS[score]
                    : "rgb(var(--aegis-ink-rgb) / 0.08)",
              }}
            />
          ))}
        </div>
        <span
          className="text-[11px] tabular-nums"
          style={{ color: CHARCOAL, opacity: 0.75 }}
        >
          {ZXCVBN_LABELS[score]}
        </span>
      </div>
      {!meetsMin && (
        <p className="text-[11.5px]" style={{ color: MUTED, lineHeight: 1.45 }}>
          {warning ||
            suggestions[0] ||
            `Aim for at least "${ZXCVBN_LABELS[minScore]}" — try a longer, unrelated passphrase.`}
        </p>
      )}
      {meetsMin && (warning || suggestions[0]) && (
        <p className="text-[11.5px]" style={{ color: MUTED, lineHeight: 1.45 }}>
          {warning || suggestions[0]}
        </p>
      )}
    </div>
  );
}

