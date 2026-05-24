import React, { useState, useEffect } from 'react';
import { 
  Ticket, Plus, Search, Edit2, Trash2, Settings, 
  Check, X, TrendingUp, Coins, DollarSign, Calendar, Info, Loader2, Megaphone, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import couponService from '../../services/coupon.service';
import adminService from '../services/admin.service';
import { Button } from '../../components/ui/button';
import PageLoader from '../../components/ui/PageLoader';

const generateThemedBanner = (context) => {
  const ctx = context.trim().toUpperCase();
  
  // Default values
  let title = `${ctx} SPECIAL SALE`;
  let subtitle = "Special festive discounts just for you! Apply code at checkout.";
  let bgGradient = "from-[#2e0854] via-[#1c0336] to-[#0f001f]"; // dark violet default
  let textGradient = "from-amber-200 via-orange-400 to-yellow-250";
  let borderColor = "border-amber-400";
  let emojiPattern = "⚡🎁🔥";
  let animationStyle = "pulse";

  if (ctx.includes("DIWALI") || ctx.includes("DEEPAVALI")) {
    title = "🪔 FESTIVE DIWALI DHAMAKA SALE 🪔";
    subtitle = "Celebrate the Festival of Lights with pure premium packaging. Light up your kitchen with golden festive savings!";
    bgGradient = "from-[#0b0621] via-[#160c40] to-[#04010a]"; // Deep glowing navy/indigo night sky
    textGradient = "from-[#ffe066] via-[#f59e0b] to-[#ea580c]"; // Glowing saffron gold
    borderColor = "border-[#f59e0b]";
    emojiPattern = "🪔✨🎆🎉";
    animationStyle = "sparkle";
  } else if (ctx.includes("CHRISTMAS") || ctx.includes("XMAS") || ctx.includes("WINTER")) {
    title = "🎄 MERRY CHRISTMAS CELEBRATION 🎄";
    subtitle = "Unwrap premium holiday savings! Bring magic and freshness to your festive family meals.";
    bgGradient = "from-[#022c22] via-[#0f172a] to-[#0b0f19]"; // Rich evergreen/teal night
    textGradient = "from-red-400 via-yellow-100 to-emerald-400";
    borderColor = "border-red-500";
    emojiPattern = "🎅❄️🎁🎄";
    animationStyle = "snow";
  } else if (ctx.includes("PONGAL") || ctx.includes("SANKRANTI") || ctx.includes("HARVEST") || ctx.includes("ONAM") || ctx.includes("VISHU")) {
    title = "🌾 HAPPY PONGAL & SANKRANTI 🌾";
    subtitle = "Bring home the harvest of happiness! Premium quality kitchen foils for your traditional recipes.";
    bgGradient = "from-[#0f3a20] via-[#052e16] to-[#021c0e]"; // Sugarcane harvest green
    textGradient = "from-[#fed7aa] via-[#f59e0b] to-[#84cc16]"; // Peach to gold to lime
    borderColor = "border-[#f59e0b]";
    emojiPattern = "🌾🌞🪁🍯";
    animationStyle = "float";
  } else if (ctx.includes("LOHRI")) {
    title = "🔥 HAPPY LOHRI CELEBRATION 🔥";
    subtitle = "Warm wishes and delicious recipes! Premium wraps for the auspicious bonfire festival.";
    bgGradient = "from-[#2d0f05] via-[#7c2d12] to-[#1c0702]"; // Bonfire orange
    textGradient = "from-yellow-200 via-amber-300 to-orange-500";
    borderColor = "border-orange-500";
    emojiPattern = "🔥🌾🍿🥜";
    animationStyle = "pulse";
  } else if (ctx.includes("INDEPENDENCE") || ctx.includes("REPUBLIC") || ctx.includes("INDIA") || ctx.includes("FREEDOM") || ctx.includes("PATRIOTIC")) {
    title = "🇮🇳 PATRIOTIC CELEBRATION SALE 🇮🇳";
    subtitle = "Celebrating the spirit of purity, freedom, and strength. Truly Indian premium kitchen wraps.";
    bgGradient = "from-[#0b0f19] via-[#111827] to-[#030712]"; // Deep navy
    textGradient = "from-[#ff9933] via-white to-[#128807]"; // Tricolor
    borderColor = "border-[#ff9933]";
    emojiPattern = "🇮🇳🦅⚡🎖️";
    animationStyle = "tricolor";
  } else if (ctx.includes("ANNIVERSARY") || ctx.includes("BIRTHDAY") || ctx.includes("CELEBRATION") || ctx.includes("WEDDING")) {
    title = "🎉 ANNIVERSARY CELEBRATION 🎉";
    subtitle = "Celebrating a milestone of excellence with our beloved customers! Extra discount inside.";
    bgGradient = "from-[#4c0519] via-[#881337] to-[#1e0008]"; // Burgundy
    textGradient = "from-pink-300 via-amber-250 to-rose-300";
    borderColor = "border-pink-500";
    emojiPattern = "🎂🎉🎈🎁";
    animationStyle = "float";
  } else if (ctx.includes("VALENTINE") || ctx.includes("LOVE") || ctx.includes("ROSE") || ctx.includes("ROMANCE")) {
    title = "💖 VALENTINE'S SPECIAL SALE 💖";
    subtitle = "Made with love, wrapped with care. Treat your loved ones to fresh, delicious home-cooked meals!";
    bgGradient = "from-[#831843] via-[#4c0519] to-[#1e0008]"; // Deep pink/rose
    textGradient = "from-pink-200 via-rose-300 to-amber-200";
    borderColor = "border-pink-400";
    emojiPattern = "💖🌹🍫🎁";
    animationStyle = "float";
  } else if (ctx.includes("EASTER") || ctx.includes("SPRING")) {
    title = "🐰 HAPPY EASTER SPECIAL 🐰";
    subtitle = "Hop into fresh spring savings! Beautiful family dinners wrapped in premium quality.";
    bgGradient = "from-[#1e293b] via-[#0f172a] to-[#020617]"; // Slate/dark night
    textGradient = "from-pink-300 via-emerald-250 to-sky-300"; // Pastel-ish gradient
    borderColor = "border-pink-300";
    emojiPattern = "🐰🐣🌸🥚";
    animationStyle = "float";
  } else if (ctx.includes("HALLOWEEN") || ctx.includes("SPOOKY")) {
    title = "🎃 HALLOWEEN SPOOKY SALE 🎃";
    subtitle = "Scary good deals on premium food wraps! Keep your treats fresh and delicious.";
    bgGradient = "from-[#0f0c1b] via-[#241203] to-[#09000a]"; // Dark spooky purple-orange
    textGradient = "from-[#ea580c] via-[#f59e0b] to-[#ea580c]";
    borderColor = "border-[#ea580c]";
    emojiPattern = "🎃👻🦇🍬";
    animationStyle = "float";
  } else if (ctx.includes("NEW YEAR") || ctx.includes("EVE")) {
    title = "🥂 HAPPY NEW YEAR CELEBRATION 🥂";
    subtitle = "Toast to fresh beginnings and huge savings! Premium quality wraps for the new year.";
    bgGradient = "from-[#020617] via-[#1e1b4b] to-[#0f172a]"; // Sparkling night
    textGradient = "from-yellow-250 via-amber-300 to-yellow-100";
    borderColor = "border-amber-400";
    emojiPattern = "🥂✨🎉🎆";
    animationStyle = "sparkle";
  } else if (ctx.includes("EID") || ctx.includes("RAMADAN") || ctx.includes("IFTAR")) {
    title = "🌙 BLESSED EID & RAMADAN SPECIAL 🌙";
    subtitle = "Share the feast of joy and blessings! Premium food wraps for your festive delicacies.";
    bgGradient = "from-[#012217] via-[#044e36] to-[#00140e]"; // Holy emerald green
    textGradient = "from-yellow-250 via-amber-300 to-emerald-250";
    borderColor = "border-amber-400";
    emojiPattern = "🌙✨🕌🤝";
    animationStyle = "sparkle";
  } else if (ctx.includes("HOLI")) {
    title = "🎨 HOLI FESTIVAL OF COLORS 🎨";
    subtitle = "Splashes of joy, colors, and huge savings! Keep your festive treats delicious and fresh.";
    bgGradient = "from-[#3b0764] via-[#5b21b6] to-[#1e1b4b]"; // Festive magenta purple
    textGradient = "from-pink-300 via-yellow-200 to-cyan-300";
    borderColor = "border-pink-400";
    emojiPattern = "🎨✨🎉🥳";
    animationStyle = "sparkle";
  } else if (ctx.includes("DURGA") || ctx.includes("SHAKTI") || ctx.includes("NAVRATRI") || ctx.includes("DUSSEHRA") || ctx.includes("PUJA")) {
    title = "🪔 HAPPY NAVRATRI & DUSSEHRA 🪔";
    subtitle = "Celebrate the victory of good over evil. Premium food wraps for your traditional home-cooked feasts.";
    bgGradient = "from-[#450a0a] via-[#7f1d1d] to-[#1a0505]"; // Royal festive red
    textGradient = "from-yellow-100 via-amber-400 to-orange-500";
    borderColor = "border-yellow-400";
    emojiPattern = "🪔🔱🌸🔥";
    animationStyle = "sparkle";
  } else if (ctx.includes("SUMMER")) {
    title = "☀️ HOT SUMMER BLOWOUT ☀️";
    subtitle = "Beat the heat with coolest deals on premium wraps. Perfect for summer picnics and BBQs!";
    bgGradient = "from-[#7c2d12] via-[#ea580c] to-[#3f160a]"; // Sunburst orange
    textGradient = "from-yellow-250 via-amber-300 to-yellow-100";
    borderColor = "border-yellow-400";
    emojiPattern = "☀️🌊🍦⛱️";
    animationStyle = "pulse";
  } else if (ctx.includes("MONSOON") || ctx.includes("RAIN") || ctx.includes("CLOUDY")) {
    title = "⛈️ MONSOON SPECIAL SALE ⛈️";
    subtitle = "Keep your food fresh and hot during the rains. Protect your kitchen with Durga Shakti Foils.";
    bgGradient = "from-[#0f172a] via-[#1e3a8a] to-[#090d16]"; // Rainy deep blue
    textGradient = "from-blue-200 via-sky-300 to-cyan-150";
    borderColor = "border-sky-400";
    emojiPattern = "⛈️🌧️☂️☔";
    animationStyle = "snow";
  }
  // Color words check
  else if (ctx.includes("GOLD") || ctx.includes("YELLOW") || ctx.includes("SAFFRON") || ctx.includes("AMBER")) {
    title = `✨ ${ctx} PREMIUM OFFER ✨`;
    subtitle = "Luxury packaging solutions with gold-standard savings. Limited time special offer!";
    bgGradient = "from-[#2e1f02] via-[#453003] to-[#140e01]"; // Dark amber gold
    textGradient = "from-yellow-100 via-amber-300 to-yellow-400";
    borderColor = "border-amber-400";
    emojiPattern = "👑🏆✨💰";
    animationStyle = "sparkle";
  } else if (ctx.includes("GREEN") || ctx.includes("MINT") || ctx.includes("ECO") || ctx.includes("NATURE") || ctx.includes("ORGANIC") || ctx.includes("FOREST")) {
    title = `🌿 ${ctx} ECO-FRIENDLY SPECIAL 🌿`;
    subtitle = "Go green, stay fresh! Premium sustainable wraps for a healthy, green kitchen.";
    bgGradient = "from-[#022c22] via-[#064e3b] to-[#012216]"; // Emerald green
    textGradient = "from-emerald-300 via-green-100 to-yellow-250";
    borderColor = "border-emerald-500";
    emojiPattern = "🌿🍀🍃♻️";
    animationStyle = "float";
  } else if (ctx.includes("BLUE") || ctx.includes("OCEAN") || ctx.includes("SKY") || ctx.includes("WATER") || ctx.includes("COOL") || ctx.includes("ICE")) {
    title = `❄️ ${ctx} REFRESHING SPECIAL ❄️`;
    subtitle = "Lock in extreme freshness and flavor! Cool deals for your storage needs.";
    bgGradient = "from-[#0c4a6e] via-[#075985] to-[#031d2c]"; // Deep ocean blue
    textGradient = "from-sky-200 via-cyan-100 to-indigo-300";
    borderColor = "border-sky-400";
    emojiPattern = "🌊❄️🧊💧";
    animationStyle = "snow";
  } else if (ctx.includes("RED") || ctx.includes("FIRE") || ctx.includes("HOT") || ctx.includes("SPICY") || ctx.includes("RUBY") || ctx.includes("CRIMSON")) {
    title = `🔥 ${ctx} SIZZLING DEAL 🔥`;
    subtitle = "Hot deals that won't last! Keep your food sizzling hot and fresh with Durga Shakti.";
    bgGradient = "from-[#450a0a] via-[#7f1d1d] to-[#180202]"; // Ruby red/crimson
    textGradient = "from-red-300 via-orange-300 to-yellow-100";
    borderColor = "border-red-500";
    emojiPattern = "🔥🌶️⚡💥";
    animationStyle = "pulse";
  } else if (ctx.includes("DARK") || ctx.includes("BLACK") || ctx.includes("NIGHT") || ctx.includes("MIDNIGHT") || ctx.includes("ONYX")) {
    title = `🕶️ ${ctx} EXCLUSIVE ACCESS 🕶️`;
    subtitle = "Premium dark-themed luxury discounts. Reserved for our most exclusive club members.";
    bgGradient = "from-[#0f172a] via-[#020617] to-[#000000]"; // Midnight black
    textGradient = "from-slate-100 via-slate-300 to-slate-500";
    borderColor = "border-slate-700";
    emojiPattern = "🕶️🔒🖤🎩";
    animationStyle = "pulse";
  } else if (ctx.includes("SILVER") || ctx.includes("GRAY") || ctx.includes("GREY") || ctx.includes("METAL") || ctx.includes("METALLIC") || ctx.includes("FOIL")) {
    title = `💿 ${ctx} METALLIC SPECIAL 💿`;
    subtitle = "The ultimate shine of purity and strength! Premium silver foil wraps for your cooking masterpieces.";
    bgGradient = "from-[#334155] via-[#1e293b] to-[#0f172a]"; // Slate grey/silver
    textGradient = "from-slate-100 via-white to-slate-300";
    borderColor = "border-slate-400";
    emojiPattern = "💿🛡️⚡💎";
    animationStyle = "float";
  } else if (ctx.includes("PURPLE") || ctx.includes("VIOLET") || ctx.includes("COSMIC") || ctx.includes("MAGIC") || ctx.includes("NEON") || ctx.includes("SPACE") || ctx.includes("GALAXY")) {
    title = `🔮 ${ctx} MAGICAL SPECIAL 🔮`;
    subtitle = "Out of this world discounts! Lock in magic freshness for all your traditional dishes.";
    bgGradient = "from-[#3b0764] via-[#5b21b6] to-[#1e1b4b]"; // Cosmic purple
    textGradient = "from-pink-300 via-purple-200 to-cyan-300";
    borderColor = "border-purple-400";
    emojiPattern = "🔮🌌🛸🌀";
    animationStyle = "sparkle";
  } else if (ctx.includes("CYAN") || ctx.includes("TEAL") || ctx.includes("TURQUOISE") || ctx.includes("AQUA") || ctx.includes("TROPICAL")) {
    title = `🏝️ ${ctx} TROPICAL SPECIAL 🏝️`;
    subtitle = "Fresh, vibrant, and cooling deals! Keep your food beach-ready and delicious.";
    bgGradient = "from-[#042f2e] via-[#0d9488] to-[#021f1d]"; // Deep teal/cyan
    textGradient = "from-teal-100 via-cyan-200 to-emerald-250";
    borderColor = "border-teal-400";
    emojiPattern = "🏝️🐠🌊🍹";
    animationStyle = "float";
  } else if (ctx.includes("ORANGE") || ctx.includes("PEACH") || ctx.includes("SUNSET") || ctx.includes("CORAL") || ctx.includes("SALMON")) {
    title = `🌅 ${ctx} SUNSET BLOWOUT 🌅`;
    subtitle = "Warm glowing discounts on our premium range! Bring home quality wrapping today.";
    bgGradient = "from-[#7c2d12] via-[#c2410c] to-[#2d0f05]"; // Coral sunset orange
    textGradient = "from-orange-200 via-amber-300 to-yellow-100";
    borderColor = "border-orange-500";
    emojiPattern = "🌅🍊🍑🍂";
    animationStyle = "pulse";
  } else if (ctx.includes("PINK") || ctx.includes("ROSE") || ctx.includes("BLOSSOM")) {
    title = `🌸 ${ctx} BLOSSOM SPECIAL 🌸`;
    subtitle = "Delightful deals in full bloom! Keep your spring recipes fresh and colorful.";
    bgGradient = "from-[#500724] via-[#9d174d] to-[#1c000c]"; // Rose pink
    textGradient = "from-pink-200 via-rose-350 to-pink-100";
    borderColor = "border-pink-500";
    emojiPattern = "🌸🌺🎀🧁";
    animationStyle = "float";
  }
  // Generic Fallback Hash Generator
  else {
    let hash = 0;
    for (let i = 0; i < ctx.length; i++) {
      hash = ctx.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Set of pre-curated gorgeous styles that we map to deterministically
    const palettes = [
      {
        bg: "from-[#1e1b4b] via-[#311054] to-[#0f052d]", // Indigo & purple
        text: "from-amber-200 via-yellow-400 to-orange-400",
        border: "border-amber-400",
        emojis: "✨⚡🔥🎉",
        anim: "sparkle",
        suffix: "CELEBRATION"
      },
      {
        bg: "from-[#450a0a] via-[#2d0614] to-[#120005]", // Royal Crimson
        text: "from-yellow-100 via-amber-300 to-rose-400",
        border: "border-rose-500",
        emojis: "🎁💥⚡🔥",
        anim: "pulse",
        suffix: "MEGA SPECIAL"
      },
      {
        bg: "from-[#022c22] via-[#064e3b] to-[#012216]", // Emerald Prestige
        text: "from-emerald-300 via-yellow-200 to-amber-300",
        border: "border-emerald-500",
        emojis: "💎✨🏅🏆",
        anim: "sparkle",
        suffix: "EXCLUSIVE DEALS"
      },
      {
        bg: "from-[#3b0764] via-[#1e1b4b] to-[#0f001c]", // Cosmic Violet
        text: "from-pink-300 via-yellow-100 to-cyan-300",
        border: "border-purple-400",
        emojis: "🔮⚡🛸🌀",
        anim: "float",
        suffix: "FLASH SALE"
      },
      {
        bg: "from-[#075985] via-[#1e3a8a] to-[#0c1a30]", // Deep Ocean
        text: "from-cyan-200 via-sky-300 to-indigo-200",
        border: "border-sky-400",
        emojis: "🌊☀️🍦⛵",
        anim: "float",
        suffix: "REFRESHING BLOWOUT"
      },
      {
        bg: "from-[#7c2d12] via-[#431407] to-[#1c0702]", // Amber Sunset
        text: "from-yellow-100 via-amber-400 to-orange-500",
        border: "border-orange-500",
        emojis: "🍂☀️🍁🔥",
        anim: "pulse",
        suffix: "SUNSET SPECIAL"
      }
    ];

    const picked = palettes[Math.abs(hash) % palettes.length];
    title = `✨ ${ctx} ${picked.suffix} ✨`;
    bgGradient = picked.bg;
    textGradient = picked.text;
    borderColor = picked.border;
    emojiPattern = picked.emojis;
    animationStyle = picked.anim;
  }

  return {
    theme_context: ctx,
    title,
    subtitle,
    is_active: true,
    theme_config: {
      background_gradient: bgGradient,
      emoji_pattern: emojiPattern,
      animation_style: animationStyle,
      border_color: borderColor,
      text_gradient: textGradient
    }
  };
};

const CouponsPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [settings, setSettings] = useState({
    system_enabled: true,
    stacking_enabled: false,
    single_use_per_account: false
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [promotingId, setPromotingId] = useState(null);
  const [scrollingBanner, setScrollingBanner] = useState({ text1: '', text2: '', timer_enabled: false, timer_target: '', use_favicon: true });
  const [popupBanner, setPopupBanner] = useState({ promoted_coupons: [] });
  const [togglingPopupId, setTogglingPopupId] = useState(null);
  
  // Custom Banner Themes State
  const [activeTab, setActiveTab] = useState('coupons'); // 'coupons' | 'banners'
  const [customBanners, setCustomBanners] = useState([]);
  const [savingBanners, setSavingBanners] = useState(false);
  const [bannerSearchText, setBannerSearchText] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const initialBannerForm = {
    id: null,
    theme_context: '',
    title: '',
    subtitle: '',
    is_active: true,
    coupon_codes: [],
    theme_config: {
      background_gradient: 'from-[#4d0b5a] via-[#2f0438] to-[#1a0120]',
      emoji_pattern: '⚡🎁🔥',
      animation_style: 'pulse',
      border_color: 'border-amber-400',
      text_gradient: 'from-amber-300 via-orange-400 to-yellow-200'
    }
  };

  const [bannerForm, setBannerForm] = useState(initialBannerForm);
  const couponCodes = bannerForm?.coupon_codes || [];
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 0,
    expiry_date: '',
    min_cart_value: 0,
    max_discount_limit: '',
    max_usage_count: '',
    per_customer_usage_limit: '',
    has_max_discount_limit: false,
    has_total_use_limit: false,
    has_customer_use_limit: false,
    is_active: true
  });

  const fetchCouponsAndSettings = async () => {
    setLoading(true);
    try {
      const [couponsData, settingsData, adminSettingsRes] = await Promise.all([
        couponService.getCoupons(),
        couponService.getSettings(),
        adminService.getSettings()
      ]);
      setCoupons(couponsData);
      setSettings(settingsData);
      const adminSettings = adminSettingsRes.data || {};
      const bannerVal = adminSettings.scrolling_banner || { text1: '', text2: '', timer_enabled: false, timer_target: '', use_favicon: true };
      const popupPromotedCoupons =
        bannerVal.popup_promoted_coupons ||
        adminSettings.popup_banner?.promoted_coupons ||
        [];
      setScrollingBanner(bannerVal);
      setPopupBanner(adminSettings.popup_banner || { promoted_coupons: popupPromotedCoupons });
      setCustomBanners((adminSettings.popup_banner?.custom_banners || []).filter(b => b !== null && b !== undefined));
    } catch (error) {
      toast.error('Failed to load coupon data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCouponsAndSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await couponService.updateSettings(settings);
      toast.success('Global settings updated successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: 0,
      expiry_date: '',
      min_cart_value: 0,
      max_discount_limit: '',
      max_usage_count: '',
      per_customer_usage_limit: '',
      has_max_discount_limit: false,
      has_total_use_limit: false,
      has_customer_use_limit: false,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon) => {
    setEditingCoupon(coupon);
    
    // Format date for input datetime-local type (YYYY-MM-DDTHH:mm)
    let formattedDate = '';
    if (coupon.expiry_date) {
      const d = new Date(coupon.expiry_date);
      const pad = (num) => String(num).padStart(2, '0');
      formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      expiry_date: formattedDate,
      min_cart_value: coupon.min_cart_value,
      max_discount_limit: coupon.max_discount_limit || '',
      max_usage_count: coupon.max_usage_count || '',
      per_customer_usage_limit: coupon.per_customer_usage_limit || '',
      has_max_discount_limit: coupon.max_discount_limit !== null && coupon.max_discount_limit !== undefined,
      has_total_use_limit: coupon.max_usage_count !== null && coupon.max_usage_count !== undefined,
      has_customer_use_limit: coupon.per_customer_usage_limit !== null && coupon.per_customer_usage_limit !== undefined,
      is_active: coupon.is_active
    });
    setIsModalOpen(true);
  };

  const handleToggleCouponActive = async (coupon) => {
    try {
      const updatedPayload = {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        expiry_date: coupon.expiry_date,
        min_cart_value: coupon.min_cart_value,
        max_discount_limit: coupon.max_discount_limit,
        max_usage_count: coupon.max_usage_count,
        per_customer_usage_limit: coupon.per_customer_usage_limit,
        is_active: !coupon.is_active
      };
      await couponService.updateCoupon(coupon.id, updatedPayload);
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
      toast.success(`Coupon ${!coupon.is_active ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      toast.error('Failed to toggle status');
    }
  };

  const handlePromoteToBanner = async (coupon) => {
    if (!window.confirm(`Are you sure you want to promote coupon ${coupon.code} in the storefront scrolling banner?`)) {
      return;
    }

    setPromotingId(coupon.id);
    try {
      // 1. Fetch current settings to get existing text1 and use_favicon
      const settingsRes = await adminService.getSettings();
      const currentSettings = settingsRes.data || {};
      const currentBanner = currentSettings.scrolling_banner || {};

      // 2. Format discount text
      let discountText = '';
      if (coupon.discount_type === 'percentage') {
        discountText = `${Number(coupon.discount_value)}%`;
      } else if (coupon.discount_type === 'flat') {
        discountText = `₹${Number(coupon.discount_value)}`;
      } else if (coupon.discount_type === 'free_shipping') {
        discountText = 'Free Shipping';
      }

      // 3. Format banner text and timer parameters
      let text2 = '';
      let timerEnabled = false;
      let timerTarget = '';

      if (coupon.expiry_date) {
        timerEnabled = true;
        timerTarget = coupon.expiry_date;
        if (coupon.discount_type === 'free_shipping') {
          text2 = `⚡ Special ${coupon.code} Offer! Use coupon code ${coupon.code} to get Free Shipping. Offer ends in {timer} ⚡`;
        } else {
          text2 = `⚡ Special ${coupon.code} Offer! Use coupon code ${coupon.code} to get a discount of ${discountText}. Offer ends in {timer} ⚡`;
        }
      } else {
        timerEnabled = false;
        timerTarget = '';
        if (coupon.discount_type === 'free_shipping') {
          text2 = `🎁 Special ${coupon.code} Offer! Use coupon code ${coupon.code} to get Free Shipping! 🎁`;
        } else {
          text2 = `🎁 Special ${coupon.code} Offer! Use coupon code ${coupon.code} to get a discount of ${discountText}! 🎁`;
        }
      }

      const updatedBannerValue = {
        ...currentBanner,
        text1: currentBanner.text1 || '✨ Experience Purity & Perfection with Durga Shakti Premium Foils ✨',
        text2: text2,
        timer_enabled: timerEnabled,
        timer_target: timerTarget,
        use_favicon: currentBanner.use_favicon !== false
      };

      // 4. Update the settings via API
      await adminService.updateSetting({
        key: 'scrolling_banner',
        value: updatedBannerValue
      });

      // Update local state
      setScrollingBanner(updatedBannerValue);

      toast.success(`✨ Coupon ${coupon.code} is now active in the scrolling banner!`);
    } catch (error) {
      toast.error(error.message || 'Failed to update scrolling banner');
    } finally {
      setPromotingId(null);
    }
  };

  const handleTogglePopupBannerPromotion = async (coupon) => {
    setTogglingPopupId(coupon.id);
    try {
      // 1. Fetch current settings to get existing popup_banner & scrolling_banner
      const settingsRes = await adminService.getSettings();
      const currentSettings = settingsRes.data || {};
      const currentPopup = currentSettings.popup_banner || {};
      const currentBanner = currentSettings.scrolling_banner || {};
      const currentList =
        currentPopup.promoted_coupons ||
        currentBanner.popup_promoted_coupons ||
        [];

      // 2. Check if already promoted
      const isPromoted = currentList.some(c => c.code === coupon.code);
      let updatedList = [];

      if (isPromoted) {
        // Demote (remove)
        updatedList = currentList.filter(c => c.code !== coupon.code);
      } else {
        // Promote (add)
        const couponDetail = {
          id: coupon.id,
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: Number(coupon.discount_value),
          expiry_date: coupon.expiry_date,
          is_active: coupon.is_active
        };
        updatedList = [...currentList, couponDetail];
      }

      const updatedPopupSetting = {
        ...currentPopup,
        promoted_coupons: updatedList
      };

      // 3. Update setting in backend under 'popup_banner'
      await adminService.updateSetting({
        key: 'popup_banner',
        value: updatedPopupSetting
      });

      // Update local states
      setPopupBanner(updatedPopupSetting);
      
      if (isPromoted) {
        toast.success(`Removed coupon ${coupon.code} from the pop-up banner`);
      } else {
        toast.success(`Added coupon ${coupon.code} to the pop-up banner!`);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update pop-up banner settings');
    } finally {
      setTogglingPopupId(null);
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) {
      return;
    }
    try {
      await couponService.deleteCoupon(couponId);
      setCoupons(prev => prev.filter(c => c.id !== couponId));
      toast.success('Coupon deleted successfully');
    } catch (error) {
      toast.error('Failed to delete coupon');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);

    const payload = {
      code: formData.code.trim().toUpperCase(),
      discount_type: formData.discount_type,
      discount_value: Number(formData.discount_value),
      expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : null,
      min_cart_value: Number(formData.min_cart_value),
      max_discount_limit: formData.has_max_discount_limit && formData.max_discount_limit ? Number(formData.max_discount_limit) : null,
      max_usage_count: formData.has_total_use_limit && formData.max_usage_count ? Number(formData.max_usage_count) : null,
      per_customer_usage_limit: formData.has_customer_use_limit && formData.per_customer_usage_limit ? Number(formData.per_customer_usage_limit) : null,
      is_active: formData.is_active
    };

    try {
      if (editingCoupon) {
        await couponService.updateCoupon(editingCoupon.id, payload);
        toast.success('Coupon updated successfully');
      } else {
        await couponService.createCoupon(payload);
        toast.success('Coupon created successfully');
      }
      setIsModalOpen(false);
      fetchCouponsAndSettings();
    } catch (error) {
      const detail = error.response?.data?.detail || 'Failed to save coupon';
      toast.error(detail);
    } finally {
      setModalLoading(false);
    }
  };

  const handleGenerateTheme = () => {
    if (!bannerForm.theme_context.trim()) {
      toast.warning("Please enter a theme context keyword first (e.g. Diwali)");
      return;
    }
    const generated = generateThemedBanner(bannerForm.theme_context);
    setBannerForm(prev => ({
      ...prev,
      title: generated.title,
      subtitle: generated.subtitle,
      theme_config: generated.theme_config
    }));
    toast.success("Theme generated! You can customize colors and settings below.");
  };

  const handleToggleCouponInBanner = (code) => {
    setBannerForm(prev => {
      const currentCodes = prev.coupon_codes || [];
      const exists = currentCodes.includes(code);
      const updated = exists
        ? currentCodes.filter(c => c !== code)
        : [...currentCodes, code];
      return {
        ...prev,
        coupon_codes: updated
      };
    });
  };

  const handleSaveBannerTheme = async (e) => {
    e.preventDefault();
    if (!bannerForm.theme_context.trim()) {
      toast.error("Theme context is required.");
      return;
    }
    if (!bannerForm.title.trim()) {
      toast.error("Title is required.");
      return;
    }

    setSavingBanners(true);
    try {
      const currentCodes = bannerForm.coupon_codes || [];
      // Find full coupon objects for selected codes
      const linkedCoupons = coupons
        .filter(c => currentCodes.includes(c.code))
        .map(c => ({
          id: c.id,
          code: c.code,
          discount_type: c.discount_type,
          discount_value: Number(c.discount_value),
          expiry_date: c.expiry_date,
          is_active: c.is_active
        }));

      const currentFormId = bannerForm.id || `banner-${Date.now()}`;
      
      const newBannerTheme = {
        id: currentFormId,
        theme_context: bannerForm.theme_context.trim(),
        title: bannerForm.title.trim(),
        subtitle: bannerForm.subtitle.trim(),
        is_active: bannerForm.is_active,
        coupon_codes: currentCodes,
        linked_coupons: linkedCoupons,
        theme_config: bannerForm.theme_config
      };

      // If this theme is active, deactivate all other themes
      let updatedBannersList = (customBanners || []).filter(b => b !== null && b !== undefined).map(b => {
        if (b.id === currentFormId) {
          return newBannerTheme;
        }

        // Exclusivity enforcement: remove selected codes from other themes
        const filteredCodes = (b.coupon_codes || []).filter(code => !currentCodes.includes(code));
        const filteredLinkedCoupons = (b.linked_coupons || []).filter(c => !currentCodes.includes(c.code));

        return {
          ...b,
          is_active: bannerForm.is_active ? false : b.is_active, // if new theme is active, old is inactive
          coupon_codes: filteredCodes,
          linked_coupons: filteredLinkedCoupons
        };
      });

      // If it is a new banner theme (id is null), append it
      if (!customBanners.some(b => b.id === currentFormId)) {
        updatedBannersList.push(newBannerTheme);
      }

      const updatedPopupSetting = {
        ...popupBanner,
        custom_banners: updatedBannersList
      };

      await adminService.updateSetting({
        key: 'popup_banner',
        value: updatedPopupSetting
      });

      setCustomBanners(updatedBannersList);
      setPopupBanner(updatedPopupSetting);
      setBannerForm(initialBannerForm);
      toast.success(bannerForm.id ? "Theme updated successfully" : "Banner theme generated & saved!");
    } catch (error) {
      toast.error(error.message || "Failed to save theme");
    } finally {
      setSavingBanners(false);
    }
  };

  const handleDeleteBannerTheme = async (themeId) => {
    if (!window.confirm("Are you sure you want to delete this theme? This action cannot be undone.")) {
      return;
    }
    try {
      const updatedBannersList = (customBanners || []).filter(b => b && b.id !== themeId);
      const updatedPopupSetting = {
        ...popupBanner,
        custom_banners: updatedBannersList
      };
      await adminService.updateSetting({
        key: 'popup_banner',
        value: updatedPopupSetting
      });
      setCustomBanners(updatedBannersList);
      setPopupBanner(updatedPopupSetting);
      toast.success("Theme deleted successfully");
    } catch (error) {
      toast.error("Failed to delete theme");
    }
  };

  const handleToggleThemeActive = async (themeId, currentStatus) => {
    try {
      const updatedBannersList = (customBanners || []).filter(b => b !== null && b !== undefined).map(b => {
        if (b.id === themeId) {
          return { ...b, is_active: !currentStatus };
        }
        // Deactivate other banners if this one is being activated
        if (!currentStatus) {
          return { ...b, is_active: false };
        }
        return b;
      });

      const updatedPopupSetting = {
        ...popupBanner,
        custom_banners: updatedBannersList
      };

      await adminService.updateSetting({
        key: 'popup_banner',
        value: updatedPopupSetting
      });

      setCustomBanners(updatedBannersList);
      setPopupBanner(updatedPopupSetting);
      toast.success(`Theme ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      toast.error("Failed to toggle theme status");
    }
  };

  // Filter & Search
  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.discount_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Analytics Helpers
  const totalDiscountDistributed = coupons.reduce((sum, c) => sum + Number(c.total_discount_given || 0), 0);
  const couponDrivenRevenue = coupons.reduce((sum, c) => sum + Number(c.revenue_generated || 0), 0);
  const totalUses = coupons.reduce((sum, c) => sum + Number(c.total_uses || 0), 0);
  const activeCount = coupons.filter(c => c.is_active).length;

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-inter">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink-slate flex items-center gap-3">
            <Ticket className="w-8 h-8 text-primary" /> Coupons & Discounts
          </h1>
          <p className="text-sm text-text-muted mt-1">Create discount codes, choose who can use them, and track how often they are used.</p>
        </div>
        {activeTab === 'coupons' && (
          <Button onClick={handleOpenCreateModal} className="bg-primary hover:bg-[#005a14] text-white rounded-xl py-3 px-5 flex items-center gap-2 font-bold uppercase tracking-widest text-xs shadow-md transition-all">
            <Plus className="w-4 h-4" /> Add Coupon
          </Button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('coupons')}
          className={`pb-4 px-6 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'coupons'
              ? 'border-primary text-primary font-black'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Coupons & Analytics
        </button>
        <button
          onClick={() => setActiveTab('banners')}
          className={`pb-4 px-6 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'banners'
              ? 'border-primary text-primary font-black'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          ✨ Pop-up Banner Themes
        </button>
      </div>

      {activeTab === 'coupons' ? (
        <>
          {/* Analytics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Ticket className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Coupons</p>
                <p className="text-2xl font-black text-ink-slate mt-0.5">{activeCount} <span className="text-xs font-medium text-slate-400">/ {coupons.length} Active</span></p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Uses</p>
                <p className="text-2xl font-black text-ink-slate mt-0.5">{totalUses} Times</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Discount Given</p>
                <p className="text-2xl font-black text-ink-slate mt-0.5">₹{totalDiscountDistributed.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Generated Revenue</p>
                <p className="text-2xl font-black text-ink-slate mt-0.5">₹{couponDrivenRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* Global Config Card */}
          <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm">
            <h2 className="text-lg font-black text-ink-slate flex items-center gap-2 uppercase tracking-wider">
              <Settings className="w-5 h-5 text-primary" /> Global Settings
            </h2>
            <p className="text-xs text-text-muted mt-1">Choose how coupons work for customers during checkout.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/75 transition-all border border-slate-200">
                <input 
                  type="checkbox" 
                  className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={settings.system_enabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, system_enabled: e.target.checked }))}
                />
                <div>
                  <p className="text-sm font-bold text-ink-slate">Let customers use coupons</p>
                  <p className="text-xs text-text-muted mt-0.5">Turn this off to temporarily stop all coupon codes at checkout.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/75 transition-all border border-slate-200">
                <input 
                  type="checkbox" 
                  className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={settings.stacking_enabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, stacking_enabled: e.target.checked }))}
                />
                <div>
                  <p className="text-sm font-bold text-ink-slate">Allow more than one coupon in the same order</p>
                  <p className="text-xs text-text-muted mt-0.5">Keep this off when each order should use only one coupon code.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/75 transition-all border border-slate-200 md:col-span-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={settings.single_use_per_account}
                  onChange={(e) => setSettings(prev => ({ ...prev, single_use_per_account: e.target.checked }))}
                />
                <div>
                  <p className="text-sm font-bold text-ink-slate">Allow only one coupon order per customer account</p>
                  <p className="text-xs text-text-muted mt-0.5">Use this only for strict one-time campaigns. If on, a customer who used any coupon before cannot use another coupon again.</p>
                </div>
              </label>
            </div>

            <div className="flex justify-end mt-6">
              <Button 
                onClick={handleSaveSettings} 
                disabled={savingSettings}
                className="bg-primary hover:bg-[#005a14] text-white rounded-xl py-2 px-5 font-bold uppercase tracking-wider text-xs flex items-center gap-2 shadow-sm transition-all"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Coupon Settings'}
              </Button>
            </div>
          </div>

          {/* Coupons Table List */}
          <div className="bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-black text-ink-slate uppercase tracking-wider">All Coupon Codes</h2>
              <div className="relative max-w-sm w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search coupon code..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-slate-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredCoupons.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Ticket className="w-12 h-12 text-slate-350 mx-auto mb-3" />
                  <p className="font-bold">No coupons found</p>
                  <p className="text-xs text-slate-400 mt-0.5">Create a coupon or adjust your query.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-border-subtle text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Coupon Code</th>
                      <th className="px-6 py-4">Discount</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4 text-center">Valid Until</th>
                      <th className="px-6 py-4 text-center">Minimum Order</th>
                      <th className="px-6 py-4 text-center">Used / Left</th>
                      <th className="px-6 py-4 text-right">Revenue</th>
                      <th className="px-6 py-4 text-center">Active</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle text-sm text-ink-slate font-medium">
                    {filteredCoupons.map((coupon) => {
                      const isExpired = coupon.expiry_date && new Date(coupon.expiry_date) < new Date();
                      const remaining = coupon.max_usage_count !== null 
                        ? Math.max(0, coupon.max_usage_count - (coupon.total_uses || 0)) 
                        : 'Unlimited';

                      return (
                        <tr key={coupon.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="px-6 py-4 font-mono font-bold text-primary tracking-wider">{coupon.code}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                              coupon.discount_type === 'percentage' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                              coupon.discount_type === 'flat' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                              'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            }`}>
                              {coupon.discount_type === 'percentage' ? 'Percentage off' :
                               coupon.discount_type === 'flat' ? 'Rupees off' : 'Free shipping'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold">
                            {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                          </td>
                          <td className="px-6 py-4 text-center font-mono text-xs">
                            {coupon.expiry_date ? (
                              <span className={`inline-flex items-center gap-1.5 ${isExpired ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                                <Calendar className="w-3 h-3" />
                                {new Date(coupon.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            ) : 'Never expires'}
                          </td>
                          <td className="px-6 py-4 text-center font-bold">₹{coupon.min_cart_value}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-ink-slate font-black">{coupon.total_uses || 0}</span>
                            <span className="text-slate-400"> / {remaining}</span>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-emerald-700">₹{Number(coupon.revenue_generated || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleToggleCouponActive(coupon)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                coupon.is_active ? 'bg-primary' : 'bg-slate-200'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  coupon.is_active ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end items-center gap-2">
                              {(() => {
                                const isScrollingPromoted = scrollingBanner && scrollingBanner.text2 && scrollingBanner.text2.includes(coupon.code);
                                const isPopupPromoted = popupBanner && popupBanner.promoted_coupons && popupBanner.promoted_coupons.some(c => c.code === coupon.code);

                                return (
                                  <>
                                    <button 
                                      onClick={() => handlePromoteToBanner(coupon)}
                                      disabled={promotingId === coupon.id}
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 ${
                                        isScrollingPromoted 
                                          ? 'text-amber-750 bg-amber-50 hover:bg-amber-100 border border-amber-200' 
                                          : 'text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-700 border border-slate-200'
                                      }`}
                                      title={isScrollingPromoted ? "Promoted in Top Scrolling Banner" : "Promote in Top Scrolling Banner"}
                                    >
                                      {promotingId === coupon.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Megaphone className={`w-3.5 h-3.5 ${isScrollingPromoted ? 'fill-amber-600' : ''}`} />
                                      )}
                                      <span>Top Banner</span>
                                    </button>
                                    
                                    <button 
                                      onClick={() => handleTogglePopupBannerPromotion(coupon)}
                                      disabled={togglingPopupId === coupon.id}
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 ${
                                        isPopupPromoted 
                                          ? 'text-emerald-750 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200' 
                                          : 'text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-700 border border-slate-200'
                                      }`}
                                      title={isPopupPromoted ? "Promoted in Popup Banner" : "Promote in Popup Banner"}
                                    >
                                      {togglingPopupId === coupon.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Sparkles className={`w-3.5 h-3.5 ${isPopupPromoted ? 'fill-emerald-600' : ''}`} />
                                      )}
                                      <span>Popup Banner</span>
                                    </button>
                                  </>
                                );
                              })()}
                              
                              <span className="h-4 w-px bg-slate-200 mx-1"></span>
                              
                              <button 
                                onClick={() => handleOpenEditModal(coupon)}
                                className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-xl transition-all"
                                title="Edit Coupon"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteCoupon(coupon.id)}
                                className="p-2 text-slate-500 hover:text-red-55 hover:bg-red-50 rounded-xl transition-all"
                                title="Delete Coupon"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Pop-up Banner Themes tab */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Theme Form & Preview (7 Columns) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm space-y-5">
              <h2 className="text-lg font-black text-ink-slate flex items-center gap-2 uppercase tracking-wider">
                <Sparkles className="w-5 h-5 text-primary" /> 
                {bannerForm.id ? "Edit Banner Theme" : "Generate Themed Banner"}
              </h2>
              <p className="text-xs text-text-muted">
                Enter a context word like DIWALI, CHRISTMAS, PONGAL, or ANNIVERSARY SALE. Click generate to automatically create custom visual styles, colors, and titles, or customize them below.
              </p>

              <div className="space-y-4">
                {/* Theme Context input with Generate button */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Theme Context (Keyword)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. DIWALI, CHRISTMAS, PONGAL, INDEPENDENCE" 
                      className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary uppercase font-bold tracking-wider placeholder-slate-400"
                      value={bannerForm.theme_context}
                      onChange={(e) => setBannerForm(prev => ({ ...prev, theme_context: e.target.value }))}
                    />
                    <Button 
                      type="button"
                      onClick={handleGenerateTheme}
                      className="bg-primary hover:bg-[#005a14] text-white rounded-xl py-3 px-5 font-bold uppercase tracking-widest text-xs shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Generate
                    </Button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Banner Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. ✨ FESTIVE DHAMAKA SALE ✨" 
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-bold"
                    value={bannerForm.title}
                    onChange={(e) => setBannerForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Banner Subtitle / Description</label>
                  <textarea 
                    rows="3"
                    placeholder="Describe the offer (e.g. Save big on premium foils today. Code applies at checkout.)" 
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium text-slate-700"
                    value={bannerForm.subtitle}
                    onChange={(e) => setBannerForm(prev => ({ ...prev, subtitle: e.target.value }))}
                  />
                </div>

                {/* Exclusivity-Aware Coupon Search Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Linked Coupon Codes</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white font-bold text-slate-700 hover:border-slate-350 transition-all text-left"
                    >
                      <span>
                        {couponCodes.length === 0 
                          ? "Select coupon codes..." 
                          : `Selected ${couponCodes.length} coupon(s)`}
                      </span>
                      <span className="text-slate-400 text-xs">▼</span>
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-64 overflow-y-auto font-inter">
                        <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                          <input
                            type="text"
                            placeholder="Search coupons by code or type..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary placeholder-slate-400 font-medium"
                            value={bannerSearchText}
                            onChange={(e) => setBannerSearchText(e.target.value)}
                          />
                        </div>

                        <div className="divide-y divide-slate-100">
                          {coupons
                            .filter(c => 
                              c.code.toLowerCase().includes(bannerSearchText.toLowerCase()) ||
                              c.discount_type.toLowerCase().includes(bannerSearchText.toLowerCase())
                            )
                            .map(coupon => {
                              const isChecked = couponCodes.includes(coupon.code);
                              
                              // Check if linked to another theme
                              const linkedTheme = (customBanners || []).find(
                                b => b && b.id !== bannerForm.id && (b.coupon_codes || []).includes(coupon.code)
                              );

                              return (
                                <label 
                                  key={coupon.id} 
                                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleCouponInBanner(coupon.code)}
                                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                    <div>
                                      <p className="text-sm font-mono font-black text-slate-800 tracking-wider">
                                        {coupon.code}
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% Off` : `₹${coupon.discount_value} Off`}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {linkedTheme && (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
                                      Linked to {linkedTheme.theme_context}
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          {coupons.length === 0 && (
                            <div className="p-4 text-center text-xs text-slate-400">
                              No coupon codes available.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Warning if linked elsewhere is selected */}
                  {coupons.some(c => 
                    couponCodes.includes(c.code) && 
                    (customBanners || []).some(b => b && b.id !== bannerForm.id && (b.coupon_codes || []).includes(c.code))
                  ) && (
                    <p className="text-[11px] text-amber-600 font-semibold mt-1.5 flex items-center gap-1 animate-pulse">
                      ⚠️ Note: Some chosen coupons are already linked to other banner themes. Saving will unlink them from those themes.
                    </p>
                  )}

                  {/* Selected Tag Pills */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {couponCodes.map(code => (
                      <span key={code} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-mono font-bold tracking-wider">
                        {code}
                        <button
                          type="button"
                          onClick={() => handleToggleCouponInBanner(code)}
                          className="text-slate-450 hover:text-red-500 font-bold transition-all ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Collapsible Advanced Style Customizer */}
                <details className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 transition-all outline-none">
                  <summary className="text-xs font-black uppercase tracking-wider text-slate-500 cursor-pointer select-none outline-none flex items-center justify-between">
                    <span>🔧 Technical Style Settings (Optional - Feel free to skip)</span>
                    <span className="text-slate-400 text-[10px]">▼ Click to toggle</span>
                  </summary>
                  
                  <div className="mt-4 pt-4 border-t border-slate-200/50 space-y-4">
                    <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <span>ℹ️</span> You don't need to edit these!
                      </p>
                      <p className="font-medium leading-relaxed text-blue-600">
                        The system automatically designs and writes the CSS style codes for you when you type a context word (like "DIWALI") and click the green <strong>"Generate"</strong> button. You can safely ignore this technical section.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Animation Style */}
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Background Animation</label>
                        <select
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                          value={bannerForm.theme_config.animation_style}
                          onChange={(e) => setBannerForm(prev => ({
                            ...prev,
                            theme_config: { ...prev.theme_config, animation_style: e.target.value }
                          }))}
                        >
                          <option value="pulse">Pulse (Standard)</option>
                          <option value="sparkle">Sparkle (Star lights)</option>
                          <option value="snow">Snow (Holiday Snowfall)</option>
                          <option value="float">Float (Festive Floating)</option>
                          <option value="tricolor">Tricolor (Ashoka Chakra)</option>
                        </select>
                      </div>

                      {/* Emojis */}
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Floating Festive Emojis</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-center text-lg font-bold"
                          value={bannerForm.theme_config.emoji_pattern}
                          onChange={(e) => setBannerForm(prev => ({
                            ...prev,
                            theme_config: { ...prev.theme_config, emoji_pattern: e.target.value }
                          }))}
                        />
                      </div>

                      {/* Background Gradient String */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Background Gradient (Tailwind CSS Code)</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                          value={bannerForm.theme_config.background_gradient}
                          onChange={(e) => setBannerForm(prev => ({
                            ...prev,
                            theme_config: { ...prev.theme_config, background_gradient: e.target.value }
                          }))}
                        />
                      </div>

                      {/* Text Gradient String & Border Color */}
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Text Gradient (Tailwind CSS Code)</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                          value={bannerForm.theme_config.text_gradient}
                          onChange={(e) => setBannerForm(prev => ({
                            ...prev,
                            theme_config: { ...prev.theme_config, text_gradient: e.target.value }
                          }))}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Border Color (Tailwind CSS Code)</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                          value={bannerForm.theme_config.border_color}
                          onChange={(e) => setBannerForm(prev => ({
                            ...prev,
                            theme_config: { ...prev.theme_config, border_color: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </details>

                {/* Active Toggle */}
                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="banner_active"
                    className="h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={bannerForm.is_active}
                    onChange={(e) => setBannerForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <label htmlFor="banner_active" className="text-sm font-bold text-ink-slate cursor-pointer select-none">
                    Activate Theme Banner immediately (Deactivates other themes)
                  </label>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                {bannerForm.id && (
                  <Button
                    type="button"
                    onClick={() => setBannerForm(initialBannerForm)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3 px-6 font-bold uppercase tracking-wider text-xs transition-all"
                  >
                    Clear Edit
                  </Button>
                )}
                <Button
                  onClick={handleSaveBannerTheme}
                  disabled={savingBanners}
                  className="bg-primary hover:bg-[#005a14] text-white rounded-xl py-3 px-6 font-bold uppercase tracking-wider text-xs flex items-center gap-2 shadow-md transition-all"
                >
                  {savingBanners ? <Loader2 className="w-4 h-4 animate-spin" /> : bannerForm.id ? 'Update Banner Theme' : 'Save Banner Theme'}
                </Button>
              </div>
            </div>

            {/* Live Preview Widget */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                Storefront Banner Preview (Live)
              </h3>
              
              {/* Scaled Banner Container */}
              <div className="overflow-hidden border border-slate-850 rounded-2xl p-1 bg-slate-955 flex items-center justify-center min-h-[220px]">
                <div className="w-full max-w-lg select-none font-manrope text-white scale-90 origin-center">
                  <div className={`relative bg-gradient-to-br ${bannerForm.theme_config.background_gradient} rounded-3xl border-4 ${bannerForm.theme_config.border_color} p-6 shadow-2xl overflow-hidden`}>
                    
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-full blur-2xl opacity-30 -translate-x-6 -translate-y-6"></div>
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-full blur-2xl opacity-20 translate-x-6 translate-y-6"></div>
                    <div className="absolute -top-6 -right-6 w-24 h-24 border-4 border-dashed border-white/5 rounded-full pointer-events-none"></div>

                    {/* Floating decoration mocks based on animation style */}
                    {bannerForm.theme_config.animation_style === 'snow' && (
                      <div className="absolute inset-0 pointer-events-none opacity-40">
                        <div className="absolute text-sm left-4 top-2 animate-bounce">❄️</div>
                        <div className="absolute text-lg left-1/3 top-4 animate-pulse">❄️</div>
                        <div className="absolute text-xs right-8 top-1 animate-bounce">❄️</div>
                      </div>
                    )}
                    {bannerForm.theme_config.animation_style === 'sparkle' && (
                      <div className="absolute inset-0 pointer-events-none opacity-45">
                        <div className="absolute text-amber-300/60 top-2 left-6 animate-pulse">✨</div>
                        <div className="absolute text-yellow-300/50 top-6 right-8 animate-pulse">⭐</div>
                      </div>
                    )}
                    {bannerForm.theme_config.animation_style === 'float' && (
                      <div className="absolute inset-0 pointer-events-none opacity-40">
                        <div className="absolute text-lg left-4 top-8 animate-bounce">🌾</div>
                        <div className="absolute text-lg right-6 top-2 animate-pulse">🍯</div>
                      </div>
                    )}
                    {bannerForm.theme_config.animation_style === 'tricolor' && (
                      <div className="absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center">
                        <div className="w-32 h-32 border-4 border-dashed border-white rounded-full animate-spin"></div>
                      </div>
                    )}

                    <div className="text-center relative z-10 space-y-4">
                      <div className="flex justify-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/10 border border-white/20 text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {(bannerForm.theme_config.emoji_pattern || '✨').split('')[0]} {bannerForm.theme_context ? `${bannerForm.theme_context} Special` : 'Limited Offer'}
                        </span>
                      </div>

                      <h4 className={`text-2xl md:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r ${bannerForm.theme_config.text_gradient} uppercase animate-pulse`}>
                        {bannerForm.title || "FLASH SALE"}
                      </h4>

                      <p className="text-xs text-white/80 max-w-sm mx-auto leading-relaxed">
                        {bannerForm.subtitle || "Save big on premium kitchen foils today! Apply coupon at checkout."}
                      </p>

                      {/* Display Coupons Centered */}
                      <div className="flex flex-col items-center gap-3 w-full pt-1">
                        {couponCodes.length === 0 ? (
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full max-w-xs text-center text-xs text-white/50">
                            No coupon codes selected yet.
                          </div>
                        ) : (
                          <div className="flex justify-center max-w-sm mx-auto w-full">
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center space-y-2.5 w-full max-w-xs">
                              <p className="text-[10px] font-bold text-yellow-300 uppercase tracking-widest">
                                {(() => {
                                  const matchingC = coupons.find(c => c.code === couponCodes[0]);
                                  if (!matchingC) return "Special Discount";
                                  if (matchingC.discount_type === 'percentage') return `${matchingC.discount_value}% Off`;
                                  if (matchingC.discount_type === 'flat') return `₹${matchingC.discount_value} Off`;
                                  return "Free Shipping";
                                })()}
                                {couponCodes.length > 1 && ` (+${couponCodes.length - 1} more)`}
                              </p>
                              <div className="relative flex items-center justify-center w-full px-12">
                                <span className="font-mono text-base font-black bg-black/20 px-3 py-1 rounded-xl border border-white/20 tracking-wider">
                                  {couponCodes[0]}
                                </span>
                                <button type="button" className="absolute right-0 p-1.5 bg-white/5 border border-white/10 rounded-lg text-white/80">
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Saved Banner Themes List (5 columns) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
              <h2 className="text-lg font-black text-ink-slate flex items-center gap-2 uppercase tracking-wider">
                <Ticket className="w-5 h-5 text-primary" /> Saved Themes
              </h2>
              <p className="text-xs text-text-muted">
                Manage your created banner themes. The active themed banner will display on the storefront to customers.
              </p>

              <div className="space-y-4">
                {(() => {
                  const activeBanners = (customBanners || []).filter(b => b !== null && b !== undefined);
                  if (activeBanners.length === 0) {
                    return (
                      <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 space-y-2">
                        <Sparkles className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-bold uppercase tracking-wider">No banner themes created</p>
                        <p className="text-[10px] text-slate-400">Use the form to generate a theme.</p>
                      </div>
                    );
                  }
                  return activeBanners.map(theme => (
                    <div 
                      key={theme.id}
                      className={`p-4 border rounded-2xl transition-all space-y-3 relative overflow-hidden ${
                        theme.is_active 
                          ? 'border-emerald-500 bg-emerald-50/10' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Visual swatch tag */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex w-3 h-3 rounded-full bg-gradient-to-r ${theme.theme_config.background_gradient}`}></span>
                          <span className="font-bold text-sm text-slate-800 uppercase tracking-wide">
                            {theme.theme_context} Theme
                          </span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                          theme.is_active 
                            ? 'bg-emerald-550 text-emerald-700 font-bold bg-emerald-50' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {theme.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Title / Subtitle info */}
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-black text-slate-700">{theme.title}</h4>
                        <p className="text-[11px] text-slate-450 line-clamp-2">{theme.subtitle}</p>
                      </div>

                      {/* Coupon counts & detail tags */}
                      <div className="flex flex-wrap gap-1">
                        {theme.coupon_codes?.length === 0 ? (
                          <span className="text-[10px] text-red-500 font-bold italic">No linked coupons</span>
                        ) : (
                          theme.coupon_codes?.map(code => (
                            <span key={code} className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-650 rounded border border-slate-200 font-bold uppercase">
                              {code}
                            </span>
                          ))
                        )}
                      </div>

                      {/* Row actions */}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                        <button
                          type="button"
                          onClick={() => handleToggleThemeActive(theme.id, theme.is_active)}
                          className={`font-bold uppercase tracking-wider ${
                            theme.is_active 
                              ? 'text-amber-600 hover:text-amber-700' 
                              : 'text-emerald-600 hover:text-emerald-700'
                          }`}
                        >
                          {theme.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setBannerForm({
                                ...theme,
                                coupon_codes: theme.coupon_codes || [],
                                theme_config: {
                                  background_gradient: theme.theme_config?.background_gradient || 'from-[#4d0b5a] via-[#2f0438] to-[#1a0120]',
                                  emoji_pattern: theme.theme_config?.emoji_pattern || '⚡🎁🔥',
                                  animation_style: theme.theme_config?.animation_style || 'pulse',
                                  border_color: theme.theme_config?.border_color || 'border-amber-400',
                                  text_gradient: theme.theme_config?.text_gradient || 'from-amber-300 via-orange-400 to-yellow-200'
                                }
                              });
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-all"
                            title="Edit theme"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBannerTheme(theme.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-55 rounded-lg transition-all"
                            title="Delete theme"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                      </div>
                    </div>
                  </div>
                ))
              })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl border border-border-subtle shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto font-inter">
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
              <h3 className="text-xl font-black text-ink-slate flex items-center gap-2 uppercase tracking-wide">
                <Ticket className="w-5 h-5 text-primary" /> {editingCoupon ? 'Edit Coupon' : 'Add Coupon'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Coupon code</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. MONSOON50"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-slate-400 font-mono font-bold uppercase"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Customers type this code at checkout.</p>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Discount type</label>
                  <select 
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary capitalize font-bold"
                    value={formData.discount_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_type: e.target.value }))}
                  >
                    <option value="percentage">Percentage off</option>
                    <option value="flat">Rupees off</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                    {formData.discount_type === 'percentage' ? 'Discount percentage' : 'Discount amount'}
                  </label>
                  <input 
                    type="number"
                    required
                    min="0"
                    disabled={formData.discount_type === 'free_shipping'}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-bold disabled:bg-slate-50 disabled:text-slate-400"
                    value={formData.discount_type === 'free_shipping' ? 0 : formData.discount_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {formData.discount_type === 'percentage' ? 'Example: enter 50 for 50% off.' :
                     formData.discount_type === 'flat' ? 'Example: enter 100 to reduce the order by ₹100.' : 'No amount is needed for free shipping.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Minimum order amount</label>
                  <input 
                    type="number"
                    required
                    min="0"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-bold"
                    value={formData.min_cart_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_cart_value: e.target.value }))}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Set 0 if customers can use it on any order amount.</p>
                </div>

                {formData.discount_type === 'percentage' && (
                  <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
                        checked={formData.has_max_discount_limit}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          has_max_discount_limit: e.target.checked,
                          max_discount_limit: e.target.checked ? prev.max_discount_limit : ''
                        }))}
                      />
                      <div>
                        <p className="text-sm font-bold text-ink-slate">Set a maximum discount amount</p>
                        <p className="text-xs text-text-muted mt-0.5">Example: 50% off, but discount should not be more than ₹200.</p>
                      </div>
                    </label>
                    {formData.has_max_discount_limit && (
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Maximum rupees off"
                        className="mt-3 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-bold bg-white"
                        value={formData.max_discount_limit}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_discount_limit: e.target.value }))}
                      />
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Expiry date</label>
                  <input 
                    type="datetime-local"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Leave empty if this coupon should never expire.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={formData.has_total_use_limit}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        has_total_use_limit: e.target.checked,
                        max_usage_count: e.target.checked ? prev.max_usage_count : ''
                      }))}
                    />
                    <div>
                      <p className="text-sm font-bold text-ink-slate">Limit total orders that can use this coupon</p>
                      <p className="text-xs text-text-muted mt-0.5">Turn on for limited campaigns. Example: first 10 coupon orders only.</p>
                    </div>
                  </label>
                  {formData.has_total_use_limit && (
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Total order limit"
                      className="mt-3 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-bold bg-white"
                      value={formData.max_usage_count}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_usage_count: e.target.value }))}
                    />
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={formData.has_customer_use_limit}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        has_customer_use_limit: e.target.checked,
                        per_customer_usage_limit: e.target.checked ? (prev.per_customer_usage_limit || 1) : ''
                      }))}
                    />
                    <div>
                      <p className="text-sm font-bold text-ink-slate">Limit how many times each customer can use it</p>
                      <p className="text-xs text-text-muted mt-0.5">Turn off if the same customer can use this coupon on many orders.</p>
                    </div>
                  </label>
                  {formData.has_customer_use_limit && (
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Orders per customer"
                      className="mt-3 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-bold bg-white"
                      value={formData.per_customer_usage_limit}
                      onChange={(e) => setFormData(prev => ({ ...prev, per_customer_usage_limit: e.target.value }))}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <input 
                  type="checkbox" 
                  id="coupon_active"
                  className="h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                />
                <label htmlFor="coupon_active" className="text-sm font-bold text-ink-slate cursor-pointer">
                  Activate Coupon immediately
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-border-subtle pt-6">
                <Button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3 px-6 font-bold uppercase tracking-wider text-xs transition-all"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={modalLoading}
                  className="bg-primary hover:bg-[#005a14] text-white rounded-xl py-3 px-6 font-bold uppercase tracking-wider text-xs flex items-center gap-2 shadow-md transition-all"
                >
                  {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponsPage;
