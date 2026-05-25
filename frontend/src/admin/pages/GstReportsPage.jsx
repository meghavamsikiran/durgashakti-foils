import React, { useMemo, useState } from 'react';
import { Calendar, Download, FileSpreadsheet, ShieldCheck } from 'lucide-react';
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

  const exportGstr1 = async () => {
    const pid = startProgress({
      label: 'GSTR1.xlsx',
      type: 'export',
      fileType: 'spreadsheet',
      message: 'Preparing GSTR1 workbook...',
    });
    setExporting(true);
    try {
      updateProgress(pid, { progress: 35, message: 'Collecting invoice data...' });
      const response = await apiClient.get('/admin/gstr1/export', {
        params,
        responseType: 'blob',
        timeout: 120000,
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GSTR1_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      updateProgress(pid, { progress: 85, message: 'Downloading workbook...' });
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      finishProgress(pid, { message: 'GSTR1 workbook exported' });
    } catch (error) {
      toast.error(error.message || 'Failed to export GSTR1 workbook');
      finishProgress(pid, { message: 'GSTR1 export failed', isError: true });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
            GSTR1
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Export audited invoice data directly from customer orders.</p>
        </div>
        <Button onClick={exportGstr1} disabled={exporting} className="rounded-xl px-6 font-black uppercase tracking-widest flex items-center gap-2">
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting...' : 'Export Excel'}
        </Button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Invoice Period Filter</h2>
            <p className="text-sm text-slate-500 font-medium">Choose day, month, year, or exact time range before exporting.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          {[
            { value: 'day', label: 'Specific Day' },
            { value: 'month', label: 'Specific Month' },
            { value: 'year', label: 'Specific Year' },
            { value: 'range', label: 'Time Range' },
          ].map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilterType(option.value)}
              className={`rounded-xl border px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                filterType === option.value
                  ? 'bg-primary text-white border-primary shadow-md shadow-emerald-glow'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filterType === 'day' && (
            <input type="date" value={day} onChange={e => setDay(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
          )}
          {filterType === 'month' && (
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
          )}
          {filterType === 'year' && (
            <input type="number" min="2020" max="2100" value={year} onChange={e => setYear(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
          )}
          {filterType === 'range' && (
            <>
              <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
              <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
            </>
          )}
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
        <p className="text-sm text-emerald-900 font-semibold leading-relaxed">
          The workbook includes invoice number, date, customer, GSTIN, place of supply, products, HSN, taxable value, CGST, SGST, IGST, coupon discount, shipping charges, COD charges, and invoice total.
        </p>
      </div>
    </div>
  );
};

export default GstrReportsPage;
