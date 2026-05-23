export const DEFAULT_SHIPPING_SETTINGS = {
  enableShipping: true,
  enableFreeShipping: true,
  freeShippingThreshold: 1099,
  defaultShippingCharge: 70,
  codEnabled: true,
  codCharge: 0,
  minimumCodAmount: 300,
  maximumCodAmount: 5000,
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
    enableShipping: source.enableShipping !== false,
    enableFreeShipping: source.enableFreeShipping !== false,
    freeShippingThreshold: toNumber(source.freeShippingThreshold, DEFAULT_SHIPPING_SETTINGS.freeShippingThreshold),
    defaultShippingCharge: toNumber(source.defaultShippingCharge, DEFAULT_SHIPPING_SETTINGS.defaultShippingCharge),
    codEnabled: source.codEnabled !== false,
    codCharge: toNumber(codCharge, DEFAULT_SHIPPING_SETTINGS.codCharge),
    minimumCodAmount: toNumber(source.minimumCodAmount, DEFAULT_SHIPPING_SETTINGS.minimumCodAmount),
    maximumCodAmount: toNumber(source.maximumCodAmount, DEFAULT_SHIPPING_SETTINGS.maximumCodAmount),
    codStatus: source.codStatus || DEFAULT_SHIPPING_SETTINGS.codStatus,
  };
};

export const calculateCheckoutPricing = (subtotal, settings = {}, paymentMethod = 'upi') => {
  const config = normalizeShippingSettings(settings);
  const taxableAmount = toNumber(subtotal, 0);
  const shipping = config.enableShipping && !(config.enableFreeShipping && taxableAmount >= config.freeShippingThreshold)
    ? config.defaultShippingCharge
    : 0;
  const codCharge = paymentMethod === 'cod' ? config.codCharge : 0;
  const cgst = taxableAmount * 0.09;
  const sgst = taxableAmount * 0.09;
  const grandTotal = taxableAmount + shipping + cgst + sgst + codCharge;

  return { config, shipping, codCharge, cgst, sgst, grandTotal };
};
