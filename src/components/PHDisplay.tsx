
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Droplet } from "lucide-react";

interface PHDisplayProps {
  value: number;
}

const PHDisplay: React.FC<PHDisplayProps> = ({ value }) => {
  // pH typically ranges from 0-14, with 7 being neutral
  // For hydroponics, optimal range is usually 5.5-6.5
  const phMin = 0;
  const phMax = 14;
  const phOptimalMin = 5.5;
  const phOptimalMax = 6.5;
  
  // Calculate progress percentage (0-100)
  const progressPercent = (value / phMax) * 100;
  
  // Determine status based on pH value
  const getStatus = () => {
    if (value < phOptimalMin) return "low";
    if (value > phOptimalMax) return "high";
    return "normal";
  };
  
  const status = getStatus();
  
  // Set color based on status
  const getColor = () => {
    switch (status) {
      case "low": return "hydro-ph-low";
      case "high": return "hydro-ph-high";
      case "normal": return "hydro-ph-normal";
    }
  };
  
  const statusText = () => {
    switch (status) {
      case "low": return "Too Acidic";
      case "high": return "Too Alkaline";
      case "normal": return "Optimal";
    }
  };
  
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>pH Level</span>
          <Droplet 
            size={24} 
            className={`text-${getColor()} animate-pulse-slow`} 
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-2">
          <span className="text-3xl font-bold">{value.toFixed(1)}</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white bg-${getColor()}`}>
            {statusText()}
          </span>
        </div>
        
        <div className="relative pt-1">
          <div className="flex justify-between text-xs mb-1">
            <span>Acidic</span>
            <span>Neutral</span>
            <span>Alkaline</span>
          </div>
          <Progress 
            value={progressPercent} 
            className="h-2 bg-gray-200"
          />
          <div className="mt-1 flex justify-between text-xs">
            <span>0</span>
            <span>7</span>
            <span>14</span>
          </div>
          
          {/* Optimal range indicator */}
          <div 
            className="absolute h-3 bg-green-200 opacity-40 top-[18px] rounded-sm" 
            style={{ 
              left: `${(phOptimalMin / phMax) * 100}%`, 
              width: `${((phOptimalMax - phOptimalMin) / phMax) * 100}%` 
            }}
          ></div>
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          <p>Target: 5.5-6.5 pH</p>
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PHDisplay;
