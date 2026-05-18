import { useState, useCallback, useEffect } from 'react';
import orderService from '../services/order.service';
import { toast } from 'sonner';

export const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await orderService.getOrders();
      setOrders(data || []);
    } catch (err) {
      // Error is handled by interceptor toast
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrdersSilent = useCallback(async () => {
    try {
      const data = await orderService.getOrders();
      setOrders(data || []);
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

  // Periodic silent polling in the background (every 10 seconds) for real-time responsiveness
  useEffect(() => {
    const timer = setInterval(() => {
      fetchOrdersSilent();
    }, 10000);
    return () => clearInterval(timer);
  }, [fetchOrdersSilent]);

  return { orders, loading, fetchOrders, cancelOrder, returnOrder };
};
