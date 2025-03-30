
import React from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, Wifi, ShieldAlert } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { SerialData } from '@/services/types/serial.types';

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationsPanelProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll
}) => {
  // Get the icon based on notification type
  const getNotificationIcon = (type: NotificationType, title: string) => {
    // Check for specific titles first for better icon matching
    if (title.includes('Remote Access')) {
      return <Wifi className="h-5 w-5 text-blue-500" />;
    }
    if (title.includes('Web Serial API')) {
      return <ShieldAlert className="h-5 w-5 text-yellow-500" />;
    }
    
    // Fall back to type-based icons
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  // Get the variant based on notification type
  const getAlertVariant = (type: NotificationType) => {
    switch (type) {
      case 'warning':
        return 'warning';
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };
  
  // Format message to handle newlines
  const formatMessage = (message: string) => {
    if (!message.includes('\n')) return message;
    
    return message.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < message.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Notifications</h3>
        <div className="space-x-2">
          <button 
            onClick={onMarkAllAsRead} 
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Mark all as read
          </button>
          <button 
            onClick={onClearAll}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Clear all
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <Bell className="mx-auto h-12 w-12 mb-4 opacity-20" />
          <p>No notifications</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {notifications.map((notification) => (
            <Alert 
              key={notification.id}
              variant={getAlertVariant(notification.type)}
              className={`relative ${notification.read ? 'opacity-70' : ''}`}
            >
              <div className="flex items-start">
                {getNotificationIcon(notification.type, notification.title)}
                <div className="ml-3 flex-1">
                  <div className="flex justify-between items-start">
                    <AlertTitle>{notification.title}</AlertTitle>
                    {!notification.read && (
                      <Badge variant="secondary" className="ml-2 text-xs">New</Badge>
                    )}
                  </div>
                  <AlertDescription className="whitespace-pre-line">
                    {formatMessage(notification.message)}
                  </AlertDescription>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>
                      {notification.timestamp.toLocaleString()}
                    </span>
                    {!notification.read && (
                      <button 
                        onClick={() => onMarkAsRead(notification.id)}
                        className="text-blue-600 hover:underline"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPanel;

