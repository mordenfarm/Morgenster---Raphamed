
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  addNotification: (message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

const NotificationComponent: React.FC<Notification & { onDismiss: (id: number) => void }> = ({ id, message, type, onDismiss }) => {
    const [isDismissing, setIsDismissing] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsDismissing(true);
            const dismissTimer = setTimeout(() => {
                onDismiss(id);
            }, 400); // Animation duration
            return () => clearTimeout(dismissTimer);
        }, 2500); // Increased duration to read offline messages
        return () => clearTimeout(timer);
    }, [id, onDismiss]);

    const typeStyles = {
        success: { icon: <CheckCircle className="text-green-400" /> },
        error: { icon: <XCircle className="text-red-400" /> },
        warning: { icon: <AlertTriangle className="text-yellow-400" /> },
        info: { icon: <Info className="text-sky-400" /> }
    };

    const styles = typeStyles[type];

    return (
        <div className={`modern-notification ${isDismissing ? 'animate-slide-out-top' : 'animate-slide-in-top'}`}>
            <div className="flex-shrink-0">{styles.icon}</div>
            <p className="text-gray-200">{message}</p>
        </div>
    );
};


export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string, type: NotificationType) => {
    // Append offline status if applicable
    const isOffline = !navigator.onLine;
    let finalMessage = message;
    
    if (isOffline && (type === 'success' || type === 'info')) {
        finalMessage = `${message} (Saved Locally)`;
    }

    const id = Date.now();
    setNotifications(prev => [...prev, { id, message: finalMessage, type }]);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="notification-container">
        {notifications.map(n => (
          <NotificationComponent key={n.id} {...n} onDismiss={removeNotification} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
