
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Archive, FileText } from "lucide-react";
import { toast } from "sonner";
import { SerialData } from "@/services/types/serial.types";
import { convertToCSV, downloadCSV, getFormattedDate } from "@/utils/csvUtils";

interface ArchiveSettingsProps {
  sensorData: SerialData;
  dataHistory?: SerialData[];
}

const ArchiveSettings: React.FC<ArchiveSettingsProps> = ({ sensorData, dataHistory = [] }) => {
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  
  // Handle download of current data point
  const handleDownloadCurrent = () => {
    const csvContent = convertToCSV([sensorData], includeTimestamp);
    const filename = `hydroponics-current-${getFormattedDate()}.csv`;
    downloadCSV(csvContent, filename);
    toast.success("Current data downloaded", {
      description: `Saved as ${filename}`
    });
  };
  
  // Handle download of historical data
  const handleDownloadHistory = () => {
    // If no history, use current data as fallback
    const dataToExport = dataHistory.length > 0 ? dataHistory : [sensorData];
    const csvContent = convertToCSV(dataToExport, includeTimestamp);
    const filename = `hydroponics-history-${getFormattedDate()}.csv`;
    downloadCSV(csvContent, filename);
    toast.success("Historical data downloaded", {
      description: `Saved as ${filename} with ${dataToExport.length} records`
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive size={20} />
            Archive Data
          </CardTitle>
          <CardDescription>
            Download your sensor data in CSV format for record keeping or analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-2">
              <FileText size={18} />
              <Label htmlFor="include-timestamp" className="cursor-pointer">Include timestamp in CSV</Label>
            </div>
            <Switch 
              id="include-timestamp" 
              checked={includeTimestamp} 
              onCheckedChange={setIncludeTimestamp}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleDownloadCurrent}
            >
              Download Current Reading
            </Button>
            <Button 
              variant="default" 
              className="w-full" 
              onClick={handleDownloadHistory}
            >
              Download Historical Data
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold">Note:</p>
            <p>CSV files can be opened in Excel, Google Sheets, or any text editor.</p>
            <p>Historical data includes up to the last 100 readings collected during this session.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArchiveSettings;
