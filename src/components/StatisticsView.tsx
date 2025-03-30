import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, ChartBar, Clock } from "lucide-react";
import { SerialData } from '@/services/types/serial.types';

interface StatisticsViewProps {
  sensorData: SerialData;
}

const generateDailyData = () => {
  const data = [];
  const today = new Date();
  
  for (let i = 0; i < 24; i++) {
    const time = new Date(today);
    time.setHours(today.getHours() - 24 + i);
    
    data.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ph: Number((Math.random() * 2 + 5).toFixed(1)),
      temperature: Number((Math.random() * 8 + 20).toFixed(1)),
      tds: Math.floor(Math.random() * 500 + 500)
    });
  }
  
  return data;
};

const generateWeeklyData = () => {
  const data = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - 6 + i);
    
    data.push({
      date: date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
      avgPh: Number((Math.random() * 1.5 + 5.5).toFixed(1)),
      avgTemperature: Number((Math.random() * 5 + 21).toFixed(1)),
      avgTds: Math.floor(Math.random() * 300 + 600)
    });
  }
  
  return data;
};

const StatisticsView: React.FC<StatisticsViewProps> = ({ sensorData }) => {
  const [statsTab, setStatsTab] = useState<"daily" | "weekly">("daily");
  const [dailyData, setDailyData] = useState(generateDailyData());
  const [weeklyData, setWeeklyData] = useState(generateWeeklyData());
  
  const dailyStats = {
    ph: {
      avg: Number((dailyData.reduce((sum, item) => sum + item.ph, 0) / dailyData.length).toFixed(1)),
      min: Number(Math.min(...dailyData.map(item => item.ph)).toFixed(1)),
      max: Number(Math.max(...dailyData.map(item => item.ph)).toFixed(1))
    },
    temperature: {
      avg: Number((dailyData.reduce((sum, item) => sum + item.temperature, 0) / dailyData.length).toFixed(1)),
      min: Number(Math.min(...dailyData.map(item => item.temperature)).toFixed(1)),
      max: Number(Math.max(...dailyData.map(item => item.temperature)).toFixed(1))
    },
    tds: {
      avg: Math.floor(dailyData.reduce((sum, item) => sum + item.tds, 0) / dailyData.length),
      min: Math.min(...dailyData.map(item => item.tds)),
      max: Math.max(...dailyData.map(item => item.tds))
    }
  };
  
  const weeklyStats = {
    ph: {
      trend: weeklyData[weeklyData.length - 1].avgPh > weeklyData[0].avgPh ? "increasing" : "decreasing",
      changePct: Math.abs(Number((((weeklyData[weeklyData.length - 1].avgPh - weeklyData[0].avgPh) / weeklyData[0].avgPh) * 100).toFixed(1)))
    },
    temperature: {
      trend: weeklyData[weeklyData.length - 1].avgTemperature > weeklyData[0].avgTemperature ? "increasing" : "decreasing",
      changePct: Math.abs(Number((((weeklyData[weeklyData.length - 1].avgTemperature - weeklyData[0].avgTemperature) / weeklyData[0].avgTemperature) * 100).toFixed(1)))
    },
    tds: {
      trend: weeklyData[weeklyData.length - 1].avgTds > weeklyData[0].avgTds ? "increasing" : "decreasing",
      changePct: Math.abs(Number((((weeklyData[weeklyData.length - 1].avgTds - weeklyData[0].avgTds) / weeklyData[0].avgTds) * 100).toFixed(1)))
    }
  };
  
  return (
    <div className="space-y-6">
      <Tabs value={statsTab} onValueChange={(value) => setStatsTab(value as "daily" | "weekly")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <Clock size={16} />
            <span>Daily Statistics</span>
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <Calendar size={16} />
            <span>Weekly Statistics</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="daily" className="space-y-6">
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <ChartBar className="mr-2 h-5 w-5" />
                24-Hour Parameter Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dailyData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <YAxis yAxisId="tds" orientation="right" allowDataOverflow />
                    <Tooltip />
                    <Legend />
                    <Area 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="ph" 
                      name="pH" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.3} 
                    />
                    <Area 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="temperature" 
                      name="Temp (°C)" 
                      stroke="#ff7300" 
                      fill="#ff7300" 
                      fillOpacity={0.3} 
                    />
                    <Area 
                      yAxisId="tds" 
                      type="monotone" 
                      dataKey="tds" 
                      name="TDS (PPM)" 
                      stroke="#82ca9d" 
                      fill="#82ca9d" 
                      fillOpacity={0.3} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6">
                <h3 className="text-md font-medium mb-3">24-Hour Summary</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parameter</TableHead>
                      <TableHead>Average</TableHead>
                      <TableHead>Minimum</TableHead>
                      <TableHead>Maximum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">pH</TableCell>
                      <TableCell>{dailyStats.ph.avg}</TableCell>
                      <TableCell>{dailyStats.ph.min}</TableCell>
                      <TableCell>{dailyStats.ph.max}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Temperature (°C)</TableCell>
                      <TableCell>{dailyStats.temperature.avg}</TableCell>
                      <TableCell>{dailyStats.temperature.min}</TableCell>
                      <TableCell>{dailyStats.temperature.max}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">TDS (PPM)</TableCell>
                      <TableCell>{dailyStats.tds.avg}</TableCell>
                      <TableCell>{dailyStats.tds.min}</TableCell>
                      <TableCell>{dailyStats.tds.max}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="weekly" className="space-y-6">
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <ChartBar className="mr-2 h-5 w-5" />
                Weekly Parameter Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={weeklyData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <YAxis yAxisId="tds" orientation="right" allowDataOverflow />
                    <Tooltip />
                    <Legend />
                    <Area 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="avgPh" 
                      name="Avg pH" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.3} 
                    />
                    <Area 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="avgTemperature" 
                      name="Avg Temp (°C)" 
                      stroke="#ff7300" 
                      fill="#ff7300" 
                      fillOpacity={0.3} 
                    />
                    <Area 
                      yAxisId="tds" 
                      type="monotone" 
                      dataKey="avgTds" 
                      name="Avg TDS (PPM)" 
                      stroke="#82ca9d" 
                      fill="#82ca9d" 
                      fillOpacity={0.3} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6">
                <h3 className="text-md font-medium mb-3">Weekly Trends</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parameter</TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead>Change %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">pH</TableCell>
                      <TableCell className={
                        weeklyStats.ph.trend === "increasing" ? "text-green-600" : "text-red-600"
                      }>
                        {weeklyStats.ph.trend}
                      </TableCell>
                      <TableCell>{weeklyStats.ph.changePct}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Temperature</TableCell>
                      <TableCell className={
                        weeklyStats.temperature.trend === "increasing" ? "text-green-600" : "text-red-600"
                      }>
                        {weeklyStats.temperature.trend}
                      </TableCell>
                      <TableCell>{weeklyStats.temperature.changePct}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">TDS</TableCell>
                      <TableCell className={
                        weeklyStats.tds.trend === "increasing" ? "text-green-600" : "text-red-600"
                      }>
                        {weeklyStats.tds.trend}
                      </TableCell>
                      <TableCell>{weeklyStats.tds.changePct}%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatisticsView;
