import React from 'react';
import { motion } from 'framer-motion';
import { reveal, revealSlow } from '../animations/variants';

const About = () => {
  return (
    <div className="min-h-screen bg-white">
      <section className="pt-20 pb-16 md:pt-32 md:pb-24 border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">
          <motion.div {...revealSlow} className="max-w-2xl">
            <p className="label mb-5">Our heritage</p>
            <h1 className="heading-xl mb-8">
              Crafting precision <br />
              <span className="text-neutral-400">for every kitchen.</span>
            </h1>
            <p className="body-lg text-balance">
              Durga Shakti Foils was founded on a simple principle: that the tools we use in our kitchens should be as refined as the ingredients we cook with.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">
            <motion.div {...reveal} className="space-y-6">
              <h2 className="heading-md">The quality standard</h2>
              <p className="body">
                We don't just manufacture aluminum foil; we engineer food-grade solutions that preserve freshness and ensure hygiene. Every roll that leaves our facility is a testament to our commitment to excellence, meeting stringent ISO 9001:2015 standards.
              </p>
            </motion.div>
            <motion.div {...reveal} transition={{ delay: 0.2 }} className="space-y-6">
              <h2 className="heading-md">Modern manufacturing</h2>
              <p className="body">
                Our state-of-the-art facility in Hyderabad utilizes advanced technology to produce foils with superior thickness and strength. This precision allows for better wrapping, superior heat retention, and a more reliable experience in both domestic and industrial kitchens.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-32 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 text-center">
          <motion.div {...reveal} className="max-w-xl mx-auto space-y-6">
            <h2 className="heading-md">Join the movement</h2>
            <p className="body">
              Trusted by over 10,000 customers across India, we are redefining what it means to wrap food with care and precision.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;
