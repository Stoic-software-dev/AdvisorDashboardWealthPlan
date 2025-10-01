
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Save, X, Shield, Users, LayoutDashboard, GitBranch, Calendar, CheckSquare, Calculator } from "lucide-react";

const menuSections = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "View summary and metrics" },
  { key: "clients", label: "Clients", icon: Users, description: "Manage client profiles and data" },
  { key: "workflows", label: "Workflows", icon: GitBranch, description: "Create and manage workflows" },
  { key: "calendar", label: "Calendar", icon: Calendar, description: "View and manage calendar" },
  { key: "tasks", label: "Tasks", icon: CheckSquare, description: "Manage tasks and to-dos" },
  { key: "calculators", label: "Calculators", icon: Calculator, description: "Use financial calculators" }
];

export default function SubUserForm({ subUser, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    full_name: subUser?.full_name || "",
    email: subUser?.email || "",
    position: subUser?.position || "",
    status: subUser?.status || "invited",
    permissions: subUser?.permissions || {
      dashboard: true,
      clients: false,
      workflows: false,
      calendar: false,
      tasks: false,
      calculators: false
    }
  });

  const [isSending, setIsSending] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePermissionChange = (permission, checked) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: checked
      }
    }));
  };

  const selectAllPermissions = () => {
    const allPermissions = {};
    menuSections.forEach(section => {
      allPermissions[section.key] = true;
    });
    setFormData(prev => ({
      ...prev,
      permissions: allPermissions
    }));
  };

  const clearAllPermissions = () => {
    const noPermissions = {};
    menuSections.forEach(section => {
      noPermissions[section.key] = section.key === 'dashboard'; // Keep dashboard always enabled
    });
    setFormData(prev => ({
      ...prev,
      permissions: noPermissions
    }));
  };

  // This function is no longer called directly within handleSubmit,
  // but keeping it here as per the outline, in case it's used elsewhere
  // or will be moved/adapted.
  const sendInvitationEmail = async (userData) => {
    try {
      const { SendEmail } = await import("@/api/integrations");
      
      const emailSubject = "Invitation to Join Our CRM Team";
      const emailBody = `
Hello ${userData.full_name},

You've been invited to join our CRM system as a ${userData.position}.

Your account details:
• Email: ${userData.email}
• Position: ${userData.position}

To get started:
1. Go to the CRM login page
2. Use your email address (${userData.email}) to sign in
3. You'll have access to the following sections:
${Object.entries(userData.permissions)
     .filter(([key, value]) => value)
     .map(([key]) => `   • ${menuSections.find(s => s.key === key)?.label}`)
     .join('\n')}

If you have any questions, please don't hesitate to reach out.

Best regards,
The CRM Team
      `;

      await SendEmail({
        to: userData.email,
        subject: emailSubject,
        body: emailBody,
        from_name: "CRM Team"
      });
      
    } catch (error) {
      console.error("Error sending invitation email:", error);
      // Don't throw here - the user was created successfully, email is just a bonus
      alert("User created successfully, but there was an issue sending the invitation email. Please contact the team member directly with login instructions.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSending(true);
    
    try {
      // The parent component now handles showing a success/instruction message.
      await onSubmit(formData);
    } catch (error) {
      console.error("Error in form submission:", error);
    } finally {
      setIsSending(false);
    }
  };

  const getSelectedCount = () => {
    return Object.values(formData.permissions).filter(Boolean).length;
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            {subUser ? "Edit Team Member" : "Invite Team Member"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    placeholder="Jane Smith"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="jane@company.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Position *</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => handleChange("position", e.target.value)}
                      placeholder="Assistant Advisor"
                      required
                    />
                  </div>
                </div>

                {subUser && (
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="invited">Invited</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <h3 className="font-semibold text-slate-900">Menu Access Permissions</h3>
                  <span className="text-sm text-slate-500">({getSelectedCount()} selected)</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllPermissions}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAllPermissions}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {menuSections.map((section) => {
                  const Icon = section.icon;
                  const isDisabled = section.key === 'dashboard'; // Dashboard is always required
                  
                  return (
                    <div 
                      key={section.key} 
                      className={`flex items-center gap-3 p-3 border rounded-lg ${
                        isDisabled ? 'bg-slate-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <Checkbox
                        id={section.key}
                        checked={formData.permissions[section.key]}
                        onCheckedChange={(checked) => handlePermissionChange(section.key, checked)}
                        disabled={isDisabled}
                      />
                      <Icon className="w-4 h-4 text-slate-600" />
                      <div className="flex-1">
                        <Label 
                          htmlFor={section.key} 
                          className={`font-medium ${isDisabled ? 'text-slate-500' : 'cursor-pointer'}`}
                        >
                          {section.label}
                          {isDisabled && (
                            <span className="text-xs text-slate-400 ml-2">(Required)</span>
                          )}
                        </Label>
                        <p className="text-xs text-slate-500">{section.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator className="my-4" />
              
              <div className="text-sm text-slate-600 bg-blue-50 p-3 rounded-lg">
                <p className="font-medium text-blue-900 mb-1">Note about invitations:</p>
                <p>
                  An invitation email will be sent to <strong>{formData.email || 'the provided email'}</strong> with 
                  login instructions. The team member can access only the sections you've enabled above.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSending}>
              <Save className="w-4 h-4 mr-2" />
              {isSending 
                ? (subUser ? "Updating..." : "Saving...") 
                : (subUser ? "Update Team Member" : "Invite Team Member")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
