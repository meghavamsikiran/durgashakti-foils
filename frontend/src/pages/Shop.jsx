import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import TablePagination from '../components/ui/TablePagination';
import api from '../utils/api';
import apiClient from '../services/core/apiClient';
import { SlidersHorizontal } from 'lucide-react';
import PageLoader from '../components/ui/PageLoader';

const Shop = () => {
  const getInitialProducts = () => {
    const cachedResponse = apiClient.getCachedDataSync('/products');
    return cachedResponse?.data?.items || [];
  };

  const initialProducts = getInitialProducts();

  const [products, setProducts] = useState(initialProducts);
  const [filteredProducts, setFilteredProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(!initialProducts.length);
  const [priceFilter, setPriceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const fetchProducts = useCallback(async () => {
    const hasCached = !!apiClient.getCachedDataSync('/products');
    if (!hasCached) {
      setLoading(true);
    }
    try {
      const response = await api.getProducts();
      const items = response.data.items || [];
      setProducts(items);
      setFilteredProducts(items);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProductsSilent = useCallback(async () => {
    try {
      const response = await apiClient.get('/products', { silent: true });
      const items = response.data.items || [];
      setProducts(items);
      setFilteredProducts(items);
    } catch (error) {
      console.error('Error in background products fetch:', error);
    }
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = [...products];

    // Price filter
    if (priceFilter === 'under200') {
      filtered = filtered.filter(p => p.price < 200);
    } else if (priceFilter === '200to500') {
      filtered = filtered.filter(p => p.price >= 200 && p.price < 500);
    } else if (priceFilter === 'over500') {
      filtered = filtered.filter(p => p.price >= 500);
    }

    // Sort
    if (sortBy === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    setFilteredProducts(filtered);
    setPage(1); // Reset to first page when filters change
  }, [products, priceFilter, sortBy]);

  useEffect(() => {
    fetchProducts();
    fetchProductsSilent();
  }, [fetchProducts, fetchProductsSilent]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  return (
    <div className="min-h-screen py-12" data-testid="shop-page">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Manrope' }} data-testid="shop-title">
            Our Products
          </h1>
          <p className="text-lg text-muted-foreground">
            Premium food-grade aluminum foil in various sizes
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="md:w-64 flex-shrink-0">
            <div className="bg-secondary/30 border border-border/50 p-6 rounded-sm sticky top-24">
              <div className="flex items-center gap-2 mb-6">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-lg" style={{ fontFamily: 'Manrope' }}>
                  Filters
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold mb-3 block">Price Range</label>
                  <div className="space-y-2">
                    {[
                      { value: 'all', label: 'All Prices' },
                      { value: 'under200', label: 'Under ₹200' },
                      { value: '200to500', label: '₹200 - ₹500' },
                      { value: 'over500', label: 'Over ₹500' }
                    ].map(option => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="price"
                          value={option.value}
                          checked={priceFilter === option.value}
                          onChange={(e) => setPriceFilter(e.target.value)}
                          className="w-4 h-4 text-primary"
                          data-testid={`filter-price-${option.value}`}
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-3 block">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full h-10 rounded-sm border border-input bg-background px-3 py-1 text-sm"
                    data-testid="sort-select"
                  >
                    <option value="name">Name</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? <PageLoader /> : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products found</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-6" data-testid="product-count">
                  Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredProducts.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE).map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
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