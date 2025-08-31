import React, { useState } from 'react';
import { X, Filter, Calendar, Tag, Search } from 'lucide-react';

interface DocumentFiltersProps {
  filters: any;
  onFilterChange: (filters: any) => void;
  onClose: () => void;
}

const DOCUMENT_TYPES = [
  { value: '', label: 'All Types' },
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
  { value: '', label: 'All Categories' },
  { value: 'legal', label: 'Legal' },
  { value: 'financial', label: 'Financial' },
  { value: 'operational', label: 'Operational' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'technical', label: 'Technical' },
  { value: 'personal', label: 'Personal' }
];

const PROCESSING_STATUS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' }
];

const OCR_STATUS = [
  { value: '', label: 'All OCR Status' },
  { value: 'not_required', label: 'Not Required' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' }
];

export const DocumentFilters: React.FC<DocumentFiltersProps> = ({
  filters,
  onFilterChange,
  onClose
}) => {
  const [localFilters, setLocalFilters] = useState({
    documentType: filters.documentType || '',
    category: filters.category || '',
    processingStatus: filters.processingStatus || '',
    ocrStatus: filters.ocrStatus || '',
    uploadedAfter: filters.uploadedAfter || '',
    uploadedBefore: filters.uploadedBefore || '',
    hasExtractedText: filters.hasExtractedText,
    isPublic: filters.isPublic,
    tags: filters.tags?.join(', ') || ''
  });

  const handleInputChange = (field: string, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyFilters = () => {
    const filtersToApply: any = {};
    
    // Only include non-empty filters
    Object.entries(localFilters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        if (key === 'tags' && value) {
          filtersToApply[key] = (value as string).split(',').map(tag => tag.trim()).filter(tag => tag);
        } else {
          filtersToApply[key] = value;
        }
      }
    });

    onFilterChange(filtersToApply);
    onClose();
  };

  const clearFilters = () => {
    setLocalFilters({
      documentType: '',
      category: '',
      processingStatus: '',
      ocrStatus: '',
      uploadedAfter: '',
      uploadedBefore: '',
      hasExtractedText: undefined,
      isPublic: undefined,
      tags: ''
    });
    onFilterChange({});
    onClose();
  };

  const hasActiveFilters = Object.values(localFilters).some(value => 
    value !== '' && value !== null && value !== undefined
  );

  return (
    <div className=\"bg-gray-50 border border-gray-200 rounded-lg p-6 mt-4\">
      <div className=\"flex items-center justify-between mb-6\">
        <h3 className=\"text-lg font-medium text-gray-900 flex items-center gap-2\">
          <Filter className=\"w-5 h-5 text-blue-600\" />
          Filter Documents
        </h3>
        <button
          onClick={onClose}
          className=\"text-gray-400 hover:text-gray-600 transition-colors\"
        >
          <X className=\"w-5 h-5\" />
        </button>
      </div>

      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6\">
        {/* Document Type */}
        <div>
          <label className=\"block text-sm font-medium text-gray-700 mb-2\">
            Document Type
          </label>
          <select
            value={localFilters.documentType}
            onChange={(e) => handleInputChange('documentType', e.target.value)}
            className=\"w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent\"
          >
            {DOCUMENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <label className=\"block text-sm font-medium text-gray-700 mb-2\">
            Category
          </label>
          <select
            value={localFilters.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className=\"w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent\"
          >
            {CATEGORIES.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        {/* Processing Status */}
        <div>
          <label className=\"block text-sm font-medium text-gray-700 mb-2\">
            Processing Status
          </label>
          <select
            value={localFilters.processingStatus}
            onChange={(e) => handleInputChange('processingStatus', e.target.value)}
            className=\"w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent\"
          >
            {PROCESSING_STATUS.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* OCR Status */}
        <div>
          <label className=\"block text-sm font-medium text-gray-700 mb-2\">
            OCR Status
          </label>
          <select
            value={localFilters.ocrStatus}
            onChange={(e) => handleInputChange('ocrStatus', e.target.value)}
            className=\"w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent\"
          >
            {OCR_STATUS.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Upload Date Range */}
        <div>
          <label className=\"block text-sm font-medium text-gray-700 mb-2\">
            Uploaded After
          </label>
          <div className=\"relative\">
            <Calendar className=\"w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400\" />
            <input
              type=\"date\"
              value={localFilters.uploadedAfter}
              onChange={(e) => handleInputChange('uploadedAfter', e.target.value)}
              className=\"w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent\"
            />
          </div>
        </div>

        <div>
          <label className=\"block text-sm font-medium text-gray-700 mb-2\">
            Uploaded Before
          </label>
          <div className=\"relative\">
            <Calendar className=\"w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400\" />
            <input
              type=\"date\"
              value={localFilters.uploadedBefore}
              onChange={(e) => handleInputChange('uploadedBefore', e.target.value)}
              className=\"w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent\"
            />
          </div>
        </div>

        {/* Tags */}
        <div className=\"md:col-span-2 lg:col-span-3\">
          <label className=\"block text-sm font-medium text-gray-700 mb-2\">
            Tags (comma-separated)
          </label>
          <div className=\"relative\">
            <Tag className=\"w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400\" />
            <input
              type=\"text\"
              value={localFilters.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              placeholder=\"Enter tags separated by commas...\"
              className=\"w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent\"
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className=\"md:col-span-2 lg:col-span-3\">
          <div className=\"space-y-3\">
            <label className=\"flex items-center gap-3\">
              <input
                type=\"checkbox\"
                checked={localFilters.hasExtractedText === true}
                onChange={(e) => handleInputChange('hasExtractedText', e.target.checked ? true : undefined)}
                className=\"rounded border-gray-300 text-blue-600 focus:ring-blue-500\"
              />
              <span className=\"text-sm text-gray-700\">Has extracted text (OCR completed)</span>
            </label>

            <label className=\"flex items-center gap-3\">
              <input
                type=\"checkbox\"
                checked={localFilters.isPublic === true}
                onChange={(e) => handleInputChange('isPublic', e.target.checked ? true : undefined)}
                className=\"rounded border-gray-300 text-blue-600 focus:ring-blue-500\"
              />
              <span className=\"text-sm text-gray-700\">Public documents only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className=\"flex items-center justify-between pt-6 border-t border-gray-200 mt-6\">
        <div className=\"text-sm text-gray-500\">
          {hasActiveFilters ? 'Filters applied' : 'No filters applied'}
        </div>
        <div className=\"flex items-center gap-3\">
          <button
            onClick={clearFilters}
            className=\"px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors\"
          >
            Clear All
          </button>
          <button
            onClick={applyFilters}
            className=\"flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors\"
          >
            <Search className=\"w-4 h-4\" />
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};