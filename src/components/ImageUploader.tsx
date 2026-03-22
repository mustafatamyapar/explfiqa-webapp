import { useCallback, useState } from "react";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";

interface ImageUploaderProps {
  label: string;
  onImageSelected: (file: File) => void;
  previewUrl?: string;
}

export function ImageUploader({ label, onImageSelected, previewUrl }: ImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type.startsWith("image/")) {
        onImageSelected(file);
      }
    },
    [onImageSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  }, [handleFile]);

  return (
    <Card
      className={`relative cursor-pointer transition-all border-2 border-dashed p-4 flex flex-col items-center justify-center min-h-[200px] ${
        dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
      }`}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onClick={handleClick}
    >
      {previewUrl ? (
        <div className="flex flex-col items-center gap-2">
          <img
            src={previewUrl}
            alt={label}
            className="max-h-[160px] rounded-md object-contain"
          />
          <p className="text-xs text-muted-foreground">Click to change</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Upload className="h-8 w-8" />
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs">Drag & drop or click to upload</p>
        </div>
      )}
    </Card>
  );
}
