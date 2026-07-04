import { useState, useMemo, type ReactNode } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import {
  Shield,
  Zap,
  Lock,
  RefreshCw,
  QrCode,
  Upload,
  KeyRound,
  CloudUpload,
  Bell,
  Fingerprint,
  Check,
  ArrowRight,
  Sparkles,
  ChevronLeft,
} from "lucide-react";

/* Motion tokens */
const spring = { type: "spring" as const, stiffness: 280, damping: 28, mass: 0.8 };
const softSpring = { type: "spring" as const, stiffness: 220, damping: 30, mass: 0.9 };
const gentle = { type: "spring" as const, stiffness: 160, damping: 24, mass: 1 };

/* ------------------------------------------------------------------ */
/*  Ambient background — deep, cinematic, still calm                   */
/* ------------------------------------------------------------------ */

function AmbientBackground() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 70% at 50% -10%, #EEF2FF 0%, #F1F4FA 40%, #EDF0F6 100%)",
        }}
      />
      <motion.div
        className="absolute -left-32 top-[10%] h-[380px] w-[380px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--color-primary) 26%, transparent), transparent 70%)",
          filter: "blur(70px)",
        }}
        animate={reduce ? undefined : { x: [0, 22, 0], y: [0, -14, 0], opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-32 bottom-[8%] h-[440px] w-[440px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--color-accent) 22%, transparent), transparent 70%)",
          filter: "blur(80px)",
        }}
        animate={reduce ? undefined : { x: [0, -20, 0], y: [0, 14, 0], opacity: [0.45, 0.75, 0.45] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0 opacity-[0.4] mix-blend-overlay"
        style={{
          backgroundImage: "radial-gradient(rgba(15,23,42,0.06) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Top bar                                                            */
/* ------------------------------------------------------------------ */

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="relative h-[3px] w-32 overflow-hidden rounded-full bg-black/[0.08]">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: "linear-gradient(90deg, var(--color-primary), var(--color-accent))" }}
        initial={false}
        animate={{ width: `${((current + 1) / total) * 100}%` }}
        transition={softSpring}
      />
    </div>
  );
}

function TopBar({
  step,
  total,
  onBack,
  onSkip,
  canSkip,
}: {
  step: number;
  total: number;
  onBack?: () => void;
  onSkip?: () => void;
  canSkip: boolean;
}) {
  return (
    <header className="relative z-10 flex h-11 shrink-0 items-center justify-between px-4">
      <div className="flex w-14 justify-start">
        <AnimatePresence initial={false}>
          {step > 0 && (
            <motion.button
              key="back"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={spring}
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              aria-label="Back"
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-black/[0.05] hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <ProgressBar current={step} total={total} />
      <div className="flex w-14 justify-end">
        {canSkip && (
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={onSkip}
            className="rounded-full px-2 py-1 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip
          </motion.button>
        )}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Buttons                                                            */
/* ------------------------------------------------------------------ */

function PrimaryButton({
  children,
  onClick,
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      transition={spring}
      className="group relative flex h-[50px] w-full items-center justify-center gap-2 overflow-hidden rounded-[16px] text-[16px] font-semibold tracking-[-0.01em] text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={{
        background: "linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)",
        boxShadow:
          "0 1px 0 0 rgba(255,255,255,0.3) inset, 0 8px 22px -10px rgba(37,99,235,0.6), 0 3px 10px -3px rgba(37,99,235,0.35)",
      }}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/22 to-transparent" />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%)",
        }}
        initial={{ x: "-120%" }}
        animate={{ x: "120%" }}
        transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 2.6, ease: "easeInOut" }}
      />
      <span className="relative flex items-center gap-2">
        {children}
        {icon ?? (
          <ArrowRight
            className="h-[17px] w-[17px] transition-transform duration-300 group-hover:translate-x-0.5"
            strokeWidth={2.4}
          />
        )}
      </span>
    </motion.button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      transition={spring}
      className="flex h-[44px] w-full items-center justify-center rounded-[16px] text-[14.5px] font-semibold tracking-[-0.01em] text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {children}
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/*  Typography                                                         */
/* ------------------------------------------------------------------ */

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.02 }}
      className="inline-flex items-center gap-1.5 rounded-full bg-primary/[0.09] px-2.5 py-[3px] text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary"
    >
      {children}
    </motion.span>
  );
}

