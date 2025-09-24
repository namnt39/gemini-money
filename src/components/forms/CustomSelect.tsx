"use client";

import { Listbox, Transition } from '@headlessui/react';
import { Fragment, useState, useMemo, useEffect, useRef } from 'react';
import { createTranslator } from '@/lib/i18n';
import RemoteImage from '@/components/RemoteImage';

export type Option = { id: string; name: string; imageUrl?: string; type?: string; };
type CustomSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  required?: boolean;
  defaultTab?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
};

const SelectorIcon = () => <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const SearchIcon = () => <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>;

const ADD_NEW_VALUE = "__add_new__";

export default function CustomSelect({ label, value, onChange, options, required = false, defaultTab, onAddNew, addNewLabel }: CustomSelectProps) {
  const t = createTranslator();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const appliedDefaultRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const hasAddNew = typeof onAddNew === 'function';

  const accountTypes = useMemo(() => {
    const types = new Set<string>();
    options.forEach(opt => { if (opt.type) { types.add(opt.type); } });
    return ['All', ...Array.from(types)];
  }, [options]);

  useEffect(() => {
    appliedDefaultRef.current = false;
  }, [defaultTab]);

  useEffect(() => {
    if (!defaultTab || appliedDefaultRef.current) return;
    if (accountTypes.includes(defaultTab)) {
      setActiveTab(defaultTab);
      appliedDefaultRef.current = true;
    }
  }, [defaultTab, accountTypes]);

  useEffect(() => {
    if (accountTypes.includes(activeTab)) return;
    setActiveTab('All');
  }, [accountTypes, activeTab]);

  const filteredOptions = useMemo(() => {
    let filtered = options;
    if (activeTab !== 'All') { filtered = filtered.filter(opt => opt.type === activeTab); }
    if (query !== '') { filtered = filtered.filter(opt => opt.name.toLowerCase().includes(query.toLowerCase())); }
    return filtered;
  }, [query, options, activeTab]);

  const selectedOption = options.find(opt => opt.id === value);

  const handleSelect = (selectedValue: string) => {
    if (hasAddNew && selectedValue === ADD_NEW_VALUE) {
      onAddNew?.();
      return;
    }
    onChange(selectedValue);
  };

  return (
    <div className="space-y-1">
      <Listbox value={value} onChange={handleSelect}>
        <Listbox.Label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-1 text-red-500">{t("common.requiredIndicator")}</span>}
        </Listbox.Label>
        <div className="relative mt-1">
          <Listbox.Button
            className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-3 pl-3 pr-10 text-left text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            onClick={() => {
              setTimeout(() => {
                searchInputRef.current?.focus();
              }, 0);
            }}
          >
            <span className="flex items-center">
              {selectedOption?.imageUrl && (
                <RemoteImage
                  src={selectedOption.imageUrl}
                  alt={selectedOption.name}
                  width={24}
                  height={24}
                  className="flex-shrink-0 h-6 w-6"
                />
              )}
              <span className={`ml-3 block truncate ${!selectedOption ? 'text-gray-500' : ''}`}>{selectedOption ? selectedOption.name : `Select ${label.toLowerCase()}`}</span>
            </span>
            <span className="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none"><SelectorIcon /></span>
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Listbox.Options as="div" className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white text-sm shadow-lg">
              <div className="sticky top-0 z-10 space-y-2 border-b border-gray-200 bg-white p-2">
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <SearchIcon />
                  </span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={t("common.searchPlaceholder")}
                    className="w-full rounded-md border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>

                {accountTypes.length > 2 && (
                  <div className="flex flex-wrap gap-1">
                    {accountTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTab(type);
                        }}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                          activeTab === type
                            ? 'bg-indigo-600 text-white shadow'
                            : 'border border-gray-300 bg-white text-gray-600 hover:border-indigo-200 hover:text-indigo-600'
                        }`}
                      >
                        {type === 'All' ? t("transactions.tabs.all") : type}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="max-h-56 overflow-y-auto">
                {filteredOptions.map((option) => (
                  <Listbox.Option
                    key={option.id}
                    value={option.id}
                    className={({ active }) =>
                      `cursor-pointer select-none px-3 py-2 ${
                        active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      {option.imageUrl && (
                        <RemoteImage
                          src={option.imageUrl}
                          alt={option.name}
                          width={24}
                          height={24}
                          className="h-6 w-6 flex-shrink-0"
                        />
                      )}
                      <span className="block truncate font-normal">{option.name}</span>
                    </div>
                  </Listbox.Option>
                ))}
              </div>

              {hasAddNew && (
                <div className="sticky bottom-0 border-t border-gray-200 bg-white">
                  <Listbox.Option
                    value={ADD_NEW_VALUE}
                    className={({ active }) =>
                      `cursor-pointer select-none px-3 py-2 ${
                        active ? 'bg-indigo-50 text-indigo-700' : 'text-indigo-600'
                      }`
                    }
                  >
                    + {addNewLabel ?? `${t("common.addNew")}...`}
                  </Listbox.Option>
                </div>
              )}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}