import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

interface DialogBehaviorOptions {
  open: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Escape handling, focus trapping, body scroll lock and focus restoration. */
export function useDialogBehavior({
  open,
  onClose,
  containerRef,
  initialFocusRef,
}: DialogBehaviorOptions) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true',
      );

    const focusInitial = () => {
      const target = initialFocusRef?.current ?? focusables()[0] ?? container;
      target.focus();
    };
    // Focus synchronously: deferring to requestAnimationFrame can leave focus on
    // the trigger when the tab is not painting (and fails strict-mode replays).
    focusInitial();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const elements = focusables();
      if (elements.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!container.contains(document.activeElement)) {
        event.preventDefault();
        (initialFocusRef?.current ?? first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !container.contains(event.target)) {
        focusInitial();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, containerRef, initialFocusRef]);
}
