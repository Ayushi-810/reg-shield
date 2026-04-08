"use client";

import * as Toast from "@radix-ui/react-toast";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ToastItem {
  id: number;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Toast.Provider swipeDirection="right" duration={3000}>
        {children}

        {toasts.map((t) => (
          <Toast.Root
            key={t.id}
            open
            onOpenChange={(open) => { if (!open) dismiss(t.id); }}
            style={{
              backgroundColor: "#F0FDF4",
              border: "1px solid #BBF7D0",
              borderRadius: "8px",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              minWidth: "260px",
              maxWidth: "360px",
            }}
          >
            {/* Green tick */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="8" fill="#16A34A" />
              <path d="M4.5 8.5L6.5 10.5L11.5 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <Toast.Description
              style={{ fontSize: "13px", color: "#15803D", fontWeight: 500, margin: 0 }}
            >
              {t.message}
            </Toast.Description>
          </Toast.Root>
        ))}

        <Toast.Viewport
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            zIndex: 9999,
            outline: "none",
          }}
        />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}
