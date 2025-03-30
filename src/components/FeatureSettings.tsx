
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, BarChart, Gauge, FileText, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Features {
  showStatistics: boolean;
  showThresholds: boolean;
  showSystemLogs: boolean;
  showSerialMonitor: boolean;
}

interface FeatureSettingsProps {
  features: Features;
  setFeatures: React.Dispatch<React.SetStateAction<Features>>;
}

const FeatureSettings: React.FC<FeatureSettingsProps> = ({ features, setFeatures }) => {
  const handleFeatureToggle = (feature: keyof Features) => {
    setFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
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
          </div>
          
          <Button onClick={saveSettings} className="w-full">Save Settings</Button>
          
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold">Note:</p>
            <p>Disabling all diagnostic features (System Logs and Serial Monitor) will hide the Diagnostics tab completely.</p>
            <p>Changes take effect immediately but are not persisted between sessions in this demo.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeatureSettings;
