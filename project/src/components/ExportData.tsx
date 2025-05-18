import React from 'react';
import { Download } from 'lucide-react';
import { useAnalyticsStore } from '../store';

const ExportData: React.FC = () => {
  const { customers } = useAnalyticsStore();

  const exportToCSV = () => {
    // Prepare CSV headers
    const headers = [
      'Customer ID',
      'First Seen',
      'Last Seen',
      'Time Spent (seconds)',
      'Status'
    ].join(',');

    // Convert customer data to CSV rows
    const rows = customers.map(customer => {
      const timeSpent = Math.floor(
        (customer.lastSeen.getTime() - customer.firstSeen.getTime()) / 1000
      );
      
      return [
        customer.id,
        customer.firstSeen.toISOString(),
        customer.lastSeen.toISOString(),
        timeSpent,
        customer.isActive ? 'Active' : 'Left'
      ].join(',');
    });

    // Combine headers and rows
    const csvContent = [headers, ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={exportToCSV}
      className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
    >
      <Download className="w-5 h-5" />
      Export CSV
    </button>
  );
};

export default ExportData;