"use client";

import React from 'react';
// 1. StatCard sẽ tự import các icon
import { IncomeIcon, ExpenseIcon, BalanceIcon } from '@/components/Icons';

type StatCardProps = {
  title: string;
  value: string;
  // 2. Thay thế prop 'icon' bằng prop 'type'
  type: 'income' | 'expense' | 'balance';
};

export default function StatCard({ title, value, type }: StatCardProps) {
  // 3. Dùng một hàm hoặc biến để quyết định icon nào sẽ được render
  const renderIcon = () => {
    switch (type) {
      case 'income':
        return <IncomeIcon />;
      case 'expense':
        return <ExpenseIcon />;
      case 'balance':
        return <BalanceIcon />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
      <div className="bg-indigo-100 text-indigo-600 p-3 rounded-full">
        {renderIcon()}
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}