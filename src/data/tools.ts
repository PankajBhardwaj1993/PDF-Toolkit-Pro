import { Tool } from '../types';

export const allToolsList: Tool[] = [
  // 1. TOP FEATURED PDF EDITOR
  {
    id: 'online_pdf_editor',
    name: 'Online PDF Editor',
    description: 'Upload, draw, add shapes, texts, annotations, sign or reorganize pages directly on your PDF documents.',
    category: 'pdf',
    icon: 'FileText',
    popular: true,
    h1: 'Free Online PDF Editor',
    seoTitle: 'Free Online PDF Editor – Edit PDF Files Online | PDF Toolkit Pro',
    seoDescription: 'Edit PDF files online for free. Add text, images, shapes, annotations, e-signatures, and fill out PDF forms directly in your browser securely.',
    seoKeywords: [
      'PDF editor',
      'free PDF editor',
      'edit PDF online',
      'online PDF editor',
      'edit PDF',
      'annotate PDF free',
      'sign PDF online',
      'add text to PDF',
      'browser PDF editor'
    ],
    faqs: [
      {
        question: 'Is this online PDF editor completely free to use?',
        answer: 'Yes, PDF Toolkit Pro provides a 100% free online PDF editor. You can edit text, insert images, add shapes, stamp annotations, and sign documents without any subscription or credit card.'
      },
      {
        question: 'Are my PDF documents safe and private when editing online?',
        answer: 'Absolutely. All editing, rendering, and annotation operations run directly in your web browser. Your confidential files are never uploaded to or stored on third-party servers.'
      },
      {
        question: 'Can I add electronic signatures and images to my PDF?',
        answer: 'Yes! You can draw your digital signature, type a signature, or upload signature images, stamps, and logos directly onto any page of your PDF.'
      },
      {
        question: 'Can I use this PDF editor on mobile devices?',
        answer: 'Yes, the editor is responsive and works smoothly across desktop computers, tablets, and smartphones without needing any desktop app installations.'
      }
    ],
    features: [
      'Add, modify, and style custom text with 29+ Unicode language fonts',
      'Draw freehand shapes, lines, arrows, rectangles, and circles',
      'Insert images, transparent signatures, and official stamps',
      'Whiteout or blackout sensitive information securely'
    ]
  },

  // 2. MERGE PDF
  {
    id: 'merge_pdf',
    name: 'Merge PDF',
    description: 'Combine multiple PDF documents into a single organized file easily inside the browser.',
    category: 'pdf',
    icon: 'FileText',
    popular: true,
    h1: 'Merge PDF Files Online',
    seoTitle: 'Merge PDF Online – Combine PDF Files for Free | PDF Toolkit Pro',
    seoDescription: 'Combine multiple PDF files into a single organized document in seconds. 100% free, secure, and fast browser-side PDF merger.',
    seoKeywords: [
      'merge PDF',
      'combine PDF files',
      'join PDF',
      'merge PDF online',
      'combine PDF',
      'free PDF merger',
      'join multiple PDFs'
    ],
    faqs: [
      {
        question: 'How do I merge multiple PDF files together?',
        answer: 'Drag and drop your PDF files into the merger workstation, reorder them in your desired sequence, and click "Merge PDF" to download the combined document.'
      },
      {
        question: 'Is there a limit on how many PDFs I can combine?',
        answer: 'No strict limit! You can combine multiple PDF files at once directly in your browser with ultra-fast local processing.'
      },
      {
        question: 'Will merging PDFs degrade page quality?',
        answer: 'No, all original vector text, high-resolution graphics, and layout styling are preserved with zero quality degradation.'
      }
    ]
  },

  // 3. SPLIT PDF
  {
    id: 'split_pdf',
    name: 'Split PDF',
    description: 'Extract pages from a PDF file as individual documents or download a page subset.',
    category: 'pdf',
    icon: 'FileText',
    h1: 'Split PDF Online',
    seoTitle: 'Split PDF Online – Extract PDF Pages for Free | PDF Toolkit Pro',
    seoDescription: 'Split PDF files into individual pages or extract specific page ranges quickly and securely in your browser.',
    seoKeywords: [
      'split PDF',
      'extract pages from PDF',
      'separate PDF pages',
      'split PDF online',
      'free PDF splitter',
      'divide PDF document'
    ],
    faqs: [
      {
        question: 'How does splitting a PDF work?',
        answer: 'Upload your document and specify individual page numbers or page ranges (e.g., 1-3, 5). The tool creates standalone PDF files for each selected segment.'
      },
      {
        question: 'Can I split all pages into separate single-page PDF files?',
        answer: 'Yes, you can extract all individual pages at once and download them bundled neatly in a ZIP archive.'
      },
      {
        question: 'Is my data secure while splitting files?',
        answer: 'Yes, PDF splitting is performed client-side in your web browser with zero server data retention.'
      }
    ]
  },

  // 4. COMPRESS PDF
  {
    id: 'compress_pdf',
    name: 'Compress PDF',
    description: 'Reduce the file size of your PDF documents while keeping pristine high image quality.',
    category: 'pdf',
    icon: 'FileText',
    h1: 'Compress PDF Online',
    seoTitle: 'Compress PDF Online – Reduce PDF File Size for Free | PDF Toolkit Pro',
    seoDescription: 'Reduce PDF file size online while maintaining maximum quality. Fast, free, and secure browser-native PDF compressor.',
    seoKeywords: [
      'compress PDF',
      'reduce PDF size',
      'shrink PDF',
      'compress PDF online',
      'reduce PDF file size',
      'optimize PDF size',
      'free PDF compressor'
    ],
    faqs: [
      {
        question: 'How much can I reduce my PDF file size?',
        answer: 'Depending on the images and content structure, you can typically reduce file size by 30% to 75% while keeping text sharp and images clear.'
      },
      {
        question: 'Will compression affect the readability of text?',
        answer: 'No, vector text and essential document typography remain crisp, clear, and perfectly legible for printing and sharing.'
      }
    ]
  },

  // 5. ROTATE PDF
  {
    id: 'rotate_pdf',
    name: 'Rotate PDF',
    description: 'Rotate your PDF pages 90, 180, or 270 degrees clockwise to fix alignment.',
    category: 'pdf',
    icon: 'FileText',
    h1: 'Rotate PDF Pages Online',
    seoTitle: 'Rotate PDF Online – Rotate PDF Pages for Free | PDF Toolkit Pro',
    seoDescription: 'Rotate individual PDF pages or entire documents 90, 180, or 270 degrees clockwise. Save and download your aligned PDF instantly.',
    seoKeywords: [
      'rotate PDF',
      'rotate PDF pages',
      'flip PDF',
      'rotate PDF online',
      'orient PDF pages',
      'align PDF document'
    ],
    faqs: [
      {
        question: 'Can I rotate only specific pages in a PDF?',
        answer: 'Yes, you can rotate individual selected pages or apply rotation to all pages in the document simultaneously.'
      },
      {
        question: 'Can I permanently save the rotated orientation?',
        answer: 'Yes, downloading the processed file saves the new orientation permanently into the PDF document metadata.'
      }
    ]
  },

  // 6. DELETE PDF PAGES
  {
    id: 'delete_pdf',
    name: 'Delete PDF Pages',
    description: 'Subtract unwanted single pages or range sections out of your PDF structure.',
    category: 'pdf',
    icon: 'FileText',
    h1: 'Delete Pages from PDF',
    seoTitle: 'Delete PDF Pages Online – Remove Pages from PDF | PDF Toolkit Pro',
    seoDescription: 'Remove unwanted pages from your PDF document easily. Select specific pages or ranges to delete and download a clean PDF.',
    seoKeywords: [
      'delete PDF pages',
      'remove pages from PDF',
      'delete pages from PDF online',
      'remove PDF page free',
      'delete page range PDF'
    ],
    faqs: [
      {
        question: 'How do I remove unwanted pages from a PDF?',
        answer: 'Upload your document, click on the thumbnails of the pages you wish to remove, and click "Delete Pages" to generate your new streamlined document.'
      },
      {
        question: 'Can I delete multiple non-consecutive pages at once?',
        answer: 'Yes, you can select any combination of individual pages or enter custom comma-separated page numbers.'
      }
    ]
  },

  // 7. EXTRACT PDF PAGES
  {
    id: 'extract_pdf',
    name: 'Extract PDF Pages',
    description: 'Pull high resolution individual pages from a document and compile them as a new file.',
    category: 'pdf',
    icon: 'FileText',
    h1: 'Extract PDF Pages Online',
    seoTitle: 'Extract PDF Pages Online – Save Specific Pages | PDF Toolkit Pro',
    seoDescription: 'Select and extract specific pages from your PDF file. Create a new PDF document containing only the exact pages you need.',
    seoKeywords: [
      'extract PDF pages',
      'extract pages from PDF online',
      'save PDF pages',
      'pull pages from PDF',
      'export PDF pages'
    ],
    faqs: [
      {
        question: 'What is the difference between split and extract?',
        answer: 'Extract allows you to pick specific individual pages to form one new PDF document, whereas split can divide the whole file into separate chunks.'
      }
    ]
  },

  // 8. ADD PAGE NUMBERS
  {
    id: 'page_numbers',
    name: 'Add Page Numbers',
    description: 'Overlay custom page numbering patterns dynamically onto document page headers or footers.',
    category: 'pdf',
    icon: 'FileText',
    h1: 'Add Page Numbers to PDF',
    seoTitle: 'Add Page Numbers to PDF Online | PDF Toolkit Pro',
    seoDescription: 'Add page numbers to PDF documents easily. Customize numbering position, formatting, font size, and starting page number.',
    seoKeywords: [
      'add page numbers to PDF',
      'number PDF pages',
      'paginate PDF',
      'page numbers PDF',
      'PDF page numbering online'
    ],
    faqs: [
      {
        question: 'Can I choose where page numbers appear?',
        answer: 'Yes, you can position page numbers at the bottom-center, bottom-right, bottom-left, top-center, top-right, or top-left.'
      },
      {
        question: 'Can I customize the numbering format?',
        answer: 'Yes, you can choose simple numbers (1, 2, 3), "Page X of Y" formatting, or custom prefixes.'
      }
    ]
  },

  // 9. WATERMARK PDF
  {
    id: 'watermark',
    name: 'Add Watermark',
    description: 'Overlay transparent text stamps such as "CONFIDENTIAL" or "SECURE" onto documents.',
    category: 'pdf',
    icon: 'FileText',
    h1: 'Add Watermark to PDF Online',
    seoTitle: 'Add Watermark to PDF Online – Protect Documents | PDF Toolkit Pro',
    seoDescription: 'Stamp custom text watermarks like CONFIDENTIAL or DRAFT onto PDF pages. Choose font, opacity, rotation, and position.',
    seoKeywords: [
      'watermark PDF',
      'add watermark to PDF',
      'PDF watermark online',
      'stamp PDF',
      'confidential stamp PDF'
    ],
    faqs: [
      {
        question: 'Can I customize the watermark text and opacity?',
        answer: 'Yes, you can enter any custom text, adjust transparency, select colors, and customize the angle and size of the watermark.'
      }
    ]
  },

  // 10. PROTECT PDF
  {
    id: 'protect_pdf',
    name: 'Protect PDF',
    description: 'Encrypt your PDF files with high strength passwords to limit viewing or editing privileges.',
    category: 'pdf',
    icon: 'FileText',
    h1: 'Password Protect PDF Online',
    seoTitle: 'Password Protect PDF Online – Encrypt PDF Files | PDF Toolkit Pro',
    seoDescription: 'Protect your PDF files with strong AES-256 password encryption. Prevent unauthorized access, viewing, editing, and copying.',
    seoKeywords: [
      'protect PDF',
      'password protect PDF',
      'encrypt PDF',
      'lock PDF',
      'secure PDF online'
    ],
    faqs: [
      {
        question: 'What type of encryption is used for PDF protection?',
        answer: 'PDF Toolkit Pro utilizes robust AES-256 password encryption to safeguard sensitive documents from unauthorized viewing or copying.'
      }
    ]
  },

  // 11. UNLOCK PDF
  {
    id: 'unlock_pdf',
    name: 'Unlock PDF',
    description: 'Decrypt password security locks from documents to enable printing or changes.',
    category: 'pdf',
    icon: 'FileText',
    h1: 'Unlock PDF Online',
    seoTitle: 'Unlock PDF Online – Remove PDF Password Security | PDF Toolkit Pro',
    seoDescription: 'Unlock password-protected PDF files to enable easy viewing, editing, copying, and printing. Fast, safe, and browser-native.',
    seoKeywords: [
      'unlock PDF',
      'remove PDF password',
      'decrypt PDF',
      'unlock PDF online',
      'remove PDF security'
    ],
    faqs: [
      {
        question: 'Can I unlock a password-protected PDF if I know the password?',
        answer: 'Yes, entering the correct password decrypts and saves an unprotected version for effortless future sharing and printing.'
      }
    ]
  },

  // 12. EDIT PDF METADATA
  {
    id: 'edit_pdf_metadata',
    name: 'PDF Metadata Editor',
    description: 'View and modify PDF document properties like Title, Author, Subject, Keywords, Creator, and Timestamps.',
    category: 'pdf',
    icon: 'FileText',
    popular: true,
    h1: 'Edit PDF Metadata Online',
    seoTitle: 'Edit PDF Metadata Online – Modify Title, Author & Properties | PDF Toolkit Pro',
    seoDescription: 'View and edit PDF document properties and metadata online for free. Change Title, Author, Subject, Keywords, Creator, and Producer.',
    seoKeywords: [
      'edit PDF metadata',
      'change PDF properties',
      'edit PDF author',
      'PDF title editor',
      'modify PDF metadata online'
    ],
    faqs: [
      {
        question: 'What PDF properties can I modify with this tool?',
        answer: 'You can view, update, or remove Title, Author, Subject, Keywords, Creator, Producer, and modification dates.'
      }
    ]
  },

  // 13. PDF OCR
  {
    id: 'pdf_ocr',
    name: 'PDF OCR',
    description: 'AI-powered OCR Editor to extract editable text from scanned PDFs & images with side-by-side preview, layout preservation, Indian languages, and table export.',
    category: 'pdf',
    icon: 'ScanText',
    popular: true,
    h1: 'Free Online PDF OCR',
    seoTitle: 'Free AI PDF OCR Online – Convert Scanned PDF to Editable Text | PDF Toolkit Pro',
    seoDescription: 'Extract text from scanned PDFs and images using AI-powered OCR. Support for Hindi, Marathi, English, and more with layout preservation.',
    seoKeywords: [
      'PDF OCR',
      'OCR PDF online',
      'scanned PDF to text',
      'convert scan to text',
      'free PDF OCR',
      'Hindi PDF OCR',
      'searchable PDF creator'
    ],
    faqs: [
      {
        question: 'Which languages are supported by the OCR tool?',
        answer: 'The OCR engine supports English, Hindi, Marathi, Bengali, Tamil, Telugu, Spanish, French, German, and 20+ other global languages.'
      },
      {
        question: 'Can I export OCR results as a searchable PDF or Word document?',
        answer: 'Yes! You can download the recognized text as a searchable PDF, formatted DOCX, or plain text file.'
      }
    ]
  },

  // 14. EXCEL EDITOR
  {
    id: 'excel_editor',
    name: 'Excel Pro',
    description: 'High-performance Excel spreadsheet editor with virtualized engine capable of handling 300,000 to 500,000+ rows smoothly with formulas, charts, and instant .xlsx export.',
    category: 'office',
    icon: 'FileSpreadsheet',
    popular: true,
    h1: 'Online Excel Spreadsheet Editor',
    seoTitle: 'Free Online Excel Editor – Edit XLSX & CSV Files | PDF Toolkit Pro',
    seoDescription: 'Open, edit, and analyze Excel (XLSX, CSV) spreadsheets with high performance in your browser. Full formula support, charts, and export.',
    seoKeywords: [
      'online Excel editor',
      'edit Excel online',
      'XLSX editor',
      'spreadsheet editor',
      'open Excel in browser',
      'free spreadsheet tool'
    ],
    faqs: [
      {
        question: 'Can this editor handle large Excel files with hundreds of thousands of rows?',
        answer: 'Yes! Our high-performance virtualized grid easily handles datasets with up to 500,000 rows with 60 FPS scrolling and instant search.'
      }
    ]
  },

  // 15. WORD EDITOR
  {
    id: 'word_editor',
    name: 'MS Word Document Editor',
    description: 'Create new Word documents (.docx) or open and edit existing DOCX/DOC files with a full Microsoft Word ribbon interface.',
    category: 'office',
    icon: 'FileText',
    popular: true,
    h1: 'Online Word Document Editor',
    seoTitle: 'Free Online Word Editor – Create & Edit DOCX Files | PDF Toolkit Pro',
    seoDescription: 'Create new Word documents or open and edit existing DOCX files online for free. Full formatting ribbon, images, tables, and export options.',
    seoKeywords: [
      'online Word editor',
      'edit Word online',
      'DOCX editor',
      'edit Word document',
      'create DOCX online',
      'free Word document editor'
    ],
    faqs: [
      {
        question: 'Can I open and save standard Microsoft Word DOCX files?',
        answer: 'Yes, you can upload existing DOCX files, make edits with rich styling, fonts, tables, and images, and save them directly as valid DOCX files.'
      }
    ]
  },

  // 16. COMPRESS IMAGE
  {
    id: 'compress_image',
    name: 'Compress Image',
    description: 'Reduce weight metrics of JPG, PNG, or WEBP images with full canvas output previews.',
    category: 'image',
    icon: 'ImageIcon',
    popular: true,
    h1: 'Compress Images Online',
    seoTitle: 'Compress Images Online – Reduce JPG, PNG & WebP File Size | PDF Toolkit Pro',
    seoDescription: 'Reduce image file size without losing quality. Compress JPG, PNG, and WebP images with interactive preview and custom compression settings.',
    seoKeywords: [
      'compress image',
      'reduce image size',
      'compress JPG',
      'compress PNG',
      'shrink photo',
      'optimize WebP image'
    ],
    faqs: [
      {
        question: 'Does compressing images reduce their visual quality?',
        answer: 'Our smart compression algorithm removes redundant metadata and optimizes color data to reduce file weight while preserving clear visual fidelity.'
      }
    ]
  },

  // 17. RESIZE IMAGE
  {
    id: 'resize_image',
    name: 'Resize Image',
    description: 'Modify pixel width and height dimensions of images while preserving ratio lines.',
    category: 'image',
    icon: 'ImageIcon',
    h1: 'Resize Image Online',
    seoTitle: 'Resize Image Online – Change Dimensions in Pixels or Percent | PDF Toolkit Pro',
    seoDescription: 'Resize image width and height in pixels or percentage while maintaining aspect ratio. Supports JPG, PNG, WebP, and more.',
    seoKeywords: [
      'resize image',
      'resize photo',
      'change image dimensions',
      'image resizer online',
      'resize image pixels'
    ],
    faqs: [
      {
        question: 'Can I resize images by exact pixel dimensions or percentage?',
        answer: 'Yes, you can enter exact pixel dimensions (width and height) or scale by percentage while optionally locking the aspect ratio.'
      }
    ]
  },

  // 18. CONVERT IMAGE FORMAT
  {
    id: 'convert_image',
    name: 'Convert Image format',
    description: 'Seamlessly convert between JPEG, lossless PNG, or web optimized WebP formats.',
    category: 'image',
    icon: 'ImageIcon',
    h1: 'Convert Image Format Online',
    seoTitle: 'Image Format Converter Online – JPG, PNG, WebP & More | PDF Toolkit Pro',
    seoDescription: 'Convert images between JPG, PNG, WebP, BMP, GIF, and TIFF formats quickly with full color profile preservation.',
    seoKeywords: [
      'convert image',
      'image converter online',
      'JPG to PNG',
      'PNG to JPG',
      'image format converter',
      'convert WebP to JPG'
    ],
    faqs: [
      {
        question: 'Which image formats are supported for conversion?',
        answer: 'You can convert between JPG, PNG, WebP, BMP, GIF, TIFF, and SVG formats directly in your browser.'
      }
    ]
  },

  // 19. CROP IMAGE
  {
    id: 'crop_image',
    name: 'Crop Image',
    description: 'Trim borders or focus aspect ratio outlines to crop perfect visual elements.',
    category: 'image',
    icon: 'ImageIcon',
    h1: 'Crop Image Online',
    seoTitle: 'Crop Image Online – Trim Photos & Select Aspect Ratios | PDF Toolkit Pro',
    seoDescription: 'Crop photos and images online easily. Trim unwanted margins or choose preset aspect ratios (1:1, 16:9, 4:3) with real-time preview.',
    seoKeywords: [
      'crop image',
      'crop photo online',
      'image cropper',
      'trim image',
      'cut photo margins'
    ],
    faqs: [
      {
        question: 'Does the crop tool support standard social media aspect ratios?',
        answer: 'Yes, choose from presets like 1:1 (Square), 16:9 (Widescreen), 4:3, 9:16 (Story/Reel), or freeform custom crop.'
      }
    ]
  },

  // 20. REMOVE BACKGROUND
  {
    id: 'remove_bg',
    name: 'Remove Background',
    description: 'Extract clear subjects from photos while discarding backing colors into transparent fields.',
    category: 'image',
    icon: 'ImageIcon',
    h1: 'Remove Image Background Online',
    seoTitle: 'Remove Background from Image Online – Transparent PNG | PDF Toolkit Pro',
    seoDescription: 'Remove background from photos and images online for free. Download high-quality transparent PNG cutouts instantly.',
    seoKeywords: [
      'remove background',
      'background remover online',
      'transparent PNG',
      'remove photo background',
      'cutout maker free'
    ],
    faqs: [
      {
        question: 'How do I download an image with a transparent background?',
        answer: 'Upload your portrait or product photo, let the tool isolate the subject, and download the resulting transparent PNG cutout.'
      }
    ]
  },

  // 21. PASSPORT PHOTO MAKER
  {
    id: 'passport_photo',
    name: 'Passport Photo Maker',
    description: 'Create professional passport and visa photos with auto face alignment, chroma background removal, custom colors, skin smoothing, and multi-copy print sheets.',
    category: 'image',
    icon: 'ImageIcon',
    popular: true,
    h1: 'Online Passport Photo Maker',
    seoTitle: 'Passport Photo Maker Online – Create Visa & ID Photos | PDF Toolkit Pro',
    seoDescription: 'Create official passport and visa photos online. Features auto face alignment, background color change, and multi-photo print sheets.',
    seoKeywords: [
      'passport photo maker',
      'online passport photo',
      'visa photo maker',
      'passport size photo',
      'print passport photos 4x6'
    ],
    faqs: [
      {
        question: 'Does this tool support standard international visa and passport photo dimensions?',
        answer: 'Yes, it supports US (2x2 inch), UK/Europe (35x45 mm), India (3.5x4.5 cm), Canada, Australia, and custom dimensions with printable 4x6 grid sheets.'
      }
    ]
  },

  // 22. TEXT TO SPEECH (TTS)
  {
    id: 'text_to_speech',
    name: 'Text to Speech (TTS)',
    description: 'Convert up to 20,000 text characters into natural audio speech with customizable voices, pitch, rate, and presets.',
    category: 'ai',
    icon: 'Volume2',
    popular: true,
    h1: 'AI Text to Speech Online',
    seoTitle: 'Text to Speech Online – Convert Text to Natural Audio | PDF Toolkit Pro',
    seoDescription: 'Convert text into natural speech with AI voice technology. Choose voice styles, adjust pitch and speed, and download MP3 audio.',
    seoKeywords: [
      'text to speech',
      'TTS online',
      'convert text to audio',
      'text to speech AI',
      'voice generator',
      'text to MP3'
    ],
    faqs: [
      {
        question: 'Can I download the generated speech as an audio file?',
        answer: 'Yes, you can generate speech from up to 20,000 characters of text and download it as high-quality MP3 or WAV audio.'
      }
    ]
  },

  // 23. AI GRAMMAR & POLISH
  {
    id: 'ai_grammar',
    name: 'AI Grammar & Polish',
    description: 'Identify syntax mistakes, grammatical errors, and rephrase text for professional tone.',
    category: 'ai',
    icon: 'Sparkles',
    h1: 'AI Grammar & Writing Enhancer',
    seoTitle: 'AI Grammar Checker Online – Fix Grammar & Polish Text | PDF Toolkit Pro',
    seoDescription: 'Fix grammar, punctuation, and spelling errors in your text using AI. Enhance clarity, tone, and readability with one click.',
    seoKeywords: [
      'AI grammar checker',
      'grammar corrector online',
      'sentence enhancer',
      'text rephraser',
      'spelling checker AI'
    ],
    faqs: [
      {
        question: 'How does the AI Grammar checker improve writing?',
        answer: 'It corrects spelling, grammar, and punctuation mistakes while offering stylistic adjustments to make sentences concise and professional.'
      }
    ]
  },

  // 24. SIGN PDF DOCUMENT
  {
    id: 'sign_pdf',
    name: 'Sign PDF Document',
    description: 'Overlay custom signatures directly onto any PDF page with responsive position canvas pads.',
    category: 'signature',
    icon: 'FileSignature',
    popular: true,
    h1: 'Sign PDF Online Free',
    seoTitle: 'Sign PDF Online – Add Electronic Signature to PDF | PDF Toolkit Pro',
    seoDescription: 'Sign PDF documents electronically online. Draw, type, or upload your signature and place it securely on any PDF page.',
    seoKeywords: [
      'sign PDF',
      'e-sign PDF',
      'electronic signature',
      'sign PDF online free',
      'digital signature PDF'
    ],
    faqs: [
      {
        question: 'Are electronic signatures created on PDF Toolkit Pro valid?',
        answer: 'Yes, standard electronic signatures (e-signatures) placed on documents are widely accepted for business contracts, approvals, and invoices.'
      }
    ]
  },

  // 25. DRAW TRANSPARENT SIGNATURE
  {
    id: 'draw_signature',
    name: 'Draw Transparent Signature',
    description: 'Draw or type signatures on transparent canvas overlays, and export as clean high-res PNGs.',
    category: 'signature',
    icon: 'FileSignature',
    h1: 'Draw Signature Online',
    seoTitle: 'Draw Transparent Signature Online – Export High-Res PNG | PDF Toolkit Pro',
    seoDescription: 'Draw or type your signature on a clean transparent digital pad. Download high-resolution transparent PNG signatures for documents.',
    seoKeywords: [
      'draw signature',
      'signature maker online',
      'create signature PNG',
      'digital signature creator',
      'transparent signature generator'
    ],
    faqs: [
      {
        question: 'Can I download my signature with a transparent background?',
        answer: 'Yes! The signature maker generates a clean, transparent PNG that you can reuse on Word docs, PDFs, emails, and forms.'
      }
    ]
  },

  // 26. JSON FORMATTER
  {
    id: 'json_formatter',
    name: 'JSON Beautifier',
    description: 'Parse, validate, format, and minify structured JSON data snippets seamlessly.',
    category: 'text',
    icon: 'Type',
    h1: 'Online JSON Formatter & Beautifier',
    seoTitle: 'JSON Formatter & Validator Online – Beautify JSON Data | PDF Toolkit Pro',
    seoDescription: 'Format, beautify, validate, and minify JSON data online. Syntax-highlighted tree view, error detection, and one-click copy.',
    seoKeywords: [
      'JSON formatter',
      'JSON beautifier',
      'validate JSON online',
      'JSON parser',
      'minify JSON online'
    ],
    faqs: [
      {
        question: 'Does the JSON formatter highlight syntax errors?',
        answer: 'Yes, it pinpoints syntax errors with exact line numbers and error descriptions, and formats valid JSON with customizable 2-space or 4-space indentation.'
      }
    ]
  },

  // 27. MARKDOWN EDITOR
  {
    id: 'markdown_editor',
    name: 'Markdown Workspace',
    description: 'Draft paragraphs in rich Markdown syntax with side by side responsive HTML previews.',
    category: 'text',
    icon: 'Type',
    h1: 'Online Markdown Editor with Live Preview',
    seoTitle: 'Online Markdown Editor – Real-Time HTML Preview | PDF Toolkit Pro',
    seoDescription: 'Write and edit Markdown with side-by-side real-time HTML preview. Export as HTML, Markdown, or styled document.',
    seoKeywords: [
      'online Markdown editor',
      'Markdown preview',
      'MD editor online',
      'write Markdown',
      'convert Markdown to HTML'
    ],
    faqs: [
      {
        question: 'Can I export my Markdown documents as HTML or PDF?',
        answer: 'Yes, write in Markdown and instantly copy rendered HTML, export raw MD, or print to a formatted PDF.'
      }
    ]
  },

  // 28. PASSWORD GENERATOR
  {
    id: 'password_generator',
    name: 'Password Generator',
    description: 'Generate highly complex cryptographically secure passwords to guard workspace nodes.',
    category: 'utilities',
    icon: 'Sliders',
    h1: 'Secure Random Password Generator',
    seoTitle: 'Random Password Generator – Create Strong Passwords | PDF Toolkit Pro',
    seoDescription: 'Generate cryptographically secure, random passwords. Customize length, uppercase, lowercase, numbers, and special characters.',
    seoKeywords: [
      'password generator',
      'random password generator',
      'strong password generator',
      'secure password maker',
      'create strong password'
    ],
    faqs: [
      {
        question: 'Are the passwords generated cryptographically secure?',
        answer: 'Yes, passwords are generated locally in your browser using the cryptographically strong `window.crypto.getRandomValues()` API.'
      }
    ]
  },

  // 29. QR CODE GENERATOR
  {
    id: 'qr_generator',
    name: 'QR Code Generator',
    description: 'Compile URLs or text into customized, clean vector grid QR blocks to export instantly.',
    category: 'utilities',
    icon: 'Sliders',
    h1: 'Free Online QR Code Generator',
    seoTitle: 'QR Code Generator – Create Custom QR Codes for Free | PDF Toolkit Pro',
    seoDescription: 'Generate custom vector QR codes for URLs, text, Wi-Fi, and contact details. Download high-resolution PNG or SVG codes instantly.',
    seoKeywords: [
      'QR code generator',
      'create QR code online',
      'free QR maker',
      'vector QR code',
      'custom QR code creator'
    ],
    faqs: [
      {
        question: 'Can I create QR codes for website URLs, Wi-Fi passwords, and plain text?',
        answer: 'Yes, enter any link, plain text message, contact details, or Wi-Fi credentials to create clean, scan-ready QR codes.'
      }
    ]
  },

  // 30. PDF TO WORD
  {
    id: 'pdf_to_word',
    name: 'PDF to Word Converter',
    description: 'Convert PDF files to editable Microsoft Word documents (.docx) seamlessly.',
    category: 'pdf',
    icon: 'FileText',
    popular: true,
    h1: 'Convert PDF to Word Online',
    seoTitle: 'Convert PDF to Word Online – Free PDF to DOCX Converter | PDF Toolkit Pro',
    seoDescription: 'Convert PDF files to editable Microsoft Word (DOCX) documents online for free. Preserves layout, formatting, and fonts accurately.',
    seoKeywords: [
      'PDF to Word',
      'convert PDF to Word',
      'PDF to DOCX',
      'PDF to Word converter online',
      'free PDF to DOCX'
    ],
    faqs: [
      {
        question: 'Will my converted Word document be fully editable?',
        answer: 'Yes, paragraphs, headings, tables, and formatting are converted into native Microsoft Word (.docx) elements that you can edit in any word processor.'
      }
    ]
  },

  // 31. PDF TO EXCEL
  {
    id: 'pdf_to_excel',
    name: 'PDF to Excel Converter',
    description: 'Extract tables and data grid structures from PDF documents into Excel spreadsheets (.xlsx).',
    category: 'pdf',
    icon: 'FileText',
    popular: true,
    h1: 'Convert PDF to Excel Online',
    seoTitle: 'Convert PDF to Excel Online – Extract Tables to XLSX | PDF Toolkit Pro',
    seoDescription: 'Extract tables and data from PDF documents into editable Microsoft Excel (XLSX) spreadsheets accurately and for free.',
    seoKeywords: [
      'PDF to Excel',
      'convert PDF to Excel',
      'PDF to XLSX',
      'extract tables from PDF',
      'PDF to spreadsheet converter'
    ],
    faqs: [
      {
        question: 'How does table extraction from PDF to Excel work?',
        answer: 'The converter detects tabular structures and column boundaries in your PDF and places the data cleanly into spreadsheet cells in an .xlsx workbook.'
      }
    ]
  },

  // 32. WORD TO PDF
  {
    id: 'word_to_pdf',
    name: 'Word to PDF Converter',
    description: 'Convert DOCX, DOC, and ODT documents to secure PDF files instantly.',
    category: 'pdf',
    icon: 'FileText',
    popular: true,
    h1: 'Convert Word to PDF Online',
    seoTitle: 'Convert Word to PDF Online – DOCX to PDF Converter | PDF Toolkit Pro',
    seoDescription: 'Convert Word documents (DOCX, DOC) to high-quality PDF files online for free. Fast, accurate, and completely secure.',
    seoKeywords: [
      'Word to PDF',
      'convert Word to PDF',
      'DOCX to PDF',
      'Word to PDF converter online',
      'free DOCX to PDF'
    ],
    faqs: [
      {
        question: 'Does the Word to PDF conversion preserve fonts and layout?',
        answer: 'Yes, all text styles, margins, images, and alignments from your DOCX file are accurately rendered into the resulting PDF.'
      }
    ]
  },

  // 33. EXCEL TO PDF
  {
    id: 'excel_to_pdf',
    name: 'Excel to PDF Converter',
    description: 'Convert XLSX, XLS, and CSV spreadsheets to clean formatted PDF files.',
    category: 'pdf',
    icon: 'FileText',
    popular: true,
    h1: 'Convert Excel to PDF Online',
    seoTitle: 'Convert Excel to PDF Online – XLSX to PDF Converter | PDF Toolkit Pro',
    seoDescription: 'Convert Excel spreadsheets (XLSX, XLS, CSV) into clean, perfectly formatted PDF documents. Free and secure online conversion.',
    seoKeywords: [
      'Excel to PDF',
      'convert Excel to PDF',
      'XLSX to PDF',
      'spreadsheet to PDF',
      'CSV to PDF converter'
    ],
    faqs: [
      {
        question: 'How are spreadsheet columns formatted when converting to PDF?',
        answer: 'Rows and columns are arranged with clean grid borders and header formatting, automatically fitted to standard A4/Letter page dimensions.'
      }
    ]
  },

  // 34. IMAGE TO PDF
  {
    id: 'image_to_pdf',
    name: 'Image to PDF Converter',
    description: 'Convert JPG, PNG, WEBP, and BMP graphics into clean multi-page PDF documents.',
    category: 'pdf',
    icon: 'FileText',
    popular: true,
    h1: 'Convert Image to PDF Online',
    seoTitle: 'Convert JPG & PNG to PDF Online – Image to PDF Converter | PDF Toolkit Pro',
    seoDescription: 'Convert JPG, PNG, WebP, and BMP images into a single multi-page PDF document online for free. Customize page orientation and margins.',
    seoKeywords: [
      'image to PDF',
      'JPG to PDF',
      'PNG to PDF',
      'convert photo to PDF',
      'images to PDF maker'
    ],
    faqs: [
      {
        question: 'Can I combine multiple pictures into one multi-page PDF file?',
        answer: 'Yes, upload multiple JPG or PNG images, reorder them as desired, and convert them into a single consolidated PDF document.'
      }
    ]
  },

  // 35. PDF TO IMAGE
  {
    id: 'pdf_to_image',
    name: 'PDF to Image Converter',
    description: 'Convert PDF document pages into high resolution PNG or JPG images.',
    category: 'pdf',
    icon: 'FileText',
    popular: true,
    h1: 'Convert PDF to Image Online',
    seoTitle: 'Convert PDF to JPG & PNG Online – PDF to Image Converter | PDF Toolkit Pro',
    seoDescription: 'Convert PDF document pages into high-resolution JPG or PNG images online. Fast, secure, and preserves full image clarity.',
    seoKeywords: [
      'PDF to image',
      'PDF to JPG',
      'PDF to PNG',
      'convert PDF to picture',
      'extract PDF pages as JPG'
    ],
    faqs: [
      {
        question: 'What image formats can I export my PDF pages to?',
        answer: 'You can convert every page of your PDF into high-definition PNG or JPG image files, downloadable individually or as a ZIP archive.'
      }
    ]
  },

  // 36. POWERPOINT TO PDF
  {
    id: 'powerpoint_to_pdf',
    name: 'PowerPoint to PDF',
    description: 'Convert PPTX presentation decks into lightweight shareable PDF files.',
    category: 'pdf',
    icon: 'FileText',
    h1: 'Convert PowerPoint to PDF Online',
    seoTitle: 'Convert PowerPoint to PDF Online – PPTX to PDF Converter | PDF Toolkit Pro',
    seoDescription: 'Convert PowerPoint presentations (PPTX, PPT) into clean, shareable PDF documents online. Preserves layout, slides, and visuals.',
    seoKeywords: [
      'PowerPoint to PDF',
      'PPT to PDF',
      'PPTX to PDF',
      'convert PowerPoint to PDF online',
      'presentation to PDF'
    ],
    faqs: [
      {
        question: 'Will converting PPTX to PDF preserve slide order and graphics?',
        answer: 'Yes, each slide is formatted in exact presentation sequence into a crisp, easily shareable PDF document.'
      }
    ]
  },

  // 37. PDF TO POWERPOINT
  {
    id: 'pdf_to_powerpoint',
    name: 'PDF to PowerPoint',
    description: 'Convert PDF documents into editable PowerPoint slides (.pptx).',
    category: 'pdf',
    icon: 'FileText',
    h1: 'Convert PDF to PowerPoint Online',
    seoTitle: 'Convert PDF to PowerPoint Online – PDF to PPTX Converter | PDF Toolkit Pro',
    seoDescription: 'Convert PDF documents into editable Microsoft PowerPoint (PPTX) slide presentations. Free, fast, and high quality.',
    seoKeywords: [
      'PDF to PowerPoint',
      'PDF to PPTX',
      'convert PDF to slides',
      'PDF to presentation',
      'PDF to PPT converter'
    ],
    faqs: [
      {
        question: 'Can I edit the converted PowerPoint slides in Microsoft PowerPoint or Google Slides?',
        answer: 'Yes! The generated PPTX file can be opened and edited directly in PowerPoint, Keynote, or Google Slides.'
      }
    ]
  },

  // 38. BATCH PROCESSOR
  {
    id: 'batch_processor',
    name: 'Batch Processor',
    description: 'Upload multiple files to batch compress, convert formats, watermark, or resize all at once with real-time progress tracking.',
    category: 'utilities',
    icon: 'Layers',
    popular: true,
    h1: 'Batch File Processor Online',
    seoTitle: 'Batch File Processor – Bulk Compress & Convert Files | PDF Toolkit Pro',
    seoDescription: 'Process multiple files in batch online. Bulk compress images and PDFs, convert formats, add watermarks, and download as a single ZIP.',
    seoKeywords: [
      'batch PDF processor',
      'bulk PDF tools',
      'batch image compressor',
      'bulk convert files',
      'batch file processing online'
    ],
    faqs: [
      {
        question: 'How many files can I process simultaneously in batch mode?',
        answer: 'You can upload dozens of files at once to run batch compression, format conversion, or watermarking, and download all results in a single ZIP.'
      }
    ]
  },

  // UTILITY / ADMIN (Internal)
  {
    id: 'canonical_tag_test',
    name: 'Canonical Tag Test',
    description: 'Verify, analyze, and test search-engine canonical links and SEO compliance across all workspace pages.',
    category: 'utilities',
    icon: 'Link',
    popular: false,
    adminOnly: true,
    hidden: true,
    h1: 'SEO & Canonical Tag Tester',
    seoTitle: 'SEO & Canonical Tag Tester | PDF Toolkit Pro',
    seoDescription: 'Inspect, validate, and debug search-engine canonical links across all PDF Toolkit Pro routes. Run bulk SEO checks instantly.',
    seoKeywords: ['canonical tag test', 'seo canonical checker', 'verify canonical tags', 'check canonical link online']
  }
];
