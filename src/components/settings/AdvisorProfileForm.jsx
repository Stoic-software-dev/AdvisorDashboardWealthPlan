import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdvisorProfile } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { 
  User, 
  Save, 
  Upload, 
  Loader2, 
  Plus, 
  X, 
  Globe, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Linkedin,
  Award
} from "lucide-react";

export default function AdvisorProfileForm({ isOpen, onClose, onProfileUpdate }) {
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
    is_public: true
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [newCertification, setNewCertification] = useState("");
  const [newSpecialization, setNewSpecialization] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const existingProfile = await AdvisorProfile.list();
      if (existingProfile && existingProfile.length > 0) {
        setProfile({
          ...existingProfile[0],
          certifications: existingProfile[0].certifications || [],
          specializations: existingProfile[0].specializations || []
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
    setIsLoading(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError("Please upload an image file");
      return;
    }

    setIsUploadingPhoto(true);
    setError("");
    
    try {
      const { file_url } = await UploadFile({ file });
      setProfile(prev => ({ ...prev, profile_photo_url: file_url }));
    } catch (err) {
      setError("Failed to upload photo. Please try again.");
      console.error("Photo upload error:", err);
    }
    
    setIsUploadingPhoto(false);
  };

  const addCertification = () => {
    if (newCertification.trim() && !profile.certifications.includes(newCertification.trim())) {
      setProfile(prev => ({
        ...prev,
        certifications: [...prev.certifications, newCertification.trim()]
      }));
      setNewCertification("");
    }
  };

  const removeCertification = (cert) => {
    setProfile(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c !== cert)
    }));
  };

  const addSpecialization = () => {
    if (newSpecialization.trim() && !profile.specializations.includes(newSpecialization.trim())) {
      setProfile(prev => ({
        ...prev,
        specializations: [...prev.specializations, newSpecialization.trim()]
      }));
      setNewSpecialization("");
    }
  };

  const removeSpecialization = (spec) => {
    setProfile(prev => ({
      ...prev,
      specializations: prev.specializations.filter(s => s !== spec)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const existingProfile = await AdvisorProfile.list();
      
      const saveData = {
        ...profile,
        years_experience: profile.years_experience ? parseInt(profile.years_experience) : null
      };
      
      if (existingProfile && existingProfile.length > 0) {
        await AdvisorProfile.update(existingProfile[0].id, saveData);
      } else {
        await AdvisorProfile.create(saveData);
      }
      
      onProfileUpdate(saveData);
      onClose();
    } catch (error) {
      console.error("Error saving profile:", error);
      setError("Failed to save profile. Please try again.");
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Advisor Profile
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="p-6 text-center">Loading profile...</div>
        ) : (
          <div className="space-y-6 p-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Profile Photo */}
                <div>
                  <Label htmlFor="profile_photo">Profile Photo</Label>
                  <div className="mt-2 space-y-3">
                    <div className="flex items-center gap-4">
                      <Input
                        id="profile_photo"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={isUploadingPhoto}
                        className="flex-1"
                      />
                    </div>
                    
                    {profile.profile_photo_url && (
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50">
                        <img 
                          src={profile.profile_photo_url} 
                          alt="Profile photo" 
                          className="w-16 h-16 object-cover rounded-full"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-900">Photo uploaded successfully</p>
                          <p className="text-xs text-slate-500">This will be visible to your clients</p>
                        </div>
                      </div>
                    )}
                    
                    {isUploadingPhoto && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading photo...
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={profile.full_name}
                      onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <Label htmlFor="title">Professional Title</Label>
                    <Input
                      id="title"
                      value={profile.title}
                      onChange={(e) => setProfile(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Senior Financial Advisor"
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
                      placeholder="ABC Financial Services"
                    />
                  </div>
                  <div>
                    <Label htmlFor="years_experience">Years of Experience</Label>
                    <Input
                      id="years_experience"
                      type="number"
                      value={profile.years_experience}
                      onChange={(e) => setProfile(prev => ({ ...prev, years_experience: e.target.value }))}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio">Professional Biography</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    placeholder="Share your professional background, experience, and approach to financial advisory services..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john@abcfinancial.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
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
                    placeholder="123 Main St, Suite 100, Toronto, ON M5V 3A8"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="website_url">Website URL</Label>
                    <Input
                      id="website_url"
                      value={profile.website_url}
                      onChange={(e) => setProfile(prev => ({ ...prev, website_url: e.target.value }))}
                      placeholder="https://www.abcfinancial.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedin_url">LinkedIn Profile</Label>
                    <Input
                      id="linkedin_url"
                      value={profile.linkedin_url}
                      onChange={(e) => setProfile(prev => ({ ...prev, linkedin_url: e.target.value }))}
                      placeholder="https://linkedin.com/in/johnsmith"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="meeting_scheduler_url">Meeting Scheduler URL</Label>
                  <Input
                    id="meeting_scheduler_url"
                    value={profile.meeting_scheduler_url}
                    onChange={(e) => setProfile(prev => ({ ...prev, meeting_scheduler_url: e.target.value }))}
                    placeholder="https://calendly.com/johnsmith or your booking link"
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Clients will see a "Schedule Meeting" button that links to this URL
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Professional Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Professional Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Certifications */}
                <div>
                  <Label>Certifications</Label>
                  <div className="mt-2 space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={newCertification}
                        onChange={(e) => setNewCertification(e.target.value)}
                        placeholder="e.g., CFP, CFA, ChFC"
                        onKeyPress={(e) => e.key === 'Enter' && addCertification()}
                      />
                      <Button type="button" onClick={addCertification} variant="outline" size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.certifications.map((cert, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-2">
                          {cert}
                          <X 
                            className="w-3 h-3 cursor-pointer" 
                            onClick={() => removeCertification(cert)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Specializations */}
                <div>
                  <Label>Areas of Specialization</Label>
                  <div className="mt-2 space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={newSpecialization}
                        onChange={(e) => setNewSpecialization(e.target.value)}
                        placeholder="e.g., Retirement Planning, Estate Planning"
                        onKeyPress={(e) => e.key === 'Enter' && addSpecialization()}
                      />
                      <Button type="button" onClick={addSpecialization} variant="outline" size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.specializations.map((spec, index) => (
                        <Badge key={index} variant="outline" className="flex items-center gap-2">
                          {spec}
                          <X 
                            className="w-3 h-3 cursor-pointer" 
                            onClick={() => removeSpecialization(spec)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visibility Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile Visibility</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_public"
                    checked={profile.is_public}
                    onCheckedChange={(checked) => setProfile(prev => ({ ...prev, is_public: checked }))}
                  />
                  <Label htmlFor="is_public">Make profile visible to clients</Label>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  When enabled, clients can view your profile information in their portal
                </p>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}