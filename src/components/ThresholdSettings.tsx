
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ThresholdSettingsProps {
  phMin: number;
  phMax: number;
  temperatureMin: number;
  temperatureMax: number;
  tdsMin: number;
  tdsMax: number;
  onSave: (thresholds: {
    phMin: number;
    phMax: number;
    temperatureMin: number;
    temperatureMax: number;
    tdsMin: number;
    tdsMax: number;
  }) => void;
}

const ThresholdSettings: React.FC<ThresholdSettingsProps> = ({
  phMin,
  phMax,
  temperatureMin,
  temperatureMax,
  tdsMin,
  tdsMax,
  onSave,
}) => {
  const [localPhMin, setLocalPhMin] = React.useState(phMin.toString());
  const [localPhMax, setLocalPhMax] = React.useState(phMax.toString());
  const [localTempMin, setLocalTempMin] = React.useState(temperatureMin.toString());
  const [localTempMax, setLocalTempMax] = React.useState(temperatureMax.toString());
  const [localTdsMin, setLocalTdsMin] = React.useState(tdsMin.toString());
  const [localTdsMax, setLocalTdsMax] = React.useState(tdsMax.toString());

  const handleSave = () => {
    try {
      // Validate inputs
      const newPhMin = parseFloat(localPhMin);
      const newPhMax = parseFloat(localPhMax);
      const newTempMin = parseFloat(localTempMin);
      const newTempMax = parseFloat(localTempMax);
      const newTdsMin = parseFloat(localTdsMin);
      const newTdsMax = parseFloat(localTdsMax);
      
      // Simple validation
      if (newPhMin >= newPhMax) {
        toast.error("pH minimum must be less than maximum");
        return;
      }
      
      if (newTempMin >= newTempMax) {
        toast.error("Temperature minimum must be less than maximum");
        return;
      }
      
      if (newTdsMin >= newTdsMax) {
        toast.error("TDS minimum must be less than maximum");
        return;
      }
      
      // Additional range validations
      if (newPhMin < 0 || newPhMax > 14) {
        toast.error("pH values must be between 0 and 14");
        return;
      }
      
      // Save changes
      onSave({
        phMin: newPhMin,
        phMax: newPhMax,
        temperatureMin: newTempMin,
        temperatureMax: newTempMax,
        tdsMin: newTdsMin,
        tdsMax: newTdsMax,
      });
      
      toast.success("Threshold values updated successfully");
    } catch (error) {
      toast.error("Please enter valid numbers");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>pH Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="ph-min">Minimum (Acidic Limit)</Label>
            <Input 
              id="ph-min" 
              value={localPhMin} 
              onChange={(e) => setLocalPhMin(e.target.value)}
              type="number" 
              step="0.1"
              min="0"
              max="14"
            />
          </div>
          <div>
            <Label htmlFor="ph-max">Maximum (Alkaline Limit)</Label>
            <Input 
              id="ph-max" 
              value={localPhMax} 
              onChange={(e) => setLocalPhMax(e.target.value)}
              type="number" 
              step="0.1"
              min="0"
              max="14"
            />
          </div>
          <p className="text-xs text-gray-500">Standard range for most plants: 5.5-6.5</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Temperature Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="temp-min">Minimum (°C)</Label>
            <Input 
              id="temp-min" 
              value={localTempMin} 
              onChange={(e) => setLocalTempMin(e.target.value)}
              type="number" 
              step="0.5"
            />
          </div>
          <div>
            <Label htmlFor="temp-max">Maximum (°C)</Label>
            <Input 
              id="temp-max" 
              value={localTempMax} 
              onChange={(e) => setLocalTempMax(e.target.value)}
              type="number" 
              step="0.5"
            />
          </div>
          <p className="text-xs text-gray-500">Standard range: 18-26°C</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>TDS Thresholds (PPM)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="tds-min">Minimum</Label>
            <Input 
              id="tds-min" 
              value={localTdsMin} 
              onChange={(e) => setLocalTdsMin(e.target.value)}
              type="number" 
              step="10"
              min="0"
            />
          </div>
          <div>
            <Label htmlFor="tds-max">Maximum</Label>
            <Input 
              id="tds-max" 
              value={localTdsMax} 
              onChange={(e) => setLocalTdsMax(e.target.value)}
              type="number" 
              step="10"
              min="0"
            />
          </div>
          <p className="text-xs text-gray-500">Standard range: 500-1000 PPM</p>
        </CardContent>
      </Card>
      
      <div className="col-span-1 md:col-span-2 lg:col-span-3">
        <Button onClick={handleSave} className="w-full">Save Threshold Changes</Button>
      </div>
    </div>
  );
};

export default ThresholdSettings;
