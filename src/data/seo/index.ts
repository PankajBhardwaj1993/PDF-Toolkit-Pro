import { ToolSeoContent } from './types';
import { pdfToolsSeo } from './pdfToolsSeo';
import { officeToolsSeo } from './officeToolsSeo';
import { imageAiToolsSeo } from './imageAiToolsSeo';

export const allToolsSeoData: Record<string, ToolSeoContent> = {
  ...pdfToolsSeo,
  ...officeToolsSeo,
  ...imageAiToolsSeo,
};

const ID_ALIASES: Record<string, string> = {
  'edit_pdf_metadata': 'pdf_metadata',
  'edit-pdf-metadata': 'pdf_metadata',
  'pdf-metadata': 'pdf_metadata',
  'pdf_metadata_editor': 'pdf_metadata',
  'ai_tts': 'text_to_speech',
  'text-to-speech': 'text_to_speech',
  'batch-processor': 'batch_processor',
  'batch': 'batch_processor',
  'pdf-ocr': 'pdf_ocr',
  'ocr': 'pdf_ocr',
  'excel-editor': 'excel_editor',
  'spreadsheet': 'excel_editor',
  'word-editor': 'word_editor',
  'doc_tool': 'word_editor',
  'compress-pdf': 'compress_pdf',
  'merge-pdf': 'merge_pdf',
  'split-pdf': 'split_pdf',
  'rotate-pdf': 'rotate_pdf',
  'delete-pdf': 'delete_pdf',
  'extract-pdf': 'extract_pdf',
  'protect-pdf': 'protect_pdf',
  'sign-pdf': 'sign_pdf',
  'draw-signature': 'draw_signature',
  'page-numbers': 'page_numbers',
  'pdf-to-word': 'pdf_to_word',
  'word-to-pdf': 'word_to_pdf',
  'pdf-to-excel': 'pdf_to_excel',
  'excel-to-pdf': 'excel_to_pdf',
  'pdf-to-powerpoint': 'pdf_to_powerpoint',
  'powerpoint-to-pdf': 'powerpoint_to_pdf',
  'pdf-to-image': 'pdf_to_image',
  'image-to-pdf': 'image_to_pdf',
  'pdf-to-text': 'pdf_to_text',
  'text-to-pdf': 'text_to_pdf',
  'pdf-to-html': 'pdf_to_html',
  'html-to-pdf': 'html_to_pdf',
  'compress-image': 'compress_image',
  'resize-image': 'resize_image',
  'crop-image': 'crop_image',
  'convert-image': 'convert_image',
  'passport-photo': 'passport_photo',
  'remove-bg': 'remove_bg',
  'ai-grammar': 'ai_grammar',
  'qr-generator': 'qr_generator',
  'password-generator': 'password_generator',
  'online-pdf-editor': 'online_pdf_editor'
};

export function getToolSeoContent(toolId: string): ToolSeoContent | null {
  if (!toolId) return null;
  const normalized = toolId.toLowerCase().trim();
  const direct = allToolsSeoData[normalized];
  if (direct) return direct;

  const alias = ID_ALIASES[normalized];
  if (alias && allToolsSeoData[alias]) return allToolsSeoData[alias];

  const underscore = normalized.replace(/-/g, '_');
  if (allToolsSeoData[underscore]) return allToolsSeoData[underscore];

  const hyphen = normalized.replace(/_/g, '-');
  if (allToolsSeoData[hyphen]) return allToolsSeoData[hyphen];

  return null;
}

export * from './types';

