import Link from "next/link";

export function BrandLogo({ href, compact = false, light = false, className = "" }: { href?: string; compact?: boolean; light?: boolean; className?: string }) {
  const logo = <span className={`shiftpilot-logo original ${compact ? "compact" : ""} ${light ? "light" : ""} ${className}`}>
    <img src="/shiftpilot-logo.png" alt="ShiftPilot — The easy way to your next shift" />
  </span>;
  return href ? <Link href={href} className="shiftpilot-logo-link" aria-label="ShiftPilot">{logo}</Link> : logo;
}
