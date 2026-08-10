import Link from "next/link";
import Image from "next/image";

export function BrandLogo({ href, compact = false, light = false, className = "" }: { href?: string; compact?: boolean; light?: boolean; className?: string }) {
  const logo = <span className={`shiftpilot-logo original ${compact ? "compact" : ""} ${light ? "light" : ""} ${className}`}>
    <Image
      src={compact ? "/shiftpilot-icon.png" : "/shiftpilot-logo.png"}
      alt={compact ? "ShiftPilot" : "ShiftPilot — Your Shifts, Our Mission"}
      width={compact ? 255 : 630}
      height={179}
      priority
    />
  </span>;
  return href ? <Link href={href} className="shiftpilot-logo-link" aria-label="ShiftPilot">{logo}</Link> : logo;
}
