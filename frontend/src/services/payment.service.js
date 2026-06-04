import apiClient from './core/apiClient';

const paymentService = {
  confirmCOD: async (orderId) => {
    const response = await apiClient.post(`/payment/cod/confirm?order_id=${orderId}`);
    return response.data;
  },
};

export default paymentService;
