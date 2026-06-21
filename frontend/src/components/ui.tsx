import type { ElementType, MouseEvent, ReactNode } from "react";
import { IconChevronDown, IconPlus, IconX } from "@tabler/icons-react";
import {
  Button as AriaButton,
  Checkbox as AriaCheckbox,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  NumberField,
  Popover,
  Select,
  SelectValue,
  TextField
} from "react-aria-components";

type ButtonProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "subtle" | "danger";
  size?: "sm" | "md";
  onClick?: () => void;
};

export function Button({
  children,
  className = "",
  disabled = false,
  loading = false,
  type = "button",
  variant = "primary",
  size = "md",
  onClick
}: ButtonProps) {
  return (
    <AriaButton
      className={`button ${variant} ${size} ${className}`.trim()}
      isDisabled={disabled || loading}
      type={type}
      onPress={onClick}
    >
      {loading ? "Saving..." : children}
    </AriaButton>
  );
}

type IconButtonProps = {
  children: ReactNode;
  label: string;
  className?: string;
  pressed?: boolean;
  type?: "button" | "submit" | "reset";
  variant?: "secondary" | "subtle" | "danger";
  onClick?: () => void;
};

export function IconButton({
  children,
  label,
  className = "",
  pressed,
  type = "button",
  variant = "secondary",
  onClick
}: IconButtonProps) {
  return (
    <AriaButton
      aria-label={label}
      aria-pressed={pressed}
      className={`icon-button-control ${variant} ${className}`.trim()}
      type={type}
      onPress={onClick}
    >
      {children}
    </AriaButton>
  );
}

export function MobileFab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <AriaButton className="mobile-fab" aria-label={label} type="button" onPress={onClick}>
      <IconPlus aria-hidden="true" size={28} strokeWidth={2.5} />
    </AriaButton>
  );
}

export function MobileEditor({
  open,
  label,
  mobileOnly = false,
  onClose,
  children
}: {
  open: boolean;
  label: string;
  mobileOnly?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={`mobile-editor-slot${open ? " open" : ""}${mobileOnly ? " mobile-only" : ""}`}
      role={open ? "dialog" : undefined}
      aria-modal={open ? "true" : undefined}
      aria-label={open ? label : undefined}
    >
      <button className="mobile-editor-backdrop" type="button" aria-label={`Close ${label}`} onClick={onClose} />
      <div className="mobile-editor-sheet">
        <div className="mobile-editor-toolbar">
          <strong>{label}</strong>
          <IconButton label={`Close ${label}`} variant="secondary" onClick={onClose}>
            <IconX size={18} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

type TextInputProps = {
  label: string;
  value: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  onChange: (value: string) => void;
  onFocus?: () => void;
};

export function TextInput({ label, value, className = "", disabled = false, placeholder, required, onChange, onFocus }: TextInputProps) {
  return (
    <TextField
      className={`field ${className}`.trim()}
      value={value}
      isDisabled={disabled}
      isRequired={required}
      onChange={onChange}
    >
      <Label>{label}</Label>
      <Input placeholder={placeholder} onFocus={onFocus} />
    </TextField>
  );
}

type NumericInputProps = {
  label: string;
  value: number;
  className?: string;
  disabled?: boolean;
  min?: number;
  step?: number;
  required?: boolean;
  onChange: (value: number) => void;
};

export function NumericInput({ label, value, className = "", disabled = false, min, step, required, onChange }: NumericInputProps) {
  return (
    <NumberField
      className={`field ${className}`.trim()}
      value={Number.isFinite(value) ? value : 0}
      isDisabled={disabled}
      minValue={min}
      step={step}
      isRequired={required}
      onChange={(nextValue) => onChange(Number.isFinite(nextValue) ? nextValue : 0)}
    >
      <Label>{label}</Label>
      <Input />
    </NumberField>
  );
}

type Option = {
  value: string;
  label: string;
};

type SelectInputProps = {
  label?: string;
  ariaLabel?: string;
  value: string | null;
  options: Option[];
  className?: string;
  placeholder?: string;
  onChange: (value: string | null) => void;
};

export function SelectInput({ label, ariaLabel, value, options, className = "", placeholder = "Select", onChange }: SelectInputProps) {
  return (
    <Select
      aria-label={ariaLabel}
      className={`select-field ${className}`.trim()}
      selectedKey={value}
      onSelectionChange={(key) => onChange(key ? String(key) : null)}
    >
      {label ? <Label>{label}</Label> : null}
      <AriaButton className="select-trigger">
        <SelectValue>{({ selectedText }) => selectedText || placeholder}</SelectValue>
        <IconChevronDown aria-hidden="true" size={16} strokeWidth={2.3} />
      </AriaButton>
      <Popover className="select-popover">
        <ListBox>
          {options.map((option) => (
            <ListBoxItem id={option.value} key={option.value}>
              {option.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}

type SegmentedControlProps = {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
};

export function SegmentedControl({ value, options, onChange }: SegmentedControlProps) {
  return (
    <div className="segmented-control" role="radiogroup">
      {options.map((option) => (
        <AriaButton
          aria-pressed={value === option.value}
          className="segment"
          type="button"
          onPress={() => onChange(option.value)}
          key={option.value}
        >
          {option.label}
        </AriaButton>
      ))}
    </div>
  );
}

type CheckboxProps = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  onClick?: (event: MouseEvent) => void;
};

export function Checkbox({ checked, label, onChange, onClick }: CheckboxProps) {
  return (
    <AriaCheckbox className="checkbox" isSelected={checked} aria-label={label} onChange={onChange} onClick={onClick}>
      <span aria-hidden="true" />
    </AriaCheckbox>
  );
}

export function Panel({ children, className = "", as: Component = "div", ...props }: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  [key: string]: unknown;
}) {
  return (
    <Component className={`panel-surface ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`badge ${className}`.trim()}>{children}</span>;
}

export function NameMatchResults({ query, names }: { query: string; names: string[] }) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (normalizedQuery.length < 2) {
    return null;
  }

  const matches = names
    .filter((name) => name.toLocaleLowerCase().includes(normalizedQuery))
    .sort((first, second) => {
      const firstName = first.toLocaleLowerCase();
      const secondName = second.toLocaleLowerCase();
      const firstRank = firstName === normalizedQuery ? 0 : firstName.startsWith(normalizedQuery) ? 1 : 2;
      const secondRank = secondName === normalizedQuery ? 0 : secondName.startsWith(normalizedQuery) ? 1 : 2;
      return firstRank - secondRank || first.localeCompare(second, undefined, { sensitivity: "base" });
    })
    .slice(0, 5);

  if (matches.length === 0) {
    return null;
  }

  return (
    <div className="name-match-results" role="status" aria-label="Existing name matches">
      <small>Existing matches</small>
      {matches.map((name, index) => {
        const isExact = name.toLocaleLowerCase() === normalizedQuery;
        return (
          <span className={isExact ? "exact" : ""} key={`${name}-${index}`}>
            <strong>{name}</strong>
            {isExact ? <em>Exact match</em> : null}
          </span>
        );
      })}
    </div>
  );
}

export function ConfirmModal({
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  disabled = false,
  onConfirm,
  onCancel
}: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        aria-modal="true"
        className="confirm-modal"
        role="dialog"
        aria-labelledby="confirm-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div>
          <p className="eyebrow">Confirm</p>
          <h2 id="confirm-modal-title">{title}</h2>
        </div>
        <div className="confirm-modal-body">{body}</div>
        <div className="confirm-modal-actions">
          <Button variant="secondary" type="button" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} type="button" disabled={disabled} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
