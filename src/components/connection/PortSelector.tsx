
import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCcw, AlertCircle } from "lucide-react";
import { SerialPortInfo } from "@/services/types/serial.types";

interface PortSelectorProps {
  availablePorts: SerialPortInfo[];
  selectedPortId: string;
  setSelectedPortId: (id: string) => void;
  fetchAvailablePorts: () => void;
  loadingPorts: boolean;
  isConnected: boolean;
  portStatus: {busy: boolean, message: string};
}

const PortSelector: React.FC<PortSelectorProps> = ({
  availablePorts,
  selectedPortId,
  setSelectedPortId,
  fetchAvailablePorts,
  loadingPorts,
  isConnected,
  portStatus
}) => {
  return (
    <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4 mb-4">
      <div className="flex-1">
        <Label htmlFor="port-select" className="mb-2 block">Serial Port</Label>
        <div className="flex space-x-2 items-center">
          <Select
            value={selectedPortId}
            onValueChange={(value) => {
              setSelectedPortId(value);
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
  );
};

export default PortSelector;
