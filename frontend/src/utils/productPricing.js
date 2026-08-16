export const getProductPricing = (product = {}) => {
  const safeProduct = product || {};
  const basePrice = Number(safeProduct.base_price ?? safeProduct.price ?? 0);
  const effectivePrice = Number(safeProduct.effective_price || 0);
  const rawDiscountPrice = Number(safeProduct.discount_price || 0);
  
  // Use effective_price if available, valid, and cheaper than basePrice. Otherwise fallback to discount_price
  const discountPrice = (effectivePrice > 0 && effectivePrice < basePrice)
    ? effectivePrice
    : rawDiscountPrice;

  // An offer is valid if discountPrice is greater than 0 and less than the basePrice
  const hasOffer = discountPrice > 0 && discountPrice < basePrice;
  const displayPrice = hasOffer ? discountPrice : basePrice;
  
  // Percentage calculation: (Base - Discount) / Base * 100
  let discountPercent = 0;
  if (hasOffer && basePrice > 0) {
    const calculated = ((basePrice - discountPrice) / basePrice) * 100;
    // FIX BUG-28: Only show a badge if the discount is at least 5% so we don't
    // display a misleading '1% OFF' label for negligible price differences.
    // Round to the nearest integer, capped at 99% max.
    if (calculated >= 5) {
      discountPercent = Math.min(99, Math.round(calculated));
    } else {
      discountPercent = 0;
    }
  }

  return {
    basePrice,
    discountPrice,
    displayPrice,
    hasOffer,
    discountPercent,
  };
};
