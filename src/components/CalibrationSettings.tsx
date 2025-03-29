
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BeakerIcon, FlaskConical } from "lucide-react";

interface CalibrationSettingsProps {
  onSaveCalibration: (calibrationData: {
    phCalibrationConstant: number;
    tdsCalibrationFactor: number;
  }) => void;
  initialValues: {
    phCalibrationConstant: number;
    tdsCalibrationFactor: number;
  };
}

const CalibrationSettings: React.FC<CalibrationSettingsProps> = ({
  onSaveCalibration,
  initialValues
}) => {
  const [phCalibrationConstant, setPhCalibrationConstant] = useState(initialValues.phCalibrationConstant);
  const [tdsCalibrationFactor, setTdsCalibrationFactor] = useState(initialValues.tdsCalibrationFactor);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (phCalibrationConstant < 0.5 || phCalibrationConstant > 1.5) {
      toast.error("pH calibration constant should be between 0.5 and 1.5");
      return;
    }
    
    if (tdsCalibrationFactor < 0.5 || tdsCalibrationFactor > 2) {
      toast.error("TDS calibration factor should be between 0.5 and 2");
      return;
    }
    
    onSaveCalibration({
      phCalibrationConstant,
      tdsCalibrationFactor
    });
    
    toast.success("Calibration settings saved successfully");
  };
  
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Sensor Calibration</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BeakerIcon className="h-5 w-5 text-hydro-dark" />
                <Label htmlFor="phCalibration" className="text-md font-medium">pH Calibration Constant</Label>
              </div>
              <div className="space-y-1">
                <Input
                  id="phCalibration"
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="1.5"
                  value={phCalibrationConstant}
                  onChange={(e) => setPhCalibrationConstant(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-sm text-gray-500">
                  Typical range is 0.8-1.2. Adjust this value when the sensor readings don't match known calibration solutions.
                </p>
              </div>
            </div>
            
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-hydro-dark" />
                <Label htmlFor="tdsCalibration" className="text-md font-medium">TDS Calibration Factor</Label>
              </div>
              <div className="space-y-1">
                <Input
                  id="tdsCalibration"
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="2"
                  value={tdsCalibrationFactor}
                  onChange={(e) => setTdsCalibrationFactor(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-sm text-gray-500">
                  Recommended range is 0.5-2.0. Increase this value if your TDS meter reads lower than expected.
                </p>
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <Button type="submit" className="w-full">
              Save Calibration Settings
            </Button>
          </div>
        </form>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">Calibration Guide</h3>
          <ul className="text-sm text-blue-700 space-y-2">
            <li>• Use known reference solutions (pH 4, 7, 10 buffers for pH or 500/1000 PPM solutions for TDS)</li>
            <li>• Adjust constants until sensor readings match reference values</li>
            <li>• Rinse sensors thoroughly between calibrations</li>
            <li>• Calibrate in room temperature conditions (20-25°C)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalibrationSettings;
