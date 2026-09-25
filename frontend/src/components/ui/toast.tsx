'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { BellDot } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 pr-6 shadow-lg pointer-events-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-right-full data-[state=closed]:slide-out-to-right-full data-[state=open]:fade-in-80',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        success: 'bg-success text-success-foreground',
        warning: 'bg-warning text-warning-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    }
  }
);

interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  title: string;
  description?: string;
  action?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, title, description, action, onOpenChange, onClose, ...props }, ref) => {
    const [open, setOpen] = React.useState(true);

    React.useEffect(() => {
      onOpenChange?.(open);
      const timer = setTimeout(() => {
        setOpen(false);
        onClose?.();
      }, 5000);
      return () => {
        clearTimeout(timer);
      };
    }, [open, onOpenChange, onClose]);

    return (
      <div
        ref={ref}
        className={cn(
          toastVariants({ variant }),
          !open && 'data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full',
          className
        )}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        {...props}
      >
        <div className="flex items-start space-x-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md">
            <BellDot className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{title}</h3>
              <button
                onClick={() => {
                  setOpen(false);
                  onClose?.();
                }}
                className="text-xs hover:underline ml-2"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
            {description && <p className="text-sm">{description}</p>}
          </div>
        </div>
        {action && (
          <div className="mt-4">
            {action}
          </div>
        )}
      </div>
    );
  }
);

Toast.displayName = 'Toast';

export { Toast, toastVariants };
