import Link from "next/link";

type LogoSize = "sm" | "md" | "lg";

const SIZES: Record<LogoSize, { mark: string; text: string; gap: string }> = {
  sm: { mark: "h-6", text: "text-xl", gap: "gap-1.5" },
  md: { mark: "h-8", text: "text-[1.75rem]", gap: "gap-2" },
  lg: { mark: "h-10", text: "text-4xl", gap: "gap-2.5" },
};

type LogoVariant = "light" | "onDark";

type LogoProps = {
  /** Visual size of the lockup. Defaults to "md". */
  size?: LogoSize;
  /**
   * Color treatment. "light" (default) is for light backgrounds (ink + green).
   * "onDark" is for dark/colored backgrounds: white mark + near-white wordmark.
   */
  variant?: LogoVariant;
  /** When provided, the lockup is wrapped in a link to this href (e.g. "/"). */
  href?: string;
  /** Extra classes appended to the lockup wrapper. */
  className?: string;
};

/**
 * The single source of truth for the ProofClean logo lockup: the brand mark
 * (from /public/brand/proofclean_mark_onlight.svg) followed by the "ProofClean"
 * wordmark rendered as real text ("Proof" in ink, "Clean" in brand green).
 *
 * Designed for LIGHT backgrounds only — the ink text and green mark are not
 * legible on dark/colored surfaces.
 */
export default function Logo({
  size = "md",
  variant = "light",
  href,
  className = "",
}: LogoProps) {
  const s = SIZES[size];
  const onDark = variant === "onDark";
  const markSrc = onDark
    ? "/brand/proofclean_mark_white.svg"
    : "/brand/proofclean_mark_onlight.svg";

  const lockup = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static brand SVG */}
      <img
        src={markSrc}
        alt=""
        aria-hidden="true"
        className={`${s.mark} w-auto shrink-0`}
      />
      <span
        className={`font-[family-name:var(--font-geist-sans)] font-bold leading-none tracking-tight ${s.text}`}
      >
        {onDark ? (
          <>
            <span className="text-[#f7fafa]">Proof</span>
            <span className="text-[#f7fafa]">Clean</span>
          </>
        ) : (
          <>
            <span className="text-[#0f172a]">Proof</span>
            <span className="text-[#10b981]">Clean</span>
          </>
        )}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label="ProofClean"
        className={`inline-flex items-center ${s.gap} transition hover:opacity-80 ${className}`}
      >
        {lockup}
      </Link>
    );
  }

  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>{lockup}</span>
  );
}
