"use client";

import { useState, useMemo, useRef } from "react";

interface CategoryComboBoxProps {
  value: string;
  onChange: (value: string) => void;
  categories: string[];
  className?: string;
  placeholder?: string;
  required?: boolean;
}

export function CategoryComboBox({
  value,
  onChange,
  categories,
  className,
  placeholder = "Category",
  required,
}: CategoryComboBoxProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!value) return categories;
    const q = value.toLowerCase();
    return categories.filter((c) => c.toLowerCase().includes(q));
  }, [categories, value]);

  function handleSelect(cat: string) {
    onChange(cat);
    setOpen(false);
  }

  function handleBlur(e: React.FocusEvent) {
    if (wrapperRef.current?.contains(e.relatedTarget as Node)) return;
    setOpen(false);
  }

  const inputClass = className ?? "h-8 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div ref={wrapperRef} className="relative" onBlur={handleBlur}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        required={required}
        className={inputClass}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
          {filtered.map((cat) => (
            <li key={cat}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(cat)}
                className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-muted"
              >
                {cat}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
