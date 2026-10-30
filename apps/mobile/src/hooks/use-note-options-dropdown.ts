import { useMemo, useState, useCallback } from "react";

export interface UseNoteOptionsDropdownProps {
  isExpanded?: boolean;
  setIsExpanded?: (open: boolean) => void;
}

export function useNoteOptionsDropdown({
  isExpanded,
  setIsExpanded,
}: UseNoteOptionsDropdownProps = {}) {
  const [isLocalExpanded, setIsLocalExpanded] = useState(false);

  const isOpen = useMemo(
    () => (isExpanded !== undefined ? isExpanded : isLocalExpanded),
    [isExpanded, isLocalExpanded],
  );

  const toggle = useCallback(() => {
    const next = !isOpen;
    if (setIsExpanded) {
      setIsExpanded(next);
    } else {
      setIsLocalExpanded(next);
    }
  }, [isOpen, setIsExpanded]);

  const close = useCallback(() => {
    if (setIsExpanded) {
      setIsExpanded(false);
    } else {
      setIsLocalExpanded(false);
    }
  }, [setIsExpanded]);

  const open = useCallback(() => {
    if (setIsExpanded) {
      setIsExpanded(true);
    } else {
      setIsLocalExpanded(true);
    }
  }, [setIsExpanded]);

  return {
    isOpen,
    toggle,
    close,
    open,
  };
}
