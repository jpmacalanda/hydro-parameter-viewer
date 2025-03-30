
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Droplet } from "lucide-react";
import TimeGraph from './TimeGraph';

interface PHDisplayProps {
  value: number;
  history?: Array<{time: string; value: number}>;
  showGraph?: boolean;
  optimalMin?: number;
  optimalMax?: number;
}

const PHDisplay: React.FC<PHDisplayProps> = ({ 
  value, 
  history = [], 
  showGraph = false,
  optimalMin = 5.5,
  optimalMax = 6.5
}) => {
  // pH typically ranges from 0-14, with 7 being neutral
  const phMin = 0;
  const phMax = 14;
  
  // Calculate progress percentage (0-100)
  const progressPercent = value === 0 ? 0 : (value / phMax) * 100;
  
  // Determine status based on pH value
  const getStatus = () => {
    if (value === 0) return "unavailable";
    if (value < optimalMin) return "low";
    if (value > optimalMax) return "high";
    return "normal";
  };
  
  const status = getStatus();
  
  // Set color based on status
  const getColor = () => {
    switch (status) {
      case "unavailable": return "text-gray-400";
      case "low": return "text-red-500";
      case "high": return "text-yellow-500";
      case "normal": return "text-green-500";
    }
  };
  
  const getBgColor = () => {
    switch (status) {
      case "unavailable": return "bg-gray-400";
      case "low": return "bg-red-500";
      case "high": return "bg-yellow-500";
      case "normal": return "bg-green-500";
    }
  };
  
  const statusText = () => {
    switch (status) {
      case "unavailable": return "No Data";
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
            className={`${getColor()} animate-pulse-slow`} 
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-2">
          <span className="text-3xl font-bold">{value === 0 ? "-" : value.toFixed(1)}</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getBgColor()}`}>
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
              left: `${(optimalMin / phMax) * 100}%`, 
              width: `${((optimalMax - optimalMin) / phMax) * 100}%` 
            }}
          ></div>
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          <p>Target: {optimalMin}-{optimalMax} pH</p>
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
        </div>

        {showGraph && history.length > 0 && (
          <TimeGraph 
            data={history} 
            dataKey="value" 
            color="#8884d8" 
            name="pH Level" 
            min={0}
            max={14}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default PHDisplay;
