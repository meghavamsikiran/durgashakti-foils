import React, { useState, useRef, useEffect } from 'react';
import { Filter, Calendar, X } from 'lucide-react';

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'last7', label: 'Last 7 Days' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'custom', label: 'Date Range' },
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

function toISODate(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString();
}

function rangeForPreset(key) {
  const now = new Date();
  const start = new Date();
  switch (key) {
    case 'today':
      return { start: toISODateStart(now), end: toISODateEnd(now) };
    case 'last7':
      start.setDate(now.getDate() - 6);
      return { start: toISODateStart(start), end: toISODateEnd(now) };
    case 'thisWeek': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // monday as start
      start.setDate(diff);
      return { start: toISODateStart(start), end: toISODateEnd(now) };
    }
    case 'thisMonth':
      start.setDate(1);
      return { start: toISODateStart(start), end: toISODateEnd(now) };
    case 'thisYear':
      start.setMonth(0, 1);
      return { start: toISODateStart(start), end: toISODateEnd(now) };
    default:
      return null;
  }
}

function labelForPreset(key) {
  switch (key) {
    case 'today':
      return 'Today';
    case 'last7':
      return 'Last 7 Days';
    case 'thisWeek':
      return 'This Week';
    case 'thisMonth':
      return 'This Month';
    case 'thisYear':
      return 'This Year';
    case 'custom':
      return 'Date Range';
    default:
      return '';
  }
}

const DateFilterPopover = ({ onChange, initial }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState((initial && initial.label) || '');
  const [selected, setSelected] = useState((initial && initial.label) || '');
  const [custom, setCustom] = useState({
    start: initial?.label === 'custom' ? (initial.start_date || '').slice(0, 10) : '',
    end: initial?.label === 'custom' ? (initial.end_date || '').slice(0, 10) : ''
  });
  const ref = useRef();

  useEffect(() => {
    setActive((initial && initial.label) || '');
    setSelected((initial && initial.label) || '');
    setCustom({
      start: initial?.label === 'custom' ? (initial.start_date || '').slice(0, 10) : '',
      end: initial?.label === 'custom' ? (initial.end_date || '').slice(0, 10) : ''
    });
  }, [initial]);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSelected(active);
        setCustom(active === 'custom'
          ? { start: initial?.start_date?.slice(0, 10) || '', end: initial?.end_date?.slice(0, 10) || '' }
          : { start: '', end: '' }
        );
      }
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [active, initial]);

  useEffect(() => {
    if (!open) return;
    setSelected(active);
    setCustom(active === 'custom'
      ? { start: initial?.start_date?.slice(0, 10) || '', end: initial?.end_date?.slice(0, 10) || '' }
      : { start: '', end: '' }
    );
  }, [open, active, initial]);

  const applyPreset = (key) => {
    setSelected(key);
    setOpen(true);
  };

  const restorePendingSelection = () => {
    setSelected(active);
    setCustom(active === 'custom'
      ? { start: initial?.start_date?.slice(0, 10) || '', end: initial?.end_date?.slice(0, 10) || '' }
      : { start: '', end: '' }
    );
  };

  const closePopover = () => {
    setOpen(false);
    restorePendingSelection();
  };

  const applySelected = () => {
    if (!selected) return;
    if (selected === 'custom') {
      if (!custom.start || !custom.end) return;
      const s = new Date(custom.start);
      const e = new Date(custom.end);
      if (s > e) return;
      if (onChange) onChange({ start_date: toISODateStart(s), end_date: toISODateEnd(e), label: 'custom' });
      setActive('custom');
      setOpen(false);
      return;
    }

    const r = rangeForPreset(selected);
    if (r && onChange) onChange({ start_date: r.start, end_date: r.end, label: selected });
    setActive(selected);
    setOpen(false);
  };

  const clear = () => {
    setActive('');
    setSelected('');
    setCustom({ start: '', end: '' });
    if (onChange) onChange(null);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); if (open) { closePopover(); } else { setOpen(true); } }}
        className="relative inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50"
      >
        <Filter className="w-4 h-4 text-slate-600" />
        <span className="text-xs font-black uppercase tracking-widest text-slate-600">Filter</span>
        {active ? (
          <span className="ml-2 inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary text-white text-[11px] font-semibold">{labelForPreset(active)}</span>
        ) : null}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <div className="text-sm font-black">Date Range</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clear}
                className="px-3 py-1 rounded-full border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-50"
              >
                Clear
              </button>
              <button onClick={closePopover} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold text-left ${selected === p.key ? 'bg-primary text-white' : 'bg-slate-50 text-slate-700'}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            {selected === 'custom' && (
              <>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Start</label>
                <input type="date" value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} className="w-full mt-1 p-2 rounded-lg border border-slate-200" />
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2 block">End</label>
                <input type="date" value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} className="w-full mt-1 p-2 rounded-lg border border-slate-200" />
              </>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={closePopover} className="px-3 py-2 rounded-lg border border-slate-200">Cancel</button>
              <button onClick={applySelected} className="px-3 py-2 rounded-lg bg-primary text-white">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateFilterPopover;