function Headline({
  title,
  subtitle,
  eyebrow,
  compact = false,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="px-6 text-center">
      {eyebrow && <div className="mb-2.5">{eyebrow}</div>}
      <motion.h1
        initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ ...spring, delay: 0.06 }}
        className={`font-display font-bold leading-[1.05] tracking-[-0.035em] text-foreground ${
          compact ? "text-[26px]" : "text-[30px]"
        }`}
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.16 }}
          className="mx-auto mt-2 max-w-[320px] text-[14px] font-normal leading-[1.4] tracking-[-0.005em] text-muted-foreground"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Iconic art frame                                                   */
/* ------------------------------------------------------------------ */

function ArtFrame({ children, size = 108 }: { children: ReactNode; size?: number }) {
  return (
    <motion.div
      initial={{ scale: 0.88, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.1 }}
      className="relative flex items-center justify-center rounded-[30px]"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(180deg, #FFFFFF 0%, #F1F4FB 100%)",
        boxShadow:
          "0 1px 0 0 rgba(255,255,255,1) inset, 0 0 0 1px rgba(15,23,42,0.05), 0 24px 50px -20px rgba(37,99,235,0.35), 0 6px 16px -6px rgba(15,23,42,0.14)",
      }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen 1 — Hero                                                    */
/* ------------------------------------------------------------------ */

function HeroArt() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useTransform(my, [-30, 30], [6, -6]);
  const ry = useTransform(mx, [-30, 30], [-6, 6]);

  return (
    <div
      className="relative flex h-[220px] w-full items-center justify-center"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(e.clientX - r.left - r.width / 2);
        my.set(e.clientY - r.top - r.height / 2);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      style={{ perspective: 1000 }}
    >
      {[170, 210, 250].map((size, i) => (
        <motion.div
          key={size}
          aria-hidden
          className="absolute rounded-full border"
          style={{
            width: size,
            height: size,
            borderColor: `color-mix(in oklab, var(--color-primary) ${14 - i * 3}%, transparent)`,
          }}
          animate={reduce ? undefined : { scale: [1, 1.03, 1], opacity: [0.55, 0.9, 0.55] }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
        />
      ))}

      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 108 + (i % 2) * 12;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const size = i % 3 === 0 ? 5 : 3;
        return (
          <motion.span
            key={i}
            aria-hidden
            className="absolute rounded-full"
            style={{
              x,
              y,
              width: size,
              height: size,
              background: i % 2 === 0 ? "var(--color-primary)" : "var(--color-accent)",
              boxShadow: "0 0 10px color-mix(in oklab, var(--color-primary) 70%, transparent)",
            }}
            animate={reduce ? undefined : { opacity: [0.25, 1, 0.25], scale: [0.7, 1.15, 0.7] }}
            transition={{
              duration: 2.6 + (i % 4) * 0.4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          />
        );
      })}

      <motion.svg
        aria-hidden
        viewBox="0 0 260 260"
        className="absolute h-[240px] w-[240px]"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        <circle
          cx="130"
          cy="130"
          r="120"
          fill="none"
          stroke="color-mix(in oklab, var(--color-primary) 22%, transparent)"
          strokeWidth="1"
          strokeDasharray="2 8"
        />
      </motion.svg>

      <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }} transition={gentle}>
        <ArtFrame size={112}>
          <motion.div
            animate={reduce ? undefined : { rotate: [0, 4, -4, 0], y: [0, -2, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            <Shield className="h-[52px] w-[52px]" strokeWidth={1.5} style={{ color: "var(--color-primary)" }} />
          </motion.div>
          <motion.div
            className="absolute inset-x-0 bottom-[30px] mx-auto flex h-[22px] w-[22px] items-center justify-center rounded-full"
            style={{ background: "var(--color-primary)" }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...spring, delay: 0.6 }}
          >
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
          </motion.div>
        </ArtFrame>
      </motion.div>
    </div>
  );
}

function ScreenHero({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-2">
        <HeroArt />
        <Headline
          eyebrow={<Eyebrow>Welcome to Aegis</Eyebrow>}
          title={<>Security that <br /> simply works.</>}
          subtitle="Protect every account with secure one-time codes — quiet, elegant, private."
        />
      </div>
      <div className="shrink-0 px-5 pt-2">
        <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen 2 — Why                                                     */
/* ------------------------------------------------------------------ */

function FeatureCard({
  index,
  icon,
  title,
  description,
  delay,
  tint,
}: {
  index: string;
  icon: ReactNode;
  title: string;
  description: string;
  delay: number;
  tint: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ ...spring, delay }}
      whileHover={{ y: -2 }}
      className="relative overflow-hidden rounded-[22px] bg-white/85 p-3.5 backdrop-blur-xl"
      style={{
        boxShadow:
          "0 1px 0 0 rgba(255,255,255,0.9) inset, 0 0 0 1px rgba(15,23,42,0.05), 0 10px 26px -18px rgba(15,23,42,0.22)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-80"
        style={{
          background: `radial-gradient(closest-side, ${tint}, transparent 70%)`,
          filter: "blur(16px)",
        }}
      />
      <div className="relative flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.5))",
            boxShadow: "0 0 0 1px rgba(15,23,42,0.05), 0 6px 14px -8px rgba(37,99,235,0.4)",
          }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-[15.5px] font-bold tracking-[-0.02em] text-foreground">
              {title}
            </h3>
            <span className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/60">
              {index}
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px] leading-[1.35] text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function ScreenWhy({ onNext }: { onNext: () => void }) {
  const items = [
    {
      icon: <Zap className="h-[18px] w-[18px]" style={{ color: "var(--color-primary)" }} strokeWidth={2.2} />,
      title: "Fast",
      description: "One-time codes the instant you need them.",
      tint: "color-mix(in oklab, var(--color-primary) 30%, transparent)",
    },
    {
      icon: <Lock className="h-[18px] w-[18px]" style={{ color: "var(--color-primary)" }} strokeWidth={2.2} />,
      title: "Private",
      description: "Every secret is encrypted on your device.",
      tint: "color-mix(in oklab, var(--color-accent) 30%, transparent)",
    },
    {
      icon: <RefreshCw className="h-[18px] w-[18px]" style={{ color: "var(--color-primary)" }} strokeWidth={2.2} />,
      title: "Reliable",
      description: "Works offline. Never miss a code.",
      tint: "color-mix(in oklab, var(--color-success) 28%, transparent)",
    },
  ];
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 pt-2">
        <Headline
          eyebrow={<Eyebrow>Why Aegis</Eyebrow>}
          title={<>Calm, everyday <br /> security.</>}
          compact
        />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2.5 px-5 py-4">
        {items.map((it, i) => (
          <FeatureCard key={it.title} index={`0${i + 1}`} {...it} delay={0.12 + i * 0.09} />
        ))}
      </div>
      <div className="shrink-0 px-5 pt-1">
        <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen 3 — Import                                                  */
/* ------------------------------------------------------------------ */

function PhoneMockup() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto flex items-center justify-center">
      <motion.div
        aria-hidden
        className="absolute h-[220px] w-[170px] rounded-[50px]"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--color-primary) 24%, transparent), transparent 70%)",
          filter: "blur(34px)",
        }}
        animate={reduce ? undefined : { opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        initial={{ y: 16, opacity: 0, rotateX: -6 }}
        animate={{ y: 0, opacity: 1, rotateX: 0 }}
        transition={{ ...spring, delay: 0.1 }}
        className="relative h-[200px] w-[112px] rounded-[30px] p-[3px]"
        style={{
          background: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)",
          boxShadow:
            "0 24px 46px -18px rgba(15,23,42,0.5), 0 6px 16px -6px rgba(15,23,42,0.25), 0 0 0 1px rgba(255,255,255,0.06) inset",
        }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[27px] bg-white">
          <div className="absolute left-1/2 top-1.5 h-3 w-12 -translate-x-1/2 rounded-full bg-[#0F172A]" />
          <div className="flex h-full flex-col items-center justify-center gap-2 px-3 pt-5">
            <div
              className="relative flex h-[90px] w-[90px] items-center justify-center rounded-xl"
              style={{
                background: "#F8F9FB",
                boxShadow: "0 0 0 1px rgba(15,23,42,0.06) inset",
              }}
            >
              <QrCode className="h-16 w-16 text-foreground/90" strokeWidth={1.4} />
              <motion.div
                aria-hidden
                className="absolute inset-x-2 h-[2px] rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, var(--color-primary), transparent)",
                  boxShadow: "0 0 12px color-mix(in oklab, var(--color-primary) 70%, transparent)",
                }}
                animate={reduce ? undefined : { top: ["10%", "88%", "10%"] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
              {[
                "top-1 left-1 border-l-2 border-t-2 rounded-tl-md",
                "top-1 right-1 border-r-2 border-t-2 rounded-tr-md",
                "bottom-1 left-1 border-l-2 border-b-2 rounded-bl-md",
                "bottom-1 right-1 border-r-2 border-b-2 rounded-br-md",
              ].map((c) => (
                <span
                  key={c}
                  className={`absolute h-3 w-3 ${c}`}
                  style={{ borderColor: "var(--color-primary)" }}
                />
              ))}
            </div>
            <p className="text-[9.5px] font-semibold text-foreground">Scanning…</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function OptionRow({
  icon,
  label,
  hint,
  onClick,
  delay,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  onClick?: () => void;
  delay: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay }}
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -1 }}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[18px] bg-white/85 px-3.5 py-2.5 text-left backdrop-blur-xl"
      style={{
        boxShadow:
          "0 1px 0 0 rgba(255,255,255,0.9) inset, 0 0 0 1px rgba(15,23,42,0.05), 0 8px 20px -16px rgba(15,23,42,0.22)",
      }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--color-primary) 14%, white), color-mix(in oklab, var(--color-primary) 6%, white))",
        }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">{label}</p>
        <p className="truncate text-[11.5px] text-muted-foreground">{hint}</p>
      </div>
      <ArrowRight className="h-[15px] w-[15px] shrink-0 text-muted-foreground/70" strokeWidth={2.2} />
    </motion.button>
  );
}

