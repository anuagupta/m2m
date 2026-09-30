// Shared plan pricing/duration for every subscription tier, so
// create-order, verify-payment and the webhook can't drift apart on what
// an order actually buys.
const DAY_MS = 24 * 60 * 60 * 1000;

const PLAN_PRICE_PAISE = { monthly: 4900, semiannual: 27900, yearly: 49900 };
const PLAN_DURATION_MS = { monthly: 30 * DAY_MS, semiannual: 182 * DAY_MS, yearly: 365 * DAY_MS };

// A renewal (or a plan bought again after lapsing) extends from whichever
// is later: now, or the account's current expiry if it hasn't lapsed yet -
// so paying early never shortens time already paid for.
function extendEntitlement(currentEntitledUntil, plan) {
  const now = Date.now();
  const base = currentEntitledUntil && currentEntitledUntil > now ? currentEntitledUntil : now;
  return base + PLAN_DURATION_MS[plan];
}

// A subscription is active only while entitled is true AND (it has no
// expiry - a lifetime promo grant - OR that expiry hasn't passed).
function isActive(user) {
  return !!user && user.entitled === true && (!user.entitledUntil || user.entitledUntil > Date.now());
}

module.exports = { PLAN_PRICE_PAISE, PLAN_DURATION_MS, extendEntitlement, isActive };
