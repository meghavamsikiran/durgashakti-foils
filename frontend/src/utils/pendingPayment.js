const PENDING_RAZORPAY_ORDER_KEY = 'ds_pending_razorpay_order';
const PENDING_PAYMENT_TTL_MS = 24 * 60 * 60 * 1000;

export const savePendingRazorpayOrder = (order) => {
  if (!order?.orderId) return;
  localStorage.setItem(PENDING_RAZORPAY_ORDER_KEY, JSON.stringify({
    orderId: order.orderId,
    orderNumber: order.orderNumber || '',
    savedAt: Date.now(),
  }));
};

export const getPendingRazorpayOrder = () => {
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING_RAZORPAY_ORDER_KEY) || 'null');
    if (!pending?.orderId) return null;
    if (Date.now() - Number(pending.savedAt || 0) > PENDING_PAYMENT_TTL_MS) {
      localStorage.removeItem(PENDING_RAZORPAY_ORDER_KEY);
      return null;
    }
    return pending;
  } catch {
    localStorage.removeItem(PENDING_RAZORPAY_ORDER_KEY);
    return null;
  }
};

export const clearPendingRazorpayOrder = (orderId) => {
  const pending = getPendingRazorpayOrder();
  if (!pending || !orderId || String(pending.orderId) === String(orderId)) {
    localStorage.removeItem(PENDING_RAZORPAY_ORDER_KEY);
  }
};
