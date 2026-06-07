import React from 'react';

const AdminTable = ({ columns, rows, emptyText = 'No records found.' }) => {
  if (!rows?.length) {
    return <div className="rounded border p-4 text-sm text-slate-500">{emptyText}</div>;
  }

  return (
    <div className="overflow-x-auto overflow-y-auto rounded border bg-white admin-table-container-standard">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
          <tr>
            {columns.map((column, colIdx) => (
              <th key={`col-${colIdx}`} className="px-4 py-2 text-left font-semibold text-slate-700">
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id || JSON.stringify(row)} className="border-t">
              {columns.map((column, colIdx) => (
                <td key={`cell-${colIdx}`} className="px-4 py-2">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminTable;
