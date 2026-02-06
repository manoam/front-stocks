import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Loader2 } from 'lucide-react';
import api from '../../services/api';
import type { Supplier, PaginatedResponse } from '../../types';

interface SupplierSearchProps {
  onChange: (supplierId: string, supplier: Supplier | null) => void;
  error?: string;
  label?: string;
  disabled?: boolean;
  initialSupplier?: Supplier | null;
  excludeIds?: string[];
}

export default function SupplierSearch({
  onChange,
  error,
  label = 'Fournisseur *',
  disabled = false,
  initialSupplier = null,
  excludeIds = [],
}: SupplierSearchProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(initialSupplier);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch suppliers based on search
  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers-search', search],
    queryFn: async () => {
      if (!search || search.length < 1) return [];
      const res = await api.get<PaginatedResponse<Supplier>>(`/suppliers?search=${encodeURIComponent(search)}&limit=15`);
      return res.data?.data;
    },
    enabled: search.length >= 1,
  });

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isOutsideWrapper = wrapperRef.current && !wrapperRef.current.contains(target);
      const isOutsideDropdown = !dropdownRef.current || !dropdownRef.current.contains(target);

      if (isOutsideWrapper && isOutsideDropdown) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen && inputContainerRef.current) {
      const rect = inputContainerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen, search]);

  // Set initial supplier if provided
  useEffect(() => {
    setSelectedSupplier(initialSupplier);
    setSearch('');
  }, [initialSupplier]);

  const handleSelect = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    onChange(supplier.id, supplier);
    setSearch('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedSupplier(null);
    onChange('', null);
    setSearch('');
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setIsOpen(true);
    if (selectedSupplier) {
      setSelectedSupplier(null);
      onChange('', null);
    }
  };

  const handleInputFocus = () => {
    if (search.length >= 1) {
      setIsOpen(true);
    }
  };

  return (
    <div className="space-y-1" ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div className="relative" ref={inputContainerRef}>
        {selectedSupplier ? (
          // Selected supplier display
          <div
            className={`flex items-center justify-between rounded-lg border bg-white px-3 py-2 dark:bg-gray-800 ${
              error
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            title={`${selectedSupplier.name}${selectedSupplier.contact ? ` - ${selectedSupplier.contact}` : ''}`}
          >
            <div className="flex-1 min-w-0 truncate">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {selectedSupplier.name}
              </span>
              {selectedSupplier.contact && (
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  - {selectedSupplier.contact}
                </span>
              )}
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="ml-2 flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          // Search input
          <>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder="Rechercher un fournisseur..."
              disabled={disabled}
              className={`block w-full rounded-lg border bg-white pl-10 pr-10 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 ${
                error
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:focus:border-primary-500'
              } ${disabled ? 'bg-gray-50 dark:bg-gray-700 cursor-not-allowed' : ''}`}
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
            )}
          </>
        )}

        {/* Dropdown - rendered via portal to escape overflow:hidden parents */}
        {isOpen && !selectedSupplier && createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
            }}
          >
            {search.length < 1 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                Tapez pour rechercher un fournisseur...
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center px-4 py-3">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Recherche...</span>
              </div>
            ) : suppliers && suppliers.length > 0 ? (
              (() => {
                const filteredSuppliers = suppliers.filter(s => !excludeIds.includes(s.id));
                return filteredSuppliers.length > 0 ? (
                  <ul className="max-h-60 overflow-auto py-1">
                    {filteredSuppliers.map((supplier) => (
                      <li key={supplier.id}>
                        <button
                          type="button"
                          onClick={() => handleSelect(supplier)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {supplier.name}
                          </span>
                          {supplier.contact && (
                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                              - {supplier.contact}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                    {suppliers.length === 15 && (
                      <li className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
                        Affinez votre recherche pour plus de résultats
                      </li>
                    )}
                  </ul>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    Aucun fournisseur disponible pour "{search}"
                  </div>
                );
              })()
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                Aucun fournisseur trouvé pour "{search}"
              </div>
            )}
          </div>,
          document.body
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
