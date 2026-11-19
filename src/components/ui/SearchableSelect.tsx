"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

export interface SearchableOption {
  value: string;
  label: string;
}

/** Action row pinned above the options (e.g. "Add a new Project"). */
export interface SearchableHeaderAction {
  label: string;
  /** Navigate to this URL when clicked. */
  href?: string;
  /** Open href in a new tab so the current form is preserved. Defaults to true for href actions. */
  openInNewTab?: boolean;
  /** Run instead of navigation (e.g. reset the selection). */
  onSelect?: () => void;
}

interface SearchableSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  id?: string;
  autoFocus?: boolean;
  /** Pinned rows rendered first with a separator line above the real options. */
  headerActions?: SearchableHeaderAction[];
}

/**
 * Type-to-filter dropdown. The user types a few letters and the list
 * shortlists to matching options; full keyboard navigation supported.
 */
export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Type to search…",
  required = false,
  disabled = false,
  error,
  helperText,
  className = "",
  id,
  autoFocus = false,
  headerActions = [],
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = id || (label ? `search-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  const selected = options.find((o) => o.value === value) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open ]);

  const pick = (val: string) => {
    onChange(val);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered[highlight]) pick(filtered[highlight].value);
      else setOpen(true);
    } else if (e.key === "Escape") {
      setQuery("");
      setOpen(false);
    }
  };

  return (
    <div className={`w-full ${className}`} ref={rootRef}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={selected ? selected.label : placeholder}
          value={open ? query : selected?.label ?? ""}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className={`w-full rounded-xl border text-sm transition-all py-2.5 pl-9 pr-9 focus:outline-none focus:ring-2 bg-white disabled:bg-slate-50 disabled:text-slate-400 ${
            error
              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
              : "border-slate-300 text-slate-900 focus:border-[#7E8920] focus:ring-[#7E8920]/20"
          }`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && !required && !disabled && (
            <button
              type="button"
              aria-label="Clear selection"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick("")}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 pointer-events-none transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
        {open && !disabled && (
          <ul
            role="listbox"
            className="absolute z-40 mt-1.5 w-full max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
          >
            {headerActions.length > 0 && (
              <>
                {headerActions.map((action, idx) => (
                  <li key={`header-${idx}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setQuery("");
                        setOpen(false);
                        if (action.onSelect) action.onSelect();
                        else if (action.href) {
                          const newTab = action.openInNewTab ?? true;
                          if (newTab) window.open(action.href, "_blank", "noopener,noreferrer");
                          else window.location.href = action.href;
                        }
                      }}
                      className="w-full text-left px-3.5 py-2 text-sm font-bold text-[#7E8920] hover:bg-slate-100 transition-colors"
                    >
                      {action.label}
                    </button>
                  </li>
                ))}
                <li aria-hidden="true">
                  <hr className="my-1 border-slate-200" />
                </li>
              </>
            )}
            {filtered.length === 0 ? (
              <li className="px-3.5 py-2.5 text-xs text-slate-400 italic">No matches found.</li>
            ) : (
              filtered.map((opt, idx) => (
                <li key={`${opt.value}-${idx}`} role="option" aria-selected={opt.value === value}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(opt.value)}
                    onMouseEnter={() => setHighlight(idx)}
                    className={`w-full text-left px-3.5 py-2 text-sm transition-colors ${
                      idx === highlight ? "bg-slate-100 text-slate-900" : "text-slate-700"
                    } ${opt.value === value ? "font-bold" : "font-medium"}`}
                  >
                    {opt.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {error ? (
        <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}
