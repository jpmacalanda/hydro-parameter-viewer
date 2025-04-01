
import { SerialData } from "@/services/types/serial.types";

/**
 * Converts an array of objects to CSV format
 */
export const convertToCSV = (dataArray: any[], includeHeaders: boolean = true): string => {
  if (dataArray.length === 0) return '';
  
  // Get all headers from the first object
  const headers = Object.keys(dataArray[0]);
  
  // Create CSV content
  let csvContent = includeHeaders ? headers.join(',') + '\n' : '';
  
  // Add data rows
  dataArray.forEach(item => {
    const row = headers.map(header => {
      // Handle special cases like null, undefined, or objects
      const value = item[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    }).join(',');
    csvContent += row + '\n';
  });
  
  return csvContent;
};

/**
 * Downloads data as a CSV file
 * @param data An array of objects to be converted to CSV
 * @param filename The name of the CSV file to download
 */
export const downloadCSV = (data: any[], filename: string = 'hydroponics-data.csv'): void => {
  // Convert data array to CSV string
  const csvContent = convertToCSV(data);
  
  // Create blob and download
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
