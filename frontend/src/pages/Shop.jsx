import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import TablePagination from '../components/ui/TablePagination';
import api from '../utils/api';
import apiClient from '../services/core/apiClient';
import { getProductPricing } from '../utils/productPricing';
import { SlidersHorizontal, Star } from 'lucide-react';
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

const Shop = () => {
  const getInitialProducts = () => {
    const cachedResponse = apiClient.getCachedDataSync('/products');
    return cachedResponse?.data?.items || readSessionList(PRODUCTS_CACHE_KEY);
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
  const ITEMS_PER_PAGE = 9;

  const fetchProducts = useCallback(async () => {
    const hasInstantData = !!apiClient.getCachedDataSync('/products') || readSessionList(PRODUCTS_CACHE_KEY).length > 0;
    if (!hasInstantData) {
      setLoading(true);
    }
    try {
      const response = await api.getProducts();
      const items = response.data.items || [];
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
      filtered.sort((a, b) => getProductPricing(a).displayPrice - getProductPricing(b).displayPrice);
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => getProductPricing(b).displayPrice - getProductPricing(a).displayPrice);
    } else if (sortBy === 'rating-high') {
      filtered.sort((a, b) => Number(b.rating_average || 0) - Number(a.rating_average || 0));
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    setFilteredProducts(filtered);
    setPage(1); // Reset to first page when filters change
  }, [products, categoryFilter, priceFilter, ratingFilter, sortBy]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  return (
    <div className="min-h-screen bg-surface py-12 font-inter text-on-surface" data-testid="shop-page">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
        <div className="mb-12 border-b border-border-subtle pb-8">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-primary bg-primary/10 px-3.5 py-1.5 rounded-full inline-block mb-3 border border-primary/20">
            CATALOGUE
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-ink-slate font-manrope mb-2" data-testid="shop-title">
            Our Products
          </h1>
          <p className="text-sm md:text-base text-on-surface-variant font-medium">
            Premium food-grade aluminum foil in custom sizes and commercial thicknesses.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="md:w-64 flex-shrink-0">
            <div className="bg-white border border-border-subtle p-6 rounded-xl shadow-sm sticky top-24">
              <div className="flex items-center gap-2 mb-6 border-b border-border-subtle pb-4">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-base font-manrope text-ink-slate uppercase tracking-wider">
                  Filters
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 block">Category</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        value="all"
                        checked={categoryFilter === 'all'}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-4 h-4 text-primary focus:ring-primary border-border-subtle bg-white"
                        data-testid="filter-category-all"
                      />
                      <span className="text-sm font-semibold text-slate-700">All Categories</span>
                    </label>
                    {categories.map(category => (
                      <label key={category.id || category.name} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="category"
                          value={category.name}
                          checked={categoryFilter === category.name}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className="w-4 h-4 text-primary focus:ring-primary border-border-subtle bg-white"
                          data-testid={`filter-category-${category.name}`}
                        />
                        <span className="text-sm font-semibold text-slate-700">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border-subtle pt-6">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 block">Price Range</label>
                  <div className="space-y-2">
                    {[
                      { value: 'all', label: 'All Prices' },
                      { value: 'under200', label: 'Under ₹200' },
                      { value: '200to500', label: '₹200 - ₹500' },
                      { value: 'over500', label: 'Over ₹500' }
                    ].map(option => (
                      <label key={option.value} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="price"
                          value={option.value}
                          checked={priceFilter === option.value}
                          onChange={(e) => setPriceFilter(e.target.value)}
                          className="w-4 h-4 text-primary focus:ring-primary border-border-subtle bg-white"
                          data-testid={`filter-price-${option.value}`}
                        />
                        <span className="text-sm font-semibold text-slate-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border-subtle pt-6">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 block">Customer Rating</label>
                  <div className="space-y-2">
                    {[
                      { value: 'all', label: 'All Ratings' },
                      { value: '4', label: '4 Stars & Up' },
                      { value: '3', label: '3 Stars & Up' },
                      { value: '2', label: '2 Stars & Up' },
                      { value: '1', label: '1 Star & Up' }
                    ].map(option => (
                      <label key={option.value} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="rating"
                          value={option.value}
                          checked={ratingFilter === option.value}
                          onChange={(e) => setRatingFilter(e.target.value)}
                          className="w-4 h-4 text-primary focus:ring-primary border-border-subtle bg-white"
                          data-testid={`filter-rating-${option.value}`}
                        />
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                          {option.value !== 'all' && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border-subtle pt-6">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 block">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full h-11 rounded-lg border border-border-subtle bg-white px-3 py-1 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-700 font-semibold"
                    data-testid="sort-select"
                  >
                    <option value="name">Name</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating-high">Rating: High to Low</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? <PageLoader /> : filteredProducts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-border-subtle p-8 shadow-sm">
                <p className="text-on-surface-variant font-medium">No products found</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-6" data-testid="product-count">
                  SHOWING {filteredProducts.length} PRODUCT{filteredProducts.length !== 1 ? 'S' : ''}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr gap-8">
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
                <div className="mt-8">
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
