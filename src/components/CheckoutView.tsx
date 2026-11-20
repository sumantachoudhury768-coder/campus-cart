import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Info,
  MessageCircle,
  ShieldAlert,
} from 'lucide-react';
import { useCampusCart } from '../context/CampusCartContext';
import { CheckoutFormInput, Order, PaymentMethod } from '../types/campuscart';
import {
  buildWhatsAppClickToChatUrl,
  formatInr,
  generateWhatsAppOrderMessage,
  isConfiguredWhatsappNumber,
  validateCheckoutForm,
} from '../utils/commerce';

export const CheckoutView: React.FC = () => {
  const {
    cart,
    cartTotals,
    stores,
    serviceAreas,
    platformConfig,
    userProfile,
    submitOrder,
    setActiveView,
    setIsCartOpen,
    isCloudMode,
  } = useCampusCart();

  const activeAreas = useMemo(
    () => serviceAreas.filter((a) => a.isActive),
    [serviceAreas]
  );

  const selectedStore = useMemo(
    () => (cart.length > 0 ? stores.find((s) => s.id === cart[0].storeId) ?? null : null),
    [cart, stores]
  );

  const allowCod = platformConfig.enableCod && (selectedStore?.supportsCod ?? true);
  const allowUpi = platformConfig.enableUpi && (selectedStore?.supportsUpi ?? false);

  const [form, setForm] = useState<CheckoutFormInput>({
    customerName: userProfile.displayName || '',
    customerMobile: userProfile.phone || '',
    hostelOrPg: userProfile.hostelOrPg || activeAreas[0]?.name || '',
    roomDetails: userProfile.roomNumber || '',
    landmark: userProfile.landmark || '',
    deliveryInstructions: '',
    paymentMethod: allowCod ? 'COD' : 'UPI',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormInput, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);

  const previewMessage = useMemo(() => {
    if (cart.length === 0) return '';
    return generateWhatsAppOrderMessage({
      storeName: selectedStore?.name ?? cart[0].storeName,
      customerName: form.customerName || '[Your Name]',
      customerMobile: form.customerMobile || '[Your Mobile]',
      hostelOrPg: form.hostelOrPg || '[Hostel / PG]',
      roomDetails: form.roomDetails || '[Room / Drop Details]',
      landmark: form.landmark,
      deliveryInstructions: form.deliveryInstructions,
      items: cart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal: Math.round(item.price * item.quantity * 100) / 100,
      })),
      productSubtotal: cartTotals.productSubtotal,
      deliveryFee: cartTotals.deliveryFee,
      orderTotal: cartTotals.orderTotal,
      paymentMethod: form.paymentMethod,
    });
  }, [cart, cartTotals, form, selectedStore]);

  const copyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback textarea copy
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateCheckoutForm(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const order = await submitOrder(form);
      setSubmittedOrder(order);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  // Post-submit WhatsApp Handoff & Copy Fallback View
  if (submittedOrder) {
    const orderStore = stores.find((s) => s.id === submittedOrder.storeId);
    const configuredNumber =
      (isConfiguredWhatsappNumber(orderStore?.whatsappNumber)
        ? orderStore?.whatsappNumber
        : platformConfig.fallbackWhatsappNumber) || '';
    const whatsappUrl = buildWhatsAppClickToChatUrl(
      configuredNumber,
      submittedOrder.whatsappMessage
    );

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-mono text-slate-500">
                Order Reference: {submittedOrder.orderRef}
              </p>
              <h1 className="text-2xl font-bold text-slate-950">
                Order Request Saved — Pending Retailer Confirmation
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your order request has been recorded with status{' '}
                <strong className="text-amber-800">Pending Retailer Confirmation</strong>. An order
                is <strong>not confirmed</strong> until{' '}
                <strong className="text-slate-900">{submittedOrder.storeName}</strong> accepts it on
                WhatsApp and verifies stock.
              </p>
            </div>
          </div>

          {!isCloudMode && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600">
              Saved in local browser session (Preview Mode). Sign in with Google on your next order
              to sync order history to Cloud Firestore.
            </div>
          )}

          {/* WhatsApp Action or Honest Setup Notice */}
          {whatsappUrl ? (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 space-y-3">
              <p className="text-sm font-semibold text-emerald-950">
                Next Step: Send your pre-filled order message on WhatsApp
              </p>
              <p className="text-xs text-emerald-900 leading-relaxed">
                Clicking below opens WhatsApp Click-to-Chat with your itemized order. Because the
                browser cannot verify whether you pressed Send inside WhatsApp, please wait for the
                retailer&apos;s reply.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Open WhatsApp with Order Message</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => void copyMessage(submittedOrder.whatsappMessage)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Message Copied' : 'Copy Order Message'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-950">
                    WhatsApp Number Not Configured Yet (Administrator Setup Required)
                  </p>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    No verified WhatsApp business number has been configured for{' '}
                    <strong>{submittedOrder.storeName}</strong> or the platform fallback yet. We
                    never hardcode imaginary phone numbers. Use the copy button below to send the
                    order manually, or configure a real WhatsApp number in the Admin / Retailer
                    Dashboard.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => void copyMessage(submittedOrder.whatsappMessage)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Order Message Copied!' : 'Copy Order Details'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Verified UPI Instruction Block (ONLY when UPI selected & store has verified UPI ID) */}
          {submittedOrder.paymentMethod === 'UPI' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">
                Payment Method: Manually Coordinated UPI (Status: {submittedOrder.paymentStatus})
              </p>
              {orderStore?.verifiedUpiId ? (
                <p>
                  Verified Store UPI ID:{' '}
                  <span className="font-mono font-semibold text-violet-900">
                    {orderStore.verifiedUpiId}
                  </span>{' '}
                  — Please pay only after the retailer confirms item availability on WhatsApp.
                </p>
              ) : (
                <p>
                  This store has not published a verified UPI ID yet. Request their verified UPI QR
                  or ID on WhatsApp after order confirmation, or settle via Cash on Delivery.
                </p>
              )}
            </div>
          )}

          {/* Readable Message Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-700">Generated WhatsApp Message</h2>
              <button
                type="button"
                onClick={() => void copyMessage(submittedOrder.whatsappMessage)}
                className="text-xs font-semibold text-violet-800 hover:underline"
              >
                {copied ? 'Copied!' : 'Copy text'}
              </button>
            </div>
            <pre className="bg-slate-950 text-slate-100 font-mono text-xs p-4 rounded-xl whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {submittedOrder.whatsappMessage}
            </pre>
          </div>

          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setActiveView('orders')}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg"
            >
              View My Orders
            </button>
            <button
              type="button"
              onClick={() => setActiveView('catalogue')}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Continue Browsing
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty cart guard
  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-950">Your Cart is Empty</h1>
        <p className="text-sm text-slate-600">
          Add everyday essentials or a student bundle before proceeding to WhatsApp checkout.
        </p>
        <button
          type="button"
          onClick={() => setActiveView('catalogue')}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg"
        >
          Browse Catalogue
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <button
        type="button"
        onClick={() => setActiveView('catalogue')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Catalogue</span>
      </button>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
          Hostel & PG Checkout
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Enter only the delivery details required for{' '}
          <strong className="text-slate-900">{selectedStore?.name ?? cart[0].storeName}</strong> to
          confirm and deliver your order via WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Delivery Details Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <h2 className="text-base font-bold text-slate-950">1. Student & Delivery Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="checkout-name"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Full Name <span className="text-rose-600">*</span>
              </label>
              <input
                id="checkout-name"
                type="text"
                required
                maxLength={100}
                value={form.customerName}
                onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                placeholder="e.g., Tushar Sharma"
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                  errors.customerName ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200 bg-white'
                } focus:outline-none focus:border-violet-600`}
              />
              {errors.customerName && (
                <p className="text-xs text-rose-700 mt-1">{errors.customerName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="checkout-mobile"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Mobile / WhatsApp Number <span className="text-rose-600">*</span>
              </label>
              <input
                id="checkout-mobile"
                type="tel"
                required
                maxLength={20}
                value={form.customerMobile}
                onChange={(e) => setForm((f) => ({ ...f, customerMobile: e.target.value }))}
                placeholder="10-digit mobile number"
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                  errors.customerMobile ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200 bg-white'
                } focus:outline-none focus:border-violet-600`}
              />
              {errors.customerMobile && (
                <p className="text-xs text-rose-700 mt-1">{errors.customerMobile}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="checkout-hostel"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Hostel / PG Cluster (Selaqui & DGU) <span className="text-rose-600">*</span>
              </label>
              <select
                id="checkout-hostel"
                value={
                  activeAreas.some((a) => a.name === form.hostelOrPg)
                    ? form.hostelOrPg
                    : '__custom__'
                }
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((f) => ({ ...f, hostelOrPg: val === '__custom__' ? '' : val }));
                }}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-violet-600"
              >
                {activeAreas.map((area) => (
                  <option key={area.id} value={area.name}>
                    {area.name} ({area.locality})
                  </option>
                ))}
                <option value="__custom__">Other Selaqui Hostel / PG...</option>
              </select>
              {!activeAreas.some((a) => a.name === form.hostelOrPg) && (
                <input
                  type="text"
                  aria-label="Enter custom Selaqui hostel or PG name"
                  maxLength={120}
                  value={form.hostelOrPg}
                  onChange={(e) => setForm((f) => ({ ...f, hostelOrPg: e.target.value }))}
                  placeholder="Enter your Selaqui hostel or PG name"
                  className="mt-2 w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-violet-600"
                />
              )}
              {errors.hostelOrPg && (
                <p className="text-xs text-rose-700 mt-1">{errors.hostelOrPg}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="checkout-room"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Room Number / Drop Point <span className="text-rose-600">*</span>
              </label>
              <input
                id="checkout-room"
                type="text"
                required
                maxLength={120}
                value={form.roomDetails}
                onChange={(e) => setForm((f) => ({ ...f, roomDetails: e.target.value }))}
                placeholder="e.g., Block B, Room 204 or Main Gate"
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                  errors.roomDetails ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200 bg-white'
                } focus:outline-none focus:border-violet-600`}
              />
              {errors.roomDetails && (
                <p className="text-xs text-rose-700 mt-1">{errors.roomDetails}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="checkout-landmark"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Nearby Landmark (Optional)
              </label>
              <input
                id="checkout-landmark"
                type="text"
                maxLength={140}
                value={form.landmark}
                onChange={(e) => setForm((f) => ({ ...f, landmark: e.target.value }))}
                placeholder="e.g., Opposite DGU Gate 2"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-violet-600"
              />
            </div>

            <div>
              <label
                htmlFor="checkout-instructions"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Delivery Instructions (Optional)
              </label>
              <input
                id="checkout-instructions"
                type="text"
                maxLength={240}
                value={form.deliveryInstructions}
                onChange={(e) => setForm((f) => ({ ...f, deliveryInstructions: e.target.value }))}
                placeholder="e.g., Call on arrival after 5 PM"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-violet-600"
              />
            </div>
          </div>

          {/* Payment Preference Section */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h2 className="text-base font-bold text-slate-950">2. Preferred Payment Method</h2>
            <p className="text-xs text-slate-600">
              Payments are coordinated directly with the local retailer upon delivery or after
              WhatsApp confirmation. No online payment gateway is charged here, and we never ask
              for UPI PINs or OTPs.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allowCod && (
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer ${
                    form.paymentMethod === 'COD'
                      ? 'border-violet-700 bg-violet-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={form.paymentMethod === 'COD'}
                    onChange={() =>
                      setForm((f) => ({ ...f, paymentMethod: 'COD' as PaymentMethod }))
                    }
                    className="mt-0.5 text-violet-800 focus:ring-violet-600"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-900 block">
                      Cash on Delivery (COD)
                    </span>
                    <span className="text-xs text-slate-600">
                      Pay in cash when your order reaches your hostel or PG.
                    </span>
                  </div>
                </label>
              )}

              {allowUpi && (
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer ${
                    form.paymentMethod === 'UPI'
                      ? 'border-violet-700 bg-violet-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="UPI"
                    checked={form.paymentMethod === 'UPI'}
                    onChange={() =>
                      setForm((f) => ({ ...f, paymentMethod: 'UPI' as PaymentMethod }))
                    }
                    className="mt-0.5 text-violet-800 focus:ring-violet-600"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-900 block">
                      Manually Coordinated UPI
                    </span>
                    <span className="text-xs text-slate-600">
                      {selectedStore?.verifiedUpiId
                        ? `Verified UPI: ${selectedStore.verifiedUpiId}`
                        : 'Pay directly to retailer UPI after WhatsApp confirmation.'}
                    </span>
                  </div>
                </label>
              )}
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-500">
              <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Order status remains &ldquo;Pending Retailer Confirmation&rdquo; and payment status
                remains &ldquo;Unverified&rdquo; until updated by an authorized retailer.
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{submitting ? 'Saving Order Request...' : 'Continue to WhatsApp'}</span>
            </button>
          </div>
        </form>

        {/* Order Summary + Live WhatsApp Preview */}
        <aside className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-950">Order Summary</h2>
                <span className="text-xs text-slate-500">
                  · {cartTotals.itemCount} {cartTotals.itemCount === 1 ? 'item' : 'items'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="text-xs font-semibold text-violet-800 hover:underline whitespace-nowrap shrink-0"
              >
                Edit Cart
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Retailer:{' '}
              <strong className="text-slate-900">{selectedStore?.name ?? cart[0].storeName}</strong>
            </p>

            <ul className="divide-y divide-slate-100 text-sm">
              {cart.map((item) => (
                <li key={item.productId} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{item.productName}</p>
                    <p className="text-xs text-slate-500">
                      {formatInr(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                    {formatInr(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="pt-3 border-t border-slate-200 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Product Subtotal (to Retailer)</span>
                <span className="font-medium text-slate-900 tabular-nums">
                  {formatInr(cartTotals.productSubtotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery / Service Fee (CampusCart Pilot)</span>
                <span className="font-medium text-slate-900 tabular-nums">
                  {formatInr(cartTotals.deliveryFee)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-bold text-slate-950">
                <span>Payable Total</span>
                <span className="tabular-nums">{formatInr(cartTotals.orderTotal)}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-amber-950 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>{platformConfig.pilotFeeDisclaimer}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-800">
              Live WhatsApp Message Preview
            </h3>
            <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-[11px] font-mono text-slate-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {previewMessage}
            </pre>
          </div>
        </aside>
      </div>
    </div>
  );
};
