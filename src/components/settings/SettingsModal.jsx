import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppSettings, AdvisorProfile } from "@/api/entities";
import { UploadFile, InvokeLLM } from "@/api/integrations";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Palette, Save, Building2, Upload, Sparkles, Loader2, Image, User } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

function AdvisorProfileForm({ isOpen, onClose, onProfileUpdate }) {
  const [profile, setProfile] = useState({
    full_name: "",
    title: "",
    company_name: "",
    profile_photo_url: "",
    bio: "",
    website_url: "",
    email: "",
    phone: "",
    office_address: "",
    meeting_scheduler_url: "",
    certifications: [],
    linkedin_url: "",
    years_experience: "",
    specializations: [],
    is_public: true,
    signature: "",
    google_calendar_url: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const profiles = await AdvisorProfile.list();
      if (profiles && profiles.length > 0) {
        setProfile(profiles[0]);
      }
    } catch (error) {
      console.error("Error loading advisor profile:", error);
      setError("Failed to load advisor profile");
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    
    try {
      let savedProfile;
      const profiles = await AdvisorProfile.list();
      
      if (profiles && profiles.length > 0) {
        savedProfile = await AdvisorProfile.update(profiles[0].id, profile);
      } else {
        savedProfile = await AdvisorProfile.create(profile);
      }
      
      if (onProfileUpdate) {
        onProfileUpdate(savedProfile);
      }
      
      onClose();
    } catch (error) {
      console.error("Error saving advisor profile:", error);
      setError("Failed to save profile");
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading profile...</div>;
  }

  return (
    <div className="space-y-6 p-6 max-h-[70vh] overflow-y-auto">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={profile.full_name}
                onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label htmlFor="title">Professional Title</Label>
              <Input
                id="title"
                value={profile.title}
                onChange={(e) => setProfile(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Senior Financial Advisor"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={profile.company_name}
                onChange={(e) => setProfile(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="Your company or firm name"
              />
            </div>
            <div>
              <Label htmlFor="years_experience">Years of Experience</Label>
              <Input
                id="years_experience"
                type="number"
                value={profile.years_experience}
                onChange={(e) => setProfile(prev => ({ ...prev, years_experience: parseInt(e.target.value) || "" }))}
                placeholder="e.g., 15"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Professional Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                placeholder="your.email@company.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="office_address">Office Address</Label>
            <Input
              id="office_address"
              value={profile.office_address}
              onChange={(e) => setProfile(prev => ({ ...prev, office_address: e.target.value }))}
              placeholder="123 Main St, City, Province, Postal Code"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendar Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="google_calendar_url">Google Calendar Embed URL</Label>
            <Input
              id="google_calendar_url"
              value={profile.google_calendar_url}
              onChange={(e) => setProfile(prev => ({ ...prev, google_calendar_url: e.target.value }))}
              placeholder="https://calendar.google.com/calendar/embed?src=..."
            />
            <p className="text-sm text-slate-500 mt-1">
              Get this from Google Calendar → Settings → Your calendar → Integrate calendar → Embed code (copy just the URL)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Professional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bio">Professional Biography</Label>
            <ReactQuill
              value={profile.bio}
              onChange={(value) => setProfile(prev => ({ ...prev, bio: value }))}
              placeholder="Tell clients about your background, expertise, and approach..."
              style={{ height: '120px', marginBottom: '50px' }}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                value={profile.website_url}
                onChange={(e) => setProfile(prev => ({ ...prev, website_url: e.target.value }))}
                placeholder="https://yourwebsite.com"
              />
            </div>
            <div>
              <Label htmlFor="linkedin_url">LinkedIn Profile</Label>
              <Input
                id="linkedin_url"
                value={profile.linkedin_url}
                onChange={(e) => setProfile(prev => ({ ...prev, linkedin_url: e.target.value }))}
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="meeting_scheduler_url">Meeting Scheduler URL</Label>
            <Input
              id="meeting_scheduler_url"
              value={profile.meeting_scheduler_url}
              onChange={(e) => setProfile(prev => ({ ...prev, meeting_scheduler_url: e.target.value }))}
              placeholder="https://calendly.com/your-link"
            />
            <p className="text-sm text-slate-500 mt-1">
              Link to your Calendly, Acuity, or other scheduling tool
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Signature</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="signature">HTML Email Signature</Label>
          <ReactQuill
            value={profile.signature}
            onChange={(value) => setProfile(prev => ({ ...prev, signature: value }))}
            placeholder="Create your professional email signature..."
            style={{ height: '120px', marginBottom: '50px' }}
          />
          <p className="text-sm text-slate-500 mt-1">
            This signature will be automatically appended to emails sent from the CRM
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-4">
        <Link to={createPageUrl("AdvisorSettings")}>
          <Button variant="outline">
            Open Full Settings Page
          </Button>
        </Link>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsModal({ isOpen, onClose, onSettingsUpdate, onProfileUpdate, initialSection = 'profile', user }) {
  // This modal now only shows advisor profile settings
  // Admin settings are handled in the dedicated AdvisorSettings page
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Advisor Profile Settings
          </DialogTitle>
        </DialogHeader>

        <AdvisorProfileForm
          isOpen={true}
          onClose={onClose}
          onProfileUpdate={onProfileUpdate || (() => {})}
        />
      </DialogContent>
    </Dialog>
  );
}