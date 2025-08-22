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
  
  // Archivos que NO deben traducirse:
  return (
    // Archivos de navegación y estructura
    lower.includes('toc') || 
    lower.includes('nav') || 
    lower.includes('cover') || 
    lower.includes('titlepage') ||
    lower.includes('copyright') ||
    lower.includes('dedication') ||
    
    // Archivos de estilo
    lower.endsWith('.css') ||
    lower.includes('stylesheet') ||
    
    // Imágenes (preservar completamente)
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.svg') ||
    lower.endsWith('.webp') ||
    
    // Archivos de metadatos
    lower.endsWith('.opf') ||
    lower.includes('content.opf') ||
    lower.includes('package.opf') ||
    
    // Archivos de configuración
    lower.endsWith('.ncx') ||
    lower.includes('toc.ncx') ||
    
    // Archivos de fuentes
    lower.endsWith('.ttf') ||
    lower.endsWith('.otf') ||
    lower.endsWith('.woff') ||
    lower.endsWith('.woff2') ||
    
    // Otros archivos binarios
    lower.endsWith('.pdf') ||
    lower.endsWith('.mp3') ||
    lower.endsWith('.mp4')
  );
};

// Determina si un archivo es una imagen
const isImageFile = (name: string) => {
  const lower = name.toLowerCase();
  return (
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.svg') ||
    lower.endsWith('.webp')
  );
};

// Determina si un archivo es de estilo
const isStyleFile = (name: string) => {
  const lower = name.toLowerCase();
  return lower.endsWith('.css') || lower.includes('stylesheet');
};

// Función para validar que el contenido traducido no esté vacío o corrupto
const validateTranslatedContent = (originalContent: string, translatedContent: string, fileName: string): {
  isValid: boolean;
  reason?: string;
  shouldUseOriginal: boolean;
} => {
  // Si el contenido traducido está vacío o es muy pequeño
  if (!translatedContent || translatedContent.trim().length === 0) {
    return {
      isValid: false,
      reason: 'Contenido traducido vacío',
      shouldUseOriginal: true
    };
  }
  
  // Si el contenido traducido es significativamente más pequeño (más del 50% de pérdida)
  const originalLength = originalContent.length;
  const translatedLength = translatedContent.length;
  const lossPercentage = ((originalLength - translatedLength) / originalLength) * 100;
  
  if (lossPercentage > 50) {
    return {
      isValid: false,
      reason: `Pérdida excesiva de contenido (${lossPercentage.toFixed(1)}%)`,
      shouldUseOriginal: true
    };
  }
  
  // Si el contenido traducido es muy pequeño en términos absolutos
  if (translatedLength < 100 && originalLength > 1000) {
    return {
      isValid: false,
      reason: 'Contenido traducido demasiado pequeño',
      shouldUseOriginal: true
    };
  }
  
  // Verificar que el contenido traducido tenga estructura HTML básica
  if (!translatedContent.includes('<') || !translatedContent.includes('>')) {
    return {
      isValid: false,
      reason: 'Contenido traducido no tiene estructura HTML',
      shouldUseOriginal: true
    };
  }
  
  return {
    isValid: true,
    shouldUseOriginal: false
  };
};

// Función mejorada para extraer texto traducible
const extractTranslatableText = (htmlContent: string): {
  text: string;
  imageTags: string[];
  styleTags: string[];
  scriptTags: string[];
  hasContent: boolean;
} => {
  // Preservar etiquetas de imagen y otros elementos que no deben traducirse
  const imageTags: string[] = [];
  const styleTags: string[] = [];
  const scriptTags: string[] = [];
  
  // Extraer y reemplazar etiquetas de imagen con placeholders
  let processedContent = htmlContent.replace(
    /<img[^>]*>/gi,
    (match) => {
      imageTags.push(match);
      return `__IMAGE_PLACEHOLDER_${imageTags.length - 1}__`;
    }
  );
  
  // Extraer y reemplazar etiquetas de estilo
  processedContent = processedContent.replace(
    /<style[^>]*>[\s\S]*?<\/style>/gi,
    (match) => {
      styleTags.push(match);
      return `__STYLE_PLACEHOLDER_${styleTags.length - 1}__`;
    }
  );
  
  // Extraer y reemplazar etiquetas de script
  processedContent = processedContent.replace(
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    (match) => {
      scriptTags.push(match);
      return `__SCRIPT_PLACEHOLDER_${scriptTags.length - 1}__`;
    }
  );
  
  // Verificar si hay contenido traducible
  const textContent = processedContent.replace(/<[^>]*>/g, '').trim();
  const hasContent = textContent.length > 10; // Al menos 10 caracteres de texto
  
  return {
    text: processedContent,
    imageTags,
    styleTags,
    scriptTags,
    hasContent
  };
};

