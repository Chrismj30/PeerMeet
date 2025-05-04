import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pencil,
  Highlighter,
  Type,
  Eraser,
  X,
  ChevronDown,
  Move,
} from "lucide-react";

interface ScreenShareOverlayProps {
  isActive?: boolean;
  onClose?: () => void;
  onAnnotationUpdate?: (annotations: any) => void;
}

const ScreenShareOverlay = ({
  isActive = true,
  onClose = () => {},
  onAnnotationUpdate = () => {},
}: ScreenShareOverlayProps) => {
  const [activeTab, setActiveTab] = useState("draw");
  const [color, setColor] = useState("#FF3B30");
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const colors = [
    "#FF3B30", // Red
    "#FF9500", // Orange
    "#FFCC00", // Yellow
    "#34C759", // Green
    "#5AC8FA", // Blue
    "#AF52DE", // Purple
    "#000000", // Black
    "#FFFFFF", // White
  ];

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Handle window resize
    const handleResize = () => {
      const prevData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.putImageData(prevData, 0, 0);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isActive]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;

    if (activeTab === "draw") {
      ctx.lineWidth = lineWidth;
      ctx.globalCompositeOperation = "source-over";
    } else if (activeTab === "highlight") {
      ctx.lineWidth = lineWidth * 3;
      ctx.globalAlpha = 0.3;
      ctx.globalCompositeOperation = "source-over";
    } else if (activeTab === "erase") {
      ctx.lineWidth = lineWidth * 2;
      ctx.globalCompositeOperation = "destination-out";
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.closePath();
    setIsDrawing(false);
    ctx.globalAlpha = 1.0;

    // Send annotation update to parent component
    if (canvasRef.current) {
      const annotationData = canvasRef.current.toDataURL();
      onAnnotationUpdate(annotationData);
    }
  };

  const addText = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTab !== "text" || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const text = prompt("Enter text:");
    if (!text) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.font = `${lineWidth * 5}px Arial`;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);

    // Send annotation update to parent component
    const annotationData = canvasRef.current.toDataURL();
    onAnnotationUpdate(annotationData);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    onAnnotationUpdate(null);
  };

  const startDragging = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!toolbarRef.current) return;

    setIsDragging(true);
    const rect = toolbarRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const onDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !toolbarRef.current) return;

    const toolbar = toolbarRef.current;
    const newLeft = e.clientX - position.x;
    const newTop = e.clientY - position.y;

    // Ensure toolbar stays within viewport bounds
    const maxX = window.innerWidth - toolbar.offsetWidth;
    const maxY = window.innerHeight - toolbar.offsetHeight;

    toolbar.style.left = `${Math.max(0, Math.min(newLeft, maxX))}px`;
    toolbar.style.top = `${Math.max(0, Math.min(newTop, maxY))}px`;
  };

  const stopDragging = () => {
    setIsDragging(false);
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 bg-transparent pointer-events-auto">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onMouseDown={activeTab === "text" ? addText : startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />

      <div
        ref={toolbarRef}
        className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg shadow-lg p-2"
        style={{ zIndex: 60 }}
        onMouseDown={startDragging}
        onMouseMove={onDrag}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
      >
        <div className="flex items-center justify-between mb-2 cursor-move">
          <div className="text-sm font-medium">Annotation Tools</div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-2">
            <TabsTrigger value="draw">
              <Pencil className="h-4 w-4 mr-1" />
              Draw
            </TabsTrigger>
            <TabsTrigger value="highlight">
              <Highlighter className="h-4 w-4 mr-1" />
              Highlight
            </TabsTrigger>
            <TabsTrigger value="text">
              <Type className="h-4 w-4 mr-1" />
              Text
            </TabsTrigger>
            <TabsTrigger value="erase">
              <Eraser className="h-4 w-4 mr-1" />
              Erase
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center justify-between gap-4 p-2">
            <div className="flex-1">
              <div className="text-xs mb-1">Thickness</div>
              <Slider
                value={[lineWidth]}
                min={1}
                max={10}
                step={1}
                onValueChange={(value) => setLineWidth(value[0])}
              />
            </div>

            {activeTab !== "erase" && (
              <div>
                <div className="text-xs mb-1">Color</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2">
                    <div className="grid grid-cols-4 gap-1">
                      {colors.map((c) => (
                        <TooltipProvider key={c}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className={`w-8 h-8 rounded-full border-2 ${color === c ? "border-primary" : "border-transparent"}`}
                                style={{ backgroundColor: c }}
                                onClick={() => setColor(c)}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              {c === "#000000"
                                ? "Black"
                                : c === "#FFFFFF"
                                  ? "White"
                                  : c === "#FF3B30"
                                    ? "Red"
                                    : c === "#FF9500"
                                      ? "Orange"
                                      : c === "#FFCC00"
                                        ? "Yellow"
                                        : c === "#34C759"
                                          ? "Green"
                                          : c === "#5AC8FA"
                                            ? "Blue"
                                            : c === "#AF52DE"
                                              ? "Purple"
                                              : c}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <Button variant="destructive" size="sm" onClick={clearCanvas}>
              Clear
            </Button>
          </div>
        </Tabs>

        <div className="flex justify-center mt-1">
          <div className="text-xs text-muted-foreground flex items-center">
            <Move className="h-3 w-3 mr-1" /> Drag to move toolbar
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenShareOverlay;
