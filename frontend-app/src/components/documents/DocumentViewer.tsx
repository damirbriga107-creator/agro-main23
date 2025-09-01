import React, { useState, useEffect } from 'react';
import { X, Download, Trash2, FileText, Eye, Tag, Calendar, User, Copy, Share, Edit } from 'lucide-react';

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

interface DocumentViewerProps {
  document: Document;
  onClose: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  onClose,
  onDownload,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'details' | 'text'>('preview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDocumentTypeLabel = (type: string) => {
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
    return typeLabels[type] || type;
  };

  const getCategoryLabel = (category: string) => {
    const categoryLabels: Record<string, string> = {
      legal: 'Legal',
      financial: 'Financial',
      operational: 'Operational',
      compliance: 'Compliance',
      marketing: 'Marketing',
      technical: 'Technical',
      personal: 'Personal'
    };
    return categoryLabels[category] || category;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'processing':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const canPreview = () => {
    return (
      document.mimeType.startsWith('image/') ||
      document.mimeType === 'application/pdf' ||
      document.mimeType === 'text/plain'
    );
  };

  const renderPreview = () => {
    if (document.mimeType.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
          <img
            src={`/api/v1/documents/${document._id}/download`}
            alt={document.fileName}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
          />
        </div>
      );
    }

    if (document.mimeType === 'application/pdf') {
      return (
        <div className="h-full bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">PDF preview not available</p>
            <button
              onClick={onDownload}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Download to View
            </button>
          </div>
        </div>
      );
    }

    if (document.mimeType === 'text/plain') {
      return (
        <div className="h-full bg-gray-50 rounded-lg p-4 overflow-auto">
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
            {/* This would need to be loaded from the server */}
            Content preview not implemented yet.
          </pre>
        </div>
      );
    }

    return (
      <div className="h-full bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Preview not available for this file type</p>
          <button
            onClick={onDownload}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Download File
          </button>
        </div>
      </div>
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 min-w-0 flex-1">
              <FileText className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-gray-900 truncate" title={document.fileName}>
                  {document.fileName}
                </h2>
                <p className="text-sm text-gray-500">
                  {getDocumentTypeLabel(document.documentType)} • {formatFileSize(document.size)}
                </p>
              </div>
            </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onDownload}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Download className="w-5 h-5" />
              Download
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-red-600 hover:text-red-800 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              Delete
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

  <div className="flex h-[calc(100%-80px)]"> 
          {/* Left Panel - Preview */}
          <div className="flex-1 p-6">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6"> 
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'preview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                <Eye className="w-4 h-4 inline mr-2" />
                Preview
              </button>
              {document.extractedText && (
                <button
                  onClick={() => setActiveTab('text')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'text'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Extracted Text
                </button>
              )}
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Details
              </button>
            </div>

            {/* Tab Content */}
            <div className="h-[calc(100%-80px)]"> 
              {activeTab === 'preview' && renderPreview()}
              
              {activeTab === 'text' && document.extractedText && (
                <div className="h-full bg-gray-50 rounded-lg p-4 overflow-auto"> 
                  <div className="flex items-center justify-between mb-4"> 
                    <h3 className="text-lg font-medium text-gray-900">Extracted Text</h3>
                    <div className="flex items-center gap-2">
                      {document.ocrConfidence && (
                        <span className="text-sm text-gray-600">
                          Confidence: {(document.ocrConfidence * 100).toFixed(1)}%
                        </span>
                      )}
                      <button
                        onClick={() => copyToClipboard(document.extractedText!)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded border text-sm text-gray-800 whitespace-pre-wrap">
                    {document.extractedText}
                  </div>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="h-full overflow-auto space-y-6"> 
                  {/* Basic Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-gray-700">File Name</label>
                        <p className="text-gray-900 mt-1">{document.fileName}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Original Name</label>
                        <p className="text-gray-900 mt-1">{document.originalName}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">File Type</label>
                        <p className="text-gray-900 mt-1">{document.mimeType}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">File Size</label>
                        <p className="text-gray-900 mt-1">{formatFileSize(document.size)}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Document Type</label>
                        <p className="text-gray-900 mt-1">{getDocumentTypeLabel(document.documentType)}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Category</label>
                        <p className="text-gray-900 mt-1">{getCategoryLabel(document.category)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Processing Status</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-gray-700">Processing Status</label>
                        <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(document.processingStatus)}`}>
                          {document.processingStatus}
                        </span>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">OCR Status</label>
                        <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(document.ocrStatus)}`}>
                          {document.ocrStatus}
                        </span>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Version</label>
                        <p className="text-gray-900 mt-1">v{document.version}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Visibility</label>
                        <p className="text-gray-900 mt-1">{document.isPublic ? 'Public' : 'Private'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {document.description && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-800 text-sm">{document.description}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {document.tags.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {document.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Information</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-700">Uploaded:</span>
                        <span className="text-gray-900">{formatDate(document.uploadedAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-700">Uploaded by:</span>
                        <span className="text-gray-900">{document.uploadedBy}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Document</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{document.fileName}"? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};