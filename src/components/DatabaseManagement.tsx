
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import databaseService from '@/services/DatabaseService';
import { format } from 'date-fns';
import { Download, Trash, BarChart } from 'lucide-react';
import { downloadCSV } from '@/utils/csvUtils';

const DatabaseManagement = () => {
  const [storedReadings, setStoredReadings] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [databaseStats, setDatabaseStats] = useState({ recordCount: 0, estimatedSize: '0 MB' });
  
  const loadDatabaseData = async () => {
    setIsLoading(true);
    try {
      const allReadings = await databaseService.getAllReadings();
      // Sort by timestamp (newest first)
      const sortedReadings = allReadings.sort((a, b) => b.timestamp - a.timestamp);
      setStoredReadings(sortedReadings);
      
      // Get database stats
      const stats = await databaseService.getDatabaseStats();
      setDatabaseStats(stats);
    } catch (error) {
      console.error("Error loading database data:", error);
      toast.error("Failed to load stored readings");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadDatabaseData();
  }, []);
  
  const handleClearDatabase = async () => {
    if (window.confirm("Are you sure you want to delete all stored readings? This cannot be undone.")) {
      try {
        await databaseService.clearAllReadings();
        setStoredReadings([]);
        setDatabaseStats({ recordCount: 0, estimatedSize: '0 MB' });
        toast.success("All stored readings cleared");
      } catch (error) {
        console.error("Error clearing database:", error);
        toast.error("Failed to clear database");
      }
    }
  };
  
  const handleExportCsv = () => {
    if (storedReadings.length === 0) {
      toast.error("No data to export");
      return;
    }
    
    try {
      // Convert data to CSV format - prepare the data array with formatted values
      const csvData = storedReadings.map(reading => ({
        timestamp: format(new Date(reading.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        ph: reading.ph.toFixed(2),
        temperature: reading.temperature.toFixed(2),
        tds: reading.tds,
        waterLevel: reading.waterLevel
      }));
      
      // Use the updated utility function - it now accepts an array
      const filename = `hydroponics-data-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCSV(csvData, filename);
      
      toast.success("Data exported successfully");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Failed to export data");
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Database Management</h2>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCsv}
            disabled={storedReadings.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleClearDatabase}
            disabled={storedReadings.length === 0}
          >
            <Trash className="mr-2 h-4 w-4" />
            Clear Database
          </Button>
        </div>
      </div>
      
      <div className="border rounded-lg p-4 bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Stored Readings (Every Minute)</h3>
          <div className="bg-blue-100 p-2 rounded-md flex items-center text-sm space-x-2">
            <BarChart className="h-4 w-4 text-blue-700" />
            <div>
              <span className="font-medium">Database size:</span> {databaseStats.estimatedSize}
              <span className="mx-2">|</span>
              <span className="font-medium">Records:</span> {databaseStats.recordCount}
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-500 mb-4">
          The system stores one reading per minute in the local database.
          When storage approaches 5GB, oldest records will be automatically deleted.
        </p>
        
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableCaption>Sensor readings stored in local database</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>pH</TableHead>
                  <TableHead>Temperature</TableHead>
                  <TableHead>TDS</TableHead>
                  <TableHead>Water Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storedReadings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No data stored yet</TableCell>
                  </TableRow>
                ) : (
                  storedReadings.map((reading, index) => (
                    <TableRow key={index}>
                      <TableCell>{format(new Date(reading.timestamp), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                      <TableCell>{reading.ph.toFixed(2)}</TableCell>
                      <TableCell>{reading.temperature.toFixed(2)}°C</TableCell>
                      <TableCell>{reading.tds} ppm</TableCell>
                      <TableCell className="capitalize">{reading.waterLevel}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseManagement;
