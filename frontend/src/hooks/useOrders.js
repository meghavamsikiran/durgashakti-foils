import { useState, useCallback, useEffect, useRef } from 'react';
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
  const intervalRef = useRef(null);
  // FIX BUG-07: Keep a ref to latest orders so the polling interval can read
  // it without needing `orders` in its dependency array (which caused a new
  // interval to be created on every state update).
  const ordersRef = useRef(initialOrders);

  const fetchOrders = useCallback(async () => {
    const hasCached = !!apiClient.getCachedDataSync('/orders');
    if (!hasCached) {
      setLoading(true);
    }
    try {
      setError(null);
      const data = await orderService.getOrders(undefined, { silent: true, timeout: 90000 });
      setOrders(data || []);
      ordersRef.current = data || [];
    } catch (err) {
      // Only show error if we have no data to fall back on.
      // If cached orders are already visible, keep them and fail silently.
      setOrders(prev => {
        if (!prev || prev.length === 0) {
          setError('Order history could not be loaded. Please try again.');
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrdersSilent = useCallback(async () => {
    try {
      const response = await apiClient.get('/orders', { silent: true, timeout: 90000 });
      setError(null);
      setOrders(response.data || []);
      ordersRef.current = response.data || [];
    } catch (err) {
      // Ignore background fetch errors to prevent user distraction
    }
  }, []);

  const cancelOrder = async (orderId) => {
    const confirmed = await new Promise((resolve) => {
      toast('Cancel this order?', {
        action: { label: 'Confirm', onClick: () => resolve(true) },
        cancel: { label: 'Cancel', onClick: () => resolve(false) },
        onDismiss: () => resolve(false),
      });
    });

    if (!confirmed) return;

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

  // FIX BUG-07: `orders` removed from deps — reads latest value via ordersRef
  // to avoid creating a new interval on every state update (infinite loop).
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const hasPendingRefund = ordersRef.current.some(
      (order) => String(order.payment_status || '').toLowerCase() === 'refund_pending'
    );
    const interval = hasPendingRefund ? 4000 : 10000;

    intervalRef.current = setInterval(() => {
      fetchOrdersSilent();
    }, interval);

    return () => clearInterval(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOrdersSilent]);

  return { orders, loading, error, fetchOrders, cancelOrder, returnOrder };
};
