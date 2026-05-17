import apiClient from './core/apiClient';

const paymentService = {
  createRazorpayOrder: async (orderId) => {
    const response = await apiClient.post(`/payment/razorpay/create-order?order_id=${orderId}`);
    return response.data;
  },

  verifyRazorpayPayment: async (paymentData) => {
    const response = await apiClient.post('/payment/razorpay/verify', paymentData);
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
