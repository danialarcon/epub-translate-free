import React, { useCallback, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onRemoveFile: () => void;
  isProcessing?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  selectedFile,
  onRemoveFile,
  isProcessing = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const epubFile = files.find(file => file.name.endsWith('.epub'));
    
    if (epubFile) {
      onFileSelect(epubFile);
    }
  }, [onFileSelect]);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.epub')) {
      onFileSelect(file);
    }
  };

  if (selectedFile) {
    return (
      <Card className="relative">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <FileText className="h-12 w-12 text-primary animate-float" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {selectedFile.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!isProcessing && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRemoveFile}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "relative border-2 border-dashed transition-all duration-300 cursor-pointer",
        isDragOver 
          ? "border-primary/60 bg-primary/5 shadow-glow" 
          : "border-primary/20 hover:border-primary/40"
      )}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <CardContent className="p-12 text-center">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow animate-float">
            <Upload className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Arrastra tu archivo .epub aquí</h3>
            <p className="text-muted-foreground">
              O haz clic para seleccionar un archivo
            </p>
          </div>
          <input
            type="file"
            accept=".epub"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;