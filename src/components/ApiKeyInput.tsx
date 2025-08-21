import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Key, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

interface ApiKeyInputProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onValidateKey: () => void;
  isValidating: boolean;
  isValid: boolean | null;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  apiKey,
  onApiKeyChange,
  onValidateKey,
  isValidating,
  isValid
}) => {
  const [showKey, setShowKey] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          API Key de OpenRouter
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Ingresa tu API Key
            </label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder="sk-or-v1-..."
                className="pr-20 bg-background/50 border-primary/20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                {isValid !== null && (
                  <div className="flex items-center">
                    {isValid ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={onValidateKey}
            disabled={!apiKey || isValidating}
            variant="outline"
            className="w-full"
          >
            {isValidating ? 'Validando...' : 'Validar API Key'}
          </Button>

          {isValid === false && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">
                API Key inválida o error de conexión
              </p>
            </div>
          )}

          {isValid === true && (
            <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-400">
                API Key válida y conectada correctamente
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiKeyInput;