import { FeedbackEntry, Order, Store } from '../types/campuscart';

export interface UnitEconomicsInput {
  serviceFee: number;
  variableCost: number;
  monthlyFixedCost: number;
  monthlyCustomers: number;
  purchasesPerCustomer: number;
}

export interface UnitEconomicsOutput {
  serviceFee: number;
  variableCost: number;
  contributionPerTxn: number;
  contributionMarginPct: number;
  expectedMonthlyTransactions: number;
  expectedMonthlyRevenue: number;
  expectedMonthlyContribution: number;
  expectedMonthlySurplus: number;
  breakEvenTransactions: number | null;
  breakEvenCustomers: number | null;
}

export function calculateUnitEconomics(input: UnitEconomicsInput): UnitEconomicsOutput {
  const serviceFee = Math.max(0, input.serviceFee);
  const variableCost = Math.max(0, input.variableCost);
  const monthlyFixedCost = Math.max(0, input.monthlyFixedCost);
  const monthlyCustomers = Math.max(0, Math.floor(input.monthlyCustomers));
  const purchasesPerCustomer = Math.max(0, input.purchasesPerCustomer);

  const contributionPerTxn = Math.round((serviceFee - variableCost) * 100) / 100;
  const contributionMarginPct =
    serviceFee > 0 ? Math.round((contributionPerTxn / serviceFee) * 1000) / 10 : 0;

  const expectedMonthlyTransactions = Math.round(monthlyCustomers * purchasesPerCustomer);
  const expectedMonthlyRevenue = Math.round(expectedMonthlyTransactions * serviceFee);
  const expectedMonthlyContribution = Math.round(expectedMonthlyTransactions * contributionPerTxn);
  const expectedMonthlySurplus = Math.round(expectedMonthlyContribution - monthlyFixedCost);

  const breakEvenTransactions =
    contributionPerTxn > 0 ? Math.ceil(monthlyFixedCost / contributionPerTxn) : null;
  const breakEvenCustomers =
    breakEvenTransactions !== null && purchasesPerCustomer > 0
      ? Math.ceil(breakEvenTransactions / purchasesPerCustomer)
      : null;

  return {
    serviceFee,
    variableCost,
    contributionPerTxn,
    contributionMarginPct,
    expectedMonthlyTransactions,
    expectedMonthlyRevenue,
    expectedMonthlyContribution,
    expectedMonthlySurplus,
    breakEvenTransactions,
    breakEvenCustomers,
  };
}

export interface VentureScenario {
  id: 'conservative' | 'base' | 'ambitious';
  label: string;
  monthlyCustomers: number;
  purchasesPerCustomer: number;
  assumptions: string;
}

export const VENTURE_SCENARIOS: VentureScenario[] = [
  {
    id: 'conservative',
    label: 'Conservative',
    monthlyCustomers: 40,
    purchasesPerCustomer: 2,
    assumptions:
      'Initial adoption is slow due to limited brand awareness; students may hesitate on delivery charges and growth relies on word-of-mouth.',
  },
  {
    id: 'base',
    label: 'Base Pilot Plan',
    monthlyCustomers: 100,
    purchasesPerCustomer: 4,
    assumptions:
      'CampusCart acquires 100 Selaqui hostel and PG students via campus promotions, WhatsApp groups, student ambassadors, and local retailer partnerships.',
  },
  {
    id: 'ambitious',
    label: 'Ambitious',
    monthlyCustomers: 200,
    purchasesPerCustomer: 5,
    assumptions:
      'Strong student referrals, repeat purchases, customized essential bundles, and multiple retailer partnerships expand adoption across nearby hostels and PGs.',
  },
];

export const MARKET_SIZE_ASSUMPTIONS = [
  {
    level: 'TAM (Total Addressable Market)',
    customerCount: '10,000 students',
    annualValueInr: '₹4,80,00,000',
    source:
      'Estimated 10,000 college students living in hostels and PG accommodations across broader Dehradun (preliminary assumption requiring institutional validation).',
  },
  {
    level: 'SAM (Serviceable Available Market)',
    customerCount: '2,000 students (20% of TAM)',
    annualValueInr: '₹96,00,000',
    source:
      'Estimated 2,000 students in hostels and PGs around DGU Campus and Selaqui serviceable via nearby local retailers.',
  },
  {
    level: 'SOM (Serviceable Obtainable Market)',
    customerCount: '100 students (5% of SAM)',
    annualValueInr: '₹4,80,000',
    source:
      'Target 100 paying customers in the first 12 months via DGU campus activation, referrals, and local retailer collaboration.',
  },
];

