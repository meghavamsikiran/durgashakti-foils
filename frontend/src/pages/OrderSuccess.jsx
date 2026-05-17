import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package } from 'lucide-react';
import { Button } from '../components/ui/button';

const OrderSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const orderNumber = searchParams.get('order_number');

  useEffect(() => {
    if (!orderId) {
      navigate('/shop');
    }
  }, [orderId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-6" data-testid="order-success-page">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        <div className="mb-8">
          <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Manrope' }} data-testid="success-title">
            Successfully!
          </h1>
          <p className="text-lg text-muted-foreground">
            Thank you for your purchase. Your order has been confirmed.
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