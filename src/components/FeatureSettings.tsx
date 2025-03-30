
import React from 'react';
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface FeatureSettingsProps {
  features: {
    showStatistics: boolean;
    showThresholds: boolean;
    showSystemLogs: boolean;
    showSerialMonitor: boolean;
  };
  setFeatures: React.Dispatch<React.SetStateAction<{
    showStatistics: boolean;
    showThresholds: boolean;
    showSystemLogs: boolean;
    showSerialMonitor: boolean;
  }>>;
}

const FeatureSettings: React.FC<FeatureSettingsProps> = ({ features, setFeatures }) => {
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
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureSettings;
