import apiClient from './core/apiClient';

const paymentService = {
  createRazorpayOrder: async (orderId) => {
    const response = await apiClient.post(`/payment/razorpay/create-order?order_id=${orderId}`, null, { timeout: 90000 });
    return response.data;
  },

  verifyRazorpayPayment: async (paymentData) => {
    const response = await apiClient.post('/payment/razorpay/verify', paymentData, { timeout: 90000 });
    apiClient.invalidateCache('/cart');
    apiClient.invalidateCache('/orders');
    apiClient.invalidateCache('/admin/orders');
    apiClient.invalidateCache('/admin/payments');
    return response.data;
  },

  reconcileRazorpayPayment: async (orderId) => {
    const response = await apiClient.post('/payment/razorpay/reconcile', { order_id: orderId }, { silent: true, timeout: 90000 });
    if (response.data?.paid) {
      apiClient.invalidateCache('/cart');
      apiClient.invalidateCache('/orders');
      apiClient.invalidateCache('/admin/orders');
      apiClient.invalidateCache('/admin/payments');
    }
    return response.data;
  },

  confirmCOD: async (orderId) => {
    const response = await apiClient.post(`/payment/cod/confirm?order_id=${orderId}`);
    return response.data;
  },

  payCODOnline: async (orderId) => {
    const response = await apiClient.post('/payment/razorpay/pay-cod', { order_id: orderId });
    return response.data;
  },
};

export default paymentService;
