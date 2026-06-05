import { useState, useCallback, useEffect } from 'react';
import orderService from '../services/order.service';
import apiClient from '../services/core/apiClient';
import { toast } from 'sonner';

export const useOrders = () => {
  const getInitialOrders = () => {
    const cachedResponse = apiClient.getCachedDataSync('/orders');
    return cachedResponse?.data || [];
  };

  const initialOrders = getInitialOrders();

  const [orders, setOrders] = useState(initialOrders);
  const [loading, setLoading] = useState(!initialOrders.length);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    const hasCached = !!apiClient.getCachedDataSync('/orders');
    if (!hasCached) {
      setLoading(true);
    }
    try {
      setError(null);
      const data = await orderService.getOrders(undefined, { silent: true, timeout: 90000 });
      setOrders(data || []);
    } catch (err) {
      setError('Order history could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrdersSilent = useCallback(async () => {
    try {
      const response = await apiClient.get('/orders', { silent: true, timeout: 90000 });
      setError(null);
      setOrders(response.data || []);
    } catch (err) {
      // Ignore background fetch errors to prevent user distraction
    }
  }, []);

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      await orderService.cancelOrder(orderId);
      toast.success('Order cancelled');
      fetchOrders();
    } catch (err) {
      // Handled by interceptor
    }
  };

  const returnOrder = async (orderId, formData) => {
    try {
      await orderService.returnOrder(orderId, formData);
      toast.success('Return request submitted successfully');
      fetchOrders();
      return true;
    } catch (err) {
      return false;
    }
  };

  // Initial load
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Periodic silent polling in the background for real-time responsiveness
  // Polls every 4 seconds if there is a pending refund, otherwise every 10 seconds.
  useEffect(() => {
    const hasPendingRefund = orders.some(
      (order) => String(order.payment_status || '').toLowerCase() === 'refund_pending'
    );
    const interval = hasPendingRefund ? 4000 : 10000;

    const timer = setInterval(() => {
      fetchOrdersSilent();
    }, interval);
    return () => clearInterval(timer);
  }, [fetchOrdersSilent, orders]);

  return { orders, loading, error, fetchOrders, cancelOrder, returnOrder };
};
