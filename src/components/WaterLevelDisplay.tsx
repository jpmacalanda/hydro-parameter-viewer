
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplet, BarChart } from "lucide-react";

interface WaterLevelDisplayProps {
  level: 'low' | 'medium' | 'high';
}

const WaterLevelDisplay: React.FC<WaterLevelDisplayProps> = ({ level }) => {
  // Set color based on water level
  const getColor = () => {
    switch (level) {
      case "low": return "hydro-water-low";
      case "medium": return "hydro-water-medium";
      case "high": return "hydro-water-high";
    }
  };
  
  const statusText = () => {
    switch (level) {
      case "low": return "Low";
      case "medium": return "Medium";
      case "high": return "Good";
    }
  };
  
  const getDescription = () => {
    switch (level) {
      case "low": return "Water level is critical. Add water soon!";
      case "medium": return "Water level is acceptable but not optimal.";
      case "high": return "Water level is optimal.";
    }
  };
  
  // Calculate fill heights for the water level indicator
  const getFillHeight = () => {
    switch (level) {
      case "low": return "h-1/4";
      case "medium": return "h-1/2";
      case "high": return "h-3/4";
    }
  };
  
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Water Level</span>
          <BarChart
            size={24} 
            className={`text-${getColor()} animate-pulse-slow`}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <span className="text-2xl font-bold capitalize">{level}</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white bg-${getColor()}`}>
            {statusText()}
          </span>
        </div>
        
        <div className="flex gap-4 items-center">
          {/* Water level indicator */}
          <div className="relative w-16 h-24 border-2 border-gray-300 rounded-b-lg mx-auto">
            <div className={`absolute bottom-0 left-0 right-0 ${getFillHeight()} bg-hydro-blue bg-opacity-60 rounded-b transition-all duration-1000 ease-in-out`}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-hydro-blue bg-opacity-80 animate-pulse"></div>
            </div>
            
            {/* Level markers */}
            <div className="absolute top-1/4 -right-3 w-2 h-0.5 bg-gray-400"></div>
            <div className="absolute top-1/2 -right-3 w-2 h-0.5 bg-gray-400"></div>
            <div className="absolute top-3/4 -right-3 w-2 h-0.5 bg-gray-400"></div>
          </div>
          
          <div className="flex-1">
            <p className="text-sm mb-2">{getDescription()}</p>
            <p className="text-xs text-gray-500">Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WaterLevelDisplay;
