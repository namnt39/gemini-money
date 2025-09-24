"use client";

import { Listbox, Transition } from '@headlessui/react';
import Image from 'next/image';
import { Fragment, useState, useMemo, useEffect, useRef } from 'react';
import { createTranslator } from '@/lib/i18n';

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
    <div>
      <Listbox value={value} onChange={handleSelect}>
        <Listbox.Label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-1 text-red-500">{t("common.requiredIndicator")}</span>}
        </Listbox.Label>
        <div className="mt-1 relative">
          <Listbox.Button className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-3 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            <span className="flex items-center">
              {selectedOption?.imageUrl && <Image src={selectedOption.imageUrl} alt={selectedOption.name} width={24} height={24} className="flex-shrink-0 h-6 w-6" />}
              <span className={`ml-3 block truncate ${!selectedOption ? 'text-gray-500' : ''}`}>{selectedOption ? selectedOption.name : `Select ${label.toLowerCase()}`}</span>
            </span>
            <span className="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none"><SelectorIcon /></span>
          </Listbox.Button>

          <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
            <Listbox.Options className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
              <div className="p-2">
                <div className="relative"><span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></span><input type="text" placeholder={t("common.searchPlaceholder")} className="w-full bg-gray-50 rounded-md border-gray-300 pl-10 pr-4 py-2 focus:ring-indigo-500 focus:border-indigo-500" onChange={(e) => setQuery(e.target.value)} /></div>
              </div>

              {accountTypes.length > 2 && ( // Chỉ hiện tab nếu có nhiều hơn 1 loại tài khoản
                <div className="flex border-b border-gray-200 px-2">
                  {accountTypes.map(type => (
                    <button key={type} type="button" onClick={(e) => { e.stopPropagation(); setActiveTab(type); }} className={`px-3 py-1.5 text-sm font-medium border-b-2 ${activeTab === type ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>{type === 'All' ? t("transactions.tabs.all") : type}</button>
                  ))}
                </div>
              )}

              <div className="max-h-40 overflow-y-auto">
                {filteredOptions.map(option => (
                  <Listbox.Option key={option.id} className={({ active }) => `cursor-pointer select-none relative py-2 pl-3 pr-9 ${active ? 'text-white bg-indigo-600' : 'text-gray-900'}`} value={option.id}>
                    <div className="flex items-center">
                      {option.imageUrl && <Image src={option.imageUrl} alt={option.name} width={24} height={24} className="flex-shrink-0 h-6 w-6" />}
                      <span className="font-normal ml-3 block truncate">{option.name}</span>
                    </div>
                  </Listbox.Option>
                ))}
              </div>

              {hasAddNew && (
                <Listbox.Option
                  value={ADD_NEW_VALUE}
                  className={({ active }) =>
                    `cursor-pointer select-none relative py-2 pl-3 pr-9 border-t border-gray-200 mt-1 ${
                      active ? 'text-indigo-700 bg-indigo-50' : 'text-indigo-600'
                    }`
                  }
                >
                  + {addNewLabel ?? `${t("common.addNew")}...`}
                </Listbox.Option>
              )}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}