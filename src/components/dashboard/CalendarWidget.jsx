import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar as CalendarIcon, Settings, AlertTriangle, ExternalLink } from "lucide-react";
import { AdvisorProfile } from "@/api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CalendarWidget() {
  const [advisorProfile, setAdvisorProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarError, setCalendarError] = useState(false);

  useEffect(() => {
    loadAdvisorProfile();
  }, []);

  const loadAdvisorProfile = async () => {
    setIsLoading(true);
    try {
      const profiles = await AdvisorProfile.list();
      if (profiles && profiles.length > 0) {
        setAdvisorProfile(profiles[0]);
      } else {
        setAdvisorProfile({});
      }
    } catch (error) {
      console.error("Error loading advisor profile:", error);
      setAdvisorProfile({});
    }
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setCalendarError(true);
  };

  const isValidGoogleCalendarUrl = (url) => {
    if (!url) return false;
    return url.includes('calendar.google.com/calendar/embed') && url.includes('src=');
  };

  // Create a compact version of the calendar URL for dashboard
  const getCompactCalendarUrl = (url) => {
    if (!url) return '';
    
    // Add parameters to make the calendar more compact for dashboard
    const urlObj = new URL(url);
    urlObj.searchParams.set('showTitle', '0');
    urlObj.searchParams.set('showNav', '1');
    urlObj.searchParams.set('showDate', '1');
    urlObj.searchParams.set('showPrint', '0');
    urlObj.searchParams.set('showTabs', '0');
    urlObj.searchParams.set('showCalendars', '0');
    urlObj.searchParams.set('showTz', '0');
    urlObj.searchParams.set('mode', 'AGENDA');
    urlObj.searchParams.set('height', '400');
    
    return urlObj.toString();
  };

  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <CalendarIcon className="w-5 h-5 text-[var(--color-accent-text)]" />
            Calendar
          </CardTitle>
          <Link to={createPageUrl("Calendar")}>
            <Button variant="ghost" size="sm" className="text-[var(--color-accent-text)] hover:text-[var(--color-accent)]">
              <ExternalLink className="w-4 h-4 mr-1" />
              Full View
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p>Loading Calendar...</p>
            </div>
          </div>
        ) : calendarError ? (
          <div className="p-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Failed to load calendar. Please check your calendar settings.
              </AlertDescription>
            </Alert>
          </div>
        ) : advisorProfile?.google_calendar_url && isValidGoogleCalendarUrl(advisorProfile.google_calendar_url) ? (
          <div className="h-96">
            <iframe
              src={getCompactCalendarUrl(advisorProfile.google_calendar_url)}
              style={{ borderWidth: 0 }}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              title="Google Calendar Widget"
              onError={handleIframeError}
            ></iframe>
          </div>
        ) : (
          <CardContent className="flex flex-col items-center justify-center h-96 text-center p-8">
            <CalendarIcon className="w-12 h-12 text-[var(--color-accent)] mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Calendar Not Connected</h3>
            <p className="text-slate-600 mb-4 text-sm">
              Connect your Google Calendar to view your schedule here.
            </p>
            <Link to={createPageUrl("Calendar")}>
              <Button size="sm" className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-accent-foreground)]">
                <Settings className="w-4 h-4 mr-2" />
                Setup Calendar
              </Button>
            </Link>
          </CardContent>
        )}
      </CardContent>
    </Card>
  );
}