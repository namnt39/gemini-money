"use client";

import { cloneElement, type ReactElement, useId } from "react";

type TooltipPosition = "top" | "bottom" | "left" | "right";

type TooltipProps = {
  label: string;
  children: ReactElement;
  position?: TooltipPosition;
};

const POSITION_CLASSES: Record<TooltipPosition, string> = {
  top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
  bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
  left: "right-full mr-2 top-1/2 -translate-y-1/2",
  right: "left-full ml-2 top-1/2 -translate-y-1/2",
};

export default function Tooltip({ label, children, position = "top" }: TooltipProps) {
  const tooltipId = useId();
  const child = cloneElement(
    children,
    {
      "aria-describedby": tooltipId,
    } as Partial<typeof children.props> & { "aria-describedby": string }
  );

  return (
    <span className="group relative inline-flex">
      {child}
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute z-20 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${POSITION_CLASSES[position]}`}
      >
        {label}
      </span>
    </span>
  );
}
