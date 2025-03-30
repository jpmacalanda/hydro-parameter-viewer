
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import serialService from "@/services/SerialService";
import webSocketService from "@/services/WebSocketService";
import { toast } from "sonner";
import { Zap, RefreshCcw, Wifi, Usb, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SerialPortInfo } from "@/services/types/serial.types";

interface ConnectionControlProps {
  onConnect: () => void;
  isConnected: boolean;
  dataReceived?: boolean;
}

const ConnectionControl: React.FC<ConnectionControlProps> = ({ 
  onConnect, 
  isConnected,
  dataReceived = false
}) => {
  const [connecting, setConnecting] = useState(false);
  const [usingMockData, setUsingMockData] = useState(false);
  const [usingWebSocket, setUsingWebSocket] = useState(false);
  const [availablePorts, setAvailablePorts] = useState<SerialPortInfo[]>([]);
  const [selectedPortId, setSelectedPortId] = useState<string>("");
  const [loadingPorts, setLoadingPorts] = useState(false);
  const [isError, setIsError] = useState(false);
  const [portStatus, setPortStatus] = useState<{busy: boolean, message: string}>({busy: false, message: ''});
  const isWebSerialSupported = serialService.isSupported;
  const isSecurityRestricted = serialService.isSecurityRestricted;
  
  useEffect(() => {
    if (webSocketService.isWebSocketConnected()) {
      setUsingWebSocket(true);
    }
    
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
    
    if (isWebSerialSupported && !isSecurityRestricted) {
      fetchAvailablePorts();
    }
    
    return () => {
      document.removeEventListener('arduino-error', handleArduinoError);
      document.removeEventListener('connection-success', handleConnectionSuccess);
    };
  }, [isWebSerialSupported, isSecurityRestricted]);
  
  const fetchAvailablePorts = async () => {
    if (!isWebSerialSupported || isSecurityRestricted) return;
    
    setLoadingPorts(true);
    try {
      const ports = await serialService.getAvailablePorts();
      setAvailablePorts(ports);
      
      if (ports.length > 0 && !selectedPortId) {
        setSelectedPortId(ports[0].id);
      }
      
      await checkPortUsage();
    } catch (error) {
      console.error("Error fetching ports:", error);
      toast.error("Failed to list COM ports", {
        description: "Could not retrieve available serial ports"
      });
    } finally {
      setLoadingPorts(false);
    }
  };
  
  const checkPortUsage = async (): Promise<void> => {
    try {
      if (isWebSerialSupported && !isSecurityRestricted && selectedPortId) {
        const selectedPort = availablePorts.find(p => p.id === selectedPortId);
        if (selectedPort) {
          const portName = selectedPort.displayName;
          
          try {
            await navigator.serial.requestPort({filters: []});
            setPortStatus({
              busy: false,
              message: `Port ${portName} is available.`
            });
          } catch (err) {
            if (err instanceof Error && err.name === 'NotFoundError') {
              setPortStatus({
                busy: false,
                message: 'No matching port found.'
              });
            } else {
              console.error("Error checking port:", err);
              setPortStatus({
                busy: true,
                message: `Port ${portName} may be in use by another application.`
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking port usage:", error);
    }
  };
  
  const handleConnect = async () => {
    try {
      setConnecting(true);
      setIsError(false);
      
      console.log("Attempting connection...");
      
      const hostname = window.location.hostname;
      const isRaspberryPi = hostname === 'raspberrypi.local' || 
                           hostname.startsWith('192.168.') ||
                           hostname === 'localhost';
      
      if (isRaspberryPi) {
        console.log("On Raspberry Pi, trying WebSocket first");
        const wsConnected = webSocketService.connect();
        if (wsConnected) {
          setUsingWebSocket(true);
          setUsingMockData(false);
          setConnecting(false);
          onConnect();
          return;
        }
      }
      
      let success = false;
      if (selectedPortId) {
        const selectedPort = availablePorts.find(p => p.id === selectedPortId);
        console.log("Using selected port:", selectedPort);
        if (selectedPort) {
          success = await serialService.connect(selectedPort.port);
        } else {
          success = await serialService.connect();
        }
      } else {
        console.log("Using automatic connection");
        success = await serialService.connect();
      }
      
      console.log("Connection result:", success);
      
      if (success) {
        setUsingMockData(serialService.isMockData);
        setUsingWebSocket(serialService.isWebSocket);
        
        if (!serialService.isMockData && !serialService.isWebSocket) {
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
      if (usingWebSocket) {
        webSocketService.disconnect();
      }
      
      await serialService.disconnect();
      toast.info("Disconnected from device");
      setUsingMockData(false);
      setUsingWebSocket(false);
      setIsError(false);
    } catch (error) {
      console.error("Disconnection error:", error);
    }
  };
  
  const getConnectionTypeText = () => {
    if (!isConnected) return "Disconnected";
    if (isError) return "Connection Error";
    if (isConnected && !dataReceived) return "Connected (No Data)";
    if (usingMockData) return "Connected (Mock Data)";
    if (usingWebSocket) return "Connected (WebSocket)";
    return "Connected (Direct Serial)";
  };
  
  const getConnectionTypeColor = () => {
    if (!isConnected) return "bg-gray-400";
    if (isError) return "bg-red-500";
    if (isConnected && !dataReceived) return "bg-yellow-500";
    if (usingMockData) return "bg-yellow-500";
    if (usingWebSocket) return "bg-blue-500";
    return "bg-green-500";
  };
  
  return (
    <div className="space-y-4 my-4">
      <div className="flex flex-col space-y-4 sm:space-y-0">
        {isWebSerialSupported && !isSecurityRestricted && (
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="port-select" className="mb-2 block">Serial Port</Label>
              <div className="flex space-x-2 items-center">
                <Select
                  value={selectedPortId}
                  onValueChange={(value) => {
                    setSelectedPortId(value);
                    // The issue is here: we're passing an argument to setTimeout callback
                    // but checkPortUsage doesn't accept arguments
                    setTimeout(checkPortUsage, 100);
                  }}
                  disabled={isConnected || loadingPorts}
                >
                  <SelectTrigger id="port-select" className="flex-1">
                    <SelectValue placeholder="Select a port" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePorts.length === 0 ? (
                      <SelectItem value="no-ports" disabled>
                        No ports available
                      </SelectItem>
                    ) : (
                      availablePorts.map((port) => (
                        <SelectItem key={port.id} value={port.id}>
                          {port.displayName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchAvailablePorts}
                  disabled={isConnected || loadingPorts}
                  title="Refresh ports"
                >
                  <RefreshCcw className={`h-4 w-4 ${loadingPorts ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              {portStatus.busy && (
                <div className="mt-2 text-sm flex items-center text-yellow-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {portStatus.message}
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex space-x-2">
            {!isConnected ? (
              <Button 
                onClick={handleConnect}
                variant="default"
                className="bg-hydro-blue hover:bg-hydro-blue/90"
                disabled={connecting || (!selectedPortId && availablePorts.length > 0 && !isSecurityRestricted)}
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
                className={`mr-2 w-3 h-3 rounded-full ${getConnectionTypeColor()}`}
              ></div>
              <span className="text-sm text-gray-600">
                {getConnectionTypeText()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionControl;
