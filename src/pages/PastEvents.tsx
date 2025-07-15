import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
}

const PastEvents = () => {
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchPastEvents();
  }, []);

  const fetchPastEvents = async () => {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .lt('end_date', now)
        .order('end_date', { ascending: false });

      if (error) throw error;
      setPastEvents(data || []);
    } catch (error) {
      console.error('Error fetching past events:', error);
      toast({
        title: "Error",
        description: "Failed to load past events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm a");
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = format(new Date(startDate), "MMM dd");
    const end = format(new Date(endDate), "MMM dd, yyyy");
    return `${start} - ${end}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading past events...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Past Events</h1>
        <p className="text-muted-foreground mt-2">Events that have already concluded</p>
      </div>

      {pastEvents.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Past Events</h3>
            <p className="text-muted-foreground">
              No events have concluded yet. Check back later to see past events!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pastEvents.map((event) => (
            <Card 
              key={event.id} 
              className="overflow-hidden hover:shadow-lg transition-shadow opacity-75 cursor-pointer"
              onClick={() => navigate(`/events/${event.id}`)}
            >
              {event.image_url && (
                <div className="aspect-video overflow-hidden">
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-full object-cover grayscale"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                  <Badge variant="secondary" className="ml-2">
                    Ended
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {event.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDateRange(event.start_date, event.end_date)}
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
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PastEvents;