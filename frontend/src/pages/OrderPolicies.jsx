import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Truck, RefreshCw, Landmark, AlertCircle, Clock, Zap } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../animations/variants';

const OrderPolicies = () => {
  return (
    <div className="min-h-screen bg-[#0C1310] text-white animate-in fade-in duration-500 font-sans pb-24">
      {/* Hero Section */}
      <section className="pt-28 pb-12 relative overflow-hidden bg-[#0C1310]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#25D958]/5 rounded-full blur-[120px] pointer-events-none -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#25D958]/3 rounded-full blur-[100px] pointer-events-none -ml-24 -mb-24" />
        
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-3xl mx-auto"
          >
            <motion.span 
              variants={fadeInUp} 
              className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-[#25D958] bg-[#25D958]/10 px-3.5 py-1.5 rounded-full inline-block mb-6 border border-[#25D958]/20"
            >
              Customer Service
            </motion.span>
            
            <motion.h1 
              variants={fadeInUp} 
              className="text-4xl md:text-5xl font-bold tracking-tighter leading-none mb-6 text-white font-sans"
            >
              Our Order Policies
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp} 
              className="text-sm md:text-base text-slate-350 font-medium leading-relaxed max-w-2xl mx-auto"
            >
              At Durga Shakti Foils, we are committed to providing premium food-grade packaging with high standard services. Read our guidelines on returns, refunds, and exchanges designed to protect our community.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Policies Grid */}
      <section className="px-6 max-w-7xl mx-auto mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Shipping Policy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[#131B17] border border-[#26322B] p-8 rounded-2xl shadow-sm flex flex-col h-full text-white"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#25D958]/10 text-[#25D958] flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-sans">Shipping & Delivery Policy</h3>
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">PAN India Delivery</p>
              </div>
            </div>
            <div className="space-y-4 text-sm text-slate-400 font-medium leading-relaxed">
              <p>
                We ship our products PAN India through reputed courier partners. Orders are processed within 24 hours of placement to ensure prompt delivery.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Metro Cities:</strong> Delivery within 1-2 business days.</li>
                <li><strong>Non-Metro Cities:</strong> Delivery within 3-5 business days.</li>
                <li><strong>Shipping Charges:</strong> Free delivery on orders that meet the promotional threshold; otherwise, flat zone-based shipping charges apply at checkout.</li>
              </ul>
            </div>
          </motion.div>

          {/* Returns & Exchanges Policy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[#131B17] border border-[#26322B] p-8 rounded-2xl shadow-sm flex flex-col h-full text-white"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#25D958]/10 text-[#25D958] flex items-center justify-center">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-sans">Returns & Exchanges</h3>
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Quality Safeguard Guidelines</p>
              </div>
            </div>
            <div className="space-y-4 text-sm text-slate-400 font-medium leading-relaxed">
              <p>
                To maintain absolute hygiene and ensure our premium products are delivered in pristine condition, we only accept returns or exchanges for unused, unopened rolls in their original packaging.
              </p>
              <p>
                <strong>Return & Exchange Request Flow:</strong> For any return refund or return exchange, the customer must first submit a formal return request. Only if Durga Shakti Foils reviews and approves the request, the product will be refunded or exchanged based on the specific choice made by the customer while submitting the request.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Return Window:</strong> Return requests must be initiated within <strong>3 days</strong> of receiving delivery.</li>
                <li><strong>Valid Reasons:</strong> Defective items, transit damages, or incorrect items shipped.</li>
                <li><strong>Opened Products:</strong> Due to hygiene and clinical standards, opened, used, or partially consumed foils are strictly non-returnable.</li>
              </ul>
            </div>
          </motion.div>

          {/* Self Shipment & Fair Play Policy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[#131B17] border border-[#26322B] p-8 rounded-2xl shadow-sm flex flex-col h-full text-white"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-sans">Self-Shipment & Fair Play Policy</h3>
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Protecting Quality & Integrity</p>
              </div>
            </div>
            <div className="space-y-4 text-sm text-slate-400 font-medium leading-relaxed">
              <p>
                To ensure we are able to provide genuine customers with premium materials at the lowest possible cost, we enforce strict anti-abuse policies to minimize intentional or malicious returns.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Self-Shipment:</strong> Return shipping is the customer's responsibility. Durga Shakti Foils pays only for the product price and will not reimburse self-shipment costs, unless the return is due to a verifiable shipping error on our part.</li>
                <li><strong>COD Return Restriction:</strong> For COD orders, return refund or return exchange is not supported.</li>
              </ul>
            </div>
          </motion.div>

          {/* Refund Process */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[#131B17] border border-[#26322B] p-8 rounded-2xl shadow-sm flex flex-col h-full text-white"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-450 flex items-center justify-center">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-sans">Refund Timelines</h3>
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Secure Payment Reversals</p>
              </div>
            </div>
            <div className="space-y-4 text-sm text-slate-400 font-medium leading-relaxed">
              <p>
                Refunds are processed promptly after the returned goods are received, inspected, and verified at our warehouse facility.
              </p>
              <div className="bg-[#25D958]/5 border border-[#25D958]/20 p-4 rounded-xl flex items-start gap-3 mt-2">
                <Zap className="w-5 h-5 text-[#25D958] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#25D958] text-xs uppercase tracking-wider">Instant Refunds</h4>
                  <p className="text-xs text-slate-350 mt-1">
                    Payments made via <strong>UPI Scanner</strong> qualify for instant refunds, settled immediately back to the source account upon return approval.
                  </p>
                </div>
              </div>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong>Standard Cards & Netbanking:</strong> Processed within 5-7 business days.</li>
                <li><strong>Verification Check:</strong> Original invoice and tag markings must remain intact to proceed with a refund.</li>
              </ul>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Support Banner */}
      <section className="max-w-7xl mx-auto px-6 mt-12">
        <div className="border border-[#26322B] bg-[#131B17] p-8 rounded-2xl text-center flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-left">
            <h3 className="text-lg font-bold text-white mb-2">Need assistance with your order?</h3>
            <p className="text-xs text-slate-450 font-medium">Our support staff is ready to help resolve returns or verify delivery details.</p>
          </div>
          <a
            href="mailto:info@lskbfoils.com"
            className="px-6 py-3 rounded-lg bg-[#25D958] hover:bg-[#1bb847] text-[#0C1310] font-bold tracking-wider uppercase text-xs transition-colors shrink-0"
          >
            Email Support
          </a>
        </div>
      </section>
    </div>
  );
};

export default OrderPolicies;
