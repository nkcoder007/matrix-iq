import { useId, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Icon } from '../icons';
import { useDialogBehavior } from '../../lib/useDialogBehavior';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
}

/** Accessible dialog shell shared by project, source and creation flows. */
export function Dialog({
  open,
  onClose,
  eyebrow,
  title,
  description,
  children,
  initialFocusRef,
  className = '',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogBehavior({ open, onClose, containerRef: panelRef, initialFocusRef });

  if (!open) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        className="modal__scrim"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={`modal__dialog${className ? ` ${className}` : ''}`}
        tabIndex={-1}
      >
        <div className="modal__head">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 className="modal__title" id={titleId}>
              {title}
            </h2>
          </div>
          <button type="button" className="detail__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={15} />
          </button>
        </div>
        {description ? <p className="modal__sub">{description}</p> : null}
        {children}
      </div>
    </div>
  );
}
