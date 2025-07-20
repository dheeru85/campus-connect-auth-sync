import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Grid, Calendar, MapPin, Users, Heart, Edit, Trash2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, parseISO } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  image_url?: string;
  max_attendees?: number;
  organizer_id: string;
  category_id?: string;
  tags?: string[];
  attendee_count?: number;
  event_categories?: {
    name: string;
    color: string;
  };
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Profile {
  full_name: string;
  role: 'admin' | 'user';
  user_id: string;
}

const Index = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [registeredEvents, setRegisteredEvents] = useState<Set<string>>(new Set());
  const [favoriteEvents, setFavoriteEvents] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user profile
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, role, user_id')
            .eq('user_id', user.id)
            .single();
          
          if (profileData) {
            setProfile(profileData);
          }
        }

        // Get categories
        const { data: categoriesData } = await supabase
          .from('event_categories')
          .select('id, name, color')
          .order('name');
        
        if (categoriesData) {
          setCategories(categoriesData);
        }

        // Get events with attendee counts and categories
        const { data: eventsData, error } = await supabase
          .from('events')
          .select(`
            *,
            event_attendees(count),
            event_categories(name, color)
          `)
          .gte('end_date', new Date().toISOString())
          .order('start_date', { ascending: true });

        if (error) throw error;
        
        const eventsWithCounts = eventsData?.map(event => ({
          ...event,
          attendee_count: event.event_attendees?.[0]?.count || 0
        })) || [];
        
        setEvents(eventsWithCounts);

        // Get user's registered events and favorites
        if (user) {
          const { data: attendeeData } = await supabase
            .from('event_attendees')
            .select('event_id')
            .eq('user_id', user.id);
          
          if (attendeeData) {
            setRegisteredEvents(new Set(attendeeData.map(a => a.event_id)));
          }

          const { data: favoriteData } = await supabase
            .from('event_favorites')
            .select('event_id')
            .eq('user_id', user.id);
          
          if (favoriteData) {
            setFavoriteEvents(new Set(favoriteData.map(f => f.event_id)));
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load events",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRegisterEvent = async (eventId: string, maxAttendees?: number, currentCount = 0) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to register for events",
          variant: "destructive",
        });
        return;
      }

      if (maxAttendees && currentCount >= maxAttendees) {
        toast({
          title: "Event is full",
          description: "This event has reached maximum capacity",
          variant: "destructive",
        });
        return;
      }

      const isRegistered = registeredEvents.has(eventId);

      if (isRegistered) {
        // Unregister
        const { error } = await supabase
          .from('event_attendees')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);

        if (error) throw error;

        setRegisteredEvents(prev => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });

        setEvents(prev => prev.map(event => 
          event.id === eventId 
            ? { ...event, attendee_count: Math.max(0, (event.attendee_count || 0) - 1) }
            : event
        ));

        toast({
          title: "Unregistered",
          description: "You have been unregistered from the event",
        });
      } else {
        // Register
        const { error } = await supabase
          .from('event_attendees')
          .insert({ event_id: eventId, user_id: user.id });

        if (error) throw error;

        setRegisteredEvents(prev => new Set([...prev, eventId]));
        setEvents(prev => prev.map(event => 
          event.id === eventId 
            ? { ...event, attendee_count: (event.attendee_count || 0) + 1 }
            : event
        ));

        toast({
          title: "Registered",
          description: "You have been registered for the event",
        });
      }
    } catch (error) {
      console.error('Error handling registration:', error);
      toast({
        title: "Error",
        description: "Failed to update registration",
        variant: "destructive",
      });
    }
  };

  const handleToggleFavorite = async (eventId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to add favorites",
          variant: "destructive",
        });
        return;
      }

      const isFavorited = favoriteEvents.has(eventId);

      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('event_favorites')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);

        if (error) throw error;

        setFavoriteEvents(prev => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });

        toast({
          title: "Removed from favorites",
          description: "Event removed from your favorites",
        });
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('event_favorites')
          .insert({ event_id: eventId, user_id: user.id });

        if (error) throw error;

        setFavoriteEvents(prev => new Set([...prev, eventId]));

        toast({
          title: "Added to favorites",
          description: "Event added to your favorites",
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    }
  };

  const renderCalendarView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const startPadding = getDay(monthStart);
    const paddingDays = Array.from({ length: startPadding }, (_, i) => new Date(monthStart.getTime() - (startPadding - i) * 24 * 60 * 60 * 1000));
    
    const allDays = [...paddingDays, ...daysInMonth];
    
    const getEventsForDay = (day: Date) => {
      return filteredEvents.filter(event => 
        isSameDay(parseISO(event.start_date), day)
      );
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            >
              Back
            </Button>
            <h2 className="text-xl font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <Button
              variant="outline"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            >
              Next
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              Month
            </Button>
            <Button variant="outline" size="sm">Week</Button>
            <Button variant="outline" size="sm">Day</Button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-0 border border-border rounded-lg overflow-hidden">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-4 bg-muted text-center font-medium border-b">
              {day}
            </div>
          ))}
          
          {allDays.map((day, index) => {
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const dayEvents = getEventsForDay(day);
            
            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border-b border-r border-border ${
                  !isCurrentMonth ? 'bg-muted/50 text-muted-foreground' : 'bg-background'
                }`}
              >
                <div className="font-medium mb-2">
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className="text-xs p-1 bg-primary/10 text-primary rounded cursor-pointer hover:bg-primary/20"
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || event.category_id === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-campus-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-campus-dark">Discover Events</h1>
          <p className="text-muted-foreground">Find and join exciting campus activities</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{category.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger 
              value="grid" 
              className="flex items-center gap-2"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
              Grid View
            </TabsTrigger>
            <TabsTrigger 
              value="calendar" 
              className="flex items-center gap-2"
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Events Display */}
      {viewMode === 'calendar' ? (
        renderCalendarView()
      ) : (
        filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No events found. Check back later!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const isRegistered = registeredEvents.has(event.id);
              const isFull = event.max_attendees && (event.attendee_count || 0) >= event.max_attendees;
              
              return (
                <Card key={event.id} className="border-campus-border hover:shadow-lg transition-shadow">
                  {event.image_url && (
                    <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                      <img 
                        src={event.image_url} 
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg leading-tight">{event.title}</CardTitle>
                      <div className="flex items-center gap-1">
                        {profile?.role === 'admin' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = `/events/${event.id}?edit=true`;
                                console.log('Navigating to:', url);
                                navigate(url);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = `/events/${event.id}?delete=true`;
                                console.log('Navigating to:', url);
                                navigate(url);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(event.id);
                          }}
                        >
                          <Heart className={`h-4 w-4 ${favoriteEvents.has(event.id) ? 'fill-red-500 text-red-500' : ''}`} />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {event.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(event.start_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>
                          {event.attendee_count || 0}
                          {event.max_attendees ? ` / ${event.max_attendees}` : ''} attendees
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {event.event_categories && (
                        <Badge 
                          variant="secondary" 
                          className="text-xs"
                          style={{ 
                            backgroundColor: `${event.event_categories.color}20`,
                            color: event.event_categories.color,
                            borderColor: event.event_categories.color
                          }}
                        >
                          {event.event_categories.name}
                        </Badge>
                      )}
                      {event.tags && event.tags.length > 0 && event.tags.slice(0, 2).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button 
                        className={`flex-1 ${
                          isRegistered 
                            ? 'bg-destructive hover:bg-destructive/90' 
                            : 'bg-campus-primary hover:bg-campus-primary/90'
                        }`}
                        disabled={!isRegistered && isFull}
                        onClick={() => handleRegisterEvent(event.id, event.max_attendees, event.attendee_count)}
                      >
                        {isFull && !isRegistered ? 'Event Full' : isRegistered ? 'Unregister' : 'Register'}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                       onClick={() => navigate(`/events/${event.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default Index;
