
import React from 'react';
import Dashboard from '@/components/Dashboard';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1">
        <Dashboard />
      </div>
      <footer className="py-4 px-6 border-t bg-white text-center text-sm text-gray-500">
        <p>Project by Muha Muha and RMNHS SSP G10 B2025</p>
      </footer>
    </div>
  );
};

export default Index;
