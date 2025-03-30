
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FileText, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SerialData } from "@/services/types/serial.types";
import { convertToCSV, downloadCSV, getFormattedDate } from "@/utils/csvUtils";

interface ExportDataSettingsProps {
  sensorData: SerialData;
  dataHistory?: SerialData[];
  onClearData?: () => void;
}

const ExportDataSettings: React.FC<ExportDataSettingsProps> = ({ 
  sensorData, 
  dataHistory = [],
  onClearData = () => {} 
}) => {
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);
  
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
  
  // Handle clearing of historical data
  const handleClearData = () => {
    onClearData();
    setShowClearDialog(false);
    toast.success("Data history cleared", {
      description: "All recorded sensor data has been cleared"
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download size={20} />
            Export Data
          </CardTitle>
          <CardDescription>
            Export your sensor data in CSV format for record keeping or analysis
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
          
          <div className="pt-4 border-t border-gray-200">
            <Button 
              variant="destructive" 
              className="w-full flex items-center gap-2" 
              onClick={() => setShowClearDialog(true)}
            >
              <Trash2 size={16} />
              Clear Recorded Data
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold">Note:</p>
            <p>CSV files can be opened in Excel, Google Sheets, or any text editor.</p>
            <p>Historical data includes up to the last 100 readings collected during this session.</p>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear recorded data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all historical sensor readings collected during this session.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearData} className="bg-red-600 hover:bg-red-700">
              Clear Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExportDataSettings;
