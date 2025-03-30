
import React from 'react';
import NotificationBell from './NotificationBell';

interface DashboardHeaderProps {
  title: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ title }) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      <div className="relative">
        <NotificationBell />
      </div>
    </div>
  );
};

export default DashboardHeader;
