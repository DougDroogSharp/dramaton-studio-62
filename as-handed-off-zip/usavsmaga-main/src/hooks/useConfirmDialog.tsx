import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmOptions {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

interface ConfirmDialogContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (message: string, title?: string) => Promise<void>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(null);

export const useConfirmDialog = () => {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider');
  }
  return context;
};

interface ConfirmDialogProviderProps {
  children: ReactNode;
}

export const ConfirmDialogProvider = ({ children }: ConfirmDialogProviderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: 'Confirm',
    description: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    variant: 'default',
  });
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);
  const [isAlert, setIsAlert] = useState(false);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions({
        title: opts.title || 'Confirm',
        description: opts.description,
        confirmText: opts.confirmText || 'OK',
        cancelText: opts.cancelText || 'Cancel',
        variant: opts.variant || 'default',
      });
      setIsAlert(false);
      setResolveRef(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const alert = useCallback((message: string, title?: string): Promise<void> => {
    return new Promise((resolve) => {
      setOptions({
        title: title || 'Notice',
        description: message,
        confirmText: 'OK',
        cancelText: '',
        variant: 'default',
      });
      setIsAlert(true);
      setResolveRef(() => () => resolve());
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    resolveRef?.(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    resolveRef?.(false);
  };

  return (
    <ConfirmDialogContext.Provider value={{ confirm, alert }}>
      {children}
      <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <AlertDialogContent className="bg-diesel-panel border-diesel-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-diesel-gold font-bold uppercase tracking-wider">
              {options.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-diesel-paper">
              {options.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {!isAlert && (
              <AlertDialogCancel 
                onClick={handleCancel}
                className="bg-diesel-black border-diesel-border text-diesel-steel hover:bg-diesel-panel hover:text-diesel-paper"
              >
                {options.cancelText}
              </AlertDialogCancel>
            )}
            <AlertDialogAction 
              onClick={handleConfirm}
              className={
                options.variant === 'destructive'
                  ? 'bg-diesel-rust/20 border border-diesel-rust text-diesel-rust hover:bg-diesel-rust/30'
                  : 'bg-diesel-gold/20 border border-diesel-gold text-diesel-gold hover:bg-diesel-gold/30'
              }
            >
              {options.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmDialogContext.Provider>
  );
};
