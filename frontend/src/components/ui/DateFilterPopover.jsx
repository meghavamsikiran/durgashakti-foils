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

const DateFilterPopover = ({ onChange, initial, customTrigger, inlineOpen = false }) => {
  const [open, setOpen] = useState(inlineOpen);
  const [active, setActive] = useState((initial && initial.label) || '');
  const [selected, setSelected] = useState((initial && initial.label) || '');
  const [custom, setCustom] = useState({
    start: initial?.label === 'custom' ? (initial.start_date || '').slice(0, 10) : '',
    end: initial?.label === 'custom' ? (initial.end_date || '').slice(0, 10) : ''
  });
  const ref = useRef();

  useEffect(() => {
    if (inlineOpen) {
      setOpen(true);
    }
  }, [inlineOpen]);

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
      if (inlineOpen) return; // parent handles closure
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
  }, [active, initial, inlineOpen]);

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
    if (!inlineOpen) setOpen(false);
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
      if (!inlineOpen) setOpen(false);
      return;
    }

    const r = rangeForPreset(selected);
    if (r && onChange) onChange({ start_date: r.start, end_date: r.end, label: selected });
    setActive(selected);
    if (!inlineOpen) setOpen(false);
  };

  const clear = () => {
    setActive('');
    setSelected('');
    setCustom({ start: '', end: '' });
    if (onChange) onChange(null);
    if (!inlineOpen) setOpen(false);
  };

  return (
    <div className={inlineOpen ? "w-full" : "relative"} ref={ref}>
      {!inlineOpen && (
        customTrigger ? customTrigger(() => setOpen(true)) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (open) { closePopover(); } else { setOpen(true); } }}
            className={`relative inline-flex items-center gap-2 h-11 px-4 rounded-xl shadow-sm transition-all admin-filter-btn ${
              open || active ? 'active-filter' : ''
            }`}
          >
            <Filter className={`w-4 h-4 transition-colors ${active ? 'text-[#006e1b] dark:text-[#16E34A]' : 'text-slate-500 dark:text-slate-450'}`} />
            <span className="text-xs font-black uppercase tracking-widest">Filter</span>
            {active ? (
              <span className="ml-2 inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">{labelForPreset(active)}</span>
            ) : null}
          </button>
        )
      )}

      {open && (
        <div className={inlineOpen ? "w-full bg-slate-50/50 dark:bg-[#131B17]/60 border border-slate-200 dark:border-[#26322B] rounded-xl p-3.5 space-y-3" : "absolute right-0 mt-2 w-72 bg-white dark:bg-[#19231F] border border-slate-200 dark:border-[#26322B] rounded-2xl shadow-2xl p-4 z-50"}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Select Range</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clear}
                className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-[#26322B] text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest bg-white dark:bg-[#131B17] hover:bg-slate-50 dark:hover:bg-[#19231F]"
              >
                Clear
              </button>
              {!inlineOpen && <button type="button" onClick={closePopover} className="text-slate-450 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"><X className="w-4 h-4" /></button>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {PRESETS.map(p => {
              const isSel = selected === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key)}
                  className={`px-2 py-2 rounded-lg text-[10px] font-bold text-center transition-colors ${
                    isSel 
                      ? 'bg-primary text-white' 
                      : 'bg-white dark:bg-[#26322B] border border-slate-200 dark:border-[#26322B] text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-[#19231F] dark:hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3">
            {selected === 'custom' && (
              <div className="space-y-2 mt-2 border-t border-slate-100/50 dark:border-[#26322B]/50 pt-2">
                <div>
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-450 uppercase tracking-widest block mb-1">Start Date</label>
                  <input type="date" value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} className="w-full p-2 rounded-lg border border-slate-200 dark:border-[#26322B] text-xs bg-white dark:bg-[#131B17] text-slate-800 dark:text-slate-200" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-450 uppercase tracking-widest block mb-1">End Date</label>
                  <input type="date" value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} className="w-full p-2 rounded-lg border border-slate-200 dark:border-[#26322B] text-xs bg-white dark:bg-[#131B17] text-slate-800 dark:text-slate-200" />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-slate-150/40 dark:border-[#26322B]/60">
              <button type="button" onClick={closePopover} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#26322B] text-[10px] font-bold text-slate-600 dark:text-slate-350 bg-white dark:bg-[#131B17] hover:bg-slate-50 dark:hover:bg-[#19231F]">Cancel</button>
              <button type="button" onClick={applySelected} className="px-3 py-1.5 rounded-lg bg-primary hover:bg-[#1bb847] text-white text-[10px] font-bold">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateFilterPopover;
