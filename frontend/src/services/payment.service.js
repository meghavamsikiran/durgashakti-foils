import apiClient from './core/apiClient';

const paymentService = {
  confirmCOD: async (orderId) => {
    const response = await apiClient.post(`/payment/cod/confirm?order_id=${orderId}`);
    return response.data;
  },
  verifyRazorpayPayment: async (verificationData) => {
    const response = await apiClient.post('/payment/razorpay/verify', verificationData);
    return response.data;
  },
  syncRazorpayPayment: async (syncData) => {
    const response = await apiClient.post('/payment/razorpay/sync', syncData, { silent: true });
    return response.data;
  },
  createRazorpayOrderForExistingOrder: async (orderId) => {
    const response = await apiClient.post('/payment/razorpay/create-for-order', { order_id: orderId });
    return response.data;
  },
};

export default paymentService;
