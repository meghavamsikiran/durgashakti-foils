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

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, fetchOrders, cancelOrder };
};
