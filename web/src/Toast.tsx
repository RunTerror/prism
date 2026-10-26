// A tiny in-page toast for runtime effects.
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const ToastContext = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; message: string }[]>([]);
  const show = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list, { id, message }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 2500);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="toast">{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
