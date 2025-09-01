import React from 'react';
import { FileText, Download, Eye, Trash2, Tag, Calendar, User, FileIcon, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Document {
  _id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  userId: string;
  farmId: string;
  documentType: string;
  category: string;
  tags: string[];
  description?: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  ocrStatus: 'not_required' | 'pending' | 'processing' | 'completed' | 'failed';
  extractedText?: string;
  ocrConfidence?: number;
  isPublic: boolean;
  uploadedAt: string;
  uploadedBy: string;
  version: number;
}

interface DocumentListProps {
  documents: Document[];
  onView: (document: Document) => void;
  onDownload: (document: Document) => void;
  onDelete: (documentId: string) => void;
  viewMode: 'grid' | 'list';
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onView,
  onDownload,
  onDelete,
  viewMode
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <FileIcon className=\"w-8 h-8 text-blue-500\" />;
    } else if (mimeType === 'application/pdf') {
      return <FileText className=\"w-8 h-8 text-red-500\" />;
    } else if (mimeType.includes('word')) {
      return <FileText className=\"w-8 h-8 text-blue-600\" />;
    } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return <FileText className=\"w-8 h-8 text-green-600\" />;
    } else {
      return <FileText className=\"w-8 h-8 text-gray-500\" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className=\"w-4 h-4 text-green-500\" />;
      case 'processing':
      case 'pending':
        return <Clock className=\"w-4 h-4 text-yellow-500\" />;
      case 'failed':
        return <XCircle className=\"w-4 h-4 text-red-500\" />;
      default:
        return <AlertCircle className=\"w-4 h-4 text-gray-500\" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Processed';
      case 'processing':
        return 'Processing';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      'identification': 'Identification',
      'financial_statement': 'Financial Statement',
      'insurance_document': 'Insurance Document',
      'subsidy_application': 'Subsidy Application',
      'farm_certificate': 'Farm Certificate',
      'contract': 'Contract',
      'invoice': 'Invoice',
      'receipt': 'Receipt',
      'photo': 'Photo',
      'report': 'Report',
      'other': 'Other'
    };
    return typeLabels[type] || type;
  };

  const getCategoryLabel = (category: string) => {
    const categoryLabels: Record<string, string> = {
      'legal': 'Legal',
      'financial': 'Financial',
      'operational': 'Operational',
      'compliance': 'Compliance',
      'marketing': 'Marketing',
      'technical': 'Technical',
      'personal': 'Personal'
    };
    return categoryLabels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'legal': 'bg-red-100 text-red-800',
      'financial': 'bg-green-100 text-green-800',
      'operational': 'bg-blue-100 text-blue-800',
      'compliance': 'bg-purple-100 text-purple-800',
      'marketing': 'bg-pink-100 text-pink-800',
      'technical': 'bg-gray-100 text-gray-800',
      'personal': 'bg-yellow-100 text-yellow-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {documents.map((document) => (
          <div key={document._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            {/* Document Icon and Status */}
            <div className=\"flex items-center justify-between mb-3\">
              <div className=\"flex items-center gap-2\">
                {getFileIcon(document.mimeType)}
                <div className=\"flex items-center gap-1\">
                      {getStatusIcon(document.processingStatus)}
                      <span className="text-xs text-gray-500">{getStatusText(document.processingStatus)}</span>
                </div>
              </div>
              {document.isPublic && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Public</span>
              )}
            </div>

            {/* File Name */}
            <h3 className="font-medium text-gray-900 mb-2 truncate" title={document.fileName}>{document.fileName}</h3>

            {/* File Info */}
            <div className=\"text-xs text-gray-500 mb-3 space-y-1\">
              <div className=\"flex items-center justify-between\">
                <span>{formatFileSize(document.size)}</span>
                <span className={`px-2 py-1 rounded ${getCategoryColor(document.category)}`}>
                  {getCategoryLabel(document.category)}
                </span>
              </div>
              <div>{getDocumentTypeLabel(document.documentType)}</div>
              <div className=\"flex items-center gap-1\">
                <Calendar className=\"w-3 h-3\" />
                {formatDate(document.uploadedAt)}
              </div>
            </div>

            {/* Tags */}
            {document.tags.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {document.tags.slice(0, 2).map((tag, index) => (
                    <span key={index} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                  {document.tags.length > 2 && <span className="text-xs text-gray-500">+{document.tags.length - 2} more</span>}
                </div>
              </div>
            )}

            {/* Description */}
            {document.description && <p className="text-xs text-gray-600 mb-3 line-clamp-2">{document.description}</p>}

            {/* Actions */}
            <div className=\"flex items-center justify-between pt-3 border-t border-gray-100\">
              <button onClick={() => onView(document)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
                <Eye className="w-4 h-4" />
                View
              </button>
              <div className=\"flex items-center gap-2\">
                <button onClick={() => onDownload(document)} className="flex items-center gap-1 text-gray-600 hover:text-gray-800 text-sm">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(document._id)} className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // List view
  return (
    <div className=\"space-y-2\">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 p-3 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">
        <div className="col-span-4">Document</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-2">Category</div>
        <div className="col-span-1">Size</div>
        <div className="col-span-2">Uploaded</div>
        <div className="col-span-1">Actions</div>
      </div>

      {/* Document Rows */}
      {documents.map((document) => (
        <div key={document._id} className="grid grid-cols-12 gap-4 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
          {/* Document Info */}
          <div className="col-span-4 flex items-center gap-3">
            <div className="flex-shrink-0">{getFileIcon(document.mimeType)}</div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-gray-900 truncate" title={document.fileName}>{document.fileName}</h3>
              <div className="flex items-center gap-2 mt-1">
                {getStatusIcon(document.processingStatus)}
                <span className="text-xs text-gray-500">{getStatusText(document.processingStatus)}</span>
                {document.isPublic && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Public</span>}
              </div>
              {document.description && <p className="text-xs text-gray-600 mt-1 line-clamp-1">{document.description}</p>}
              {document.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {document.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                  {document.tags.length > 3 && <span className="text-xs text-gray-500">+{document.tags.length - 3}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Type */}
          <div className=\"col-span-2 flex items-center\">
            <span className=\"text-sm text-gray-600\">
              {getDocumentTypeLabel(document.documentType)}
            </span>
          </div>

          {/* Category */}
          <div className=\"col-span-2 flex items-center\">
            <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(document.category)}`}>
              {getCategoryLabel(document.category)}
            </span>
          </div>

          {/* Size */}
          <div className=\"col-span-1 flex items-center\">
            <span className=\"text-sm text-gray-600\">
              {formatFileSize(document.size)}
            </span>
          </div>

          {/* Upload Date */}
          <div className=\"col-span-2 flex items-center\">
            <div className=\"text-sm text-gray-600\">
              <div className=\"flex items-center gap-1\">
                <Calendar className=\"w-4 h-4\" />
                {formatDate(document.uploadedAt)}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className=\"col-span-1 flex items-center justify-end gap-2\">
            <button
              onClick={() => onView(document)}
              className=\"text-blue-600 hover:text-blue-800 transition-colors\"
              title=\"View document\"
            >
              <Eye className=\"w-4 h-4\" />
            </button>
            <button
              onClick={() => onDownload(document)}
              className=\"text-gray-600 hover:text-gray-800 transition-colors\"
              title=\"Download document\"
            >
              <Download className=\"w-4 h-4\" />
            </button>
            <button
              onClick={() => onDelete(document._id)}
              className=\"text-red-600 hover:text-red-800 transition-colors\"
              title=\"Delete document\"
            >
              <Trash2 className=\"w-4 h-4\" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};