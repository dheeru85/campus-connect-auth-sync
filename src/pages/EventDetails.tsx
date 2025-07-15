import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, MapPin, Users, ArrowLeft, Send, Video, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import VideoUpload from "@/components/VideoUpload";

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

interface Profile {
  full_name: string;
  role: 'admin' | 'user';
}

const EventDetails = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [newComment, setNewComment] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
      fetchDiscussions();
      fetchUserProfile();
    }
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEvent(data);
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

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role')
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
              <VideoUpload onVideoUploaded={handleVideoUploaded} />
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