export const LAUNCH_PLAN_30_DAYS = [
  {
    week: 'Week 1 — Prepare',
    target: 'Survey 50 students & onboard 3 local retailers',
    actions:
      'Conduct student surveys, identify Selaqui retailers, build product catalogue, configure WhatsApp ordering, and prepare campus posters.',
    learningQuestion:
      'Do students experience this problem frequently, and are they interested in using CampusCart?',
  },
  {
    week: 'Week 2 — Launch',
    target: 'Reach 200 students & acquire first 20 paying customers',
    actions:
      'Launch basic WhatsApp-based ordering for daily essentials and promote across DGU hostel and PG WhatsApp groups.',
    learningQuestion: 'Will students actually place paid orders instead of simply showing interest?',
  },
  {
    week: 'Week 3 — Measure',
    target: '30 additional paying customers & track repeat purchases',
    actions:
      'Collect customer feedback, monitor manual retailer fulfilment, measure delivery cost, and test student referrals.',
    learningQuestion: 'Are customers satisfied with the service, pricing, and delivery experience?',
  },
  {
    week: 'Week 4 — Learn & Adjust',
    target: '75 cumulative paying customers & 3 improvement areas',
    actions:
      'Analyze feedback, identify popular SKUs and bundles, refine ₹20 service fee hypothesis, and optimize retailer operations.',
    learningQuestion:
      'Which customer segment, product category, and channel generate the most sustainable demand?',
  },
];

export const KEY_PILOT_ASSUMPTIONS = [
  {
    id: 'assumption-1',
    title: 'Willingness to pay ₹20 delivery/service fee',
    hypothesis:
      'Hostel and PG students in Selaqui are willing to pay ₹20 for convenient doorstep delivery of daily essentials.',
    evidenceNeeded:
      'At least 20 students placing paid orders during the 30-day pilot with actual payment verification and feedback.',
    statusLabel: 'Needs Pilot Validation',
  },
  {
    id: 'assumption-2',
    title: 'Repeat ordering habit (≥ 30% repeat rate)',
    hypothesis:
      'Students will regularly reorder groceries, snacks, stationery, and personal care items via CampusCart.',
    evidenceNeeded:
      'At least 30% of first-time paying customers placing another order within 30 days.',
    statusLabel: 'Needs Pilot Validation',
  },
  {
    id: 'assumption-3',
    title: 'Local retailer partnerships & positive margin',
    hypothesis:
      'At least 3 nearby Selaqui retailers partner and fulfil 20–30 pilot deliveries at sustainable variable cost (≤ ₹12/order).',
    evidenceNeeded:
      '3+ active non-demo retailer partnerships, successful order fulfilment, and verified positive contribution.',
    statusLabel: 'Needs Pilot Validation',
  },
];

export interface PilotValidationSummary {
  totalOrders: number;
  completedPaidOrders: number;
  uniquePayingCustomers: number;
  repeatCustomerCount: number;
  repeatPurchaseRatePct: number;
  activeRetailersTotal: number;
  activeVerifiedRetailers: number;
  feedbackCount: number;
  willingToPayYesPct: number;
  targetPayingCustomers: number;
  targetRepeatRatePct: number;
  targetActiveRetailers: number;
}

export function computePilotValidationProgress(
  orders: Order[],
  stores: Store[],
  feedback: FeedbackEntry[]
): PilotValidationSummary {
  const paidOrders = orders.filter(
    (o) =>
      (o.orderStatus === 'Completed' || o.paymentStatus === 'Manually Verified') &&
      o.orderStatus !== 'Cancelled' &&
      o.orderStatus !== 'Rejected'
  );

  const ordersPerCustomer = new Map<string, number>();
  for (const order of paidOrders) {
    const key = order.customerId || order.customerMobile;
    ordersPerCustomer.set(key, (ordersPerCustomer.get(key) ?? 0) + 1);
  }

  const uniquePayingCustomers = ordersPerCustomer.size;
  let repeatCustomerCount = 0;
  for (const count of ordersPerCustomer.values()) {
    if (count >= 2) repeatCustomerCount += 1;
  }

  const repeatPurchaseRatePct =
    uniquePayingCustomers > 0
      ? Math.round((repeatCustomerCount / uniquePayingCustomers) * 1000) / 10
      : 0;

  const activeRetailersTotal = stores.filter((s) => s.status === 'active').length;
  const activeVerifiedRetailers = stores.filter((s) => s.status === 'active' && !s.isDemo).length;

  const yesCount = feedback.filter((f) => f.willingToPay20 === 'yes').length;
  const willingToPayYesPct =
    feedback.length > 0 ? Math.round((yesCount / feedback.length) * 1000) / 10 : 0;

  return {
    totalOrders: orders.length,
    completedPaidOrders: paidOrders.length,
    uniquePayingCustomers,
    repeatCustomerCount,
    repeatPurchaseRatePct,
    activeRetailersTotal,
    activeVerifiedRetailers,
    feedbackCount: feedback.length,
    willingToPayYesPct,
    targetPayingCustomers: 20,
    targetRepeatRatePct: 30,
    targetActiveRetailers: 3,
  };
}
