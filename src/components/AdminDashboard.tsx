import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Database,
  LayoutDashboard,
  Lock,
  MessageSquare,
  Package,
  Plus,
  Settings,
  Store as StoreIcon,
  Trash2,
} from 'lucide-react';
import { useCampusCart } from '../context/CampusCartContext';
import { ASSET_IMAGES } from '../data/seedData';
import {
  BUNDLE_CATEGORIES,
  BundleCategory,
  ORDER_STATUSES,
  OrderStatus,
  PaymentStatus,
  StoreStatus,
} from '../types/campuscart';
import { calculateBundleTotalFromProducts, formatInr } from '../utils/commerce';
import {
  calculateUnitEconomics,
  computePilotValidationProgress,
  KEY_PILOT_ASSUMPTIONS,
  LAUNCH_PLAN_30_DAYS,
  MARKET_SIZE_ASSUMPTIONS,
  VENTURE_SCENARIOS,
} from '../utils/unitEconomics';

type AdminTab =
  | 'overview'
  | 'economics'
  | 'orders'
  | 'retailers'
  | 'bundles'
  | 'settings';

export const AdminDashboard: React.FC = () => {
  const {
    activeRole,
    isCloudMode,
    isLiveAdmin,
    setDemoPreviewRole,
    setIsAccountModalOpen,
    platformConfig,
    serviceAreas,
    stores,
    products,
    bundles,
    orders,
    feedbackList,
    updateOrderStatus,
    reassignOrderStore,
    saveStore,
    deleteStore,
    saveServiceArea,
    deleteServiceArea,
    saveBundle,
    deleteBundle,
    savePlatformConfig,
    seedDemoDataToFirestore,
  } = useCampusCart();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [seeding, setSeeding] = useState(false);

  // Unit Economics interactive planning inputs (defaulting to DGU Venture Quest Base Plan)
  const [econInput, setEconInput] = useState({
    serviceFee: platformConfig.deliveryFee,
    variableCost: platformConfig.variableCostPerTxn,
    monthlyFixedCost: platformConfig.monthlyFixedCost,
    monthlyCustomers: platformConfig.baseMonthlyCustomers,
    purchasesPerCustomer: platformConfig.basePurchasesPerCustomer,
  });

  // New Store onboarding form
  const [storeForm, setStoreForm] = useState({
    name: '',
    ownerName: '',
    ownerUid: '',
    phone: '',
    whatsappNumber: '',
    address: '',
    category: 'Groceries & Daily Needs',
    operatingHours: '8:00 AM – 9:30 PM',
    isPharmacyLicensed: false,
    isDemo: false,
  });

  // New Service Area form
  const [areaForm, setAreaForm] = useState({
    name: '',
    clusterType: 'pg' as 'hostel' | 'pg' | 'campus',
    locality: 'Selaqui',
    city: 'Dehradun',
    deliveryEstimateNote: '',
  });

  // New Bundle form (uses real configured products from a single store)
  const [bundleForm, setBundleForm] = useState({
    name: '',
    category: 'Hostel Essentials' as BundleCategory,
    description: '',
    storeId: stores[0]?.id ?? '',
    selectedProductIds: [] as string[],
    usePromoPrice: false,
    promotionalPrice: '',
  });
  const [bundleError, setBundleError] = useState('');

  // Platform settings form
  const [settingsForm, setSettingsForm] = useState({
    deliveryFee: String(platformConfig.deliveryFee),
    pilotFeeDisclaimer: platformConfig.pilotFeeDisclaimer,
    fallbackWhatsappNumber: platformConfig.fallbackWhatsappNumber,
    enableCod: platformConfig.enableCod,
    enableUpi: platformConfig.enableUpi,
    pilotRegionName: platformConfig.pilotRegionName,
    pilotBannerText: platformConfig.pilotBannerText,
  });

  const econOutput = useMemo(() => calculateUnitEconomics(econInput), [econInput]);
  const validationProgress = useMemo(
    () => computePilotValidationProgress(orders, stores, feedbackList),
    [orders, stores, feedbackList]
  );

  if (activeRole !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-14">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
          <Lock className="w-8 h-8 text-violet-800 mx-auto" />
          <h1 className="text-xl font-bold text-slate-950">
            Super Administrator Console (Protected Route)
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Administrative operations are enforced by role-based Firestore security rules. Sign in
            with an authorized administrator Google account for live cloud control, or enter local
            capstone preview mode to inspect all admin screens in this browser.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAccountModalOpen(true)}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg"
            >
              Sign In as Admin (Google)
            </button>
            {!isCloudMode && (
              <button
                type="button"
                onClick={() => setDemoPreviewRole('admin')}
                className="px-5 py-2.5 text-sm font-semibold text-violet-900 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg"
              >
                Enter Local Admin Preview
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const filteredOrders =
    orderStatusFilter === 'All'
      ? orders
      : orders.filter((o) => o.orderStatus === orderStatusFilter);

  const bundleStoreProducts = products.filter((p) => p.storeId === bundleForm.storeId);
  const computedBundle = calculateBundleTotalFromProducts(
    bundleForm.selectedProductIds.map((id) => ({ productId: id, quantity: 1 })),
    bundleStoreProducts
  );

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (storeForm.name.trim().length < 2 || storeForm.ownerName.trim().length < 2) return;
    const id = `store_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    await saveStore(
      {
        id,
        name: storeForm.name.trim().slice(0, 120),
        ownerName: storeForm.ownerName.trim().slice(0, 100),
        ownerUid: storeForm.ownerUid.trim().slice(0, 128),
        phone: storeForm.phone.trim().slice(0, 20),
        whatsappNumber: storeForm.whatsappNumber.trim().slice(0, 20),
        address: (storeForm.address.trim() || 'Selaqui, Dehradun').slice(0, 240),
        serviceAreaIds: serviceAreas.filter((a) => a.isActive).map((a) => a.id),
        category: storeForm.category.trim().slice(0, 60),
        operatingHours: storeForm.operatingHours.trim().slice(0, 80),
        status: 'active',
        deliveryNote: 'Onboarded Selaqui partner store.',
        supportsCod: true,
        supportsUpi: false,
        verifiedUpiId: '',
        isPharmacyLicensed: storeForm.isPharmacyLicensed,
        isDemo: storeForm.isDemo,
      },
      true
    );
    setStoreForm({
      name: '',
      ownerName: '',
      ownerUid: '',
      phone: '',
      whatsappNumber: '',
      address: '',
      category: 'Groceries & Daily Needs',
      operatingHours: '8:00 AM – 9:30 PM',
      isPharmacyLicensed: false,
      isDemo: false,
    });
  };

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (areaForm.name.trim().length < 2) return;
    const id = `area_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    await saveServiceArea({
      id,
      name: areaForm.name.trim().slice(0, 120),
      clusterType: areaForm.clusterType,
      locality: areaForm.locality.trim().slice(0, 120),
      city: areaForm.city.trim().slice(0, 80),
      isActive: true,
      deliveryEstimateNote: areaForm.deliveryEstimateNote.trim().slice(0, 160),
    });
    setAreaForm({
      name: '',
      clusterType: 'pg',
      locality: 'Selaqui',
      city: 'Dehradun',
      deliveryEstimateNote: '',
    });
  };

  const handleCreateBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bundleForm.name.trim().length < 2) {
      setBundleError('Enter a bundle name.');
      return;
    }
    if (computedBundle.items.length === 0) {
      setBundleError('Select at least one configured product from the chosen store.');
      return;
    }
    const promoNum = bundleForm.usePromoPrice
      ? Number(bundleForm.promotionalPrice)
      : computedBundle.originalTotal;
    if (
      bundleForm.usePromoPrice &&
      (!Number.isFinite(promoNum) || promoNum <= 0 || promoNum > computedBundle.originalTotal)
    ) {
      setBundleError(
        `Promotional price must be between ₹1 and the real combined total (₹${computedBundle.originalTotal}).`
      );
      return;
    }

    setBundleError('');
    const store = stores.find((s) => s.id === bundleForm.storeId);
    const id = `bundle_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    await saveBundle(
      {
        id,
        name: bundleForm.name.trim().slice(0, 120),
        category: bundleForm.category,
        description:
          bundleForm.description.trim().slice(0, 360) ||
          `Curated ${bundleForm.category} bundle from ${store?.name ?? 'local store'}.`,
        storeId: bundleForm.storeId,
        storeName: store?.name ?? 'Local Store',
        imageUrl: ASSET_IMAGES.bundle,
        items: computedBundle.items,
        originalTotal: computedBundle.originalTotal,
        promotionalPrice: promoNum,
        hasPromotionalPrice: bundleForm.usePromoPrice && promoNum < computedBundle.originalTotal,
        isActive: true,
        isDemo: store?.isDemo ?? true,
      },
      true
    );

    setBundleForm((prev) => ({
      ...prev,
      name: '',
      description: '',
      selectedProductIds: [],
      usePromoPrice: false,
      promotionalPrice: '',
    }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const fee = Math.max(0, Math.min(500, Number(settingsForm.deliveryFee) || 0));
    await savePlatformConfig({
      deliveryFee: fee,
      pilotFeeDisclaimer: settingsForm.pilotFeeDisclaimer.trim().slice(0, 300),
      fallbackWhatsappNumber: settingsForm.fallbackWhatsappNumber.trim().slice(0, 20),
      enableCod: settingsForm.enableCod,
      enableUpi: settingsForm.enableUpi,
      pilotRegionName: settingsForm.pilotRegionName.trim().slice(0, 120),
      pilotBannerText: settingsForm.pilotBannerText.trim().slice(0, 220),
      variableCostPerTxn: econInput.variableCost,
      monthlyFixedCost: econInput.monthlyFixedCost,
      baseMonthlyCustomers: econInput.monthlyCustomers,
      basePurchasesPerCustomer: econInput.purchasesPerCustomer,
    });
  };

  const handleSeedCloud = async () => {
    setSeeding(true);
    try {
      await seedDemoDataToFirestore();
    } finally {
      setSeeding(false);
    }
  };

  const NAV_SECTIONS: Array<{ id: AdminTab; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Overview & Pilot', icon: LayoutDashboard },
    { id: 'economics', label: 'Unit Economics', icon: BarChart3 },
    { id: 'orders', label: `Orders (${orders.length})`, icon: ClipboardList },
    { id: 'retailers', label: 'Retailers & Areas', icon: StoreIcon },
    { id: 'bundles', label: 'Bundles & Catalog', icon: Package },
    { id: 'settings', label: 'Feedback & Settings', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Navigation (SaaS Dashboard Blueprint) */}
        <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="px-2 pt-1">
            <p className="text-xs font-semibold text-violet-800">Super Administrator</p>
            <h1 className="text-lg font-bold text-slate-950">CampusCart Console</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isLiveAdmin ? 'Live Cloud Firestore Admin' : 'Local Browser Preview Mode'}
            </p>
          </div>

          <nav aria-label="Admin sections" className="space-y-1">
            {NAV_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const active = tab === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setTab(sec.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left border ${
                    active
                      ? 'bg-violet-50 border-violet-200 text-violet-950 font-semibold'
                      : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950 font-medium'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{sec.label}</span>
                </button>
              );
            })}
          </nav>

          {isLiveAdmin && (
            <div className="pt-3 border-t border-slate-200">
              <button
                type="button"
                disabled={seeding}
                onClick={() => void handleSeedCloud()}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-violet-900 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{seeding ? 'Seeding Cloud DB...' : 'Seed Demo Data to Firestore'}</span>
              </button>
            </div>
          )}
        </aside>

        {/* Main Workspace */}
        <div className="lg:col-span-9 space-y-6">
          {/* TAB 1: OVERVIEW & PILOT VALIDATION */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-950 tracking-tight">
                  Pilot Overview & Validation Tracker
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Actual recorded orders and feedback below are tracked strictly separately from the
                  DGU Venture Quest financial planning assumptions.
                </p>
              </div>

              {/* Actual Recorded Operational Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Recorded Orders</p>
                  <p className="text-2xl font-bold text-slate-950 tabular-nums mt-1">
                    {validationProgress.totalOrders}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {validationProgress.completedPaidOrders} completed / paid
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Paying Customers (30d Goal: 20)</p>
                  <p className="text-2xl font-bold text-violet-900 tabular-nums mt-1">
                    {validationProgress.uniquePayingCustomers} / 20
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Repeat rate: {validationProgress.repeatPurchaseRatePct}% (Target ≥ 30%)
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Active Retailers (Goal: 3+)</p>
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
                    {validationProgress.activeVerifiedRetailers} verified
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {validationProgress.activeRetailersTotal} total (incl. demo stores)
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">₹{platformConfig.deliveryFee} Fee Willingness</p>
                  <p className="text-2xl font-bold text-slate-950 tabular-nums mt-1">
                    {validationProgress.feedbackCount > 0
                      ? `${validationProgress.willingToPayYesPct}%`
                      : '—'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    From {validationProgress.feedbackCount} survey responses
                  </p>
                </div>
              </div>

              {/* Key Validation Assumptions (Section 16 of PDF) */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-950">
                  Key Business Assumptions Under Pilot Test
                </h3>
                <div className="divide-y divide-slate-100">
                  {KEY_PILOT_ASSUMPTIONS.map((item) => (
                    <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                        <span className="text-xs font-medium text-amber-800">{item.statusLabel}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.hypothesis}</p>
                      <p className="text-[11px] text-slate-500">
                        Evidence required: {item.evidenceNeeded}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 30-Day Launch Plan (Section 13 of PDF) */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-950">
                  30-Day Selaqui Pilot Launch Roadmap
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {LAUNCH_PLAN_30_DAYS.map((phase) => (
                    <div
                      key={phase.week}
                      className="p-4 rounded-lg bg-[#F8F7FA] border border-slate-200 space-y-1.5"
                    >
                      <p className="text-xs font-bold text-violet-900">{phase.week}</p>
                      <p className="text-sm font-semibold text-slate-900">{phase.target}</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{phase.actions}</p>
                      <p className="text-[11px] text-slate-500 pt-1">
                        Learning Question: <em>{phase.learningQuestion}</em>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UNIT ECONOMICS & MARKET MODEL */}
          {tab === 'economics' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-950 tracking-tight">
                  Pricing, Unit Economics & Market Model
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Interactive financial planner grounded in the DGU Venture Quest business plan
                  assumptions.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  <strong>Planning Assumptions Notice:</strong> Every metric below is a financial
                  model hypothesis from the venture plan — never verified historical performance.
                  Actual delivery costs and willingness to pay must be validated during the Selaqui
                  pilot.
                </p>
              </div>

              {/* Scenario Preset Buttons */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-slate-950">Scenario Explorer</h3>
                  <div className="flex flex-wrap gap-2">
                    {VENTURE_SCENARIOS.map((sc) => (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() =>
                          setEconInput((prev) => ({
                            ...prev,
                            monthlyCustomers: sc.monthlyCustomers,
                            purchasesPerCustomer: sc.purchasesPerCustomer,
                          }))
                        }
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                          econInput.monthlyCustomers === sc.monthlyCustomers &&
                          econInput.purchasesPerCustomer === sc.purchasesPerCustomer
                            ? 'bg-violet-800 text-white border-violet-800'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {sc.label} ({sc.monthlyCustomers} × {sc.purchasesPerCustomer})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editable Assumption Inputs */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label htmlFor="ec-fee" className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Service Fee (₹)
                    </label>
                    <input
                      id="ec-fee"
                      type="number"
                      min={0}
                      value={econInput.serviceFee}
                      onChange={(e) =>
                        setEconInput((p) => ({ ...p, serviceFee: Number(e.target.value) || 0 }))
                      }
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="ec-var" className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Variable Cost (₹)
                    </label>
                    <input
                      id="ec-var"
                      type="number"
                      min={0}
                      value={econInput.variableCost}
                      onChange={(e) =>
                        setEconInput((p) => ({ ...p, variableCost: Number(e.target.value) || 0 }))
                      }
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="ec-fix" className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Monthly Fixed (₹)
                    </label>
                    <input
                      id="ec-fix"
                      type="number"
                      min={0}
                      value={econInput.monthlyFixedCost}
                      onChange={(e) =>
                        setEconInput((p) => ({
                          ...p,
                          monthlyFixedCost: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="ec-cust" className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Monthly Customers
                    </label>
                    <input
                      id="ec-cust"
                      type="number"
                      min={0}
                      value={econInput.monthlyCustomers}
                      onChange={(e) =>
                        setEconInput((p) => ({
                          ...p,
                          monthlyCustomers: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="ec-freq" className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Orders / Cust / Mo
                    </label>
                    <input
                      id="ec-freq"
                      type="number"
                      min={0}
                      value={econInput.purchasesPerCustomer}
                      onChange={(e) =>
                        setEconInput((p) => ({
                          ...p,
                          purchasesPerCustomer: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                {/* Calculated Financial Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4 text-left font-semibold">Metric</th>
                        <th className="py-2.5 px-4 text-right font-semibold">Planned Value</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Formula</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          Contribution per Transaction
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums">
                          {formatInr(econOutput.contributionPerTxn)}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-500">
                          Service Fee − Variable Cost
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          Contribution Margin %
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums">
                          {econOutput.contributionMarginPct.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-500">
                          (Contribution / Service Fee) × 100
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          Expected Monthly Transactions
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums">
                          {econOutput.expectedMonthlyTransactions}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-500">
                          Monthly Customers × Purchases / Customer
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          Expected Monthly Service Fee Revenue
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums">
                          {formatInr(econOutput.expectedMonthlyRevenue)}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-500">
                          Monthly Transactions × Service Fee
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          Expected Monthly Contribution
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums">
                          {formatInr(econOutput.expectedMonthlyContribution)}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-500">
                          Monthly Transactions × Contribution / Txn
                        </td>
                      </tr>
                      <tr className="bg-slate-50/70">
                        <td className="py-2.5 px-4 font-bold text-slate-950">
                          Expected Monthly Operating Surplus / Deficit
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-mono font-bold tabular-nums ${
                            econOutput.expectedMonthlySurplus >= 0
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {formatInr(econOutput.expectedMonthlySurplus)}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-500">
                          Monthly Contribution − Monthly Fixed Cost
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          Break-Even Volume (Transactions)
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums">
                          {econOutput.breakEvenTransactions !== null
                            ? `${econOutput.breakEvenTransactions} transactions`
                            : 'N/A (non-positive margin)'}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-500">
                          Monthly Fixed Cost / Contribution per Txn
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          Estimated Break-Even Customers
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums">
                          {econOutput.breakEvenCustomers !== null
                            ? `${econOutput.breakEvenCustomers} customers`
                            : 'N/A'}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-500">
                          Break-Even Transactions / Purchases per Customer
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TAM / SAM / SOM */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-950">
                  Market Size Planning Assumptions (TAM / SAM / SOM)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 text-left font-semibold">Level</th>
                        <th className="py-2.5 px-3 text-left font-semibold">Target Customers</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Annual Value</th>
                        <th className="py-2.5 px-3 text-left font-semibold">Basis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {MARKET_SIZE_ASSUMPTIONS.map((row) => (
                        <tr key={row.level}>
                          <td className="py-3 px-3 font-semibold text-slate-900">{row.level}</td>
                          <td className="py-3 px-3 text-xs text-slate-700">{row.customerCount}</td>
                          <td className="py-3 px-3 text-right font-mono text-xs font-semibold tabular-nums">
                            {row.annualValueInr}
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-600">{row.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500">
                  Audit Note (Venture Plan §11): Keep 12-month active customer base (SOM = 100
                  repeating students) distinct from cumulative monthly student-months (100 active
                  students ordering 4 times/month = 4,800 orders/year, ₹96,000/yr service fee
                  revenue).
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: ALL ORDERS & ALLOCATION */}
          {tab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-950">All Order Requests</h2>
                <select
                  aria-label="Filter orders by status"
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg"
                >
                  <option value="All">All Statuses ({orders.length})</option>
                  {ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-600">
                  No order requests match the current filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order) => (
                    <article
                      key={order.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-mono text-slate-500">
                            {order.orderRef} · {new Date(order.createdAt).toLocaleString('en-IN')}
                          </p>
                          <p className="text-sm font-bold text-slate-950">
                            {order.customerName} ({order.customerMobile}) — {order.hostelOrPg},{' '}
                            {order.roomDetails}
                          </p>
                        </div>
                        <p className="text-base font-bold text-slate-950 tabular-nums">
                          {formatInr(order.orderTotal)}{' '}
                          <span className="text-xs font-normal text-slate-500">
                            ({order.paymentMethod})
                          </span>
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Assigned Retailer
                          </label>
                          <select
                            value={order.storeId}
                            onChange={(e) => void reassignOrderStore(order.id, e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                          >
                            {stores.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Order Status
                          </label>
                          <select
                            value={order.orderStatus}
                            onChange={(e) =>
                              void updateOrderStatus(order.id, e.target.value as OrderStatus)
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                          >
                            {ORDER_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Payment Verification
                          </label>
                          <select
                            value={order.paymentStatus}
                            onChange={(e) =>
                              void updateOrderStatus(
                                order.id,
                                order.orderStatus,
                                e.target.value as PaymentStatus
                              )
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                          >
                            <option value="Unverified">Unverified</option>
                            <option value="Manually Verified">Manually Verified</option>
                            <option value="Not Applicable">Not Applicable</option>
                          </select>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RETAILERS & SERVICE AREAS */}
          {tab === 'retailers' && (
            <div className="space-y-8">
              {/* Onboard Retailer */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-950">
                  Onboard Local Retailer Partner (Selaqui / DGU Pilot)
                </h2>
                <form onSubmit={handleAddStore} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <input
                    type="text"
                    required
                    placeholder="Store Name *"
                    value={storeForm.name}
                    onChange={(e) => setStoreForm((s) => ({ ...s, name: e.target.value }))}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Owner / Contact Person *"
                    value={storeForm.ownerName}
                    onChange={(e) => setStoreForm((s) => ({ ...s, ownerName: e.target.value }))}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                  <input
                    type="tel"
                    placeholder="WhatsApp Order Number (e.g., 9198...)"
                    value={storeForm.whatsappNumber}
                    onChange={(e) => setStoreForm((s) => ({ ...s, whatsappNumber: e.target.value }))}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Store Address (Selaqui)"
                    value={storeForm.address}
                    onChange={(e) => setStoreForm((s) => ({ ...s, address: e.target.value }))}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Category (e.g., Kirana, Stationery)"
                    value={storeForm.category}
                    onChange={(e) => setStoreForm((s) => ({ ...s, category: e.target.value }))}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Owner Firebase UID (Optional)"
                    value={storeForm.ownerUid}
                    onChange={(e) => setStoreForm((s) => ({ ...s, ownerUid: e.target.value }))}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                  />
                  <div className="sm:col-span-2 flex flex-wrap items-center gap-6">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={storeForm.isPharmacyLicensed}
                        onChange={(e) =>
                          setStoreForm((s) => ({ ...s, isPharmacyLicensed: e.target.checked }))
                        }
                      />
                      <span>Verified Licensed Pharmacy (allows Medicines category)</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={storeForm.isDemo}
                        onChange={(e) => setStoreForm((s) => ({ ...s, isDemo: e.target.checked }))}
                      />
                      <span>Label as Demo Store</span>
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Onboard Store</span>
                    </button>
                  </div>
                </form>

                {/* Stores List */}
                <div className="pt-4 border-t border-slate-200 space-y-2.5">
                  {stores.map((st) => (
                    <div
                      key={st.id}
                      className="p-3.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">
                          {st.name}{' '}
                          {st.isDemo && (
                            <span className="text-xs font-medium text-amber-700">· Demo</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          {st.ownerName} · {st.address} · WhatsApp:{' '}
                          <span className="font-mono">
                            {st.whatsappNumber || 'Not configured'}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          aria-label={`Account status for ${st.name}`}
                          value={st.status}
                          onChange={(e) =>
                            void saveStore({ ...st, status: e.target.value as StoreStatus }, false)
                          }
                          className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="active">Active</option>
                          <option value="pending">Pending</option>
                          <option value="suspended">Suspended</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => void deleteStore(st.id)}
                          aria-label={`Remove ${st.name}`}
                          className="p-1.5 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Service Area Configuration */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-950">
                    Hyperlocal Service Areas (DGU & Selaqui Pilot)
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Add new hostel or PG clusters only after retailer delivery coverage is verified.
                  </p>
                </div>

                <form onSubmit={handleAddArea} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Hostel / PG Cluster Name *"
                    value={areaForm.name}
                    onChange={(e) => setAreaForm((a) => ({ ...a, name: e.target.value }))}
                    className="sm:col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                  <select
                    value={areaForm.clusterType}
                    onChange={(e) =>
                      setAreaForm((a) => ({
                        ...a,
                        clusterType: e.target.value as 'hostel' | 'pg' | 'campus',
                      }))
                    }
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="hostel">Hostel</option>
                    <option value="pg">PG Cluster</option>
                    <option value="campus">Campus Point</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg"
                  >
                    Add Area
                  </button>
                </form>

                <ul className="divide-y divide-slate-100">
                  {serviceAreas.map((area) => (
                    <li
                      key={area.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{area.name}</p>
                        <p className="text-xs text-slate-500">
                          {area.locality}, {area.city} · {area.clusterType}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            void saveServiceArea({ ...area, isActive: !area.isActive })
                          }
                          className={`text-xs font-semibold ${
                            area.isActive ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {area.isActive ? 'Active' : 'Paused'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteServiceArea(area.id)}
                          aria-label={`Delete ${area.name}`}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 5: STUDENT BUNDLES */}
          {tab === 'bundles' && (
            <div className="space-y-6">
              <form
                onSubmit={handleCreateBundle}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <div>
                  <h2 className="text-base font-bold text-slate-950">
                    Create Student-Friendly Bundle
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Select real configured products from a single store. Combined total is computed
                    automatically — no invented discounts.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Bundle Name *"
                    value={bundleForm.name}
                    onChange={(e) => setBundleForm((b) => ({ ...b, name: e.target.value }))}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                  <select
                    value={bundleForm.category}
                    onChange={(e) =>
                      setBundleForm((b) => ({ ...b, category: e.target.value as BundleCategory }))
                    }
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {BUNDLE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    value={bundleForm.storeId}
                    onChange={(e) =>
                      setBundleForm((b) => ({
                        ...b,
                        storeId: e.target.value,
                        selectedProductIds: [],
                      }))
                    }
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {stores.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700">
                    Select Store Products to Include ({bundleForm.selectedProductIds.length} selected ·
                    Real Combined Price: {formatInr(computedBundle.originalTotal)})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
                    {bundleStoreProducts.map((p) => {
                      const checked = bundleForm.selectedProductIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center justify-between gap-2 text-xs bg-white p-2 rounded border border-slate-200 cursor-pointer"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setBundleForm((b) => ({
                                  ...b,
                                  selectedProductIds: checked
                                    ? b.selectedProductIds.filter((id) => id !== p.id)
                                    : [...b.selectedProductIds, p.id],
                                }))
                              }
                            />
                            <span className="truncate">{p.name}</span>
                          </span>
                          <span className="font-mono font-semibold shrink-0">
                            {formatInr(p.price)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={bundleForm.usePromoPrice}
                      onChange={(e) =>
                        setBundleForm((b) => ({ ...b, usePromoPrice: e.target.checked }))
                      }
                    />
                    <span>Set verified promotional price (optional, must be ≤ combined total)</span>
                  </label>
                  {bundleForm.usePromoPrice && (
                    <input
                      type="number"
                      min={1}
                      max={computedBundle.originalTotal}
                      placeholder="Promo price (₹)"
                      value={bundleForm.promotionalPrice}
                      onChange={(e) =>
                        setBundleForm((b) => ({ ...b, promotionalPrice: e.target.value }))
                      }
                      className="w-36 px-3 py-1.5 text-sm border border-slate-200 rounded-lg font-mono"
                    />
                  )}
                </div>

                {bundleError && <p className="text-xs text-rose-700">{bundleError}</p>}

                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg"
                >
                  Save Student Bundle
                </button>
              </form>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                <h3 className="text-base font-bold text-slate-950">
                  Configured Bundles ({bundles.length})
                </h3>
                <div className="divide-y divide-slate-100">
                  {bundles.map((b) => (
                    <div
                      key={b.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">{b.name}</p>
                        <p className="text-xs text-slate-500">
                          {b.category} · {b.storeName} · {b.items.length} items ·{' '}
                          <strong className="text-slate-800">
                            {formatInr(b.hasPromotionalPrice ? b.promotionalPrice : b.originalTotal)}
                          </strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => void saveBundle({ ...b, isActive: !b.isActive }, false)}
                          className={`text-xs font-semibold ${
                            b.isActive ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {b.isActive ? 'Enabled' : 'Disabled'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteBundle(b.id)}
                          aria-label={`Delete bundle ${b.name}`}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: FEEDBACK & PLATFORM SETTINGS */}
          {tab === 'settings' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveSettings}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <h2 className="text-base font-bold text-slate-950">
                  Pilot Delivery Fee, WhatsApp & Payment Configuration
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cfg-fee" className="block text-xs font-semibold text-slate-700 mb-1">
                      Delivery / Service Fee per Order (₹)
                    </label>
                    <input
                      id="cfg-fee"
                      type="number"
                      min={0}
                      max={500}
                      value={settingsForm.deliveryFee}
                      onChange={(e) =>
                        setSettingsForm((s) => ({ ...s, deliveryFee: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="cfg-wa" className="block text-xs font-semibold text-slate-700 mb-1">
                      Fallback CampusCart WhatsApp Business Number
                    </label>
                    <input
                      id="cfg-wa"
                      type="tel"
                      maxLength={20}
                      placeholder="Leave empty until real business number is active"
                      value={settingsForm.fallbackWhatsappNumber}
                      onChange={(e) =>
                        setSettingsForm((s) => ({ ...s, fallbackWhatsappNumber: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="cfg-disc" className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilot Fee Explanation Disclaimer
                  </label>
                  <textarea
                    id="cfg-disc"
                    rows={2}
                    maxLength={300}
                    value={settingsForm.pilotFeeDisclaimer}
                    onChange={(e) =>
                      setSettingsForm((s) => ({ ...s, pilotFeeDisclaimer: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label htmlFor="cfg-banner" className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilot Announcement Banner Text
                  </label>
                  <input
                    id="cfg-banner"
                    type="text"
                    maxLength={220}
                    value={settingsForm.pilotBannerText}
                    onChange={(e) =>
                      setSettingsForm((s) => ({ ...s, pilotBannerText: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="flex flex-wrap gap-6 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={settingsForm.enableCod}
                      onChange={(e) =>
                        setSettingsForm((s) => ({ ...s, enableCod: e.target.checked }))
                      }
                    />
                    <span>Allow Cash on Delivery (COD)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={settingsForm.enableUpi}
                      onChange={(e) =>
                        setSettingsForm((s) => ({ ...s, enableUpi: e.target.checked }))
                      }
                    />
                    <span>Allow Manually Coordinated UPI</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Platform Configuration</span>
                </button>
              </form>

              {/* Customer Feedback Review */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-violet-800" />
                  <h3 className="text-base font-bold text-slate-950">
                    Student Pilot Feedback ({feedbackList.length})
                  </h3>
                </div>
                {feedbackList.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No student feedback entries recorded yet. Students can submit responses under My
                    Orders → Pilot Feedback.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {feedbackList.map((fb) => (
                      <li key={fb.id} className="py-3 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-900">
                            {fb.customerName} · {fb.hostelOrPg}
                          </span>
                          <span className="text-slate-600">
                            Rating {fb.rating}/5 · Pay ₹{platformConfig.deliveryFee}:{' '}
                            <strong className="capitalize">{fb.willingToPay20}</strong>
                          </span>
                        </div>
                        <p className="text-xs text-slate-700">{fb.comment}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
