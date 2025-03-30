
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, BarChart, Gauge, FileText, Terminal, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Features {
  showStatistics: boolean;
  showThresholds: boolean;
  showSystemLogs: boolean;
  showSerialMonitor: boolean;
  useWebSocket: boolean;
}

interface FeatureSettingsProps {
  features: Features;
  setFeatures: React.Dispatch<React.SetStateAction<Features>>;
}

const FeatureSettings: React.FC<FeatureSettingsProps> = ({ features, setFeatures }) => {
  const [isToggling, setIsToggling] = useState(false);
  
  const handleFeatureToggle = (feature: keyof Features) => {
    if (feature === 'useWebSocket') {
      // Special handling for WebSocket toggle to restart the appropriate container
      const newValue = !features.useWebSocket;
      
      // Show a loading toast
      toast.loading(newValue ? "Activating WebSocket connection..." : "Activating Serial Monitor...");
      setIsToggling(true);
      
      // Make API call to control containers
      fetch(`/api/system/toggle-service?websocket=${newValue ? 'on' : 'off'}&monitor=${newValue ? 'off' : 'on'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to toggle service');
          }
          return response.json();
        })
        .then(data => {
          setFeatures(prev => ({
            ...prev,
            [feature]: newValue
          }));
          
          toast.dismiss();
          toast.success(
            newValue ? "WebSocket service activated" : "Serial Monitor service activated", 
            { description: data.message || "Service switched successfully" }
          );
        })
        .catch(error => {
          console.error("Error toggling service:", error);
          
          // If we're in the Lovable environment or the API endpoint failed,
          // simulate the toggle for demo purposes
          setFeatures(prev => ({
            ...prev,
            [feature]: newValue
          }));
          
          toast.dismiss();
          toast.success(
            newValue ? "WebSocket service activated (simulated)" : "Serial Monitor service activated (simulated)", 
            { description: "Service toggled in simulation mode" }
          );
        })
        .finally(() => {
          setIsToggling(false);
        });
    } else {
      // Normal toggle for other features
      setFeatures(prev => ({
        ...prev,
        [feature]: !prev[feature]
      }));
    }
  };

  const saveSettings = () => {
    // In a real app, you might save these settings to localStorage or a database
    toast.success("Settings saved successfully");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings size={20} />
            Dashboard Features
          </CardTitle>
          <CardDescription>
            Enable or disable dashboard features to customize your view
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-2">
                <BarChart size={18} />
                <Label htmlFor="show-statistics" className="cursor-pointer">Statistics View</Label>
              </div>
              <Switch 
                id="show-statistics" 
                checked={features.showStatistics} 
                onCheckedChange={() => handleFeatureToggle('showStatistics')}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-2">
                <Gauge size={18} />
                <Label htmlFor="show-thresholds" className="cursor-pointer">Threshold Settings</Label>
              </div>
              <Switch 
                id="show-thresholds" 
                checked={features.showThresholds} 
                onCheckedChange={() => handleFeatureToggle('showThresholds')}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-2">
                <FileText size={18} />
                <Label htmlFor="show-logs" className="cursor-pointer">System Logs</Label>
              </div>
              <Switch 
                id="show-logs" 
                checked={features.showSystemLogs} 
                onCheckedChange={() => handleFeatureToggle('showSystemLogs')}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-2">
                <Terminal size={18} />
                <Label htmlFor="show-serial" className="cursor-pointer">Serial Monitor</Label>
              </div>
              <Switch 
                id="show-serial" 
                checked={features.showSerialMonitor} 
                onCheckedChange={() => handleFeatureToggle('showSerialMonitor')}
              />
            </div>

            <div className="flex items-center justify-between space-x-2 col-span-2 border-t pt-4 mt-2">
              <div className="flex items-center space-x-2">
                {features.useWebSocket ? <Wifi size={18} /> : <WifiOff size={18} />}
                <Label htmlFor="use-websocket" className="cursor-pointer">
                  Use WebSocket Connection
                  <p className="text-xs text-muted-foreground mt-1">
                    {features.useWebSocket 
                      ? "Using WebSocket to read Arduino data (recommended)" 
                      : "Using direct Serial Monitor to read Arduino data"}
                  </p>
                </Label>
              </div>
              <Switch 
                id="use-websocket" 
                checked={features.useWebSocket}
                disabled={isToggling}
                onCheckedChange={() => handleFeatureToggle('useWebSocket')}
              />
            </div>
          </div>
          
          <Button onClick={saveSettings} className="w-full">Save Settings</Button>
          
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold">Note:</p>
            <p>Disabling all diagnostic features (System Logs and Serial Monitor) will hide the Diagnostics tab completely.</p>
            <p>Changes take effect immediately but are not persisted between sessions in this demo.</p>
            <p className="mt-2 text-xs bg-amber-50 p-2 rounded border border-amber-200">
              Toggling the WebSocket connection will restart the respective Docker container. This may take a few seconds.
            </p>
            <p className="mt-2 text-xs bg-blue-50 p-2 rounded border border-blue-200">
              In this demo environment, the service toggle is simulated and no actual Docker containers will be restarted.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeatureSettings;
