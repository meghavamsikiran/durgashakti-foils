export const getProductBadge = (product, discountPercent = 0) => {
  const manualBadge = String(
    product?.badge ||
    product?.product_badge ||
    product?.marketing_badge ||
    ''
  ).trim();

  if (manualBadge && !['none', 'no badge', 'null'].includes(manualBadge.toLowerCase())) {
    return manualBadge;
  }

  if (Number(product?.units_sold || 0) >= 50) return 'Best Seller';
  if (Number(discountPercent || 0) >= 25) return 'Hot Deal';
  if (Number(product?.units_sold || 0) >= 20 && Number(product?.stock_quantity || 0) < 10) return 'High Demand';
  if (Number(product?.units_sold || 0) >= 10) return 'Trending';
  return null;
};

export const getBadgeClasses = (badge) => {
  const normalized = String(badge || '').toLowerCase();
  if (normalized.includes('best')) return 'bg-primary text-white border-primary/30';
  if (normalized.includes('hot') || normalized.includes('limited')) return 'bg-rose-600 text-white border-rose-700/30';
  if (normalized.includes('new')) return 'bg-blue-600 text-white border-blue-700/30';
  if (normalized.includes('huge') || normalized.includes('saving')) return 'bg-amber-500 text-white border-amber-600/30';
  return 'bg-amber-500 text-white border-amber-600/30';
};
