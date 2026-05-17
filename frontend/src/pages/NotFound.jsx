import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { reveal } from '../animations/variants';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-20 px-6">
      <motion.div {...reveal} className="max-w-md w-full text-center">
        <div className="surface-elevated p-10 md:p-12 space-y-8">
          <h1 className="text-8xl font-display font-bold text-neutral-100">404</h1>
          
          <div className="space-y-3">
            <h2 className="heading-md">Page not found</h2>
            <p className="body-sm text-balance">
              The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Button
              onClick={() => navigate('/')}
              className="w-full bg-neutral-900 text-white hover:bg-neutral-800 h-13 rounded-xl text-sm font-medium"
            >
              Back to home
            </Button>
            <Button
              onClick={() => navigate('/shop')}
              variant="ghost"
              className="w-full h-12 rounded-xl text-sm text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Go to shop
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
