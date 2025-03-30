
import React from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isError: boolean;
  dataReceived: boolean;
  usingMockData: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isError,
  dataReceived,
  usingMockData
}) => {
  const getConnectionTypeText = () => {
    if (!isConnected) return "Disconnected";
    if (isError) return "Connection Error";
    if (isConnected && !dataReceived) return "Connected (No Data)";
    if (usingMockData) return "Connected (Mock Data)";
    return "Connected (Serial Monitor)";
  };
  
  const getConnectionTypeColor = () => {
    if (!isConnected) return "bg-gray-400";
    if (isError) return "bg-red-500";
    if (isConnected && !dataReceived) return "bg-yellow-500";
    if (usingMockData) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="flex items-center">
      <div 
        className={`mr-2 w-3 h-3 rounded-full ${getConnectionTypeColor()}`}
      ></div>
      <span className="text-sm text-gray-600 flex items-center">
        {getConnectionTypeText()}
      </span>
    </div>
  );
};

export default ConnectionStatus;
