import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, BookOpen, AlertOctagon, HelpCircle } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../animations/variants';

const TermsOfService = () => {
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
              Terms of Service
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp} 
              className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider"
            >
              Please read these terms carefully before using our services.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-6 mt-6">
        <div className="bg-[#131B17] border border-[#26322B] p-8 md:p-12 rounded-2xl shadow-sm text-slate-300 font-medium text-sm leading-relaxed space-y-8">
          
          {/* Section 1 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white font-sans flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#25D958]" /> 1. Acceptance of Terms
            </h3>
            <p>
              1.1 The <a href="https://durgashaktifoils.com" className="text-[#25D958] hover:underline">www.durgashaktifoils.com</a> ("Website") is a domain owned and operated by <strong>LSKB Aluminium Foils Pvt Ltd</strong>, a business incorporated under the laws of India.
            </p>
            <p>
              1.2 This User Agreement ("Agreement") sets out the terms and conditions on which Durga Shakti Foils, LSKB shall provide the Services to the Users through the Website. The Users shall be deemed to have read, understood and accepted this Agreement, which may be updated or modified from time to time.
            </p>
            <p>
              1.3 The use of the Website is offered to the Users conditioned on acceptance without modification of all the terms, conditions and notices contained in this Agreement. For removal of doubts, it is clarified that use of the Website by the Users constitutes an acknowledgement and acceptance by the Users of this Agreement.
            </p>
          </div>

          <hr className="border-[#26322B]" />

          {/* Section 2 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white font-sans flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#25D958]" /> 2. Modification of Terms
            </h3>
            <p>
              2.1 LSKB reserves the right to change the terms, conditions and notices under which the Services are offered through the Website, including but not limited to the charges for the Services provided through the Website. The Users shall be responsible for regularly reviewing these terms and conditions.
            </p>
          </div>

          <hr className="border-[#26322B]" />

          {/* Section 3 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white font-sans flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-[#25D958]" /> 3. Limited Use & Prohibitions
            </h3>
            <p>
              3.1 The Users agree and undertake not to buy, trade, resell or exploit for any commercial or non-commercial purposes, any part of the Service without written authorization.
            </p>
            <p>
              3.2 As a condition of the use of the Website, the Users warrant that they will not use the Website for any purpose that is unlawful, illegal under any law for the time being in force within or outside India, or prohibited by this Agreement.
            </p>
            <p>
              3.3 Users further agree not to reverse engineer, modify, copy, distribute, transmit, display, perform, reproduce, publish, license, create derivative works from, transfer, or sell any information, software products or services obtained from the Website.
            </p>
          </div>

          <hr className="border-[#26322B]" />

          {/* Section 4 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white font-sans flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#25D958]" /> 4. Disclaimer of Warranties & Liabilities
            </h3>
            <p>
              4.1 Durga Shakti Foils, LSKB has endeavored to ensure that all the information on the Website is correct, but neither warrants nor makes any representations regarding the quality, accuracy or completeness of any data, information, product or Service.
            </p>
            <p>
              4.2 Pictures of the Products shown are merely indicative and are not an identical representation of the actual product. Durga Shakti Foils, LSKB hereby disclaims any guarantees of exactness as to the finish and appearance of the final Product as ordered by the user.
            </p>
          </div>

          <hr className="border-[#26322B]" />

          {/* Section 5 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white font-sans">5. Notice of Grievances</h3>
            <p>
              If you come across any abuse or violation of these Terms, please report to <a href="mailto:info@lskbfoils.com" className="text-[#25D958] hover:underline">info@lskbfoils.com</a>.
            </p>
            <p className="text-xs text-slate-450 italic mt-4">
              This document is an electronic record in terms of Information Technology Act, 2000 and the amended provisions pertaining to electronic records in various statutes.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
};

export default TermsOfService;
