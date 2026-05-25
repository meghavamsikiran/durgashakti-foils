import React, { useState, useRef, useEffect } from 'react';
import { Filter, Calendar, X } from 'lucide-react';

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'last7', label: 'Last 7 Days' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'custom', label: 'Custom Range' },
];

function toISODateStart(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString();
}

function toISODateEnd(d) {
  const dt = new Date(d);
  dt.setHours(23, 59, 59, 999);
  return dt.toISOString();
}

function rangeForPreset(key) {
  const now = new Date();
  const start = new Date();
  const end = new Date();
  switch (key) {
    case 'today':
      return { start: toISODateStart(now), end: toISODateEnd(now) };
    case 'last7':
      start.setDate(now.getDate() - 6);
      return { start: toISODate(start), end: toISODate(now) };
    case 'thisWeek': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // monday as start
      start.setDate(diff);
      return { start: toISODate(start), end: toISODate(now) };
    }
    case 'thisMonth':
      start.setDate(1);
      return { start: toISODate(start), end: toISODate(now) };
    case 'thisYear':
      start.setMonth(0, 1);
      return { start: toISODate(start), end: toISODate(now) };
    default:
      return null;
  }
}

const DateFilterPopover = ({ onChange, initial }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState((initial && initial.label) || '');
  const [custom, setCustom] = useState({ start: '', end: '' });
  const ref = useRef();

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const applyPreset = (key) => {
    setActive(key);
    if (key === 'custom') {
      setOpen(true);
      return;
    }
    const r = rangeForPreset(key);
    if (r && onChange) onChange({ start_date: r.start, end_date: r.end, label: key });
    setOpen(false);
  };

  const applyCustom = () => {
    if (!custom.start || !custom.end) return;
    const s = new Date(custom.start);
    const e = new Date(custom.end);
    if (s > e) return;
    if (onChange) onChange({ start_date: toISODateStart(s), end_date: toISODateEnd(e), label: 'custom' });
    setActive('custom');
    setOpen(false);
  };

  const clear = () => {
    setActive('');
    setCustom({ start: '', end: '' });
    if (onChange) onChange(null);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="relative inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50"
      >
        <Filter className="w-4 h-4 text-slate-600" />
        <span className="text-xs font-black uppercase tracking-widest text-slate-600">Filter</span>
        {active ? (
          <span className="ml-2 inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary text-white text-[11px] font-semibold">{active === 'last7' ? 'Last 7 Days' : active === 'thisWeek' ? 'This Week' : active === 'thisMonth' ? 'This Month' : active === 'thisYear' ? 'This Year' : active === 'today' ? 'Today' : 'Custom'}</span>
        ) : null}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <div className="text-sm font-black">Date Range</div>
            </div>
            <button onClick={clear} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold text-left ${active === p.key ? 'bg-primary text-white' : 'bg-slate-50 text-slate-700'}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Start</label>
            <input type="date" value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} className="w-full mt-1 p-2 rounded-lg border border-slate-200" />
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2 block">End</label>
            <input type="date" value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} className="w-full mt-1 p-2 rounded-lg border border-slate-200" />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg border border-slate-200">Cancel</button>
              <button onClick={applyCustom} className="px-3 py-2 rounded-lg bg-primary text-white">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateFilterPopover;
