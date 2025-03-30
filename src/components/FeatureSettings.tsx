
import React from 'react';
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner";

interface FeatureSettingsProps {
  features: {
    showStatistics: boolean;
    showThresholds: boolean;
    showSystemLogs: boolean;
    showSerialMonitor: boolean;
    useWebSocket: boolean;
  };
  setFeatures: React.Dispatch<React.SetStateAction<{
    showStatistics: boolean;
    showThresholds: boolean;
    showSystemLogs: boolean;
    showSerialMonitor: boolean;
    useWebSocket: boolean;
  }>>;
}

const FeatureSettings: React.FC<FeatureSettingsProps> = ({ features, setFeatures }) => {
  const handleServiceToggle = async (useWebSocket: boolean) => {
    try {
      // Prepare the query parameters
      const params = new URLSearchParams({
        websocket: useWebSocket ? 'on' : 'off',
        monitor: useWebSocket ? 'off' : 'on'
      });
      
      // For Lovable demo environment, simulate API call
      if (window.location.host.includes('lovableproject.com')) {
        console.log("Demo environment detected, simulating service toggle");
        // Update UI without actual API call
        setFeatures(prev => ({
          ...prev,
          useWebSocket
        }));
        
        toast.success(`Switched to ${useWebSocket ? 'WebSocket' : 'Serial Monitor'} service`, {
          description: "This is a simulated response in the demo environment"
        });
        return;
      }
      
      // Make the API call to toggle the service
      const response = await fetch(`/api/system/toggle-service?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle service');
      }
      
      // Parse the response
      const data = await response.json();
      
      if (data.status === 'success') {
        // Update the UI
        setFeatures(prev => ({
          ...prev,
          useWebSocket
        }));
        
        toast.success(data.message || `Switched to ${useWebSocket ? 'WebSocket' : 'Serial Monitor'} service`);
      } else {
        throw new Error(data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error toggling service:', error);
      toast.error('Failed to toggle service', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  const handleFeatureToggle = (feature: string) => {
    setFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold">Feature Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="showStatistics">Show Statistics</Label>
            <Switch
              id="showStatistics"
              checked={features.showStatistics}
              onCheckedChange={() => handleFeatureToggle('showStatistics')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="showThresholds">Show Thresholds</Label>
            <Switch
              id="showThresholds"
              checked={features.showThresholds}
              onCheckedChange={() => handleFeatureToggle('showThresholds')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="showSystemLogs">Show System Logs</Label>
            <Switch
              id="showSystemLogs"
              checked={features.showSystemLogs}
              onCheckedChange={() => handleFeatureToggle('showSystemLogs')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="showSerialMonitor">Show Serial Monitor</Label>
            <Switch
              id="showSerialMonitor"
              checked={features.showSerialMonitor}
              onCheckedChange={() => handleFeatureToggle('showSerialMonitor')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="useWebSocket">Use WebSocket</Label>
            <Switch
              id="useWebSocket"
              checked={features.useWebSocket}
              onCheckedChange={(checked) => handleServiceToggle(checked)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureSettings;
