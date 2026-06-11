import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import TablePagination from '../components/ui/TablePagination';
import api from '../utils/api';
import apiClient from '../services/core/apiClient';
import { getProductPricing } from '../utils/productPricing';
import { SlidersHorizontal, Star, ChevronRight, X, Check } from 'lucide-react';
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
  const [maxPrice, setMaxPrice] = useState(10000);
  const [hasInitializedMaxPrice, setHasInitializedMaxPrice] = useState(false);
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const ITEMS_PER_PAGE = 12;

  const calculateDynamicMaxPrice = (maxPriceVal) => {
    if (!maxPriceVal || maxPriceVal <= 0) return 1000;
    if (maxPriceVal <= 100) return Math.ceil(maxPriceVal / 10) * 10;
    if (maxPriceVal <= 500) return Math.ceil(maxPriceVal / 50) * 50;
    if (maxPriceVal <= 2000) return Math.ceil(maxPriceVal / 100) * 100;
    if (maxPriceVal <= 5000) return Math.ceil(maxPriceVal / 500) * 500;
    return Math.ceil(maxPriceVal / 1000) * 1000;
  };

  const getProductsMaxPrice = () => {
    if (products.length === 0) return 10000;
    const maxVal = Math.max(...products.map(p => getProductPricing(p).displayPrice));
    return calculateDynamicMaxPrice(maxVal);
  };

  const computedMaxPrice = getProductsMaxPrice();

  useEffect(() => {
    if (products.length > 0 && !hasInitializedMaxPrice) {
      setMaxPrice(computedMaxPrice);
      setHasInitializedMaxPrice(true);
    }
  }, [products, hasInitializedMaxPrice, computedMaxPrice]);

  const getRatingCount = (minRating) => {
    return products
      .filter(p => Number(p.rating_average || 0) >= minRating)
      .reduce((sum, p) => sum + Number(p.review_count || 0), 0);
  };

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
    if (maxPrice < computedMaxPrice) {
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
  }, [products, categoryFilter, priceFilter, ratingFilter, sortBy, searchQuery, maxPrice, computedMaxPrice]);

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
    setMaxPrice(computedMaxPrice);
    setRatingFilter('all');
    setSortBy('name');
    if (searchParams.has('search')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('search');
      setSearchParams(newParams);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C1310] font-sans text-white" data-testid="shop-page">
      {/* Premium Header Banner - full width img element with controlled height for professional UI */}
      <div className="w-full overflow-hidden border-b border-[#26322B] h-auto aspect-[1024/230] md:aspect-none md:h-[320px] lg:h-[370px] bg-[#111111]">
        <div className="max-w-[1440px] mx-auto w-full h-full">
          <img 
            src="/product_display_poster.png" 
            alt="Our Products - Choose Hot Wrap Foils for a healthier & greener tomorrow. Premium food-grade aluminum foil commercial strength and clinical hygiene."
            className="w-full h-full object-cover object-[center_43%] block"
          />
        </div>
      </div>

      <div className="w-full px-4 md:px-8 lg:px-12 py-10">
        {/* Mobile Toolbar: Results Count and compact Filter Toggle side-by-side */}
        <div className="lg:hidden flex items-center justify-between mb-6">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-450">
            SHOWING {filteredProducts.length} PRODUCT{filteredProducts.length !== 1 ? 'S' : ''}
          </p>
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`inline-flex items-center justify-center w-[40px] h-[40px] rounded-xl border transition-all shadow-sm shrink-0 ${
              showMobileFilters
                ? 'border-[#25D958] bg-[#25D958]/10 text-[#25D958]'
                : 'border-[#26322B] bg-[#131B17] text-white hover:bg-[#19231F]'
            }`}
            title="Toggle Filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Sliding Sidebar Drawer Backdrop on Mobile */}
        {showMobileFilters && (
          <div 
            className="lg:hidden fixed inset-0 bg-[#0C1310]/80 backdrop-blur-sm z-[90] transition-opacity duration-300"
            onClick={() => setShowMobileFilters(false)}
          />
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar Drawer */}
          <div className={`
            lg:relative lg:block lg:w-80 lg:translate-x-0 lg:z-auto lg:p-0 lg:border-none lg:bg-transparent lg:shadow-none
            fixed inset-y-0 left-0 w-80 bg-[#0C1310] z-[100] shadow-2xl p-6 overflow-y-auto transition-transform duration-300 border-r border-[#26322B]
            ${showMobileFilters ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>
            <div className="bg-[#131B17] lg:border lg:border-[#26322B] lg:p-6 lg:rounded-2xl sticky top-24 lg:shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-extrabold text-xs font-sans text-white uppercase tracking-wider">
                  Category
                </h2>
                <div className="flex items-center gap-3">
                  {(categoryFilter !== 'all' || priceFilter !== 'all' || maxPrice !== computedMaxPrice || ratingFilter !== 'all' || sortBy !== 'name') && (
                    <button 
                      onClick={handleClearFilters}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                  <button 
                    onClick={() => setShowMobileFilters(false)}
                    className="lg:hidden p-1 text-slate-400 hover:text-white"
                    title="Close Filters"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="relative">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#26322B] bg-[#131B17] px-3 text-xs focus:outline-none focus:border-[#25D958] focus:ring-1 focus:ring-[#25D958]/20 text-white font-bold uppercase tracking-wider appearance-none cursor-pointer"
                    >
                      <option value="all">All Category</option>
                      {categories
                        .filter(c => c.is_active)
                        .map(cat => (
                          <option key={cat.id || cat.name} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#25D958]">
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#26322B] pt-6">
                  <label className="text-xs font-bold text-white uppercase tracking-wider mb-3 block">Price</label>
                  {/* Custom Range Slider */}
                  <div className="mb-4">
                    <input 
                      type="range" 
                      min="0" 
                      max={computedMaxPrice} 
                      value={maxPrice} 
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      className="w-full accent-[#25D958] h-1.5 bg-[#26322B] rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between items-center mt-2 text-[10px] font-bold text-slate-400 font-mono">
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
                      return (
                        <label key={option.value} className="flex items-center gap-2 text-[11px] font-bold text-slate-300 cursor-pointer select-none">
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
                              else if (option.value === 'all') setMaxPrice(computedMaxPrice);
                            }}
                            className="w-3.5 h-3.5 accent-[#25D958]"
                          />
                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-[#26322B] pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-white uppercase tracking-wider block">Customer Rating</label>
                    {ratingFilter !== 'all' && (
                      <button
                        onClick={() => setRatingFilter('all')}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {[
                      { value: '4.5', label: `4.5 & above (${getRatingCount(4.5)})`, stars: 5, empty: 0 },
                      { value: '4.0', label: `4.0 & above (${getRatingCount(4.0)})`, stars: 4, empty: 1 },
                      { value: '3.5', label: `3.5 & above (${getRatingCount(3.5)})`, stars: 3, empty: 2 },
                      { value: '3.0', label: `3.0 & above (${getRatingCount(3.0)})`, stars: 2, empty: 3 }
                    ].map(option => {
                      const isActive = ratingFilter === option.value;
                      return (
                        <div 
                          key={option.value} 
                          onClick={() => setRatingFilter(isActive ? 'all' : option.value)}
                          className={`flex items-center justify-between cursor-pointer transition-all duration-150 py-2 px-3 rounded-xl border ${isActive ? 'bg-[#25D958]/10 border-[#25D958] text-[#25D958] font-black' : 'bg-[#19231F] border-[#26322B] text-slate-300 hover:bg-[#1f2c27]'}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${isActive ? 'border-[#25D958] bg-[#25D958]' : 'border-[#26322B] bg-[#131B17]'}`}>
                              {isActive && <Check className="w-2.5 h-2.5 text-[#0C1310] stroke-[3px]" />}
                            </div>
                            <span className="flex items-center">
                              {[...Array(option.stars)].map((_, i) => (
                                <Star key={`gold-${i}`} className="w-3 h-3 text-amber-400 fill-amber-400" />
                              ))}
                              {[...Array(option.empty)].map((_, i) => (
                                <Star key={`gray-${i}`} className="w-3 h-3 text-slate-650" />
                              ))}
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-wider font-mono ml-1">{option.label}</span>
                          </div>
                          {isActive && (
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  setRatingFilter('all');
                              }}
                              className="p-0.5 rounded-full hover:bg-[#25D958]/20 text-[#25D958]"
                              title="Clear Rating Filter"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-[#26322B] pt-6">
                  <label className="text-xs font-bold text-white uppercase tracking-wider mb-3 block">Sort By</label>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#26322B] bg-[#131B17] px-3 text-xs focus:outline-none focus:border-[#25D958] focus:ring-1 focus:ring-[#25D958]/20 text-white font-bold uppercase tracking-wider appearance-none cursor-pointer"
                      data-testid="sort-select"
                    >
                      <option value="name">Name</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="rating-high">Rating: High to Low</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#25D958]">
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
              <div className="mb-6 p-4 rounded-xl border border-[#25D958]/20 bg-[#25D958]/5 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-350">
                  Search results for: <strong className="text-[#25D958] font-extrabold">"{searchQuery}"</strong>
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
              <div className="text-center py-16 bg-[#131B17] rounded-2xl border border-[#26322B] p-8">
                <p className="text-slate-400 font-medium">No products found match your active filters.</p>
              </div>
            ) : (
              <>
                <p className="hidden lg:block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-6" data-testid="product-count">
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
                    variant="dark"
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
