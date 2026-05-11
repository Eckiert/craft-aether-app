import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eraser, Pencil, Trash2, Undo2 } from "lucide-react";

interface SketchPadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialImageUrl?: string | null;
  onSave: (blob: Blob) => Promise<void> | void;
}

const COLORS = ["#0a0a0a", "#ef4444", "#3b82f6", "#16a34a", "#f59e0b"];
const SIZES = [2, 4, 8, 14];

export function SketchPad({ open, onOpenChange, initialImageUrl, onSave }: SketchPadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(4);
  const [erasing, setErasing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize canvas when dialog opens
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // High-DPI scaling
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    historyRef.current = [];
    if (initialImageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        pushHistory();
      };
      img.src = initialImageUrl;
    } else {
      pushHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialImageUrl]);

  const pushHistory = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 30) historyRef.current.shift();
  };

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    lastPoint.current = getPos(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !lastPoint.current) return;
    const p = getPos(e);
    ctx.strokeStyle = erasing ? "#ffffff" : color;
    ctx.lineWidth = erasing ? size * 3 : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPoint.current = p;
  };

  const onPointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    pushHistory();
  };

  const undo = () => {
    if (historyRef.current.length <= 1) return;
    historyRef.current.pop();
    const last = historyRef.current[historyRef.current.length - 1];
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && last) ctx.putImageData(last, 0, 0);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    pushHistory();
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    canvas.toBlob(async (blob) => {
      if (blob) await onSave(blob);
      setSaving(false);
      onOpenChange(false);
    }, "image/png");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Skizze</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2 border border-border rounded-md p-2 bg-muted/30">
          <Button
            type="button"
            size="sm"
            variant={erasing ? "outline" : "default"}
            onClick={() => setErasing(false)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={erasing ? "default" : "outline"}
            onClick={() => setErasing(true)}
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-border mx-1" />
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setColor(c); setErasing(false); }}
              className={
                "h-7 w-7 rounded-full border-2 transition-transform " +
                (color === c && !erasing ? "border-foreground scale-110" : "border-border")
              }
              style={{ backgroundColor: c }}
              aria-label={`Farbe ${c}`}
            />
          ))}
          <div className="h-6 w-px bg-border mx-1" />
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={
                "h-8 w-8 rounded-md border flex items-center justify-center transition-colors " +
                (size === s ? "border-foreground bg-muted" : "border-border")
              }
              aria-label={`Stift ${s}px`}
            >
              <span
                className="rounded-full bg-foreground"
                style={{ width: s + 2, height: s + 2 }}
              />
            </button>
          ))}
          <div className="ml-auto flex gap-1">
            <Button type="button" size="sm" variant="ghost" onClick={undo}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={clear}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="rounded-md border border-border overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            className="w-full h-[440px] touch-none cursor-crosshair block"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Speichern…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}