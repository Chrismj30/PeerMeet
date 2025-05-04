import React, { useState, useEffect, useRef } from "react";
import { Peer, MediaConnection } from "peerjs";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Share,
  Users,
  Settings,
  Phone,
  AlertCircle,
} from "lucide-react";

import VideoBubble from "./VideoBubble";
import ControlPanel from "./ControlPanel";
import ScreenShareOverlay from "./ScreenShareOverlay";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface Stream {
  id: string;
  stream: MediaStream;
  userName?: string;
  isScreenShare?: boolean;
  connectionQuality?: "good" | "fair" | "poor";
}

interface VideoRoomProps {
  roomId?: string;
  userName?: string;
  password?: string;
}

const VideoRoom = ({
  roomId = "",
  userName = "User",
  password = "",
}: VideoRoomProps) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Stream[]>([]);
  const [screenShareStream, setScreenShareStream] =
    useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [participantCount, setParticipantCount] = useState<number>(1);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("connecting");
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  // Use ref to store cleanup functions to avoid state updates
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const connections = useRef<Record<string, MediaConnection>>({});

  // Get user ID and other data from location state
  const userIdFromState = location.state?.userId;
  const userNameFromState = location.state?.userName || userName;
  const isHost = location.state?.isHost || false;
  const passwordFromState = location.state?.password || password;
  const roomIdFromState = location.state?.roomId;

  const actualRoomId = roomId || roomIdFromState || id || "";

  // Initialize peer connection and media streams
  useEffect(() => {
    console.log("VideoRoom mounted with roomId:", actualRoomId);
    console.log("Location state:", location.state);

    // Reset cleanup functions at component mount
    cleanupFunctionsRef.current = [];

    if (!actualRoomId) {
      setErrorMessage("Room ID is missing");
      setConnectionStatus("error");
      return;
    }

    const initPeer = async () => {
      try {
        // Initialize local media stream with fallback options
        let stream;
        try {
          // First, try to get both video and audio
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
        } catch (mediaErr) {
          console.error("Media access error:", mediaErr);
          
          // If camera is in use, try audio only
          if (mediaErr.name === "NotReadableError" || mediaErr.name === "AbortError") {
            try {
              console.log("Camera in use, trying audio only mode...");
              stream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true,
              });
              setIsVideoEnabled(false);
              setErrorMessage("Camera is in use by another application. Using audio only mode.");
            } catch (audioErr) {
              // If audio also fails, create empty stream as last resort
              console.error("Audio access error:", audioErr);
              // Create an empty stream to allow the user to at least join
              stream = new MediaStream();
              setIsAudioEnabled(false);
              setIsVideoEnabled(false);
              setErrorMessage("Could not access camera or microphone. Joining in view-only mode.");
              setConnectionStatus("connected"); // Still allow connection
            }
          } else {
            setErrorMessage(
              "Could not access camera or microphone. Please check permissions."
            );
            setConnectionStatus("error");
            throw mediaErr;
          }
        }

        setLocalStream(stream);

        // Create new Peer instance with a random ID and additional configuration
        const newPeer = new Peer({
          debug: 3, // Log level (0-3)
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ],
            sdpSemantics: 'unified-plan'
          }
        });

        newPeer.on("open", (id) => {
          console.log("My peer ID is:", id);
          console.log("Is host?", isHost);
          console.log("Actual room ID:", actualRoomId);
          setConnectionStatus("connected");

          // Use a shared peer coordination mechanism based on room ID
          // Instead of host/client model, all peers join a "room" and announce themselves
          
          // First, listen for other peers in this room
          const cleanupListener = listenForPeersInRoom(actualRoomId, id, newPeer);
          
          // Then announce our presence to other peers
          const cleanupAnnouncer = announcePeerInRoom(actualRoomId, id);
          
          // Add to cleanup functions
          if (cleanupListener) cleanupFunctionsRef.current.push(cleanupListener);
          if (cleanupAnnouncer) cleanupFunctionsRef.current.push(cleanupAnnouncer);
        });

        newPeer.on("call", (call) => {
          console.log("Received call from:", call.peer);
          
          try {
            // Answer incoming call with local stream
            call.answer(stream);
            
            // Handle incoming stream
            call.on("stream", (remoteStream) => {
              console.log("Received stream from caller:", call.peer);
              
              // Add to remote streams if not already present
              setRemoteStreams((prev) => {
                if (!prev.find((s) => s.id === call.peer)) {
                  console.log("Adding new remote stream from:", call.peer);
                  setParticipantCount((prevCount) => prevCount + 1);
                  return [
                    ...prev,
                    {
                      id: call.peer,
                      stream: remoteStream,
                      userName: "Participant",
                      connectionQuality: "good",
                    },
                  ];
                }
                return prev;
              });
            });
            
            // Handle call errors
            call.on('error', (err) => {
              console.error(`Error in incoming call from ${call.peer}:`, err);
            });
            
            // Handle call closing
            call.on('close', () => {
              console.log(`Incoming call from ${call.peer} closed`);
              
              // Remove from remote streams
              setRemoteStreams((prev) => 
                prev.filter((s) => s.id !== call.peer)
              );
              
              // Update participant count
              setParticipantCount((prevCount) => 
                Math.max(1, prevCount - 1)
              );
            });

            // Store the connection
            connections.current[call.peer] = call;
          } catch (err) {
            console.error("Error answering call:", err);
          }
        });

        newPeer.on("error", (err) => {
          console.error("Peer connection error:", err);
          setErrorMessage("Connection error: " + err.message);
          setConnectionStatus("error");
        });

        newPeer.on("disconnected", () => {
          console.log("Peer disconnected");
          setConnectionStatus("disconnected");
        });

        setPeer(newPeer);
      } catch (err) {
        console.error("Failed to initialize:", err);
        setErrorMessage("Failed to initialize video chat");
        setConnectionStatus("error");
      }
    };

    // Function to listen for peers announcing themselves in the room
    const listenForPeersInRoom = (roomId, myPeerId, peerInstance) => {
      console.log(`Listening for peers in room ${roomId}, my ID: ${myPeerId}`);
      
      // Use BroadcastChannel API for peers to discover each other
      let channel: BroadcastChannel | null = null;
      
      try {
        channel = new BroadcastChannel(`room-${roomId}`);
        
        const messageHandler = (event: MessageEvent) => {
          try {
            const { peerId, action } = event.data;
            
            // Ignore our own announcements
            if (peerId === myPeerId) return;
            
            console.log(`Received ${action} from peer ${peerId} in room ${roomId}`);
            
            if (action === 'join') {
              // Call the newly joined peer with our stream
              if (localStream) {
                console.log(`Calling peer ${peerId}`);
                
                try {
                  // Create a media connection to the remote peer
                  const call = peerInstance.call(peerId, localStream);
                  
                  if (call) {
                    // Store the connection
                    connections.current[peerId] = call;
                    
                    // Set up connection event handlers
                    call.on('stream', (remoteStream) => {
                      console.log(`Received stream from peer ${peerId} via outgoing call`);
                      
                      // Add the remote stream to our list
                      setRemoteStreams((prev) => {
                        // Don't add if we already have this stream
                        if (!prev.find((s) => s.id === peerId)) {
                          setParticipantCount((prevCount) => prevCount + 1);
                          return [
                            ...prev,
                            {
                              id: peerId,
                              stream: remoteStream,
                              userName: "Remote User",
                              connectionQuality: "good",
                            },
                          ];
                        }
                        return prev;
                      });
                    });
                    
                    call.on('error', (err) => {
                      console.error(`Error in outgoing call to ${peerId}:`, err);
                    });
                    
                    call.on('close', () => {
                      console.log(`Outgoing call to ${peerId} closed`);
                      // Remove from connections
                      delete connections.current[peerId];
                      
                      // Remove from remote streams
                      setRemoteStreams((prev) => 
                        prev.filter((s) => s.id !== peerId)
                      );
                      
                      // Update participant count
                      setParticipantCount((prevCount) => 
                        Math.max(1, prevCount - 1)
                      );
                    });
                  } else {
                    console.error(`Failed to create outgoing call to ${peerId}`);
                  }
                } catch (err) {
                  console.error(`Error calling peer ${peerId}:`, err);
                }
              } else {
                console.warn(`Cannot call peer ${peerId} without local stream`);
              }
            }
          } catch (err) {
            console.error("Error processing BroadcastChannel message:", err);
          }
        };
        
        channel.onmessage = messageHandler;
      } catch (err) {
        console.error("Error creating BroadcastChannel:", err);
        return null;
      }
      
      // Clean up when component unmounts
      return () => {
        try {
          if (channel) {
            console.log(`Closing BroadcastChannel for room ${roomId}`);
            channel.close();
            channel = null;
          }
        } catch (err) {
          console.error("Error closing BroadcastChannel:", err);
        }
      };
    };
    
    // Function to announce our presence in the room
    const announcePeerInRoom = (roomId, myPeerId) => {
      console.log(`Announcing presence in room ${roomId}, my ID: ${myPeerId}`);
      
      let channel: BroadcastChannel | null = null;
      let intervalId: number | null = null;
      
      try {
        channel = new BroadcastChannel(`room-${roomId}`);
        
        // Function to send announcement
        const sendAnnouncement = () => {
          try {
            if (channel) {
              channel.postMessage({
                peerId: myPeerId,
                action: 'join'
              });
            }
          } catch (err) {
            console.error("Error sending announcement:", err);
          }
        };
        
        // Send initial announcement
        sendAnnouncement();
        
        // Keep announcing periodically to ensure connectivity
        intervalId = window.setInterval(sendAnnouncement, 5000);
      } catch (err) {
        console.error("Error setting up BroadcastChannel for announcements:", err);
        return null;
      }
      
      // Return cleanup function to clear interval
      return () => {
        try {
          if (intervalId !== null) {
            console.log(`Clearing announcement interval for room ${roomId}`);
            window.clearInterval(intervalId);
            intervalId = null;
          }
          
          if (channel) {
            console.log(`Closing announcement BroadcastChannel for room ${roomId}`);
            channel.close();
            channel = null;
          }
        } catch (err) {
          console.error("Error cleaning up announcements:", err);
        }
      };
    };

    initPeer();

    return () => {
      // Cleanup function
      console.log("Cleaning up VideoRoom component");
      
      // Execute all cleanup functions
      cleanupFunctionsRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (err) {
          console.error("Error during cleanup:", err);
        }
      });
      
      // Clear cleanup functions
      cleanupFunctionsRef.current = [];
      
      // Stop all media tracks
      if (localStream) {
        console.log("Stopping local stream tracks");
        localStream.getTracks().forEach((track) => {
          console.log(`Stopping track: ${track.kind}`);
          track.stop();
        });
      }
      
      if (screenShareStream) {
        console.log("Stopping screen share stream tracks");
        screenShareStream.getTracks().forEach((track) => track.stop());
      }
      
      // Disconnect and destroy peer
      if (peer) {
        console.log("Disconnecting peer");
        peer.disconnect();
        peer.destroy();
      }
    };
  }, [actualRoomId, userIdFromState, isHost]);

  // Handle audio toggle
  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  // Handle video toggle
  const toggleVideo = async () => {
    try {
      if (!isVideoEnabled) {
        // If we are turning video back on
        setIsVideoLoading(true);
        
        if (localStream) {
          // Check if we already have video tracks
          const existingVideoTracks = localStream.getVideoTracks();
          
          // Need to get camera access
          console.log("Requesting camera access to turn video back on");
          try {
            // Try to get camera access
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const videoTrack = videoStream.getVideoTracks()[0];
            
            if (videoTrack) {
              // Add the new video track to our existing stream
              localStream.addTrack(videoTrack);
              console.log("Added new video track to stream");
              
              // Update all existing connections with the new stream
              Object.values(connections.current).forEach(connection => {
                // Replace the stream in existing connections
                try {
                  // This is the best way to update the stream in existing connections
                  // but it depends on browser support
                  if (connection.peerConnection && typeof connection.peerConnection.getSenders === 'function') {
                    const senders = connection.peerConnection.getSenders();
                    const videoSender = senders.find(sender => 
                      sender.track && sender.track.kind === 'video'
                    );
                    
                    if (videoSender) {
                      videoSender.replaceTrack(videoTrack);
                      console.log("Replaced video track in connection");
                    } else {
                      console.log("No video sender found in connection");
                    }
                  }
                } catch (err) {
                  console.error("Error updating connection with new video track:", err);
                }
              });
            }
          } catch (err) {
            console.error("Could not get camera access:", err);
            setErrorMessage("Could not access camera. It might be in use by another application.");
            setIsVideoLoading(false);
            return; // Exit without changing isVideoEnabled
          }
        }
        setIsVideoEnabled(true);
        setIsVideoLoading(false);
        
        // Show a status message confirming the camera is on
        setErrorMessage("Camera has been turned on.");
        // Auto-clear the message after 3 seconds
        setTimeout(() => {
          setErrorMessage(prev => prev === "Camera has been turned on." ? "" : prev);
        }, 3000);
      } else {
        // Turning video off - STOP the tracks completely, not just disable them
        setIsVideoLoading(true);
        
        if (localStream) {
          const videoTracks = localStream.getVideoTracks();
          
          // Remove and stop each video track
          videoTracks.forEach(track => {
            console.log("Stopping video track completely");
            
            // First remove the track from any RTCPeerConnection sender
            Object.values(connections.current).forEach(connection => {
              try {
                if (connection.peerConnection && typeof connection.peerConnection.getSenders === 'function') {
                  const senders = connection.peerConnection.getSenders();
                  const videoSender = senders.find(sender => 
                    sender.track && sender.track.kind === 'video' && sender.track.id === track.id
                  );
                  
                  if (videoSender) {
                    // Replace with null track or remove sender
                    videoSender.replaceTrack(null);
                    console.log("Removed video track from connection");
                  }
                }
              } catch (err) {
                console.error("Error removing video track from connection:", err);
              }
            });
            
            // Remove the track from the stream
            try {
              localStream.removeTrack(track);
            } catch (err) {
              console.error("Error removing track from stream:", err);
            }
            
            // Stop the track to turn off the camera
            track.stop();
            console.log("Video track stopped");
          });

          // Show a status message confirming the camera is completely off
          if (videoTracks.length > 0) {
            setErrorMessage("Camera has been turned off completely.");
            // Auto-clear the message after 3 seconds
            setTimeout(() => {
              setErrorMessage(prev => prev === "Camera has been turned off completely." ? "" : prev);
            }, 3000);
          }
        }
        setIsVideoEnabled(false);
        setIsVideoLoading(false);
      }
    } catch (err) {
      console.error("Error toggling video:", err);
      setErrorMessage("Error toggling video: " + err.message);
      setIsVideoLoading(false);
    }
  };

  // Handle screen sharing
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        setScreenShareStream(screenStream);
        setIsScreenSharing(true);

        // Share screen with all connected peers
        Object.values(connections.current).forEach((connection) => {
          peer?.call(connection.peer, screenStream, {
            metadata: { isScreenShare: true },
          });
        });

        // Handle when user stops screen sharing
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setIsAnnotating(false);
          setScreenShareStream(null);
        };
      } catch (err) {
        console.error("Error sharing screen:", err);
      }
    } else {
      // Stop screen sharing
      screenShareStream?.getTracks().forEach((track) => track.stop());
      setIsScreenSharing(false);
      setIsAnnotating(false);
      setScreenShareStream(null);
    }
  };

  // Toggle annotation mode
  const toggleAnnotation = () => {
    if (isScreenSharing) {
      setIsAnnotating(!isAnnotating);
    }
  };

  // Leave the room
  const leaveRoom = () => {
    console.log("Leaving room, cleaning up resources");
    
    // Execute all cleanup functions
    try {
      cleanupFunctionsRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (err) {
          console.error("Error during cleanup in leaveRoom:", err);
        }
      });
      // Clear cleanup functions
      cleanupFunctionsRef.current = [];
    } catch (err) {
      console.error("Error executing cleanup functions:", err);
    }
    
    // Stop all media tracks
    try {
      if (localStream) {
        console.log("Stopping local stream tracks");
        localStream.getTracks().forEach((track) => {
          console.log(`Stopping track: ${track.kind}`);
          track.stop();
        });
      }
      
      if (screenShareStream) {
        console.log("Stopping screen share stream tracks");
        screenShareStream.getTracks().forEach((track) => track.stop());
      }
    } catch (err) {
      console.error("Error stopping media tracks:", err);
    }
    
    // Close all peer connections
    try {
      Object.values(connections.current).forEach((connection) => {
        connection.close();
      });
      connections.current = {};
    } catch (err) {
      console.error("Error closing peer connections:", err);
    }
    
    // Disconnect and destroy peer
    try {
      if (peer) {
        console.log("Disconnecting peer");
        peer.disconnect();
        peer.destroy();
      }
    } catch (err) {
      console.error("Error disconnecting peer:", err);
    }
    
    // Navigate back to home
    navigate("/");
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      {/* Room information header */}
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-semibold text-foreground">Room: {actualRoomId}</h2>
          <Badge variant="outline" className="flex items-center">
            <Users className="h-3 w-3 mr-1" />
            {participantCount}
          </Badge>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={leaveRoom}>
                <X className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Leave Room</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Error/Status Message Display */}
      {errorMessage && (
        <Alert variant={connectionStatus === "error" ? "destructive" : "default"} className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-foreground">{connectionStatus === "error" ? "Error" : "Status"}</AlertTitle>
          <AlertDescription className="text-foreground">{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Connection Debug Info */}
      <details className="m-4 p-2 border rounded-md">
        <summary className="font-semibold cursor-pointer text-foreground">Connection Debug Info</summary>
        <div className="mt-2 p-2 bg-muted rounded text-xs font-mono whitespace-pre-wrap text-foreground">
          <div><strong>Room ID:</strong> {actualRoomId}</div>
          <div><strong>My Peer ID:</strong> {peer?.id || "Not connected"}</div>
          <div><strong>Role:</strong> {isHost ? "Host" : "Participant"}</div>
          <div><strong>Connection Status:</strong> {connectionStatus}</div>
          <div><strong>Media Status:</strong> 
            Audio: {isAudioEnabled ? "Enabled" : "Disabled"}, 
            Video: {isVideoEnabled ? "Enabled" : "Disabled"}
          </div>
          <div><strong>Connected Peers:</strong> {Object.keys(connections.current).length}</div>
          <div><strong>Remote Streams:</strong> {remoteStreams.length}</div>
          <div className="mt-2">
            <strong>Connected Peer IDs:</strong>
            <ul className="list-disc pl-4">
              {Object.keys(connections.current).map(id => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </div>
        </div>
      </details>

      {/* Main content area */}
      <div className="flex-1 relative overflow-hidden p-4">
        {/* Screen sharing overlay */}
        {isScreenSharing && screenShareStream && (
          <div className="absolute inset-0 z-10">
            <Card className="h-full w-full overflow-hidden">
              {isAnnotating && (
                <ScreenShareOverlay
                  isActive={isAnnotating}
                  onClose={() => setIsAnnotating(false)}
                />
              )}
              <video
                className="h-full w-full object-contain"
                ref={(video) => {
                  if (video && screenShareStream) {
                    video.srcObject = screenShareStream;
                  }
                }}
                autoPlay
                playsInline
              />
            </Card>
          </div>
        )}

        {/* Video grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
          {/* Local video */}
          {localStream && (
            <VideoBubble
              stream={localStream}
              username={userNameFromState}
              isLocal={true}
              isMuted={!isAudioEnabled}
              isVideoOff={!isVideoEnabled}
              connectionStatus="connected"
            />
          )}

          {/* Remote videos */}
          {remoteStreams.map((stream) => (
            <VideoBubble
              key={stream.id}
              stream={stream.stream}
              username={stream.userName || ""}
              isVideoOff={false}
              isMuted={false}
              connectionStatus={
                stream.connectionQuality === "good" ? "connected" : "poor"
              }
            />
          ))}
        </div>
      </div>

      {/* Control panel */}
      <ControlPanel
        isMuted={!isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isVideoLoading={isVideoLoading}
        isScreenSharing={isScreenSharing}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onOpenAnnotationTools={() => setIsAnnotating(true)}
        onEndCall={leaveRoom}
        roomId={actualRoomId}
        participantCount={participantCount}
      />
    </div>
  );
};

export default VideoRoom;
