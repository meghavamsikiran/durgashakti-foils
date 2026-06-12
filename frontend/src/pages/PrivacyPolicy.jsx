import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Eye, Lock, FileText } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../animations/variants';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-[#0C1310] text-white animate-in fade-in duration-500 font-sans pb-24">
      {/* Hero Header */}
      <section className="pt-28 pb-12 relative overflow-hidden bg-[#0C1310]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#25D958]/5 rounded-full blur-[120px] pointer-events-none -mr-48 -mt-48" />
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
              Legal Agreement
            </motion.span>
            
            <motion.h1 
              variants={fadeInUp} 
              className="text-4xl md:text-5xl font-bold tracking-tighter leading-none mb-4 text-white font-sans"
            >
              Privacy Policy
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp} 
              className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider"
            >
              Last Updated: March 19, 2025
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-6 mt-6">
        <div className="bg-[#131B17] border border-[#26322B] p-8 md:p-12 rounded-2xl shadow-sm text-slate-300 font-medium text-sm leading-relaxed space-y-8">
          
          <div className="space-y-4">
            <p>
              This Privacy Policy describes how <strong>Durga Shakti Foils</strong> (the "Site", "we", "us", or "our") collects, uses, and discloses your personal information when you visit, use our services, or make a purchase from <a href="https://durgashaktifoils.com" className="text-[#25D958] hover:underline">durgashaktifoils.com</a> (the "Site") or otherwise communicate with us regarding the Site (collectively, the "Services").
            </p>
            <p>
              For purposes of this Privacy Policy, "you" and "your" means you as the user of the Services, whether you are a customer, website visitor, or another individual whose information we have collected pursuant to this Privacy Policy.
            </p>
            <p>
              Please read this Privacy Policy carefully. By using and accessing any of the Services, you agree to the collection, use, and disclosure of your information as described in this Privacy Policy. If you do not agree to this Privacy Policy, please do not use or access any of the Services.
            </p>
          </div>

          <hr className="border-[#26322B]" />

          {/* Section 1 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white font-sans flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#25D958]" /> Changes to This Privacy Policy
            </h3>
            <p>
              We may update this Privacy Policy from time to time, including to reflect changes to our practices or for other operational, legal, or regulatory reasons. We will post the revised Privacy Policy on the Site, update the "Last updated" date and take any other steps required by applicable law.
            </p>
          </div>

          <hr className="border-[#26322B]" />

          {/* Section 2 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white font-sans flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#25D958]" /> How We Collect and Use Your Personal Information
            </h3>
            <p>
              To provide the Services, we collect personal information about you from a variety of sources, as set out below. The information that we collect and use varies depending on how you interact with us.
            </p>
            <p>
              In addition to the specific uses set out below, we may use information we collect about you to communicate with you, provide or improve the Services, comply with any applicable legal obligations, enforce any applicable terms of service, and to protect or defend the Services, our rights, and the rights of our users or others.
            </p>
          </div>

          <hr className="border-[#26322B]" />

          {/* Section 3 */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white font-sans flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#25D958]" /> What Personal Information We Collect
            </h3>
            <p>
              The types of personal information we obtain about you depends on how you interact with our Site and use our Services. When we use the term "personal information", we are referring to information that identifies, relates to, describes or can be associated with you. The following sections describe the categories and specific types of personal information we collect.
            </p>

            <div className="space-y-4 pl-4 border-l-2 border-[#26322B]">
              <h4 className="font-bold text-white uppercase tracking-wider text-xs">Information We Collect Directly from You</h4>
              <p>Information that you directly submit to us through our Services may include:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Contact details</strong> including your name, address, phone number, and email.</li>
                <li><strong>Order information</strong> including your name, billing address, shipping address, payment confirmation, email address, and phone number.</li>
                <li><strong>Account information</strong> including your username, password, security questions and other information used for account security purposes.</li>
                <li><strong>Customer support information</strong> including the information you choose to include in communications with us, for example, when sending a message through the Services.</li>
              </ul>
              <p className="text-xs text-slate-450">
                Some features of the Services may require you to directly provide us with certain information about yourself. You may elect not to provide this information, but doing so may prevent you from using or accessing these features.
              </p>
            </div>

            <div className="space-y-4 pl-4 border-l-2 border-[#26322B]">
              <h4 className="font-bold text-white uppercase tracking-wider text-xs">Information We Collect about Your Usage</h4>
              <p>
                We may also automatically collect certain information about your interaction with the Services ("Usage Data"). To do this, we may use cookies, pixels and similar technologies ("Cookies").
              </p>
              <p>
                Usage Data may include device information, browser information, information about your network connection, your IP address and other information regarding your interaction with the Services.
              </p>
            </div>

            <div className="space-y-4 pl-4 border-l-2 border-[#26322B]">
              <h4 className="font-bold text-white uppercase tracking-wider text-xs">Information We Obtain from Third Parties</h4>
              <p>We may obtain information about you from vendors and service providers who may collect information on our behalf, such as:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Companies who support our Site and Services, such as Shopify or hosting providers.</li>
                <li>Our payment processors, who collect payment details to process transactions securely and fulfill orders.</li>
              </ul>
            </div>
          </div>

          <hr className="border-[#26322B]" />

          {/* Section 4 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white font-sans flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#25D958]" /> How We Disclose Personal Information
            </h3>
            <p>
              In certain circumstances, we may disclose your personal information to third parties for contract fulfillment purposes, legitimate business needs, and other reasons subject to this Privacy Policy.
            </p>
            
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left border-collapse border border-[#26322B] text-xs">
                <thead>
                  <tr className="bg-[#19231F] text-white">
                    <th className="p-3 border border-[#26322B]">Category</th>
                    <th className="p-3 border border-[#26322B]">Categories of Recipients</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border border-[#26322B] font-bold">Identifiers & Order Info</td>
                    <td className="p-3 border border-[#26322B]">Vendors and third parties who perform services on our behalf (e.g., payment processors, fulfillment partners).</td>
                  </tr>
                  <tr className="bg-[#19231F]/30">
                    <td className="p-3 border border-[#26322B] font-bold">Usage Data & Activity</td>
                    <td className="p-3 border border-[#26322B]">Analytics providers, advertising platforms, and web services.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <hr className="border-[#26322B]" />

          {/* Section 5 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white font-sans">Security and Retention</h3>
            <p>
              Please be aware that no security measures are perfect or impenetrable, and we cannot guarantee “perfect security.” How long we retain your personal information depends on different factors, such as whether we need the information to maintain your account, to provide the Services, comply with legal obligations, or resolve disputes.
            </p>
            <p className="text-xs text-slate-450 italic">
              For any questions regarding our privacy practices or to request data deletion, please contact us at <a href="mailto:info@lskbfoils.com" className="text-[#25D958] hover:underline">info@lskbfoils.com</a>.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
