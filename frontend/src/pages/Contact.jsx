import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { reveal, fadeInUp } from '../animations/variants';

const Contact = () => {
  const inputClass = "h-12 rounded-xl border-neutral-200 bg-white px-4 text-sm focus:border-neutral-400 focus:ring-0 transition-all placeholder:text-neutral-300";

  return (
    <div className="min-h-screen bg-white">
      <section className="pt-20 pb-16 md:pt-32 md:pb-24 border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">
          <motion.div {...reveal} className="max-w-xl">
            <p className="label mb-5">Get in touch</p>
            <h1 className="heading-xl mb-8">
              We're here <br />
              <span className="text-neutral-400">to help you.</span>
            </h1>
            <p className="body-lg">
              Have a question about our products or need assistance with an order? Reach out to our dedicated support team.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
            
            {/* Contact Info */}
            <div className="lg:col-span-5 space-y-12">
              <div className="space-y-8">
                <motion.div {...fadeInUp} className="flex gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-50 text-neutral-900 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="label mb-1">Email us</p>
                    <a href="mailto:DurgaShaktifoils@gmail.com" className="heading-sm hover:text-neutral-500 transition-colors">
                      DurgaShaktifoils@gmail.com
                    </a>
                  </div>
                </motion.div>

                <motion.div {...fadeInUp} transition={{ delay: 0.1 }} className="flex gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-50 text-neutral-900 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="label mb-1">Call us</p>
                    <a href="tel:+918367542954" className="heading-sm hover:text-neutral-500 transition-colors">
                      +91 83675 42954
                    </a>
                  </div>
                </motion.div>

                <motion.div {...fadeInUp} transition={{ delay: 0.2 }} className="flex gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-50 text-neutral-900 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="label mb-1">Visit us</p>
                    <p className="heading-sm leading-snug">
                      Maruthi Nagar, Mallampet,<br />
                      Hyderabad, Telangana 500090
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-7">
              <motion.form {...reveal} className="surface-elevated p-8 md:p-10 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-500 ml-1">Name</Label>
                    <Input placeholder="Your name" className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-500 ml-1">Email</Label>
                    <Input placeholder="name@example.com" className={inputClass} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-neutral-500 ml-1">Message</Label>
                  <textarea 
                    placeholder="How can we help?"
                    className="w-full min-h-[160px] rounded-xl border border-neutral-200 bg-white p-4 text-sm focus:border-neutral-400 focus:ring-0 transition-all outline-none"
                  />
                </div>
                <Button className="w-full h-13 bg-neutral-900 text-white hover:bg-neutral-800 rounded-xl text-sm font-medium group transition-all">
                  Send message
                  <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </Button>
              </motion.form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
