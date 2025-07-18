import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Users, Edit, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

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
  category_id?: string;
  organizer_id: string;
}

interface Profile {
  full_name: string;
  role: 'admin' | 'user';
}

const MyEvents = () => {
  const [organizedEvents, setOrganizedEvents] = useState<Event[]>([]);
  const [attendingEvents, setAttendingEvents] = useState<Event[]>([]);
  const [attendedEvents, setAttendedEvents] = useState<Event[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('user_id', user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Get organized events (only for admins)
      if (profileData?.role === 'admin') {
        const { data: organizedData, error: organizedError } = await supabase
          .from('events')
          .select('*')
          .eq('organizer_id', user.id)
          .order('start_date', { ascending: true });

        if (organizedError) throw organizedError;
        setOrganizedEvents(organizedData || []);
      }

      // Get attending events (future events user is registered for)
      const { data: attendingData, error: attendingError } = await supabase
        .from('event_attendees')
        .select(`
          events (
            id,
            title,
            description,
            start_date,
            end_date,
            location,
            image_url,
            max_attendees,
            tags,
            category_id,
            organizer_id
          )
        `)
        .eq('user_id', user.id);

      if (attendingError) throw attendingError;

      const currentTime = new Date().toISOString();
      const allAttendingEvents = attendingData?.map(item => item.events).filter(Boolean) as Event[] || [];
      
      setAttendingEvents(allAttendingEvents.filter(event => event.end_date >= currentTime));
      setAttendedEvents(allAttendingEvents.filter(event => event.end_date < currentTime));

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load your events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setOrganizedEvents(organizedEvents.filter(event => event.id !== eventId));
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm a");
  };

  const renderEventCard = (event: Event, showActions = false) => (
    <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
      {event.image_url && (
        <div className="aspect-video overflow-hidden">
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="line-clamp-2">{event.title}</CardTitle>
          {showActions && (
            <div className="flex gap-2 ml-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {/* TODO: Navigate to edit page */}}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteEvent(event.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <CardDescription className="line-clamp-2">
          {event.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            {formatDate(event.start_date)}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mr-2" />
            {event.location}
          </div>
          {event.max_attendees && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="h-4 w-4 mr-2" />
              Max {event.max_attendees} attendees
            </div>
          )}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {event.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <Button 
            variant="outline" 
            className="w-full mt-3"
            onClick={() => navigate(`/events/${event.id}`)}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading your events...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Events</h1>
          <p className="text-muted-foreground mt-2">Manage your organized events and view events you're attending</p>
        </div>
        {profile?.role === 'admin' && (
          <Button 
            onClick={() => navigate('/create-event')}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Create New Event
          </Button>
        )}
      </div>

      <Tabs defaultValue="attending" className="w-full">
        <TabsList className={`grid w-full ${profile?.role === 'admin' ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="attending" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Attending ({attendingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="attended" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Attended ({attendedEvents.length})
          </TabsTrigger>
          {profile?.role === 'admin' && (
            <TabsTrigger value="organized" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Organized ({organizedEvents.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="attending" className="mt-6">
          {attendingEvents.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Upcoming Events</h3>
                <p className="text-muted-foreground mb-4">
                  You're not registered for any upcoming events. Browse events to find something interesting!
                </p>
                <Button onClick={() => navigate('/')}>
                  Browse Events
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {attendingEvents.map((event) => renderEventCard(event))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attended" className="mt-6">
          {attendedEvents.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Past Events</h3>
                <p className="text-muted-foreground">
                  You haven't attended any events yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {attendedEvents.map((event) => renderEventCard(event))}
            </div>
          )}
        </TabsContent>

        {profile?.role === 'admin' && (
          <TabsContent value="organized" className="mt-6">
            {organizedEvents.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Organized Events</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't created any events yet. Start by creating your first event!
                  </p>
                  <Button onClick={() => navigate('/create-event')}>
                    Create Your First Event
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {organizedEvents.map((event) => renderEventCard(event, true))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default MyEvents;