function ScreenImport({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5">
        <PhoneMockup />
        <Headline title={<>Import in seconds.</>} subtitle="Bring existing accounts into Aegis your way." compact />
        <div className="mt-1 flex w-full max-w-sm flex-col gap-2">
          <OptionRow
            icon={<QrCode className="h-[17px] w-[17px]" style={{ color: "var(--color-primary)" }} strokeWidth={2.2} />}
            label="Scan QR"
            hint="Point your camera at a code"
            delay={0.18}
            onClick={onNext}
          />
          <OptionRow
            icon={<Upload className="h-[17px] w-[17px]" style={{ color: "var(--color-primary)" }} strokeWidth={2.2} />}
            label="Import Backup"
            hint="Restore from an encrypted file"
            delay={0.26}
            onClick={onNext}
          />
          <OptionRow
            icon={<KeyRound className="h-[17px] w-[17px]" style={{ color: "var(--color-primary)" }} strokeWidth={2.2} />}
            label="Manual Setup"
            hint="Enter a setup key by hand"
            delay={0.34}
            onClick={onNext}
          />
        </div>
      </div>
      <div className="shrink-0 px-5 pt-2">
        <SecondaryButton onClick={onNext}>Skip for now</SecondaryButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen 4 — Backup                                                  */
/* ------------------------------------------------------------------ */

function NativeSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-[28px] w-[46px] rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      style={{
        backgroundColor: checked
          ? "var(--color-success)"
          : "color-mix(in oklab, var(--color-foreground) 14%, transparent)",
      }}
    >
      <motion.span
        layout
        transition={spring}
        className="absolute top-[2px] h-[24px] w-[24px] rounded-full bg-white"
        style={{
          left: checked ? 20 : 2,
          boxShadow: "0 3px 8px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)",
        }}
      />
    </button>
  );
}

