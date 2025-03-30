
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Droplet } from "lucide-react";
import TimeGraph from './TimeGraph';

interface TDSDisplayProps {
  value: number;
  history?: Array<{time: string; value: number}>;
  showGraph?: boolean;
  optimalMin?: number;
  optimalMax?: number;
}

const TDSDisplay: React.FC<TDSDisplayProps> = ({ 
  value, 
  history = [], 
  showGraph = false,
  optimalMin = 500,
  optimalMax = 1000
}) => {
  // TDS ranges for hydroponics (in PPM)
  const tdsMin = 0;
  const tdsMax = 2000;
  
  // Calculate progress percentage (0-100)
  const progressPercent = value === 0 ? 0 : (value / tdsMax) * 100;
  
  // Determine status based on TDS value
  const getStatus = () => {
    if (value === 0) return "unavailable";
    if (value < optimalMin) return "low";
    if (value > optimalMax) return "high";
    return "normal";
  };
  
  const status = getStatus();
  
  // Set colors based on TDS status
  const getColor = () => {
    switch (status) {
      case "unavailable": return "hydro-unavailable";
      case "low": return "hydro-ph-low";
      case "high": return "hydro-ph-high";
      case "normal": return "hydro-ph-normal";
    }
  };
  
  const statusText = () => {
    switch (status) {
      case "unavailable": return "No Data";
      case "low": return "Too Low";
      case "high": return "Too High";
      case "normal": return "Optimal";
    }
  };

  // Check if TDS is in the optimal range
  const isOptimal = status === "normal";
  
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>TDS Level (Nutrients)</span>
          <Droplet 
            size={24} 
            className={`text-${getColor()} animate-pulse-slow`} 
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-2">
          <span className="text-3xl font-bold">{value === 0 ? "-" : `${value} PPM`}</span>
          {isOptimal ? (
            <span className="px-2 py-1 rounded-full text-xs font-medium text-white bg-green-500">
              Optimal
            </span>
          ) : (
            <span className={`px-2 py-1 rounded-full text-xs font-medium text-white bg-${getColor()}`}>
              {statusText()}
            </span>
          )}
        </div>
        
        <div className="relative pt-1">
          <div className="flex justify-between text-xs mb-1">
            <span>Low</span>
            <span>Optimal</span>
            <span>High</span>
          </div>
          <Progress 
            value={progressPercent} 
            className="h-2 bg-gray-200"
          />
          <div className="mt-1 flex justify-between text-xs">
            <span>{tdsMin}</span>
            <span></span>
            <span>{tdsMax} PPM</span>
          </div>
          
          {/* Optimal range indicator */}
          <div 
            className="absolute h-3 bg-green-200 opacity-40 top-[18px] rounded-sm" 
            style={{ 
              left: `${(optimalMin / tdsMax) * 100}%`, 
              width: `${((optimalMax - optimalMin) / tdsMax) * 100}%` 
            }}
          ></div>
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          <p>Target: {optimalMin}-{optimalMax} PPM</p>
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
        </div>

        {showGraph && history.length > 0 && (
          <TimeGraph 
            data={history} 
            dataKey="value" 
            color="#82ca9d" 
            unit=" PPM"
            name="TDS Level" 
            min={0}
            max={2000}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default TDSDisplay;
