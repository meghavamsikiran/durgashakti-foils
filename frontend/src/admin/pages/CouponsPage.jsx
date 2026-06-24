import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Ticket, Plus, Search, Edit2, Trash2, Settings, 
  Check, X, TrendingUp, Coins, IndianRupee, Calendar, Info, Loader2, Megaphone, Sparkles, Copy, Star, UserCheck, Filter, Download, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import couponService from '../../services/coupon.service';
import adminService from '../services/admin.service';
import apiClient from '../../services/core/apiClient';
import { Button } from '../../components/ui/button';
import PageLoader from '../../components/ui/PageLoader';
import { useProgress } from '../../components/ui/ProgressToast';

import TablePagination from '../../components/ui/TablePagination';

const generateThemedBanner = (context) => {
  const ctx = context.trim().toUpperCase();
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  
  // Default values
  let title = `${ctx} SPECIAL SALE`;
  let subtitle = "Special festive discounts just for you! Apply code at checkout.";
  let bgGradient = "from-[#2e0854] via-[#1c0336] to-[#0f001f]"; // dark violet default
  let textGradient = "from-amber-200 via-orange-400 to-yellow-250";
  let borderColor = "border-amber-400";
  let emojiPattern = "⚡🎁🔥";
  let animationStyle = "pulse";

  if (ctx.includes("DIWALI") || ctx.includes("DEEPAVALI")) {
    title = rand([
      "🪔 FESTIVE DIWALI DHAMAKA SALE 🪔",
      "✨ SHUBH DEEPAVALI CELEBRATION ✨",
      "🌟 DIWALI SHINES: FESTIVE SAVINGS 🌟",
      "🪔 DURGA SHAKTI DIWALI FESTIVAL 🪔"
    ]);
    subtitle = rand([
      "Celebrate the Festival of Lights with pure premium packaging. Light up your kitchen with golden festive savings!",
      "Bring home purity, happiness, and light. Special festive discounts on premium kitchen foils.",
      "Traditional recipes deserve traditional care. Wrap your festive sweets in premium silver shine.",
      "Celebrate Diwali with fresh, hot delicacies. Up to 50% off on premium food wraps today!"
    ]);
    bgGradient = rand([
      "from-[#0b0621] via-[#160c40] to-[#04010a]",
      "from-[#1e0a3d] via-[#3d147a] to-[#0f0326]",
      "from-[#2d0b00] via-[#5e1903] to-[#140500]"
    ]);
    textGradient = rand([
      "from-[#ffe066] via-[#f59e0b] to-[#ea580c]",
      "from-yellow-100 via-amber-300 to-yellow-400",
      "from-amber-200 via-orange-400 to-yellow-250"
    ]);
    borderColor = rand(["border-[#f59e0b]", "border-amber-400", "border-yellow-500"]);
    emojiPattern = rand(["🪔✨🎆🎉", "🪔✨🏮🌟", "🪔🔱🌸🔥"]);
    animationStyle = rand(["sparkle", "pulse", "float"]);
  } else if (ctx.includes("CHRISTMAS") || ctx.includes("XMAS") || ctx.includes("WINTER")) {
    title = rand([
      "🎄 MERRY CHRISTMAS CELEBRATION 🎄",
      "❄️ WINTER WONDERLAND DISCOUNTS ❄️",
      "🎁 HOLIDAY CHEER SPECIAL SALE 🎁",
      "🎅 SANTA'S SECRET FESTIVE DEALS 🎅"
    ]);
    subtitle = rand([
      "Unwrap premium holiday savings! Bring magic and freshness to your festive family meals.",
      "Premium quality wraps for your cozy winter kitchen. Keep your holiday bakes fresh and warm.",
      "Wrap up the holiday love and freshness. Special Christmas discounts applied instantly!",
      "Joy, warmth, and fresh delicious meals. Give your holiday feast the protection it deserves."
    ]);
    bgGradient = rand([
      "from-[#022c22] via-[#0f172a] to-[#0b0f19]",
      "from-[#0f172a] via-[#1e293b] to-[#090d16]",
      "from-[#450a0a] via-[#0f172a] to-[#020617]"
    ]);
    textGradient = rand([
      "from-red-400 via-yellow-100 to-emerald-400",
      "from-sky-200 via-white to-sky-400",
      "from-red-300 via-rose-200 to-white"
    ]);
    borderColor = rand(["border-red-500", "border-emerald-500", "border-sky-300"]);
    emojiPattern = rand(["🎅❄️🎁🎄", "❄️☃️🧣☕", "🎄🎁🔔✨"]);
    animationStyle = rand(["snow", "float", "pulse"]);
  } else if (ctx.includes("PONGAL") || ctx.includes("SANKRANTI") || ctx.includes("HARVEST") || ctx.includes("ONAM") || ctx.includes("VISHU")) {
    title = rand([
      "🌾 HAPPY PONGAL & SANKRANTI 🌾",
      "🪁 FESTIVE SANKRANTI HARVEST SALE 🪁",
      "🍯 TRADITIONAL HARVEST CELEBRATION 🍯",
      "🌾 ONAM & VISHU SPECIAL FEAST 🌾"
    ]);
    subtitle = rand([
      "Bring home the harvest of happiness! Premium quality kitchen foils for your traditional recipes.",
      "Traditional recipes deserve the ultimate freshness. Savor the festive taste of harvest delicacies.",
      "Warm wishes of Sankranti & Pongal. Keep your sweet pongal hot and flavorful with Durga Shakti.",
      "Joyous harvest celebrations to you! Fresh food wraps for your grand family feast."
    ]);
    bgGradient = rand([
      "from-[#0f3a20] via-[#052e16] to-[#021c0e]",
      "from-[#1e3a1e] via-[#2f5e3b] to-[#0c2411]",
      "from-[#3f2002] via-[#78350f] to-[#1c0d02]"
    ]);
    textGradient = rand([
      "from-[#fed7aa] via-[#f59e0b] to-[#84cc16]",
      "from-yellow-100 via-amber-300 to-orange-400",
      "from-emerald-300 via-green-100 to-yellow-250"
    ]);
    borderColor = rand(["border-[#f59e0b]", "border-amber-500", "border-emerald-500"]);
    emojiPattern = rand(["🌾🌞🪁🍯", "🌾🌞🍁🔥", "🌾🌾🍯🥥"]);
    animationStyle = rand(["float", "pulse", "sparkle"]);
  } else if (ctx.includes("LOHRI")) {
    title = "🔥 HAPPY LOHRI CELEBRATION 🔥";
    subtitle = "Warm wishes and delicious recipes! Premium wraps for the auspicious bonfire festival.";
    bgGradient = rand(["from-[#2d0f05] via-[#7c2d12] to-[#1c0702]", "from-[#3e1402] via-[#5c1c03] to-[#1c0702]"]);
    textGradient = rand(["from-yellow-200 via-amber-300 to-orange-500", "from-yellow-100 via-orange-400 to-yellow-350"]);
    borderColor = "border-orange-500";
    emojiPattern = rand(["🔥🌾🍿🥜", "🔥✨🍿🎉"]);
    animationStyle = rand(["pulse", "sparkle"]);
  } else if (ctx.includes("INDEPENDENCE") || ctx.includes("REPUBLIC") || ctx.includes("INDIA") || ctx.includes("FREEDOM") || ctx.includes("PATRIOTIC")) {
    title = rand([
      "🇮🇳 PATRIOTIC CELEBRATION SALE 🇮🇳",
      "⚡ TRULY INDIAN PREMIUM CELEBRATION ⚡",
      "🦅 SPIRIT OF FREEDOM FESTIVAL 🦅",
      "🇮🇳 JAI HIND SPECIAL OFFERS 🇮🇳"
    ]);
    subtitle = rand([
      "Celebrating the spirit of purity, freedom, and strength. Truly Indian premium kitchen wraps.",
      "Built with strength and purity. Durga Shakti brings you patriotic savings on food protection.",
      "Honoring our nation with pride. Premium silver foils to keep your family meals fresh.",
      "The ultimate seal of freshness and trust, made in India. Celebrate with tricolor savings!"
    ]);
    bgGradient = rand([
      "from-[#0b0f19] via-[#111827] to-[#030712]",
      "from-[#0f172a] via-[#1e3a8a] to-[#090d16]",
      "from-[#0b2b1d] via-[#1e3a8a] to-[#110f24]"
    ]);
    textGradient = rand([
      "from-[#ff9933] via-white to-[#128807]",
      "from-orange-400 via-white to-emerald-400",
      "from-white via-[#ff9933] to-[#128807]"
    ]);
    borderColor = rand(["border-[#ff9933]", "border-emerald-500", "border-white"]);
    emojiPattern = rand(["🇮🇳🦅⚡🎖️", "🇮🇳✨🌟🔥", "🇮🇳🤝⚡🏆"]);
    animationStyle = rand(["tricolor", "pulse", "sparkle"]);
  } else if (ctx.includes("ANNIVERSARY") || ctx.includes("BIRTHDAY") || ctx.includes("CELEBRATION") || ctx.includes("WEDDING")) {
    title = rand([
      "🎉 ANNIVERSARY CELEBRATION 🎉",
      "🎂 GRAND CELEBRATION SALE 🎂",
      "🎈 PARTY BLOWOUT OFFERS 🎈",
      "🥂 MILESTONE FESTIVE SPECIAL 🥂"
    ]);
    subtitle = rand([
      "Celebrating a milestone of excellence with our beloved customers! Extra discount inside.",
      "Thank you for being part of our journey! Premium quality food wraps with celebration discounts.",
      "Throwing a party of savings! Wrap your celebration bakes in premium silver wraps.",
      "Celebrate in style and keep your food incredibly fresh. Up to 50% discount applies today."
    ]);
    bgGradient = rand([
      "from-[#4c0519] via-[#881337] to-[#1e0008]",
      "from-[#3b0764] via-[#5b21b6] to-[#1e1b4b]",
      "from-[#500724] via-[#9d174d] to-[#1c000c]"
    ]);
    textGradient = rand([
      "from-pink-300 via-amber-250 to-rose-300",
      "from-pink-300 via-yellow-200 to-cyan-300",
      "from-yellow-250 via-amber-300 to-yellow-100"
    ]);
    borderColor = rand(["border-pink-500", "border-purple-400", "border-amber-400"]);
    emojiPattern = rand(["🎂🎉🎈🎁", "🥂✨🎉🎆", "🎈🎁🎀✨"]);
    animationStyle = rand(["float", "sparkle", "pulse"]);
  } else if (ctx.includes("VALENTINE") || ctx.includes("LOVE") || ctx.includes("ROSE") || ctx.includes("ROMANCE")) {
    title = rand([
      "💖 VALENTINE'S SPECIAL SALE 💖",
      "🌹 WRAPPED WITH LOVE SPECIAL 🌹",
      "🍫 SWEETEST ROMANCE OFFERS 🍫",
      "💖 VALENTINE'S CELEBRATION 💖"
    ]);
    subtitle = rand([
      "Made with love, wrapped with care. Treat your loved ones to fresh, delicious home-cooked meals!",
      "Lock in the flavor and warmth of your home-cooked meals. Special Valentine's discounts inside.",
      "Delicious food wrapped in love and purity. Grab premium kitchen wraps with sweet discounts.",
      "Keep your valentine's treats fresh and delicious. Durga Shakti brings premium quality wraps."
    ]);
    bgGradient = rand([
      "from-[#831843] via-[#4c0519] to-[#1e0008]",
      "from-[#500724] via-[#9d174d] to-[#1c000c]",
      "from-[#2e0854] via-[#5b21b6] to-[#1c000c]"
    ]);
    textGradient = rand([
      "from-pink-200 via-rose-300 to-amber-200",
      "from-pink-200 via-rose-350 to-pink-100",
      "from-red-300 via-pink-200 to-white"
    ]);
    borderColor = rand(["border-pink-400", "border-pink-500", "border-red-500"]);
    emojiPattern = rand(["💖🌹🍫🎁", "🌸🌺🎀🧁", "💖✨🌹🍫"]);
    animationStyle = rand(["float", "pulse", "sparkle"]);
  } else if (ctx.includes("EASTER") || ctx.includes("SPRING")) {
    title = "🐰 HAPPY EASTER SPECIAL 🐰";
    subtitle = "Hop into fresh spring savings! Beautiful family dinners wrapped in premium quality.";
    bgGradient = rand(["from-[#1e293b] via-[#0f172a] to-[#020617]", "from-[#0f172a] via-[#1e3a8a] to-[#020617]"]);
    textGradient = rand(["from-pink-300 via-emerald-250 to-sky-300", "from-sky-200 via-pink-150 to-white"]);
    borderColor = "border-pink-300";
    emojiPattern = "🐰🐣🌸🥚";
    animationStyle = "float";
  } else if (ctx.includes("HALLOWEEN") || ctx.includes("SPOOKY")) {
    title = "🎃 HALLOWEEN SPOOKY SALE 🎃";
    subtitle = "Scary good deals on premium food wraps! Keep your treats fresh and delicious.";
    bgGradient = "from-[#0f0c1b] via-[#241203] to-[#09000a]";
    textGradient = "from-[#ea580c] via-[#f59e0b] to-[#ea580c]";
    borderColor = "border-[#ea580c]";
    emojiPattern = "🎃👻🦇🍬";
    animationStyle = "float";
  } else if (ctx.includes("NEW YEAR") || ctx.includes("EVE")) {
    title = rand([
      "🥂 HAPPY NEW YEAR CELEBRATION 🥂",
      "✨ NEW YEAR FRESH START SALE ✨",
      "🎆 COUNTDOWN PARTY DISCOUNTS 🎆",
      "🥂 2026 NEW YEAR BONANZA 🥂"
    ]);
    subtitle = rand([
      "Toast to fresh beginnings and huge savings! Premium quality wraps for the new year.",
      "Start the new year with freshness and purity in your kitchen. Special New Year offers!",
      "Counting down to massive savings! Keep your holiday leftovers fresh and delicious.",
      "New year, fresh deals, premium wraps. Up to 50% discount applied immediately!"
    ]);
    bgGradient = rand([
      "from-[#020617] via-[#1e1b4b] to-[#0f172a]",
      "from-[#0b0621] via-[#160c40] to-[#04010a]",
      "from-[#0f172a] via-[#1e293b] to-[#090d16]"
    ]);
    textGradient = rand([
      "from-yellow-250 via-amber-300 to-yellow-100",
      "from-cyan-300 via-yellow-250 to-pink-300",
      "from-slate-100 via-white to-slate-300"
    ]);
    borderColor = rand(["border-amber-400", "border-cyan-400", "border-slate-400"]);
    emojiPattern = rand(["🥂✨🎉🎆", "🥂✨🌟👑", "🎉✨⏰💥"]);
    animationStyle = rand(["sparkle", "pulse", "float"]);
  } else if (ctx.includes("EID") || ctx.includes("RAMADAN") || ctx.includes("IFTAR")) {
    title = rand([
      "🌙 BLESSED EID & RAMADAN SPECIAL 🌙",
      "🕌 EID FEAST CELEBRATION 🕌",
      "🤝 BLESSED RAMADAN DEALS 🤝",
      "🌙 EID MUBARAK CELEBRATION 🌙"
    ]);
    subtitle = rand([
      "Share the feast of joy and blessings! Premium food wraps for your festive delicacies.",
      "Keep your traditional Iftar meals warm, fresh, and hygienic with Durga Shakti Foils.",
      "Celebrate Eid with purity and love. Premium quality food wraps with special blessings.",
      "Bring home the seal of purity and health. Special Eid discounts applied instantly!"
    ]);
    bgGradient = rand([
      "from-[#012217] via-[#044e36] to-[#00140e]",
      "from-[#022c22] via-[#0f172a] to-[#0b0f19]",
      "from-[#1e0a3d] via-[#044e36] to-[#031d2c]"
    ]);
    textGradient = rand([
      "from-yellow-250 via-amber-300 to-emerald-250",
      "from-emerald-300 via-green-100 to-yellow-250",
      "from-yellow-100 via-amber-300 to-yellow-400"
    ]);
    borderColor = rand(["border-amber-400", "border-emerald-500", "border-yellow-500"]);
    emojiPattern = rand(["🌙✨🕌🤝", "🌙✨🌟🤝", "🌙🕌🥥🍲"]);
    animationStyle = rand(["sparkle", "float", "pulse"]);
  } else if (ctx.includes("HOLI")) {
    title = rand([
      "🎨 HOLI FESTIVAL OF COLORS 🎨",
      "🌈 SPLASH OF COLOR SPECIAL SALE 🌈",
      "🥳 HAPPY HOLI FESTIVE BONANZA 🥳",
      "🎨 HOLI CELEBRATION DEALS 🎨"
    ]);
    subtitle = rand([
      "Splashes of joy, colors, and huge savings! Keep your festive treats delicious and fresh.",
      "Make your kitchen as colorful and pure as the festival. Premium wraps at amazing prices!",
      "Traditional sweets and snacks stay hot and fresh. Up to 50% discount on premium wraps.",
      "Celebrate the festival of colors with premium food wrapping solutions from Durga Shakti."
    ]);
    bgGradient = rand([
      "from-[#3b0764] via-[#5b21b6] to-[#1e1b4b]",
      "from-[#500724] via-[#9d174d] to-[#1c000c]",
      "from-[#042f2e] via-[#0d9488] to-[#021f1d]"
    ]);
    textGradient = rand([
      "from-pink-300 via-yellow-200 to-cyan-300",
      "from-pink-300 via-emerald-250 to-sky-300",
      "from-yellow-250 via-amber-300 to-yellow-100"
    ]);
    borderColor = rand(["border-pink-400", "border-purple-400", "border-cyan-400"]);
    emojiPattern = rand(["🎨✨🎉🥳", "🎨🌈✨🍿", "🎨🥳✨🍡"]);
    animationStyle = rand(["sparkle", "float", "pulse"]);
  } else if (ctx.includes("DURGA") || ctx.includes("SHAKTI") || ctx.includes("NAVRATRI") || ctx.includes("DUSSEHRA") || ctx.includes("PUJA")) {
    title = rand(["🪔 HAPPY NAVRATRI & DUSSEHRA 🪔", "🔱 SHUBH NAVRATRI CELEBRATION 🔱", "🪔 FESTIVE DURGA PUJA SPECIAL 🪔"]);
    subtitle = rand([
      "Celebrate the victory of good over evil. Premium food wraps for your traditional home-cooked feasts.",
      "Auspicious celebrations with purity and strength. Wrap your festive delicacies with Durga Shakti.",
      "Warm festive wishes! Purity, strength, and freshness locked in for your celebrations."
    ]);
    bgGradient = rand(["from-[#450a0a] via-[#7f1d1d] to-[#1a0505]", "from-[#5c0606] via-[#991b1b] to-[#2b0303]"]);
    textGradient = rand(["from-yellow-100 via-amber-400 to-orange-500", "from-yellow-250 via-yellow-100 to-amber-300"]);
    borderColor = "border-yellow-400";
    emojiPattern = rand(["🪔🔱🌸🔥", "🔱🪔✨🌸"]);
    animationStyle = rand(["sparkle", "pulse", "float"]);
  } else if (ctx.includes("SUMMER")) {
    title = rand(["☀️ HOT SUMMER BLOWOUT ☀️", "🌊 SUNNY SUMMER DISCOUNTS 🌊", "☀️ SUMMER REFRESH OFFERS ☀️"]);
    subtitle = rand([
      "Beat the heat with coolest deals on premium wraps. Perfect for summer picnics and BBQs!",
      "Keep your summer fruits and picnic bakes fresh and cool with Durga Shakti.",
      "Hot summer savings on our entire range of premium kitchen packaging wraps."
    ]);
    bgGradient = rand(["from-[#7c2d12] via-[#ea580c] to-[#3f160a]", "from-[#082f49] via-[#0284c7] to-[#0c4a6e]"]);
    textGradient = rand(["from-yellow-250 via-amber-300 to-yellow-100", "from-cyan-150 via-white to-yellow-100"]);
    borderColor = "border-yellow-400";
    emojiPattern = rand(["☀️🌊🍦⛱️", "☀️🧊🌴⛱️"]);
    animationStyle = rand(["pulse", "float"]);
  } else if (ctx.includes("MONSOON") || ctx.includes("RAIN") || ctx.includes("CLOUDY")) {
    title = rand(["⛈️ MONSOON SPECIAL SALE ⛈️", "☔ MONSOON SAVINGS EXTRAVAGANZA ☔", "🌧️ RAINY DAY SPECIAL OFFERS 🌧️"]);
    subtitle = rand([
      "Keep your food fresh and hot during the rains. Protect your kitchen with Durga Shakti Foils.",
      "Stay warm, eat fresh! Lock in heat and moisture for your monsoon chai and snacks.",
      "Raining discounts! Up to 50% off on all premium household foil wraps."
    ]);
    bgGradient = rand(["from-[#0f172a] via-[#1e3a8a] to-[#090d16]", "from-[#1e293b] via-[#0f172a] to-[#020617]"]);
    textGradient = rand(["from-blue-200 via-sky-300 to-cyan-150", "from-slate-100 via-sky-200 to-white"]);
    borderColor = "border-sky-400";
    emojiPattern = rand(["⛈️🌧️☂️☔", "🌧️☔☕🍪"]);
    animationStyle = rand(["snow", "float"]);
  } else if (ctx.includes("GOLD") || ctx.includes("YELLOW") || ctx.includes("SAFFRON") || ctx.includes("AMBER")) {
    title = `✨ ${ctx} PREMIUM OFFER ✨`;
    subtitle = "Luxury packaging solutions with gold-standard savings. Limited time special offer!";
    bgGradient = rand(["from-[#2e1f02] via-[#453003] to-[#140e01]", "from-[#3a2a07] via-[#5c4611] to-[#1c1402]"]);
    textGradient = rand(["from-yellow-100 via-amber-300 to-yellow-400", "from-amber-100 via-yellow-250 to-amber-350"]);
    borderColor = "border-amber-400";
    emojiPattern = "👑🏆✨💰";
    animationStyle = rand(["sparkle", "pulse"]);
  } else if (ctx.includes("GREEN") || ctx.includes("MINT") || ctx.includes("ECO") || ctx.includes("NATURE") || ctx.includes("ORGANIC") || ctx.includes("FOREST")) {
    title = `🌿 ${ctx} ECO-FRIENDLY SPECIAL 🌿`;
    subtitle = "Go green, stay fresh! Premium sustainable wraps for a healthy, green kitchen.";
    bgGradient = rand(["from-[#022c22] via-[#064e3b] to-[#012216]", "from-[#064e3b] via-[#14532d] to-[#052e16]"]);
    textGradient = rand(["from-emerald-300 via-green-100 to-yellow-250", "from-emerald-250 via-teal-150 to-green-100"]);
    borderColor = "border-emerald-500";
    emojiPattern = rand(["🌿🍀🍃♻️", "🌿🍃🌱♻️"]);
    animationStyle = rand(["float", "pulse"]);
  } else if (ctx.includes("BLUE") || ctx.includes("OCEAN") || ctx.includes("SKY") || ctx.includes("WATER") || ctx.includes("COOL") || ctx.includes("ICE")) {
    title = `❄️ ${ctx} REFRESHING SPECIAL ❄️`;
    subtitle = "Lock in extreme freshness and flavor! Cool deals for your storage needs.";
    bgGradient = rand(["from-[#0c4a6e] via-[#075985] to-[#031d2c]", "from-[#0c1a30] via-[#082f49] to-[#021424]"]);
    textGradient = rand(["from-sky-200 via-cyan-100 to-indigo-300", "from-cyan-150 via-sky-200 to-white"]);
    borderColor = "border-sky-400";
    emojiPattern = rand(["🌊❄️🧊💧", "❄️🧊💧💙"]);
    animationStyle = rand(["snow", "float"]);
  } else if (ctx.includes("RED") || ctx.includes("FIRE") || ctx.includes("HOT") || ctx.includes("SPICY") || ctx.includes("RUBY") || ctx.includes("CRIMSON")) {
    title = `🔥 ${ctx} SIZZLING DEAL 🔥`;
    subtitle = "Hot deals that won't last! Keep your food sizzling hot and fresh with Durga Shakti.";
    bgGradient = rand(["from-[#450a0a] via-[#7f1d1d] to-[#180202]", "from-[#5c0606] via-[#b91c1c] to-[#2d0202]"]);
    textGradient = rand(["from-red-300 via-orange-300 to-yellow-100", "from-orange-400 via-red-200 to-yellow-200"]);
    borderColor = "border-red-500";
    emojiPattern = rand(["🔥🌶️⚡💥", "🔥💥🌶️🥘"]);
    animationStyle = rand(["pulse", "sparkle"]);
  } else if (ctx.includes("DARK") || ctx.includes("BLACK") || ctx.includes("NIGHT") || ctx.includes("MIDNIGHT") || ctx.includes("ONYX")) {
    title = `🕶️ ${ctx} EXCLUSIVE ACCESS 🕶️`;
    subtitle = "Premium dark-themed luxury discounts. Reserved for our most exclusive club members.";
    bgGradient = rand(["from-[#0f172a] via-[#020617] to-[#000000]", "from-[#1e293b] via-[#0f172a] to-[#020617]"]);
    textGradient = rand(["from-slate-100 via-slate-300 to-slate-500", "from-slate-200 via-white to-slate-400"]);
    borderColor = "border-slate-700";
    emojiPattern = "🕶️🔒🖤🎩";
    animationStyle = rand(["pulse", "float"]);
  } else if (ctx.includes("SILVER") || ctx.includes("GRAY") || ctx.includes("GREY") || ctx.includes("METAL") || ctx.includes("METALLIC") || ctx.includes("FOIL")) {
    title = `💿 ${ctx} METALLIC SPECIAL 💿`;
    subtitle = "The ultimate shine of purity and strength! Premium silver foil wraps for your cooking masterpieces.";
    bgGradient = rand(["from-[#334155] via-[#1e293b] to-[#0f172a]", "from-[#475569] via-[#334155] to-[#1e293b]"]);
    textGradient = rand(["from-slate-100 via-white to-slate-300", "from-white via-slate-200 to-slate-400"]);
    borderColor = "border-slate-400";
    emojiPattern = "💿🛡️⚡💎";
    animationStyle = rand(["float", "pulse"]);
  } else if (ctx.includes("PURPLE") || ctx.includes("VIOLET") || ctx.includes("COSMIC") || ctx.includes("MAGIC") || ctx.includes("NEON") || ctx.includes("SPACE") || ctx.includes("GALAXY")) {
    title = `🔮 ${ctx} MAGICAL SPECIAL 🔮`;
    subtitle = "Out of this world discounts! Lock in magic freshness for all your traditional dishes.";
    bgGradient = rand(["from-[#3b0764] via-[#5b21b6] to-[#1e1b4b]", "from-[#2e0854] via-[#4a044e] to-[#1c0024]"]);
    textGradient = rand(["from-pink-300 via-purple-200 to-cyan-300", "from-purple-200 via-pink-250 to-white"]);
    borderColor = "border-purple-400";
    emojiPattern = "🔮🌌🛸🌀";
    animationStyle = rand(["sparkle", "float"]);
  } else if (ctx.includes("CYAN") || ctx.includes("TEAL") || ctx.includes("TURQUOISE") || ctx.includes("AQUA") || ctx.includes("TROPICAL")) {
    title = `🏝️ ${ctx} TROPICAL SPECIAL 🏝️`;
    subtitle = "Fresh, vibrant, and cooling deals! Keep your food beach-ready and delicious.";
    bgGradient = rand(["from-[#042f2e] via-[#0d9488] to-[#021f1d]", "from-[#0d9488] via-[#0284c7] to-[#075985]"]);
    textGradient = rand(["from-teal-100 via-cyan-200 to-emerald-250", "from-cyan-100 via-teal-100 to-white"]);
    borderColor = "border-teal-400";
    emojiPattern = "🏝️🐠🌊🍹";
    animationStyle = rand(["float", "pulse"]);
  } else if (ctx.includes("ORANGE") || ctx.includes("PEACH") || ctx.includes("SUNSET") || ctx.includes("CORAL") || ctx.includes("SALMON")) {
    title = `🌅 ${ctx} SUNSET BLOWOUT 🌅`;
    subtitle = "Warm glowing discounts on our premium range! Bring home quality wrapping today.";
    bgGradient = rand(["from-[#7c2d12] via-[#c2410c] to-[#2d0f05]", "from-[#c2410c] via-[#ea580c] to-[#431407]"]);
    textGradient = rand(["from-orange-200 via-amber-300 to-yellow-100", "from-orange-100 via-peach-200 to-white"]);
    borderColor = "border-orange-500";
    emojiPattern = "🌅🍊🍑🍂";
    animationStyle = rand(["pulse", "float"]);
  } else if (ctx.includes("PINK") || ctx.includes("ROSE") || ctx.includes("BLOSSOM")) {
    title = `🌸 ${ctx} BLOSSOM SPECIAL 🌸`;
    subtitle = "Delightful deals in full bloom! Keep your spring recipes fresh and colorful.";
    bgGradient = rand(["from-[#500724] via-[#9d174d] to-[#1c000c]", "from-[#831843] via-[#db2777] to-[#4c0519]"]);
    textGradient = rand(["from-pink-200 via-rose-350 to-pink-100", "from-pink-150 via-rose-200 to-white"]);
    borderColor = "border-pink-500";
    emojiPattern = "🌸🌺🎀🧁";
    animationStyle = rand(["float", "sparkle"]);
  }
  // Generic Fallback
  else {
    const palettes = [
      {
        bg: "from-[#1e1b4b] via-[#311054] to-[#0f052d]",
        text: "from-amber-200 via-yellow-400 to-orange-400",
        border: "border-amber-400",
        emojis: "✨⚡🔥🎉",
        anim: "sparkle",
        suffix: "CELEBRATION"
      },
      {
        bg: "from-[#450a0a] via-[#2d0614] to-[#120005]",
        text: "from-yellow-100 via-amber-300 to-rose-400",
        border: "border-rose-500",
        emojis: "🎁💥⚡🔥",
        anim: "pulse",
        suffix: "MEGA SPECIAL"
      },
      {
        bg: "from-[#022c22] via-[#064e3b] to-[#012216]",
        text: "from-emerald-300 via-yellow-200 to-amber-300",
        border: "border-emerald-500",
        emojis: "💎✨🏅🏆",
        anim: "sparkle",
        suffix: "EXCLUSIVE DEALS"
      },
      {
        bg: "from-[#3b0764] via-[#1e1b4b] to-[#0f001c]",
        text: "from-pink-300 via-yellow-100 to-cyan-300",
        border: "border-purple-400",
        emojis: "🔮⚡🛸🌀",
        anim: "float",
        suffix: "FLASH SALE"
      },
      {
        bg: "from-[#075985] via-[#1e3a8a] to-[#0c1a30]",
        text: "from-cyan-200 via-sky-300 to-indigo-200",
        border: "border-sky-400",
        emojis: "🌊☀️🍦⛵",
        anim: "float",
        suffix: "REFRESHING BLOWOUT"
      },
      {
        bg: "from-[#7c2d12] via-[#431407] to-[#1c0702]",
        text: "from-yellow-100 via-amber-400 to-orange-500",
        border: "border-orange-500",
        emojis: "🍂☀️🍁🔥",
        anim: "pulse",
        suffix: "SUNSET SPECIAL"
      }
    ];

    const picked = rand(palettes);
    title = rand([
      `✨ ${ctx} ${picked.suffix} ✨`,
      `🌟 ${ctx} SPECIAL OFFER 🌟`,
      `⚡ ${ctx} FLASH SALE ⚡`,
      `🎉 ${ctx} FESTIVE DEALS 🎉`
    ]);
    subtitle = rand([
      "Special festive discounts just for you! Apply code at checkout.",
      "Purity, strength, and amazing savings. Lock in food freshness today!",
      "Upgrade your kitchen packaging and save big. Limited time exclusive offer!",
      "Delicious meals deserve premium protection. Apply coupon code at checkout."
    ]);
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

const isCouponExpired = (coupon) => {
  if (!coupon?.expiry_date) return false;
  return new Date(coupon.expiry_date).getTime() <= Date.now();
};

const isBannerSelectableCoupon = (coupon) => Boolean(
  coupon?.code &&
  coupon.is_active !== false &&
  !isCouponExpired(coupon)
);

const getCouponExpiryTone = (coupon) => {
  if (!coupon?.expiry_date) return 'text-emerald-700 font-bold';
  const expiry = new Date(coupon.expiry_date).getTime();
  const now = Date.now();
  if (expiry <= now) return 'text-red-500 font-bold';
  if (expiry - now <= 24 * 60 * 60 * 1000) return 'text-amber-600 font-bold';
  return 'text-emerald-700 font-bold';
};

const normalizeCouponList = (list = []) => (
  (list || [])
    .filter(c => c !== null && c !== undefined && c.code)
);

function toISODateStart(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString();
}

function toISODateEnd(d) {
  const dt = new Date(d);
  dt.setHours(23, 59, 59, 999);
  return dt.toISOString();
}

function rangeForPreset(key) {
  const now = new Date();
  const start = new Date();
  switch (key) {
    case 'today':
      return { start: toISODateStart(now), end: toISODateEnd(now) };
    case 'last7':
      start.setDate(now.getDate() - 6);
      return { start: toISODateStart(start), end: toISODateEnd(now) };
    case 'thisWeek': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      return { start: toISODateStart(start), end: toISODateEnd(now) };
    }
    case 'thisMonth':
      start.setDate(1);
      return { start: toISODateStart(start), end: toISODateEnd(now) };
    case 'thisYear':
      start.setMonth(0, 1);
      return { start: toISODateStart(start), end: toISODateEnd(now) };
    default:
      return null;
  }
}

const sanitizePopupBanner = (popupBannerValue = {}, coupons = []) => {
  const activeCodes = new Set(coupons.filter(isBannerSelectableCoupon).map(c => c.code));
  return {
    ...(popupBannerValue || {}),
    promoted_coupons: (popupBannerValue?.promoted_coupons || []).filter(Boolean),
    custom_banners: (popupBannerValue?.custom_banners || [])
      .filter(Boolean)
      .map(theme => {
        const originalCodes = (theme.coupon_codes || []).filter(Boolean);
        const anyActive = originalCodes.some(code => activeCodes.has(code));
        return {
          ...theme,
          is_active: originalCodes.length > 0 ? anyActive : theme.is_active,
          coupon_codes: originalCodes,
          linked_coupons: (theme.linked_coupons || []).filter(Boolean)
        };
      })
  };
};

const CouponsPage = () => {
  const [coupons, setCoupons] = useState(() => {
    const cached = apiClient.getCachedDataSync('/admin/coupons');
    return normalizeCouponList(cached?.data || []);
  });
  const [settings, setSettings] = useState(() => {
    const cached = apiClient.getCachedDataSync('/admin/coupons/settings');
    return cached?.data || {
      system_enabled: true,
      stacking_enabled: false,
      single_use_per_account: false
    };
  });
  const [loading, setLoading] = useState(() => {
    const cachedCoupons = apiClient.getCachedDataSync('/admin/coupons');
    const cachedSettings = apiClient.getCachedDataSync('/admin/coupons/settings');
    return !(cachedCoupons && cachedSettings);
  });
  const [error, setError] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(null);
  const [datePreset, setDatePreset] = useState('');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [tempStatusFilter, setTempStatusFilter] = useState('all');
  const [tempDatePreset, setTempDatePreset] = useState('');
  const [tempDateFilter, setTempDateFilter] = useState(null);
  const [tempCustomDateRange, setTempCustomDateRange] = useState({ start: '', end: '' });
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = React.useRef(null);
  const [loyalCustomers, setLoyalCustomers] = useState([]);
  const [loyalCustomerSearch, setLoyalCustomerSearch] = useState('');
  const [loyalCustomerLoading, setLoyalCustomerLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [couponAnalytics, setCouponAnalytics] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { startProgress, updateProgress, finishProgress } = useProgress();

  const initialBannerForm = {
    id: null,
    theme_context: '',
    title: '',
    subtitle: '',
    is_active: false,
    show_on_landing: false,
    show_on_shop: false,
    show_on_checkout: false,
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
    coupon_type: 'standard',
    apply_to_all_loyal_customers: false,
    eligible_customer_ids: [],
    apply_to_all_products: false,
    eligible_product_ids: [],
    eligible_category_ids: [],
    is_reusable: true,
    is_active: true
  });

  const fetchCouponsAndSettings = useCallback(async () => {
    const cachedCoupons = apiClient.getCachedDataSync('/admin/coupons');
    const cachedSettings = apiClient.getCachedDataSync('/admin/coupons/settings');
    if (cachedCoupons && cachedSettings) {
      setCoupons(normalizeCouponList(cachedCoupons.data || []));
      setSettings(cachedSettings.data);
    } else if (coupons.length === 0) {
      setLoading(true);
    }
    try {
      setError(null);
      const [couponsData, settingsData, adminSettingsRes, loyalCustomerData, analyticsData] = await Promise.all([
        couponService.getCoupons(),
        couponService.getSettings(),
        adminService.getSettings({ silent: true }).catch(() =>
          apiClient.cachedGet('/settings/public', { silent: true })
        ),
        couponService.getLoyalCustomers({ limit: 25 }).catch(() => ({ items: [] })),
        couponService.getAnalytics().catch(() => null)
      ]);
      const normalizedCoupons = normalizeCouponList(couponsData || []);
      setCoupons(normalizedCoupons);
      setSettings(settingsData);
      const adminSettings = adminSettingsRes.data || {};
      const bannerVal = adminSettings.scrolling_banner || { text1: '', text2: '', timer_enabled: false, timer_target: '', use_favicon: true };
      const popupPromotedCoupons =
        bannerVal.popup_promoted_coupons ||
        adminSettings.popup_banner?.promoted_coupons ||
        [];
      const cleanedPopupBanner = sanitizePopupBanner(
        adminSettings.popup_banner || { promoted_coupons: popupPromotedCoupons },
        normalizedCoupons
      );
      setScrollingBanner(bannerVal);
      setPopupBanner(cleanedPopupBanner);
      setCustomBanners((cleanedPopupBanner.custom_banners || []).filter(b => b !== null && b !== undefined));
      if (JSON.stringify(cleanedPopupBanner) !== JSON.stringify(adminSettings.popup_banner || { promoted_coupons: popupPromotedCoupons })) {
        adminService.updateSetting({ key: 'popup_banner', value: cleanedPopupBanner }).catch(() => {});
      }
      setLoyalCustomers(loyalCustomerData?.items || []);
      setCouponAnalytics(analyticsData);
    } catch (err) {
      setCoupons(prev => {
        if (!prev || prev.length === 0) {
          setError(err.message || 'Failed to load coupon data. Please try again.');
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, [coupons.length]);

  useEffect(() => {
    fetchCouponsAndSettings();
  }, [fetchCouponsAndSettings]);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    if (formData.coupon_type === 'loyalty' && !formData.apply_to_all_loyal_customers) {
      const timer = setTimeout(async () => {
        setLoyalCustomerLoading(true);
        try {
          const data = await couponService.getLoyalCustomers({ search: loyalCustomerSearch.trim(), limit: 50 });
          setLoyalCustomers(data?.items || []);
        } catch {
          setLoyalCustomers([]);
        } finally {
          setLoyalCustomerLoading(false);
        }
      }, 180);
      return () => clearTimeout(timer);
    }

    if (formData.coupon_type === 'product') {
      // Load categories once
      adminService.getCategories().then(res => {
        setCategories(res.data || []);
      }).catch(() => setCategories([]));
    }
  }, [isModalOpen, formData.coupon_type, formData.apply_to_all_loyal_customers, loyalCustomerSearch]);

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
    setLoyalCustomerSearch('');
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
      coupon_type: 'standard',
      apply_to_all_loyal_customers: false,
      eligible_customer_ids: [],
      apply_to_all_products: false,
      eligible_product_ids: [],
      eligible_category_ids: [],
      is_reusable: true,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setLoyalCustomerSearch('');
    
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
      coupon_type: coupon.coupon_type || 'standard',
      apply_to_all_loyal_customers: coupon.apply_to_all_loyal_customers || false,
      eligible_customer_ids: coupon.eligible_customer_ids || [],
      apply_to_all_products: coupon.apply_to_all_products || false,
      eligible_product_ids: coupon.eligible_product_ids || [],
      eligible_category_ids: coupon.eligible_category_ids || [],
      is_reusable: coupon.is_reusable !== false,
      is_active: coupon.is_active
    });
    setIsModalOpen(true);
  };

  const handleToggleCouponActive = async (coupon) => {
    let targetExpiry = coupon.expiry_date;
    const isExpired = isCouponExpired(coupon);
    
    if (!coupon.is_active && isExpired) {
      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + 7);
      targetExpiry = newExpiryDate.toISOString();
      toast.info(`Expired coupon detected. Expiry date automatically extended by 7 days (to ${newExpiryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}) to activate.`);
    }

    const nextActiveState = !coupon.is_active;

    // Optimistically update state
    setCoupons(prev => prev.map(c => c.id === coupon.id ? { 
      ...c, 
      is_active: nextActiveState, 
      expiry_date: nextActiveState ? targetExpiry : c.expiry_date 
    } : c));

    try {
      const updatedPayload = {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        expiry_date: targetExpiry,
        min_cart_value: coupon.min_cart_value,
        max_discount_limit: coupon.max_discount_limit,
        max_usage_count: coupon.max_usage_count,
        per_customer_usage_limit: coupon.per_customer_usage_limit,
        coupon_type: coupon.coupon_type || 'standard',
        apply_to_all_loyal_customers: coupon.apply_to_all_loyal_customers || false,
        eligible_customer_ids: coupon.eligible_customer_ids || [],
        apply_to_all_products: coupon.apply_to_all_products || false,
        eligible_product_ids: coupon.eligible_product_ids || [],
        eligible_category_ids: coupon.eligible_category_ids || [],
        is_reusable: coupon.is_reusable !== false,
        is_active: nextActiveState
      };
      await couponService.updateCoupon(coupon.id, updatedPayload);
      toast.success(`Coupon ${nextActiveState ? 'activated' : 'deactivated'} successfully`);
      await fetchCouponsAndSettings();
    } catch (error) {
      // Revert state
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: coupon.is_active, expiry_date: coupon.expiry_date } : c));
      toast.error('Failed to toggle status');
    }
  };

  const handlePromoteToBanner = async (coupon) => {
    const isScrollingPromoted = scrollingBanner && scrollingBanner.text2 && scrollingBanner.text2.includes(coupon.code);

    if (!isScrollingPromoted && !isBannerSelectableCoupon(coupon)) {
      toast.error('Inactive or expired coupons cannot be displayed in the top banner');
      return;
    }

    if (isScrollingPromoted) {
      setPromotingId(coupon.id);
      try {
        const settingsRes = await adminService.getSettings();
        const currentSettings = settingsRes.data || {};
        const currentBanner = currentSettings.scrolling_banner || {};

        const updatedBannerValue = {
          ...currentBanner,
          text2: '',
          timer_enabled: false,
          timer_target: ''
        };

        await adminService.updateSetting({
          key: 'scrolling_banner',
          value: updatedBannerValue
        });

        setScrollingBanner(updatedBannerValue);
        toast.success(`Removed coupon ${coupon.code} from the scrolling banner`);
      } catch (error) {
        toast.error(error.message || 'Failed to update scrolling banner');
      } finally {
        setPromotingId(null);
      }
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

  const buildPopupCouponDetail = (coupon) => ({
    id: coupon.id,
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount_value: Number(coupon.discount_value),
    expiry_date: coupon.expiry_date,
    is_active: coupon.is_active
  });

  const getPopupCouponGroup = (coupon, themes = customBanners) => {
    if (!isBannerSelectableCoupon(coupon)) {
      return { activeTheme: null, codes: [] };
    }
    const activeTheme = (themes || []).find((theme) => (
      theme?.is_active && (theme.coupon_codes || []).includes(coupon.code)
    ));
    const selectableCodes = new Set(coupons.filter(isBannerSelectableCoupon).map(c => c.code));
    const codes = (activeTheme?.coupon_codes?.filter(Boolean) || [coupon.code]).filter(code => selectableCodes.has(code));
    return { activeTheme, codes };
  };

  const handleTogglePopupBannerPromotion = async (coupon) => {
    if (!isBannerSelectableCoupon(coupon)) {
      toast.error('Only active, unexpired coupons can be used in pop-up banners');
      return;
    }
    const previousPopup = popupBanner;
    const previousBanners = customBanners;
    const currentPopup = popupBanner || {};
    const currentList = currentPopup.promoted_coupons || [];
    const currentThemes = (customBanners || []).filter(Boolean);
    const { activeTheme, codes } = getPopupCouponGroup(coupon, currentThemes);
    if (codes.length === 0) {
      toast.error('No active coupons are available for this banner group');
      return;
    }
    const codeSet = new Set(codes);
    const isAlreadyPromoted = codes.some((code) => (
      currentList.some(c => c && c.code === code) ||
      currentThemes.some(b => b?.is_active && (b.coupon_codes || []).includes(code))
    ));
    const groupLabel = codes.length > 1 ? `${codes.length} linked coupons` : `coupon ${coupon.code}`;

    const couponDetails = codes.map((code) => {
      const found = coupons.find((item) => item.code === code) || coupon;
      return buildPopupCouponDetail(found);
    });

    let updatedList;
    let updatedThemes;

    if (isAlreadyPromoted) {
      updatedList = currentList.filter(c => c && !codeSet.has(c.code));
      updatedThemes = currentThemes.map(theme => {
        if (activeTheme && theme.id !== activeTheme.id) return theme;
        const filteredCodes = (theme.coupon_codes || []).filter(code => !codeSet.has(code));
        const filteredLinkedCoupons = (theme.linked_coupons || []).filter(c => c && !codeSet.has(c.code));
        return {
          ...theme,
          coupon_codes: filteredCodes,
          linked_coupons: filteredLinkedCoupons
        };
      });
    } else {
      const existingCodes = new Set(currentList.filter(Boolean).map(c => c.code));
      updatedList = [
        ...currentList.filter(Boolean),
        ...couponDetails.filter(detail => !existingCodes.has(detail.code))
      ];
      updatedThemes = currentThemes.map(theme => {
        if (activeTheme && theme.id !== activeTheme.id) return theme;
        if (!activeTheme) return theme;

        const themeCodes = new Set(theme.coupon_codes || []);
        const linkedCodes = new Set((theme.linked_coupons || []).filter(Boolean).map(c => c.code));
        return {
          ...theme,
          coupon_codes: [
            ...(theme.coupon_codes || []),
            ...codes.filter(code => !themeCodes.has(code))
          ],
          linked_coupons: [
            ...(theme.linked_coupons || []).filter(Boolean),
            ...couponDetails.filter(detail => !linkedCodes.has(detail.code))
          ]
        };
      });
    }

    const updatedPopupSetting = {
      ...currentPopup,
      promoted_coupons: updatedList,
      custom_banners: updatedThemes
    };

    setTogglingPopupId(coupon.id);
    setPopupBanner(updatedPopupSetting);
    setCustomBanners(updatedThemes);
    toast.success(`${isAlreadyPromoted ? 'Removed' : 'Added'} ${groupLabel} ${isAlreadyPromoted ? 'from' : 'to'} the pop-up banner`);

    try {
      await adminService.updateSetting({
        key: 'popup_banner',
        value: updatedPopupSetting
      });
    } catch (error) {
      setPopupBanner(previousPopup);
      setCustomBanners(previousBanners);
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
      await fetchCouponsAndSettings();
    } catch (error) {
      toast.error('Failed to delete coupon');
    }
  };

  const handleExportCoupon = async (coupon) => {
    const pid = startProgress({
      label: `Coupon_${coupon.code}.xlsx`,
      type: 'export',
      fileType: 'spreadsheet',
      message: `Preparing coupon export for ${coupon.code}...`,
    });
    try {
      updateProgress(pid, { progress: 30, message: 'Collecting coupon audit and usage logs...' });
      const response = await apiClient.get(`/admin/coupons/${coupon.id}/export`, {
        responseType: 'blob',
        timeout: 120000,
      });

      updateProgress(pid, { progress: 80, message: 'Downloading Excel workbook...' });
      const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = new Blob([response.data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `coupon_${coupon.code}_report.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      finishProgress(pid, { message: `Coupon ${coupon.code} details successfully downloaded.` });
    } catch (error) {
      console.error('Failed to export coupon details:', error);
      toast.error(error.message || 'Failed to export coupon details');
      finishProgress(pid, { message: 'Coupon export failed', isError: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);

    let targetExpiryDate = formData.expiry_date ? new Date(formData.expiry_date) : null;
    if (formData.is_active && targetExpiryDate && targetExpiryDate.getTime() <= Date.now()) {
      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + 7);
      targetExpiryDate = newExpiryDate;
      toast.info(`Expiry date automatically extended by 7 days to allow activation of coupon.`);
    }

    const payload = {
      code: formData.code.trim().toUpperCase(),
      discount_type: formData.discount_type,
      discount_value: Number(formData.discount_value),
      expiry_date: targetExpiryDate ? targetExpiryDate.toISOString() : null,
      min_cart_value: Number(formData.min_cart_value),
      max_discount_limit: formData.has_max_discount_limit && formData.max_discount_limit ? Number(formData.max_discount_limit) : null,
      max_usage_count: formData.has_total_use_limit && formData.max_usage_count ? Number(formData.max_usage_count) : null,
      per_customer_usage_limit: formData.has_customer_use_limit && formData.per_customer_usage_limit ? Number(formData.per_customer_usage_limit) : null,
      coupon_type: formData.coupon_type,
      apply_to_all_loyal_customers: formData.coupon_type === 'loyalty' && formData.apply_to_all_loyal_customers,
      eligible_customer_ids: formData.coupon_type === 'loyalty' && !formData.apply_to_all_loyal_customers ? formData.eligible_customer_ids : [],
      apply_to_all_products: formData.coupon_type === 'product' && formData.apply_to_all_products,
      eligible_product_ids: formData.coupon_type === 'product' && !formData.apply_to_all_products ? formData.eligible_product_ids : [],
      eligible_category_ids: formData.coupon_type === 'product' && !formData.apply_to_all_products ? formData.eligible_category_ids : [],
      is_reusable: formData.is_reusable,
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
    let context = bannerForm.theme_context.trim();
    if (!context) {
      const sampleKeywords = [
        "DIWALI", "CHRISTMAS", "PONGAL", "HOLI", "NEW YEAR", 
        "VALENTINE", "EID", "SUMMER SALE", "INDEPENDENCE DAY", 
        "ANNIVERSARY", "FLASH SALE", "BLACK FRIDAY", "MONSOON"
      ];
      context = sampleKeywords[Math.floor(Math.random() * sampleKeywords.length)];
    }
    const generated = generateThemedBanner(context);
    setBannerForm(prev => ({
      ...prev,
      theme_context: context,
      title: generated.title,
      subtitle: generated.subtitle,
      theme_config: generated.theme_config
    }));
    toast.success(`Theme "${context}" generated!`);
  };

  const handleToggleCouponInBanner = (code) => {
    const linkedTheme = (customBanners || []).find(
      b => b && b.id !== bannerForm.id && (b.coupon_codes || []).includes(code)
    );
    if (linkedTheme) {
      toast.error(`${code} is already used by ${linkedTheme.theme_context || 'another banner theme'}. Remove it there first.`);
      return;
    }

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
    const duplicateCode = (bannerForm.coupon_codes || []).find(code =>
      (customBanners || []).some(b => b && b.id !== bannerForm.id && (b.coupon_codes || []).includes(code))
    );
    if (duplicateCode) {
      toast.error(`${duplicateCode} is already used by another banner theme.`);
      return;
    }

    setSavingBanners(true);
    try {
      const currentCodes = (bannerForm.coupon_codes || []).filter(code => bannerSelectableCouponCodes.has(code));
      // Find full coupon objects for selected codes
      const linkedCoupons = bannerSelectableCoupons
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
        show_on_landing: bannerForm.show_on_landing !== false,
        show_on_shop: bannerForm.show_on_shop !== false,
        show_on_checkout: bannerForm.show_on_checkout !== false,
        coupon_codes: currentCodes,
        linked_coupons: linkedCoupons,
        theme_config: bannerForm.theme_config
      };

      // If this theme is active, deactivate all other themes
      let updatedBannersList = (customBanners || []).filter(b => b !== null && b !== undefined).map(b => {
        if (b.id === currentFormId) {
          return newBannerTheme;
        }

        return {
          ...b,
          is_active: bannerForm.is_active ? false : b.is_active
        };
      });

      // If it is a new banner theme (id is null), append it
      if (!(customBanners || []).some(b => b && b.id === currentFormId)) {
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
    const originalBannersList = customBanners;
    const originalPopupSetting = popupBanner;

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

    // Optimistically update
    setCustomBanners(updatedBannersList);
    setPopupBanner(updatedPopupSetting);
    toast.success(`Theme ${!currentStatus ? 'activated' : 'deactivated'} successfully`);

    try {
      await adminService.updateSetting({
        key: 'popup_banner',
        value: updatedPopupSetting
      });
    } catch (error) {
      // Revert state
      setCustomBanners(originalBannersList);
      setPopupBanner(originalPopupSetting);
      toast.error("Failed to toggle theme status");
    }
  };

  // Filter & Search
  const filteredCoupons = coupons.filter(c => {
    const matchesSearch = searchQuery ? (
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.discount_type.toLowerCase().includes(searchQuery.toLowerCase())
    ) : true;

    const isExpired = c.expiry_date && new Date(c.expiry_date) < new Date();
    const isActuallyActive = c.is_active && !isExpired;

    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = isActuallyActive;
    } else if (statusFilter === 'inactive') {
      matchesStatus = !isActuallyActive;
    }

    let matchesDate = true;
    if (dateFilter?.start_date) {
      matchesDate = matchesDate && new Date(c.created_at) >= new Date(dateFilter.start_date);
    }
    if (dateFilter?.end_date) {
      matchesDate = matchesDate && new Date(c.created_at) <= new Date(dateFilter.end_date);
    }

    return matchesSearch && matchesStatus && matchesDate;
  });
  const bannerSelectableCoupons = coupons.filter(isBannerSelectableCoupon);
  const bannerSelectableCouponCodes = new Set(bannerSelectableCoupons.map(c => c.code));

  const PAGE_SIZE = 10;
  const totalFilteredPages = Math.ceil(filteredCoupons.length / PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter]);

  const paginatedCoupons = filteredCoupons.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Analytics Helpers
  const totalDiscountDistributed = coupons.reduce((sum, c) => sum + Number(c.total_discount_given || 0), 0);
  const couponDrivenRevenue = coupons.reduce((sum, c) => sum + Number(c.revenue_generated || 0), 0);
  const totalUses = coupons.reduce((sum, c) => sum + Number(c.total_uses || 0), 0);
  const activeCount = coupons.filter(c => c.is_active && !isCouponExpired(c)).length;

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  if (error && coupons.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-[#131B17] rounded-3xl border border-slate-200 dark:border-[#26322B] shadow-sm max-w-md mx-auto mt-12">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <p className="text-lg font-bold text-slate-800 dark:text-white">Failed to load coupons</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{error}</p>
        <button 
          onClick={() => fetchCouponsAndSettings()} 
          className="mt-6 px-6 py-2.5 bg-primary text-white font-bold uppercase tracking-wider rounded-xl text-xs hover:bg-[#1bb847] transition-all"
        >
          Retry
        </button>
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
          Pop Up Banners
        </button>
      </div>

      {activeTab === 'coupons' ? (
        <>
          {/* Analytics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
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
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Generated Revenue</p>
                <p className="text-2xl font-black text-ink-slate mt-0.5">₹{couponDrivenRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Active Loyal Customers</p>
                <p className="text-2xl font-black text-ink-slate mt-0.5">{couponAnalytics?.active_loyal_customer_count ?? loyalCustomers.length}</p>
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
          <div className="bg-white rounded-2xl border border-border-subtle shadow-sm overflow-visible">
            <div className="p-6 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-black text-ink-slate uppercase tracking-wider">All Coupon Codes</h2>
              <div className="flex flex-wrap items-center gap-3 w-full justify-end">
                <div className="relative max-w-sm w-full sm:w-auto">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search coupon code..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-slate-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {/* Unified Filter Button */}
                 <div className="relative" ref={filterRef}>
                  <button
                    onClick={() => {
                      if (!isFilterOpen) {
                        setTempStatusFilter(statusFilter);
                        setTempDatePreset(datePreset);
                        setTempDateFilter(dateFilter);
                        setTempCustomDateRange(customDateRange);
                        setIsFilterOpen(true);
                      } else {
                        setIsFilterOpen(false);
                      }
                    }}
                    className={`relative inline-flex items-center gap-2 shadow-sm transition-all admin-filter-btn ${
                      (statusFilter !== 'all' || dateFilter) ? 'active-filter' : ''
                    }`}
                  >
                    <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>Filter</span>
                    {(statusFilter !== 'all' || dateFilter) && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                        {(statusFilter !== 'all' ? 1 : 0) + (dateFilter ? 1 : 0)}
                      </span>
                    )}
                  </button>

                  {isFilterOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 z-50">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Filters</span>
                      </div>

                      {/* Status Section */}
                      <div className="mb-4">
                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</div>
                        <div className="flex gap-2">
                          {[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setTempStatusFilter(opt.value)}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                tempStatusFilter === opt.value
                                  ? 'bg-primary text-white shadow-sm'
                                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Date Section */}
                      <div>
                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" /> Date Range
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { key: 'today', label: 'Today' },
                            { key: 'last7', label: 'Last 7 Days' },
                            { key: 'thisWeek', label: 'This Week' },
                            { key: 'thisMonth', label: 'This Month' },
                            { key: 'thisYear', label: 'This Year' },
                            { key: 'custom', label: 'Custom Range' }
                          ].map(p => (
                            <button
                              type="button"
                              key={p.key}
                              onClick={() => {
                                setTempDatePreset(p.key);
                                if (p.key !== 'custom') {
                                  const r = rangeForPreset(p.key);
                                  if (r) setTempDateFilter({ start_date: r.start, end_date: r.end, label: p.key });
                                }
                              }}
                              className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all ${
                                tempDatePreset === p.key ? 'bg-primary text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>

                        {tempDatePreset === 'custom' && (
                          <div className="mt-3 space-y-2">
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start</label>
                              <input type="date" value={tempCustomDateRange.start} onChange={e => setTempCustomDateRange(prev => ({ ...prev, start: e.target.value }))} className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-sm" />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End</label>
                              <input type="date" value={tempCustomDateRange.end} onChange={e => setTempCustomDateRange(prev => ({ ...prev, end: e.target.value }))} className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-sm" />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setStatusFilter('all');
                            setDateFilter(null);
                            setDatePreset('');
                            setCustomDateRange({ start: '', end: '' });
                            setIsFilterOpen(false);
                          }}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold mr-auto"
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStatusFilter(tempStatusFilter);
                            setDatePreset(tempDatePreset);
                            if (tempDatePreset === 'custom') {
                              if (tempCustomDateRange.start && tempCustomDateRange.end) {
                                const s = new Date(tempCustomDateRange.start);
                                const e = new Date(tempCustomDateRange.end);
                                if (s <= e) {
                                  setDateFilter({ start_date: toISODateStart(s), end_date: toISODateEnd(e), label: 'custom' });
                                }
                              }
                            } else {
                              setDateFilter(tempDateFilter);
                            }
                            setCustomDateRange(tempCustomDateRange);
                            setIsFilterOpen(false);
                          }}
                          className="px-4 py-2 rounded-xl bg-primary hover:bg-[#1bb847] text-white text-xs font-bold"
                        >
                          Apply & Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto admin-table-container-standard">
              {filteredCoupons.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Ticket className="w-12 h-12 text-slate-350 mx-auto mb-3" />
                  <p className="font-bold">No coupons found</p>
                  <p className="text-xs text-slate-400 mt-0.5">Create a coupon or adjust your query.</p>
                </div>
              ) : (
                <table className="min-w-[1000px] lg:min-w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                    <tr className="border-b border-border-subtle text-[11px] font-black text-slate-400 uppercase tracking-widest">
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
                    {paginatedCoupons.map((coupon) => {
                      const isExpired = coupon.expiry_date && new Date(coupon.expiry_date) < new Date();
                      const isActuallyActive = coupon.is_active && !isExpired;
                      const remaining = coupon.max_usage_count !== null 
                        ? Math.max(0, coupon.max_usage_count - (coupon.total_uses || 0)) 
                        : 'Unlimited';

                      return (
                        <tr key={coupon.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="px-6 py-4">
                            <div className="font-mono font-bold text-primary tracking-wider">{coupon.code}</div>
                            {(coupon.coupon_type || 'standard') === 'loyalty' && (
                              <span className="inline-flex mt-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900/50 text-[10px] font-black uppercase tracking-wider">
                                Loyal Customer
                              </span>
                            )}
                            {(coupon.coupon_type || 'standard') === 'product' && (
                              <span className="inline-flex mt-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50 text-[10px] font-black uppercase tracking-wider">
                                Product Coupon
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                              coupon.discount_type === 'percentage' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/50' :
                              coupon.discount_type === 'flat' ? 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50' :
                              'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50'
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
                              <span className={`inline-flex items-center gap-1.5 ${getCouponExpiryTone(coupon)}`}>
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
                              disabled={false}
                              title={isExpired ? 'Expired coupon. Activating will automatically extend it by 7 days.' : undefined}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                isActuallyActive ? 'bg-primary' : 'bg-slate-200'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  isActuallyActive ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end items-center gap-2">
                              {(() => {
                                const isScrollingPromoted = scrollingBanner && scrollingBanner.text2 && scrollingBanner.text2.includes(coupon.code);
                                return (
                                  <>
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handlePromoteToBanner(coupon);
                                      }}
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
                                  </>
                                );
                              })()}
                              
                              <span className="h-4 w-px bg-slate-200 mx-1"></span>
                              
                              <button 
                                onClick={() => handleExportCoupon(coupon)}
                                className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-xl transition-all"
                                title="Download Excel Report"
                              >
                                <Download className="w-4 h-4" />
                              </button>
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
              <TablePagination
                currentPage={currentPage}
                totalPages={totalFilteredPages}
                onPageChange={setCurrentPage}
                totalItems={filteredCoupons.length}
                pageSize={PAGE_SIZE}
              />
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
                          {bannerSelectableCoupons
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
                                  className={`flex items-center justify-between px-4 py-3 select-none ${linkedTheme ? 'bg-slate-50 cursor-not-allowed opacity-70' : 'hover:bg-slate-50 cursor-pointer'}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={Boolean(linkedTheme)}
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
                          {bannerSelectableCoupons.length === 0 && (
                            <div className="p-4 text-center text-xs text-slate-400">
                              No active coupon codes available.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Warning if linked elsewhere is selected */}
                  {bannerSelectableCoupons.some(c => 
                    couponCodes.includes(c.code) && 
                    (customBanners || []).some(b => b && b.id !== bannerForm.id && (b.coupon_codes || []).includes(c.code))
                  ) && (
                    <p className="text-[11px] text-amber-600 font-semibold mt-1.5 flex items-center gap-1 animate-pulse">
                      Some chosen coupons are already linked to other banner themes. Remove them there before saving.
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



                {/* Banner Display Pages */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                    Banner Display Pages
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
                        checked={bannerForm.show_on_landing !== false}
                        onChange={(e) => setBannerForm(prev => ({ ...prev, show_on_landing: e.target.checked }))}
                      />
                      <div>
                        <p className="text-xs font-bold text-ink-slate">Landing Page (Before Customer Login)</p>
                        <p className="text-[10px] text-text-muted mt-0.5">https://durgashakti-foils.vercel.app/</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
                        checked={bannerForm.show_on_shop !== false}
                        onChange={(e) => setBannerForm(prev => ({ ...prev, show_on_shop: e.target.checked }))}
                      />
                      <div>
                        <p className="text-xs font-bold text-ink-slate">After Customer Logged In (Shop Page)</p>
                        <p className="text-[10px] text-text-muted mt-0.5">https://durgashakti-foils.vercel.app/shop</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
                        checked={bannerForm.show_on_checkout !== false}
                        onChange={(e) => setBannerForm(prev => ({ ...prev, show_on_checkout: e.target.checked }))}
                      />
                      <div>
                        <p className="text-xs font-bold text-ink-slate">Checkout Page</p>
                        <p className="text-[10px] text-text-muted mt-0.5">https://durgashakti-foils.vercel.app/checkout</p>
                      </div>
                    </label>
                  </div>
                </div>

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
                    Cancel
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
            <div data-force-dark className="p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4" style={{ background: '#0f172a' }}>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                Storefront Banner Preview (Live)
              </h3>
              
              {/* Scaled Banner Container */}
              <div className="overflow-hidden border border-slate-700 rounded-2xl p-1 flex items-center justify-center min-h-[220px]" style={{ background: '#0a0a1a' }}>
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
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 border border-white/20 text-white rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
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
                          <div className="border border-white/10 rounded-2xl p-4 w-full max-w-xs text-center text-xs text-white/50" style={{ background: 'rgba(0, 0, 0, 0.15)' }}>
                            No coupon codes selected yet.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto w-full">
                            {couponCodes.map(code => {
                              const matchingC = coupons.find(c => c.code === code);
                              const label = !matchingC
                                ? 'Special Discount'
                                : matchingC.discount_type === 'percentage'
                                  ? `${matchingC.discount_value}% Off`
                                  : matchingC.discount_type === 'flat'
                                    ? `Rs ${matchingC.discount_value} Off`
                                    : 'Free Shipping';
                              return (
                                <div key={code} className="rounded-2xl p-3 border border-white/15 text-center space-y-2 w-full" style={{ background: 'rgba(0, 0, 0, 0.25)' }}>
                                  <p className="text-[10px] font-bold text-yellow-300 uppercase tracking-widest">{label}</p>
                                  <div className="relative flex items-center justify-center w-full px-8">
                                    <span className="font-mono text-sm font-black bg-black/20 px-2.5 py-1 rounded-xl border border-white/20 tracking-wider">
                                      {code}
                                    </span>
                                    <button type="button" className="absolute right-0 p-1.5 border border-white/10 rounded-lg text-white/80" style={{ background: 'rgba(0, 0, 0, 0.15)' }}>
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
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
                          theme.coupon_codes?.map(code => {
                            const matchedCoupon = coupons.find(c => c.code === code);
                            const isActive = matchedCoupon && isBannerSelectableCoupon(matchedCoupon);
                            return (
                              <span
                                key={code}
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold uppercase ${
                                  isActive
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                                }`}
                                title={isActive ? 'Active coupon' : (matchedCoupon ? (isCouponExpired(matchedCoupon) ? 'Expired coupon' : 'Inactive coupon') : 'Coupon not found')}
                              >
                                {code}{!isActive && <span className="ml-1 no-underline text-[8px] italic"> (inactive)</span>}
                              </span>
                            );
                          })
                        )}
                      </div>

                      {/* Row actions */}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                        <button
                          type="button"
                          onClick={() => handleToggleThemeActive(theme.id, theme.is_active)}
                          aria-pressed={theme.is_active}
                          title={theme.is_active ? 'Click to deactivate this theme' : 'Click to activate this theme'}
                          className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-bold uppercase tracking-wider transition-all ${
                            theme.is_active 
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                            theme.is_active ? 'bg-emerald-600' : 'bg-slate-300'
                          }`}>
                            <span className={`inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                              theme.is_active ? 'translate-x-3.5' : 'translate-x-0.5'
                            }`} />
                          </span>
                          {theme.is_active ? 'Active' : 'Inactive'}
                        </button>
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setBannerForm({
                                ...theme,
                                coupon_codes: theme.coupon_codes || [],
                                show_on_landing: theme.show_on_landing !== undefined ? theme.show_on_landing : true,
                                show_on_shop: theme.show_on_shop !== undefined ? theme.show_on_shop : true,
                                show_on_checkout: theme.show_on_checkout !== undefined ? theme.show_on_checkout : true,
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
      {isModalOpen && createPortal((
        <div className="fixed inset-0 z-[99999] overflow-y-auto flex items-start justify-center bg-[#f7faf8] dark:bg-[#0C1310] p-4 sm:p-6 lg:p-8 transition-all duration-300">
          <div className="admin-shell bg-white rounded-3xl border border-border-subtle shadow-2xl w-full max-w-5xl max-h-[calc(100vh-4rem)] overflow-hidden font-inter flex flex-col">
            <div className="p-6 border-b border-border-subtle flex items-center justify-between shrink-0">
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

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
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

                <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Coupon audience</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                          { value: 'standard', label: 'Regular Coupon', desc: 'Available to all eligible customers' },
                          { value: 'loyalty', label: 'Loyal Customer Special Coupon', desc: 'Reserved for loyal customers only' },
                          { value: 'product', label: 'Product / Category Coupon', desc: 'Restrict coupon to specific products or categories' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, coupon_type: option.value }))}
                        className={`text-left p-4 rounded-xl border transition-all ${
                          formData.coupon_type === option.value
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-primary/40'
                        }`}
                      >
                        <p className="text-sm font-black uppercase tracking-tight">{option.label}</p>
                        <p className="text-xs mt-1 font-medium opacity-75">{option.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {formData.coupon_type === 'product' && (
                  <div className="sm:col-span-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <Megaphone className="w-5 h-5 text-emerald-700 mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-emerald-900 uppercase tracking-tight">Product / Category assignment</p>
                        <p className="text-xs text-emerald-800/80 mt-0.5">Choose all products or select specific products and/or categories.</p>
                      </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4.5 w-4.5 rounded border-emerald-300 text-primary focus:ring-primary"
                        checked={formData.apply_to_all_products}
                        onChange={(e) => setFormData(prev => ({ ...prev, apply_to_all_products: e.target.checked }))}
                      />
                      <span className="text-sm font-bold text-emerald-950">Apply to all products</span>
                    </label>

                    {!formData.apply_to_all_products && (
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Categories</p>
                          <div className="flex gap-2 flex-wrap">
                            {/* Load categories lazily when modal opens */}
                            {(categories || []).map(cat => {
                              const sel = formData.eligible_category_ids.includes(cat.id);
                              return (
                                <label key={cat.id} className={`px-3 py-2 rounded-lg border ${sel ? 'bg-emerald-100 border-emerald-300' : 'bg-white border-slate-100'} cursor-pointer text-sm` }>
                                  <input type="checkbox" className="mr-2" checked={sel} onChange={(e) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      eligible_category_ids: e.target.checked ? [...prev.eligible_category_ids, cat.id] : prev.eligible_category_ids.filter(id => id !== cat.id)
                                    }));
                                  }} />
                                  {cat.name}
                                </label>
                              )
                            })}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Products</p>
                          <div className="relative w-full">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              value={productSearchQuery}
                              autoComplete="off"
                              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 placeholder-slate-400"
                              placeholder="Search products by name or SKU"
                              onChange={(e) => {
                                const raw = e.target.value;
                                setProductSearchQuery(raw);
                                const q = raw.trim();
                                if (q.length >= 2) {
                                  adminService.getProducts({ search: q, limit: 50 }).then(res => {
                                    setProductSearchResults((res.data?.items || []).slice(0, 50));
                                  }).catch(() => setProductSearchResults([]));
                                } else {
                                  setProductSearchResults([]);
                                }
                              }}
                            />
                            <div className="max-h-44 overflow-y-auto mt-1 bg-white border border-slate-100 rounded-xl divide-y divide-slate-50 shadow-sm">
                              {productSearchResults.length === 0 ? (
                                <p className="p-3 text-xs text-slate-500">Type 2+ characters to search products</p>
                              ) : productSearchResults.map(p => {
                                const selected = formData.eligible_product_ids.includes(p.id);
                                return (
                                  <label key={p.id} className="flex items-center gap-3 p-3 hover:bg-emerald-50 cursor-pointer transition-colors">
                                    <input type="checkbox" checked={selected} onChange={(e) => setFormData(prev => ({
                                      ...prev,
                                      eligible_product_ids: e.target.checked ? [...prev.eligible_product_ids, p.id] : prev.eligible_product_ids.filter(id => id !== p.id)
                                    }))} />
                                    <div className="text-sm text-slate-800">{p.name}</div>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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

                {formData.coupon_type === 'loyalty' && (
                  <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <UserCheck className="w-5 h-5 text-amber-700 mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-amber-900 uppercase tracking-tight">Loyal customer assignment</p>
                        <p className="text-xs text-amber-800/80 mt-0.5">Choose all loyal customers or select specific loyal customer accounts.</p>
                      </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4.5 w-4.5 rounded border-amber-300 text-primary focus:ring-primary"
                        checked={formData.apply_to_all_loyal_customers}
                        onChange={(e) => setFormData(prev => ({ ...prev, apply_to_all_loyal_customers: e.target.checked }))}
                      />
                      <span className="text-sm font-bold text-amber-950">Apply to all loyal customers</span>
                    </label>

                    {!formData.apply_to_all_loyal_customers && (
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-700" />
                          <input
                            type="search"
                            className="w-full rounded-xl border border-amber-100 bg-white py-3 pl-10 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                            placeholder="Search loyal customers by name, email, or phone"
                            value={loyalCustomerSearch}
                            onChange={(e) => setLoyalCustomerSearch(e.target.value)}
                          />
                        </div>
                        <div className="max-h-52 overflow-y-auto bg-white border border-amber-100 rounded-xl divide-y divide-amber-50">
                        {loyalCustomerLoading ? (
                          <p className="p-4 text-xs font-bold text-amber-800">Searching loyal customers...</p>
                        ) : loyalCustomers.length === 0 ? (
                          <p className="p-4 text-xs font-bold text-amber-800">No loyal customers match the current criteria yet.</p>
                        ) : loyalCustomers.map(customer => {
                          const selected = formData.eligible_customer_ids.includes(customer.id);
                          return (
                            <label key={customer.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-amber-50/60">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-amber-300 text-primary focus:ring-primary"
                                checked={selected}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  eligible_customer_ids: e.target.checked
                                    ? [...prev.eligible_customer_ids, customer.id]
                                    : prev.eligible_customer_ids.filter(id => id !== customer.id)
                                }))}
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-black text-slate-900 truncate">{customer.name}</span>
                                <span className="block text-[10px] font-bold text-slate-500 truncate">{customer.email} • {customer.orders_count} orders • ₹{Number(customer.total_spent || 0).toLocaleString('en-IN')}</span>
                              </span>
                            </label>
                          );
                        })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

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

                {settings.single_use_per_account && (
                  <div className="sm:col-span-2 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl">
                    <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-amber-800">Global Restriction Active</p>
                      <p className="text-xs mt-1 font-medium text-amber-900/90 leading-relaxed">
                        The global setting <strong>"Allow only one coupon order per customer account"</strong> is currently enabled. 
                        This overrides individual reusability rules below; customers will only be able to use one coupon across all their purchases.
                      </p>
                    </div>
                  </div>
                )}

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

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={formData.is_reusable}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_reusable: e.target.checked }))}
                    />
                    <div>
                      <p className="text-sm font-bold text-ink-slate">Reusable coupon</p>
                      <p className="text-xs text-text-muted mt-0.5">Turn off to make this a one-time coupon per customer account.</p>
                    </div>
                  </label>
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
      ), document.body)}
    </div>
  );
};

export default CouponsPage;