function CloudVaultArt() {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex h-[170px] items-center justify-center">
      <motion.div
        aria-hidden
        className="absolute h-56 w-56 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--color-primary) 22%, transparent), transparent 70%)",
          filter: "blur(28px)",
        }}
        animate={reduce ? undefined : { scale: [1, 1.06, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      {[
        { x: -66, y: -42, d: 0 },
        { x: 66, y: -34, d: 0.4 },
        { x: -58, y: 48, d: 0.8 },
        { x: 68, y: 46, d: 1.2 },
      ].map((p, i) => (
        <motion.div
          key={i}
          aria-hidden
          className="absolute flex h-7 w-7 items-center justify-center rounded-[10px] bg-white"
          style={{
            x: p.x,
            y: p.y,
            boxShadow: "0 0 0 1px rgba(15,23,42,0.05), 0 6px 14px -8px rgba(15,23,42,0.25)",
          }}
          animate={reduce ? undefined : { y: [p.y - 3, p.y + 3, p.y - 3] }}
          transition={{ duration: 4 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: p.d }}
        >
          <Lock className="h-[13px] w-[13px]" strokeWidth={2.2} style={{ color: "var(--color-primary)" }} />
        </motion.div>
      ))}
      <ArtFrame size={108}>
        <CloudUpload className="h-[52px] w-[52px]" strokeWidth={1.5} style={{ color: "var(--color-primary)" }} />
        <motion.div
          aria-hidden
          className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white"
          style={{
            boxShadow: "0 0 0 1px rgba(15,23,42,0.05), 0 6px 14px -6px rgba(34,197,94,0.5)",
          }}
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...spring, delay: 0.35 }}
        >
          <Check className="h-[14px] w-[14px]" strokeWidth={3} style={{ color: "var(--color-success)" }} />
        </motion.div>
      </ArtFrame>
    </div>
  );
}

