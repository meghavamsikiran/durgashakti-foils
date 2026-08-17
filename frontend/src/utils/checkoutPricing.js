export const DEFAULT_SHIPPING_SETTINGS = {
  enableShipping: true,
  enableFreeShipping: true,
  freeShippingThreshold: 1099,
  defaultShippingCharge: 70,
  codEnabled: true,
  codCharge: 20,
  minimumCodAmount: 1,
  maximumCodAmount: 2000,
  codStatus: 'Active',
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizeShippingSettings = (settings = {}) => {
  const source = settings || {};
  const codCharge = source.codCharge ?? source.cod_extra_service_charge ?? source.cod_charge ?? source.codHandlingFee;

  return {
    enableShipping: source.enableShipping !== false && source.shippingRuleStatus !== 'Inactive',
    enableFreeShipping: source.enableFreeShipping !== false,
    freeShippingThreshold: toNumber(source.freeShippingThreshold, DEFAULT_SHIPPING_SETTINGS.freeShippingThreshold),
    defaultShippingCharge: toNumber(source.defaultShippingCharge, DEFAULT_SHIPPING_SETTINGS.defaultShippingCharge),
    codEnabled: source.codEnabled !== false && source.codStatus !== 'Inactive',
    codCharge: toNumber(codCharge, DEFAULT_SHIPPING_SETTINGS.codCharge),
    minimumCodAmount: toNumber(source.minimumCodAmount, DEFAULT_SHIPPING_SETTINGS.minimumCodAmount),
    maximumCodAmount: toNumber(source.maximumCodAmount, DEFAULT_SHIPPING_SETTINGS.maximumCodAmount),
    codStatus: source.codStatus || DEFAULT_SHIPPING_SETTINGS.codStatus,
    shippingZonesEnabled: !!source.shippingZonesEnabled,
    zones: source.zones || []
  };
};

export const calculateCheckoutPricing = (subtotal, settings = {}, paymentMethod = 'upi', appliedCoupons = [], shippingAddress = null) => {
  const config = normalizeShippingSettings(settings);
  
  let discountAmount = 0;
  let freeShippingApplied = false;
  
  const coupons = appliedCoupons || [];
  for (const coupon of coupons) {
    if (coupon.discount_type === 'percentage') {
      let disc = subtotal * (toNumber(coupon.discount_value) / 100);
      if (coupon.max_discount_limit) {
        disc = Math.min(disc, toNumber(coupon.max_discount_limit));
      }
      discountAmount += disc;
    } else if (coupon.discount_type === 'flat') {
      discountAmount += toNumber(coupon.discount_value);
    } else if (coupon.discount_type === 'free_shipping') {
      freeShippingApplied = true;
    }
  }
  
  discountAmount = Math.min(discountAmount, subtotal);
  
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  
  let baseShippingCharge = config.defaultShippingCharge;
  if (config.shippingZonesEnabled && shippingAddress && shippingAddress.pincode) {
    const pin = String(shippingAddress.pincode).trim();
    if (pin.length === 6 && /^\d+$/.test(pin)) {
      let zoneName = 'North India';
      if (pin.startsWith('49')) {
        zoneName = 'Central India';
      } else if (pin.startsWith('50')) {
        zoneName = 'Telangana';
      } else if (pin.startsWith('5') || pin.startsWith('6')) {
        zoneName = 'South India';
      } else if (pin.startsWith('3') || pin.startsWith('4')) {
        zoneName = 'West India';
      } else if (pin.startsWith('7') || pin.startsWith('8')) {
        zoneName = 'East India';
      }
      const matchedZone = config.zones.find(z => z.name.toLowerCase() === zoneName.toLowerCase() && z.status === 'Active');
      if (matchedZone) {
        baseShippingCharge = toNumber(matchedZone.charge, config.defaultShippingCharge);
      }
    }
  }

  // BUG-02 FIX: Check free-shipping eligibility against the pre-discount `subtotal`
  // so that applying a coupon doesn't inadvertently lose free shipping.
  const isFreeShipping = freeShippingApplied || (config.enableFreeShipping && subtotal >= config.freeShippingThreshold);
  const shipping = config.enableShipping && !isFreeShipping ? baseShippingCharge : 0;
  const codCharge = paymentMethod === 'cod' ? config.codCharge : 0;

  // Prices in this store are TAX-EXCLUSIVE. GST is added on top of the product price.
  // CGST = SGST = 9% of taxable amount. Grand total includes both GST components.
  const cgst = Math.round(taxableAmount * 0.09 * 100) / 100;
  const sgst = cgst;
  const grandTotal = Number((taxableAmount + shipping + cgst + sgst + codCharge).toFixed(2));

  return { config, shipping, codCharge, cgst, sgst, grandTotal, discountAmount, freeShippingApplied };
};
