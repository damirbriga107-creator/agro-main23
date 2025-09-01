import React, { createContext, useContext, useState, useMemo } from 'react';
import { clsx } from '../../lib/design-system';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

// Types
export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface DataTableContextValue {
  sortConfig: SortConfig | null;
  setSortConfig: (config: SortConfig | null) => void;
  onRowClick?: (data: any) => void;
}

// Context
const DataTableContext = createContext<DataTableContextValue | null>(null);

const useDataTable = () => {
  const context = useContext(DataTableContext);
  if (!context) {
    throw new Error('DataTable components must be used within DataTable.Root');
  }
  return context;
};

// Root Component
interface DataTableRootProps {
  children: React.ReactNode;
  onRowClick?: (data: any) => void;
  className?: string;
}

const DataTableRoot: React.FC<DataTableRootProps> = ({ 
  children, 
  onRowClick, 
  className 
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const contextValue = useMemo(
    () => ({
      sortConfig,
      setSortConfig,
      onRowClick,
    }),
    [sortConfig, setSortConfig, onRowClick]
  );

  return (
    <DataTableContext.Provider value={contextValue}>
      <div className={clsx('overflow-hidden border border-neutral-200 rounded-2xl shadow-sm bg-white', className)}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            {children}
          </table>
        </div>
      </div>
    </DataTableContext.Provider>
  );
};

// Header Component
interface DataTableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

const DataTableHeader: React.FC<DataTableHeaderProps> = ({ children, className }) => (
  <thead className={clsx('bg-gradient-to-r from-neutral-50 to-neutral-100', className)}>
    <tr>{children}</tr>
  </thead>
);

// Header Cell Component
interface DataTableHeaderCellProps {
  children: React.ReactNode;
  sortKey?: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

const DataTableHeaderCell: React.FC<DataTableHeaderCellProps> = ({
  children,
  sortKey,
  className,
  align = 'left',
  width,
}) => {
  const { sortConfig, setSortConfig } = useDataTable();

  const handleSort = () => {
    if (!sortKey) return;

    const newDirection = 
      sortConfig?.key === sortKey && sortConfig.direction === 'asc' 
        ? 'desc' 
        : 'asc';

    setSortConfig({ key: sortKey, direction: newDirection });
  };

  const isSortable = Boolean(sortKey);
  const isSorted = sortConfig?.key === sortKey;
  const sortDirection = isSorted ? sortConfig?.direction : null;

  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <th
      className={clsx(
        'px-6 py-4 text-xs font-semibold text-neutral-700 uppercase tracking-wider',
        alignmentClasses[align],
        isSortable && 'cursor-pointer hover:bg-neutral-200/50 transition-colors select-none',
        className
      )}
      style={{ width }}
      onClick={isSortable ? handleSort : undefined}
      role={isSortable ? 'button' : undefined}
      tabIndex={isSortable ? 0 : undefined}
      aria-label={isSortable ? `Sort by ${children}` : undefined}
      aria-sort={
        isSorted 
          ? sortDirection === 'asc' 
            ? 'ascending' 
            : 'descending' 
          : 'none'
      }
      onKeyDown={(e) => {
        if (isSortable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleSort();
        }
      }}
    >
      <div className="flex items-center justify-between">
        <span>{children}</span>
        {isSortable && (
          <span className="ml-2 flex flex-col">
            <ChevronUpIcon 
              className={clsx(
                'h-3 w-3 transition-colors',
                isSorted && sortDirection === 'asc'
                  ? 'text-primary-600' 
                  : 'text-neutral-400'
              )} 
            />
            <ChevronDownIcon 
              className={clsx(
                'h-3 w-3 -mt-0.5 transition-colors',
                isSorted && sortDirection === 'desc'
                  ? 'text-primary-600' 
                  : 'text-neutral-400'
              )} 
            />
          </span>
        )}
      </div>
    </th>
  );
};

// Body Component
interface DataTableBodyProps {
  children: React.ReactNode;
  className?: string;
}

const DataTableBody: React.FC<DataTableBodyProps> = ({ children, className }) => (
  <tbody className={clsx('bg-white divide-y divide-neutral-200', className)}>
    {children}
  </tbody>
);

// Row Component
interface DataTableRowProps {
  children: React.ReactNode;
  data?: any;
  className?: string;
  selected?: boolean;
  disabled?: boolean;
}

const DataTableRow: React.FC<DataTableRowProps> = ({
  children,
  data,
  className,
  selected = false,
  disabled = false,
}) => {
  const { onRowClick } = useDataTable();

  const handleClick = () => {
    if (onRowClick && !disabled) {
      onRowClick(data);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onRowClick && !disabled) {
      e.preventDefault();
      onRowClick(data);
    }
  };

  return (
    <tr
      className={clsx(
        'transition-colors duration-200',
        onRowClick && !disabled && 'cursor-pointer hover:bg-primary-50 focus:bg-primary-50 focus:outline-none',
        selected && 'bg-primary-100 hover:bg-primary-100',
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onRowClick && !disabled ? 0 : undefined}
      role={onRowClick && !disabled ? 'button' : undefined}
    >
      {children}
    </tr>
  );
};

// Cell Component
interface DataTableCellProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

const DataTableCell: React.FC<DataTableCellProps> = ({ 
  children, 
  className, 
  align = 'left' 
}) => {
  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <td className={clsx(
      'px-6 py-4 text-sm text-neutral-900',
      alignmentClasses[align],
      className
    )}>
      {children}
    </td>
  );
};

// Empty State Component
interface DataTableEmptyProps {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}

const DataTableEmpty: React.FC<DataTableEmptyProps> = ({
  title = 'No data available',
  description = 'There are no records to display at this time.',
  icon: Icon,
  action,
}) => (
  <tr>
    <td colSpan={100} className="px-6 py-16">
      <div className="flex flex-col items-center justify-center text-center">
        {Icon && (
          <Icon className="h-12 w-12 text-neutral-400 mb-4" />
        )}
        <h3 className="text-lg font-medium text-neutral-900 mb-2">
          {title}
        </h3>
        <p className="text-sm text-neutral-500 mb-6 max-w-md">
          {description}
        </p>
        {action}
      </div>
    </td>
  </tr>
);

// Loading Component
const DataTableLoading: React.FC = () => (
  <tr>
    <td colSpan={100} className="px-6 py-16">
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-sm text-neutral-600">Loading...</span>
      </div>
    </td>
  </tr>
);

// Pagination Component
interface DataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  totalItems: number;
}

const DataTablePagination: React.FC<DataTablePaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
}) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="bg-white px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="relative inline-flex items-center px-4 py-2 border border-neutral-300 text-sm font-medium rounded-md text-neutral-700 bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="ml-3 relative inline-flex items-center px-4 py-2 border border-neutral-300 text-sm font-medium rounded-md text-neutral-700 bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-neutral-700">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-neutral-300 bg-white text-sm font-medium text-neutral-500 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={clsx(
                  'relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors',
                  page === currentPage
                    ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                    : 'bg-white border-neutral-300 text-neutral-500 hover:bg-neutral-50'
                )}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-neutral-300 bg-white text-sm font-medium text-neutral-500 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

// Export compound component
const DataTable = {
  Root: DataTableRoot,
  Header: DataTableHeader,
  HeaderCell: DataTableHeaderCell,
  Body: DataTableBody,
  Row: DataTableRow,
  Cell: DataTableCell,
  Empty: DataTableEmpty,
  Loading: DataTableLoading,
  Pagination: DataTablePagination,
};

export default DataTable;