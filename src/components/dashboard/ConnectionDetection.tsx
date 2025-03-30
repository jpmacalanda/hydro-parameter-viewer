
import { useEffect, useState } from 'react';
import { useNotifications } from '@/context/NotificationsContext';
import serialService from '@/services/SerialService';
import { AlertTriangle, Wifi } from 'lucide-react';

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
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [reconnectTimer, setReconnectTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Handle remote access notifications
  useEffect(() => {
    if (isRemoteAccess) {
      addNotification(
        'info', 
        'Remote Access Detected', 
        'You are accessing this dashboard from a different device than the one hosting it.'
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

  // Handle no data scenario when connected
  useEffect(() => {
    if (connected && !lastDataReceived) {
      const timer = setTimeout(() => {
        addNotification(
          'error',
          'No Data Received',
          'Connection established, but no sensor data is being received. Check:\n' +
          '- Arduino is physically connected and powered on\n' +
          '- Arduino is sending data in the format: pH:6.20,temp:23.20,water:medium,tds:652\n' +
          '- Correct port is selected (/dev/ttyUSB0 on Raspberry Pi)\n' +
          '- Baud rate matches (9600)\n' +
          '- Server logs for errors'
        );
      }, 10000); // Give it 10 seconds to receive data
      
      return () => clearTimeout(timer);
    }
  }, [connected, lastDataReceived, addNotification]);

  // Handle disconnection detection and reconnection attempts
  useEffect(() => {
    let connectionCheckInterval: NodeJS.Timeout | null = null;
    
    // Only start monitoring if we're connected
    if (connected) {
      // Check for connection issues every 5 seconds
      connectionCheckInterval = setInterval(() => {
        const now = new Date();
        const lastDataTime = lastDataReceived ? lastDataReceived.getTime() : 0;
        const timeSinceLastData = now.getTime() - lastDataTime;
        
        // If no data for 15 seconds, consider it disconnected
        if (lastDataReceived && timeSinceLastData > 15000) {
          console.log("Connection appears lost, no data for 15+ seconds");
          
          // Only show one notification per disconnection
          if (reconnectAttempts === 0) {
            addNotification(
              'warning',
              'Arduino Connection Lost',
              'No data received from Arduino for 15+ seconds. Attempting to reconnect automatically...'
            );
          }
          
          // Attempt reconnection
          if (!reconnectTimer) {
            const newAttempts = reconnectAttempts + 1;
            setReconnectAttempts(newAttempts);
            
            // Add a notification with attempt count (but limit frequency)
            if (newAttempts === 1 || newAttempts % 5 === 0) {  // Show for 1st, 5th, 10th attempts
              addNotification(
                'info',
                'Reconnection Attempt',
                `Trying to reconnect to Arduino (Attempt ${newAttempts})`
              );
            }
            
            // Attempt to reconnect to serial service
            console.log(`Attempting to reconnect (attempt ${newAttempts})`);
            serialService.disconnect().then(() => {
              // Wait a moment before reconnecting
              const timer = setTimeout(() => {
                serialService.connect().then(success => {
                  if (success) {
                    addNotification(
                      'success',
                      'Arduino Reconnected',
                      'Successfully reconnected to Arduino device'
                    );
                    setReconnectAttempts(0);
                    setReconnectTimer(null);
                  } else {
                    setReconnectTimer(null); // Allow another attempt
                  }
                });
              }, 3000);
              
              setReconnectTimer(timer as unknown as NodeJS.Timeout);
            });
          }
        } else if (lastDataReceived && reconnectAttempts > 0) {
          // We've got data and were in reconnect mode - connection restored!
          setReconnectAttempts(0);
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            setReconnectTimer(null);
          }
        }
      }, 5000);
    }
    
    return () => {
      if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        setReconnectTimer(null);
      }
    };
  }, [connected, lastDataReceived, reconnectAttempts, reconnectTimer, addNotification]);

  return null; // This component doesn't render anything
};

export default ConnectionDetection;
