
import React, { useState, useEffect } from "react";
import { Client, Task, User, CalculatorInstance, AppSettings, CustomLink } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Users,
  Calendar,
  CheckCircle2,
  UploadCloud,
  BookOpen,
  ExternalLink, // Added ExternalLink icon
  Link as LinkIcon
} from "lucide-react";
import { format } from "date-fns"; // Fixed syntax error: ' = ' removed

import MetricCard from "../components/dashboard/MetricCard";
import CalendarWidget from "../components/dashboard/CalendarWidget";
import WorkflowTasksViewer from "../components/dashboard/WorkflowTasksViewer";
import ClientStatusCard from "../components/dashboard/ClientStatusCard";
import RecentCalculatorsCard from "../components/dashboard/RecentCalculatorsCard";
import TasksSummary from "../components/dashboard/TasksSummary";
import UploadDocumentModal from '../components/documents/UploadDocumentModal';
import { Document } from '@/api/entities';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalClients: 0,
    pendingTasks: 0
  });
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [calculatorInstances, setCalculatorInstances] = useState([]);
  const [appSettings, setAppSettings] = useState(null);
  const [customLinks, setCustomLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadAppSettings();
  }, []);

  const loadAppSettings = async () => {
    try {
      const [settingsResult, linksResult] = await Promise.allSettled([
        AppSettings.list(),
        CustomLink.list('sort_order'),
      ]);
      
      const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : [];
      const links = linksResult.status === 'fulfilled' ? linksResult.value : [];

      if (settings && settings.length > 0) {
        setAppSettings(settings[0]);
      } else {
        setAppSettings(null); // Ensure appSettings is null if no settings are found
      }
      setCustomLinks(links || []);
    } catch (error) {
      console.error("Error loading app settings or custom links:", error);
      setAppSettings(null);
      setCustomLinks([]);
    }
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      const isUserAdmin = currentUser.role === 'admin';
      const dataFilter = isUserAdmin ? {} : { created_by: currentUser.email };

      // Try to load data with individual error handling for each entity
      const [clientsResult, tasksResult, calculatorsResult] = await Promise.allSettled([
        Client.filter(dataFilter, "-created_date").catch(err => {
          console.warn("Failed to load clients:", err);
          return [];
        }),
        Task.filter({ ...dataFilter, status: ["pending", "in_progress"] }).catch(err => {
          console.warn("Failed to load tasks:", err);
          return [];
        }),
        CalculatorInstance.list("-updated_date", 5).catch(err => {
          console.warn("Failed to load calculators:", err);
          return [];
        }),
      ]);

      const clients = clientsResult.status === 'fulfilled' ? clientsResult.value : [];
      const tasks = tasksResult.status === 'fulfilled' ? tasksResult.value : [];
      const calculators = calculatorsResult.status === 'fulfilled' ? calculatorsResult.value : [];

      setClients(clients);
      setTasks(tasks);
      setCalculatorInstances(calculators);

      setMetrics({
        totalClients: clients.length,
        pendingTasks: tasks.length
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      // Set default empty state instead of leaving undefined
      setClients([]);
      setTasks([]);
      setCalculatorInstances([]);
      setMetrics({
        totalClients: 0,
        pendingTasks: 0
      });
    }
    setIsLoading(false);
  };

  const handleUploadDocument = async (docData) => {
    try {
      await Document.create(docData);
      setShowUploadModal(false);
    } catch (error) {
      console.error("Error creating document from dashboard:", error);
    }
  };

  return (
    <>
      <div className="p-6 space-y-8 bg-gradient-to-br from-slate-50 to-green-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
            <p className="text-slate-600">Welcome back! Here's what's happening with your practice.</p>
          </div>

          {/* Top Metrics Grid - Rearranged Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            {/* Column 1: Stacked Client Cards */}
            <div className="space-y-4">
              <MetricCard
                title="Total Clients"
                value={metrics.totalClients}
                icon={Users}
                trend="+12% this month"
                isLoading={isLoading}
              />
              <ClientStatusCard
                clients={clients}
                isLoading={isLoading}
              />
            </div>

            {/* Column 2-3: Recent Calculators (spans 2 columns) */}
            <div className="lg:col-span-2">
              <RecentCalculatorsCard
                calculatorInstances={calculatorInstances}
                clients={clients}
                isLoading={isLoading}
              />
            </div>

            {/* Column 4: Quick Links */}
            <div>
              <Card
                className="border-none shadow-lg text-white h-full"
                style={{
                  background: `linear-gradient(to right, var(--color-accent-gradient-from), var(--color-accent-gradient-to))`
                }}
              >
                <CardHeader>
                  <CardTitle>Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Trading Platform Link - Only show if configured */}
                  {appSettings?.trading_platform_url && (
                    <a href={appSettings.trading_platform_url} target="_blank" rel="noopener noreferrer" className="block">
                      <Button variant="secondary" className="w-full justify-start bg-white/20 hover:bg-white/30 text-white border-white/30">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {appSettings.trading_platform_name || "Trading Platform"}
                      </Button>
                    </a>
                  )}
                  {/* Custom Links */}
                  {customLinks.map(link => (
                    <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="block">
                      <Button variant="secondary" className="w-full justify-start bg-white/20 hover:bg-white/30 text-white border-white/30">
                        <LinkIcon className="w-4 h-4 mr-2" />
                        {link.name}
                      </Button>
                    </a>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - 2/3 width */}
            <div className="lg:col-span-2 space-y-6">
              <WorkflowTasksViewer isLoading={isLoading} />
              <CalendarWidget />
            </div>

            {/* Right Column - 1/3 width */}
            <div className="space-y-6">
              <TasksSummary
                tasks={tasks}
                clients={clients}
                onTaskUpdate={loadDashboardData}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
      {showUploadModal && (
        <UploadDocumentModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUploadDocument}
          clients={clients}
        />
      )}
    </>
  );
}
