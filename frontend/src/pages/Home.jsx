import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Truck, Award, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import ProductCard from '../components/ProductCard';
import api from '../utils/api';
import apiClient from '../services/core/apiClient';

const Home = () => {
  const navigate = useNavigate();

  const getInitialProducts = () => {
    const cachedResponse = apiClient.getCachedDataSync('/products');
    return cachedResponse?.data?.items?.slice(0, 4) || [];
  };

  const initialProducts = getInitialProducts();

  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(!initialProducts.length);

  const fetchProducts = async () => {
    const hasCached = !!apiClient.getCachedDataSync('/products');
    if (!hasCached) {
      setLoading(true);
    }
    try {
      const response = await api.getProducts();
      setProducts(response.data.items?.slice(0, 4) || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsSilent = async () => {
    try {
      const response = await apiClient.get('/products', { silent: true });
      setProducts(response.data.items?.slice(0, 4) || []);
    } catch {
      // Ignore background errors
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchProductsSilent();
  }, []);

  return (
    <div className="min-h-screen bg-surface font-inter text-on-surface" data-testid="home-page">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-32 bg-surface-bright border-b border-border-subtle">
        {/* Technical grids/glows for depth */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,110,27,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,110,27,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-primary-container/10 rounded-full blur-[100px] pointer-events-none -mr-32 -mt-32" />
        
        <div className="relative max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="md:col-span-7"
            >
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-primary bg-primary/10 px-3.5 py-1.5 rounded-full inline-block mb-6 border border-primary/20">
                INDUSTRIAL PRECISION
              </span>
              <h1
                className="text-5xl md:text-7xl font-bold tracking-tighter leading-none mb-6 font-manrope text-ink-slate"
                data-testid="hero-title"
              >
                Always Hot & Fresh, <span className="text-primary bg-gradient-to-r from-primary to-emerald-hover bg-clip-text text-transparent">Culinary Guarded</span>
              </h1>
              <p className="text-base md:text-lg leading-relaxed text-on-surface-variant mb-8 max-w-2xl font-medium">
                Premium food-grade aluminum foil engineered for commercial strength and clinical hygiene. Heat-insulated protection that preserves freshness.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => navigate('/shop')}
                  size="default"
                  className="bg-primary text-white hover:bg-emerald-hover h-[52px] px-8 rounded-lg font-bold tracking-wider shadow-sm"
                  data-testid="hero-shop-button"
                >
                  SHOP NOW
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button
                  onClick={() => window.scrollTo({ top: 850, behavior: 'smooth' })}
                  variant="outline"
                  className="h-[52px] px-8 rounded-lg font-bold transition-all border border-border-subtle bg-white text-slate-700 hover:border-primary hover:bg-slate-50"
                  data-testid="hero-learn-button"
                >
                  LEARN MORE
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="md:col-span-5"
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden shadow-emerald-glow border border-border-subtle p-2 bg-white">
                <div className="w-full h-full rounded-xl overflow-hidden relative group">
                  <img
                    src="https://images.pexels.com/photos/7325110/pexels-photo-7325110.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                    alt="Aluminum foil texture"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 md:py-32 bg-surface border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="text-center mb-20">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-primary mb-3 inline-block">
              HYGIENIC & RUGGED
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-ink-slate font-manrope">
              Why Choose Durga Shakti Foils?
            </h2>
            <p className="text-sm md:text-base text-on-surface-variant max-w-xl mx-auto mt-3 font-medium">
              Culinary grade purity combined with heavy-duty durability for commercial and residential kitchens.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Shield,
                title: 'Food Grade Certified',
                description: 'ISO certified virgin alloy, optimized for safe and direct culinary packaging contact.'
              },
              {
                icon: Sparkles,
                title: '100% Purity Guaranteed',
                description: 'Full width and length specifications met with zero recycled lead additives.'
              },
              {
                icon: Award,
                title: 'High Tensile Strength',
                description: 'Reinforced thickness prevent tears when wrapping large cuts or tray configurations.'
              },
              {
                icon: Truck,
                title: 'Industrial Logistical Flow',
                description: 'Direct shipment corridors ensure rapid delivery to commercial hubs across India.'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white border border-border-subtle p-8 rounded-xl hover:shadow-emerald-glow hover:border-primary/50 transition-all duration-300 flex flex-col justify-between h-[250px]"
              >
                <div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6 text-primary">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg font-manrope text-ink-slate mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed font-medium">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 md:py-32 bg-surface-container-low border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="flex justify-between items-end mb-16">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-primary mb-3 inline-block">
                PREMIUM ALLOY
              </span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-ink-slate font-manrope">
                Featured Products
              </h2>
              <p className="text-sm md:text-base text-on-surface-variant mt-2 font-medium">
                Our most in-demand aluminum foil thickness and width ranges.
              </p>
            </div>
            <Button
              onClick={() => navigate('/shop')}
              variant="outline"
              className="hidden md:flex bg-white hover:bg-slate-50 border border-border-subtle text-slate-700 font-bold px-6 rounded-lg h-[52px]"
              data-testid="view-all-products-button"
            >
              VIEW ALL
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>

          {loading ? null : (
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

          <div className="text-center mt-12 md:hidden">
            <Button 
              onClick={() => navigate('/shop')} 
              variant="outline" 
              className="bg-white hover:bg-slate-50 border border-border-subtle text-slate-700 font-bold w-full h-[52px]"
              data-testid="view-all-mobile-button"
            >
              View All Products
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 bg-surface">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-primary mb-4 inline-block">
              UPGRADE YOUR PACKAGING
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-ink-slate font-manrope mb-6">
              Ready to Experience Premium Quality?
            </h2>
            <p className="text-base text-on-surface-variant mb-8 max-w-xl mx-auto font-medium">
              Join commercial kitchens and food warehouses who trust Durga Shakti Foils for pure, heavy-duty culinary heat protection.
            </p>
            <Button
              onClick={() => navigate('/shop')}
              className="bg-primary text-white hover:bg-emerald-hover h-[52px] px-8 rounded-lg font-bold tracking-wider shadow-sm active:scale-95 transition-transform"
              data-testid="cta-shop-button"
            >
              START SHOPPING
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;