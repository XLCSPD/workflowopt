"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface EditableTitleProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

/**
 * Inline editable title component.
 * Double-click to edit, Enter to save, Escape to cancel.
 */
export function EditableTitle({
  value,
  onSave,
  className,
  inputClassName,
  placeholder = "Untitled",
  maxLength = 100,
  disabled = false,
}: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft value when external value changes
  useEffect(() => {
    if (!isEditing) {
      setDraftValue(value);
    }
  }, [value, isEditing]);

  // Focus and select text when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    if (disabled || isSaving) return;
    setIsEditing(true);
    setDraftValue(value);
  }, [disabled, isSaving, value]);

  const handleCancel = useCallback(() => {
    setDraftValue(value);
    setIsEditing(false);
  }, [value]);

  const handleSave = useCallback(async () => {
    const trimmedValue = draftValue.trim();

    // If empty or unchanged, cancel the edit
    if (!trimmedValue || trimmedValue === value) {
      handleCancel();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedValue);
      setIsEditing(false);
    } catch {
      // On error, keep editing mode open so user can retry
      // The parent component should show an error toast
    } finally {
      setIsSaving(false);
    }
  }, [draftValue, value, onSave, handleCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const handleBlur = useCallback(() => {
    // Only save on blur if not already saving
    if (!isSaving) {
      handleSave();
    }
  }, [isSaving, handleSave]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draftValue}
        onChange={(e) => setDraftValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        maxLength={maxLength}
        disabled={isSaving}
        placeholder={placeholder}
        className={cn(
          "bg-transparent border-b-2 border-brand-gold outline-none",
          "min-w-[100px] w-full",
          isSaving && "opacity-50 cursor-not-allowed",
          className,
          inputClassName
        )}
        aria-label="Edit title"
      />
    );
  }

  return (
    <span
      onDoubleClick={handleStartEdit}
      className={cn(
        "truncate cursor-text",
        !disabled && "hover:bg-muted/50 rounded px-1 -mx-1 transition-colors",
        disabled && "cursor-default",
        className
      )}
      title={disabled ? value : `Double-click to edit: ${value}`}
    >
      {value || placeholder}
    </span>
  );
}
