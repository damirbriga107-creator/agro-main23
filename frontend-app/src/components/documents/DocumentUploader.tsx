import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle, Trash2, Tag, FileIcon } from 'lucide-react';
import api from '../../services/api';
import { AxiosProgressEvent } from 'axios';

interface DocumentUploaderProps {
  onSuccess: (documents: any[]) => void;
  onError: (error: string) => void;
  onClose: () => void;
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
}

interface FileWithMetadata {
  file: File;
  id: string;
  preview?: string;
  documentType: string;
  category: string;
  description: string;
  tags: string[];
  isPublic: boolean;
  uploadProgress?: number;
  uploadStatus?: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const DOCUMENT_TYPES = [
  { value: 'identification', label: 'Identification' },
  { value: 'financial_statement', label: 'Financial Statement' },
  { value: 'insurance_document', label: 'Insurance Document' },
  { value: 'subsidy_application', label: 'Subsidy Application' },
  { value: 'farm_certificate', label: 'Farm Certificate' },
  { value: 'contract', label: 'Contract' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'photo', label: 'Photo' },
  { value: 'report', label: 'Report' },
  { value: 'other', label: 'Other' }
];

const CATEGORIES = [
  { value: 'legal', label: 'Legal' },
  { value: 'financial', label: 'Financial' },
  { value: 'operational', label: 'Operational' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'technical', label: 'Technical' },
  { value: 'personal', label: 'Personal' }
];

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onSuccess,
  onError,
  onClose,
  uploading,
  setUploading
}) => {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFiles(selectedFiles);
  }, []);

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      // File type validation
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        onError(`File type ${file.type} is not supported`);
        return false;
      }
      
      // File size validation (10MB)
      if (file.size > 10 * 1024 * 1024) {
        onError(`File ${file.name} is too large. Maximum size is 10MB`);
        return false;
      }
      
      return true;
    });

    const filesWithMetadata: FileWithMetadata[] = validFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      documentType: 'other',
      category: 'operational',
      description: '',
      tags: [],
      isPublic: false,
      uploadStatus: 'pending'
    }));

    setFiles(prev => [...prev, ...filesWithMetadata]);
  };

  const updateFileMetadata = (id: string, updates: Partial<FileWithMetadata>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      onError('Please select at least one file to upload');
      return;
    }

    setUploading(true);
    const results: any[] = [];

    try {
      for (const fileData of files) {
        updateFileMetadata(fileData.id, { uploadStatus: 'uploading', uploadProgress: 0 });

        const formData = new FormData();
        formData.append('file', fileData.file);
        formData.append('documentType', fileData.documentType);
        formData.append('category', fileData.category);
        formData.append('description', fileData.description);
        formData.append('tags', JSON.stringify(fileData.tags));
        formData.append('isPublic', fileData.isPublic.toString());

        try {
          const response = await api.post('/documents/upload/single', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent: AxiosProgressEvent) => {
              const loaded = (progressEvent.loaded as number) || 0;
              const total = (progressEvent.total as number) || 1;
              const progress = Math.round((loaded * 100) / total);
              updateFileMetadata(fileData.id, { uploadProgress: progress });
            }
          });

          updateFileMetadata(fileData.id, { 
            uploadStatus: 'success', 
            uploadProgress: 100 
          });
          results.push((response.data as any).data);
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Upload failed';
          updateFileMetadata(fileData.id, { 
            uploadStatus: 'error', 
            error: errorMessage 
          });
          onError(`Failed to upload ${fileData.file.name}: ${errorMessage}`);
        }
      }

      if (results.length > 0) {
        onSuccess(results);
      }
    } catch (error) {
      onError('Upload process failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const addTag = (fileId: string, tag: string) => {
    if (!tag.trim()) return;
    
    const file = files.find(f => f.id === fileId);
    if (file && !file.tags.includes(tag.trim())) {
      updateFileMetadata(fileId, {
        tags: [...file.tags, tag.trim()]
      });
    }
  };

  const removeTag = (fileId: string, tagToRemove: string) => {
    updateFileMetadata(fileId, {
      tags: files.find(f => f.id === fileId)?.tags.filter(tag => tag !== tagToRemove) || []
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <FileIcon className="w-8 h-8 text-blue-500" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    } else {
      return <FileText className="w-8 h-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Upload className="w-6 h-6 text-blue-600" />
            Upload Documents
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={uploading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Drop files here or click to upload</h3>
            <p className="text-gray-500 mb-4">Support for PDF, Word, Excel, images and more. Max 10MB per file.</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              disabled={uploading}
            >
              Choose Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif"
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Selected Files ({files.length})</h3>
              <div className="space-y-4">
                {files.map((fileData) => (
                  <div key={fileData.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      {/* File Icon and Info */}
                      <div className="flex-shrink-0">
                        {getFileIcon(fileData.file)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {fileData.file.name}
                          </h4>
                          <div className="flex items-center gap-2">
                            {fileData.uploadStatus === 'success' && (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            )}
                            {fileData.uploadStatus === 'error' && (
                              <AlertCircle className="w-5 h-5 text-red-500" />
                            )}
                            <button
                              onClick={() => removeFile(fileData.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              disabled={uploading}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-500 mb-3">
                          {formatFileSize(fileData.file.size)} • {fileData.file.type}
                        </p>

                        {/* Upload Progress */}
                        {fileData.uploadStatus === 'uploading' && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600">Uploading...</span>
                              <span className="text-xs text-gray-600">{fileData.uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${fileData.uploadProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* Error Message */}
                        {fileData.uploadStatus === 'error' && fileData.error && (
                          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                            {fileData.error}
                          </div>
                        )}

                        {/* File Metadata Form */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Document Type
                            </label>
                            <select
                              value={fileData.documentType}
                              onChange={(e) => updateFileMetadata(fileData.id, { documentType: e.target.value })}
                              className="w-full text-sm border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              disabled={uploading}
                            >
                              {DOCUMENT_TYPES.map(type => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Category
                            </label>
                            <select
                              value={fileData.category}
                              onChange={(e) => updateFileMetadata(fileData.id, { category: e.target.value })}
                              className="w-full text-sm border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              disabled={uploading}
                            >
                              {CATEGORIES.map(category => (
                                <option key={category.value} value={category.value}>
                                  {category.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <textarea
                              value={fileData.description}
                              onChange={(e) => updateFileMetadata(fileData.id, { description: e.target.value })}
                              placeholder="Optional description for this document..."
                              className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              rows={2}
                              disabled={uploading}
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Tags
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {fileData.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                >
                                  <Tag className="w-3 h-3" />
                                  {tag}
                                  <button
                                    onClick={() => removeTag(fileData.id, tag)}
                                    className="text-blue-600 hover:text-blue-800"
                                    disabled={uploading}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <input
                              type="text"
                              placeholder="Add tags (press Enter)"
                              className="w-full text-sm border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addTag(fileData.id, e.currentTarget.value);
                                  e.currentTarget.value = '';
                                }
                              }}
                              disabled={uploading}
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                              <input
                                type="checkbox"
                                checked={fileData.isPublic}
                                onChange={(e) => updateFileMetadata(fileData.id, { isPublic: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                disabled={uploading}
                              />
                              Make this document public
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload {files.length} File{files.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};