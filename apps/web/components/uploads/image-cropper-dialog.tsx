"use client";

import * as React from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const OUTPUT_SIZE = 512;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Couldn't read this image"));
    image.src = src;
  });
}

/** Renders the chosen square of the source image into a 512px WebP. */
async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Couldn't prepare the image");

  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't export the image"))),
      "image/webp",
      0.9,
    ),
  );
}

/** Pan and zoom a picture inside a round frame, then hand back the cropped square. */
export function ImageCropperDialog({
  file,
  onCancel,
  onCropped,
  isSaving = false,
  title = "Crop your photo",
}: {
  /** The picked image; the dialog is open while this is set. */
  file: File | null;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
  isSaving?: boolean;
  title?: string;
}) {
  const [src, setSrc] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [area, setArea] = React.useState<Area | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setError(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function save() {
    if (!src || !area) return;
    try {
      onCropped(await cropToBlob(src, area));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't crop this image");
    }
  }

  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => !open && !isSaving && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Drag to move, use the slider or scroll to zoom.</DialogDescription>
        </DialogHeader>
        <div className="relative h-72 overflow-hidden rounded-lg bg-muted">
          {src ? (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          ) : null}
        </div>
        <Slider
          value={[zoom]}
          min={1}
          max={4}
          step={0.01}
          onValueChange={([value]) => setZoom(value ?? 1)}
          aria-label="Zoom"
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={save} isLoading={isSaving} disabled={!area}>
            Use photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
