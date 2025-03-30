import React, { createContext, useContext, useState, useEffect } from 'react';
import { NotificationType } from '@/components/NotificationsPanel';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  count?: number; // Counter for bundled notifications
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (type: NotificationType, title: string, message: string) => void;
  handleMarkAsRead: (id: string) => void;
  handleMarkAllAsRead: () => void;
  handleClearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const count = notifications.filter(notif => !notif.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const addNotification = (type: NotificationType, title: string, message: string) => {
    const newNotification: Notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
      count: 1
    };

    setNotifications(prev => {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      
      // Look for similar existing notification
      const similarIndex = prev.findIndex(
        notif => 
          notif.title === title && 
          (notif.type === type) &&
          notif.timestamp > twoMinutesAgo
      );

      if (similarIndex >= 0) {
        // Update the existing notification
        const updatedNotifications = [...prev];
        const existingNotification = updatedNotifications[similarIndex];
        
        // Increment count and update timestamp
        updatedNotifications[similarIndex] = {
          ...existingNotification,
          count: (existingNotification.count || 1) + 1,
          timestamp: new Date(), // Update timestamp to keep it current
          read: false,           // Mark as unread again
          // Keep message from the original notification or append new one if different
          message: existingNotification.message === message 
            ? message 
            : `${message} (${(existingNotification.count || 1) + 1} occurrences)`
        };
        
        // Move to top of list
        const updated = updatedNotifications.splice(similarIndex, 1)[0];
        return [updated, ...updatedNotifications];
      }
      
      // No similar notification found, add as new
      return [newNotification, ...prev];
    });
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationsContext.Provider 
      value={{ 
        notifications, 
        unreadCount, 
        addNotification, 
        handleMarkAsRead, 
        handleMarkAllAsRead, 
        handleClearAll 
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
