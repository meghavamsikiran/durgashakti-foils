import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Eye, Lock, FileText, Globe, Key } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../animations/variants';

const PrivacyPolicy = () => {
  const sections = [
    { id: 'collection', title: '1. Information We Collect', icon: Eye },
    { id: 'cookies', title: '2. Cookies & Tracking', icon: Globe },
    { id: 'usage', title: '3. How We Use Information', icon: Key },
    { id: 'disclosure', title: '4. Disclosing Information', icon: ShieldCheck },
    { id: 'security', title: '5. Security & Retention', icon: Lock }
  ];

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0C1310] text-white animate-in fade-in duration-500 font-sans pb-24">
      {/* Hero Header */}
      <section className="pt-28 pb-10 relative overflow-hidden bg-[#0C1310]">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#25D958]/5 rounded-full blur-[140px] pointer-events-none -mr-48 -mt-48" />
        <div className="mx-auto max-w-[1536px] px-6 md:px-12 lg:px-[50px]">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-4xl"
          >
            <motion.span 
              variants={fadeInUp} 
              className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-[#25D958] bg-[#25D958]/10 px-3.5 py-1.5 rounded-full inline-block mb-6 border border-[#25D958]/20"
            >
              Legal Agreement
            </motion.span>
            
            <motion.h1 
              variants={fadeInUp} 
              className="text-4xl md:text-6xl font-bold tracking-tighter leading-none mb-4 text-white font-sans"
            >
              Privacy Policy
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp} 
              className="text-sm text-slate-400 font-medium tracking-wide"
            >
              Last Updated: March 19, 2025 — How we protect and respect your data.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Responsive Two-Column Layout */}
      <section className="mx-auto max-w-[1536px] px-6 md:px-12 lg:px-[50px]">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10 items-start">
          
          {/* Navigation Sidebar (Sticky) */}
          <aside className="hidden lg:block sticky top-28 bg-[#131B17] border border-[#26322B] p-6 rounded-2xl">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 font-mono">Table of Contents</h4>
            <nav className="space-y-1">
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-[#25D958] hover:bg-[#25D958]/5 transition-all"
                >
                  <sec.icon className="w-4 h-4 shrink-0" />
                  <span>{sec.title}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content Pane */}
          <main className="bg-[#131B17] border border-[#26322B] p-8 md:p-12 rounded-2xl shadow-sm text-slate-300 font-medium text-sm leading-relaxed space-y-10">
            
            {/* Intro */}
            <div className="space-y-4">
              <p>
                This Privacy Policy describes how <strong>Durga Shakti Foils</strong> (the "Site", "we", "us", or "our") collects, uses, and discloses your personal information when you visit, use our services, or make a purchase from <a href="https://durgashaktifoils.com" className="text-[#25D958] hover:underline font-semibold">durgashaktifoils.com</a> (the "Site") or otherwise communicate with us regarding the Site (collectively, the "Services").
              </p>
              <p>
                Please read this Privacy Policy carefully. By using and accessing any of the Services, you agree to the collection, use, and disclosure of your information as described in this Privacy Policy.
              </p>
            </div>

            <hr className="border-[#26322B]" />

            {/* Section 1 */}
            <div id="collection" className="scroll-mt-28 space-y-6">
              <h3 className="text-xl font-bold text-white font-sans flex items-center gap-3">
                <Eye className="w-5.5 h-5.5 text-[#25D958] shrink-0" /> 1. What Personal Information We Collect
              </h3>
              <p className="pl-2 border-l border-[#26322B]">
                The types of personal information we obtain about you depends on how you interact with our Site and use our Services. When we refer to "personal information", we mean information that identifies, relates to, describes or can be associated with you.
              </p>

              <div className="space-y-4 pl-4 border-l-2 border-[#26322B] ml-2">
                <h4 className="font-bold text-white uppercase tracking-wider text-xs">Information We Collect Directly from You</h4>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Contact Details:</strong> Including your name, address, phone number, and email.</li>
                  <li><strong>Order Information:</strong> Including billing address, shipping address, payment confirmation, email address, and phone number.</li>
                  <li><strong>Account Credentials:</strong> Including username, password, security questions, and other account safety values.</li>
                  <li><strong>Support Communications:</strong> Information you include in communications when sending messages to customer support.</li>
                </ul>
              </div>

              <div className="space-y-4 pl-4 border-l-2 border-[#26322B] ml-2">
                <h4 className="font-bold text-white uppercase tracking-wider text-xs">Information Automatically Collected (Usage Data)</h4>
                <p>
                  We automatically collect info about your interaction with the Services ("Usage Data") using cookies, pixels, and tracking parameters. This includes device identifiers, browser types, network details, and IP addresses.
                </p>
              </div>
            </div>

            <hr className="border-[#26322B]" />

            {/* Section 2 */}
            <div id="cookies" className="scroll-mt-28 space-y-4">
              <h3 className="text-xl font-bold text-white font-sans flex items-center gap-3">
                <Globe className="w-5.5 h-5.5 text-[#25D958] shrink-0" /> 2. Cookies & Tracking
              </h3>
              <p className="pl-2 border-l border-[#26322B]">
                We use cookies to power, analyze, and optimize our Website. Most browsers automatically accept cookies by default, but you can choose to set your browser controls to remove or reject cookies. Note that disabling cookies can negatively impact your experience and may prevent certain features from functioning correctly.
              </p>
            </div>

            <hr className="border-[#26322B]" />

            {/* Section 3 */}
            <div id="usage" className="scroll-mt-28 space-y-4">
              <h3 className="text-xl font-bold text-white font-sans flex items-center gap-3">
                <Key className="w-5.5 h-5.5 text-[#25D958] shrink-0" /> 3. How We Use Your Personal Information
              </h3>
              <ul className="list-disc pl-7 space-y-2 pl-2 border-l border-[#26322B]">
                <li><strong>Providing Products and Services:</strong> To process payments, ship orders, manage customer accounts, and facilitate returns/exchanges.</li>
                <li><strong>Marketing and Advertising:</strong> To send promotional materials or display personalized product advertisements.</li>
                <li><strong>Security & Fraud Prevention:</strong> To monitor and protect against malicious, fraudulent, or illegal operations.</li>
                <li><strong>Service Improvement:</strong> To provide customer support and enhance overall platform usability.</li>
              </ul>
            </div>

            <hr className="border-[#26322B]" />

            {/* Section 4 */}
            <div id="disclosure" className="scroll-mt-28 space-y-4">
              <h3 className="text-xl font-bold text-white font-sans flex items-center gap-3">
                <ShieldCheck className="w-5.5 h-5.5 text-[#25D958] shrink-0" /> 4. How We Disclose Personal Information
              </h3>
              <p className="pl-2 border-l border-[#26322B]">
                We may disclose personal information to third parties (such as service providers, payment processors, delivery partners, and IT analytics hosts) to perform services on our behalf and fulfill our contract terms with you.
              </p>
              
              <div className="overflow-x-auto mt-4 ml-2 border border-[#26322B] rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#19231F] text-white border-b border-[#26322B]">
                      <th className="p-3 font-bold uppercase tracking-wider">Data Category</th>
                      <th className="p-3 font-bold uppercase tracking-wider">Recipients List</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#26322B]/40">
                      <td className="p-3 font-semibold text-white">Contact & Order details</td>
                      <td className="p-3 text-slate-400">Payment processors, logistics providers, and customer support vendors.</td>
                    </tr>
                    <tr className="bg-[#19231F]/10">
                      <td className="p-3 font-semibold text-white">Usage & System Activity</td>
                      <td className="p-3 text-slate-400">Analytics partners, performance hosts, and cloud servers.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <hr className="border-[#26322B]" />

            {/* Section 5 */}
            <div id="security" className="scroll-mt-28 space-y-4">
              <h3 className="text-xl font-bold text-white font-sans flex items-center gap-3">
                <Lock className="w-5.5 h-5.5 text-[#25D958] shrink-0" /> 5. Security & Retention of Your Information
              </h3>
              <div className="space-y-3 pl-2 border-l border-[#26322B]">
                <p>
                  No security measures are perfect or impenetrable, and we cannot guarantee “perfect security.” Any information you send to us may not be secure while in transit. We recommend that you do not use insecure channels to communicate sensitive or confidential information to us.
                </p>
                <p>
                  For requests regarding data privacy or questions about how your information is retained, please reach out to our team at <a href="mailto:durgashaktifoils@gmail.com" className="text-[#25D958] hover:underline font-semibold">durgashaktifoils@gmail.com</a>.
                </p>
              </div>
            </div>

          </main>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
