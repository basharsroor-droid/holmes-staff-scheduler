import Link from "next/link";

export function BrandLogo({ href, compact = false, light = false, className = "" }: { href?: string; compact?: boolean; light?: boolean; className?: string }) {
  const logo = <span className={`shiftpilot-logo original ${compact ? "compact" : ""} ${light ? "light" : ""} ${className}`}>
    <img src={compact ? "/shiftpilot-icon.png" : "/shiftpilot-logo.png"} alt={compact ? "ShiftPilot" : "ShiftPilot — Your Shifts, Our Mission"} />
  </span>;
  return href ? <Link href={href} className="shiftpilot-logo-link" aria-label="ShiftPilot">{logo}</Link> : logo;
}
