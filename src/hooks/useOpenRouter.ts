import { useState, useCallback } from 'react';

interface Model {
  id: string;
  name: string;
  description: string;
  pricing: string;
  recommended?: boolean;
  fast?: boolean;
}

interface UseOpenRouterReturn {
  validateApiKey: (apiKey: string) => Promise<boolean>;
  fetchModels: (apiKey: string) => Promise<Model[]>;
  translateText: (apiKey: string, model: string, text: string, sourceLang: string, targetLang: string) => Promise<string>;
  isValidating: boolean;
  isLoadingModels: boolean;
  isTranslating: boolean;
}

export const useOpenRouter = (): UseOpenRouterReturn => {
  const [isValidating, setIsValidating] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const validateApiKey = useCallback(async (apiKey: string): Promise<boolean> => {
    setIsValidating(true);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Error validating API key:', error);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const fetchModels = useCallback(async (apiKey: string): Promise<Model[]> => {
    setIsLoadingModels(true);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      
      // Transform the response to our Model interface
      return data.data.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description || 'Modelo de IA disponible',
        pricing: model.pricing?.prompt ? `$${model.pricing.prompt} / 1M tokens` : 'Consultar precio',
        recommended: model.id.includes('claude-3.5-sonnet'),
        fast: model.id.includes('free') || model.id.includes('8b')
      }));
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  const translateText = useCallback(async (
    apiKey: string,
    model: string,
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string> => {
    setIsTranslating(true);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'EPUB Scribe Translate'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: `Eres un traductor profesional especializado en literatura. Tu tarea es traducir texto de ${sourceLang === 'auto' ? 'cualquier idioma' : sourceLang} a ${targetLang} manteniendo el estilo, tono y formato original. Preserva elementos HTML si están presentes. Traduce únicamente el contenido, no agregues explicaciones adicionales.`
            },
            {
              role: 'user',
              content: text
            }
          ],
          temperature: 0.3,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || text;
    } catch (error) {
      console.error('Error translating text:', error);
      throw error;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  return {
    validateApiKey,
    fetchModels,
    translateText,
    isValidating,
    isLoadingModels,
    isTranslating
  };
};