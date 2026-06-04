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
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const ITEMS_PER_PAGE = 9;

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
      filtered = filtered.filter(p => p.category === categoryFilter);
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
  }, [products, categoryFilter, priceFilter, ratingFilter, sortBy, searchQuery]);

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
    setRatingFilter('all');
    setSortBy('name');
    if (searchParams.has('search')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('search');
      setSearchParams(newParams);
    }
  };

  return (
    <div className="min-h-screen bg-surface py-12 font-inter text-on-surface" data-testid="shop-page">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
        {/* Premium Header Banner */}
        <div className="mb-12 rounded-3xl overflow-hidden relative border border-border-subtle p-8 md:p-12 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
          {/* Subtle grid and glow design details */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.25em] text-primary bg-primary/10 px-3.5 py-1.5 rounded-full inline-block mb-4 border border-primary/20">
              PREMIUM PRODUCTS
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white font-manrope mb-4" data-testid="shop-title">
              Our Products
            </h1>
            <p className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed">
              Choose Hot Wrap Foils for a healthier & greener tomorrow. Premium food-grade aluminum foil engineered for commercial strength and clinical hygiene.
            </p>
          </div>
        </div>

        {/* Collapsible Mobile Filters Button */}
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="lg:hidden w-full flex items-center justify-center gap-2 py-3 bg-[#39c653] hover:bg-[#48d862] text-white font-extrabold rounded-xl shadow-sm mb-6 transition-all duration-200"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>{showMobileFilters ? 'HIDE FILTERS' : 'SHOW FILTERS'}</span>
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className={`lg:w-80 flex-shrink-0 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white border border-border-subtle p-6 rounded-2xl shadow-sm sticky top-24">
              <div className="flex items-center justify-between mb-6 border-b border-border-subtle pb-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-sm font-manrope text-ink-slate uppercase tracking-wider">
                    Filters
                  </h2>
                </div>
                {(categoryFilter !== 'all' || priceFilter !== 'all' || ratingFilter !== 'all' || sortBy !== 'name') && (
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
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 block">Category</label>
                  <div className="flex flex-wrap gap-2">
                    <label className={`relative flex items-center justify-center px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 select-none
                      ${categoryFilter === 'all' 
                        ? 'bg-primary text-white border-primary shadow-emerald-glow' 
                        : 'bg-slate-50 text-slate-600 border-border-subtle hover:bg-slate-100 hover:text-slate-800'}`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value="all"
                        checked={categoryFilter === 'all'}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="sr-only"
                        data-testid="filter-category-all"
                      />
                      <span>All Categories</span>
                    </label>
                    {categories.map(category => (
                      <label key={category.id || category.name} className={`relative flex items-center justify-center px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 select-none
                        ${categoryFilter === category.name 
                          ? 'bg-primary text-white border-primary shadow-emerald-glow' 
                          : 'bg-slate-50 text-slate-600 border-border-subtle hover:bg-slate-100 hover:text-slate-800'}`}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={category.name}
                          checked={categoryFilter === category.name}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className="sr-only"
                          data-testid={`filter-category-${category.name}`}
                        />
                        <span>{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border-subtle pt-6">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 block">Price Range</label>
                  <div className="flex flex-col gap-2">
                    {[
                      { value: 'all', label: 'All Prices' },
                      { value: 'under200', label: 'Under ₹200' },
                      { value: '200to500', label: '₹200 - ₹500' },
                      { value: 'over500', label: 'Over ₹500' }
                    ].map(option => {
                      const isActive = priceFilter === option.value;
                      return (
                        <label key={option.value} className={`relative flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold cursor-pointer transition-all duration-200 select-none
                          ${isActive 
                            ? 'bg-primary/5 text-primary border-primary font-extrabold' 
                            : 'bg-white text-slate-600 border-border-subtle hover:bg-slate-50'}`}
                        >
                          <input
                            type="radio"
                            name="price"
                            value={option.value}
                            checked={priceFilter === option.value}
                            onChange={(e) => setPriceFilter(e.target.value)}
                            className="sr-only"
                            data-testid={`filter-price-${option.value}`}
                          />
                          <span>{option.label}</span>
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0
                            ${isActive ? 'border-primary bg-primary' : 'border-slate-300'}`}
                          >
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-border-subtle pt-6">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 block">Customer Rating</label>
                  <div className="flex flex-col gap-2">
                    {[
                      { value: 'all', label: 'All Ratings' },
                      { value: '4', label: '4 Stars & Up' },
                      { value: '3', label: '3 Stars & Up' },
                      { value: '2', label: '2 Stars & Up' },
                      { value: '1', label: '1 Star & Up' }
                    ].map(option => {
                      const isActive = ratingFilter === option.value;
                      return (
                        <label key={option.value} className={`relative flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold cursor-pointer transition-all duration-200 select-none
                          ${isActive 
                            ? 'bg-primary/5 text-primary border-primary font-extrabold' 
                            : 'bg-white text-slate-600 border-border-subtle hover:bg-slate-50'}`}
                        >
                          <input
                            type="radio"
                            name="rating"
                            value={option.value}
                            checked={ratingFilter === option.value}
                            onChange={(e) => setRatingFilter(e.target.value)}
                            className="sr-only"
                            data-testid={`filter-rating-${option.value}`}
                          />
                          <span className="flex items-center gap-1.5">
                            {option.value !== 'all' ? (
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`w-3.5 h-3.5 ${i < Number(option.value) 
                                      ? 'text-amber-400 fill-amber-400' 
                                      : 'text-slate-200 fill-slate-100'}`} 
                                  />
                                ))}
                                <span className="ml-1 text-slate-400 font-semibold text-[10px] uppercase font-mono">({option.label})</span>
                              </div>
                            ) : (
                              <span>{option.label}</span>
                            )}
                          </span>
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0
                            ${isActive ? 'border-primary bg-primary' : 'border-slate-300'}`}
                          >
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-border-subtle pt-6">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 block">Sort By</label>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full h-11 rounded-xl border border-border-subtle bg-white px-4 text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-700 font-bold uppercase tracking-wider appearance-none cursor-pointer"
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 auto-rows-fr gap-8">
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
