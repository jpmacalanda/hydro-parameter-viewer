
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import serialService from "@/services/SerialService";
import { toast } from "sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info, Zap, RefreshCcw, Shield, Wifi, WifiOff, Usb, Bug, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SerialPortInfo } from "@/services/types/serial.types";

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
  const [usingMockData, setUsingMockData] = useState(false);
  const [usingWebSocket, setUsingWebSocket] = useState(false);
  const [availablePorts, setAvailablePorts] = useState<SerialPortInfo[]>([]);
  const [selectedPortId, setSelectedPortId] = useState<string>("");
  const [loadingPorts, setLoadingPorts] = useState(false);
  const isWebSerialSupported = serialService.isSupported;
  const isSecurityRestricted = serialService.isSecurityRestricted;
  const isRaspberryPi = window.location.hostname === 'raspberrypi.local' || 
                        window.location.hostname.startsWith('192.168.') ||
                        window.location.hostname === 'localhost';
  const isRemoteAccess = window.location.hostname !== 'localhost' && 
                         window.location.hostname !== '127.0.0.1';
  
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
    
    // Load available ports on component mount
    if (isWebSerialSupported && !isSecurityRestricted) {
      fetchAvailablePorts();
    }
    
    return () => {
      document.removeEventListener('arduino-error', handleArduinoError);
    };
  }, [isWebSerialSupported, isSecurityRestricted]);
  
  const fetchAvailablePorts = async () => {
    if (!isWebSerialSupported || isSecurityRestricted) return;
    
    setLoadingPorts(true);
    try {
      const ports = await serialService.getAvailablePorts();
      setAvailablePorts(ports);
      
      // Auto-select the first port if available
      if (ports.length > 0 && !selectedPortId) {
        setSelectedPortId(ports[0].id);
      }
    } catch (error) {
      console.error("Error fetching ports:", error);
      toast.error("Failed to list COM ports", {
        description: "Could not retrieve available serial ports"
      });
    } finally {
      setLoadingPorts(false);
    }
  };
  
  const handleConnect = async () => {
    try {
      setConnecting(true);
      
      // If auto-detect is disabled and we have a selected port, use it
      let success = false;
      if (!autoDetect && selectedPortId) {
        const selectedPort = availablePorts.find(p => p.id === selectedPortId);
        if (selectedPort) {
          success = await serialService.connect(selectedPort.port);
        } else {
          success = await serialService.connect();
        }
      } else {
        success = await serialService.connect();
      }
      
      if (success) {
        setUsingMockData(serialService.isMockData);
        setUsingWebSocket(serialService.isWebSocket);
        
        if (serialService.isMockData) {
          toast.info("Using simulated data", {
            description: autoDetect ? 
              "No hardware detected, using mock data instead" : 
              "Web Serial API not supported, using mock data instead"
          });
        } else if (serialService.isWebSocket) {
          toast.success("Connected via WebSocket", {
            description: "Now receiving data from the Raspberry Pi's Arduino"
          });
        } else {
          toast.success("Connected to Arduino", {
            description: "Now receiving data via serial connection"
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
      setUsingMockData(false);
      setUsingWebSocket(false);
    } catch (error) {
      console.error("Disconnection error:", error);
    }
  };
  
  const handleAutoDetectChange = (checked: boolean) => {
    setAutoDetect(checked);
    serialService.autoDetect = checked;
  };
  
  const getConnectionTypeText = () => {
    if (!isConnected) return "Disconnected";
    if (usingMockData) return "Connected (Mock Data)";
    if (usingWebSocket) return "Connected (WebSocket)";
    return "Connected (Direct Serial)";
  };
  
  const getConnectionTypeColor = () => {
    if (!isConnected) return "bg-gray-400";
    if (usingMockData) return "bg-yellow-500";
    if (usingWebSocket) return "bg-blue-500";
    return "bg-green-500";
  };
  
  return (
    <div className="space-y-4 my-4">
      {/* Remote access specific message */}
      {isRemoteAccess && (
        <Alert variant="default" className="mb-4 border-blue-400 text-blue-800 bg-blue-50">
          <Wifi className="h-4 w-4" />
          <AlertTitle>Remote Access Detected</AlertTitle>
          <AlertDescription>
            You are accessing this dashboard from a different device than the one hosting it.
            The system will automatically use the WebSocket connection to access the Arduino 
            connected to the Raspberry Pi.
          </AlertDescription>
        </Alert>
      )}

      {/* Raspberry Pi specific message */}
      {isRaspberryPi && !isRemoteAccess && (
        <Alert variant="default" className="mb-4 border-blue-400 text-blue-800 bg-blue-50">
          <Wifi className="h-4 w-4" />
          <AlertTitle>Running on Raspberry Pi</AlertTitle>
          <AlertDescription>
            For best results on Raspberry Pi:
            <ul className="list-disc list-inside mt-2">
              <li>Use HTTP instead of HTTPS (no certificate issues)</li>
              <li>Enable auto-detect hardware (recommended)</li>
              <li>Ensure the Arduino is connected to USB port</li>
              <li>Make sure your user has permission to access /dev/ttyUSB0</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {!isWebSerialSupported && !isRemoteAccess && (
        <Alert variant="destructive" className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Web Serial API not supported</AlertTitle>
          <AlertDescription>
            {isRaspberryPi ? (
              <>
                On Raspberry Pi, this is expected. The system will automatically use:
                <ul className="list-disc list-inside mt-2">
                  <li>WebSocket connection (preferred)</li>
                  <li>Mock data (if WebSocket fails)</li>
                </ul>
                Press "Connect to Arduino" to begin.
              </>
            ) : (
              <>
                Your browser does not support the Web Serial API. 
                Try using Chrome or Edge. The app will use simulated data instead.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {isWebSerialSupported && isSecurityRestricted && !isRemoteAccess && (
        <Alert variant="default" className="mb-4 border-yellow-400 text-yellow-800 bg-yellow-50">
          <Shield className="h-4 w-4" />
          <AlertTitle>Web Serial API restricted</AlertTitle>
          <AlertDescription>
            Access to the Web Serial API is restricted by your browser's security policy.
            This often happens in:
            <ul className="list-disc list-inside mt-2">
              <li>iframes (like this preview)</li>
              <li>non-secure contexts (non-HTTPS sites)</li>
              <li>when browser permissions are denied</li>
            </ul>
            {isRaspberryPi ? (
              <>Press "Connect to Arduino" to use WebSocket connection instead.</>
            ) : (
              <>Try opening this app in a new Chrome or Edge window, or enable auto-detect to use mock data.</>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-col space-y-4 sm:space-y-0">
        {/* Port selection section */}
        {isWebSerialSupported && !isSecurityRestricted && !autoDetect && !isRemoteAccess && (
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="port-select" className="mb-2 block">Serial Port</Label>
              <div className="flex space-x-2 items-center">
                <Select
                  value={selectedPortId}
                  onValueChange={setSelectedPortId}
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
                disabled={connecting || (!autoDetect && !selectedPortId && availablePorts.length > 0 && !isSecurityRestricted && !isRemoteAccess)}
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
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="auto-detect" 
              checked={autoDetect}
              onCheckedChange={handleAutoDetectChange}
              disabled={isRemoteAccess} // Disable when accessing remotely
            />
            <Label htmlFor="auto-detect" className={isRemoteAccess ? "text-gray-400" : ""}>Auto-detect hardware</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  {isRemoteAccess 
                    ? "When accessing remotely, WebSocket connection is always used"
                    : "When enabled, the system will automatically switch between real Arduino data and mock data"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionControl;