// Restaura las etiquetas originales en el texto traducido
const restoreOriginalTags = (
  translatedText: string, 
  imageTags: string[], 
  styleTags: string[], 
  scriptTags: string[]
): string => {
  let restoredText = translatedText;
  
  // Restaurar etiquetas de imagen
  imageTags.forEach((tag, index) => {
    restoredText = restoredText.replace(`__IMAGE_PLACEHOLDER_${index}__`, tag);
  });
  
  // Restaurar etiquetas de estilo
  styleTags.forEach((tag, index) => {
    restoredText = restoredText.replace(`__STYLE_PLACEHOLDER_${index}__`, tag);
  });
  
  // Restaurar etiquetas de script
  scriptTags.forEach((tag, index) => {
    restoredText = restoredText.replace(`__SCRIPT_PLACEHOLDER_${index}__`, tag);
  });
  
  return restoredText;
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

// Función para validar la estructura de un EPUB
const validateEpubStructure = async (zip: JSZip): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileCount: number;
  missingFiles: string[];
}> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingFiles: string[] = [];
  
  // Verificar archivos esenciales
  const essentialFiles = ['mimetype', 'META-INF/container.xml'];
  for (const file of essentialFiles) {
    if (!zip.file(file)) {
      errors.push(`Archivo esencial faltante: ${file}`);
      missingFiles.push(file);
    }
  }
  
  // Verificar mimetype
  const mimetype = zip.file('mimetype');
  if (mimetype) {
    const mimetypeContent = await mimetype.async('string');
    if (mimetypeContent !== 'application/epub+zip') {
      errors.push(`Mimetype incorrecto: ${mimetypeContent}`);
    }
  }
  
  // Contar archivos por tipo
  const allFiles = Object.keys(zip.files);
  const textFiles = allFiles.filter(name => name.endsWith('.xhtml') || name.endsWith('.html'));
  const imageFiles = allFiles.filter(name => isImageFile(name));
  const styleFiles = allFiles.filter(name => isStyleFile(name));
  
  console.log('📊 Análisis de archivos EPUB:');
  console.log(`- Total archivos: ${allFiles.length}`);
  console.log(`- Archivos de texto: ${textFiles.length}`);
  console.log(`- Archivos de imagen: ${imageFiles.length}`);
  console.log(`- Archivos de estilo: ${styleFiles.length}`);
  
  if (textFiles.length === 0) {
    warnings.push('No se encontraron archivos de texto para traducir');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    fileCount: allFiles.length,
    missingFiles
  };
};

