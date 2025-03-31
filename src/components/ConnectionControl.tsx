
import React, { useState, useEffect } from 'react';
import serialService from "@/services/SerialService";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import ConnectionStatus from './connection/ConnectionStatus';
import ConnectionButtons from './connection/ConnectionButtons';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ConnectionControlProps {
  onConnect: () => void;
  onDisconnect: () => void;
  isConnected: boolean;
  dataReceived?: boolean;
  useMockData: boolean;
  onToggleMockData: (useMock: boolean) => void;
}

const ConnectionControl: React.FC<ConnectionControlProps> = ({ 
  onConnect, 
  onDisconnect,
  isConnected,
  dataReceived = false,
  useMockData,
  onToggleMockData
}) => {
  const [connecting, setConnecting] = useState(false);
  const [isError, setIsError] = useState(false);
  
  useEffect(() => {
    console.log("[DOCKER-LOG][ConnectionControl] Component mounted");
    
    const handleArduinoError = (event: Event) => {
      const customEvent = event as CustomEvent;
      setIsError(true);
      console.log("[DOCKER-LOG][ConnectionControl] Arduino error event received:", customEvent.detail);
      toast.error(customEvent.detail.message, {
        description: "Check serial monitor for more details",
        icon: <Zap className="h-4 w-4" />,
      });
    };
    
    document.addEventListener('arduino-error', handleArduinoError);
    
    const handleConnectionSuccess = (event: Event) => {
      const customEvent = event as CustomEvent;
      setIsError(false);
      console.log("[DOCKER-LOG][ConnectionControl] Connection success event received:", customEvent.detail);
      toast.success(customEvent.detail.message, {
        description: customEvent.detail.description,
      });
    };
    
    document.addEventListener('connection-success', handleConnectionSuccess);
    
    return () => {
      document.removeEventListener('arduino-error', handleArduinoError);
      document.removeEventListener('connection-success', handleConnectionSuccess);
      console.log("[DOCKER-LOG][ConnectionControl] Component unmounted, removed event listeners");
    };
  }, []);
  
  // Log props changes
  useEffect(() => {
    console.log("[DOCKER-LOG][ConnectionControl] Props updated - isConnected:", isConnected, "dataReceived:", dataReceived, "useMockData:", useMockData);
  }, [isConnected, dataReceived, useMockData]);
  
  const handleConnect = async () => {
    try {
      console.log("[DOCKER-LOG][ConnectionControl] handleConnect called");
      setConnecting(true);
      setIsError(false);
      
      console.log("[DOCKER-LOG][ConnectionControl] Attempting connection...");
      
      const success = await serialService.connect();
      
      console.log("[DOCKER-LOG][ConnectionControl] Connection result:", success);
      
      if (success) {
        console.log("[DOCKER-LOG][ConnectionControl] Calling onConnect callback");
        onConnect();
        
        // Show a connection toast
        toast.success("Connected successfully", {
          description: "Reading real data from serial connection"
        });
      } else {
        console.log("[DOCKER-LOG][ConnectionControl] Connection failed");
        setIsError(true);
        toast.error("Failed to connect", {
          description: "Could not establish connection to Arduino"
        });
      }
    } catch (error) {
      console.error("[DOCKER-LOG][ConnectionControl] Connection error:", error);
      setIsError(true);
      toast.error("Connection error", {
        description: "An error occurred while connecting to the device"
      });
    } finally {
      setConnecting(false);
      console.log("[DOCKER-LOG][ConnectionControl] Connect process completed");
    }
  };
  
  const handleDisconnect = async () => {
    try {
      console.log("[DOCKER-LOG][ConnectionControl] handleDisconnect called");
      await serialService.disconnect();
      toast.info("Disconnected from device");
      setIsError(false);
      console.log("[DOCKER-LOG][ConnectionControl] Calling onDisconnect callback");
      onDisconnect();
    } catch (error) {
      console.error("[DOCKER-LOG][ConnectionControl] Disconnection error:", error);
    }
  };

  const handleToggleMockData = (checked: boolean) => {
    console.log("[DOCKER-LOG][ConnectionControl] Toggle mock data:", checked);
    onToggleMockData(checked);
    
    if (checked) {
      toast.info("Mock data enabled", {
        description: "Using simulated data instead of Arduino readings"
      });
    } else {
      toast.info("Mock data disabled", {
        description: "Using real data from Arduino"
      });
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
              usingMockData={useMockData}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="mock-data-toggle"
              checked={useMockData}
              onCheckedChange={handleToggleMockData}
            />
            <Label htmlFor="mock-data-toggle" className="cursor-pointer">
              Use Mock Data
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionControl;
