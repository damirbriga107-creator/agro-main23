import React from 'react';
import { FileText, FolderOpen, Upload, CheckCircle, BarChart3 } from 'lucide-react';

interface DocumentStatsProps {
  stats: {
    totalDocuments: number;
    totalSize: number;
    documentsByType: Record<string, number>;
    documentsByCategory: Record<string, number>;
    documentsByStatus: Record<string, number>;
    recentUploads: number;
    storageUsage: {
      used: number;
      limit: number;
      percentage: number;
    };
  };
}

export const DocumentStats: React.FC<DocumentStatsProps> = ({ stats }) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStorageColor = (percentage: number) => {
    if (percentage < 60) return 'text-green-600 bg-green-100';
    if (percentage < 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStorageBarColor = (percentage: number) => {
    if (percentage < 60) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const topTypes = Object.entries(stats.documentsByType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const topCategories = Object.entries(stats.documentsByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          Document Statistics
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Documents</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalDocuments}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Storage Used</p>
              <p className="text-2xl font-bold text-green-900">{formatFileSize(stats.totalSize)}</p>
            </div>
            <FolderOpen className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Recent Uploads</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.recentUploads}</p>
              <p className="text-xs text-yellow-600">Last 7 days</p>
            </div>
            <Upload className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Processed</p>
              <p className="text-2xl font-bold text-purple-900">{stats.documentsByStatus.completed || 0}</p>
              <p className="text-xs text-purple-600">Successfully processed</p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-gray-900">Storage Usage</h3>
          <span className={`text-sm px-3 py-1 rounded-full ${getStorageColor(stats.storageUsage.percentage)}`}>
            {stats.storageUsage.percentage.toFixed(1)}% used
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${getStorageBarColor(stats.storageUsage.percentage)}`}
            style={{ width: `${Math.min(stats.storageUsage.percentage, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{formatFileSize(stats.storageUsage.used)} used</span>
          <span>{formatFileSize(stats.storageUsage.limit)} total</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Document Types</h3>
          <div className="space-y-3">
            {topTypes.map(([type, count]) => {
              const percentage = stats.totalDocuments > 0 ? (count / stats.totalDocuments) * 100 : 0;
              const typeLabels: Record<string, string> = {
                identification: 'Identification',
                financial_statement: 'Financial Statement',
                insurance_document: 'Insurance Document',
                subsidy_application: 'Subsidy Application',
                farm_certificate: 'Farm Certificate',
                contract: 'Contract',
                invoice: 'Invoice',
                receipt: 'Receipt',
                photo: 'Photo',
                report: 'Report',
                other: 'Other'
              };

              return (
                <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="text-sm font-medium text-gray-900">{typeLabels[type] || type}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                    <span className="text-xs text-gray-500 ml-1">({percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Categories</h3>
          <div className="space-y-3">
            {topCategories.map(([category, count]) => {
              const percentage = stats.totalDocuments > 0 ? (count / stats.totalDocuments) * 100 : 0;
              const categoryLabels: Record<string, string> = {
                legal: 'Legal',
                financial: 'Financial',
                operational: 'Operational',
                compliance: 'Compliance',
                marketing: 'Marketing',
                technical: 'Technical',
                personal: 'Personal'
              };

              const categoryColors: Record<string, string> = {
                legal: 'bg-red-500',
                financial: 'bg-green-500',
                operational: 'bg-blue-500',
                compliance: 'bg-purple-500',
                marketing: 'bg-pink-500',
                technical: 'bg-gray-500',
                personal: 'bg-yellow-500'
              };

              return (
                <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${categoryColors[category] || 'bg-gray-500'}`} />
                    <span className="text-sm font-medium text-gray-900">{categoryLabels[category] || category}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                    <span className="text-xs text-gray-500 ml-1">({percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Processing Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(stats.documentsByStatus).map(([status, count]) => {
            const statusLabels: Record<string, string> = {
              pending: 'Pending',
              processing: 'Processing',
              completed: 'Completed',
              failed: 'Failed',
              cancelled: 'Cancelled'
            };

            const statusColors: Record<string, string> = {
              pending: 'text-yellow-600 bg-yellow-100',
              processing: 'text-blue-600 bg-blue-100',
              completed: 'text-green-600 bg-green-100',
              failed: 'text-red-600 bg-red-100',
              cancelled: 'text-gray-600 bg-gray-100'
            };

            return (
              <div key={status} className={`p-3 rounded-lg text-center ${statusColors[status] || 'text-gray-600 bg-gray-100'}`}>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-xs font-medium">{statusLabels[status] || status}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
