import React, { useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  MessageCircle,
  Package,
  Star,
  User,
} from 'lucide-react';
import { useCampusCart } from '../context/CampusCartContext';
import { OrderStatus } from '../types/campuscart';
import {
  buildWhatsAppClickToChatUrl,
  canTransitionOrderStatus,
  formatInr,
  isConfiguredWhatsappNumber,
} from '../utils/commerce';

function getStatusColorClass(status: OrderStatus): string {
  switch (status) {
    case 'Completed':
      return 'text-emerald-800 bg-emerald-50 border-emerald-200';
    case 'Accepted':
    case 'Confirmed':
    case 'Out for Delivery':
      return 'text-violet-900 bg-violet-50 border-violet-200';
    case 'Pending Retailer Confirmation':
    case 'Draft':
      return 'text-amber-900 bg-amber-50 border-amber-200';
    case 'Rejected':
    case 'Cancelled':
      return 'text-rose-800 bg-rose-50 border-rose-200';
    default:
      return 'text-slate-700 bg-slate-50 border-slate-200';
  }
}

export const CustomerOrdersView: React.FC = () => {
  const {
    orders,
    stores,
    platformConfig,
    userProfile,
    saveUserProfile,
    updateOrderStatus,
    submitFeedback,
    feedbackList,
    firebaseUser,
    serviceAreas,
    setActiveView,
  } = useCampusCart();

  const [tab, setTab] = useState<'orders' | 'profile' | 'feedback'>('orders');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    displayName: userProfile.displayName || '',
    phone: userProfile.phone || '',
    hostelOrPg: userProfile.hostelOrPg || serviceAreas[0]?.name || '',
    roomNumber: userProfile.roomNumber || '',
    landmark: userProfile.landmark || '',
  });

  // Feedback form state
  const [feedbackForm, setFeedbackForm] = useState({
    customerName: userProfile.displayName || '',
    hostelOrPg: userProfile.hostelOrPg || serviceAreas[0]?.name || '',
    orderRef: orders[0]?.orderRef || '',
    willingToPay20: 'yes' as 'yes' | 'maybe' | 'no',
    rating: 5,
    comment: '',
  });
  const [feedbackError, setFeedbackError] = useState('');

  const myOrders = firebaseUser
    ? orders.filter((o) => o.customerId === firebaseUser.uid)
    : orders;

  const handleCopy = async (id: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(msg);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveUserProfile({
      displayName: profileForm.displayName,
      email: firebaseUser?.email ?? userProfile.email,
      phone: profileForm.phone,
      hostelOrPg: profileForm.hostelOrPg,
      roomNumber: profileForm.roomNumber,
      landmark: profileForm.landmark,
    });
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbackForm.customerName.trim().length < 2 || feedbackForm.comment.trim().length < 3) {
      setFeedbackError('Please enter your name and at least a brief comment.');
      return;
    }
    setFeedbackError('');
    await submitFeedback(feedbackForm);
    setFeedbackForm((prev) => ({ ...prev, comment: '' }));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
            Student Orders & Account
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Review submitted WhatsApp order requests, save your hostel delivery profile, and share
            pilot feedback.
          </p>
        </div>

        {/* Clean segmented tabs */}
        <div className="inline-flex items-center p-1 bg-slate-200/70 rounded-lg self-start">
          {(
            [
              { id: 'orders', label: `My Orders (${myOrders.length})` },
              { id: 'profile', label: 'Hostel Profile' },
              { id: 'feedback', label: 'Pilot Feedback' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                tab === t.id
                  ? 'bg-white text-violet-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: ORDERS */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {myOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
              <Package className="w-8 h-8 text-slate-400 mx-auto" />
              <h2 className="text-base font-bold text-slate-900">No order requests yet</h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Once you build a cart and continue to WhatsApp checkout, your submitted order
                requests and manual retailer status updates will appear here.
              </p>
              <button
                type="button"
                onClick={() => setActiveView('catalogue')}
                className="px-4 py-2 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            myOrders.map((order) => {
              const store = stores.find((s) => s.id === order.storeId);
              const configuredWa =
                (isConfiguredWhatsappNumber(store?.whatsappNumber)
                  ? store?.whatsappNumber
                  : platformConfig.fallbackWhatsappNumber) || '';
              const waUrl = buildWhatsAppClickToChatUrl(configuredWa, order.whatsappMessage);
              const canCancel = canTransitionOrderStatus(order.orderStatus, 'Cancelled', 'student');

              return (
                <article
                  key={order.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono font-semibold text-slate-900">
                          {order.orderRef}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{new Date(order.createdAt).toLocaleString('en-IN')}</span>
                        <span aria-hidden="true">·</span>
                        <span>{order.storeName}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Deliver to: {order.hostelOrPg}, {order.roomDetails}
                        {order.landmark ? ` (Near ${order.landmark})` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-md ${getStatusColorClass(
                          order.orderStatus
                        )}`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{order.orderStatus}</span>
                      </span>
                      <span className="text-xs text-slate-600 border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-md">
                        Payment ({order.paymentMethod}): <strong>{order.paymentStatus}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    <div className="md:col-span-7">
                      <ul className="space-y-1.5 text-sm">
                        {order.items.map((item, idx) => (
                          <li
                            key={`${order.id}-${item.productId}-${idx}`}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="text-slate-700">
                              {item.productName} × {item.quantity}
                            </span>
                            <span className="font-medium text-slate-900 tabular-nums">
                              {formatInr(item.lineTotal)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="md:col-span-5 bg-slate-50 rounded-lg p-3.5 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Product Subtotal</span>
                        <span className="tabular-nums font-medium text-slate-900">
                          {formatInr(order.productSubtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Delivery / Service Fee</span>
                        <span className="tabular-nums font-medium text-slate-900">
                          {formatInr(order.deliveryFee)}
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-950">
                        <span>Order Total</span>
                        <span className="tabular-nums">{formatInr(order.orderTotal)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Open WhatsApp</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleCopy(order.id, order.whatsappMessage)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                      >
                        {copiedId === order.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === order.id ? 'Copied' : 'Copy Order Message'}</span>
                      </button>
                    </div>

                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => void updateOrderStatus(order.id, 'Cancelled')}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg"
                      >
                        Cancel Order Request
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: HOSTEL PROFILE */}
      {tab === 'profile' && (
        <form
          onSubmit={handleSaveProfile}
          className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl space-y-4"
        >
          <div className="flex items-center gap-2 text-violet-900">
            <User className="w-5 h-5" />
            <h2 className="text-base font-bold text-slate-950">Default Hostel / PG Details</h2>
          </div>
          <p className="text-xs text-slate-600">
            Saved details pre-fill future checkouts so ordering essentials takes seconds.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prof-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Student Name
              </label>
              <input
                id="prof-name"
                type="text"
                maxLength={120}
                value={profileForm.displayName}
                onChange={(e) => setProfileForm((p) => ({ ...p, displayName: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-violet-600"
              />
            </div>

            <div>
              <label htmlFor="prof-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile / WhatsApp Number
              </label>
              <input
                id="prof-phone"
                type="tel"
                maxLength={20}
                value={profileForm.phone}
                onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-violet-600"
              />
            </div>

            <div>
              <label htmlFor="prof-hostel" className="block text-xs font-semibold text-slate-700 mb-1">
                Hostel / PG Name
              </label>
              <input
                id="prof-hostel"
                type="text"
                maxLength={120}
                value={profileForm.hostelOrPg}
                onChange={(e) => setProfileForm((p) => ({ ...p, hostelOrPg: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-violet-600"
              />
            </div>

            <div>
              <label htmlFor="prof-room" className="block text-xs font-semibold text-slate-700 mb-1">
                Room Number
              </label>
              <input
                id="prof-room"
                type="text"
                maxLength={60}
                value={profileForm.roomNumber}
                onChange={(e) => setProfileForm((p) => ({ ...p, roomNumber: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-violet-600"
              />
            </div>
          </div>

          <div>
            <label htmlFor="prof-landmark" className="block text-xs font-semibold text-slate-700 mb-1">
              Nearby Landmark
            </label>
            <input
              id="prof-landmark"
              type="text"
              maxLength={140}
              value={profileForm.landmark}
              onChange={(e) => setProfileForm((p) => ({ ...p, landmark: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-violet-600"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg"
          >
            Save Profile
          </button>
        </form>
      )}

      {/* TAB 3: PILOT VALIDATION FEEDBACK */}
      {tab === 'feedback' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleFeedbackSubmit}
            className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <div>
              <h2 className="text-base font-bold text-slate-950">
                DGU & Selaqui Pilot Feedback Survey
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Help us validate whether a ₹{platformConfig.deliveryFee} delivery/service fee and
                WhatsApp ordering genuinely save you time.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fb-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Name *
                </label>
                <input
                  id="fb-name"
                  type="text"
                  required
                  value={feedbackForm.customerName}
                  onChange={(e) => setFeedbackForm((f) => ({ ...f, customerName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="fb-hostel" className="block text-xs font-semibold text-slate-700 mb-1">
                  Hostel / PG *
                </label>
                <input
                  id="fb-hostel"
                  type="text"
                  required
                  value={feedbackForm.hostelOrPg}
                  onChange={(e) => setFeedbackForm((f) => ({ ...f, hostelOrPg: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fb-wtp" className="block text-xs font-semibold text-slate-700 mb-1">
                  Would you pay ₹{platformConfig.deliveryFee} for doorstep delivery?
                </label>
                <select
                  id="fb-wtp"
                  value={feedbackForm.willingToPay20}
                  onChange={(e) =>
                    setFeedbackForm((f) => ({
                      ...f,
                      willingToPay20: e.target.value as 'yes' | 'maybe' | 'no',
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="yes">Yes — ₹{platformConfig.deliveryFee} is fair</option>
                  <option value="maybe">Maybe — depends on order size</option>
                  <option value="no">No — prefer ₹10 or lower</option>
                </select>
              </div>

              <div>
                <label htmlFor="fb-rating" className="block text-xs font-semibold text-slate-700 mb-1">
                  Overall Experience (1–5)
                </label>
                <select
                  id="fb-rating"
                  value={feedbackForm.rating}
                  onChange={(e) => setFeedbackForm((f) => ({ ...f, rating: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} / 5
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="fb-comment" className="block text-xs font-semibold text-slate-700 mb-1">
                What products or improvements would make you reorder? *
              </label>
              <textarea
                id="fb-comment"
                rows={3}
                maxLength={600}
                required
                value={feedbackForm.comment}
                onChange={(e) => setFeedbackForm((f) => ({ ...f, comment: e.target.value }))}
                placeholder="Share delivery experience, missing products, or pricing feedback..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            {feedbackError && <p className="text-xs text-rose-700">{feedbackError}</p>}

            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg"
            >
              Submit Pilot Feedback
            </button>
          </form>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-950">Your Submitted Responses</h3>
            {feedbackList.length === 0 ? (
              <p className="text-xs text-slate-500">
                No feedback submitted yet. Submitted responses appear in the Admin Pilot Validation
                tracker.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 space-y-2">
                {feedbackList.map((fb) => (
                  <li key={fb.id} className="pt-2.5 first:pt-0 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">{fb.customerName}</span>
                      <span className="inline-flex items-center gap-1 text-amber-700 font-medium tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        {fb.rating}/5
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{fb.comment}</p>
                    <p className="text-[11px] text-slate-500">
                      ₹{platformConfig.deliveryFee} fee willingness:{' '}
                      <span className="capitalize font-medium text-slate-700">
                        {fb.willingToPay20}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
