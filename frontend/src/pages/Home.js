import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Truck, Award, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import ProductCard from '../components/ProductCard';
import api from '../utils/api';

const Home = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.getProducts();
      setProducts(response.data.items?.slice(0, 4) || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-32 noise-texture">
        <div className="absolute inset-0 gradient-subtle"></div>
        <div className="relative max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="md:col-span-7"
            >
              <h1
                className="text-5xl md:text-7xl font-bold tracking-tight leading-none mb-6"
                style={{ fontFamily: 'Manrope' }}
                data-testid="hero-title"
              >
                Always Hot & Fresh,{' '}
                <span className="text-primary">From Kitchen to Craving</span>
              </h1>
              <p className="text-lg md:text-xl leading-relaxed text-muted-foreground mb-8 max-w-2xl">
                Premium food-grade aluminum foil that keeps your food fresh, hygienic, and perfectly wrapped. ISO certified quality you can trust.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => navigate('/shop')}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 rounded-sm font-semibold tracking-wide shadow-sm active:scale-95 transition-transform"
                  data-testid="hero-shop-button"
                >
                  Shop Now
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button
                  onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })}
                  variant="outline"
                  className="border border-input bg-background hover:bg-accent hover:text-accent-foreground h-12 px-8 rounded-sm transition-colors"
                  data-testid="hero-learn-button"
                >
                  Learn More
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="md:col-span-5"
            >
              <div className="relative aspect-square rounded-sm overflow-hidden shadow-float">
                <img
                  src="https://images.pexels.com/photos/7325110/pexels-photo-7325110.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                  alt="Aluminum foil texture"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
              style={{ fontFamily: 'Manrope' }}
            >
              Why Choose DurgaShakti Foils?
            </motion.h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Premium quality, certified safety, and eco-friendly solutions for your kitchen
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Shield,
                title: 'Food Grade Certified',
                description: 'ISO certified food-grade aluminum foil, safe for direct food contact'
              },
              {
                icon: Sparkles,
                title: '100% Guaranteed',
                description: 'Full length and width guarantee. No compromises on quality'
              },
              {
                icon: Award,
                title: 'Premium Quality',
                description: 'Superior thickness and strength for better wrapping experience'
              },
              {
                icon: Truck,
                title: 'Fast Delivery',
                description: 'Quick and reliable delivery across India'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-secondary/30 border border-border/50 p-8 rounded-sm hover:bg-secondary/50 transition-colors"
              >
                <feature.icon className="w-12 h-12 text-primary mb-4" />
                <h3 className="font-semibold text-xl mb-2" style={{ fontFamily: 'Manrope' }}>
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 md:py-32 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Manrope' }}>
                Featured Products
              </h2>
              <p className="text-lg text-muted-foreground">
                Our most popular aluminum foil sizes
              </p>
            </div>
            <Button
              onClick={() => navigate('/shop')}
              variant="outline"
              className="hidden md:flex"
              data-testid="view-all-products-button"
            >
              View All
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading products...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          )}

          <div className="text-center mt-8 md:hidden">
            <Button onClick={() => navigate('/shop')} variant="outline" data-testid="view-all-mobile-button">
              View All Products
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ fontFamily: 'Manrope' }}>
              Ready to Experience Premium Quality?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of satisfied customers who trust DurgaShakti Foils for their kitchen needs
            </p>
            <Button
              onClick={() => navigate('/shop')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 rounded-sm font-semibold tracking-wide shadow-sm active:scale-95 transition-transform"
              data-testid="cta-shop-button"
            >
              Start Shopping
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;