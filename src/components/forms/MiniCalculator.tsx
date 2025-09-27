"use client";

import { useEffect, useMemo, useState } from "react";
import { Transition } from "@headlessui/react";

type MiniCalculatorProps = {
  initialValue: string;
  onApply: (value: string) => void;
  onClose: () => void;
};

type Op = "+" | "-" | "*" | "/" | null;

const fmt = (v: string | number) => {
  const s = String(v);
  if (s === "" || s === "-") return s || "0";
  const [intPart, decPart] = s.split(".");
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${withSep}.${decPart}` : withSep;
};

const toNum = (s: string) => {
  const n = parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const calc = (a: number, op: Exclude<Op, null>, b: number) => {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b !== 0 ? a / b : 0;
  }
};

const KeyBtn = ({
  onClick,
  children,
  className = "",
  ariaLabel,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    className={`flex-1 p-3 text-lg font-semibold rounded-lg transition-colors select-none active:scale-[.98] ${className}`}
  >
    {children}
  </button>
);

export default function MiniCalculator({
  initialValue,
  onApply,
  onClose,
}: MiniCalculatorProps) {
  // ---------- Core state ----------
  const [display, setDisplay] = useState<string>(
    initialValue?.replace(/,/g, "") || "0"
  );
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op>(null);
  const [waiting, setWaiting] = useState<boolean>(false);
  const [history, setHistory] = useState<string>("");

  // keep last pressed operator highlighted
  const activeOp = op;

  // Avoid re-creating handlers on every render where possible
  const appendDigit = (d: string) => {
    setDisplay((prev) => {
      if (waiting) {
        setWaiting(false);
        return d;
      }
      if (prev === "0") return d;
      // prevent leading zeros like 0002
      if (/^0(?!\.)/.test(prev)) return d;
      return prev + d;
    });
  };

  const appendDot = () => {
    setDisplay((prev) => {
      if (waiting) {
        setWaiting(false);
        return "0.";
      }
      if (prev.includes(".")) return prev;
      return prev + ".";
    });
  };

  const applyOperator = (nextOp: Exclude<Op, null>) => {
    const cur = toNum(display);
    if (acc === null) {
      setAcc(cur);
      setHistory(`${fmt(display)} ${nextOp}`);
    } else if (op) {
      const result = calc(acc, op, cur);
      setAcc(result);
      setDisplay(String(result));
      setHistory(`${fmt(result)} ${nextOp}`);
    }
    setOp(nextOp);
    setWaiting(true);
  };

  const doEquals = () => {
    if (op === null || acc === null) return;
    const cur = toNum(display);
    const result = calc(acc, op, cur);
    setDisplay(String(result));
    setAcc(null);
    setOp(null);
    setWaiting(true);
    setHistory("");
  };

  const clearAll = () => {
    setDisplay("0");
    setAcc(null);
    setOp(null);
    setWaiting(false);
    setHistory("");
  };

  const clearEntry = () => {
    setDisplay("0");
    setWaiting(false);
  };

  const backspace = () => {
    setDisplay((prev) => {
      if (waiting) return prev; // ignore while waiting for new operand
      if (prev.length <= 1 || (prev.length === 2 && prev.startsWith("-")))
        return "0";
      // keep trailing dot safe: "12." -> "12"
      const next = prev.slice(0, -1);
      return next.endsWith(".") ? next.slice(0, -1) : next;
    });
  };

  const negate = () => {
    setDisplay((prev) => {
      if (prev === "0" || prev === "0.") return prev; // -0 feels odd
      return prev.startsWith("-") ? prev.slice(1) : "-" + prev;
    });
  };

  const percent = () => {
    // common calculator behavior: convert current display to percentage of 1
    setDisplay((prev) => String(toNum(prev) / 100));
  };

  // ---------- Keyboard handling ----------
  const keydownHandler = useMemo(
    () => (e: KeyboardEvent) => {
      const k = e.key;
      if (/^[0-9]$/.test(k)) {
        e.preventDefault();
        appendDigit(k);
        return;
      }
      if (k === "." || k === ",") {
        e.preventDefault();
        appendDot();
        return;
      }
      if (k === "+" || k === "-" || k === "*" || k === "/") {
        e.preventDefault();
        applyOperator(k as Exclude<Op, null>);
        return;
      }
      if (k === "Enter" || k === "=") {
        e.preventDefault();
        doEquals();
        return;
      }
      if (k === "Backspace") {
        e.preventDefault();
        backspace();
        return;
      }
      if (k === "Escape") {
        e.preventDefault();
        clearAll();
        return;
      }
      if (k === "Delete") {
        e.preventDefault();
        clearEntry();
        return;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [acc, op, waiting, display]
  );

  useEffect(() => {
    window.addEventListener("keydown", keydownHandler);
    return () => window.removeEventListener("keydown", keydownHandler);
  }, [keydownHandler]);

  // ---------- Safe formatted display ----------
  const formattedDisplay = fmt(display);

  // ---------- Render ----------
  return (
    <Transition
      as="div"
      show={true}
      enter="transition ease-out duration-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
      className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-2xl"
    >
      {/* Display */}
      <div className="mb-2 rounded-md bg-gray-100 p-2">
        <div className="h-4 truncate text-xs text-gray-500">{history}</div>
        <div className="truncate text-2xl font-mono text-right">
          {formattedDisplay || "0"}
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-4 gap-2">
        <KeyBtn
          onClick={clearAll}
          className="col-span-2 bg-red-100 text-red-700"
          ariaLabel="Clear All"
        >
          AC
        </KeyBtn>
        <KeyBtn
          onClick={clearEntry}
          className="bg-red-50 text-red-700"
          ariaLabel="Clear Entry"
        >
          CE
        </KeyBtn>
        <KeyBtn
          onClick={backspace}
          className="bg-gray-200"
          ariaLabel="Backspace"
        >
          ⌫
        </KeyBtn>

        <KeyBtn
          onClick={() => applyOperator("/")}
          className={`bg-gray-200 ${activeOp === "/" ? "!bg-indigo-400 text-white" : ""}`}
          ariaLabel="Divide"
        >
          /
        </KeyBtn>
        <KeyBtn onClick={() => appendDigit("7")} className="bg-gray-50 hover:bg-gray-100">
          7
        </KeyBtn>
        <KeyBtn onClick={() => appendDigit("8")} className="bg-gray-50 hover:bg-gray-100">
          8
        </KeyBtn>
        <KeyBtn onClick={() => appendDigit("9")} className="bg-gray-50 hover:bg-gray-100">
          9
        </KeyBtn>

        <KeyBtn
          onClick={() => applyOperator("*")}
          className={`bg-gray-200 ${activeOp === "*" ? "!bg-indigo-400 text-white" : ""}`}
          ariaLabel="Multiply"
        >
          ×
        </KeyBtn>
        <KeyBtn onClick={() => appendDigit("4")} className="bg-gray-50 hover:bg-gray-100">
          4
        </KeyBtn>
        <KeyBtn onClick={() => appendDigit("5")} className="bg-gray-50 hover:bg-gray-100">
          5
        </KeyBtn>
        <KeyBtn onClick={() => appendDigit("6")} className="bg-gray-50 hover:bg-gray-100">
          6
        </KeyBtn>

        <KeyBtn
          onClick={() => applyOperator("-")}
          className={`bg-gray-200 ${activeOp === "-" ? "!bg-indigo-400 text-white" : ""}`}
          ariaLabel="Subtract"
        >
          −
        </KeyBtn>
        <KeyBtn onClick={() => appendDigit("1")} className="bg-gray-50 hover:bg-gray-100">
          1
        </KeyBtn>
        <KeyBtn onClick={() => appendDigit("2")} className="bg-gray-50 hover:bg-gray-100">
          2
        </KeyBtn>
        <KeyBtn onClick={() => appendDigit("3")} className="bg-gray-50 hover:bg-gray-100">
          3
        </KeyBtn>

        <KeyBtn
          onClick={() => applyOperator("+")}
          className={`bg-gray-200 ${activeOp === "+" ? "!bg-indigo-400 text-white" : ""}`}
          ariaLabel="Add"
        >
          +
        </KeyBtn>
        <KeyBtn onClick={() => negate()} className="bg-gray-50 hover:bg-gray-100">
          ±
        </KeyBtn>
        <KeyBtn onClick={() => appendDigit("0")} className="bg-gray-50 hover:bg-gray-100">
          0
        </KeyBtn>
        <KeyBtn onClick={appendDot} className="bg-gray-50 hover:bg-gray-100">
          .
        </KeyBtn>

        <KeyBtn onClick={percent} className="bg-gray-200">
          %
        </KeyBtn>
        <KeyBtn
          onClick={doEquals}
          className="col-span-3 bg-indigo-500 text-white"
          ariaLabel="Equals"
        >
          =
        </KeyBtn>
      </div>

      <button
        type="button"
        onClick={() => {
          onApply(fmt(display));
          onClose();
        }}
        className="mt-3 w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
      >
        Add to Amount
      </button>
    </Transition>
  );
}
