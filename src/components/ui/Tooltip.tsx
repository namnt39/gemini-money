"use client";

import React from 'react';

type TooltipProps = {
  text: string;
  children: React.ReactNode;
};

export default function Tooltip({ text, children }: TooltipProps) {
  return (
    <div className="relative flex items-center group">
      {children}
      <div className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {text}
      </div>
    </div>
  );
}