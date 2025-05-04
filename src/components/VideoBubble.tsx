import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Pin, Maximize2, Minimize2, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VideoBubbleProps {
  stream?: MediaStream;
  username?: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isActiveSpeaker?: boolean;
  connectionStatus?: "connected" | "connecting" | "disconnected" | "poor";
  onPinToggle?: () => void;
  isPinned?: boolean;
}

const VideoBubble = ({
  stream = null,
  username = "User",
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  isActiveSpeaker = false,
  connectionStatus = "connected",
  onPinToggle = () => {},
  isPinned = false,
}: VideoBubbleProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Set up video stream when component mounts or stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Generate initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  // Get connection status color
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "poor":
        return "bg-orange-500";
      case "disconnected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  // Toggle expanded state
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div
      drag={!isExpanded && !isPinned}
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      className={cn(
        "relative rounded-lg overflow-hidden shadow-lg bg-background border border-border",
        isExpanded ? "fixed inset-4 z-50" : "w-80 h-60",
        isPinned && "ring-2 ring-primary",
        isActiveSpeaker && !isPinned && "ring-2 ring-blue-500",
        isDragging && "cursor-grabbing z-10",
      )}
    >
      {/* Video element */}
      {!isVideoOff && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal || isMuted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
          <div className="rounded-full bg-muted-foreground/10 p-6 mb-4 flex items-center justify-center">
            <VideoOff className="h-12 w-12 text-muted-foreground" />
          </div>
          <div className="text-center">
            <div className="font-medium text-foreground mb-1">{username}</div>
            <div className="text-xs text-muted-foreground">Camera is turned off</div>
          </div>
        </div>
      )}

      {/* Overlay controls */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 opacity-0 hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-white font-medium truncate max-w-[150px]">
              {username}
            </span>
            {isMuted && (
              <MicOff className="h-4 w-4 text-white bg-red-500 rounded-full p-0.5" />
            )}
            {!isMuted && isActiveSpeaker && (
              <Mic className="h-4 w-4 text-white bg-green-500 rounded-full p-0.5" />
            )}
            <div
              className={cn("h-2 w-2 rounded-full", getConnectionStatusColor())}
            />
          </div>

          <div className="flex space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onPinToggle}
                    className="p-1 rounded-full bg-black/30 hover:bg-black/50 text-white"
                    aria-label={isPinned ? "Unpin video" : "Pin video"}
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isPinned ? "Unpin" : "Pin"} video</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleExpanded}
                    className="p-1 rounded-full bg-black/30 hover:bg-black/50 text-white"
                    aria-label={isExpanded ? "Minimize video" : "Maximize video"}
                  >
                    {isExpanded ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isExpanded ? "Minimize" : "Maximize"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Status badges */}
      {connectionStatus === "poor" && (
        <Badge variant="destructive" className="absolute top-2 right-2">
          Poor Connection
        </Badge>
      )}
      {isLocal && (
        <Badge variant="secondary" className="absolute top-2 left-2">
          You
        </Badge>
      )}
    </motion.div>
  );
};

export default VideoBubble;
