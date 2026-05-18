import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, ArrowRight, Navigation, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { reveal, fadeInUp, staggerContainer } from '../animations/variants';

const Contact = () => {
  const [formData, setFormData] = React.useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', message: '' });
    }, 3000);
  };

  const inputClass = "h-12 rounded-xl border-slate-200 bg-white px-4 text-sm focus:border-primary focus:ring-0 transition-all placeholder:text-slate-300";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
      
      {/* ── HERO SECTION ────────────────────────────────────────────────── */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-20 border-b border-slate-200/60 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -mr-32 -mt-32" />
        
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-2xl"
          >
            <motion.span 
              variants={fadeInUp} 
              className="text-xs font-black tracking-[0.25em] text-primary uppercase mb-4 inline-block"
            >
              Get in Touch
            </motion.span>
            <motion.h1 
              variants={fadeInUp} 
              className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              We're Here <br />
              <span className="text-slate-400">to Support You.</span>
            </motion.h1>
            <motion.p 
              variants={fadeInUp} 
              className="text-lg text-slate-500 font-medium"
            >
              Have a bulk inquiry, custom sizing request, or need order support? Reach out, and our expert service team will assist you immediately.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── CONTACT & MAP GRID ─────────────────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            
            {/* Contact Information (Left 5 Columns) */}
            <div className="lg:col-span-5 space-y-8">
              
              <div className="space-y-6">
                
                {/* Email Card */}
                <motion.div 
                  whileHover={{ x: 5 }}
                  className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex gap-5"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Address</span>
                    <a href="mailto:DurgaShaktifoils@gmail.com" className="text-base font-extrabold text-slate-800 hover:text-primary transition-colors block">
                      DurgaShaktifoils@gmail.com
                    </a>
                  </div>
                </motion.div>

                {/* Phones Card */}
                <motion.div 
                  whileHover={{ x: 5 }}
                  className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex gap-5"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Call Support</span>
                    <div className="space-y-1">
                      <a href="tel:+918367542954" className="text-base font-extrabold text-slate-800 hover:text-primary transition-colors block">
                        +91 83675 42954
                      </a>
                      <a href="tel:+919901452954" className="text-base font-extrabold text-slate-800 hover:text-primary transition-colors block">
                        +91 99014 52954
                      </a>
                    </div>
                  </div>
                </motion.div>

                {/* Office Hours */}
                <motion.div 
                  whileHover={{ x: 5 }}
                  className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex gap-5"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Business Hours</span>
                    <p className="text-base font-extrabold text-slate-800">
                      Mon - Sat: 8:00 AM - 8:00 PM
                    </p>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Closed on Sundays</p>
                  </div>
                </motion.div>

                {/* Location Card */}
                <motion.div 
                  whileHover={{ x: 5 }}
                  className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex gap-5"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Our Facility</span>
                    <p className="text-sm font-bold text-slate-800 leading-relaxed">
                      Shop No. 1, Plot No. 54, Road No. 1,<br />
                      Maruthi Nagar, Mallampet,<br />
                      Hyderabad, Telangana 500090
                    </p>
                  </div>
                </motion.div>

              </div>
            </div>

            {/* Contact Form & Google Map (Right 7 Columns) */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Google Map Card */}
              <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-md overflow-hidden">
                <div className="relative rounded-2xl overflow-hidden h-[300px] w-full bg-slate-100">
                  <iframe 
                    title="Durga Shakti Foils Location"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3804.8105740445585!2d78.36709849999999!3d17.5165481!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb8e25d57b545f%3A0xe5108bd8ce60170a!2sDurgaShaktiFoils%20PVT.LTD!5e0!3m2!1sen!2sin!4v1716000000000!5m2!1sen!2sin" 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen="" 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                
                <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
                  <div>
                    <h4 className="font-extrabold text-slate-900 leading-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      DurgaShaktiFoils PVT.LTD
                    </h4>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1">Aluminium Supplier • Hyderabad</p>
                  </div>
                  
                  <motion.a 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    href="https://maps.app.goo.gl/FMk4dnhXvGeTrRFM6"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-xl shadow-md text-xs tracking-wide uppercase transition-colors"
                  >
                    <Navigation className="w-4 h-4 fill-white" />
                    Get Directions
                  </motion.a>
                </div>
              </div>

              {/* Message Form */}
              <div className="bg-white border border-slate-100 p-8 rounded-3xl shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Send Us a Message
                </h3>
                
                {submitted ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-emerald-50 text-emerald-800 border border-emerald-200/50 p-6 rounded-2xl text-center"
                  >
                    <span className="text-lg font-black block mb-1">🎉 Message Sent Successfully!</span>
                    <span className="text-sm font-medium">Thank you for contacting us. We will get back to you within 2-4 business hours.</span>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-slate-500 font-bold ml-1">Full Name</Label>
                        <Input 
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Your name" 
                          className={inputClass} 
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-slate-500 font-bold ml-1">Email Address</Label>
                        <Input 
                          required
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="name@example.com" 
                          className={inputClass} 
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-slate-500 font-bold ml-1">Message</Label>
                      <textarea 
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Describe your inquiry (e.g. bulk roll sizes, packaging questions)..."
                        className="w-full min-h-[120px] rounded-xl border border-slate-200 bg-white p-4 text-sm focus:border-primary focus:ring-0 transition-all outline-none"
                      />
                    </div>

                    <Button type="submit" className="w-full h-13 bg-primary hover:bg-primary/95 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 group transition-all shadow-md shadow-primary/10">
                      Send Secure Message
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </form>
                )}
              </div>

            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Contact;