function ScreenBackup({ onNext }: { onNext: () => void }) {
  const [enabled, setEnabled] = useState(true);
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5">
        <CloudVaultArt />
        <Headline
          eyebrow={<Eyebrow>End-to-end encrypted</Eyebrow>}
          title={<>Backup, only for you.</>}
          subtitle="Your vault is encrypted on your device. No one else can read it."
          compact
        />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.22 }}
          className="flex w-full max-w-sm items-center justify-between rounded-[18px] bg-white/85 px-4 py-3 backdrop-blur-xl"
          style={{
            boxShadow:
              "0 1px 0 0 rgba(255,255,255,0.9) inset, 0 0 0 1px rgba(15,23,42,0.05), 0 12px 28px -20px rgba(15,23,42,0.22)",
          }}
        >
          <div className="min-w-0 pr-3">
            <p className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
              Automatic Backup
            </p>
            <p className="text-[11.5px] leading-snug text-muted-foreground">
              Keep your accounts safely synced.
            </p>
          </div>
          <NativeSwitch checked={enabled} onChange={setEnabled} />
        </motion.div>
      </div>
      <div className="shrink-0 px-5 pt-2">
        <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen 5 — Notifications                                           */
/* ------------------------------------------------------------------ */

function BellArt() {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex h-[180px] items-center justify-center">
      <motion.div
        aria-hidden
        className="absolute h-56 w-56 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--color-primary) 22%, transparent), transparent 70%)",
          filter: "blur(28px)",
        }}
        animate={reduce ? undefined : { scale: [1, 1.06, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute rounded-full border"
          style={{
            width: 130 + i * 34,
            height: 130 + i * 34,
            borderColor: "color-mix(in oklab, var(--color-primary) 20%, transparent)",
          }}
          animate={reduce ? undefined : { scale: [0.9, 1.06, 0.9], opacity: [0.1, 0.55, 0.1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
        />
      ))}
      <ArtFrame size={108}>
        <motion.div
          animate={reduce ? undefined : { rotate: [0, -14, 14, -8, 8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
          style={{ transformOrigin: "50% 22%" }}
        >
          <Bell className="h-[52px] w-[52px]" strokeWidth={1.5} style={{ color: "var(--color-primary)" }} />
        </motion.div>
        <motion.span
          aria-hidden
          className="absolute right-6 top-6 flex h-3 w-3 items-center justify-center rounded-full"
          style={{ background: "var(--color-destructive)" }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...spring, delay: 0.5 }}
        />
      </ArtFrame>
    </div>
  );
}

function ScreenNotifications({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5">
        <BellArt />
        <Headline
          title={<>Stay in the loop.</>}
          subtitle="Gentle reminders for backups and important security updates. Nothing noisy."
          compact
        />
      </div>
      <div className="shrink-0 space-y-0.5 px-5 pt-2">
        <PrimaryButton onClick={onNext}>Allow Notifications</PrimaryButton>
        <SecondaryButton onClick={onNext}>Maybe Later</SecondaryButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen 6 — Biometrics                                              */
/* ------------------------------------------------------------------ */

function FingerprintArt() {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex h-[200px] items-center justify-center">
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute rounded-full border"
          style={{
            width: 130 + i * 34,
            height: 130 + i * 34,
            borderColor: `color-mix(in oklab, var(--color-primary) ${18 - i * 3}%, transparent)`,
          }}
          animate={reduce ? undefined : { scale: [0.92, 1.06, 0.92], opacity: [0.15, 0.7, 0.15] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.35 }}
        />
      ))}
      <ArtFrame size={112}>
        <motion.div
          animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Fingerprint className="h-[58px] w-[58px]" strokeWidth={1.3} style={{ color: "var(--color-primary)" }} />
        </motion.div>
      </ArtFrame>
    </div>
  );
}

function ScreenBiometrics({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5">
        <FingerprintArt />
        <Headline
          title={<>Unlock with a touch.</>}
          subtitle="Use Face ID or your fingerprint to open Aegis instantly."
          compact
        />
      </div>
      <div className="shrink-0 space-y-0.5 px-5 pt-2">
        <PrimaryButton onClick={onNext}>Enable Biometrics</PrimaryButton>
        <SecondaryButton onClick={onNext}>Not now</SecondaryButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Final                                                              */
/* ------------------------------------------------------------------ */

function Confetti() {
  const reduce = useReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 300,
        delay: Math.random() * 0.5,
        rot: Math.random() * 200,
        color:
          i % 3 === 0
            ? "var(--color-primary)"
            : i % 3 === 1
              ? "var(--color-success)"
              : "color-mix(in oklab, var(--color-accent) 80%, white)",
      })),
    [],
  );
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-[40%] h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: p.color }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            x: p.x,
            y: 240 + Math.random() * 120,
            scale: [0, 1, 0.6],
            rotate: p.rot,
          }}
          transition={{ duration: 1.9, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function BigShield() {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex h-[200px] items-center justify-center">
      <motion.div
        aria-hidden
        className="absolute h-64 w-64 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--color-success) 24%, transparent), transparent 70%)",
          filter: "blur(32px)",
        }}
        animate={reduce ? undefined : { scale: [1, 1.06, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <ArtFrame size={124}>
        <Shield className="h-[64px] w-[64px]" strokeWidth={1.4} style={{ color: "var(--color-primary)" }} />
        <motion.div
          aria-hidden
          className="absolute -bottom-1.5 -right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-white"
          style={{
            boxShadow: "0 0 0 1px rgba(15,23,42,0.05), 0 8px 20px -6px rgba(34,197,94,0.5)",
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...spring, delay: 0.4 }}
        >
          <Check className="h-[18px] w-[18px]" strokeWidth={3} style={{ color: "var(--color-success)" }} />
        </motion.div>
      </ArtFrame>
    </div>
  );
}

function ScreenFinal({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="relative flex h-full flex-col">
      <Confetti />
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5">
        <BigShield />
        <Headline
          eyebrow={<Eyebrow>All set</Eyebrow>}
          title={<>You're protected.</>}
          subtitle="Your authenticator is ready. Welcome to a quieter kind of security."
          compact
        />
      </div>
      <div className="shrink-0 space-y-0.5 px-5 pt-2">
        <PrimaryButton onClick={onRestart} icon={<Sparkles className="h-[17px] w-[17px]" />}>
          Get Started
        </PrimaryButton>
        <SecondaryButton onClick={onRestart}>Explore Settings</SecondaryButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

const screens = [
  "hero",
  "why",
  "import",
  "backup",
  "notifications",
  "biometrics",
  "final",
] as const;

const skippable = new Set(["import", "backup", "notifications", "biometrics"]);

const pageVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 30 : -30, filter: "blur(10px)" }),
  center: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -30 : 30, filter: "blur(10px)" }),
};

