import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Shield, Truck, Award, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
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
  const [activeHotspot, setActiveHotspot] = useState('micron');

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

  const hotspots = {
    micron: {
      id: 'micron',
      title: '11 Micron Thickness',
      subtitle: 'Optimal Tensile Strength',
      description: 'Perfected through rigorous engineering. Our 11-micron thickness provides the ideal balance between flexibility and tear-resistance. Wrap heavy roasts, paneer rolls, or catering trays without double-layering.',
      details: ['High puncture resistance', 'Eliminates waste from tearing', 'Perfect for commercial wrapping'],
      icon: Sparkles,
    },
    purity: {
      id: 'purity',
      title: '100% Pure Virgin Alloy',
      subtitle: 'Clinical Food Purity',
      description: 'Certified ISO food-safe. Crafted exclusively from premium virgin alloy, eliminating toxic recycled metals like lead. Safely wrap acid-based foods, citrus, or salty grills without risk of leaching.',
      details: ['ISO 22000 certified manufacturing', 'Zero chemical coatings', '100% recyclable material'],
      icon: Shield,
    },
    thermal: {
      id: 'thermal',
      title: 'Thermal Lock Insulation',
      subtitle: 'Always Hot & Fresh',
      description: 'Advanced moisture and heat barrier. Retains core temperatures up to 2.5x longer than standard thin foils. Locks in juices, flavor profiles, and culinary heat for home deliveries and catering runs.',
      details: ['Excellent heat retention', 'Keeps bakery goods crisp', 'Locks in aromatic spices'],
      icon: Award,
    },
    eco: {
      id: 'eco',
      title: 'Greener Tomorrow',
      subtitle: 'Sustainable Preservation',
      description: 'DurgaShakti Foils promotes eco-friendly kitchen practices. Our aluminum foil is infinitely recyclable, and our manufacturing plants operate with high energy-efficiency standards, reducing carbon footprints.',
      details: ['Recyclable aluminum', 'Minimal eco-impact', 'Reduces plastic cling-wrap usage'],
      icon: Truck,
    }
  };

  return (
    <div className="min-h-screen bg-surface font-inter text-on-surface" data-testid="home-page">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-32 bg-gradient-to-b from-surface-container-low to-surface border-b border-border-subtle">
        {/* Technical grids/glows for depth */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,110,27,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,110,27,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -mr-32 -mt-32" />
        
        <div className="relative max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="md:col-span-7"
            >
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-primary bg-primary/10 px-3.5 py-1.5 rounded-full inline-block mb-6 border border-primary/20">
                100% FOOD GRADE CERTIFIED
              </span>
              <h1
                className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.05] mb-6 font-manrope text-ink-slate"
                data-testid="hero-title"
              >
                Wrap it right,<br />
                <span className="text-amber-500 bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">KEEP IT HOT</span>,<br />
                <span className="text-primary bg-gradient-to-r from-primary to-emerald-hover bg-clip-text text-transparent">KEEP IT FRESH!</span>
              </h1>
              <p className="text-base md:text-lg leading-relaxed text-on-surface-variant mb-8 max-w-2xl font-semibold">
                Choose Hot Wrap Foils for a healthier & greener tomorrow. Premium food-grade aluminum foil engineered for commercial strength and clinical hygiene.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => navigate('/shop')}
                  size="default"
                  className="bg-primary text-white hover:bg-emerald-hover h-[52px] px-8 rounded-lg font-bold tracking-wider shadow-sm transition-transform active:scale-98"
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

              {/* Technical Specifications Overlay */}
              <div className="mt-10 pt-8 border-t border-border-subtle grid grid-cols-3 gap-4">
                <div>
                  <span className="block text-xl md:text-2xl font-black text-primary font-manrope">11 Microns</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Thickness</span>
                </div>
                <div>
                  <span className="block text-xl md:text-2xl font-black text-primary font-manrope">72 Meters</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Length Option</span>
                </div>
                <div>
                  <span className="block text-xl md:text-2xl font-black text-primary font-manrope">100% Pure</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Virgin Alloy</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="md:col-span-5"
            >
              <div className="relative aspect-[4/3] md:aspect-square rounded-3xl overflow-hidden shadow-emerald-glow border border-border-subtle p-2.5 bg-white transition-all duration-500 hover:shadow-2xl">
                <div className="w-full h-full rounded-2xl overflow-hidden relative group">
                  <img
                    src="/product_display_poster.png"
                    alt="Durga Shakti Foils - Premium food grade aluminum foil packaging product ecosystem"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Floating badge */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-white/20 shadow-lg flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-primary">PREMIUM PACKAGING</span>
                      <h4 className="font-bold text-slate-800 text-xs font-manrope">DurgaShakti Hot Wrap</h4>
                    </div>
                    <span className="bg-primary text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Active Shield
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Anatomy / Interactive Specs Section */}
      <section className="py-24 md:py-32 bg-white border-b border-border-subtle relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
        
        <div className="relative max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="text-center mb-16">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-primary mb-3 inline-block">
              TECHNICAL PRECISION
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-ink-slate font-manrope">
              The Anatomy of Purity & Performance
            </h2>
            <p className="text-sm md:text-base text-on-surface-variant max-w-xl mx-auto mt-3 font-medium">
              Explore the engineering choices that make DurgaShakti Hot Wrap Foils the trusted selection for professional kitchens.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Interactive Selector Buttons */}
            <div className="lg:col-span-5 space-y-4">
              {Object.values(hotspots).map((item) => {
                const IconComponent = item.icon;
                const isActive = activeHotspot === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveHotspot(item.id)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 focus:outline-none 
                      ${isActive 
                        ? 'bg-primary/5 border-primary shadow-emerald-glow' 
                        : 'bg-white border-border-subtle hover:border-slate-300'}`}
                  >
                    <div className={`p-2.5 rounded-xl shrink-0 transition-colors 
                      ${isActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 text-base font-manrope">{item.title}</h4>
                      <p className="text-xs text-text-muted mt-0.5 font-medium">{item.subtitle}</p>
                    </div>
                    <ChevronRight className={`w-5 h-5 ml-auto self-center transition-transform duration-300 
                      ${isActive ? 'text-primary translate-x-1' : 'text-slate-300'}`} 
                    />
                  </button>
                );
              })}
            </div>

            {/* Display Card for Active Spec */}
            <div className="lg:col-span-7">
              <div className="bg-gradient-to-br from-surface-bright to-surface-container-low border border-border-subtle p-8 md:p-10 rounded-3xl shadow-xl min-h-[380px] flex flex-col justify-between relative overflow-hidden">
                {/* Visual foil texture accent */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,110,27,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,110,27,0.01)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeHotspot}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="relative z-10"
                  >
                    <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 inline-block mb-6">
                      {hotspots[activeHotspot].subtitle}
                    </span>
                    <h3 className="text-2xl md:text-3xl font-extrabold text-ink-slate font-manrope mb-4">
                      {hotspots[activeHotspot].title}
                    </h3>
                    <p className="text-sm md:text-base leading-relaxed text-on-surface-variant font-medium mb-8">
                      {hotspots[activeHotspot].description}
                    </p>
                    
                    <div className="space-y-3">
                      {hotspots[activeHotspot].details.map((detail, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-xs md:text-sm text-slate-700 font-semibold">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="pt-8 border-t border-border-subtle mt-8 flex items-center justify-between relative z-10">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">DurgaShakti Foils</span>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/shop')}
                    className="text-primary hover:text-emerald-hover text-xs font-bold gap-1 px-3 py-1 hover:bg-transparent"
                  >
                    Explore in Shop
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
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
                description: 'Reinforced thickness prevents tears when wrapping large cuts or tray configurations.'
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
                className="bg-white border border-border-subtle p-8 rounded-2xl hover:shadow-emerald-glow hover:border-primary/50 transition-all duration-300 flex flex-col justify-between h-[260px] hover:-translate-y-1"
              >
                <div>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary">
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