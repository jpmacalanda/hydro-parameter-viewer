
import { SerialData } from "@/services/types/serial.types";

/**
 * Converts sensor data array to CSV format
 */
export const convertToCSV = (dataArray: SerialData[], includeTimestamp: boolean = true): string => {
  // Define CSV headers
  const headers = includeTimestamp 
    ? ['timestamp', 'ph', 'temperature', 'waterLevel', 'tds']
    : ['ph', 'temperature', 'waterLevel', 'tds'];
  
  // Create CSV header row
  let csvContent = headers.join(',') + '\n';
  
  // Add data rows
  dataArray.forEach(data => {
    const timestamp = includeTimestamp ? new Date().toISOString() + ',' : '';
    const row = `${timestamp}${data.ph},${data.temperature},${data.waterLevel},${data.tds}`;
    csvContent += row + '\n';
  });
  
  return csvContent;
};

/**
 * Downloads data as a CSV file
 */
export const downloadCSV = (csvContent: string, filename: string = 'hydroponics-data.csv'): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  // Set link properties
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Add to document, trigger download and clean up
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Formats current date for filename
 */
export const getFormattedDate = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
};
