
import React, { useState, useEffect } from "react";
import { SubUser } from "@/api/entities";
import { User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Mail, Shield, Edit, Trash2, UserPlus, Info } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

import SubUserForm from "../components/subusers/SubUserForm";
import DeleteSubUserDialog from "../components/subusers/DeleteSubUserDialog";

const statusColors = {
  invited: "bg-yellow-100 text-yellow-800 border-yellow-200",
  active: "bg-green-100 text-green-800 border-green-200",
  inactive: "bg-gray-100 text-gray-800 border-gray-200",
  suspended: "bg-red-100 text-red-800 border-red-200"
};

export default function SubUsers() {
  const [subUsers, setSubUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSubUser, setEditingSubUser] = useState(null);
  const [deletingSubUser, setDeletingSubUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showInviteSuccess, setShowInviteSuccess] = useState(false);
  const [lastInvitedEmail, setLastInvitedEmail] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [subUserData, userData] = await Promise.all([
        SubUser.list("-created_date"),
        User.me()
      ]);
      setSubUsers(subUserData);
      setCurrentUser(userData);
    } catch (error) {
      console.error("Error loading sub-users:", error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (subUserData) => {
    try {
      if (editingSubUser) {
        await SubUser.update(editingSubUser.id, subUserData);
      } else {
        // Add invitation metadata
        const createData = {
          ...subUserData,
          invited_by: currentUser?.email,
          invitation_sent_date: new Date().toISOString(),
          status: "invited"
        };
        await SubUser.create(createData);
        setLastInvitedEmail(createData.email);
        setShowInviteSuccess(true);
      }
      
      setShowForm(false);
      setEditingSubUser(null);
      await loadData();
    } catch (error) {
      console.error("Error saving sub-user:", error);
    }
  };

  const handleEdit = (subUser) => {
    setEditingSubUser(subUser);
    setShowForm(true);
  };

  const handleDelete = async (subUser) => {
    try {
      await SubUser.delete(subUser.id);
      setDeletingSubUser(null);
      await loadData();
    } catch (error) {
      console.error("Error deleting sub-user:", error);
    }
  };

  const resendInvitation = async (subUser) => {
    try {
      const updateData = {
        ...subUser,
        invitation_sent_date: new Date().toISOString()
      };
      await SubUser.update(subUser.id, updateData);
      await loadData();
    } catch (error) {
      console.error("Error resending invitation:", error);
    }
  };

  const getPermissionCount = (permissions) => {
    if (!permissions) return 0;
    return Object.values(permissions).filter(Boolean).length;
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-green-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Team Management</h1>
            <p className="text-slate-600">Manage staff access and permissions</p>
          </div>
          <Button 
            onClick={() => { setShowForm(true); setEditingSubUser(null); }}
            className="shadow-lg"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-accent-foreground)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent-gradient-to)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent)';
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Team Member
          </Button>
        </div>

        {/* Invite Success Message */}
        {showInviteSuccess && (
          <Alert className="mb-6 border-blue-200 bg-blue-50 text-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="font-semibold">Invitation Sent!</AlertTitle>
            <AlertDescription>
              A new team member has been invited. Please instruct <strong>{lastInvitedEmail}</strong> to go to the main login page and sign up with their email address. Their account will be automatically configured upon their first login.
            </AlertDescription>
          </Alert>
        )}

        {/* Sub-Users List */}
        <div className="grid gap-6">
          {subUsers.length === 0 ? (
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-800 mb-2">No Team Members Yet</h3>
                <p className="text-slate-600 mb-6">
                  Invite team members to collaborate and access specific sections of your CRM.
                </p>
                <Button onClick={() => setShowForm(true)} className="shadow-lg"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'var(--color-accent-foreground)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-accent-gradient-to)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Your First Team Member
                </Button>
              </CardContent>
            </Card>
          ) : (
            subUsers.map((subUser) => (
              <Card key={subUser.id} className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                        {subUser.full_name?.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {subUser.full_name}
                        </h3>
                        <p className="text-sm text-slate-600">{subUser.position}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="text-sm text-slate-500">{subUser.email}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={statusColors[subUser.status]}>
                        {subUser.status}
                      </Badge>
                      <div className="flex gap-2">
                        {subUser.status === 'invited' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resendInvitation(subUser)}
                          >
                            <Mail className="w-3 h-3 mr-1" />
                            Resend
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(subUser)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingSubUser(subUser)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Shield className="w-4 h-4" />
                        <span>
                          Access to {getPermissionCount(subUser.permissions)} sections
                        </span>
                      </div>
                      {subUser.last_login && (
                        <div className="text-xs text-slate-400">
                          Last login: {format(new Date(subUser.last_login), 'MMM d, yyyy')}
                        </div>
                      )}
                      {subUser.status === 'invited' && subUser.invitation_sent_date && (
                        <div className="text-xs text-slate-400">
                          Invited: {format(new Date(subUser.invitation_sent_date), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Sub-User Form Modal */}
        {showForm && (
          <SubUserForm
            subUser={editingSubUser}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingSubUser(null);
            }}
          />
        )}

        {/* Delete Confirmation Dialog */}
        {deletingSubUser && (
          <DeleteSubUserDialog
            subUser={deletingSubUser}
            onConfirm={handleDelete}
            onCancel={() => setDeletingSubUser(null)}
          />
        )}
      </div>
    </div>
  );
}
