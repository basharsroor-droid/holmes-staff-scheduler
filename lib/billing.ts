import { LAUNCH_OFFER, getPlan, type PlanId } from "./plans.ts";

export type BillingPeriod = "monthly" | "annual";
export type BillingProviderKey = "grow" | "cardcom" | "tranzila" | "payplus" | "hyp";

export type BillingProviderConfig = {
  provider: BillingProviderKey;
  enabled: boolean;
};

export type CheckoutRequest = {
  organizationId: string;
  planId: PlanId;
  period: BillingPeriod;
  customerEmail: string;
  customerName?: string;
};

export type CheckoutResult = {
  provider: BillingProviderKey;
  checkoutUrl?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
};

export type ProviderWebhookEvent = {
  providerEventId: string;
  eventType: string;
  organizationId?: string;
  occurredAt?: string;
  payload: unknown;
};

/**
 * Minimal contract every future payment provider adapter must satisfy.
 * No implementation exists yet: billing remains disabled until a provider is
 * explicitly selected and configured.
 */
export interface BillingGateway {
  readonly provider: BillingProviderKey;
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  cancelSubscription(providerSubscriptionId: string, atPeriodEnd: boolean): Promise<void>;
  parseWebhook(rawBody: string, signature: string | null): Promise<ProviderWebhookEvent>;
}

export type InvoiceQuoteInput = {
  planId: PlanId;
  period: BillingPeriod;
  /** 1-based invoice number after the trial. */
  paidInvoiceNumber: number;
  /** Workspace creation date in ISO format. */
  workspaceCreatedAt: string;
};

export type InvoiceQuote = {
  amountIls: number | null;
  listAmountIls: number | null;
  discountPercent: number;
  launchOfferApplied: boolean;
};

function endOfOfferUtc(): number {
  return Date.parse(`${LAUNCH_OFFER.endsOn}T23:59:59.999Z`);
}

export function isLaunchOfferEligible(workspaceCreatedAt: string, period: BillingPeriod): boolean {
  if (period !== LAUNCH_OFFER.billing) return false;
  const createdAt = Date.parse(workspaceCreatedAt);
  return Number.isFinite(createdAt) && createdAt <= endOfOfferUtc();
}

/**
 * Provider-neutral invoice quote. The payment gateway should receive the final
 * amount from this layer rather than owning ShiftPilot's pricing rules.
 */
export function quoteInvoice(input: InvoiceQuoteInput): InvoiceQuote {
  if (!Number.isInteger(input.paidInvoiceNumber) || input.paidInvoiceNumber < 1) {
    throw new Error("paidInvoiceNumber must be a positive integer");
  }

  const plan = getPlan(input.planId);
  const listAmountIls = input.period === "monthly" ? plan.monthlyIls : plan.annualIls;

  if (listAmountIls === null) {
    return {
      amountIls: null,
      listAmountIls: null,
      discountPercent: 0,
      launchOfferApplied: false
    };
  }

  const launchOfferApplied =
    isLaunchOfferEligible(input.workspaceCreatedAt, input.period) &&
    input.paidInvoiceNumber <= LAUNCH_OFFER.months;

  if (!launchOfferApplied) {
    return {
      amountIls: listAmountIls,
      listAmountIls,
      discountPercent: 0,
      launchOfferApplied: false
    };
  }

  return {
    amountIls: Math.round((listAmountIls * (100 - LAUNCH_OFFER.discountPercent)) / 100),
    listAmountIls,
    discountPercent: LAUNCH_OFFER.discountPercent,
    launchOfferApplied: true
  };
}

/**
 * Billing is intentionally off until a provider is connected. This parser
 * prevents accidental activation from a typo while keeping provider selection
 * in one place when we are ready.
 */
export function resolveBillingProvider(value: string | undefined): BillingProviderConfig {
  if (!value || value === "disabled") return { provider: "grow", enabled: false };

  const providers: BillingProviderKey[] = ["grow", "cardcom", "tranzila", "payplus", "hyp"];
  if (!providers.includes(value as BillingProviderKey)) {
    throw new Error(`Unsupported billing provider: ${value}`);
  }

  return { provider: value as BillingProviderKey, enabled: true };
}
