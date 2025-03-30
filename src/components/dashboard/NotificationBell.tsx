
import React from 'react';
import { Bell } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import NotificationsPanel from '../NotificationsPanel';
import { useNotifications } from '@/context/NotificationsContext';

const NotificationBell: React.FC = () => {
  const { unreadCount, notifications, handleMarkAsRead, handleMarkAllAsRead, handleClearAll } = useNotifications();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="p-2 rounded-full hover:bg-gray-100 relative">
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 p-0 text-xs bg-red-500 text-white rounded-full" 
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </button>
      </SheetTrigger>
      <SheetContent>
        <NotificationsPanel
          notifications={notifications}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onClearAll={handleClearAll}
        />
      </SheetContent>
    </Sheet>
  );
};

export default NotificationBell;
