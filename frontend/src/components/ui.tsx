import type { ElementType, MouseEvent, ReactNode } from "react";
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
  value: string | null;
  options: Option[];
  className?: string;
  placeholder?: string;
  onChange: (value: string | null) => void;
};

export function SelectInput({ label, value, options, className = "", placeholder = "Select", onChange }: SelectInputProps) {
  return (
    <Select
      className={`select-field ${className}`.trim()}
      selectedKey={value}
      onSelectionChange={(key) => onChange(key ? String(key) : null)}
    >
      {label ? <Label>{label}</Label> : null}
      <AriaButton className="select-trigger">
        <SelectValue>{({ selectedText }) => selectedText || placeholder}</SelectValue>
        <span aria-hidden="true">v</span>
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
