
import { useEffect } from 'react';
import { useNotifications } from '@/context/NotificationsContext';

interface ConnectionDetectionProps {
  connected: boolean;
  lastDataReceived: Date | null;
  isRemoteAccess: boolean;
}

const ConnectionDetection: React.FC<ConnectionDetectionProps> = ({ 
  connected, 
  lastDataReceived, 
  isRemoteAccess 
}) => {
  const { addNotification } = useNotifications();
  
  useEffect(() => {
    if (isRemoteAccess) {
      addNotification(
        'info', 
        'Remote Access Detected', 
        'You are accessing this dashboard from a different device than the one hosting it. The system will automatically use the logs to access the Arduino data.'
      );
    }
    
    const hostname = window.location.hostname;
    const isRaspberryPi = hostname === 'raspberrypi.local' || 
                          hostname.startsWith('192.168.') ||
                          hostname === 'localhost';
    
    if (isRaspberryPi && !isRemoteAccess) {
      addNotification(
        'info',
        'Running on Raspberry Pi',
        'For best results on Raspberry Pi: Use HTTP instead of HTTPS (no certificate issues), ensure the Arduino is connected to USB port, and make sure your user has permission to access /dev/ttyUSB0'
      );
    }
  }, [isRemoteAccess, addNotification]);

  useEffect(() => {
    if (connected && !lastDataReceived) {
      const timer = setTimeout(() => {
        addNotification(
          'warning',
          'Connected But No Data',
          'Connection established, but no data is being received. Check:\n' +
          '- Arduino is sending data in the format: pH:6.20,temp:23.20,water:medium,tds:652\n' +
          '- Correct port is selected (/dev/ttyUSB0 on Raspberry Pi)\n' +
          '- Baud rate matches (9600)\n' +
          '- Server logs for errors'
        );
      }, 10000); // Give it 10 seconds to receive data
      
      return () => clearTimeout(timer);
    }
  }, [connected, lastDataReceived, addNotification]);

  return null; // This component doesn't render anything
};

export default ConnectionDetection;
