import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// I2 in docs/REMEDIATION_PLAN.md: one empty state for every /workspace screen.
// Seventeen files hand-wrote the same markup; this renders exactly that
// markup (the .empty-template-state box, icon, heading, sentence), so the
// look and the class tests and styles rely on are unchanged.
//
// The icon is decorative -- the heading and sentence carry the meaning -- so
// it is hidden from screen readers.
export function EmptyState({
  icon: Icon,
  iconSize = 40,
  title,
  headingLevel = 2,
  description,
  className = "",
  children
}: {
  icon?: LucideIcon;
  iconSize?: number;
  title?: ReactNode;
  headingLevel?: 2 | 3;
  description?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <div className={className ? `empty-template-state ${className}` : "empty-template-state"}>
      {Icon ? <Icon size={iconSize} aria-hidden="true" /> : null}
      {title ? <Heading>{title}</Heading> : null}
      {description ? <p>{description}</p> : null}
      {children}
    </div>
  );
}
