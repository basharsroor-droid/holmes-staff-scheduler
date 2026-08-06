import Link from "next/link";

export function BrandLogo({ href, compact = false, light = false, className = "" }: { href?: string; compact?: boolean; light?: boolean; className?: string }) {
  const logo = <span className={`shiftpilot-logo ${compact ? "compact" : ""} ${light ? "light" : ""} ${className}`}>
    <svg aria-hidden="true" viewBox="0 0 66 48" role="img">
      <defs><linearGradient id="sp-gradient" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#22b4ff" /><stop offset="1" stopColor="#6d45ff" /></linearGradient></defs>
      <path d="M8 25c10-12 26-18 44-16-11 3-20 8-27 14l11 1 17-12-9 28-6-10-12 3C18 35 11 32 8 25Z" fill="url(#sp-gradient)" />
      <path d="M8 39c15 6 34 5 49-5" fill="none" stroke="url(#sp-gradient)" strokeLinecap="round" strokeWidth="3" />
    </svg>
    {!compact ? <span className="shiftpilot-wordmark"><strong>Shift</strong><b>Pilot</b><small>SMARTER SHIFTS · BETTER TEAMS</small></span> : null}
  </span>;
  return href ? <Link href={href} className="shiftpilot-logo-link" aria-label="ShiftPilot">{logo}</Link> : logo;
}
