import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from '../../lib/design-system';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
  overlayClassName?: string;
  initialFocus?: React.RefObject<HTMLElement>;
  restoreFocus?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
  overlayClassName,
  initialFocus,
  restoreFocus = true,
}) => {
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const isClosingRef = useRef(false);

  // Store the previously focused element when modal opens
  useEffect(() => {
    if (isOpen && restoreFocus) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen, restoreFocus]);

  // Handle focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      const firstFocusableElement = focusableElements[0] as HTMLElement;
      const lastFocusableElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      // Focus initial element or first focusable element
      if (initialFocus?.current) {
        initialFocus.current.focus();
      } else if (firstFocusableElement) {
        firstFocusableElement.focus();
      }

      // Handle tab key for focus trapping
      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstFocusableElement) {
            e.preventDefault();
            lastFocusableElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastFocusableElement) {
            e.preventDefault();
            firstFocusableElement?.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTabKey);
      return () => document.removeEventListener('keydown', handleTabKey);
    }
  }, [isOpen, initialFocus]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isClosingRef.current) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle overlay click
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === overlayRef.current && !isClosingRef.current) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  // Handle close with focus restoration
  const handleClose = useCallback(() => {
    isClosingRef.current = true;
    onClose();
    
    // Restore focus after modal closes
    setTimeout(() => {
      if (restoreFocus && previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
      isClosingRef.current = false;
    }, 100);
  }, [onClose, restoreFocus]);

  // Mount portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !isOpen) {
    return null;
  }

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
  };

  const modalContent = (
    <div
      ref={overlayRef}
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-black/50 backdrop-blur-sm',
        'animate-in fade-in duration-200',
        overlayClassName
      )}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      <div
        ref={modalRef}
        className={clsx(
          'relative w-full bg-white rounded-2xl shadow-2xl',
          'animate-in zoom-in-95 duration-200',
          'max-h-[90vh] overflow-hidden flex flex-col',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <div className="space-y-1">
              {title && (
                <h2 id="modal-title" className="text-xl font-semibold text-neutral-900">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="text-sm text-neutral-500">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="shrink-0 ml-4 !p-2"
                aria-label="Close modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

// Modal Body Component
interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

const ModalBody: React.FC<ModalBodyProps> = ({ children, className }) => (
  <div className={clsx('p-6', className)}>
    {children}
  </div>
);

// Modal Footer Component
interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

const ModalFooter: React.FC<ModalFooterProps> = ({ children, className }) => (
  <div className={clsx('flex items-center justify-end space-x-3 p-6 border-t border-neutral-200', className)}>
    {children}
  </div>
);

// Confirmation Modal Component
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  const handleConfirm = useCallback(async () => {
    await onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  const confirmButtonVariant = {
    danger: 'danger' as const,
    warning: 'sunset' as const,
    info: 'primary' as const,
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      showCloseButton={false}
    >
      <ModalBody>
        <p className="text-neutral-600">
          {description}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          variant={confirmButtonVariant[variant]}
          onClick={handleConfirm}
          loading={loading}
        >
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

// Hook for confirmation modal
export const useConfirmationModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<Omit<ConfirmationModalProps, 'isOpen' | 'onClose'> | null>(null);

  const confirm = useCallback((modalConfig: Omit<ConfirmationModalProps, 'isOpen' | 'onClose' | 'onConfirm'> & { onConfirm: () => void | Promise<void> }) => {
    setConfig(modalConfig);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setConfig(null), 200); // Wait for animation
  }, []);

  const ConfirmationModalComponent = useCallback(() => {
    if (!config) return null;

    return (
      <ConfirmationModal
        {...config}
        isOpen={isOpen}
        onClose={close}
      />
    );
  }, [config, isOpen, close]);

  return {
    confirm,
    ConfirmationModal: ConfirmationModalComponent,
  };
};

// Export compound component
const ModalCompound = Object.assign(Modal, {
  Body: ModalBody,
  Footer: ModalFooter,
  Confirmation: ConfirmationModal,
});

export { useConfirmationModal };
export default ModalCompound;