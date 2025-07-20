import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Heart, User, Settings, LogOut, Plus, Trash2, Clock } from "lucide-react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface AppLayoutProps {
  children: React.ReactNode;
}

interface Profile {
  full_name: string;
  email: string;
  role: 'admin' | 'user';
  avatar_url?: string;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, email, role, avatar_url')
          .eq('user_id', user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
        }
      }
    };

    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    try {
      // Clean up auth state
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignore errors
      }
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-campus-dark text-white border-b border-campus-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <h1 className="text-xl font-bold">Campus Connect</h1>
            </Link>

            {/* Mobile and Desktop Navigation */}
            <nav className="flex md:flex items-center space-x-1 overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40">
              <Button 
                variant={isActive('/') ? "secondary" : "ghost"} 
                className={isActive('/') ? "text-foreground" : "text-white hover:bg-white/10"}
                asChild
              >
                <Link to="/">
                  <Calendar className="h-4 w-4 mr-2" />
                  Events
                </Link>
              </Button>
              <Button 
                variant={isActive('/my-events') ? "secondary" : "ghost"} 
                className={isActive('/my-events') ? "text-foreground" : "text-white hover:bg-white/10"}
                asChild
              >
                <Link to="/my-events">
                  <User className="h-4 w-4 mr-2" />
                  My Events
                </Link>
              </Button>
              <Button 
                variant={isActive('/favorites') ? "secondary" : "ghost"} 
                className={isActive('/favorites') ? "text-foreground" : "text-white hover:bg-white/10"}
                asChild
              >
                <Link to="/favorites">
                  <Heart className="h-4 w-4 mr-2" />
                  Favorites
                </Link>
              </Button>
              <Button 
                variant={isActive('/past-events') ? "secondary" : "ghost"} 
                className={isActive('/past-events') ? "text-foreground" : "text-white hover:bg-white/10"}
                asChild
              >
                <Link to="/past-events">
                  <Clock className="h-4 w-4 mr-2" />
                  Past Events
                </Link>
              </Button>
              
              {profile?.role === 'admin' && (
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/10"
                  asChild
                >
                  <Link to="/create-event">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Link>
                </Button>
              )}
            </nav>

            <div className="flex items-center space-x-4">
              {profile?.role && (
                <span className="text-sm text-white/70 hidden sm:inline">
                  {profile.role === 'admin' ? 'admin' : 'user'}
                </span>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                      <AvatarFallback className="bg-campus-primary text-white">
                        {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {profile?.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <Settings className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;