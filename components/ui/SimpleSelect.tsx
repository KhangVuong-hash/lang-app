'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

// Radix không cho SelectItem value = "" nên map qua sentinel nội bộ.
const EMPTY = '__empty__';

export default function SimpleSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  return (
    <Select
      value={value === '' ? EMPTY : value}
      onValueChange={(v) => onChange(v === EMPTY ? '' : v)}
      disabled={disabled}
    >
      <SelectTrigger className={className} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value || EMPTY} value={o.value === '' ? EMPTY : o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
