
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import serialService from "@/services/SerialService";
import { toast } from "sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface ConnectionControlProps {
  onConnect: () => void;
  isConnected: boolean;
}

const ConnectionControl: React.FC<ConnectionControlProps> = ({ 
  onConnect, 
  isConnected 
}) => {
  const [connecting, setConnecting] = useState(false);
  const isWebSerialSupported = serialService.isSupported;
  
  const handleConnect = async () => {
    try {
      setConnecting(true);
      const success = await serialService.connect();
      
      if (success) {
        if (isWebSerialSupported) {
          toast.success("Connected to Arduino", {
            description: "Now receiving data via serial connection"
          });
        } else {
          toast.info("Using simulated data", {
            description: "Web Serial API not supported, using mock data instead"
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
    </div>
  );
};

export default ConnectionControl;
