import React from 'react';
import { useAnalyticsStore } from '../store';
import { Users, Clock, History } from 'lucide-react';
import ExportData from './ExportData';

const Analytics: React.FC = () => {
  const { customers } = useAnalyticsStore();
  
  // Count only currently active customers
  const activeCustomers = customers.filter(c => c.isActive).length;
  // Total unique customers seen
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
    <section className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-7 h-7 text-blue-500" />
          Real-time Analytics
        </h2>
        <ExportData />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Current People Count */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Current People</h3>
          </div>
          <p className="text-4xl font-bold">{activeCustomers}</p>
        </div>

        {/* Total People Detected */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <History className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Total Detected</h3>
          </div>
          <p className="text-4xl font-bold">{totalCustomers}</p>
        </div>

        {/* Average Time Spent */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Average Time</h3>
          </div>
          <p className="text-4xl font-bold">{formatTimeSpent(calculateAverageTime())}</p>
        </div>
      </div>

      {/* Detailed List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time Present
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                First Seen
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Seen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.map((customer, index) => (
              <tr key={customer.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {customer.id.slice(0, 8)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    customer.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {customer.isActive ? 'Present' : 'Left'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatTimeSpent(calculateTimeSpent(customer))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {customer.firstSeen.toLocaleTimeString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {customer.isActive ? 'Now' : customer.lastSeen.toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Analytics;