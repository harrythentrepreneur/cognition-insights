import { toast as sonnerToast, ExternalToast } from 'sonner';

// Custom styled toast functions that match the sign-in design
export const toast = {
  success: (message: string, options?: ExternalToast) => {
    return sonnerToast.success(message, {
      ...options,
      style: {
        background: '#F5F2F0',
        color: 'rgb(61, 0, 0)',
        border: '1px solid rgba(61, 0, 0, 0.1)',
        borderRadius: '12px',
        padding: '16px 20px',
        fontSize: '15px',
        fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        maxWidth: '420px',
        ...options?.style,
      },
      className: 'toast-success',
      duration: 4000,
    });
  },
  
  error: (message: string, options?: ExternalToast) => {
    return sonnerToast.error(message, {
      ...options,
      style: {
        background: '#F5F2F0',
        color: 'rgb(61, 0, 0)',
        border: '1px solid rgba(220, 53, 69, 0.2)',
        borderRadius: '12px',
        padding: '16px 20px',
        fontSize: '15px',
        fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(220, 53, 69, 0.1)',
        maxWidth: '420px',
        ...options?.style,
      },
      className: 'toast-error',
      duration: 5000,
    });
  },
  
  loading: (message: string, options?: ExternalToast) => {
    return sonnerToast.loading(message, {
      ...options,
      style: {
        background: '#F5F2F0',
        color: 'rgb(61, 0, 0)',
        border: '1px solid rgba(61, 0, 0, 0.1)',
        borderRadius: '12px',
        padding: '16px 20px',
        fontSize: '15px',
        fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        maxWidth: '420px',
        ...options?.style,
      },
      className: 'toast-loading',
    });
  },
  
  custom: sonnerToast.custom,
  dismiss: sonnerToast.dismiss,
  promise: sonnerToast.promise,
};

// Toaster configuration props
export const toasterProps = {
  position: 'top-center' as const,
  toastOptions: {
    style: {
      background: '#F5F2F0',
      color: 'rgb(61, 0, 0)',
      borderRadius: '12px',
      padding: '16px 20px',
      fontSize: '15px',
      fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif',
      fontWeight: '500',
    },
    classNames: {
      toast: 'group',
      title: 'text-base font-semibold',
      description: 'text-sm text-muted-foreground',
      actionButton: 'bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity',
      cancelButton: 'bg-muted text-muted-foreground rounded-full px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity',
      closeButton: 'hover:opacity-70 transition-opacity',
    },
  },
  expand: false,
  richColors: false,
  closeButton: true,
};