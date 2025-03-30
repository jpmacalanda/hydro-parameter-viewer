
import React, { useState, useEffect } from 'react';
import serialService from "@/services/SerialService";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import ConnectionStatus from './connection/ConnectionStatus';
import ConnectionButtons from './connection/ConnectionButtons';

interface ConnectionControlProps {
  onConnect: () => void;
  onDisconnect: () => void;
  isConnected: boolean;
  dataReceived?: boolean;
}

const ConnectionControl: React.FC<ConnectionControlProps> = ({ 
  onConnect, 
  onDisconnect,
  isConnected,
  dataReceived = false
}) => {
  const [connecting, setConnecting] = useState(false);
  const [usingMockData, setUsingMockData] = useState(false);
  const [isError, setIsError] = useState(false);
  
  useEffect(() => {
    const handleArduinoError = (event: Event) => {
      const customEvent = event as CustomEvent;
      setIsError(true);
      toast.error(customEvent.detail.message, {
        description: "Check serial monitor for more details",
        icon: <Zap className="h-4 w-4" />,
      });
    };
    
    document.addEventListener('arduino-error', handleArduinoError);
    
    const handleConnectionSuccess = (event: Event) => {
      const customEvent = event as CustomEvent;
      setIsError(false);
      toast.success(customEvent.detail.message, {
        description: customEvent.detail.description,
      });
    };
    
    document.addEventListener('connection-success', handleConnectionSuccess);
    
    return () => {
      document.removeEventListener('arduino-error', handleArduinoError);
      document.removeEventListener('connection-success', handleConnectionSuccess);
    };
  }, []);
  
  const handleConnect = async () => {
    try {
      setConnecting(true);
      setIsError(false);
      
      console.log("Attempting connection...");
      
      let success = false;
      success = await serialService.connect();
      
      console.log("Connection result:", success);
      
      if (success) {
        setUsingMockData(serialService.isMockData);
        
        if (!serialService.isMockData) {
          const event = new CustomEvent('connection-success', { 
            detail: { 
              message: "Connected to Arduino", 
              description: "Now receiving data via serial connection" 
            } 
          });
          document.dispatchEvent(event);
        }
        
        onConnect();
      } else {
        setIsError(true);
        toast.error("Failed to connect", {
          description: "Could not establish connection to Arduino"
        });
      }
    } catch (error) {
      console.error("Connection error:", error);
      setIsError(true);
      toast.error("Connection error", {
        description: "An error occurred while connecting to the device"
      });
    } finally {
      setConnecting(false);
    }
  };
  
  const handleDisconnect = async () => {
    try {
      await serialService.disconnect();
      toast.info("Disconnected from device");
      setUsingMockData(false);
      setIsError(false);
      onDisconnect();
    } catch (error) {
      console.error("Disconnection error:", error);
    }
  };
  
  return (
    <div className="space-y-4 my-4">
      <div className="flex flex-col space-y-4 sm:space-y-0">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex space-x-2">
            <ConnectionButtons 
              isConnected={isConnected}
              connecting={connecting}
              handleConnect={handleConnect}
              handleDisconnect={handleDisconnect}
              canConnect={true}
            />
            
            <ConnectionStatus 
              isConnected={isConnected}
              isError={isError}
              dataReceived={dataReceived}
              usingMockData={usingMockData}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionControl;
