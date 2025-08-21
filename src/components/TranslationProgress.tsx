import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TranslationProgressProps {
  isProcessing: boolean;
  progress: number;
  status: string;
  isComplete: boolean;
  error: string | null;
  translatedFileName: string;
  onDownload: () => void;
  onReset: () => void;
}

const TranslationProgress: React.FC<TranslationProgressProps> = ({
  isProcessing,
  progress,
  status,
  isComplete,
  error,
  translatedFileName,
  onDownload,
  onReset
}) => {
  if (!isProcessing && !isComplete && !error) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : error ? (
            <AlertCircle className="h-5 w-5 text-red-500" />
          ) : (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          )}
          Estado de la traducción
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{status}</span>
                <span className="text-primary font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {error && (
            <div className="p-4 rounded-md bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">
                Error: {error}
              </p>
            </div>
          )}

          {isComplete && (
            <div className="space-y-4">
              <div className="p-4 rounded-md bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-400 font-medium">
                  ¡Traducción completada exitosamente!
                </p>
                <p className="text-xs text-green-400/80 mt-1">
                  Archivo: {translatedFileName}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={onDownload}
                  variant="glow"
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar archivo traducido
                </Button>
                <Button
                  onClick={onReset}
                  variant="outline"
                >
                  Traducir otro
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TranslationProgress;