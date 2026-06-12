import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, BookOpen, AlertOctagon, HelpCircle, Landmark, ShieldCheck, Mail } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../animations/variants';

const TermsOfService = () => {
  const sections = [
    { id: 'acceptance', title: '1. Acceptance of Terms', icon: BookOpen },
    { id: 'modification', title: '2. Modification of Terms', icon: ShieldAlert },
    { id: 'prohibition', title: '3. Limited Use & Prohibition', icon: AlertOctagon },
    { id: 'disclaimer', title: '4. Disclaimer of Warranties', icon: HelpCircle },
    { id: 'indemnification', title: '5. Indemnification & Liability', icon: Landmark },
    { id: 'grievances', title: '6. Notice of Grievances', icon: Mail }
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
              Terms of Service
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp} 
              className="text-sm text-slate-400 font-medium tracking-wide"
            >
              Please read these terms and conditions carefully before using our website and services.
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
                Welcome to <strong>Durga Shakti Foils</strong>. This User Agreement ("Agreement") sets out the terms and conditions on which Durga Shakti Foils shall provide Services to the Users through <a href="https://durgashaktifoils.com" className="text-[#25D958] hover:underline font-semibold">durgashaktifoils.com</a> ("Website").
              </p>
              <p>
                By accessing, browsing, or using this Website, you acknowledge that you have read, understood, and agreed to be bound by these terms. If you do not agree to these terms, please do not use this Website.
              </p>
            </div>

            <hr className="border-[#26322B]" />

            {/* Section 1 */}
            <div id="acceptance" className="scroll-mt-28 space-y-4">
              <h3 className="text-xl font-bold text-white font-sans flex items-center gap-3">
                <BookOpen className="w-5.5 h-5.5 text-[#25D958] shrink-0" /> 1. Acceptance of Terms
              </h3>
              <div className="space-y-3 pl-2 border-l border-[#26322B]">
                <p>
                  1.1 The Website is owned and operated by <strong>Durga Shakti Foils</strong>, a business incorporated under the laws of India.
                </p>
                <p>
                  1.2 The use of the Website is offered to the Users conditioned on acceptance without modification of all the terms, conditions and notices contained in this Agreement. The use of the Website constitutes an acknowledgement and acceptance by the Users of this Agreement.
                </p>
                <p>
                  1.3 Durga Shakti Foils at its sole discretion reserves the right not to facilitate acceptance of any request by the users for listing, display or offering any products and services through the website without assigning any reason.
                </p>
              </div>
            </div>

            <hr className="border-[#26322B]" />

            {/* Section 2 */}
            <div id="modification" className="scroll-mt-28 space-y-4">
              <h3 className="text-xl font-bold text-white font-sans flex items-center gap-3">
                <ShieldAlert className="w-5.5 h-5.5 text-[#25D958] shrink-0" /> 2. Modification of Terms
              </h3>
              <p className="pl-2 border-l border-[#26322B]">
                2.1 <strong>Durga Shakti Foils</strong> reserves the right to change the terms, conditions and notices under which the Services are offered through the Website, including but not limited to the charges for the Services provided through the Website. The Users shall be responsible for regularly reviewing these terms and conditions.
              </p>
            </div>

            <hr className="border-[#26322B]" />

            {/* Section 3 */}
            <div id="prohibition" className="scroll-mt-28 space-y-4">
              <h3 className="text-xl font-bold text-white font-sans flex items-center gap-3">
                <AlertOctagon className="w-5.5 h-5.5 text-[#25D958] shrink-0" /> 3. Limited Use & Prohibition against Unlawful Use
              </h3>
              <div className="space-y-3 pl-2 border-l border-[#26322B]">
                <p>
                  3.1 The Users agree and undertake not to buy, trade, resell or exploit for any commercial or non-commercial purposes, any part of the Service.
                </p>
                <p>
                  3.2 Users warrant that they will not use the Website for any purpose that is unlawful, illegal under any law for the time being in force within or outside India, or prohibited by this Agreement.
                </p>
                <p>
                  3.3 Users agree not to reverse engineer, modify, copy, distribute, transmit, display, perform, reproduce, publish, license, create derivative works from, transfer, or sell any information, software products or services obtained from the Website.
                </p>
              </div>
            </div>

            <hr className="border-[#26322B]" />

            {/* Section 4 */}
            <div id="disclaimer" className="scroll-mt-28 space-y-4">
              <h3 className="text-xl font-bold text-white font-sans flex items-center gap-3">
                <HelpCircle className="w-5.5 h-5.5 text-[#25D958] shrink-0" /> 4. Disclaimer of Warranties & Limitation of Liability
              </h3>
              <div className="space-y-3 pl-2 border-l border-[#26322B]">
                <p>
                  4.1 <strong>Durga Shakti Foils</strong> has endeavored to ensure that all the information on the Website is correct, but neither warrants nor makes any representations regarding the quality, accuracy or completeness of any data, information, product or Service.
                </p>
                <p>
                  4.2 Pictures of the Products shown are merely indicative and are not an identical representation of the actual product. Durga Shakti Foils hereby disclaims any guarantees of exactness as to the finish and appearance of the final Product.
                </p>
              </div>
            </div>

            <hr className="border-[#26322B]" />

            {/* Section 5 */}
            <div id="indemnification" className="scroll-mt-28 space-y-4">
              <h3 className="text-xl font-bold text-white font-sans flex items-center gap-3">
                <Landmark className="w-5.5 h-5.5 text-[#25D958] shrink-0" /> 5. Indemnification & Liability
              </h3>
              <p className="pl-2 border-l border-[#26322B]">
                5.1 Users agree to indemnify, defend and hold harmless <strong>Durga Shakti Foils</strong>, its affiliates, third parties and their respective officers, directors, agents and employees from and against any and all losses, liabilities, claims, damages, costs and expenses arising out of, or payable by virtue of, any breach or non-performance of any representation, warranty or covenant.
              </p>
            </div>

            <hr className="border-[#26322B]" />

            {/* Section 6 */}
            <div id="grievances" className="scroll-mt-28 space-y-4">
              <h3 className="text-xl font-bold text-white font-sans flex items-center gap-3">
                <Mail className="w-5.5 h-5.5 text-[#25D958] shrink-0" /> 6. Notice of Grievances
              </h3>
              <div className="space-y-3 pl-2 border-l border-[#26322B]">
                <p>
                  If you come across any abuse or violation of these Terms, please report immediately to <a href="mailto:info@durgashaktifoils.com" className="text-[#25D958] hover:underline font-semibold">info@durgashaktifoils.com</a>.
                </p>
                <p className="text-xs text-slate-450 italic mt-4">
                  This document is an electronic record in terms of Information Technology Act, 2000 and the amended provisions pertaining to electronic records in various statutes as amended by the Information Technology Act, 2000. This electronic record is generated by a computer system and does not require any physical or digital signatures.
                </p>
              </div>
            </div>

          </main>
        </div>
      </section>
    </div>
  );
};

export default TermsOfService;
