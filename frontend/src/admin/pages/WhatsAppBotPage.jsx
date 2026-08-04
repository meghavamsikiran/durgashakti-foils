import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import adminService from '../services/admin.service';
import apiClient from '../../services/core/apiClient';
import { 
  MessageSquare, Phone, Save, Bot, CheckCircle2, 
  Send, ShieldCheck, Sparkles, Key, Smartphone
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import PageLoader from '../../components/ui/PageLoader';

const WhatsAppBotPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testTemplate, setTestTemplate] = useState('3p_direct_integration_test_template');
  const [testResult, setTestResult] = useState(null);

  const [whatsappBotEnabled, setWhatsappBotEnabled] = useState(true);
  const [whatsappBusinessNumber, setWhatsappBusinessNumber] = useState('919999999999');
  const [whatsappApiToken, setWhatsappApiToken] = useState('');
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState('');

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await adminService.getSettings();
      const data = res.data || {};
      const waSettings = data.whatsapp_ai_feedback || {};

      setWhatsappBotEnabled(waSettings.enabled !== false);
      setWhatsappBusinessNumber(waSettings.businessNumber || '919999999999');
      setWhatsappApiToken(waSettings.apiToken || '');
      setWhatsappPhoneNumberId(waSettings.phoneNumberId || '');
    } catch (err) {
      console.error('Failed to load WhatsApp settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveSettings = async () => {
    try {
      setSaving(true);
      await adminService.updateSetting({
        key: 'whatsapp_ai_feedback',
        value: {
          enabled: whatsappBotEnabled,
          businessNumber: whatsappBusinessNumber,
          apiToken: whatsappApiToken,
          phoneNumberId: whatsappPhoneNumberId
        }
      });
      toast.success('WhatsApp AI Bot settings saved successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to save WhatsApp settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testPhone.trim()) {
      toast.error('Please enter the phone number to send test to (e.g. 918341465933)');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiClient.post('/admin/whatsapp/test', { 
        to: testPhone.trim(), 
        templateName: testTemplate.trim() || '3p_direct_integration_test_template' 
      });
      setTestResult({ success: true, data: res.data });
      if (res.data?.success) {
        toast.success('✅ WhatsApp test message sent successfully!');
      } else {
        toast.error('⚠️ Meta API returned an error. Check the result below.');
      }
    } catch (err) {
      const errData = err.response?.data || { error: err.message };
      setTestResult({ success: false, data: errData });
      toast.error('Test API call failed: ' + (err.message || 'Unknown error'));
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-8 max-w-[1500px] mx-auto pb-12">
      
      {/* HEADER */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase text-slate-900 dark:text-white flex items-center gap-2">
              WhatsApp Feedback & Support Center
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Post-Delivery Support
              </span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs font-medium">
              Manage automated post-delivery customer feedback triggers, WhatsApp business number, and messaging integration.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MAIN CONFIGURATION CARD */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white dark:bg-[#070b09] border border-slate-200 dark:border-[#19231F] rounded-3xl p-8 shadow-sm relative overflow-hidden space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                <Bot className="w-5 h-5 text-emerald-500" />
                <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Automated Post-Delivery Sequence
                </h2>
              </div>
              
              <button
                type="button"
                onClick={() => setWhatsappBotEnabled(!whatsappBotEnabled)}
                className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 shadow-inner ${
                  whatsappBotEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/20'
                }`}
              >
                <span className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-all duration-300 ${
                  whatsappBotEnabled ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              When enabled, marking an order status as <span className="font-bold text-emerald-500">DELIVERED</span> automatically triggers a WhatsApp feedback & damage reporting sequence to the phone number used in the shipping address.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  WhatsApp Business Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 919999999999"
                  value={whatsappBusinessNumber}
                  onChange={e => setWhatsappBusinessNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Include country code (e.g. 91 for India). Customers will be connected to this WhatsApp line.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                    Meta Cloud API Phone Number ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10485729384"
                    value={whatsappPhoneNumberId}
                    onChange={e => setWhatsappPhoneNumberId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-500" />
                    Meta Access Token (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder="EAAG..."
                    value={whatsappApiToken}
                    onChange={e => setWhatsappApiToken(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex justify-end">
              <Button 
                disabled={saving} 
                onClick={saveSettings} 
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl px-8 py-3 flex items-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving Settings...' : 'Save WhatsApp Settings'}
              </Button>
            </div>

          </div>

          {/* LIVE PREVIEW CARD */}
          <div className="bg-white dark:bg-[#070b09] border border-slate-200 dark:border-[#19231F] rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Live Customer WhatsApp Experience Preview
            </h3>
            
            <div className="p-4 rounded-2xl bg-[#0b1410] border border-emerald-500/20 text-white max-w-md font-sans text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> DurgaShakti Foils Official
                </span>
                <span className="text-[9px] text-slate-400">Just Now</span>
              </div>
              <p className="leading-relaxed text-slate-200">
                📦 Great news! Your order <span className="font-mono text-emerald-300 font-bold">#ORD-10024</span> has been marked as delivered.
              </p>
              <p className="text-slate-300">
                Was everything perfect, or did you notice any damage? Reply directly to this chat or click below to let our team know!
              </p>
              <div className="pt-2">
                <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold py-1.5 px-3 rounded-lg text-center">
                  1-Click WhatsApp Support Active
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* SIDE PANEL: TEST & SYSTEM STATUS */}
        <div className="space-y-6">
          
          <div className="bg-white dark:bg-[#070b09] border border-slate-200 dark:border-[#19231F] rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-500" />
              Live API Test
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Directly calls Meta WhatsApp Cloud API with your saved credentials. Shows exact error or success response.
            </p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Template Name (e.g. 3p_direct_integration_test_template)"
                value={testTemplate}
                onChange={e => setTestTemplate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-mono font-bold focus:outline-none"
              />

              <input
                type="text"
                placeholder="Customer phone (e.g. 918341465933)"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-mono font-bold focus:outline-none"
              />

              <button
                type="button"
                onClick={handleSendTestMessage}
                disabled={testing}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
                {testing ? 'Calling Meta API...' : 'Test WhatsApp API Now'}
              </button>

              {testResult && (
                <div className={`rounded-xl p-3 text-xs font-mono border ${testResult.data?.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                  <p className="font-black mb-1">{testResult.data?.success ? '✅ SUCCESS' : '❌ FAILED'}</p>
                  <pre className="whitespace-pre-wrap break-all text-[10px] leading-relaxed">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>


          <div className="bg-white dark:bg-[#070b09] border border-slate-200 dark:border-[#19231F] rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Integration Status
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                <span className="text-slate-400 font-medium">Post-Delivery Trigger</span>
                <span className={`font-extrabold ${whatsappBotEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {whatsappBotEnabled ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                <span className="text-slate-400 font-medium">Mode</span>
                <span className="font-extrabold text-white">
                  {whatsappApiToken ? 'Meta Cloud API' : '1-Click Direct WhatsApp'}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                <span className="text-slate-400 font-medium">Business Line</span>
                <span className="font-mono text-emerald-400 font-bold">{whatsappBusinessNumber || 'Not Set'}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default WhatsAppBotPage;
