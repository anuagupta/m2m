const assert = require('assert');
const { PLAN_PRICE_PAISE, PLAN_DURATION_MS, extendEntitlement } = require('../api/_subscription');

assert.deepStrictEqual(PLAN_PRICE_PAISE, { monthly: 4900, semiannual: 27900, yearly: 49900 });
assert(PLAN_DURATION_MS.monthly < PLAN_DURATION_MS.semiannual);
assert(PLAN_DURATION_MS.semiannual < PLAN_DURATION_MS.yearly);
const before = Date.now();
const expiry = extendEntitlement(null, 'semiannual');
assert(expiry >= before + PLAN_DURATION_MS.semiannual);
assert(expiry <= Date.now() + PLAN_DURATION_MS.semiannual);
console.log('Validated monthly, six-month and yearly prices and entitlement durations.');
