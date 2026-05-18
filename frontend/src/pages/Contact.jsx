import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, ArrowRight, Navigation, Clock, Shield } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { reveal, fadeInUp, staggerContainer } from '../animations/variants';
import settingsService from '../services/settings.service';
import contactService from '../services/contact.service';
import { toast } from 'sonner';

const Contact = () => {
  const [formData, setFormData] = React.useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [profile, setProfile] = React.useState({
    companyName: 'Durga Shakti Foils',
    companyPhone: '+91 83675 42954',
    companyEmail: 'DurgaShaktifoils@gmail.com',
    companyAddress: 'Shop No. 1, Plot No. 54, Road No. 1, Maruthi Nagar, Mallampet, Hyderabad, Telangana 500090',
    googleMapsLink: 'https://maps.app.goo.gl/FMk4dnhXvGeTrRFM6'
  });

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsService.getPublicSettings();
        if (data?.company_profile) {
          const cp = data.company_profile;
          setProfile({
            companyName: cp.companyName || 'Durga Shakti Foils',
            companyPhone: cp.companyPhone || '+91 83675 42954',
            companyEmail: cp.companyEmail || 'DurgaShaktifoils@gmail.com',
            companyAddress: cp.companyAddress || 'Shop No. 1, Plot No. 54, Road No. 1, Maruthi Nagar, Mallampet, Hyderabad, Telangana 500090',
            googleMapsLink: cp.googleMapsLink || 'https://maps.app.goo.gl/FMk4dnhXvGeTrRFM6'
          });
        }
      } catch (err) {
        console.error('Failed to load settings on Contact Page:', err);
      }
    };
    loadSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await contactService.submitContact(formData);
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
      toast.success('Your message has been sent successfully!');
      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    } catch (err) {
      console.error('Failed to submit contact form:', err);
      toast.error(err.message || 'Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Robust maps URL parser with high zoom (z=19) centering exact business
  const getEmbedMapUrl = (mapInput, address, name) => {
    // If no map input is given, or if they pasted a Google Maps short redirection URL (which frame block blocks)
    if (!mapInput || mapInput.includes('maps.app.goo.gl') || mapInput.includes('goo.gl/maps')) {
      const query = "DurgaShaktiFoils PVT.LTD, Maruthi Nagar, Mallampet, Hyderabad";
      return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=19&ie=UTF8&iwloc=&output=embed`;
    }
    
    // Check if user pasted full HTML iframe code
    if (mapInput.includes('<iframe')) {
      const match = mapInput.match(/src="([^"]+)"/);
      if (match && match[1]) return match[1];
    }
    
    // Check if it is already an embed format
    if (mapInput.includes('/maps/embed') || mapInput.includes('output=embed')) {
      return mapInput;
    }
    
    // Else treat as search query (e.g. text address or coordinates)
    return `https://maps.google.com/maps?q=${encodeURIComponent(mapInput)}&t=&z=19&ie=UTF8&iwloc=&output=embed`;
  };

  const inputClass = "h-11 rounded-xl border-slate-200 bg-slate-50/50 px-4 text-sm focus:border-primary focus:ring-0 transition-all placeholder:text-slate-300";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 animate-in fade-in duration-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
      
      {/* ── HERO SECTION ────────────────────────────────────────────────── */}
      <section className="pt-24 pb-12 md:pt-32 md:pb-16 bg-white relative overflow-hidden border-b border-slate-100">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -mr-32 -mt-32" />
        
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-2xl text-center mx-auto"
          >
            <motion.span 
              variants={fadeInUp} 
              className="text-xs font-black tracking-[0.25em] text-primary bg-primary/5 px-4 py-1.5 rounded-full uppercase mb-4 inline-block"
            >
              Get in Touch
            </motion.span>
            <motion.h1 
              variants={fadeInUp} 
              className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-4"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Contact Us
            </motion.h1>
            <motion.p 
              variants={fadeInUp} 
              className="text-sm md:text-base text-slate-500 font-medium max-w-lg mx-auto"
            >
              Have a bulk inquiry, custom sizing request, or need order support? Reach out and we will assist you immediately.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── NICEPAGE VISUAL ARCHITECTURE 3-COLUMN LAYOUT ─────────────────── */}
      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 rounded-3xl overflow-hidden shadow-xl border border-slate-200/50 bg-white">
            
            {/* 1. LEFT COLUMN: Contact Form */}
            <div className="p-8 md:p-12 flex flex-col justify-between bg-white">
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Contact Form
                </h2>
                
                {submitted ? (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-primary/5 text-primary border border-primary/10 p-6 rounded-2xl text-center my-auto"
                  >
                    <span className="text-base font-black block mb-1">🎉 Message Sent!</span>
                    <span className="text-xs font-medium leading-relaxed">Thank you. We will get back to you shortly.</span>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] text-slate-400 font-black uppercase tracking-wider ml-1">Name</Label>
                      <Input 
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter your Name" 
                        className={inputClass} 
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] text-slate-400 font-black uppercase tracking-wider ml-1">Email</Label>
                      <Input 
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Enter a valid email address" 
                        className={inputClass} 
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] text-slate-400 font-black uppercase tracking-wider ml-1">Message</Label>
                      <textarea 
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Your message here..."
                        className="w-full min-h-[100px] rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm focus:border-primary focus:ring-0 transition-all outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 py-2">
                      <input type="checkbox" required id="terms" className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer" />
                      <label htmlFor="terms" className="text-[11px] text-slate-400 font-semibold cursor-pointer">
                        I accept the <span className="underline hover:text-primary">Terms of Service</span>
                      </label>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={submitting}
                      className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-xl text-xs transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'SUBMITTING...' : 'SUBMIT'}
                    </Button>
                  </form>
                )}
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-2 text-slate-400">
                <Shield className="w-4 h-4 text-primary/50" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Secure end-to-end processing</span>
              </div>
            </div>

            {/* 2. MIDDLE COLUMN: Dark Contact Info */}
            <div className="bg-[#1A252C] text-white p-8 md:p-12 flex flex-col justify-center text-center space-y-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              
              {/* Call Us section */}
              <div className="space-y-3">
                <span className="text-xs font-black tracking-[0.2em] text-primary uppercase block">
                  CALL US
                </span>
                <div className="space-y-1">
                  <a href={`tel:${profile.companyPhone}`} className="text-lg font-bold hover:text-primary transition-colors block">
                    {profile.companyPhone}
                  </a>
                </div>
              </div>

              {/* Location section */}
              <div className="space-y-3">
                <span className="text-xs font-black tracking-[0.2em] text-primary uppercase block">
                  LOCATION
                </span>
                <p className="text-sm font-medium text-slate-300 leading-relaxed whitespace-pre-line max-w-xs mx-auto">
                  {profile.companyAddress}
                </p>
              </div>

              {/* Business Details / Email */}
              <div className="space-y-3">
                <span className="text-xs font-black tracking-[0.2em] text-primary uppercase block">
                  OUR SERVICES & CONTACT
                </span>
                <div className="space-y-1 text-slate-300 text-sm">
                  <a href={`mailto:${profile.companyEmail}`} className="font-bold hover:text-primary transition-colors block mb-2">
                    {profile.companyEmail}
                  </a>
                  <p className="text-xs text-slate-400">Business Hours: Mon - Sat (8am - 8pm)</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">ISO 9001:2015 Certified Manufacturing</p>
                </div>
              </div>
            </div>

            {/* 3. RIGHT COLUMN: dynamic Google Map */}
            <div className="w-full h-[400px] lg:h-auto min-h-[400px] relative bg-slate-100 flex flex-col">
              <iframe 
                title="Durga Shakti Foils Location"
                src={getEmbedMapUrl(profile.googleMapsLink, profile.companyAddress, profile.companyName)}
                width="100%" 
                height="100%" 
                style={{ border: 0, minHeight: '100%', flexGrow: 1 }} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              />
              
              {/* Floating Get Directions CTA overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur border border-slate-200/50 p-4 rounded-2xl shadow-lg flex justify-between items-center gap-4">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 leading-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {profile.companyName}
                  </h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Live Location Pin</p>
                </div>
                
                <motion.a 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  href={profile.googleMapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-primary hover:bg-primary/95 text-primary-foreground font-black px-4 py-2.5 rounded-xl shadow-md text-[10px] tracking-wide uppercase transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5 fill-primary-foreground text-primary-foreground" />
                  Get Directions
                </motion.a>
              </div>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
};

export default Contact;
