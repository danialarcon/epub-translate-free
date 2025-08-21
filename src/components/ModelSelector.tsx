import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Zap, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Model {
  id: string;
  name: string;
  description: string;
  pricing: string;
  recommended?: boolean;
  fast?: boolean;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  models: Model[];
  isLoading: boolean;
}

const DEFAULT_MODELS: Model[] = [
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Excelente para traducción de alta calidad',
    pricing: '$3.00 / 1M tokens',
    recommended: true
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4 Omni',
    description: 'Modelo multimodal de OpenAI',
    pricing: '$5.00 / 1M tokens'
  },
  {
    id: 'meta-llama/llama-3.1-8b-instruct:free',
    name: 'Llama 3.1 8B',
    description: 'Modelo gratuito y rápido',
    pricing: 'Gratis',
    fast: true
  },
  {
    id: 'google/gemini-pro-1.5',
    name: 'Gemini Pro 1.5',
    description: 'Modelo avanzado de Google',
    pricing: '$2.50 / 1M tokens'
  }
];

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  models,
  isLoading
}) => {
  const availableModels = models.length > 0 ? models : DEFAULT_MODELS;
  const selectedModelData = availableModels.find(m => m.id === selectedModel);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Modelo de IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Selecciona el modelo
            </label>
            <Select value={selectedModel} onValueChange={onModelChange} disabled={isLoading}>
              <SelectTrigger className="bg-background/50 border-primary/20">
                <SelectValue placeholder="Seleccionar modelo de IA" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <span>{model.name}</span>
                      {model.recommended && (
                        <Badge variant="secondary" className="bg-primary/20 text-primary">
                          <Star className="h-3 w-3 mr-1" />
                          Recomendado
                        </Badge>
                      )}
                      {model.fast && (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                          <Zap className="h-3 w-3 mr-1" />
                          Rápido
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedModelData && (
            <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
              <div className="space-y-2">
                <p className="text-sm text-foreground">
                  {selectedModelData.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  Precio: {selectedModelData.pricing}
                </p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="p-3 rounded-md bg-muted/20 border border-muted/40">
              <p className="text-sm text-muted-foreground">
                Cargando modelos disponibles...
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ModelSelector;