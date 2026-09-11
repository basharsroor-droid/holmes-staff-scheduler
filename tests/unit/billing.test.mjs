import { test } from "node:test";
import assert from "node:assert/strict";

const billing = await import(new URL("../../lib/billing.ts", import.meta.url));
const { isLaunchOfferEligible, quoteInvoice, resolveBillingProvider } = billing;

test("launch offer applies only to eligible monthly workspaces", () => {
  assert.equal(isLaunchOfferEligible("2026-12-31T12:00:00Z", "monthly"), true);
  assert.equal(isLaunchOfferEligible("2027-01-01T00:00:00Z", "monthly"), false);
  assert.equal(isLaunchOfferEligible("2026-09-11T00:00:00Z", "annual"), false);
  assert.equal(isLaunchOfferEligible("not-a-date", "monthly"), false);
});

test("business monthly quote gives 25% off the first three paid invoices", () => {
  const base = {
    planId: "business",
    period: "monthly",
    workspaceCreatedAt: "2026-09-11T08:00:00Z"
  };

  assert.deepEqual(quoteInvoice({ ...base, paidInvoiceNumber: 1 }), {
    amountIls: 134,
    listAmountIls: 179,
    discountPercent: 25,
    launchOfferApplied: true
  });
  assert.equal(quoteInvoice({ ...base, paidInvoiceNumber: 3 }).amountIls, 134);
  assert.deepEqual(quoteInvoice({ ...base, paidInvoiceNumber: 4 }), {
    amountIls: 179,
    listAmountIls: 179,
    discountPercent: 0,
    launchOfferApplied: false
  });
});

test("annual billing never stacks the launch offer", () => {
  assert.deepEqual(
    quoteInvoice({
      planId: "business",
      period: "annual",
      paidInvoiceNumber: 1,
      workspaceCreatedAt: "2026-09-11T08:00:00Z"
    }),
    {
      amountIls: 1790,
      listAmountIls: 1790,
      discountPercent: 0,
      launchOfferApplied: false
    }
  );
});

test("enterprise remains custom quote", () => {
  assert.deepEqual(
    quoteInvoice({
      planId: "enterprise",
      period: "monthly",
      paidInvoiceNumber: 1,
      workspaceCreatedAt: "2026-09-11T08:00:00Z"
    }),
    {
      amountIls: null,
      listAmountIls: null,
      discountPercent: 0,
      launchOfferApplied: false
    }
  );
});

test("billing provider stays disabled by default", () => {
  assert.deepEqual(resolveBillingProvider(undefined), { provider: "grow", enabled: false });
  assert.deepEqual(resolveBillingProvider("disabled"), { provider: "grow", enabled: false });
  assert.deepEqual(resolveBillingProvider("grow"), { provider: "grow", enabled: true });
  assert.throws(() => resolveBillingProvider("stripe"), /Unsupported billing provider/);
});

test("quote rejects invalid invoice numbers", () => {
  assert.throws(
    () =>
      quoteInvoice({
        planId: "business",
        period: "monthly",
        paidInvoiceNumber: 0,
        workspaceCreatedAt: "2026-09-11T08:00:00Z"
      }),
    /positive integer/
  );
});
