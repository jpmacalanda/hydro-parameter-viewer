
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Timer, Clock } from "lucide-react";

interface DataResolutionSettingsProps {
  dataResolution: number; // in milliseconds
  onChangeResolution: (resolution: number) => void;
}

const DataResolutionSettings: React.FC<DataResolutionSettingsProps> = ({ 
  dataResolution, 
  onChangeResolution 
}) => {
  const handleResolutionChange = (value: string) => {
    onChangeResolution(parseInt(value, 10));
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer size={20} />
          Data Recording Resolution
        </CardTitle>
        <CardDescription>
          Control how frequently sensor data is recorded in the history
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <RadioGroup 
            value={dataResolution.toString()} 
            onValueChange={handleResolutionChange}
          >
            <div className="flex items-center space-x-2 py-2">
              <RadioGroupItem value="1000" id="r1" />
              <Label htmlFor="r1" className="flex items-center gap-2">
                <Clock size={16} className="text-green-600" />
                Real-time (every second)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 py-2">
              <RadioGroupItem value="30000" id="r2" />
              <Label htmlFor="r2" className="cursor-pointer">Every 30 seconds</Label>
            </div>
            
            <div className="flex items-center space-x-2 py-2">
              <RadioGroupItem value="60000" id="r3" />
              <Label htmlFor="r3" className="cursor-pointer">Every minute</Label>
            </div>
          </RadioGroup>
          
          <div className="text-sm text-muted-foreground mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="font-medium text-blue-700 mb-1">Note:</p>
            <p>Real-time data is always displayed immediately regardless of this setting.</p>
            <p>This only affects how frequently data is saved to the historical record.</p>
            <p>Higher recording frequencies will consume more memory.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataResolutionSettings;
