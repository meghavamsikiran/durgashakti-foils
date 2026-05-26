export const getProductPricing = (product = {}) => {
  const safeProduct = product || {};
  const basePrice = Number(safeProduct.base_price ?? safeProduct.price ?? 0);
  const effectivePrice = Number(safeProduct.effective_price || 0);
  const rawDiscountPrice = Number(safeProduct.discount_price || 0);
  const discountPrice = effectivePrice > 0 && effectivePrice < basePrice
    ? effectivePrice
    : rawDiscountPrice;
  const hasOffer = discountPrice > 0 && discountPrice < basePrice;
  const displayPrice = hasOffer ? discountPrice : basePrice;
  const discountPercent = hasOffer && basePrice > 0
    ? Math.round(((basePrice - discountPrice) / basePrice) * 100)
    : 0;

  return {
    basePrice,
    discountPrice,
    displayPrice,
    hasOffer,
    discountPercent,
  };
};
