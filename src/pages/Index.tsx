import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Sparkles, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOpenRouter } from '@/hooks/useOpenRouter';

import FileUpload from '@/components/FileUpload';
import LanguageSelector from '@/components/LanguageSelector';
import TranslationProgress from '@/components/TranslationProgress';
import JSZip from 'jszip';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import translate from 'libretranslate';

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
  const { translateText, isValidating, isLoadingModels } = useOpenRouter();

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Language state
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('es');

  // Translation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translatedFileName, setTranslatedFileName] = useState('');

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setIsComplete(false);
    setError(null);
    // --- INICIO: Extracción de archivos internos EPUB ---
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const fileNames = Object.keys(zip.files);
      // Filtrar archivos que suelen contener el texto (XHTML/HTML)
      const textFiles = fileNames.filter(name =>
        name.endsWith('.xhtml') || name.endsWith('.html')
      );
      console.log('Archivos de texto encontrados en el EPUB:', textFiles);
      // Guardar zip y textFiles en el estado para usarlos en la traducción
      (window as any)._epubZip = zip;
      (window as any)._epubTextFiles = textFiles;
    } catch (e) {
      console.error('Error al analizar el EPUB:', e);
    }
    // --- FIN: Extracción de archivos internos EPUB ---
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setIsComplete(false);
    setError(null);
  }, []);

  // Nueva función: Traducción con LibreTranslate
  const libreTranslateText = async (text: string, sourceLang: string, targetLang: string): Promise<string> => {
    try {
      const res = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: sourceLang === 'auto' ? 'auto' : sourceLang,
          target: targetLang,
          format: 'html'
        })
      });
      const data = await res.json();
      return data.translatedText || text;
    } catch (e) {
      console.error('Error en LibreTranslate:', e);
      return text;
    }
  };

  const handleRealTranslation = useCallback(async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setIsComplete(false);
    setStatus('Preparando archivo EPUB...');
    try {
      const zip = (window as any)._epubZip as JSZip;
      const textFiles: string[] = (window as any)._epubTextFiles;
      if (!zip || !textFiles) throw new Error('No se pudo cargar el EPUB');
      const parser = new XMLParser({ ignoreAttributes: false });
      const builder = new XMLBuilder({ ignoreAttributes: false });
      let currentProgress = 0;
      const progressIncrement = 100 / textFiles.length;
      for (const fileName of textFiles) {
        setStatus(`Traduciendo: ${fileName}`);
        const fileContent = await zip.file(fileName)?.async('string');
        if (!fileContent) continue;
        const xmlObj = parser.parse(fileContent);
        let bodyText = '';
        if (xmlObj.html && xmlObj.html.body) {
          bodyText = builder.build(xmlObj.html.body);
        } else {
          bodyText = fileContent;
        }
        // Traducción con LibreTranslate
        const translated = await libreTranslateText(bodyText, sourceLanguage, targetLanguage);
        if (xmlObj.html && xmlObj.html.body) {
          xmlObj.html.body = parser.parse(`<body>${translated}</body>`).body;
          const newXml = builder.build(xmlObj);
          zip.file(fileName, newXml);
        } else {
          zip.file(fileName, translated);
        }
        currentProgress += progressIncrement;
        setProgress(Math.min(currentProgress, 100));
      }
      setStatus('Generando archivo EPUB traducido...');
      const newEpub = await zip.generateAsync({ type: 'blob' });
      const fileName = selectedFile.name.replace('.epub', `_${targetLanguage}.epub`);
      setTranslatedFileName(fileName);
      (window as any)._epubTranslatedBlob = newEpub;
      setIsComplete(true);
      setStatus('Traducción completada');
      toast({
        title: '¡Traducción completada!',
        description: `El archivo ${fileName} está listo para descargar`
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error durante la traducción');
      toast({
        title: 'Error en la traducción',
        description: 'Hubo un problema durante el proceso de traducción',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, sourceLanguage, targetLanguage, toast]);

  const handleDownload = useCallback(() => {
    const blob = (window as any)._epubTranslatedBlob;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = translatedFileName || 'libro_traducido.epub';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }, [translatedFileName]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setIsComplete(false);
    setError(null);
    setProgress(0);
    setStatus('');
  }, []);

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
                EPUB Translate Free
              </h1>
              <p className="text-sm text-muted-foreground">
                Traduce tus libros electrónicos gratis
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
                  Sube tu archivo .epub y deja que la IA traduzca tu contenido manteniendo el formato y estructura original.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Section */}
        <LanguageSelector
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            onSourceLanguageChange={setSourceLanguage}
            onTargetLanguageChange={setTargetLanguage}
          />

        <Separator className="my-8 opacity-50" />

        {/* Translation Section */}
        <div className="space-y-6">
          <FileUpload
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            onRemoveFile={handleRemoveFile}
            isProcessing={isProcessing}
          />

          {selectedFile && (
            <div className="text-center">
              <Button
                onClick={handleRealTranslation}
                disabled={isProcessing}
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
