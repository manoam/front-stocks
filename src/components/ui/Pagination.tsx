import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Generate page numbers to display
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const buttonBaseClass =
    'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors';
  const buttonInactiveClass =
    'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800';
  const buttonActiveClass =
    'bg-primary-600 text-white hover:bg-primary-700';

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {totalItems !== undefined ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Page {currentPage} sur {totalPages} ({totalItems} résultats)
        </p>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Page {currentPage} sur {totalPages}
        </p>
      )}

      <div className="flex items-center gap-1">
        {/* First page - hidden on first page */}
        {currentPage > 1 && (
          <button
            onClick={() => onPageChange(1)}
            className={`${buttonBaseClass} ${buttonInactiveClass}`}
            title="Première page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}

        {/* Previous page - hidden on first page */}
        {currentPage > 1 && (
          <button
            onClick={() => onPageChange(currentPage - 1)}
            className={`${buttonBaseClass} ${buttonInactiveClass}`}
            title="Page précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Page numbers */}
        {pageNumbers.map((pageNum, index) =>
          pageNum === '...' ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-8 w-8 items-center justify-center text-gray-400"
            >
              ...
            </span>
          ) : (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum as number)}
              className={`${buttonBaseClass} ${pageNum === currentPage ? buttonActiveClass : buttonInactiveClass}`}
            >
              {pageNum}
            </button>
          )
        )}

        {/* Next page - hidden on last page */}
        {currentPage < totalPages && (
          <button
            onClick={() => onPageChange(currentPage + 1)}
            className={`${buttonBaseClass} ${buttonInactiveClass}`}
            title="Page suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Last page - hidden on last page */}
        {currentPage < totalPages && (
          <button
            onClick={() => onPageChange(totalPages)}
            className={`${buttonBaseClass} ${buttonInactiveClass}`}
            title="Dernière page"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
