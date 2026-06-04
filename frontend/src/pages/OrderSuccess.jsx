import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, Package } from 'lucide-react';
import { Button } from '../components/ui/button';
import paymentService from '../services/payment.service';
import { clearPendingRazorpayOrder } from '../utils/pendingPayment';

const OrderSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const orderNumber = searchParams.get('order_number');
  const [confirming, setConfirming] = useState(searchParams.get('confirming') === '1');

  useEffect(() => {
    if (!orderId) {
      navigate('/shop');
    }
  }, [orderId, navigate]);

  useEffect(() => {
    if (!orderId || !confirming) return;

    let active = true;
    const timer = setInterval(async () => {
      try {
        const result = await paymentService.reconcileRazorpayPayment(orderId);
        if (active && result?.paid) {
          clearPendingRazorpayOrder(orderId);
          setConfirming(false);
          clearInterval(timer);
        }
      } catch {
        // Keep the page calm; dashboard/cart reconciliation will keep retrying.
      }
    }, 5000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [orderId, confirming]);

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-6" data-testid="order-success-page">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        <div className="mb-8">
          {confirming ? (
            <Clock className="w-24 h-24 text-amber-500 mx-auto mb-4" />
          ) : (
            <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
          )}
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Manrope' }} data-testid="success-title">
            {confirming ? 'Payment Received' : 'Successfully!'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {confirming
              ? 'Razorpay has received your payment. We are finalizing your order and it will appear in My Orders shortly.'
              : 'Thank you for your purchase. Your order has been confirmed.'}
          </p>
        </div>

        {orderId && (
          <div className="bg-secondary/30 border border-border/50 rounded-sm p-6 mb-8">
            <p className="text-sm text-muted-foreground mb-2">Order ID</p>
            <p className="font-mono font-semibold text-lg" data-testid="order-id">{orderNumber || orderId}</p>
          </div>
        )}

        <div className="space-y-4">
          <Button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-sm font-semibold"
            data-testid="view-orders-button"
          >
            <Package className="w-4 h-4 mr-2" />
            View My Orders
          </Button>
          <Button
            onClick={() => navigate('/shop')}
            variant="outline"
            className="w-full"
            data-testid="continue-shopping-success-button"
          >
            Continue Shopping
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default OrderSuccess;
