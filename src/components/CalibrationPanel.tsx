
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Beaker, Flask, ArrowRight, RotateCcw } from "lucide-react";

interface CalibrationPanelProps {
  onCalibrate: (calibrationData: {
    phOffset: number;
    tdsCalibrationFactor: number;
  }) => void;
  initialValues: {
    phOffset: number;
    tdsCalibrationFactor: number;
  };
}

const CalibrationPanel: React.FC<CalibrationPanelProps> = ({
  onCalibrate,
  initialValues
}) => {
  const [phOffset, setPhOffset] = useState(initialValues.phOffset);
  const [tdsCalibrationFactor, setTdsCalibrationFactor] = useState(initialValues.tdsCalibrationFactor);
  
  const [phKnownSolution, setPhKnownSolution] = useState(7.0);
  const [phCurrentReading, setPhCurrentReading] = useState(7.0);
  
  const [tdsKnownSolution, setTdsKnownSolution] = useState(500);
  const [tdsCurrentReading, setTdsCurrentReading] = useState(500);
  
  // Reset calibration to defaults
  const handleReset = () => {
    setPhOffset(0);
    setTdsCalibrationFactor(1.0);
    
    onCalibrate({
      phOffset: 0,
      tdsCalibrationFactor: 1.0
    });
    
    toast.success("Calibration reset to default values", {
      description: "All calibration values have been reset to factory defaults"
    });
  };
  
  // Calculate pH calibration from a known solution
  const calculatePhCalibration = () => {
    // Calculate the difference between known solution and current reading
    const newOffset = phKnownSolution - phCurrentReading;
    setPhOffset(newOffset);
    
    onCalibrate({
      phOffset: newOffset,
      tdsCalibrationFactor
    });
    
    toast.success("pH Calibration applied", {
      description: `pH offset set to ${newOffset.toFixed(2)}`
    });
  };
  
  // Calculate TDS calibration from a known solution
  const calculateTdsCalibration = () => {
    // Avoid division by zero
    if (tdsCurrentReading === 0) {
      toast.error("Current TDS reading cannot be zero");
      return;
    }
    
    // Calculate calibration factor (known / current)
    const newFactor = tdsKnownSolution / tdsCurrentReading;
    setTdsCalibrationFactor(newFactor);
    
    onCalibrate({
      phOffset,
      tdsCalibrationFactor: newFactor
    });
    
    toast.success("TDS Calibration applied", {
      description: `TDS calibration factor set to ${newFactor.toFixed(2)}`
    });
  };
  
  // Apply manual calibration values
  const applyManualCalibration = () => {
    onCalibrate({
      phOffset,
      tdsCalibrationFactor
    });
    
    toast.success("Manual calibration applied successfully");
  };
  
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Sensor Calibration</CardTitle>
        <CardDescription>
          Calibrate your pH and TDS sensors for accurate readings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="guided" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="guided">Guided Calibration</TabsTrigger>
            <TabsTrigger value="manual">Manual Calibration</TabsTrigger>
          </TabsList>
          
          <TabsContent value="guided" className="space-y-6">
            <div className="space-y-6">
              {/* pH Calibration Section */}
              <div className="p-4 border rounded-lg space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Beaker className="h-5 w-5 text-blue-600" />
                  pH Calibration
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ph-known">Known Solution pH Value</Label>
                    <Input
                      id="ph-known"
                      type="number"
                      step="0.1"
                      min="0"
                      max="14"
                      value={phKnownSolution}
                      onChange={(e) => setPhKnownSolution(parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-gray-500">
                      The pH value of your calibration solution (usually 4.0, 7.0, or 10.0)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ph-current">Current Sensor Reading</Label>
                    <Input
                      id="ph-current"
                      type="number"
                      step="0.1"
                      min="0"
                      max="14"
                      value={phCurrentReading}
                      onChange={(e) => setPhCurrentReading(parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-gray-500">
                      The pH value your sensor is currently reporting
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 py-2 my-2">
                  <div className="flex-1 text-center">
                    <span className="text-lg font-semibold">{phCurrentReading.toFixed(1)}</span>
                    <p className="text-xs text-gray-500">Current</p>
                  </div>
                  <ArrowRight className="text-gray-400" />
                  <div className="flex-1 text-center">
                    <span className="text-lg font-semibold">{phKnownSolution.toFixed(1)}</span>
                    <p className="text-xs text-gray-500">Target</p>
                  </div>
                  <ArrowRight className="text-gray-400" />
                  <div className="flex-1 text-center">
                    <span className="text-lg font-semibold text-blue-600">{(phKnownSolution - phCurrentReading).toFixed(2)}</span>
                    <p className="text-xs text-gray-500">Offset</p>
                  </div>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={calculatePhCalibration}
                >
                  Apply pH Calibration
                </Button>
              </div>
              
              {/* TDS Calibration Section */}
              <div className="p-4 border rounded-lg space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Flask className="h-5 w-5 text-green-600" />
                  TDS Calibration
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tds-known">Known Solution TDS Value (PPM)</Label>
                    <Input
                      id="tds-known"
                      type="number"
                      step="10"
                      min="0"
                      max="3000"
                      value={tdsKnownSolution}
                      onChange={(e) => setTdsKnownSolution(parseInt(e.target.value, 10))}
                    />
                    <p className="text-xs text-gray-500">
                      The TDS value of your calibration solution (usually 500 or 1000 PPM)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tds-current">Current Sensor Reading (PPM)</Label>
                    <Input
                      id="tds-current"
                      type="number"
                      step="10"
                      min="1"
                      max="3000"
                      value={tdsCurrentReading}
                      onChange={(e) => setTdsCurrentReading(parseInt(e.target.value, 10))}
                    />
                    <p className="text-xs text-gray-500">
                      The TDS value your sensor is currently reporting
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 py-2 my-2">
                  <div className="flex-1 text-center">
                    <span className="text-lg font-semibold">{tdsCurrentReading}</span>
                    <p className="text-xs text-gray-500">Current</p>
                  </div>
                  <ArrowRight className="text-gray-400" />
                  <div className="flex-1 text-center">
                    <span className="text-lg font-semibold">{tdsKnownSolution}</span>
                    <p className="text-xs text-gray-500">Target</p>
                  </div>
                  <ArrowRight className="text-gray-400" />
                  <div className="flex-1 text-center">
                    <span className="text-lg font-semibold text-green-600">
                      {tdsCurrentReading === 0 ? "-" : (tdsKnownSolution / tdsCurrentReading).toFixed(2)}
                    </span>
                    <p className="text-xs text-gray-500">Factor</p>
                  </div>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={calculateTdsCalibration}
                >
                  Apply TDS Calibration
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="manual" className="space-y-6">
            <div className="space-y-6">
              {/* Manual pH Calibration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Beaker className="h-5 w-5 text-blue-600" />
                  Manual pH Offset Adjustment
                </h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="ph-offset">pH Offset: {phOffset.toFixed(2)}</Label>
                    <span className="text-sm text-gray-500">
                      Range: -2.0 to 2.0
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Slider
                      id="ph-offset"
                      min={-2.0}
                      max={2.0}
                      step={0.1}
                      value={[phOffset]}
                      onValueChange={(values) => setPhOffset(values[0])}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={-2.0}
                      max={2.0}
                      step={0.1}
                      value={phOffset}
                      onChange={(e) => setPhOffset(parseFloat(e.target.value))}
                      className="w-20"
                    />
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    Positive values make pH readings higher, negative values make pH readings lower
                  </p>
                </div>
              </div>
              
              {/* Manual TDS Calibration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Flask className="h-5 w-5 text-green-600" />
                  Manual TDS Calibration Factor
                </h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="tds-factor">TDS Factor: {tdsCalibrationFactor.toFixed(2)}</Label>
                    <span className="text-sm text-gray-500">
                      Range: 0.5 to 2.0
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Slider
                      id="tds-factor"
                      min={0.5}
                      max={2.0}
                      step={0.01}
                      value={[tdsCalibrationFactor]}
                      onValueChange={(values) => setTdsCalibrationFactor(values[0])}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={0.5}
                      max={2.0}
                      step={0.01}
                      value={tdsCalibrationFactor}
                      onChange={(e) => setTdsCalibrationFactor(parseFloat(e.target.value))}
                      className="w-20"
                    />
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    Values greater than 1.0 increase TDS readings, values less than 1.0 decrease TDS readings
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 flex items-center justify-center gap-2"
                  onClick={handleReset}
                >
                  <RotateCcw size={16} />
                  Reset to Defaults
                </Button>
                <Button 
                  className="flex-1"
                  onClick={applyManualCalibration}
                >
                  Apply Manual Calibration
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">Calibration Guide</h3>
          <ul className="text-sm text-blue-700 space-y-2">
            <li>• For pH: Use buffer solutions (pH 4.0, 7.0, 10.0) for most accurate calibration</li>
            <li>• For TDS: Use standard solutions (500 PPM, 1000 PPM) for calibration</li>
            <li>• Clean sensors with distilled water before and after calibration</li>
            <li>• Calibrate at room temperature (20-25°C) for best results</li>
            <li>• Recalibrate regularly (every 2-4 weeks) for continued accuracy</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalibrationPanel;
