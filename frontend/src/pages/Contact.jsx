import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, ArrowRight, Navigation, Clock, Shield, Paperclip, X, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { reveal, fadeInUp, staggerContainer } from '../animations/variants';
import settingsService from '../services/settings.service';
import contactService from '../services/contact.service';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/core/apiClient';

const Contact = () => {
  const { user } = useAuth();
  const [formData, setFormData] = React.useState({ name: '', email: '', phone: '', message: '' });
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [showTermsModal, setShowTermsModal] = React.useState(false);
  
  const [uploadedUrls, setUploadedUrls] = React.useState([]);
  const [uploadingFiles, setUploadingFiles] = React.useState(false);
  const [submittedTicketId, setSubmittedTicketId] = React.useState('');
  const getInitialProfile = () => {
    const cachedResponse = apiClient.getCachedDataSync('/settings/public');
    const cp = cachedResponse?.data?.company_profile || {};
    return {
      companyName: cp.companyName || 'Durga Shakti Foils',
      companyPhone: cp.companyPhone || '+91 83675 42954',
      companyEmail: cp.companyEmail || '',
      companyAddress: cp.companyAddress || 'Shop No. 1, Plot No. 54, Road No. 1, Maruthi Nagar, Mallampet, Hyderabad, Telangana 500090',
      googleMapsLink: cp.googleMapsLink || 'https://maps.app.goo.gl/FMk4dnhXvGeTrRFM6'
    };
  };

  const initialProfile = getInitialProfile();

  const [profile, setProfile] = React.useState(initialProfile);

  React.useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || ''
      }));
    }
  }, [user]);

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsService.getPublicSettings();
        if (data?.company_profile) {
          const cp = data.company_profile;
          setProfile({
            companyName: cp.companyName || 'Durga Shakti Foils',
            companyPhone: cp.companyPhone || '+91 83675 42954',
            companyEmail: cp.companyEmail || '',
            companyAddress: cp.companyAddress || 'Shop No. 1, Plot No. 54, Road No. 1, Maruthi Nagar, Mallampet, Hyderabad, Telangana 500090',
            googleMapsLink: cp.googleMapsLink || 'https://maps.app.goo.gl/FMk4dnhXvGeTrRFM6'
          });
        }
      } catch (err) {
        console.error('Failed to load settings on Contact Page:', err);
      }
    };

    const loadSettingsSilent = async () => {
      try {
        const response = await apiClient.get('/settings/public', { silent: true });
        if (response.data?.company_profile) {
          const cp = response.data.company_profile;
          setProfile({
            companyName: cp.companyName || 'Durga Shakti Foils',
            companyPhone: cp.companyPhone || '+91 83675 42954',
            companyEmail: cp.companyEmail || '',
            companyAddress: cp.companyAddress || 'Shop No. 1, Plot No. 54, Road No. 1, Maruthi Nagar, Mallampet, Hyderabad, Telangana 500090',
            googleMapsLink: cp.googleMapsLink || 'https://maps.app.goo.gl/FMk4dnhXvGeTrRFM6'
          });
        }
      } catch {
        // Ignore background errors
      }
    };

    loadSettings();
    loadSettingsSilent();
  }, []);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (uploadedUrls.length + files.length > 3) {
      toast.error("You can upload a maximum of 3 images.");
      return;
    }

    for (const file of files) {
      const ct = file.type.toLowerCase();
      if (ct.includes('video') || file.name.toLowerCase().endsWith('.mp4') || file.name.toLowerCase().endsWith('.mov')) {
        toast.error("Video files are not supported.");
        return;
      }
      if (!ct.startsWith('image/')) {
        toast.error("Only image files (PNG, JPG, JPEG, WEBP) are supported.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image file size must be less than 5MB.");
        return;
      }

      try {
        setUploadingFiles(true);
        const res = await contactService.uploadAttachment(file);
        setUploadedUrls(prev => [...prev, res.url]);
        toast.success(`Uploaded ${file.name} successfully`);
      } catch (err) {
        console.error(err);
        toast.error(`Failed to upload ${file.name}: ${err.message || 'Error'}`);
      } finally {
        setUploadingFiles(false);
      }
    }
  };

  const removeFile = (indexToRemove) => {
    setUploadedUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast.error('You must accept the Terms of Service to submit.');
      return;
    }
    const cleanPhone = formData.phone ? formData.phone.replace(/\D/g, '') : '';
    if (!cleanPhone) {
      toast.error("Phone number is required");
      return;
    }
    const last10 = cleanPhone.slice(-10);
    if (last10.length !== 10) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(last10)) {
      toast.error("Please enter a valid 10-digit phone number (starts with 6-9)");
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        phone: cleanPhone,
        attachment_urls: uploadedUrls
      };
      const res = await contactService.submitContact(payload);
      setSubmittedTicketId(res.ticket_id || '');
      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', message: '' });
      setUploadedUrls([]);
      setAcceptedTerms(false);
      toast.success('Your support ticket has been created successfully!');
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
    <div className="min-h-screen bg-[#0C1310] text-white animate-in fade-in duration-500 font-sans">
      
      {/* ── HERO SECTION ────────────────────────────────────────────────── */}
      <section className="pt-28 pb-12 relative overflow-hidden bg-[#0C1310]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-3xl text-center mx-auto"
          >
            <motion.h1 
              variants={fadeInUp} 
              className="text-lg md:text-xl font-medium tracking-wide text-slate-350 font-sans leading-relaxed"
            >
              Have a bulk inquiry, custom sizing request, or need order support?
            </motion.h1>
            <motion.p 
              variants={fadeInUp} 
              className="text-sm md:text-base text-slate-400 font-medium mt-1.5 font-sans"
            >
              Reach out and we will assist you immediately.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── VISUAL ARCHITECTURE 3-COLUMN LAYOUT ─────────────────── */}
      <section className="pb-24 bg-[#0C1310]">
        <div className="w-full max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 rounded-2xl overflow-hidden border-2 border-[#25D958] bg-[#0C1310] relative">
            
            {/* 1. LEFT COLUMN: dynamic Google Map (Swapped to Left) */}
            <div className="w-full h-[450px] lg:h-auto min-h-[450px] relative bg-[#0C1310] flex flex-col overflow-hidden min-w-0">
              <iframe 
                title="Durga Shakti Foils Location"
                src={getEmbedMapUrl(profile.googleMapsLink, profile.companyAddress, profile.companyName)}
                width="100%" 
                height="100%" 
                style={{ border: 0, minHeight: '100%', flexGrow: 1, filter: 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)' }} 
                allowFullScreen="" 
                loading="eager" 
                referrerPolicy="no-referrer-when-downgrade"
              />
              
              {/* Floating Get Directions CTA overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-[#0C1310]/95 backdrop-blur border border-[#26322B] p-4 rounded-xl shadow-lg flex justify-between items-center gap-4 animate-in fade-in duration-300">
                <div>
                  <h4 className="font-bold text-sm text-white leading-tight font-sans">
                    {profile.companyName}
                  </h4>
                  <p className="text-[9px] text-[#25D958] font-bold uppercase mt-1 font-mono tracking-widest">LIVE LOCATION PIN</p>
                </div>
                
                <motion.a 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  href={profile.googleMapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-[#F5C451] hover:bg-[#e0b23f] text-[#0C1310] font-black px-4 py-2.5 rounded-lg shadow-sm text-[10px] tracking-wide uppercase transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5 fill-[#0C1310] text-[#0C1310]" />
                  Get Directions
                </motion.a>
              </div>
            </div>

            {/* 2. MIDDLE COLUMN: Contact Details */}
            <div className="bg-[#0C1310] text-white p-8 md:p-12 flex flex-col justify-center text-center space-y-12 relative overflow-hidden border-y lg:border-y-0 lg:border-x border-[#E5B54F]/20 min-h-[450px]">

              {/* Call Us section */}
              <div className="space-y-2 relative z-10">
                <span className="text-xs font-black tracking-[0.2em] text-[#E5B54F] uppercase block font-sans">
                  CALL US
                </span>
                <a href={`tel:${profile.companyPhone}`} className="text-2xl font-bold hover:text-[#25D958] transition-colors block font-sans">
                  {profile.companyPhone}
                </a>
              </div>

              {/* Location section */}
              <div className="space-y-2 relative z-10">
                <span className="text-xs font-black tracking-[0.2em] text-[#E5B54F] uppercase block font-sans">
                  LOCATION
                </span>
                <p className="text-sm font-medium text-slate-350 leading-relaxed whitespace-pre-line max-w-xs mx-auto font-sans">
                  {profile.companyAddress}
                </p>
              </div>

              {profile.companyEmail && (
                <div className="space-y-3 relative z-10">
                  <span className="text-xs font-black tracking-[0.2em] text-[#E5B54F] uppercase block font-sans">
                    OUR SERVICES & CONTACT
                  </span>
                  <div className="space-y-1 text-slate-300 text-sm font-medium font-sans">
                    <a href={`mailto:${profile.companyEmail}`} className="font-bold hover:text-[#25D958] transition-colors block mb-2 underline">
                      {profile.companyEmail}
                    </a>
                    <p className="text-xs text-slate-400">Business Hours: Mon - Sat (8am - 8pm)</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1 font-semibold">ISO 9001:2015 CERTIFIED MANUFACTURING</p>
                  </div>
                </div>
              )}
            </div>

            {/* 3. RIGHT COLUMN: Contact Form (Swapped to Right) */}
            <div className="p-8 md:p-12 flex flex-col justify-between bg-[#0C1310]">
              <div className="text-left w-full">
                <h2 className="text-base font-black text-white font-sans mb-8 uppercase tracking-widest text-left">
                  CONTACT FORM
                </h2>

                {/* Patience Note Banner */}
                <div className="bg-amber-500/5 dark:bg-[#25D958]/5 border border-[#25D958]/25 rounded-2xl p-4 text-xs text-amber-600 dark:text-slate-350 font-semibold flex items-start text-left gap-2 mb-6">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#25D958] mt-0.5" />
                  <span>Please be patient. It takes a maximum of 2-3 business days to get a response from our support team.</span>
                </div>
                
                {submitted ? (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-[#25D958]/10 text-white border border-[#25D958]/20 p-6 rounded-2xl text-center my-auto flex flex-col items-center space-y-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#25D958]/20 flex items-center justify-center border border-[#25D958]/30">
                      <span className="text-xl">🎉</span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white font-sans uppercase tracking-wider">TICKET SUBMITTED</h3>
                      <p className="text-xs text-slate-400 mt-1">Our support team will review it shortly.</p>
                    </div>
                    <div className="bg-[#0C1310] border border-[#26322B] p-4 rounded-xl w-full text-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">YOUR CASE TICKET ID</span>
                      <span className="font-mono text-base font-black text-[#25D958] tracking-widest">{submittedTicketId}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal max-w-xs">
                      An email confirmation has been sent to your inbox. You can track this ticket in your dashboard.
                    </p>
                    <Button 
                      onClick={() => setSubmitted(false)}
                      variant="outline" 
                      className="text-xs font-bold uppercase tracking-wider h-10 px-6 border-slate-700 bg-transparent hover:bg-slate-800 text-white rounded-lg mt-2"
                    >
                      Submit Another Query
                    </Button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4 text-left w-full">
                    <div className="flex flex-col gap-1.5 w-full">
                      <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1 font-sans text-left">NAME</Label>
                      <Input 
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter your Name" 
                        className="h-12 bg-[#131B17] border border-[#26322B] focus:border-[#25D958] text-white focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all px-4 text-sm font-medium w-full text-left" 
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5 w-full">
                      <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1 font-sans text-left">EMAIL</Label>
                      <Input 
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Enter a valid email address" 
                        className="h-12 bg-[#131B17] border border-[#26322B] focus:border-[#25D958] text-white focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all px-4 text-sm font-medium w-full text-left" 
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 w-full">
                      <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1 font-sans text-left">PHONE NUMBER</Label>
                      <Input 
                        required
                        type="text"
                        maxLength={10}
                        value={formData.phone}
                        onChange={(e) => {
                           const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                           setFormData({ ...formData, phone: val });
                        }}
                        placeholder="Enter 10-digit phone number"
                        className="h-12 bg-[#131B17] border border-[#26322B] focus:border-[#25D958] text-white focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all px-4 text-sm font-medium w-full text-left"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5 w-full">
                      <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1 font-sans text-left">MESSAGE</Label>
                      <textarea 
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Your message here..."
                        className="w-full min-h-[100px] rounded-lg border border-[#26322B] bg-[#131B17] p-4 text-sm focus:border-[#25D958] transition-all outline-none text-white font-medium placeholder:text-slate-550 text-left"
                      />
                    </div>

                    {/* Attachment Upload Field */}
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex items-center justify-between ml-1">
                        <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-sans text-left">
                          Attachments (Optional)
                        </Label>
                        <span className="text-[9px] text-[#25D958]/85 font-mono font-bold">
                          {uploadedUrls.length}/3 Images
                        </span>
                      </div>
                      
                      <label className="flex items-center justify-center gap-2 w-full h-12 bg-[#131B17] border border-[#26322B] hover:border-[#25D958]/50 rounded-xl cursor-pointer transition-colors px-4 text-xs font-bold text-slate-350 select-none">
                        <Paperclip className="w-4 h-4 text-[#25D958]" />
                        <span>{uploadingFiles ? 'Uploading...' : 'Choose Image (Max 3)'}</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleFileChange}
                          disabled={uploadingFiles || uploadedUrls.length >= 3}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[9px] text-slate-500 leading-normal mt-0.5 ml-1 text-left">
                        Supported: PNG, JPG, JPEG, WEBP. Videos are blocked.
                      </p>

                      {/* File Previews */}
                      {uploadedUrls.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {uploadedUrls.map((url, index) => (
                            <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-[#26322B] bg-[#19231F]/30 group">
                              <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 rounded-lg text-white transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 py-2 w-full justify-start">
                      <input 
                        type="checkbox" 
                        required 
                        id="terms" 
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="rounded border-[#26322B] text-[#25D958] focus:ring-[#25D958] bg-[#131B17] w-4 h-4 cursor-pointer" 
                      />
                      <label htmlFor="terms" className="text-[10px] text-slate-400 font-bold cursor-pointer uppercase tracking-wider font-sans text-left">
                        I ACCEPT THE <span onClick={() => setShowTermsModal(true)} className="underline hover:text-[#1bb847] text-[#25D958] font-bold">TERMS OF SERVICE</span>
                      </label>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={submitting || uploadingFiles}
                      className="w-full h-12 bg-[#25D958] hover:bg-[#1bb847] text-[#0C1310] font-black uppercase tracking-wider rounded-lg text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 duration-200"
                    >
                      {submitting ? 'SUBMITTING...' : 'SUBMIT'}
                    </Button>
                  </form>
                )}
              </div>
              
              <div className="mt-8 pt-6 border-t border-[#26322B] flex items-center gap-2 text-slate-500 font-mono w-full justify-start">
                <Shield className="w-4 h-4 text-[#25D958]/55" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-left">Secure end-to-end processing</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── TERMS AND CONDITIONS MODAL ───────────────────────────────────── */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-8 shadow-2xl border border-slate-100 flex flex-col space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-xl font-extrabold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Terms & Conditions
              </h3>
              <button 
                onClick={() => setShowTermsModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="text-slate-600 text-xs space-y-4 leading-relaxed overflow-y-auto flex-1 pr-2">
              <p className="font-bold">Welcome to Durga Shakti Foils!</p>
              <p>These terms and conditions outline the rules and regulations for the use of Durga Shakti Foils' Website and Services.</p>
              
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mt-4">1. Privacy Policy</h4>
              <p>Your privacy is extremely important to us. Any customer details, including Name, Email, and Phone Number submitted through our contact form, are strictly used for answering inquiry purposes and processed under safe end-to-end encryption.</p>
              
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mt-4">2. Manufacturing & Quality Standard</h4>
              <p>All aluminum foils manufactured by Durga Shakti Foils are ISO 9001:2015 certified, conforming to high-grade packaging food safety and commercial-grade thickness standards.</p>
              
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mt-4">3. Custom Sizing & Bulk Orders</h4>
              <p>Bulk inquiries are processed individually. Sizing specifications provided by the client are strictly adhered to, and order confirmations require prior payment confirmations as agreed upon during invoice generation.</p>

              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mt-4">4. Shipping & Deliveries</h4>
              <p>Deliveries are executed through authorized regional logistical partners. Durga Shakti Foils is committed to maintaining high standards of transport safety and shipping schedules.</p>
            </div>

            <div className="pt-4 border-t flex gap-3">
              <Button 
                onClick={() => {
                  setAcceptedTerms(true);
                  setShowTermsModal(false);
                }}
                className="flex-1 bg-primary text-white font-bold text-xs uppercase py-3 rounded-xl tracking-wider hover:bg-primary/95"
              >
                Accept Terms
              </Button>
              <Button 
                onClick={() => setShowTermsModal(false)}
                className="flex-1 bg-slate-100 text-slate-700 font-bold text-xs uppercase py-3 rounded-xl tracking-wider hover:bg-slate-200"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contact;
