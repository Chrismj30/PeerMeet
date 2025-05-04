import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Video,
  Users,
  Link,
  Lock,
  Unlock,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { Peer } from "peerjs";
import { useTheme } from "@/lib/theme-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const Home = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("join");
  const [userId, setUserId] = useState<string>("");
  const [peerStatus, setPeerStatus] = useState<
    "initializing" | "ready" | "error"
  >("initializing");
  
  // Use the theme context instead of local state
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Initialize PeerJS and get user ID on component mount
  useEffect(() => {
    const initPeer = async () => {
      try {
        const newPeer = new Peer();

        newPeer.on("open", (id) => {
          console.log("My peer ID is:", id);
          setUserId(id);
          setPeerStatus("ready");
        });

        newPeer.on("error", (err) => {
          console.error("Peer connection error:", err);
          setPeerStatus("error");
        });

        // Clean up on unmount
        return () => {
          newPeer.destroy();
        };
      } catch (err) {
        console.error("Failed to initialize PeerJS", err);
        setPeerStatus("error");
      }
    };

    initPeer();
  }, []);

  // Generate a random room ID
  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 7);
  };

  // Handle create room
  const handleCreateRoom = () => {
    if (userId) {
      const newRoomId = generateRoomId(); // Generate a random room ID instead of using userId
      console.log("Creating room with ID:", newRoomId);
      navigate(`/room/${newRoomId}`, {
        state: {
          isHost: true,
          password: isPasswordProtected ? password : null,
          userId: userId,
          userName: "User", // Default username
          roomId: newRoomId, // Pass the room ID separately
        },
      });
    }
  };

  // Handle join room
  const handleJoinRoom = () => {
    if (roomId.trim() && userId) {
      navigate(`/room/${roomId}`, {
        state: {
          isHost: false,
          password: password || null,
          userId: userId,
          userName: "User", // Default username
          roomId: roomId.trim(), // Pass the room ID separately
        },
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="container mx-auto p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Video className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">PeerChat</h1>
        </div>
        <div className="flex items-center gap-4">
          {userId && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="flex items-center gap-1 px-3 py-1"
              >
                <User className="h-3 w-3" />
                <span className="text-xs font-mono">
                  {userId.substring(0, 8)}...
                </span>
              </Badge>
              {peerStatus === "error" && (
                <Badge variant="destructive">Connection Error</Badge>
              )}
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {isDarkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <motion.h2
            className="text-4xl md:text-5xl font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Connect instantly with peer-to-peer video chat
          </motion.h2>
          <motion.p
            className="text-lg text-muted-foreground mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            High-quality, secure video calls with no account required. Share
            your screen, collaborate with annotation tools, and enjoy virtual
            backgrounds.
          </motion.p>
          <motion.div
            className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span>No registration needed</span>
            </div>
            <div className="flex items-center gap-2">
              <Link className="h-5 w-5 text-primary" />
              <span>Shareable room links</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <span>Optional password protection</span>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="flex-1 w-full max-w-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Start or join a meeting</CardTitle>
              <CardDescription>
                Connect with anyone, anywhere, instantly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                defaultValue="join"
                value={activeTab}
                onValueChange={setActiveTab}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="join">Join a Room</TabsTrigger>
                  <TabsTrigger value="create">Create a Room</TabsTrigger>
                </TabsList>

                <TabsContent value="join" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="roomId">Room ID</Label>
                    <Input
                      id="roomId"
                      placeholder="Enter room ID"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password (if required)</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter room password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="create" className="space-y-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="password-protection"
                      checked={isPasswordProtected}
                      onCheckedChange={setIsPasswordProtected}
                    />
                    <Label
                      htmlFor="password-protection"
                      className="flex items-center gap-2"
                    >
                      {isPasswordProtected ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                      Password protect this room
                    </Label>
                  </div>

                  {isPasswordProtected && (
                    <div className="space-y-2">
                      <Label htmlFor="create-password">Set Password</Label>
                      <Input
                        id="create-password"
                        type="password"
                        placeholder="Enter a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={
                  activeTab === "join" ? handleJoinRoom : handleCreateRoom
                }
                disabled={
                  (activeTab === "join" && !roomId.trim()) ||
                  peerStatus !== "ready" ||
                  !userId
                }
              >
                {peerStatus === "initializing"
                  ? "Initializing Connection..."
                  : peerStatus === "error"
                    ? "Connection Error"
                    : activeTab === "join"
                      ? "Join Room"
                      : "Create Room"}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-12">
          Powerful Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div
            className="p-6 border rounded-lg bg-card"
            whileHover={{ y: -5 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Floating Video Bubbles
            </h3>
            <p className="text-muted-foreground">
              Drag, resize, and arrange video feeds however you like for the
              perfect layout.
            </p>
          </motion.div>

          <motion.div
            className="p-6 border rounded-lg bg-card"
            whileHover={{ y: -5 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Screen Sharing</h3>
            <p className="text-muted-foreground">
              Share your screen with annotation tools for collaborative
              discussions.
            </p>
          </motion.div>

          <motion.div
            className="p-6 border rounded-lg bg-card"
            whileHover={{ y: -5 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Background Effects</h3>
            <p className="text-muted-foreground">
              Apply blur, virtual backgrounds, and filters to enhance your video
              experience.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} PeerChat. Built with PeerJS.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
