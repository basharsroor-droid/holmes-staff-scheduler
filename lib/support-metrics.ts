// Track P1-08 (support operations plan): "first response time, resolution
// time, reopen rate" for the support console. Pure function so the
// aggregation logic can be reasoned about (and tested) independent of the
// server component that fetches the tickets.
//
// Known imprecision, stated rather than hidden: resolved_at is nulled the
// moment a ticket is reopened (see the DB trigger), so avgResolutionHours
// only reflects tickets currently sitting in resolved/closed -- a ticket
// that was resolved, reopened, and is still open contributes to
// reopenRate but not to avgResolutionHours. reopenRate itself is measured
// against ALL tickets, not just ones that were ever resolved, since the
// schema doesn't separately track "was resolved at least once" once
// resolved_at is cleared.
export type MetricsTicket = {
  created_at: string;
  first_responded_at: string | null;
  resolved_at: string | null;
  reopened_count: number;
};

export type SupportMetrics = {
  totalTickets: number;
  respondedCount: number;
  resolvedCount: number;
  reopenedCount: number;
  avgFirstResponseHours: number | null;
  avgResolutionHours: number | null;
  reopenRatePercent: number | null;
};

function hoursBetween(startIso: string, endIso: string) {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / (1000 * 60 * 60);
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function computeSupportMetrics(tickets: MetricsTicket[]): SupportMetrics {
  const responseHours = tickets
    .filter((ticket) => ticket.first_responded_at)
    .map((ticket) => hoursBetween(ticket.created_at, ticket.first_responded_at as string));
  const resolutionHours = tickets
    .filter((ticket) => ticket.resolved_at)
    .map((ticket) => hoursBetween(ticket.created_at, ticket.resolved_at as string));
  const reopenedCount = tickets.filter((ticket) => ticket.reopened_count > 0).length;

  return {
    totalTickets: tickets.length,
    respondedCount: responseHours.length,
    resolvedCount: resolutionHours.length,
    reopenedCount,
    avgFirstResponseHours: average(responseHours),
    avgResolutionHours: average(resolutionHours),
    reopenRatePercent: tickets.length ? (reopenedCount / tickets.length) * 100 : null
  };
}
