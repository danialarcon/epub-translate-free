# 📚 EPUB Translate Free

Una aplicación web gratuita para traducir archivos EPUB a cualquier idioma, manteniendo el formato y estructura original del libro.

## ✨ Características

- **Traducción gratuita**: Utiliza Google Translate API sin necesidad de claves de API
- **Preserva formato**: Mantiene la estructura HTML, capítulos y formato original del EPUB
- **Múltiples idiomas**: Soporta traducción entre más de 100 idiomas
- **Interfaz intuitiva**: Diseño moderno y fácil de usar
- **Procesamiento inteligente**: Divide automáticamente archivos grandes para evitar límites de API
- **Descarga directa**: Genera y descarga el archivo EPUB traducido inmediatamente

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18** - Framework de interfaz de usuario
- **TypeScript** - Tipado estático para mayor robustez
- **Vite** - Herramienta de construcción rápida
- **Tailwind CSS** - Framework de estilos utilitarios
- **Shadcn/ui** - Componentes de interfaz modernos y accesibles

### Procesamiento de EPUB
- **JSZip** - Manipulación de archivos ZIP (EPUB es un archivo ZIP)
- **fast-xml-parser** - Parsing y manipulación de archivos XML/XHTML
- **Google Translate API** - Servicio de traducción gratuito

### Despliegue
- **Vercel** - Plataforma de hosting y despliegue automático
- **Netlify** - Alternativa de hosting estático

## 🚀 Cómo Funciona

1. **Carga del EPUB**: El usuario sube un archivo EPUB
2. **Extracción**: La aplicación descomprime el EPUB y extrae los archivos XHTML/HTML
3. **Análisis**: Identifica los archivos que contienen el texto del libro
4. **División**: Divide el texto en fragmentos manejables (máximo 1000 caracteres)
5. **Traducción**: Traduce cada fragmento usando Google Translate API
6. **Reconstrucción**: Reemplaza el texto original con el traducido
7. **Generación**: Crea un nuevo archivo EPUB con el contenido traducido
8. **Descarga**: Permite al usuario descargar el libro traducido

## 📦 Instalación

### Prerrequisitos
- Node.js 18+ 
- npm o yarn

### Pasos de instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/epub-translate-free.git
cd epub-translate-free

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build
```

## 🎯 Uso

1. **Abrir la aplicación** en tu navegador
2. **Seleccionar idiomas**: Origen y destino de la traducción
3. **Subir archivo EPUB**: Arrastra o selecciona tu archivo .epub
4. **Iniciar traducción**: Haz clic en "Iniciar traducción"
5. **Esperar**: El proceso puede tomar varios minutos dependiendo del tamaño del libro
6. **Descargar**: Una vez completado, descarga tu EPUB traducido

## 🌐 Idiomas Soportados

La aplicación soporta todos los idiomas disponibles en Google Translate, incluyendo:

- Español, Inglés, Francés, Alemán, Italiano, Portugués
- Chino, Japonés, Coreano, Árabe, Hindi, Ruso
- Y muchos más...

## ⚙️ Configuración

### Variables de Entorno (Opcional)

```env
# Para personalizar la configuración
VITE_APP_TITLE=EPUB Translate Free
VITE_APP_DESCRIPTION=Traduce tus libros electrónicos gratis
```

### Personalización

Puedes personalizar:
- Colores y temas en `tailwind.config.ts`
- Componentes de UI en `src/components/ui/`
- Configuración de traducción en `src/pages/Index.tsx`

## 🚀 Despliegue

### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel
```

### Netlify

```bash
# Construir el proyecto
npm run build

# Subir la carpeta dist/ a Netlify
```

## 🔧 Limitaciones y Consideraciones

### Limitaciones Técnicas
- **Tamaño de archivo**: EPUBs muy grandes pueden tardar más tiempo
- **Rate limiting**: Google Translate tiene límites de peticiones por minuto
- **Calidad de traducción**: Depende de la calidad de Google Translate
- **Formato complejo**: Algunos EPUBs con formato muy complejo pueden no procesarse correctamente

### Limitaciones de Uso
- **Uso personal**: Diseñado para uso personal y educativo
- **Derechos de autor**: Respeta los derechos de autor de los libros
- **Volumen**: No recomendado para traducción masiva de libros

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙏 Agradecimientos

- **Google Translate** por proporcionar el servicio de traducción gratuito
- **Shadcn/ui** por los componentes de interfaz
- **JSZip** y **fast-xml-parser** por las herramientas de procesamiento
- **Vercel** por la plataforma de hosting

## 📞 Soporte

Si encuentras algún problema o tienes sugerencias:

1. Abre un issue en GitHub
2. Revisa la documentación
3. Contacta al equipo de desarrollo

---

**¡Disfruta traduciendo tus libros favoritos! 📖✨**