export default function Onboarding() {
  const [[step, dir], setStep] = useState<[number, number]>([0, 1]);
  const total = screens.length;

  const goTo = (target: number) => {
    const bounded = Math.max(0, Math.min(target, total - 1));
    setStep(([current]) => [bounded, bounded > current ? 1 : -1]);
  };
  const next = () => goTo(step + 1);
  const back = () => goTo(step - 1);
  const restart = () => setStep([0, -1]);

  const current = screens[step];

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 60;
    if (info.offset.x < -threshold && step < total - 1) next();
    else if (info.offset.x > threshold && step > 0) back();
  };

  const screenNode = (() => {
    switch (current) {
      case "hero":
        return <ScreenHero onNext={next} />;
      case "why":
        return <ScreenWhy onNext={next} />;
      case "import":
        return <ScreenImport onNext={next} />;
      case "backup":
        return <ScreenBackup onNext={next} />;
      case "notifications":
        return <ScreenNotifications onNext={next} />;
      case "biometrics":
        return <ScreenBiometrics onNext={next} />;
      case "final":
        return <ScreenFinal onRestart={restart} />;
    }
  })();

  return (
    <main
      className="fixed inset-0 overflow-hidden font-sans text-foreground antialiased"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <AmbientBackground />
      <div className="relative z-10 mx-auto flex h-full w-full max-w-[440px] flex-col px-2 pb-3">
        <TopBar
          step={step}
          total={total}
          onBack={back}
          onSkip={next}
          canSkip={skippable.has(current)}
        />
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              custom={dir}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ ...softSpring, filter: { duration: 0.35 } }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={onDragEnd}
              className="flex flex-1 flex-col"
            >
              {screenNode}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
