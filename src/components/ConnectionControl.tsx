
import React from 'react';
import { Button } from "@/components/ui/button";
import serialService from "@/services/SerialService";
import { toast } from "sonner";

interface ConnectionControlProps {
  onConnect: () => void;
  isConnected: boolean;
}

const ConnectionControl: React.FC<ConnectionControlProps> = ({ 
  onConnect, 
  isConnected 
}) => {
  const handleConnect = async () => {
    try {
      const success = await serialService.connect();
      
      if (success) {
        toast.success("Connected to device", {
          description: "Now receiving data from Arduino"
        });
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
    <div className="flex space-x-2 my-4">
      {!isConnected ? (
        <Button 
          onClick={handleConnect}
          variant="default"
          className="bg-hydro-blue hover:bg-hydro-blue/90"
        >
          Connect to Arduino
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
  );
};

export default ConnectionControl;
