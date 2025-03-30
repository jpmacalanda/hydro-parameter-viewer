import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface TimeGraphProps {
  data: Array<{time: string; value: number}>;
  dataKey: string;
  color: string;
  unit?: string;
  name: string;
  min?: number;
  max?: number;
}

const TimeGraph: React.FC<TimeGraphProps> = ({ 
  data, 
  dataKey, 
  color, 
  unit = '', 
  name,
  min,
  max
}) => {
  const config = {
    [dataKey]: {
      label: name,
      color,
    }
  };

  const formatY = (value: number) => {
    return `${value}${unit}`;
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    
    try {
      if (time.includes('T') && time.includes('Z')) {
        const date = new Date(time);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return time;
    } catch (error) {
      return time;
    }
  };

  return (
    <Card className="mt-4">
      <CardContent className="pt-4">
        <ChartContainer config={config} className="h-[180px] w-full">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              fontSize={10}
              tickFormatter={formatTime}
            />
            <YAxis 
              domain={[min !== undefined ? min : 'auto', max !== undefined ? max : 'auto']}
              tickFormatter={formatY}
              fontSize={10}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent 
                  labelFormatter={(value) => `Time: ${formatTime(value)}`}
                />
              }
            />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
              isAnimationActive={true}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default TimeGraph;
