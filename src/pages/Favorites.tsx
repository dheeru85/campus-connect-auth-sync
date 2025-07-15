import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Heart, HeartOff } from "lucide-react";
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

const Favorites = () => {
  const [favoriteEvents, setFavoriteEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFavoriteEvents();
  }, []);

  const fetchFavoriteEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('event_favorites')
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
            category_id
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      const events = data?.map(item => item.events).filter(Boolean) || [];
      setFavoriteEvents(events as Event[]);
    } catch (error) {
      console.error('Error fetching favorite events:', error);
      toast({
        title: "Error",
        description: "Failed to load your favorite events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromFavorites = async (eventId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('event_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', eventId);

      if (error) throw error;

      setFavoriteEvents(favoriteEvents.filter(event => event.id !== eventId));
      toast({
        title: "Success",
        description: "Event removed from favorites",
      });
    } catch (error) {
      console.error('Error removing from favorites:', error);
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm a");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading your favorite events...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Favorite Events</h1>
        <p className="text-muted-foreground mt-2">Events you've saved for later</p>
      </div>

      {favoriteEvents.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Favorite Events</h3>
            <p className="text-muted-foreground mb-4">
              You haven't added any events to your favorites yet. Browse events and save the ones you're interested in!
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Browse Events
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {favoriteEvents.map((event) => (
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFromFavorites(event.id)}
                    className="text-red-500 hover:text-red-600 ml-2"
                  >
                    <HeartOff className="h-4 w-4" />
                  </Button>
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;