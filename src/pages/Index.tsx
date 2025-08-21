import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Sparkles, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOpenRouter } from '@/hooks/useOpenRouter';

import FileUpload from '@/components/FileUpload';
import ApiKeyInput from '@/components/ApiKeyInput';
import LanguageSelector from '@/components/LanguageSelector';
import ModelSelector from '@/components/ModelSelector';
import TranslationProgress from '@/components/TranslationProgress';

interface Model {
  id: string;
  name: string;
  description: string;
  pricing: string;
  recommended?: boolean;
  fast?: boolean;
}

const Index = () => {
  const { toast } = useToast();
  const { validateApiKey, fetchModels, translateText, isValidating, isLoadingModels } = useOpenRouter();

  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean | null>(null);

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Language state
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('es');

  // Model state
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState('anthropic/claude-3.5-sonnet');

  // Translation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translatedFileName, setTranslatedFileName] = useState('');

  const handleApiKeyValidation = useCallback(async () => {
    if (!apiKey) return;

    const isValid = await validateApiKey(apiKey);
    setIsApiKeyValid(isValid);

    if (isValid) {
      toast({
        title: "API Key válida",
        description: "Conexión establecida correctamente con OpenRouter"
      });

      // Fetch available models
      const availableModels = await fetchModels(apiKey);
      setModels(availableModels);
    } else {
      toast({
        title: "Error de conexión",
        description: "No se pudo validar la API Key",
        variant: "destructive"
      });
    }
  }, [apiKey, validateApiKey, fetchModels, toast]);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setIsComplete(false);
    setError(null);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setIsComplete(false);
    setError(null);
  }, []);

  const simulateTranslation = useCallback(async () => {
    if (!selectedFile || !apiKey || !isApiKeyValid) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setIsComplete(false);

    try {
      // Simulate file processing stages
      const stages = [
        { message: 'Leyendo archivo EPUB...', duration: 1000 },
        { message: 'Extrayendo contenido...', duration: 1500 },
        { message: 'Dividiendo texto en secciones...', duration: 800 },
        { message: 'Traduciendo contenido...', duration: 3000 },
        { message: 'Generando archivo EPUB traducido...', duration: 1200 },
        { message: 'Finalizando traducción...', duration: 500 }
      ];

      let currentProgress = 0;
      const progressIncrement = 100 / stages.length;

      for (const stage of stages) {
        setStatus(stage.message);
        await new Promise(resolve => setTimeout(resolve, stage.duration));
        currentProgress += progressIncrement;
        setProgress(Math.min(currentProgress, 100));
      }

      // Set completion state
      const fileName = selectedFile.name.replace('.epub', `_${targetLanguage}.epub`);
      setTranslatedFileName(fileName);
      setIsComplete(true);
      setStatus('Traducción completada');

      toast({
        title: "¡Traducción completada!",
        description: `El archivo ${fileName} está listo para descargar`
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error durante la traducción');
      toast({
        title: "Error en la traducción",
        description: "Hubo un problema durante el proceso de traducción",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, apiKey, isApiKeyValid, targetLanguage, toast]);

  const handleDownload = useCallback(() => {
    // Create a dummy blob for demonstration
    const blob = new Blob(['EPUB content placeholder'], { type: 'application/epub+zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = translatedFileName;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Descarga iniciada",
      description: "El archivo traducido se está descargando"
    });
  }, [translatedFileName, toast]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setIsComplete(false);
    setError(null);
    setProgress(0);
    setStatus('');
  }, []);

  const canStartTranslation = selectedFile && apiKey && isApiKeyValid && !isProcessing;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-primary/10 bg-gradient-glass backdrop-blur-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <BookOpen className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                EPUB Scribe Translate
              </h1>
              <p className="text-sm text-muted-foreground">
                Traduce tus libros electrónicos con IA avanzada
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Hero Section */}
        <Card className="text-center animate-float">
          <CardContent className="py-12">
            <div className="space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow animate-glow-pulse">
                <Globe className="h-10 w-10 text-primary-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">Traduce cualquier libro en segundos</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Conecta tu API de OpenRouter, sube tu archivo .epub y deja que la IA traduzca 
                  tu contenido manteniendo el formato y estructura original.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ApiKeyInput
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
            onValidateKey={handleApiKeyValidation}
            isValidating={isValidating}
            isValid={isApiKeyValid}
          />
          
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            models={models}
            isLoading={isLoadingModels}
          />
        </div>

        <Separator className="my-8 opacity-50" />

        {/* Translation Section */}
        <div className="space-y-6">
          <LanguageSelector
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            onSourceLanguageChange={setSourceLanguage}
            onTargetLanguageChange={setTargetLanguage}
          />

          <FileUpload
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            onRemoveFile={handleRemoveFile}
            isProcessing={isProcessing}
          />

          {selectedFile && isApiKeyValid && (
            <div className="text-center">
              <Button
                onClick={simulateTranslation}
                disabled={!canStartTranslation}
                variant="glow"
                size="lg"
                className="min-w-48"
              >
                {isProcessing ? (
                  <>
                    <Sparkles className="h-5 w-5 mr-2 animate-spin" />
                    Traduciendo...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Iniciar traducción
                  </>
                )}
              </Button>
            </div>
          )}

          <TranslationProgress
            isProcessing={isProcessing}
            progress={progress}
            status={status}
            isComplete={isComplete}
            error={error}
            translatedFileName={translatedFileName}
            onDownload={handleDownload}
            onReset={handleReset}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
