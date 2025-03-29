
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import serialService from "@/services/SerialService";
import { toast } from "sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info, Zap } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ConnectionControlProps {
  onConnect: () => void;
  isConnected: boolean;
}

const ConnectionControl: React.FC<ConnectionControlProps> = ({ 
  onConnect, 
  isConnected 
}) => {
  const [connecting, setConnecting] = useState(false);
  const [autoDetect, setAutoDetect] = useState(serialService.autoDetect);
  const isWebSerialSupported = serialService.isSupported;
  
  useEffect(() => {
    // Listen for Arduino errors
    const handleArduinoError = (event: Event) => {
      const customEvent = event as CustomEvent;
      toast.error(customEvent.detail.message, {
        description: "Check serial monitor for more details",
        icon: <Zap className="h-4 w-4" />,
      });
    };
    
    document.addEventListener('arduino-error', handleArduinoError);
    
    return () => {
      document.removeEventListener('arduino-error', handleArduinoError);
    };
  }, []);
  
  const handleConnect = async () => {
    try {
      setConnecting(true);
      const success = await serialService.connect();
      
      if (success) {
        if (isWebSerialSupported && (autoDetect ? "detected hardware" : "using hardware")) {
          toast.success("Connected to Arduino", {
            description: "Now receiving data via serial connection"
          });
        } else {
          toast.info("Using simulated data", {
            description: autoDetect ? 
              "No hardware detected, using mock data instead" : 
              "Web Serial API not supported, using mock data instead"
          });
        }
        onConnect();
      } else {
        toast.error("Failed to connect", {
          description: "Could not establish connection to Arduino"
        });
      }
    } catch (error) {
      console.error("Connection error:", error);
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
    } catch (error) {
      console.error("Disconnection error:", error);
    }
  };
  
  const handleAutoDetectChange = (checked: boolean) => {
    setAutoDetect(checked);
    serialService.autoDetect = checked;
  };
  
  return (
    <div className="space-y-4 my-4">
      {!isWebSerialSupported && (
        <Alert variant="destructive" className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Web Serial API not supported</AlertTitle>
          <AlertDescription>
            Your browser does not support the Web Serial API. 
            Try using Chrome or Edge. The app will use simulated data instead.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex space-x-2">
          {!isConnected ? (
            <Button 
              onClick={handleConnect}
              variant="default"
              className="bg-hydro-blue hover:bg-hydro-blue/90"
              disabled={connecting}
            >
              {connecting ? 'Connecting...' : 'Connect to Arduino'}
            </Button>
          ) : (
            <Button 
              onClick={handleDisconnect}
              variant="outline"
              className="border-hydro-blue text-hydro-blue hover:bg-hydro-blue/10"
            >
              Disconnect
            </Button>
          )}
          
          <div className="flex items-center">
            <div 
              className={`mr-2 w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}
            ></div>
            <span className="text-sm text-gray-600">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="auto-detect" 
            checked={autoDetect}
            onCheckedChange={handleAutoDetectChange}
          />
          <Label htmlFor="auto-detect">Auto-detect hardware</Label>
          <Info 
            className="h-4 w-4 text-gray-400 cursor-help" 
            title="When enabled, the system will automatically switch between real Arduino data and mock data"
          />
        </div>
      </div>
    </div>
  );
};

export default ConnectionControl;
