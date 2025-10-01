import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarIcon, Clock, MapPin, ExternalLink, AlertCircle } from "lucide-react";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AppSettings } from "@/api/entities";

export default function UpcomingMeetings({ onMeetingsLoaded, isLoading: parentLoading }) {
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load app settings to get calendar URL
      const existingSettings = await AppSettings.list();
      if (!existingSettings || existingSettings.length === 0) {
        setError("Calendar not configured");
        setIsLoading(false);
        return;
      }

      const appSettings = existingSettings[0];
      setSettings(appSettings);

      if (!appSettings.google_calendar_url) {
        setError("Google Calendar not connected");
        setIsLoading(false);
        return;
      }

      // Parse calendar URL to extract calendar ID
      const calendarUrl = new URL(appSettings.google_calendar_url);
      const srcParam = calendarUrl.searchParams.get('src');
      
      if (!srcParam) {
        setError("Invalid calendar URL");
        setIsLoading(false);
        return;
      }

      // For demonstration, we'll create mock meetings based on today's date
      // In a real implementation, you'd use Google Calendar API
      const mockMeetings = generateMockMeetings();
      
      setMeetings(mockMeetings);
      onMeetingsLoaded(mockMeetings);
      
    } catch (err) {
      console.error("Error loading meetings:", err);
      setError("Failed to load meetings");
    }
    
    setIsLoading(false);
  };

  // Generate mock meetings for demonstration
  const generateMockMeetings = () => {
    const now = new Date();
    const meetings = [];
    
    // Today's meetings
    meetings.push({
      id: '1',
      title: 'Portfolio Review - Johnson Family',
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0),
      location: 'Office Conference Room',
      attendees: ['john.johnson@email.com']
    });

    meetings.push({
      id: '2',
      title: 'Financial Planning Session - Smith',
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 30),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 30),
      location: 'Virtual Meeting',
      attendees: ['sarah.smith@email.com']
    });

    // Tomorrow's meetings
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    meetings.push({
      id: '3',
      title: 'Initial Consultation - Davis',
      start: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 0),
      end: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 11, 0),
      location: 'Office',
      attendees: ['mike.davis@email.com']
    });

    meetings.push({
      id: '4',
      title: 'Quarterly Review - Thompson LLC',
      start: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 15, 0),
      end: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 16, 0),
      location: 'Client Office',
      attendees: ['contact@thompsonllc.com']
    });

    // Sort by start time
    return meetings.sort((a, b) => a.start - b.start);
  };

  const getMeetingTimeLabel = (meeting) => {
    if (isToday(meeting.start)) {
      return 'Today';
    } else if (isTomorrow(meeting.start)) {
      return 'Tomorrow';
    } else {
      return format(meeting.start, 'MMM d');
    }
  };

  const getMeetingTimeColor = (meeting) => {
    if (isToday(meeting.start)) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (isTomorrow(meeting.start)) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else {
      return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  if (isLoading || parentLoading) {
    return (
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Upcoming Meetings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="p-3 border rounded-lg">
              <Skeleton className="h-4 w-32 mb-2" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-orange-600" />
            Upcoming Meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-orange-600 mb-3">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
          <Link to={createPageUrl("Calendar")}>
            <Button size="sm" variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              Setup Calendar
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <CalendarIcon className="w-5 h-5 text-orange-600" />
            Upcoming Meetings ({meetings.length})
          </CardTitle>
          <Link to={createPageUrl("Calendar")}>
            <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
              View All <ExternalLink className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {meetings.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No upcoming meetings</p>
          </div>
        ) : (
          <div className="space-y-0">
            {meetings.slice(0, 5).map((meeting) => (
              <div
                key={meeting.id}
                className="p-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm mb-1 truncate">
                      {meeting.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(meeting.start, 'h:mm a')} - {format(meeting.end, 'h:mm a')}
                      </span>
                      {meeting.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {meeting.location}
                        </span>
                      )}
                    </div>
                    {meeting.attendees && meeting.attendees.length > 0 && (
                      <p className="text-xs text-slate-400 truncate">
                        {meeting.attendees[0]}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2">
                    <Badge variant="outline" className={getMeetingTimeColor(meeting)} size="sm">
                      {getMeetingTimeLabel(meeting)}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}