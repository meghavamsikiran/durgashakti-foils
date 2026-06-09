import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Reusable pagination bar for data tables and grid listings.
 *
 * @param {number} currentPage  - 1-indexed current page
 * @param {number} totalPages   - total number of pages
 * @param {function} onPageChange - callback(newPage)
 * @param {number} totalItems   - (optional) total row count, shown as "X items"
 * @param {number} pageSize     - (optional) rows per page, shown as context
 */
const TablePagination = ({ currentPage, totalPages, onPageChange, totalItems, pageSize, variant }) => {
  if (totalItems === 0) return null;

  const isDark = variant === 'dark';

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 rounded-2xl border ${
      isDark 
        ? 'border-[#26322B] bg-[#131B17]/40' 
        : 'border-slate-250 bg-white shadow-md'
    }`}>
      {/* Left: item count */}
      <div className={`text-[10px] font-black uppercase tracking-widest ${
        isDark ? 'text-slate-400' : 'text-slate-500'
      }`}>
        {totalItems != null && (
          <>
            Showing {Math.min((currentPage - 1) * (pageSize || 10) + 1, totalItems)}–
            {Math.min(currentPage * (pageSize || 10), totalItems)} of {totalItems}
          </>
        )}
      </div>

      {/* Right: page buttons */}
      <div className="flex items-center gap-1">
        {/* First */}
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(1)}
          className={`p-2 rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none ${
            isDark 
              ? 'text-slate-400 hover:text-[#25D958] hover:bg-[#25D958]/10' 
              : 'text-slate-500 hover:text-primary hover:bg-white'
          }`}
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous */}
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={`p-2 rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none ${
            isDark 
              ? 'text-slate-400 hover:text-[#25D958] hover:bg-[#25D958]/10' 
              : 'text-slate-500 hover:text-primary hover:bg-white'
          }`}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Show ellipsis before */}
        {start > 1 && (
          <span className={`w-8 h-8 flex items-center justify-center text-xs ${
            isDark ? 'text-slate-500' : 'text-slate-300'
          }`}>…</span>
        )}

        {/* Page numbers */}
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
              p === currentPage
                ? isDark
                  ? 'bg-[#25D958] text-[#0C1310] shadow-md shadow-[#25D958]/20'
                  : 'bg-primary text-white shadow-md shadow-emerald-glow'
                : isDark
                  ? 'text-slate-400 hover:bg-[#25D958]/10 hover:text-[#25D958]'
                  : 'text-slate-500 hover:bg-white hover:text-primary'
            }`}
          >
            {p}
          </button>
        ))}

        {/* Show ellipsis after */}
        {end < totalPages && (
          <span className={`w-8 h-8 flex items-center justify-center text-xs ${
            isDark ? 'text-slate-500' : 'text-slate-300'
          }`}>…</span>
        )}

        {/* Next */}
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className={`p-2 rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none ${
            isDark 
              ? 'text-slate-400 hover:text-[#25D958] hover:bg-[#25D958]/10' 
              : 'text-slate-500 hover:text-primary hover:bg-white'
          }`}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last */}
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(totalPages)}
          className={`p-2 rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none ${
            isDark 
              ? 'text-slate-400 hover:text-[#25D958] hover:bg-[#25D958]/10' 
              : 'text-slate-500 hover:text-primary hover:bg-white'
          }`}
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TablePagination;
