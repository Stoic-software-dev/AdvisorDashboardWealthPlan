import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserCheck, UserX, UserPlus } from "lucide-react";

const statusConfig = {
  active: {
    label: "Active Clients",
    icon: UserCheck,
    color: "text-green-600",
    bgColor: "bg-green-50",
    description: "Currently engaged clients"
  },
  inactive: {
    label: "Inactive Clients", 
    icon: UserX,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    description: "Previously active clients"
  },
  prospect: {
    label: "Prospects",
    icon: UserPlus,
    color: "text-blue-600", 
    bgColor: "bg-blue-50",
    description: "Potential new clients"
  }
};

export default function ClientStatusCard({ clients, isLoading }) {
  const [selectedStatus, setSelectedStatus] = useState("active");

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  const clientCounts = {
    active: clients.filter(c => c.status === 'active').length,
    inactive: clients.filter(c => c.status === 'inactive').length,
    prospect: clients.filter(c => c.status === 'prospect').length
  };

  const currentConfig = statusConfig[selectedStatus];
  const Icon = currentConfig.icon;

  const cycleStatus = () => {
    const statuses = ['active', 'inactive', 'prospect'];
    const currentIndex = statuses.indexOf(selectedStatus);
    const nextIndex = (currentIndex + 1) % statuses.length;
    setSelectedStatus(statuses[nextIndex]);
  };

  return (
    <Card 
      onClick={cycleStatus}
      className="border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm cursor-pointer group"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          {currentConfig.label}
        </CardTitle>
        <div className={`p-2.5 rounded-lg ${currentConfig.bgColor} group-hover:scale-110 transition-transform`}>
          <Icon className={`h-5 w-5 ${currentConfig.color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 mb-1">
          {clientCounts[selectedStatus]}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">{currentConfig.description}</p>
          <div className="flex gap-1">
            {Object.keys(statusConfig).map((status) => (
              <div
                key={status}
                className={`w-1.is-1.5 h-1.5 rounded-full transition-colors ${
                  status === selectedStatus 
                    ? statusConfig[status].color.replace('text-', 'bg-')
                    : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}