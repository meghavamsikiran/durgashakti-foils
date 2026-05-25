export const getProductPricing = (product = {}) => {
  const basePrice = Number(product.base_price ?? product.price ?? 0);
  const effectivePrice = Number(product.effective_price || 0);
  const rawDiscountPrice = Number(product.discount_price || 0);
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
