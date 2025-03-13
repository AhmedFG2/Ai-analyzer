import React from 'react';
import { Download } from 'lucide-react';
import { useAnalyticsStore } from '../store';

const ExportData: React.FC = () => {
  const { customers } = useAnalyticsStore();

  const exportData = async () => {
    // Generate HTML content
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Analytics Export - ${new Date().toLocaleString()}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          h1 {
            color: #2563eb;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: white;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }
          th {
            background: #f8fafc;
            font-weight: 600;
            color: #4b5563;
          }
          tr:hover {
            background: #f8fafc;
          }
          .snapshot {
            max-width: 200px;
            border-radius: 4px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          .status {
            padding: 4px 8px;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 500;
          }
          .status-active {
            background: #dcfce7;
            color: #166534;
          }
          .status-left {
            background: #f3f4f6;
            color: #4b5563;
          }
          .download-csv {
            display: inline-block;
            margin-top: 20px;
            padding: 8px 16px;
            background: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-size: 0.875rem;
          }
          .download-csv:hover {
            background: #1d4ed8;
          }
          .meta {
            color: #6b7280;
            font-size: 0.875rem;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Analytics Export</h1>
          <div class="meta">
            <div>Generated: ${new Date().toLocaleString()}</div>
            <div>Total Records: ${customers.length}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>First Seen</th>
                <th>Last Seen</th>
                <th>Time Spent</th>
                <th>Status</th>
                <th>Snapshot</th>
              </tr>
            </thead>
            <tbody>
    `;

    // Add customer data
    for (const customer of customers) {
      const timeSpent = Math.floor(
        (customer.lastSeen.getTime() - customer.firstSeen.getTime()) / 1000
      );

      htmlContent += `
        <tr>
          <td>${customer.id.slice(0, 8)}</td>
          <td>${customer.firstSeen.toLocaleString()}</td>
          <td>${customer.lastSeen.toLocaleString()}</td>
          <td>${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s</td>
          <td>
            <span class="status ${customer.isActive ? 'status-active' : 'status-left'}">
              ${customer.isActive ? 'Active' : 'Left'}
            </span>
          </td>
          <td>
            ${customer.snapshot 
              ? `<img src="${customer.snapshot}" class="snapshot" alt="Customer snapshot">` 
              : 'No snapshot available'}
          </td>
        </tr>
      `;
    }

    // Close HTML content
    htmlContent += `
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    // Create and download the HTML file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics_${new Date().toISOString()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportData}
      className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
    >
      <Download className="w-5 h-5" />
      Export Report
    </button>
  );
};

export default ExportData;