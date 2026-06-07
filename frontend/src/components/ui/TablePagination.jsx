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
const TablePagination = ({ currentPage, totalPages, onPageChange, totalItems, pageSize }) => {
  if (totalItems === 0) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-200 bg-slate-50/30">
      {/* Left: item count */}
      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
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
          className="p-2 rounded-lg text-slate-500 hover:text-primary hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-all"
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous */}
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-2 rounded-lg text-slate-500 hover:text-primary hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-all"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Show ellipsis before */}
        {start > 1 && (
          <span className="w-8 h-8 flex items-center justify-center text-slate-300 text-xs">…</span>
        )}

        {/* Page numbers */}
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
              p === currentPage
                ? 'bg-primary text-white shadow-md shadow-emerald-glow'
                : 'text-slate-500 hover:bg-white hover:text-primary'
            }`}
          >
            {p}
          </button>
        ))}

        {/* Show ellipsis after */}
        {end < totalPages && (
          <span className="w-8 h-8 flex items-center justify-center text-slate-300 text-xs">…</span>
        )}

        {/* Next */}
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-2 rounded-lg text-slate-500 hover:text-primary hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-all"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last */}
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(totalPages)}
          className="p-2 rounded-lg text-slate-500 hover:text-primary hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-all"
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TablePagination;
