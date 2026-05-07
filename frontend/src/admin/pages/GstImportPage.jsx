import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import AdminTable from '../components/AdminTable';
import adminApi from '../services/adminApi';

const GstImportPage = () => {
  const [uploading, setUploading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [history, setHistory] = useState([]);

  const loadHistory = async () => {
    const response = await adminApi.getGSTImports();
    setHistory(response.data || []);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Import GST Data</h1>
      <button
        type="button"
        className="rounded border px-3 py-2 text-sm"
        onClick={async () => {
          try {
            await adminApi.seedSampleGST();
            toast.success('Seeded sample GST data');
            loadHistory();
          } catch (e) {
            toast.error(e.message);
          }
        }}
      >
        Seed sample GST data
      </button>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const formData = new FormData();
          formData.append('file', file);
          try {
            setUploading(true);
            const response = await adminApi.importGST(formData);
            setLastResult(response.data);
            toast.success('GST import completed');
            loadHistory();
          } catch (error) {
            toast.error(error.message);
          } finally {
            setUploading(false);
          }
        }}
      />
      {uploading && <div>Uploading and validating...</div>}
      {lastResult && (
        <div className="rounded border bg-white p-4">
          <div>Status: {lastResult.import_status}</div>
          <div>Imported: {lastResult.record_count}</div>
          <div>Errors: {lastResult.error_count}</div>
        </div>
      )}
      <AdminTable
        columns={[
          { key: 'file_name', title: 'File' },
          { key: 'status', title: 'Status' },
          { key: 'record_count', title: 'Records' },
          { key: 'error_count', title: 'Errors' },
          { key: 'upload_date', title: 'Upload Date' },
        ]}
        rows={history}
      />
    </div>
  );
};

export default GstImportPage;
