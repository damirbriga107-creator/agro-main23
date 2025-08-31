import React, { useState, useEffect, useCallback } from 'react';
import { Search, Upload, Filter, FileText, Download, Trash2, Eye, Tag, Calendar, User, FolderOpen, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { DocumentUploader } from '../components/documents/DocumentUploader';
import { DocumentList } from '../components/documents/DocumentList';
import { DocumentFilters } from '../components/documents/DocumentFilters';
import { DocumentStats } from '../components/documents/DocumentStats';
import { DocumentViewer } from '../components/documents/DocumentViewer';
import { api } from '../services/api';

// Types for Document management
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
  storageProvider: string;
  storagePath: string;
  storageUrl?: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  ocrStatus: 'not_required' | 'pending' | 'processing' | 'completed' | 'failed';
  extractedText?: string;
  ocrConfidence?: number;
  isPublic: boolean;
  relatedEntityType?: string;
  relatedEntityId?: string;
  uploadedAt: string;
  uploadedBy: string;
  lastModifiedAt: string;
  version: number;
}

interface DocumentSearchQuery {
  fileName?: string;
  documentType?: string;
  category?: string;
  tags?: string[];
  uploadedAfter?: string;
  uploadedBefore?: string;
  processingStatus?: string;
  ocrStatus?: string;
  hasExtractedText?: boolean;
  isPublic?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface DocumentSearchResponse {
  documents: Document[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface DocumentStats {
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
}

export const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [searchQuery, setSearchQuery] = useState<DocumentSearchQuery>({
    page: 1,
    limit: 20,
    sortBy: 'uploadedAt',
    sortOrder: 'desc'
  });
  const [searchResults, setSearchResults] = useState<DocumentSearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Load documents and stats on component mount
  useEffect(() => {
    loadDocuments();
    loadStats();
  }, [searchQuery]);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      Object.entries(searchQuery).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, value.toString());
          }
        }
      });

      const response = await api.get(`/documents/search?${params.toString()}`);
      setSearchResults(response.data.data);
      setDocuments(response.data.data.documents);
    } catch (err) {
      setError('Failed to load documents. Please try again.');
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const loadStats = async () => {
    try {
      const response = await api.get('/documents/stats');
      setStats(response.data.data);
    } catch (err) {
      console.error('Error loading document stats:', err);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(prev => ({
      ...prev,
      fileName: query,
      page: 1
    }));
  };

  const handleFilterChange = (filters: Partial<DocumentSearchQuery>) => {
    setSearchQuery(prev => ({
      ...prev,
      ...filters,
      page: 1
    }));
  };

  const handleUploadSuccess = (uploadedDocuments: any[]) => {
    setShowUploader(false);
    setUploading(false);
    loadDocuments();
    loadStats();
  };

  const handleUploadError = (error: string) => {
    setError(error);
    setUploading(false);
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await api.delete(`/documents/${documentId}`);
      loadDocuments();
      loadStats();
    } catch (err) {
      setError('Failed to delete document. Please try again.');
      console.error('Error deleting document:', err);
    }
  };

  const handleDownloadDocument = async (document: Document) => {
    try {
      const response = await api.get(`/documents/${document._id}/download`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download document. Please try again.');
      console.error('Error downloading document:', err);
    }
  };

  const handlePageChange = (page: number) => {
    setSearchQuery(prev => ({
      ...prev,
      page
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  if (loading && documents.length === 0) {
    return (
      <div className=\"flex items-center justify-center min-h-screen\">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className=\"min-h-screen bg-gray-50 p-6\">
      <div className=\"max-w-7xl mx-auto\">
        {/* Header */}
        <div className=\"bg-white rounded-lg shadow-sm p-6 mb-6\">
          <div className=\"flex items-center justify-between mb-6\">
            <div>
              <h1 className=\"text-3xl font-bold text-gray-900 flex items-center gap-3\">
                <FileText className=\"w-8 h-8 text-blue-600\" />
                Documents
              </h1>
              <p className=\"text-gray-600 mt-2\">
                Manage your farm documents, contracts, and files
              </p>
            </div>
            <button
              onClick={() => setShowUploader(true)}
              className=\"flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors\"
            >
              <Upload className=\"w-5 h-5\" />
              Upload Documents
            </button>
          </div>

          {/* Stats Summary */}
          {stats && (
            <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4 mb-6\">
              <div className=\"bg-blue-50 p-4 rounded-lg\">
                <div className=\"flex items-center gap-2\">
                  <FileText className=\"w-5 h-5 text-blue-600\" />
                  <span className=\"text-sm text-blue-600 font-medium\">Total Documents</span>
                </div>
                <p className=\"text-2xl font-bold text-blue-900 mt-1\">{stats.totalDocuments}</p>
              </div>
              <div className=\"bg-green-50 p-4 rounded-lg\">
                <div className=\"flex items-center gap-2\">
                  <FolderOpen className=\"w-5 h-5 text-green-600\" />
                  <span className=\"text-sm text-green-600 font-medium\">Storage Used</span>
                </div>
                <p className=\"text-2xl font-bold text-green-900 mt-1\">{formatFileSize(stats.totalSize)}</p>
              </div>
              <div className=\"bg-yellow-50 p-4 rounded-lg\">
                <div className=\"flex items-center gap-2\">
                  <Upload className=\"w-5 h-5 text-yellow-600\" />
                  <span className=\"text-sm text-yellow-600 font-medium\">Recent Uploads</span>
                </div>
                <p className=\"text-2xl font-bold text-yellow-900 mt-1\">{stats.recentUploads}</p>
              </div>
              <div className=\"bg-purple-50 p-4 rounded-lg\">
                <div className=\"flex items-center gap-2\">
                  <CheckCircle className=\"w-5 h-5 text-purple-600\" />
                  <span className=\"text-sm text-purple-600 font-medium\">Storage Usage</span>
                </div>
                <p className=\"text-2xl font-bold text-purple-900 mt-1\">{stats.storageUsage.percentage.toFixed(1)}%</p>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className=\"flex items-center gap-4 mb-4\">
            <div className=\"flex-1 relative\">
              <Search className=\"w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400\" />
              <input
                type=\"text\"
                placeholder=\"Search documents by name...\"
                className=\"w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent\"
                value={searchQuery.fileName || ''}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                showFilters
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className=\"w-5 h-5\" />
              Filters
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <DocumentFilters
              filters={searchQuery}
              onFilterChange={handleFilterChange}
              onClose={() => setShowFilters(false)}
            />
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className=\"mb-6\">
            <ErrorMessage message={error} onClose={() => setError(null)} />
          </div>
        )}

        {/* Document List */}
        <div className=\"bg-white rounded-lg shadow-sm\">
          {loading ? (
            <div className=\"flex items-center justify-center py-12\">
              <LoadingSpinner />
            </div>
          ) : documents.length === 0 ? (
            <div className=\"text-center py-12\">
              <FileText className=\"w-16 h-16 text-gray-300 mx-auto mb-4\" />
              <h3 className=\"text-lg font-medium text-gray-900 mb-2\">No documents found</h3>
              <p className=\"text-gray-500 mb-4\">
                {searchQuery.fileName ? 'Try adjusting your search criteria' : 'Start by uploading your first document'}
              </p>
              <button
                onClick={() => setShowUploader(true)}
                className=\"inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors\"
              >
                <Upload className=\"w-5 h-5\" />
                Upload Documents
              </button>
            </div>
          ) : (
            <div className=\"p-6\">
              {/* Results Info */}
              <div className=\"flex items-center justify-between mb-4\">
                <p className=\"text-sm text-gray-600\">
                  Showing {((searchResults?.currentPage || 1) - 1) * (searchQuery.limit || 20) + 1} to{' '}
                  {Math.min((searchResults?.currentPage || 1) * (searchQuery.limit || 20), searchResults?.totalCount || 0)} of{' '}
                  {searchResults?.totalCount || 0} documents
                </p>
                <div className=\"flex items-center gap-2\">
                  <select
                    value={`${searchQuery.sortBy}-${searchQuery.sortOrder}`}
                    onChange={(e) => {
                      const [sortBy, sortOrder] = e.target.value.split('-');
                      handleFilterChange({ sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
                    }}
                    className=\"border border-gray-300 rounded-lg px-3 py-1 text-sm\"
                  >
                    <option value=\"uploadedAt-desc\">Newest First</option>
                    <option value=\"uploadedAt-asc\">Oldest First</option>
                    <option value=\"fileName-asc\">Name A-Z</option>
                    <option value=\"fileName-desc\">Name Z-A</option>
                    <option value=\"size-desc\">Largest First</option>
                    <option value=\"size-asc\">Smallest First</option>
                  </select>
                </div>
              </div>

              {/* Document List */}
              <DocumentList
                documents={documents}
                onView={setSelectedDocument}
                onDownload={handleDownloadDocument}
                onDelete={handleDeleteDocument}
                viewMode={viewMode}
              />

              {/* Pagination */}
              {searchResults && searchResults.totalPages > 1 && (
                <div className=\"flex items-center justify-center gap-2 mt-6\">
                  <button
                    onClick={() => handlePageChange(searchResults.currentPage - 1)}
                    disabled={!searchResults.hasPreviousPage}
                    className=\"px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50\"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, searchResults.totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 border rounded-lg ${
                          page === searchResults.currentPage
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(searchResults.currentPage + 1)}
                    disabled={!searchResults.hasNextPage}
                    className=\"px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50\"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Document Uploader Modal */}
        {showUploader && (
          <DocumentUploader
            onSuccess={handleUploadSuccess}
            onError={handleUploadError}
            onClose={() => setShowUploader(false)}
            uploading={uploading}
            setUploading={setUploading}
          />
        )}

        {/* Document Viewer Modal */}
        {selectedDocument && (
          <DocumentViewer
            document={selectedDocument}
            onClose={() => setSelectedDocument(null)}
            onDownload={() => handleDownloadDocument(selectedDocument)}
            onDelete={() => {
              handleDeleteDocument(selectedDocument._id);
              setSelectedDocument(null);
            }}
          />
        )}
      </div>
    </div>
  );
};