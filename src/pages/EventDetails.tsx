import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, MapPin, Users, ArrowLeft, Send, Video, Image as ImageIcon, Edit, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import VideoUpload from "@/components/VideoUpload";
import ImageUpload from "@/components/ImageUpload";

interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  image_url?: string;
  max_attendees?: number;
  tags?: string[];
  video_urls?: string[];
  organizer_id: string;
}

interface Discussion {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles: {
    full_name: string;
    role: string;
  };
}

interface Attendee {
  id: string;
  user_id: string;
  registered_at: string;
  profiles: {
    full_name: string;
    role: string;
    avatar_url?: string;
  };
}

interface Profile {
  full_name: string;
  role: 'admin' | 'user';
  user_id: string;
}

const EventDetails = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [newComment, setNewComment] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    location: "",
    start_date: "",
    end_date: "",
    max_attendees: "",
    image_url: "",
    tags: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
      fetchDiscussions();
      fetchAttendees();
      fetchUserProfile();
    }
  }, [eventId]);

  // Check URL params for edit mode
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editParam = urlParams.get('edit');
    console.log('Checking edit parameter:', editParam);
    console.log('Profile role:', profile?.role);
    console.log('User ID:', profile?.user_id);
    console.log('Event organizer:', event?.organizer_id);
    
    if (editParam === 'true' && profile?.role === 'admin' && event) {
      console.log('Setting edit mode to true');
      setIsEditing(true);
      // Clear the URL parameter to avoid confusion
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [profile, event]);

  const fetchEventDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEvent(data);
      
      // Initialize edit form with event data
      if (data) {
        setEditForm({
          title: data.title,
          description: data.description,
          location: data.location,
          start_date: data.start_date.slice(0, 16), // Format for datetime-local input
          end_date: data.end_date.slice(0, 16),
          max_attendees: data.max_attendees?.toString() || "",
          image_url: data.image_url || "",
          tags: data.tags?.join(", ") || ""
        });
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      toast({
        title: "Error",
        description: "Failed to load event details",
        variant: "destructive",
      });
    }
  };

  const fetchDiscussions = async () => {
    try {
      const { data, error } = await supabase
        .from('event_discussions')
        .select(`
          *,
          profiles (
            full_name,
            role
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setDiscussions(data || []);
    } catch (error) {
      console.error('Error fetching discussions:', error);
    }
  };

  const fetchAttendees = async () => {
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          *,
          profiles (
            full_name,
            role,
            avatar_url
          )
        `)
        .eq('event_id', eventId)
        .order('registered_at', { ascending: true });

      if (error) throw error;
      setAttendees(data || []);
    } catch (error) {
      console.error('Error fetching attendees:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role, user_id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('event_discussions')
        .insert({
          event_id: eventId,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment("");
      fetchDiscussions();
      toast({
        title: "Success",
        description: "Comment posted successfully",
      });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVideoUploaded = async (videoUrl: string) => {
    if (!event) return;

    try {
      const updatedVideoUrls = [...(event.video_urls || []), videoUrl];
      
      const { error } = await supabase
        .from('events')
        .update({ video_urls: updatedVideoUrls })
        .eq('id', eventId);

      if (error) throw error;

      setEvent({ ...event, video_urls: updatedVideoUrls });
      toast({
        title: "Success",
        description: "Video uploaded successfully",
      });
    } catch (error) {
      console.error('Error updating event videos:', error);
      toast({
        title: "Error",
        description: "Failed to save video",
        variant: "destructive",
      });
    }
  };

  const handleEditEvent = async () => {
    if (!event || !profile || profile.role !== 'admin') return;

    try {
      // Validate required fields
      if (!editForm.title || !editForm.description || !editForm.location || 
          !editForm.start_date || !editForm.end_date) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Validate dates
      const startDate = new Date(editForm.start_date);
      const endDate = new Date(editForm.end_date);
      
      if (endDate <= startDate) {
        toast({
          title: "Error",
          description: "End date must be after start date",
          variant: "destructive",
        });
        return;
      }

      // Process tags
      const tags = editForm.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const updateData = {
        title: editForm.title,
        description: editForm.description,
        location: editForm.location,
        start_date: editForm.start_date,
        end_date: editForm.end_date,
        max_attendees: editForm.max_attendees ? parseInt(editForm.max_attendees) : null,
        image_url: editForm.image_url || null,
        tags: tags.length > 0 ? tags : null
      };

      const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', eventId);

      if (error) throw error;

      // Update local state
      setEvent({ ...event, ...updateData });
      setIsEditing(false);
      
      toast({
        title: "Success",
        description: "Event updated successfully",
      });
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
    }
  };

  const handleImageUploaded = (url: string) => {
    setEditForm(prev => ({ ...prev, image_url: url }));
  };

  const handleImageRemoved = () => {
    setEditForm(prev => ({ ...prev, image_url: "" }));
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "EEEE, MMMM dd, yyyy 'at' h:mm a");
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = format(new Date(startDate), "MMM dd");
    const end = format(new Date(endDate), "MMM dd, yyyy");
    return `${start} - ${end}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading event details...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Event Not Found</h2>
          <Button onClick={() => navigate('/')}>Back to Events</Button>
        </div>
      </div>
    );
  }

  const isPastEvent = new Date(event.end_date) < new Date();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="space-y-8">
        {/* Event Header */}
        <Card>
          <CardContent className="p-0">
            {event.image_url && (
              <div className="aspect-video overflow-hidden rounded-t-lg">
                <img
                  src={event.image_url}
                  alt={event.title}
                  className={`w-full h-full object-cover ${isPastEvent ? 'grayscale' : ''}`}
                />
              </div>
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                 <div>
                   <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
                   {isPastEvent && (
                     <Badge variant="secondary" className="mb-4">
                       Event Ended
                     </Badge>
                   )}
                 </div>
                 {profile?.role === 'admin' && (
                   <Dialog open={isEditing} onOpenChange={setIsEditing}>
                     <DialogTrigger asChild>
                       <Button variant="outline" size="sm" className="flex items-center gap-2">
                         <Edit className="h-4 w-4" />
                         Edit Event
                       </Button>
                     </DialogTrigger>
                     <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                       <DialogHeader>
                         <DialogTitle>Edit Event</DialogTitle>
                       </DialogHeader>
                       <div className="space-y-4">
                         <div className="space-y-2">
                           <Label htmlFor="edit-title">Event Title *</Label>
                           <Input
                             id="edit-title"
                             value={editForm.title}
                             onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                             placeholder="Enter event title"
                           />
                         </div>

                         <div className="space-y-2">
                           <Label htmlFor="edit-description">Description *</Label>
                           <Textarea
                             id="edit-description"
                             value={editForm.description}
                             onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                             placeholder="Describe your event..."
                             rows={4}
                           />
                         </div>

                         <div className="space-y-2">
                           <Label htmlFor="edit-location">Location *</Label>
                           <div className="relative">
                             <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                             <Input
                               id="edit-location"
                               value={editForm.location}
                               onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                               placeholder="Event location"
                               className="pl-10"
                             />
                           </div>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <Label htmlFor="edit-start-date">Start Date & Time *</Label>
                             <div className="relative">
                               <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                               <Input
                                 id="edit-start-date"
                                 type="datetime-local"
                                 value={editForm.start_date}
                                 onChange={(e) => setEditForm(prev => ({ ...prev, start_date: e.target.value }))}
                                 className="pl-10"
                               />
                             </div>
                           </div>

                           <div className="space-y-2">
                             <Label htmlFor="edit-end-date">End Date & Time *</Label>
                             <div className="relative">
                               <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                               <Input
                                 id="edit-end-date"
                                 type="datetime-local"
                                 value={editForm.end_date}
                                 onChange={(e) => setEditForm(prev => ({ ...prev, end_date: e.target.value }))}
                                 className="pl-10"
                               />
                             </div>
                           </div>
                         </div>

                         <div className="space-y-2">
                           <Label htmlFor="edit-max-attendees">Maximum Attendees</Label>
                           <div className="relative">
                             <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                             <Input
                               id="edit-max-attendees"
                               type="number"
                               value={editForm.max_attendees}
                               onChange={(e) => setEditForm(prev => ({ ...prev, max_attendees: e.target.value }))}
                               placeholder="Leave empty for unlimited"
                               className="pl-10"
                               min="1"
                             />
                           </div>
                         </div>

                         <div className="space-y-2">
                           <Label>Event Image</Label>
                           <ImageUpload
                             onImageUploaded={handleImageUploaded}
                             currentImage={editForm.image_url}
                             onImageRemoved={handleImageRemoved}
                           />
                         </div>

                         <div className="space-y-2">
                           <Label htmlFor="edit-tags">Tags</Label>
                           <div className="relative">
                             <Tag className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                             <Input
                               id="edit-tags"
                               value={editForm.tags}
                               onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                               placeholder="tech, networking, workshop (separate with commas)"
                               className="pl-10"
                             />
                           </div>
                         </div>

                         <div className="flex gap-4 pt-4">
                           <Button
                             type="button"
                             variant="outline"
                             onClick={() => setIsEditing(false)}
                             className="flex-1"
                           >
                             Cancel
                           </Button>
                           <Button
                             type="button"
                             onClick={handleEditEvent}
                             className="flex-1"
                           >
                             Save Changes
                           </Button>
                         </div>
                       </div>
                     </DialogContent>
                   </Dialog>
                 )}
              </div>
              
              <p className="text-muted-foreground mb-6">{event.description}</p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  {formatDateRange(event.start_date, event.end_date)}
                </div>
                <div className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-2" />
                  {event.location}
                </div>
                {event.max_attendees && (
                  <div className="flex items-center text-sm">
                    <Users className="h-4 w-4 mr-2" />
                    Max {event.max_attendees} attendees
                  </div>
                )}
              </div>

              {event.tags && event.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {event.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Event Videos (for past events) */}
        {isPastEvent && event.video_urls && event.video_urls.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Event Videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {event.video_urls.map((videoUrl, index) => (
                  <div key={index} className="aspect-video">
                    <video
                      controls
                      className="w-full h-full rounded-lg"
                      src={videoUrl}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registered Attendees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Registered Attendees ({attendees.length})
            </CardTitle>
            <CardDescription>
              People who have registered for this event
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attendees.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No attendees registered yet
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attendees.map((attendee) => (
                  <div key={attendee.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {attendee.profiles.avatar_url ? (
                        <img 
                          src={attendee.profiles.avatar_url} 
                          alt={attendee.profiles.full_name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium">
                          {attendee.profiles.full_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{attendee.profiles.full_name}</span>
                        {attendee.profiles.role === 'admin' && (
                          <Badge variant="secondary" className="text-xs">Admin</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Registered on {format(new Date(attendee.registered_at), "MMM dd, yyyy")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Video Upload (for past events) */}
        {isPastEvent && profile?.role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Event Video</CardTitle>
              <CardDescription>
                Upload videos from this event for attendees to view
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VideoUpload 
                onVideoUploaded={handleVideoUploaded} 
                disabled={profile?.role !== 'admin'}
              />
            </CardContent>
          </Card>
        )}

        {/* Discussion Section */}
        <Card>
          <CardHeader>
            <CardTitle>Discussion</CardTitle>
            <CardDescription>
              Share your thoughts about this event
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Existing Comments */}
            <div className="space-y-4">
              {discussions.map((discussion) => (
                <div key={discussion.id} className="border-l-2 border-muted pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{discussion.profiles.full_name}</span>
                      {discussion.profiles.role === 'admin' && (
                        <Badge variant="secondary" className="text-xs">Admin</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(discussion.created_at), "MMM dd, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  <p className="text-sm">{discussion.content}</p>
                </div>
              ))}
              
              {discussions.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No comments yet. Be the first to share your thoughts!
                </p>
              )}
            </div>

            {/* Add Comment Form */}
            {profile && (
              <form onSubmit={handleSubmitComment} className="space-y-4">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts about this event..."
                  rows={3}
                />
                <Button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "Posting..." : "Post Comment"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventDetails;
