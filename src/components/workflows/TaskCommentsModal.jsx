import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TaskComment, User } from '@/api/entities';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Trash2, Edit, X, Save } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function TaskCommentsModal({ task, isOpen, onClose, onUpdate }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadComments();
      loadUser();
    }
  }, [isOpen, task]);

  const loadUser = async () => {
    const user = await User.me();
    setCurrentUser(user);
  };

  const loadComments = async () => {
    if (!task) return;
    setIsLoading(true);
    try {
      const taskComments = await TaskComment.filter({ task_id: task.id }, '-created_date');
      setComments(taskComments || []);
    } catch (error) {
      console.error("Error loading comments:", error);
      setComments([]);
    }
    setIsLoading(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task) return;
    try {
      await TaskComment.create({
        task_id: task.id,
        comment: newComment
      });
      setNewComment('');
      await loadComments();
      onUpdate(); // Notify parent to update comment count
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await TaskComment.delete(commentId);
      await loadComments();
      onUpdate();
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };
  
  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.comment);
  };

  const handleSaveEdit = async () => {
    if (!editingText.trim()) return;
    try {
      await TaskComment.update(editingCommentId, { comment: editingText });
      setEditingCommentId(null);
      setEditingText('');
      await loadComments();
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  };

  const getUserInitials = (email) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Comments for: {task?.task_name}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 p-4 pr-6 -mx-6">
          {isLoading ? (
            <p className="text-center text-slate-500">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No comments yet. Be the first to add one!</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>{getUserInitials(comment.created_by)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-slate-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-slate-800">{comment.created_by}</span>
                    <span className="text-xs text-slate-500">
                      {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true })}
                    </span>
                  </div>
                  {editingCommentId === comment.id ? (
                    <div className="space-y-2">
                        <Textarea 
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="bg-white"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingCommentId(null)}><X className="w-4 h-4 mr-1" />Cancel</Button>
                            <Button size="sm" onClick={handleSaveEdit}><Save className="w-4 h-4 mr-1" />Save</Button>
                        </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.comment}</p>
                      {currentUser?.email === comment.created_by && (
                        <div className="flex justify-end gap-1 mt-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditComment(comment)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => handleDeleteComment(comment.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="w-full flex items-start gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback>{getUserInitials(currentUser?.email)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="pr-12"
                rows={2}
              />
              <Button 
                size="icon" 
                className="absolute right-2 bottom-2 h-8 w-8" 
                onClick={handleAddComment}
                disabled={!newComment.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}