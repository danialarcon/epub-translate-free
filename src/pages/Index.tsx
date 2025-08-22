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
// Nueva función: Traducción con Google Translate API optimizada
// Endpoint local para traducción (evita CORS)
const googleTranslateText = async (text: string, sourceLang: string, targetLang: string, retries: number = 2): Promise<string> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, from: sourceLang === 'auto' ? 'auto' : sourceLang, to: targetLang })
      });
      
      if (res.ok) {
        const data = await res.json();
        return data.translatedText || text;
      } else if (res.status === 408) {
        // Timeout - reintentar
        console.warn(`Timeout en intento ${attempt + 1}, reintentando...`);
        if (attempt < retries) {
          await sleep(1000 * (attempt + 1)); // Backoff exponencial
          continue;
        }
      } else {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (e) {
      console.error(`Error en Google Translate (intento ${attempt + 1}):`, e);
      if (attempt < retries) {
        await sleep(500 * (attempt + 1)); // Backoff exponencial
        continue;
      }
    }
  }
  
  // Si todos los intentos fallan, devolver texto original
  return text;
};

// Determina si un archivo debe omitirse de traducción
const shouldSkipTranslation = (name: string) => {
  const lower = name.toLowerCase();
  return lower.includes('toc') || lower.includes('nav') || lower.includes('cover') || lower.endsWith('.css');
};

interface Model {
  id: string;
  name: string;
  description: string;
  pricing: string;
  recommended?: boolean;
  fast?: boolean;
}

// Función para dividir texto en fragmentos más pequeños y optimizados
const splitTextIntoChunks = (text: string, maxChunkSize: number = 2000): string[] => {
  const chunks: string[] = [];
  let currentChunk = '';
  
  // Dividir por párrafos primero
  const paragraphs = text.split(/(<\/p>|<\/div>|<\/h[1-6]>)/);
  
  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = paragraph;
    } else {
      currentChunk += paragraph;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks.length > 0 ? chunks : [text];
};

// Función para traducir chunks en paralelo con rate limiting
const translateChunksInParallel = async (
  chunks: string[], 
  sourceLanguage: string, 
  targetLanguage: string,
  maxConcurrent: number = 3
): Promise<string[]> => {
  const results: string[] = new Array(chunks.length);
  const translatedChunks: string[] = [];
  
  // Procesar chunks en lotes para evitar sobrecargar la API
  for (let i = 0; i < chunks.length; i += maxConcurrent) {
    const batch = chunks.slice(i, i + maxConcurrent);
    const promises = batch.map(async (chunk, index) => {
      const globalIndex = i + index;
      try {
        const translated = await googleTranslateText(chunk, sourceLanguage, targetLanguage);
        results[globalIndex] = translated;
        return { index: globalIndex, success: true, text: translated };
      } catch (error) {
        console.error('Error traduciendo chunk:', error);
        results[globalIndex] = chunk; // Usar texto original si falla
        return { index: globalIndex, success: false, text: chunk };
      }
    });
    
    // Esperar a que se complete el lote actual
    await Promise.all(promises);
    
    // Pausa mínima entre lotes para evitar rate limiting
    if (i + maxConcurrent < chunks.length) {
      await sleep(200); // Reducido de 1000ms a 200ms
    }
  }
  
  return results;
};

// Función para esperar un tiempo específico
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
      const parser = new XMLParser({ 
        ignoreAttributes: false,
        parseTagValue: false,
        parseAttributeValue: false,
        trimValues: false
      });
      const builder = new XMLBuilder({ ignoreAttributes: false });
      
      let totalChunks = 0;
      let processedChunks = 0;
      const translatedFiles = new Map<string, string>(); // Almacenar archivos traducidos
      
      // Contar total de chunks para el progreso
      for (const fileName of textFiles) {
        if (shouldSkipTranslation(fileName)) continue;
        try {
          const fileContent = await zip.file(fileName)?.async('string');
          if (!fileContent) continue;
          
          // Extraer texto de forma más simple
          let bodyText = '';
          try {
            const xmlObj = parser.parse(fileContent);
            if (xmlObj.html && xmlObj.html.body) {
              bodyText = builder.build(xmlObj.html.body);
            } else {
              bodyText = fileContent;
            }
          } catch (parseError) {
            console.warn('Error parseando XML, usando contenido directo:', fileName);
            bodyText = fileContent;
          }
          
          const chunks = splitTextIntoChunks(bodyText);
          totalChunks += chunks.length;
        } catch (error) {
          console.warn('Error procesando archivo:', fileName, error);
        }
      }
      
      for (const fileName of textFiles) {
        if (shouldSkipTranslation(fileName)) continue;
        setStatus(`Procesando: ${fileName}`);
        try {
          const fileContent = await zip.file(fileName)?.async('string');
          if (!fileContent) continue;
          
          // Extraer texto de forma más simple y segura
          let bodyText = '';
          try {
            const xmlObj = parser.parse(fileContent);
            if (xmlObj.html && xmlObj.html.body) {
              bodyText = builder.build(xmlObj.html.body);
            } else {
              bodyText = fileContent;
            }
          } catch (parseError) {
            console.warn('Error parseando XML, usando contenido directo:', fileName);
            bodyText = fileContent;
          }
          
          // Dividir texto en chunks y traducir en paralelo
          const chunks = splitTextIntoChunks(bodyText);
          
          // Traducir chunks en paralelo
          const translatedChunks = await translateChunksInParallel(chunks, sourceLanguage, targetLanguage, 3);
          
          // Actualizar progreso
          processedChunks += chunks.length;
          setProgress((processedChunks / totalChunks) * 100);
          
          const translatedText = translatedChunks.join('');
          console.log('Archivo:', fileName);
          console.log('Texto original:', bodyText.slice(0, 500));
          console.log('Texto traducido:', translatedText.slice(0, 500));
          
          // Reemplazar el contenido del archivo
          try {
            const xmlObj = parser.parse(fileContent);
            if (xmlObj.html && xmlObj.html.body) {
              xmlObj.html.body = parser.parse(`<body>${translatedText}</body>`).body;
              const newXml = builder.build(xmlObj);
              translatedFiles.set(fileName, newXml);
            } else {
              translatedFiles.set(fileName, translatedText);
            }
          } catch (parseError) {
            // Si falla el parsing, reemplazar todo el contenido
            translatedFiles.set(fileName, translatedText);
          }
        } catch (error) {
          console.error('Error procesando archivo:', fileName, error);
        }
      }
      
      setStatus('Generando archivo EPUB traducido...');
      
      // Crear nuevo EPUB válido
      const newZip = new JSZip();
      
      // 1. Agregar mimetype primero y sin compresión (requerido por EPUB)
      newZip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
      
      // 2. Copiar todos los archivos del original, reemplazando los traducidos
      const allFiles = Object.keys(zip.files);
      for (const fileName of allFiles) {
        if (fileName === 'mimetype') continue; // Ya agregado
        
        const originalFile = zip.file(fileName);
        if (!originalFile) continue;
        
        let content: string | ArrayBuffer;
        if (translatedFiles.has(fileName)) {
          // Usar versión traducida
          content = translatedFiles.get(fileName)!;
        } else {
          // Usar archivo original
          content = await originalFile.async('string');
        }
        
        // Mantener la compresión original para archivos no traducidos
        const options = translatedFiles.has(fileName) ? {} : { compression: originalFile.options?.compression };
        newZip.file(fileName, content, options);
      }
      
      const newEpub = await newZip.generateAsync({ type: 'blob' });
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