// Función para comparar archivos originales vs traducidos
const compareEpubFiles = async (
  originalZip: JSZip, 
  translatedZip: JSZip
): Promise<{
  differences: string[];
  missingInTranslated: string[];
  extraInTranslated: string[];
  sizeChanges: { fileName: string; originalSize: number; translatedSize: number; change: number }[];
}> => {
  const differences: string[] = [];
  const missingInTranslated: string[] = [];
  const extraInTranslated: string[] = [];
  const sizeChanges: { fileName: string; originalSize: number; translatedSize: number; change: number }[] = [];
  
  const originalFiles = Object.keys(originalZip.files);
  const translatedFiles = Object.keys(translatedZip.files);
  
  // Archivos faltantes en la versión traducida
  for (const fileName of originalFiles) {
    if (!translatedZip.file(fileName)) {
      missingInTranslated.push(fileName);
      differences.push(`❌ Faltante en traducción: ${fileName}`);
    }
  }
  
  // Archivos extra en la versión traducida
  for (const fileName of translatedFiles) {
    if (!originalZip.file(fileName)) {
      extraInTranslated.push(fileName);
      differences.push(`➕ Extra en traducción: ${fileName}`);
    }
  }
  
  // Comparar tamaños de archivos
  for (const fileName of originalFiles) {
    const originalFile = originalZip.file(fileName);
    const translatedFile = translatedZip.file(fileName);
    
    if (originalFile && translatedFile) {
      try {
        const originalContent = await originalFile.async('string');
        const translatedContent = await translatedFile.async('string');
        const originalSize = originalContent.length;
        const translatedSize = translatedContent.length;
        const change = translatedSize - originalSize;
        
        if (Math.abs(change) > 100) { // Solo mostrar cambios significativos
          sizeChanges.push({ fileName, originalSize, translatedSize, change });
          differences.push(`📏 Cambio de tamaño: ${fileName} (${originalSize} → ${translatedSize}, ${change > 0 ? '+' : ''}${change})`);
        }
      } catch (error) {
        // Para archivos binarios, usar un método alternativo
        differences.push(`⚠️ No se pudo comparar tamaño: ${fileName} (archivo binario)`);
      }
    }
  }
  
  return { differences, missingInTranslated, extraInTranslated, sizeChanges };
};

  // Función para generar reporte de debugging
  const generateDebugReport = async (
    originalZip: JSZip,
    translatedZip: JSZip,
    translatedFiles: Map<string, string>,
    failedFiles: string[] = []
  ): Promise<string> => {
  let report = '🔍 REPORTE DE DEBUGGING EPUB\n';
  report += '='.repeat(50) + '\n\n';
  
  // Validar estructura original
  const originalValidation = await validateEpubStructure(originalZip);
  report += '📋 VALIDACIÓN EPUB ORIGINAL:\n';
  report += `✅ Válido: ${originalValidation.isValid}\n`;
  report += `📁 Total archivos: ${originalValidation.fileCount}\n`;
  if (originalValidation.errors.length > 0) {
    report += `❌ Errores: ${originalValidation.errors.join(', ')}\n`;
  }
  if (originalValidation.warnings.length > 0) {
    report += `⚠️ Advertencias: ${originalValidation.warnings.join(', ')}\n`;
  }
  report += '\n';
  
  // Validar estructura traducida
  const translatedValidation = await validateEpubStructure(translatedZip);
  report += '📋 VALIDACIÓN EPUB TRADUCIDO:\n';
  report += `✅ Válido: ${translatedValidation.isValid}\n`;
  report += `📁 Total archivos: ${translatedValidation.fileCount}\n`;
  if (translatedValidation.errors.length > 0) {
    report += `❌ Errores: ${translatedValidation.errors.join(', ')}\n`;
  }
  if (translatedValidation.warnings.length > 0) {
    report += `⚠️ Advertencias: ${translatedValidation.warnings.join(', ')}\n`;
  }
  report += '\n';
  
  // Comparar archivos
  const comparison = await compareEpubFiles(originalZip, translatedZip);
  report += '🔄 COMPARACIÓN DE ARCHIVOS:\n';
  if (comparison.differences.length > 0) {
    report += comparison.differences.join('\n') + '\n';
  } else {
    report += '✅ No se encontraron diferencias significativas\n';
  }
  report += '\n';
  
  // Archivos traducidos
  report += '📝 ARCHIVOS TRADUCIDOS:\n';
  for (const [fileName, content] of translatedFiles.entries()) {
    report += `- ${fileName} (${content.length} caracteres)\n`;
  }
  report += '\n';
  
  // Archivos preservados
  const allFiles = Object.keys(originalZip.files);
  const preservedFiles = allFiles.filter(name => !translatedFiles.has(name) && !shouldSkipTranslation(name));
  report += '💾 ARCHIVOS PRESERVADOS:\n';
  for (const fileName of preservedFiles) {
    report += `- ${fileName}\n`;
  }
  report += '\n';
  
  // Archivos excluidos
  const excludedFiles = allFiles.filter(name => shouldSkipTranslation(name));
  report += '🚫 ARCHIVOS EXCLUIDOS DE TRADUCCIÓN:\n';
  for (const fileName of excludedFiles) {
    report += `- ${fileName}\n`;
  }
  
  // Archivos que fallaron en la traducción
  if (failedFiles.length > 0) {
    report += '\n❌ ARCHIVOS QUE FALLARON EN LA TRADUCCIÓN:\n';
    for (const failedFile of failedFiles) {
      report += `- ${failedFile}\n`;
    }
  }
  
  return report;
};

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
  
  // Debug state
  const [debugReport, setDebugReport] = useState<string>('');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [failedFiles, setFailedFiles] = useState<string[]>([]);

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setIsComplete(false);
    setError(null);
    setDebugReport('');
    
    // --- INICIO: Extracción y validación de archivos internos EPUB ---
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const fileNames = Object.keys(zip.files);
      
      // Validar estructura del EPUB
      const validation = await validateEpubStructure(zip);
      console.log('📋 Validación EPUB:', validation);
      
      if (!validation.isValid) {
        setError(`EPUB inválido: ${validation.errors.join(', ')}`);
        toast({
          title: 'EPUB inválido',
          description: 'El archivo EPUB no tiene la estructura correcta',
          variant: 'destructive'
        });
        return;
      }
      
      // Filtrar archivos que suelen contener el texto (XHTML/HTML)
      const textFiles = fileNames.filter(name =>
        name.endsWith('.xhtml') || name.endsWith('.html')
      );
      
      console.log('📊 Análisis del EPUB:');
      console.log('- Archivos de texto encontrados:', textFiles);
      console.log('- Total archivos:', fileNames.length);
      console.log('- Archivos de imagen:', fileNames.filter(name => isImageFile(name)));
      console.log('- Archivos de estilo:', fileNames.filter(name => isStyleFile(name)));
      
      // Guardar zip y textFiles en el estado para usarlos en la traducción
      (window as any)._epubZip = zip;
      (window as any)._epubTextFiles = textFiles;
      
      // Mostrar información del EPUB
      toast({
        title: 'EPUB cargado correctamente',
        description: `${textFiles.length} archivos de texto encontrados para traducir`
      });
      
    } catch (e) {
      console.error('Error al analizar el EPUB:', e);
      setError('Error al procesar el archivo EPUB');
      toast({
        title: 'Error al procesar EPUB',
        description: 'El archivo no es un EPUB válido',
        variant: 'destructive'
      });
    }
    // --- FIN: Extracción y validación de archivos internos EPUB ---
  }, [toast]);

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
    setFailedFiles([]);
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
          
          // Extraer texto preservando imágenes y estilos
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
          
          // Extraer solo el texto traducible
          const { text: translatableText, hasContent } = extractTranslatableText(bodyText);
          
          // Solo contar chunks si hay contenido traducible
          if (hasContent) {
            const chunks = splitTextIntoChunks(translatableText);
            totalChunks += chunks.length;
          }
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
          
          // Extraer texto preservando imágenes y estilos
          let bodyText = '';
          let originalStructure = null;
          
          try {
            const xmlObj = parser.parse(fileContent);
            if (xmlObj.html && xmlObj.html.body) {
              bodyText = builder.build(xmlObj.html.body);
              originalStructure = xmlObj;
            } else {
              bodyText = fileContent;
            }
          } catch (parseError) {
            console.warn('Error parseando XML, usando contenido directo:', fileName);
            bodyText = fileContent;
          }
          
          // Extraer texto traducible preservando etiquetas de imagen y estilo
          const { text: translatableText, imageTags, styleTags, scriptTags, hasContent } = extractTranslatableText(bodyText);
          
          // Verificar si hay contenido para traducir
          if (!hasContent) {
            console.log(`⚠️ Archivo sin contenido traducible: ${fileName}`);
            failedFiles.push(`${fileName} (sin contenido traducible)`);
            continue; // Saltar este archivo
          }
          
          // Dividir texto en chunks y traducir en paralelo
          const chunks = splitTextIntoChunks(translatableText);
          
          // Traducir chunks en paralelo
          const translatedChunks = await translateChunksInParallel(chunks, sourceLanguage, targetLanguage, 3);
          
          // Actualizar progreso
          processedChunks += chunks.length;
          setProgress((processedChunks / totalChunks) * 100);
          
          const translatedText = translatedChunks.join('');
          
          // Restaurar etiquetas originales (imágenes, estilos, scripts)
          const finalText = restoreOriginalTags(translatedText, imageTags, styleTags, scriptTags);
          
          // Validar el contenido traducido
          const validation = validateTranslatedContent(bodyText, finalText, fileName);
          if (!validation.isValid) {
            console.warn(`⚠️ Contenido traducido inválido para ${fileName}: ${validation.reason}`);
            failedFiles.push(`${fileName} (${validation.reason})`);
            if (validation.shouldUseOriginal) {
              console.log(`🔄 Usando contenido original para ${fileName}`);
              continue; // Usar contenido original
            }
          }
          
          console.log('Archivo:', fileName);
          console.log('Texto original:', bodyText.slice(0, 500));
          console.log('Texto traducido:', finalText.slice(0, 500));
          
          // Reemplazar el contenido del archivo preservando la estructura original
          try {
            if (originalStructure && originalStructure.html && originalStructure.html.body) {
              // Reconstruir el body con el texto traducido
              const newBody = parser.parse(`<body>${finalText}</body>`).body;
              originalStructure.html.body = newBody;
              const newXml = builder.build(originalStructure);
              translatedFiles.set(fileName, newXml);
            } else {
              // Si no hay estructura XML clara, usar el texto final directamente
              translatedFiles.set(fileName, finalText);
            }
          } catch (parseError) {
            console.warn('Error reconstruyendo XML, usando texto directo:', fileName);
            translatedFiles.set(fileName, finalText);
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
        
        // Verificar que el archivo no sea un directorio vacío
        if (originalFile.dir) continue; // Saltar directorios
        
        let content: string | ArrayBuffer;
        let options: any = {};
        
        if (translatedFiles.has(fileName)) {
          // Usar versión traducida (archivos de texto)
          content = translatedFiles.get(fileName)!;
          options = {}; // Sin compresión para archivos traducidos
        } else if (isImageFile(fileName)) {
          // Preservar imágenes exactamente como están
          content = await originalFile.async('arraybuffer');
          options = { compression: originalFile.options?.compression };
        } else if (isStyleFile(fileName)) {
          // Preservar archivos CSS exactamente como están
          content = await originalFile.async('string');
          options = { compression: originalFile.options?.compression };
        } else {
          // Otros archivos (metadatos, etc.) - preservar original
          content = await originalFile.async('string');
          options = { compression: originalFile.options?.compression };
        }
        
        newZip.file(fileName, content, options);
      }
      
      const newEpub = await newZip.generateAsync({ type: 'blob' });
      const fileName = selectedFile.name.replace('.epub', `_${targetLanguage}.epub`);
      setTranslatedFileName(fileName);
      (window as any)._epubTranslatedBlob = newEpub;
      
      // Generar reporte de debugging
      setStatus('Generando reporte de debugging...');
      try {
        const report = await generateDebugReport(zip, newZip, translatedFiles, failedFiles);
        setDebugReport(report);
        console.log('🔍 Reporte de debugging:', report);
      } catch (error) {
        console.error('Error generando reporte:', error);
        setDebugReport('Error generando reporte de debugging');
      }
      
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
                  Sube tu archivo .epub y deja que la IA traduzca tu contenido manteniendo el formato, imágenes y estilos originales.
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

        {/* Features Section */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
          <CardContent className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold">Preserva Imágenes</h3>
                <p className="text-sm text-muted-foreground">Las imágenes se mantienen intactas sin traducir</p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold">Mantiene Estilos</h3>
                <p className="text-sm text-muted-foreground">CSS y formato original preservados completamente</p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                  <Globe className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold">Traducción Inteligente</h3>
                <p className="text-sm text-muted-foreground">Solo traduce el texto, preserva estructura EPUB</p>
              </div>
            </div>
          </CardContent>
        </Card>

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

          {/* Debug Information */}
          {isComplete && debugReport && (
            <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                    🔍 Información de Debugging
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDebugInfo(!showDebugInfo)}
                  >
                    {showDebugInfo ? 'Ocultar' : 'Mostrar'} Detalles
                  </Button>
                </div>
                
                {showDebugInfo && (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
                      <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                        {debugReport}
                      </pre>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const blob = new Blob([debugReport], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'debug-report.txt';
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        📥 Descargar Reporte
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(debugReport);
                          toast({
                            title: 'Reporte copiado',
                            description: 'El reporte de debugging se copió al portapapeles'
                          });
                        }}
                      >
                        📋 Copiar al Portapapeles
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
