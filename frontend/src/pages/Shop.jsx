import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import TablePagination from '../components/ui/TablePagination';
import api from '../utils/api';
import apiClient from '../services/core/apiClient';
import { getProductPricing } from '../utils/productPricing';
import { SlidersHorizontal, Star, ChevronRight } from 'lucide-react';
import PageLoader from '../components/ui/PageLoader';

const PRODUCTS_CACHE_KEY = 'dsf_shop_products_v1';
const CATEGORIES_CACHE_KEY = 'dsf_shop_categories_v1';

const readSessionList = (key) => {
  if (typeof window === 'undefined') return [];
  try {
    const cached = window.sessionStorage.getItem(key);
    if (!cached) return [];
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
};

const writeSessionList = (key, items) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ items, time: Date.now() }));
  } catch {
    // Ignore storage quota/private-mode errors.
  }
};

const productNameCompare = (a, b) => (
  String(a?.name || '').localeCompare(String(b?.name || ''), 'en', { sensitivity: 'base', numeric: true }) ||
  String(a?.id || '').localeCompare(String(b?.id || ''))
);

const normalizeShopProducts = (items = []) => [...items].sort(productNameCompare);

const Shop = () => {
  const getInitialProducts = () => {
    const cachedResponse = apiClient.getCachedDataSync('/products');
    return normalizeShopProducts(cachedResponse?.data?.items || readSessionList(PRODUCTS_CACHE_KEY));
  };
  const getInitialCategories = () => {
    const cachedResponse = apiClient.getCachedDataSync('/categories');
    return cachedResponse?.data || readSessionList(CATEGORIES_CACHE_KEY);
  };

  const initialProducts = getInitialProducts();
  const initialCategories = getInitialCategories();

  const [products, setProducts] = useState(initialProducts);
  const [filteredProducts, setFilteredProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(!initialProducts.length);
  const [priceFilter, setPriceFilter] = useState('all');
  const [maxPrice, setMaxPrice] = useState(1000);
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const ITEMS_PER_PAGE = 12;

  const fetchProducts = useCallback(async () => {
    const hasInstantData = !!apiClient.getCachedDataSync('/products') || readSessionList(PRODUCTS_CACHE_KEY).length > 0;
    if (!hasInstantData) {
      setLoading(true);
    }
    try {
      const response = await api.getProducts();
      const items = normalizeShopProducts(response.data.items || []);
      setProducts(items);
      setFilteredProducts(items);
      writeSessionList(PRODUCTS_CACHE_KEY, items);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiClient.cachedGet('/categories');
      const items = response.data || [];
      setCategories(items);
      writeSessionList(CATEGORIES_CACHE_KEY, items);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = [...products];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        (p.name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'all') {
      const filterLower = categoryFilter.toLowerCase();
      if (filterLower === 'kitchen' || filterLower === 'foil & wrapper') {
        filtered = filtered.filter(p => {
          const cat = (p.category || '').toLowerCase();
          return cat === 'foil roll' || cat === 'kitchen' || cat === 'foil & wrapper';
        });
      } else {
        filtered = filtered.filter(p => (p.category || '').toLowerCase() === filterLower);
      }
    }

    // Price filter
    if (priceFilter === 'under200') {
      filtered = filtered.filter(p => getProductPricing(p).displayPrice < 200);
    } else if (priceFilter === '200to500') {
      filtered = filtered.filter(p => {
        const price = getProductPricing(p).displayPrice;
        return price >= 200 && price < 500;
      });
    } else if (priceFilter === 'over500') {
      filtered = filtered.filter(p => getProductPricing(p).displayPrice >= 500);
    } else if (priceFilter === '0to250') {
      filtered = filtered.filter(p => getProductPricing(p).displayPrice <= 250);
    } else if (priceFilter === '250to500') {
      filtered = filtered.filter(p => {
        const price = getProductPricing(p).displayPrice;
        return price >= 250 && price <= 500;
      });
    } else if (priceFilter === '500to1000') {
      filtered = filtered.filter(p => {
        const price = getProductPricing(p).displayPrice;
        return price >= 500 && price <= 1000;
      });
    }

    // Slider filter
    if (maxPrice < 1000) {
      filtered = filtered.filter(p => getProductPricing(p).displayPrice <= maxPrice);
    }

    if (ratingFilter !== 'all') {
      const minimumRating = Number(ratingFilter);
      filtered = filtered.filter(p => Number(p.review_count || 0) > 0 && Number(p.rating_average || 0) >= minimumRating);
    }

    // Sort
    if (sortBy === 'price-low') {
      filtered.sort((a, b) => getProductPricing(a).displayPrice - getProductPricing(b).displayPrice || productNameCompare(a, b));
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => getProductPricing(b).displayPrice - getProductPricing(a).displayPrice || productNameCompare(a, b));
    } else if (sortBy === 'rating-high') {
      filtered.sort((a, b) => Number(b.rating_average || 0) - Number(a.rating_average || 0) || productNameCompare(a, b));
    } else {
      filtered.sort(productNameCompare);
    }

    setFilteredProducts(filtered);
    setPage(1); // Reset to first page when filters change
  }, [products, categoryFilter, priceFilter, ratingFilter, sortBy, searchQuery, maxPrice]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const handleClearFilters = () => {
    setCategoryFilter('all');
    setPriceFilter('all');
    setMaxPrice(1000);
    setRatingFilter('all');
    setSortBy('name');
    if (searchParams.has('search')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('search');
      setSearchParams(newParams);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-inter text-[#1E293B]" data-testid="shop-page">
      {/* Responsive React Hero Banner Component */}
      <div 
        className="w-full relative overflow-hidden border-b border-slate-800 px-6 md:px-12 lg:px-16 py-6 md:py-0 flex flex-col md:flex-row items-center justify-between gap-6 min-h-[220px] md:h-[280px] lg:h-[320px]"
        style={{ 
          background: "url('/shop-hero-bg.webp') left center / contain no-repeat, linear-gradient(90deg, #0d0e11 0%, #15171a 100%)"
        }}
      >
        {/* Subtle decorative radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,rgba(15,92,46,0.18),transparent_50%)] pointer-events-none" />
        
        {/* Left Side: Premium Typography and Branding */}
        <div className="flex-1 text-white z-10 max-w-xl md:py-6">
          <h1 className="text-3xl md:text-4xl lg:text-[46px] font-extrabold tracking-tight mb-3 leading-tight font-manrope bg-gradient-to-r from-white via-slate-100 to-slate-350 bg-clip-text text-transparent">
            Our Products
          </h1>
          <p className="text-xs md:text-sm lg:text-base text-slate-400 font-normal leading-relaxed max-w-md">
            Choose Hot Wrap Foils for a healthier & greener tomorrow, Premium food-grade aluminum foil commercial strength and clinical hygiene.
          </p>
        </div>

        {/* Right Side: Product Family Image - Preserved sharp scaling, no cropping */}
        <div className="flex-1 w-full h-full max-h-[180px] md:max-h-full flex items-center justify-center md:justify-end z-10 md:h-[280px] lg:h-[320px]">
          <img 
            src="/shop-hero-products.webp" 
            alt="Durga Shakti premium food-grade aluminum foils family"
            className="h-full w-auto max-h-[160px] md:max-h-[240px] lg:max-h-[280px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] transition-transform duration-500 hover:scale-102"
          />
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12 py-10">
        {/* Collapsible Mobile Filters Button */}
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="lg:hidden w-full flex items-center justify-center gap-2 py-3 bg-[#0F5C2E] hover:bg-[#0c4a24] text-white font-extrabold rounded-xl shadow-sm mb-6 transition-all duration-200"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>{showMobileFilters ? 'HIDE FILTERS' : 'SHOW FILTERS'}</span>
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className={`lg:w-80 flex-shrink-0 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white border border-slate-200/60 p-6 rounded-2xl sticky top-24 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-extrabold text-xs font-manrope text-slate-800 uppercase tracking-wider">
                  Category
                </h2>
                {(categoryFilter !== 'all' || priceFilter !== 'all' || maxPrice !== 1000 || ratingFilter !== 'all' || sortBy !== 'name') && (
                  <button 
                    onClick={handleClearFilters}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'all', label: 'All Category' },
                      { value: 'Kitchen', label: 'Kitchen' },
                      { value: 'Food Container', label: 'Food Container' },
                      { value: 'Foil & Wrapper', label: 'Foil & Wrapper' }
                    ].map(opt => {
                      const isActive = categoryFilter === opt.value;
                      return (
                        <label key={opt.value} className={`relative flex items-center justify-center px-4 py-2 rounded-full border text-[11px] font-bold cursor-pointer transition-all duration-200 select-none
                          ${isActive 
                            ? 'bg-[#0F5C2E] text-white border-[#0F5C2E]' 
                            : 'bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100'}`}
                        >
                          <input
                            type="radio"
                            name="category"
                            value={opt.value}
                            checked={categoryFilter === opt.value}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="sr-only"
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-200/60 pt-6">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 block">Price</label>
                  {/* Custom Range Slider */}
                  <div className="mb-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="1000" 
                      value={maxPrice} 
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      className="w-full accent-[#0F5C2E] h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between items-center mt-2 text-[10px] font-bold text-slate-550 font-mono">
                      <span>min ₹0</span>
                      <span>max ₹{maxPrice}</span>
                    </div>
                  </div>
                  {/* Radio Buttons below slider in a flex wrapping layout */}
                  <div className="flex flex-wrap gap-x-4 gap-y-2.5 mt-4">
                    {[
                      { value: 'all', label: 'All' },
                      { value: '0to250', label: '₹0 - ₹250' },
                      { value: '250to500', label: '₹250 - ₹500' },
                      { value: '500to1000', label: '₹500 - ₹1000' }
                    ].map(option => {
                      const isActive = priceFilter === option.value;
                      return (
                        <label key={option.value} className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="price"
                            value={option.value}
                            checked={priceFilter === option.value}
                            onChange={(e) => {
                              setPriceFilter(e.target.value);
                              // Auto sync slider if they select a radio
                              if (option.value === '0to250') setMaxPrice(250);
                              else if (option.value === '250to500') setMaxPrice(500);
                              else if (option.value === '500to1000') setMaxPrice(1000);
                              else if (option.value === 'all') setMaxPrice(1000);
                            }}
                            className="w-3.5 h-3.5 accent-[#0F5C2E]"
                          />
                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-200/60 pt-6">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 block">Customer Rating</label>
                  <div className="flex flex-col gap-2.5">
                    {[
                      { value: '4.5', label: '4.5 & above (68)', stars: 5, empty: 0 },
                      { value: '4.0', label: '4.0 & above (116)', stars: 4, empty: 1 },
                      { value: '3.5', label: '3.5 & above (247)', stars: 3, empty: 2 },
                      { value: '3.0', label: '3.0 & above (421)', stars: 2, empty: 3 }
                    ].map(option => {
                      const isActive = ratingFilter === option.value;
                      return (
                        <div 
                          key={option.value} 
                          onClick={() => setRatingFilter(isActive ? 'all' : option.value)}
                          className={`flex items-center gap-2 cursor-pointer transition-all duration-150 py-0.5 rounded hover:bg-slate-100/50 ${isActive ? 'opacity-100 font-extrabold text-[#0F5C2E]' : 'opacity-85'}`}
                        >
                          <span className="flex items-center gap-1">
                            <span className="flex items-center">
                              {[...Array(option.stars)].map((_, i) => (
                                <Star key={`gold-${i}`} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              ))}
                              {[...Array(option.empty)].map((_, i) => (
                                <Star key={`gray-${i}`} className="w-3.5 h-3.5 text-slate-350" />
                              ))}
                            </span>
                            <span className="text-[11px] font-bold text-slate-650 ml-1.5">{option.label}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-200/60 pt-6">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 block">Sort By</label>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:border-[#0F5C2E] focus:ring-1 focus:ring-[#0F5C2E]/20 text-slate-700 font-bold uppercase tracking-wider appearance-none cursor-pointer"
                      data-testid="sort-select"
                    >
                      <option value="name">Name</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="rating-high">Rating: High to Low</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Products Grid */}
          <div className="flex-1">
            {searchQuery && (
              <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">
                  Search results for: <strong className="text-primary font-extrabold">"{searchQuery}"</strong>
                </span>
                <button
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('search');
                    setSearchParams(newParams);
                  }}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider transition-colors"
                >
                  Clear Search
                </button>
              </div>
            )}
            {loading ? <PageLoader /> : filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-border-subtle p-8 shadow-sm">
                <p className="text-on-surface-variant font-medium">No products found match your active filters.</p>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-6" data-testid="product-count">
                  SHOWING {filteredProducts.length} PRODUCT{filteredProducts.length !== 1 ? 'S' : ''}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 auto-rows-fr gap-6">
                  {filteredProducts.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE).map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="h-full"
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </div>
                <div className="mt-12">
                  <TablePagination
                    currentPage={page}
                    totalPages={Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)}
                    onPageChange={setPage}
                    totalItems={filteredProducts.length}
                    pageSize={ITEMS_PER_PAGE}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
