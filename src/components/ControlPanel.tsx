import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  Phone,
  Settings,
  Users,
  Image,
  Brush,
} from "lucide-react";

interface ControlPanelProps {
  isMuted?: boolean;
  isVideoEnabled?: boolean;
  isVideoLoading?: boolean;
  isScreenSharing?: boolean;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  onToggleScreenShare?: () => void;
  onOpenAnnotationTools?: () => void;
  onEndCall?: () => void;
  roomId?: string;
  participantCount?: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isMuted = false,
  isVideoEnabled = true,
  isVideoLoading = false,
  isScreenSharing = false,
  onToggleAudio = () => {},
  onToggleVideo = () => {},
  onToggleScreenShare = () => {},
  onOpenAnnotationTools = () => {},
  onEndCall = () => {},
  roomId = "ABC123",
  participantCount = 1,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("audio");

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center items-center p-4 bg-background/80 backdrop-blur-md border-t z-10">
      <div className="flex items-center space-x-2 mr-auto">
        <div className="bg-primary/10 px-3 py-1 rounded-full text-sm text-foreground">
          Room: {roomId}
        </div>
        <div className="flex items-center text-sm text-foreground">
          <Users className="h-4 w-4 mr-1" />
          {participantCount}
        </div>
      </div>

      <div className="flex space-x-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`rounded-full ${isMuted ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}`}
                onClick={onToggleAudio}
              >
                {isMuted ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`rounded-full ${!isVideoEnabled ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}`}
                onClick={onToggleVideo}
                disabled={isVideoLoading}
              >
                {isVideoLoading ? (
                  <span className="animate-spin">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                ) : isVideoEnabled ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <VideoOff className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isVideoLoading 
                ? "Processing camera..." 
                : isVideoEnabled 
                  ? "Turn off camera" 
                  : "Turn on camera"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`rounded-full ${isScreenSharing ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
                onClick={onToggleScreenShare}
              >
                <ScreenShare className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isScreenSharing ? "Stop sharing" : "Share screen"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {isScreenSharing && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={onOpenAnnotationTools}
                >
                  <Brush className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Annotation tools</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                className="rounded-full"
                onClick={onEndCall}
              >
                <Phone className="h-5 w-5 rotate-[135deg]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>End call</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="ml-auto invisible">Spacer</div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="video">Video</TabsTrigger>
              <TabsTrigger value="effects">Effects</TabsTrigger>
            </TabsList>
            <TabsContent value="audio" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="input-device" className="text-foreground">Microphone</Label>
                <Select defaultValue="default">
                  <SelectTrigger id="input-device">
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Microphone</SelectItem>
                    <SelectItem value="mic1">Built-in Microphone</SelectItem>
                    <SelectItem value="mic2">External Microphone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="mic-volume" className="text-foreground">Microphone Volume</Label>
                  <span className="text-sm text-muted-foreground">75%</span>
                </div>
                <Slider
                  id="mic-volume"
                  defaultValue={[75]}
                  max={100}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="noise-suppression" className="text-foreground">Noise Suppression</Label>
                  <Switch id="noise-suppression" defaultChecked />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="video" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="camera-device" className="text-foreground">Camera</Label>
                <Select defaultValue="default">
                  <SelectTrigger id="camera-device">
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Camera</SelectItem>
                    <SelectItem value="cam1">Built-in Webcam</SelectItem>
                    <SelectItem value="cam2">External Camera</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="video-quality" className="text-foreground">Video Quality</Label>
                  <Select defaultValue="720p">
                    <SelectTrigger id="video-quality" className="w-[120px]">
                      <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="360p">360p</SelectItem>
                      <SelectItem value="480p">480p</SelectItem>
                      <SelectItem value="720p">720p (HD)</SelectItem>
                      <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="mirror-video" className="text-foreground">Mirror Video</Label>
                  <Switch id="mirror-video" defaultChecked />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="effects" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="background-effect" className="text-foreground">Background Effect</Label>
                <Select defaultValue="none">
                  <SelectTrigger id="background-effect">
                    <SelectValue placeholder="Select effect" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="blur">Blur</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="beach">Beach</SelectItem>
                    <SelectItem value="space">Space</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="blur-intensity" className="text-foreground">Blur Intensity</Label>
                  <span className="text-sm text-muted-foreground">50%</span>
                </div>
                <Slider
                  id="blur-intensity"
                  defaultValue={[50]}
                  max={100}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-effect" className="text-foreground">Filter</Label>
                <Select defaultValue="none">
                  <SelectTrigger id="filter-effect">
                    <SelectValue placeholder="Select filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="cool">Cool</SelectItem>
                    <SelectItem value="vintage">Vintage</SelectItem>
                    <SelectItem value="grayscale">Grayscale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ControlPanel;
