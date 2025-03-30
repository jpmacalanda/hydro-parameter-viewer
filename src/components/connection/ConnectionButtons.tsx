
import React from 'react';
import { Button } from "@/components/ui/button";

interface ConnectionButtonsProps {
  isConnected: boolean;
  connecting: boolean;
  handleConnect: () => void;
  handleDisconnect: () => void;
  canConnect: boolean;
}

const ConnectionButtons: React.FC<ConnectionButtonsProps> = ({
  isConnected,
  connecting,
  handleConnect,
  handleDisconnect,
  canConnect
}) => {
  return (
    <>
      {!isConnected ? (
        <Button 
          onClick={handleConnect}
          variant="default"
          className="bg-hydro-blue hover:bg-hydro-blue/90"
          disabled={connecting || !canConnect}
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
    </>
  );
};

export default ConnectionButtons;
