import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Languages } from 'lucide-react';

interface LanguageSelectorProps {
  sourceLanguage: string;
  targetLanguage: string;
  onSourceLanguageChange: (language: string) => void;
  onTargetLanguageChange: (language: string) => void;
}

const LANGUAGES = [
  { code: 'auto', name: 'Detectar automáticamente' },
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'Inglés' },
  { code: 'fr', name: 'Francés' },
  { code: 'de', name: 'Alemán' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Portugués' },
  { code: 'ru', name: 'Ruso' },
  { code: 'ja', name: 'Japonés' },
  { code: 'ko', name: 'Coreano' },
  { code: 'zh', name: 'Chino' },
  { code: 'ar', name: 'Árabe' },
  { code: 'hi', name: 'Hindi' },
];

const TARGET_LANGUAGES = LANGUAGES.filter(lang => lang.code !== 'auto');

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  sourceLanguage,
  targetLanguage,
  onSourceLanguageChange,
  onTargetLanguageChange
}) => {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-primary" />
          Idiomas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Idioma origen
            </label>
            <Select value={sourceLanguage} onValueChange={onSourceLanguageChange}>
              <SelectTrigger className="bg-background/50 border-primary/20">
                <SelectValue placeholder="Seleccionar idioma" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((language) => (
                  <SelectItem key={language.code} value={language.code}>
                    {language.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
              <ArrowRight className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Idioma destino
            </label>
            <Select value={targetLanguage} onValueChange={onTargetLanguageChange}>
              <SelectTrigger className="bg-background/50 border-primary/20">
                <SelectValue placeholder="Seleccionar idioma" />
              </SelectTrigger>
              <SelectContent>
                {TARGET_LANGUAGES.map((language) => (
                  <SelectItem key={language.code} value={language.code}>
                    {language.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LanguageSelector;