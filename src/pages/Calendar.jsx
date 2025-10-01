
import React, { useState, useEffect } from 'react';
import { AdvisorProfile } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar as CalendarIcon, Settings, AlertTriangle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CalendarPage() {
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

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-green-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Calendar</h1>
            <p className="text-slate-600">View your personal schedule from Google Calendar.</p>
          </div>
          <Link to={createPageUrl("AdvisorSettings")}>
            <Button 
              variant="outline" 
              className="bg-white/80 border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]"
            >
              <Settings className="w-4 h-4 mr-2" />
              Calendar Settings
            </Button>
          </Link>
        </div>

        {/* Error Alert */}
        {calendarError && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Failed to load calendar. Please check that your Google Calendar is public and the embed URL is correct.
            </AlertDescription>
          </Alert>
        )}

        {/* URL Format Warning */}
        {advisorProfile?.google_calendar_url && !isValidGoogleCalendarUrl(advisorProfile.google_calendar_url) && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              The calendar URL doesn't appear to be a valid Google Calendar embed URL. Make sure it starts with "https://calendar.google.com/calendar/embed?src=" and includes your calendar source.
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm w-full h-[75vh]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p>Loading Calendar...</p>
              </div>
            </div>
          ) : advisorProfile?.google_calendar_url && isValidGoogleCalendarUrl(advisorProfile.google_calendar_url) ? (
            <iframe
              src={advisorProfile.google_calendar_url}
              style={{ borderWidth: 0 }}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              title="Google Calendar Embed"
              onError={handleIframeError}
            ></iframe>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-full text-center p-8">
              <CalendarIcon className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Google Calendar Not Connected</h3>
              <p className="text-slate-600 mb-6 max-w-md">
                Connect your Google Calendar to view your schedule directly in the CRM.
              </p>
              <Link to={createPageUrl("AdvisorSettings")}>
                <Button className="mb-4">
                  <Settings className="w-4 h-4 mr-2" />
                  Connect Calendar
                </Button>
              </Link>
              
              <div className="max-w-lg text-left bg-slate-50 p-4 rounded-lg">
                <h4 className="font-semibold text-slate-800 mb-2">Quick Setup Guide:</h4>
                <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                  <li>Open <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline inline-flex items-center">Google Calendar <ExternalLink className="w-3 h-3 ml-1" /></a></li>
                  <li>Go to Settings → Select your calendar</li>
                  <li>Enable "Make available to public"</li>
                  <li>Copy the <strong>embed code</strong> (not public URL)</li>
                  <li>Paste the URL from the embed code in your advisor settings</li>
                </ol>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
