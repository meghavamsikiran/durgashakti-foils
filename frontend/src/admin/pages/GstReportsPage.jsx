import React, { useMemo, useState } from 'react';
import { Calendar, Download, FileSpreadsheet, ShieldCheck, CheckCircle2, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/core/apiClient';
import { Button } from '../../components/ui/button';
import { useProgress } from '../../components/ui/ProgressToast';

const today = new Date();
const currentMonth = today.toISOString().slice(0, 7);
const currentDay = today.toISOString().slice(0, 10);

const GstrReportsPage = () => {
  const { startProgress, updateProgress, finishProgress } = useProgress();
  const [filterType, setFilterType] = useState('month');
  const [day, setDay] = useState(currentDay);
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(String(today.getFullYear()));
  const [startDate, setStartDate] = useState(`${currentDay}T00:00`);
  const [endDate, setEndDate] = useState(`${currentDay}T23:59`);
  const [exporting, setExporting] = useState(false);

  const params = useMemo(() => {
    const base = { filter_type: filterType };
    if (filterType === 'day') return { ...base, day };
    if (filterType === 'month') return { ...base, month };
    if (filterType === 'year') return { ...base, year };
    return { ...base, start_date: startDate, end_date: endDate };
  }, [filterType, day, month, year, startDate, endDate]);

  const getSelectedPeriodLabel = () => {
    if (filterType === 'day') {
      if (!day) return 'Select a day';
      const d = new Date(day);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    if (filterType === 'month') {
      if (!month) return 'Select a month';
      const [yr, mn] = month.split('-');
      const d = new Date(Number(yr), Number(mn) - 1, 1);
      return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }
    if (filterType === 'year') {
      if (!year) return 'Select a year';
      return `Full Year ${year}`;
    }
    if (filterType === 'range') {
      if (!startDate || !endDate) return 'Select date range';
      const s = new Date(startDate);
      const e = new Date(endDate);
      return `${s.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} to ${e.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    }
    return '';
  };

  const exportGstr1 = async (format) => {
    const fileLabel = format === 'csv' ? 'GSTR1.csv' : 'GSTR1.xlsx';
    const pid = startProgress({
      label: fileLabel,
      type: 'export',
      fileType: format === 'csv' ? 'file' : 'spreadsheet',
      message: `Preparing GSTR1 ${format === 'csv' ? 'CSV' : 'Excel workbook'}...`,
    });
    setExporting(true);
    try {
      updateProgress(pid, { progress: 35, message: 'Collecting invoice data...' });
      const response = await apiClient.get('/admin/gstr1/export', {
        params: { ...params, format },
        responseType: 'blob',
        timeout: 120000,
      });
      
      const mimeType = format === 'csv' 
        ? 'text/csv;charset=utf-8;'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      const blob = new Blob([response.data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `GSTR1_${dateStr}.${format}`;
      
      document.body.appendChild(link);
      updateProgress(pid, { progress: 85, message: 'Downloading file...' });
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      finishProgress(pid, { message: `GSTR1 ${format === 'csv' ? 'CSV' : 'Excel workbook'} exported` });
    } catch (error) {
      toast.error(error.message || `Failed to export GSTR1 ${format === 'csv' ? 'CSV' : 'workbook'}`);
      finishProgress(pid, { message: 'GSTR1 export failed', isError: true });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Premium Sleek Header */}
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
          <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
          GSTR1 Export Panel
        </h1>
        <p className="text-slate-500 mt-1.5 font-medium text-sm">
          Generate and download GST auditing invoice spreadsheets from customer order history.
        </p>
      </div>

      {/* Main Unified Control Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form & Configuration */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                Step 1: Configuration
              </span>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-2 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-600" />
                Select Invoice Period
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-semibold">
                Select your tax period or enter custom date ranges.
              </p>
            </div>

            {/* Premium Tab Bar / Segmented Selector */}
            <div className="bg-slate-50 p-1.5 rounded-2xl flex flex-wrap gap-1 border border-slate-100 shadow-inner">
              {[
                { value: 'month', label: 'Monthly' },
                { value: 'range', label: 'Custom Range' },
                { value: 'day', label: 'Specific Day' },
                { value: 'year', label: 'Specific Year' },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilterType(option.value)}
                  className={`flex-1 min-w-[70px] text-center rounded-xl py-2.5 text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${
                    filterType === option.value
                      ? 'bg-white text-emerald-700 shadow-md border border-slate-100 font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Dynamic Contextual Inputs */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Period details
              </span>
              {filterType === 'day' && (
                <div className="relative">
                  <input 
                    type="date" 
                    value={day} 
                    onChange={e => setDay(e.target.value)} 
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white" 
                  />
                </div>
              )}
              {filterType === 'month' && (
                <div>
                  <input 
                    type="month" 
                    value={month} 
                    onChange={e => setMonth(e.target.value)} 
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white" 
                  />
                </div>
              )}
              {filterType === 'year' && (
                <div>
                  <input 
                    type="number" 
                    min="2020" 
                    max="2100" 
                    value={year} 
                    onChange={e => setYear(e.target.value)} 
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white" 
                  />
                </div>
              )}
              {filterType === 'range' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Start Date</label>
                    <input 
                      type="datetime-local" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)} 
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">End Date</label>
                    <input 
                      type="datetime-local" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)} 
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white" 
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic Status Preview Box */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Export Scope</h4>
                  <p className="text-xs font-black text-slate-800 mt-0.5 leading-snug">{getSelectedPeriodLabel()}</p>
                </div>
              </div>
            </div>

            {/* Step 2: Combined Action Row */}
            <div className="pt-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                Step 2: Instant Export
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <Button 
                  onClick={() => exportGstr1('excel')} 
                  disabled={exporting}
                  className="rounded-xl h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-emerald-700/10 hover:scale-102 transform active:scale-98 transition-all duration-200 border-none"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export Excel (.xlsx)
                </Button>
                <Button 
                  onClick={() => exportGstr1('csv')} 
                  disabled={exporting}
                  className="rounded-xl h-12 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-slate-700/15 hover:scale-102 transform active:scale-98 transition-all duration-200 border-none"
                >
                  <Download className="w-4 h-4" />
                  Export CSV (.csv)
                </Button>
              </div>
              
              <div className="mt-3 flex items-start gap-2 text-[10px] text-slate-400 font-bold leading-normal">
                <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <p>
                  If you cannot open .xlsx files because they open in VS Code (Codex) or you lack Microsoft Excel, download the <strong>CSV</strong> format. It is plain text and works instantly on all devices.
                </p>
              </div>
            </div>

          </div>

          {/* Right Column: Metadata Checklist Grid */}
          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-8 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Workbook Specifications
                </span>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Included Data Fields
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-1">
                  Each generated file strictly conforms to Indian GST filing structures.
                </p>
              </div>

              {/* High-Fidelity Checklist Grid */}
              <div className="space-y-2 pt-2">
                {[
                  'Taxable Value & HSN Codes',
                  'CGST, SGST, IGST Breakdown',
                  'Customer Name & Invoice Dates',
                  'Verified Customer GSTIN Column',
                  'Tax Rate Details (Auto 18%)',
                  'Shipping, COD & Discount Values',
                  'Invoice Totals & Payment Methods',
                  'Cancellation Filtering Exclusion',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100/50">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-[11px] font-extrabold text-slate-700 tracking-tight leading-none">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 lg:mt-0 pt-4 border-t border-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-[10px] text-slate-500 font-bold leading-tight">
                Fully compliant with standard <strong>GSTR-1 Section B2B / B2C</strong> reporting criteria.
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default GstrReportsPage;
