import React from 'react';
import { useAnalyticsStore } from '../store';
import { Users, Clock, History, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import ExportData from './ExportData';

const Analytics: React.FC = () => {
  const { customers } = useAnalyticsStore();
  
  const activeCustomers = customers.filter(c => c.isActive).length;
  const totalCustomers = customers.length;
  
  const calculateTimeSpent = (customer: { firstSeen: Date, lastSeen: Date, isActive: boolean }) => {
    const endTime = customer.isActive ? new Date() : customer.lastSeen;
    return endTime.getTime() - customer.firstSeen.getTime();
  };
  
  const calculateAverageTime = () => {
    if (customers.length === 0) return 0;
    const times = customers.map(customer => calculateTimeSpent(customer));
    return Math.round(times.reduce((acc, time) => acc + time, 0) / times.length);
  };

  const formatTimeSpent = (timeInMs: number): string => {
    const seconds = Math.floor(timeInMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">Real-time Analytics</h2>
          <ExportData />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <Users className="w-6 h-6 opacity-80" />
            {activeCustomers > 0 ? (
              <ArrowUpRight className="w-5 h-5" />
            ) : (
              <ArrowDownRight className="w-5 h-5" />
            )}
          </div>
          <p className="text-3xl font-bold mt-2">{activeCustomers}</p>
          <p className="text-indigo-100 text-sm">Current People</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <History className="w-6 h-6 opacity-80" />
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold mt-2">{totalCustomers}</p>
          <p className="text-emerald-100 text-sm">Total Detected</p>
        </div>

        <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <Clock className="w-6 h-6 opacity-80" />
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold mt-2">{formatTimeSpent(calculateAverageTime())}</p>
          <p className="text-violet-100 text-sm">Average Time</p>
        </div>
      </div>

      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="px-4 py-3 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider rounded-tl-lg">
                  ID
                </th>
                <th className="px-4 py-3 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Time Present
                </th>
                <th className="px-4 py-3 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  First Seen
                </th>
                <th className="px-4 py-3 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider rounded-tr-lg">
                  Last Seen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {customers.map((customer, index) => (
                <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {customer.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      customer.isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {customer.isActive ? 'Present' : 'Left'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {formatTimeSpent(calculateTimeSpent(customer))}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {customer.firstSeen.toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {customer.isActive ? 'Now' : customer.lastSeen.toLocaleTimeString()}
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No data available yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;