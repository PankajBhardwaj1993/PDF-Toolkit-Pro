import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, VolumeX, Play, Pause, Square, Copy, Check, Trash2, 
  Sparkles, RefreshCw, Sliders, Languages, Clock, Save, FileText, 
  AlertTriangle, Loader2, Mic, Info, ArrowLeft, Wand2, Zap, RotateCcw,
  Download, Globe, Sparkle, Settings2, CheckCircle2, UserCheck, Compass
} from 'lucide-react';

interface TextToSpeechWorkstationProps {
  onAddRecentFile: (file: { name: string; size: string; type: string; toolUsed: string }) => void;
  user: any;
  onBackToTools: () => void;
}

interface SavedSnippet {
  id: string;
  title: string;
  text: string;
  date: string;
  voiceName: string;
}

export interface HumanVoicePreset {
  id: string;
  name: string;
  accent: string;
  flag: string;
  gender: 'male' | 'female';
  lang: string;
  pitch: number;
  rate: number;
  description: string;
  sampleText: string;
}

// 24 Curated High Quality Human Voice Presets with Localized Regional Accents & Timbre
export const HUMAN_VOICE_PRESETS: HumanVoicePreset[] = [
  {
    id: 'us-female',
    name: 'US Female Voice',
    accent: 'American (United States)',
    flag: '🇺🇸',
    gender: 'female',
    lang: 'en-US',
    pitch: 1.10,
    rate: 1.0,
    description: 'Natural clear American female voice tone with warm resonance.',
    sampleText: 'Welcome to PDF Toolkit Pro! Experience natural human American speech synthesis.'
  },
  {
    id: 'us-male',
    name: 'US Male Voice',
    accent: 'American (United States)',
    flag: '🇺🇸',
    gender: 'male',
    lang: 'en-US',
    pitch: 0.88,
    rate: 0.96,
    description: 'Deep authoritative American male studio voice tone.',
    sampleText: 'Hello and welcome. This is a realistic American male human voice sample.'
  },
  {
    id: 'uk-female',
    name: 'UK Female Voice',
    accent: 'British (United Kingdom)',
    flag: '🇬🇧',
    gender: 'female',
    lang: 'en-GB',
    pitch: 1.08,
    rate: 0.98,
    description: 'Refined British Received Pronunciation female voice.',
    sampleText: 'Good day! Converting your text into clear British female speech.'
  },
  {
    id: 'uk-male',
    name: 'UK Male Voice',
    accent: 'British (United Kingdom)',
    flag: '🇬🇧',
    gender: 'male',
    lang: 'en-GB',
    pitch: 0.86,
    rate: 0.95,
    description: 'Eloquent British male narrator voice with rich timbre.',
    sampleText: 'Greetings! Listen to your documents read in a classic British accent.'
  },
  {
    id: 'in-female',
    name: 'Indian Female Voice',
    accent: 'Indian English (India)',
    flag: '🇮🇳',
    gender: 'female',
    lang: 'en-IN',
    pitch: 1.10,
    rate: 1.0,
    description: 'Warm and expressive Indian English female tone.',
    sampleText: 'Namaste! Welcome to high quality Indian accent English speech synthesis.'
  },
  {
    id: 'in-male',
    name: 'Indian Male Voice',
    accent: 'Indian English (India)',
    flag: '🇮🇳',
    gender: 'male',
    lang: 'en-IN',
    pitch: 0.88,
    rate: 0.96,
    description: 'Professional Indian English male speaker tone.',
    sampleText: 'Hello friends! This is a realistic Indian English male speech sample.'
  },
  {
    id: 'hi-female',
    name: 'Hindi Female (महिला)',
    accent: 'Hindi (हिन्दी - India)',
    flag: '🇮🇳',
    gender: 'female',
    lang: 'hi-IN',
    pitch: 1.12,
    rate: 0.98,
    description: 'प्राकृतिक स्पष्ट हिंदी महिला आवाज (Natural Hindi Female Speech).',
    sampleText: 'PDF Toolkit Pro में आपका स्वागत है। यह एक सुंदर और प्राकृतिक हिंदी महिला आवाज है।'
  },
  {
    id: 'hi-male',
    name: 'Hindi Male (पुरुष)',
    accent: 'Hindi (हिन्दी - India)',
    flag: '🇮🇳',
    gender: 'male',
    lang: 'hi-IN',
    pitch: 0.86,
    rate: 0.94,
    description: 'गंभीर और स्पष्ट हिंदी पुरुष आवाज (Deep Hindi Male Studio Voice).',
    sampleText: 'नमस्ते! यह आपकी पाठ सामग्री का स्पष्ट और स्वाभाविक हिंदी पुरुष आवाज का नमूना है।'
  },
  {
    id: 'ja-female',
    name: 'Japanese Female (女性)',
    accent: 'Japanese (日本語 - Japan)',
    flag: '🇯🇵',
    gender: 'female',
    lang: 'ja-JP',
    pitch: 1.14,
    rate: 1.0,
    description: '自然で美しい日本語の女性音声 (Natural Japanese Female Speech).',
    sampleText: 'PDF Toolkit Proへようこそ！自然で滑らかな日本語の女性音声です。'
  },
  {
    id: 'ja-male',
    name: 'Japanese Male (男性)',
    accent: 'Japanese (日本語 - Japan)',
    flag: '🇯🇵',
    gender: 'male',
    lang: 'ja-JP',
    pitch: 0.88,
    rate: 0.96,
    description: '落ち着いた日本語の男性ナレーション (Calm Japanese Male Speech).',
    sampleText: 'こんにちは。入力された日本語テキストをリアルな男性音声で読み上げます。'
  },
  {
    id: 'es-female',
    name: 'Spanish Female (Mujer)',
    accent: 'Spanish (Español - Spain / LatAm)',
    flag: '🇪🇸',
    gender: 'female',
    lang: 'es-ES',
    pitch: 1.08,
    rate: 1.0,
    description: 'Voz femenina fluida y clara en español.',
    sampleText: '¡Bienvenido! Escuche su texto en una voz femenina clara y natural en español.'
  },
  {
    id: 'es-male',
    name: 'Spanish Male (Hombre)',
    accent: 'Spanish (Español - Spain / LatAm)',
    flag: '🇪🇸',
    gender: 'male',
    lang: 'es-ES',
    pitch: 0.88,
    rate: 0.96,
    description: 'Voz masculina cálida y profesional en español.',
    sampleText: 'Hola, este es un ejemplo de voz masculina humana en español.'
  },
  {
    id: 'fr-female',
    name: 'French Female (Femme)',
    accent: 'French (Français - France)',
    flag: '🇫🇷',
    gender: 'female',
    lang: 'fr-FR',
    pitch: 1.08,
    rate: 0.98,
    description: 'Voix féminine française fluide et naturelle.',
    sampleText: 'Bienvenue! Écoutez votre texte prononcé par une voix féminine française naturelle.'
  },
  {
    id: 'fr-male',
    name: 'French Male (Homme)',
    accent: 'French (Français - France)',
    flag: '🇫🇷',
    gender: 'male',
    lang: 'fr-FR',
    pitch: 0.88,
    rate: 0.95,
    description: 'Voix masculine française élégante.',
    sampleText: 'Bonjour, ceci est un aperçu de voix humaine masculine en français.'
  },
  {
    id: 'de-female',
    name: 'German Female (Frau)',
    accent: 'German (Deutsch - Germany)',
    flag: '🇩🇪',
    gender: 'female',
    lang: 'de-DE',
    pitch: 1.06,
    rate: 0.98,
    description: 'Deutliche und natürliche deutsche Frauensprache.',
    sampleText: 'Willkommen! Wandeln Sie Ihren Text in eine deutliche deutsche Stimme um.'
  },
  {
    id: 'de-male',
    name: 'German Male (Mann)',
    accent: 'German (Deutsch - Germany)',
    flag: '🇩🇪',
    gender: 'male',
    lang: 'de-DE',
    pitch: 0.86,
    rate: 0.95,
    description: 'Tiefe und professionelle deutsche Männerstimme.',
    sampleText: 'Hallo, dies ist eine Sprachprobe einer männlichen Stimme auf Deutsch.'
  },
  {
    id: 'zh-female',
    name: 'Chinese Female (女性)',
    accent: 'Chinese (中文 - Mandarin)',
    flag: '🇨🇳',
    gender: 'female',
    lang: 'zh-CN',
    pitch: 1.10,
    rate: 1.0,
    description: '清晰自然的中文普通话女声 (Clear Mandarin Female Speech).',
    sampleText: '欢迎使用 PDF Toolkit Pro！为您呈现清晰自然的中文普通话女声。'
  },
  {
    id: 'zh-male',
    name: 'Chinese Male (男性)',
    accent: 'Chinese (中文 - Mandarin)',
    flag: '🇨🇳',
    gender: 'male',
    lang: 'zh-CN',
    pitch: 0.88,
    rate: 0.96,
    description: '稳重自然的中文普通话男声 (Resonant Mandarin Male Speech).',
    sampleText: '您好，这是标准中文普通话的男声语音示范。'
  },
  {
    id: 'ko-female',
    name: 'Korean Female (여성)',
    accent: 'Korean (한국어 - Seoul)',
    flag: '🇰🇷',
    gender: 'female',
    lang: 'ko-KR',
    pitch: 1.12,
    rate: 1.0,
    description: '자연스럽고 또렷한 한국어 여성 음성.',
    sampleText: '안녕하세요! PDF Toolkit Pro에서 제공하는 선명한 한국어 여성 목소리입니다.'
  },
  {
    id: 'ko-male',
    name: 'Korean Male (남성)',
    accent: 'Korean (한국어 - Seoul)',
    flag: '🇰🇷',
    gender: 'male',
    lang: 'ko-KR',
    pitch: 0.88,
    rate: 0.96,
    description: '차분하고 신뢰감 있는 한국어 남성 음성.',
    sampleText: '안녕하십니까. 한국어 남성 사람 목소리 샘플입니다.'
  },
  {
    id: 'ar-female',
    name: 'Arabic Female (أنثى)',
    accent: 'Arabic (العربية - Saudi)',
    flag: '🇸🇦',
    gender: 'female',
    lang: 'ar-SA',
    pitch: 1.08,
    rate: 0.98,
    description: 'صوت أنثوي عربي نقي وواضح.',
    sampleText: 'أهلاً بك! تحويل كتابتك إلى صوت أنثوي عربي واضح وطبيعي.'
  },
  {
    id: 'ar-male',
    name: 'Arabic Male (رجل)',
    accent: 'Arabic (العربية - Saudi)',
    flag: '🇸🇦',
    gender: 'male',
    lang: 'ar-SA',
    pitch: 0.86,
    rate: 0.95,
    description: 'صوت رجالي عربي وقور.',
    sampleText: 'مرحباً، هذا نموذج لصوت رجالي عربي طبيعي.'
  },
  {
    id: 'au-female',
    name: 'Australian Female Voice',
    accent: 'Australian (Australia)',
    flag: '🇦🇺',
    gender: 'female',
    lang: 'en-AU',
    pitch: 1.08,
    rate: 1.0,
    description: 'Friendly Australian accent female speaker tone.',
    sampleText: 'G\'day! Converting your text into realistic Aussie female speech.'
  },
  {
    id: 'au-male',
    name: 'Australian Male Voice',
    accent: 'Australian (Australia)',
    flag: '🇦🇺',
    gender: 'male',
    lang: 'en-AU',
    pitch: 0.88,
    rate: 0.96,
    description: 'Aussie male accent narrator voice.',
    sampleText: 'G\'day mate! Listen to your documents with a natural Australian accent.'
  },
];

const MAX_CHARS = 20000;

// Helper to infer gender from voice name
function detectVoiceGender(name: string): 'female' | 'male' | 'neutral' {
  const n = name.toLowerCase();
  const femaleKeywords = [
    'female', 'zira', 'samantha', 'victoria', 'hazel', 'susan', 'heera', 'caren', 'veena',
    'fiona', 'karen', 'moira', 'tessa', 'katya', 'elena', 'laura', 'monica', 'anna',
    'paulina', 'clara', 'sarah', 'alice', 'emma', 'jenny', 'aria', 'natasha', 'sin-ji',
    'yuri', 'kyoko', 'yuna', 'ting-ting', 'mei-jia', 'siri', 'woman', 'girl', 'google female'
  ];
  const maleKeywords = [
    'male', 'david', 'mark', 'george', 'ravi', 'alex', 'fred', 'bruce', 'daniel',
    'oliver', 'thomas', 'richard', 'ralph', 'diego', 'jorge', 'juan', 'pablo',
    'luca', 'stefano', 'boris', 'pavel', 'guy', 'man', 'boy', 'google male'
  ];

  if (femaleKeywords.some(k => n.includes(k))) return 'female';
  if (maleKeywords.some(k => n.includes(k))) return 'male';
  return 'neutral';
}

// Global Friendly Language Names Map with Native Scripts
const LANGUAGE_NAMES: { [code: string]: string } = {
  'en-US': 'English (United States)',
  'en-GB': 'English (United Kingdom)',
  'en-IN': 'English (India)',
  'en-AU': 'English (Australia)',
  'en-CA': 'English (Canada)',
  'hi-IN': 'Hindi - हिन्दी (India)',
  'hi': 'Hindi - हिन्दी',
  'es-ES': 'Spanish - Español (Spain)',
  'es-MX': 'Spanish - Español (Mexico)',
  'es-US': 'Spanish - Español (United States)',
  'fr-FR': 'French - Français (France)',
  'fr-CA': 'French - Français (Canada)',
  'de-DE': 'German - Deutsch (Germany)',
  'it-IT': 'Italian - Italiano (Italy)',
  'ja-JP': 'Japanese - 日本語 (Japan)',
  'ja': 'Japanese - 日本語',
  'ko-KR': 'Korean - 한국어 (South Korea)',
  'ko': 'Korean - 한국어',
  'zh-CN': 'Chinese - 中文 (Simplified)',
  'zh-TW': 'Chinese - 中文 (Traditional)',
  'zh-HK': 'Chinese - 廣東話 (Hong Kong)',
  'pt-BR': 'Portuguese - Português (Brazil)',
  'pt-PT': 'Portuguese - Português (Portugal)',
  'ru-RU': 'Russian - Русский (Russia)',
  'ar-SA': 'Arabic - العربية (Saudi Arabia)',
  'ar-EG': 'Arabic - العربية (Egypt)',
  'bn-IN': 'Bengali - বাংলা (India)',
  'ta-IN': 'Tamil - தமிழ் (India)',
  'te-IN': 'Telugu - తెలుగు (India)',
  'mr-IN': 'Marathi - मराठी (India)',
  'gu-IN': 'Gujarati - ગુજરાતી (India)',
  'kn-IN': 'Kannada - ಕನ್ನಡ (India)',
  'ml-IN': 'Malayalam - മലയാളം (India)',
  'pa-IN': 'Punjabi - ਪੰਜਾਬੀ (India)',
  'ur-PK': 'Urdu - اردو (Pakistan)',
  'nl-NL': 'Dutch - Nederlands (Netherlands)',
  'sv-SE': 'Swedish - Svenska (Sweden)',
  'tr-TR': 'Turkish - Türkçe (Turkey)',
  'pl-PL': 'Polish - Polski (Poland)',
  'uk-UA': 'Ukrainian - Українська (Ukraine)',
  'th-TH': 'Thai - ไทย (Thailand)',
  'vi-VN': 'Vietnamese - Tiếng Việt (Vietnam)',
  'id-ID': 'Indonesian - Bahasa Indonesia (Indonesia)',
  'ms-MY': 'Malay - Bahasa Melayu (Malaysia)',
  'el-GR': 'Greek - Ελληνικά (Greece)',
  'he-IL': 'Hebrew - עברית (Israel)',
  'cs-CZ': 'Czech - Čeština (Czech Republic)',
  'hu-HU': 'Hungarian - Magyar (Hungary)',
  'ro-RO': 'Romanian - Română (Romania)',
  'da-DK': 'Danish - Dansk (Denmark)',
  'fi-FI': 'Finnish - Suomi (Finland)',
  'no-NO': 'Norwegian - Norsk (Norway)',
  'sk-SK': 'Slovak - Slovenčina (Slovakia)',
  'ca-ES': 'Catalan - Català (Spain)',
  'hr-HR': 'Croatian - Hrvatski (Croatia)',
};

// Advanced Multi-Script & Word-Pattern Language Detector
function detectLanguageFromText(str: string): { langCode: string; name: string; presetId?: string } {
  if (!str || !str.trim()) return { langCode: 'en-US', name: 'English (United States)', presetId: 'us-female' };

  // 1. Japanese Check (Hiragana, Katakana, Kanji + Romaji patterns)
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(str) || (/[\u4E00-\u9FFF]/.test(str) && /[\u3000-\u303F]/.test(str))) {
    return { langCode: 'ja-JP', name: 'Japanese (日本語)', presetId: 'ja-female' };
  }
  const lower = str.toLowerCase();
  if (/\b(konnichiwa|arigatou|sayonara|desu|sugoi|kawaii|watashi|ohayou|hajimemashite|kore|sore|dono|anata|otaku|samurai)\b/.test(lower)) {
    return { langCode: 'ja-JP', name: 'Japanese (日本語 - Romaji)', presetId: 'ja-female' };
  }

  // 2. Korean Check (Hangul)
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(str)) {
    return { langCode: 'ko-KR', name: 'Korean (한국어)', presetId: 'ko-female' };
  }
  if (/\b(annyeong|kamsahamnida|gamsahamnida|saranghae|oppa|ne|aniyo|chingu)\b/.test(lower)) {
    return { langCode: 'ko-KR', name: 'Korean (한국어 - Romanized)', presetId: 'ko-female' };
  }

  // 3. Chinese Check (Hanzi without Japanese Kana)
  if (/[\u4E00-\u9FFF]/.test(str)) {
    return { langCode: 'zh-CN', name: 'Chinese (中文)', presetId: 'zh-female' };
  }
  if (/\b(nihao|xie xie|xiexie|bu keqi|zaijian|wo|ni|tamen)\b/.test(lower)) {
    return { langCode: 'zh-CN', name: 'Chinese (中文 - Pinyin)', presetId: 'zh-female' };
  }

  // 4. Indic Scripts: Devanagari (Hindi/Marathi/Nepali) & Romanized Hinglish
  if (/[\u0900-\u097F]/.test(str)) {
    return { langCode: 'hi-IN', name: 'Hindi (हिन्दी)', presetId: 'hi-female' };
  }
  if (/\b(namaste|kaise|kaisa|ho|hai|kya|aap|mujhe|tum|samajh|rahe|karo|bhai|dhanyawad|shukriya|accha|kardo|karenge|lelo|do|mera|meri|hum|batao|chahiye|sab|bahut|achha)\b/.test(lower)) {
    return { langCode: 'hi-IN', name: 'Hindi / Hinglish (हिन्दी)', presetId: 'hi-female' };
  }

  // Other South Asian Scripts
  if (/[\u0980-\u09FF]/.test(str)) return { langCode: 'bn-IN', name: 'Bengali (বাংলা)' };
  if (/[\u0B80-\u0BFF]/.test(str)) return { langCode: 'ta-IN', name: 'Tamil (தமிழ்)' };
  if (/[\u0C00-\u0C7F]/.test(str)) return { langCode: 'te-IN', name: 'Telugu (తెలుగు)' };
  if (/[\u0A80-\u0AFF]/.test(str)) return { langCode: 'gu-IN', name: 'Gujarati (ગુજરાતી)' };

  // 5. Arabic Script
  if (/[\u0600-\u06FF]/.test(str)) return { langCode: 'ar-SA', name: 'Arabic (العربية)', presetId: 'ar-female' };

  // 6. Cyrillic Script
  if (/[\u0400-\u04FF]/.test(str)) return { langCode: 'ru-RU', name: 'Russian (Русский)' };

  // 7. European Latin Word & Accent Pattern Matches
  if (/\b(el|la|los|las|un|una|gracias|hola|por|favor|está|buenos|días|señor|con|para|mucho|gusto|cómo|estás)\b/.test(lower)) {
    return { langCode: 'es-ES', name: 'Spanish (Español)', presetId: 'es-female' };
  }
  if (/\b(le|la|les|un|une|des|merci|bonjour|oui|non|s'il|vous|plaît|avec|pour|comment|allez|salut)\b/.test(lower)) {
    return { langCode: 'fr-FR', name: 'French (Français)', presetId: 'fr-female' };
  }
  if (/\b(der|die|das|und|ein|eine|danke|guten|tag|bitte|ist|nicht|mit|für|wie|geht|dir|tschüss)\b/.test(lower)) {
    return { langCode: 'de-DE', name: 'German (Deutsch)', presetId: 'de-female' };
  }

  return { langCode: 'en-US', name: 'English (United States)', presetId: 'us-female' };
}

// Find best natural human voice in browser SpeechSynthesis for target language & gender
function findBestVoiceForPreset(allVoices: SpeechSynthesisVoice[], targetLangCode: string, gender: 'male' | 'female'): SpeechSynthesisVoice | null {
  if (!allVoices || allVoices.length === 0) return null;
  const target = targetLangCode.toLowerCase();
  const prefix = target.split('-')[0];

  // Exact lang matches first
  const exactMatches = allVoices.filter(v => v.lang.toLowerCase() === target);
  const prefixMatches = allVoices.filter(v => v.lang.toLowerCase().startsWith(prefix));
  const candidates = exactMatches.length > 0 ? exactMatches : prefixMatches;

  if (candidates.length === 0) return null;

  // Gender matched candidates
  const genderMatched = candidates.filter(v => detectVoiceGender(v.name) === gender);
  const pool = genderMatched.length > 0 ? genderMatched : candidates;

  // Prioritize natural/human voice keywords
  const qualityKeywords = ['natural', 'google', 'neural', 'premium', 'online', 'enhanced', 'multilingual', 'deep', 'wave'];

  const sorted = [...pool].sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aScore = qualityKeywords.reduce((acc, k) => acc + (aName.includes(k) ? 2 : 0), 0) + (a.default ? 1 : 0);
    const bScore = qualityKeywords.reduce((acc, k) => acc + (bName.includes(k) ? 2 : 0), 0) + (b.default ? 1 : 0);
    return bScore - aScore;
  });

  return sorted[0];
}

const SAMPLE_TEXTS = [
  {
    label: 'US Female - American Accent',
    text: 'Welcome to PDF Toolkit Pro Text to Speech Workstation. Convert any text paragraph into clear, natural human-like speech with localized accents.'
  },
  {
    label: 'US Male - American Accent',
    text: 'Hello and welcome. Listening to documents in a deep authoritative American male voice tone.'
  },
  {
    label: 'UK Female - British Accent',
    text: 'Good day! Converting your text into clear British female speech with eloquent Received Pronunciation.'
  },
  {
    label: 'UK Male - British Accent',
    text: 'Greetings! Listen to your text read aloud in a classic British accent narrator voice.'
  },
  {
    label: 'Indian Female - English Accent',
    text: 'Namaste! Welcome to high quality Indian accent English speech synthesis.'
  },
  {
    label: 'Indian Male - English Accent',
    text: 'Hello friends! Experience realistic Indian English male speech audio synthesis.'
  },
  {
    label: 'Hindi Female - हिन्दी (India)',
    text: 'PDF Toolkit Pro में आपका स्वागत है। अपनी किसी भी पाठ सामग्री को प्राकृतिक, स्पष्ट और मानव जैसी आवाज में सुनें।'
  },
  {
    label: 'Hindi Male - हिन्दी (India)',
    text: 'नमस्ते! यह आपकी पाठ सामग्री का स्पष्ट और स्वाभाविक हिंदी पुरुष आवाज का नमूना है।'
  },
  {
    label: 'Japanese Female - 日本語 (Japan)',
    text: 'PDF Toolkit Proへようこそ！入力された日本語テキストを自然で人間らしい高音質な音声で読み上げます。'
  },
  {
    label: 'Japanese Male - 日本語 (Japan)',
    text: 'こんにちは。入力された日本語テキストをリアルな男性音声で読み上げます。'
  },
  {
    label: 'Spanish Female - Español (España)',
    text: '¡Bienvenido a PDF Toolkit Pro! Convierte cualquier párrafo de texto en habla clara y natural con sonido humano.'
  },
  {
    label: 'French Female - Français (France)',
    text: 'Bienvenue sur PDF Toolkit Pro ! Convertissez n\'importe quel texte en parole naturelle et claire.'
  },
  {
    label: 'German Male - Deutsch (Deutschland)',
    text: 'Willkommen bei PDF Toolkit Pro! Verwandeln Sie Ihren eingegebenen Text in deutliche, natürliche Sprache.'
  }
];

export default function TextToSpeechWorkstation({ onAddRecentFile, user, onBackToTools }: TextToSpeechWorkstationProps) {
  const [text, setText] = useState<string>('PDF Toolkit Proへようこそ！Type or paste text in Japanese (日本語), Hindi (हिन्दी), US/UK English, Spanish, French, German, Chinese, Korean, Arabic or 50+ world languages here.');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Voice Selection Mode & Preset
  const [voiceMode, setVoiceMode] = useState<'presets' | 'browser'>('presets');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('us-female');
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  
  const [selectedLang, setSelectedLang] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male'>('all');
  const [autoDetectEnabled, setAutoDetectEnabled] = useState<boolean>(true);
  const [detectedLangInfo, setDetectedLangInfo] = useState<{ langCode: string; name: string; presetId?: string }>({
    langCode: 'ja-JP',
    name: 'Japanese (日本語)',
    presetId: 'ja-female'
  });
  
  // Audio Controls
  const [rate, setRate] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.1);
  const [volume, setVolume] = useState<number>(1.0);

  // States
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [isLoadingVoices, setIsLoadingVoices] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [currentCharIndex, setCurrentCharIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  // Auto-Translate State
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState<boolean>(true);

  const translateTextToLanguage = async (sourceText: string, targetLangCode: string): Promise<string> => {
    try {
      setIsTranslating(true);
      showNotice('Translating text to match the selected voice...');
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText, targetLang: targetLangCode }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      if (data.translatedText) {
        setText(data.translatedText);
        showNotice('Successfully auto-translated text to voice language!');
        return data.translatedText;
      }
      return sourceText;
    } catch (err) {
      console.error('Translation error:', err);
      showNotice('Failed to auto-translate. Using original text.');
      return sourceText;
    } finally {
      setIsTranslating(false);
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const playServerAudioFallback = async (cleanText: string, langCode: string) => {
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }

      showNotice('Playing online human voice audio...');
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, lang: langCode }),
      });

      if (!response.ok) {
        throw new Error('Server TTS failed');
      }

      const data = await response.json();
      if (!data.audioBase64) {
        throw new Error('No audio returned');
      }

      const audio = new Audio(data.audioBase64);
      audio.volume = volume;
      audioPlayerRef.current = audio;

      audio.onplay = () => {
        setIsPlaying(true);
        setIsPaused(false);
        setIsPreviewing(false);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentCharIndex(0);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };

      await audio.play();
    } catch (err) {
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  // Initialize SpeechSynthesis Voices
  useEffect(() => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setSpeechSupported(false);
      setIsLoadingVoices(false);
      return;
    }

    const loadVoices = () => {
      const avail = window.speechSynthesis.getVoices();
      if (avail && avail.length > 0) {
        setVoices(avail);
        setIsLoadingVoices(false);
      }
    };

    loadVoices();

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const fallbackTimer = setTimeout(() => {
      loadVoices();
      setIsLoadingVoices(false);
    }, 800);

    return () => {
      clearTimeout(fallbackTimer);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Sync selected preset changes with pitch/rate/lang
  const handleSelectPreset = (preset: HumanVoicePreset) => {
    setSelectedPresetId(preset.id);
    setPitch(preset.pitch);
    setRate(preset.rate);
    setAutoDetectEnabled(false);

    if (voices.length > 0) {
      const best = findBestVoiceForPreset(voices, preset.lang, preset.gender);
      if (best) {
        setSelectedVoiceURI(best.voiceURI);
      }
    }

    showNotice(`Selected ${preset.flag} ${preset.name} (${preset.accent})!`);
  };

  // Real-Time Language Auto-Detector Effect
  useEffect(() => {
    if (!text.trim()) return;

    const detected = detectLanguageFromText(text);
    setDetectedLangInfo(detected);

    if (autoDetectEnabled) {
      if (detected.presetId) {
        const foundPreset = HUMAN_VOICE_PRESETS.find(p => p.id === detected.presetId);
        if (foundPreset && foundPreset.id !== selectedPresetId) {
          setSelectedPresetId(foundPreset.id);
          setPitch(foundPreset.pitch);
          setRate(foundPreset.rate);
        }
      }

      if (voices.length > 0) {
        const bestVoice = findBestVoiceForPreset(voices, detected.langCode, 'female');
        if (bestVoice) {
          setSelectedVoiceURI(bestVoice.voiceURI);
        }
      }
    }
  }, [text, voices, autoDetectEnabled]);

  // Active Selected Preset Object
  const activePreset = HUMAN_VOICE_PRESETS.find(p => p.id === selectedPresetId) || HUMAN_VOICE_PRESETS[0];

  // Derived filtered presets
  const filteredPresets = HUMAN_VOICE_PRESETS.filter(p => {
    if (genderFilter !== 'all' && p.gender !== genderFilter) return false;
    if (selectedLang !== 'all') {
      const pLang = p.lang.toLowerCase();
      const sLang = selectedLang.toLowerCase();
      if (!pLang.startsWith(sLang) && !pLang.includes(sLang)) return false;
    }
    return true;
  });

  // Derived filtered browser voices
  const filteredBrowserVoices = voices.filter(voice => {
    if (selectedLang !== 'all') {
      const vLang = voice.lang.toLowerCase();
      const sLang = selectedLang.toLowerCase();
      if (!vLang.startsWith(sLang) && !vLang.includes(sLang)) return false;
    }
    if (genderFilter !== 'all') {
      const g = detectVoiceGender(voice.name);
      if (genderFilter === 'female' && g === 'male') return false;
      if (genderFilter === 'male' && g === 'female') return false;
    }
    return true;
  });

  const availableLanguages: string[] = Array.from(
    new Set([...HUMAN_VOICE_PRESETS.map(p => p.lang), ...voices.map(v => v.lang)])
  ).sort();

  const selectedBrowserVoice = voices.find(v => v.voiceURI === selectedVoiceURI);

  // Play Speech Logic
  const handlePlay = async () => {
    if (audioPlayerRef.current) {
      if (audioPlayerRef.current.paused && isPaused) {
        audioPlayerRef.current.play();
        setIsPaused(false);
        setIsPlaying(true);
        return;
      } else {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    }

    if (window.speechSynthesis && window.speechSynthesis.paused && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (_) {}

    if (!text.trim()) {
      showNotice('Please enter or paste text to play speech.');
      return;
    }

    let cleanText = text.slice(0, MAX_CHARS);
    const detected = detectLanguageFromText(cleanText);

    let activeLang = activePreset.lang;
    let activePitch = pitch;
    let activeRate = rate;
    let matchedVoice: SpeechSynthesisVoice | null = null;

    if (voiceMode === 'presets') {
      activeLang = activePreset.lang;
      activePitch = pitch || activePreset.pitch;
      activeRate = rate || activePreset.rate;
      if (voices.length > 0) {
        matchedVoice = findBestVoiceForPreset(voices, activePreset.lang, activePreset.gender);
      }
    } else {
      if (selectedBrowserVoice) {
        matchedVoice = selectedBrowserVoice;
        activeLang = selectedBrowserVoice.lang;
      } else {
        activeLang = detected.langCode;
      }
    }

    // Check if translation is needed and enabled
    const textLangPrefix = detected.langCode.toLowerCase().split('-')[0];
    const targetLangPrefix = activeLang.toLowerCase().split('-')[0];
    if (autoTranslateEnabled && textLangPrefix !== targetLangPrefix) {
      showNotice(`Auto-translating from ${detected.name} to match selected voice...`);
      const translated = await translateTextToLanguage(cleanText, activeLang);
      cleanText = translated.slice(0, MAX_CHARS);
    }

    if (!('speechSynthesis' in window)) {
      if (cleanText.trim()) {
        playServerAudioFallback(cleanText, activeLang);
      }
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Check if the browser actually has a local voice for this language/accent to prevent silent failures or browser crashes/reloads
    const activeLangPrefix = activeLang.toLowerCase().split('-')[0];
    const hasLocalVoice = voices.some(v => {
      const vLang = v.lang.toLowerCase();
      return vLang === activeLang.toLowerCase() || vLang.startsWith(activeLangPrefix);
    });

    if (!hasLocalVoice) {
      // Seamlessly play using high quality server-side TTS fallback immediately
      playServerAudioFallback(cleanText, activeLang);
      return;
    }

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    } else {
      utterance.lang = activeLang;
    }

    utterance.rate = activeRate;
    utterance.pitch = activePitch;
    utterance.volume = volume;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setIsPreviewing(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentCharIndex(0);
      onAddRecentFile({
        name: `tts_${activePreset.id}_${activeLang.replace(/[^a-z0-9]/gi, '_')}.mp3`,
        size: `${Math.round(cleanText.length / 10)} KB`,
        type: 'audio/speech',
        toolUsed: 'Text to Speech (TTS)',
      });
    };

    utterance.onerror = (e: any) => {
      // Ignore normal cancel/interrupted events
      if (e && (e.error === 'interrupted' || e.error === 'canceled')) {
        return;
      }
      setIsPlaying(false);
      setIsPaused(false);
      // Seamlessly fallback to server audio synthesis if browser synthesis fails
      playServerAudioFallback(cleanText, activeLang);
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        setCurrentCharIndex(event.charIndex);
      }
    };

    utteranceRef.current = utterance;
    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      playServerAudioFallback(cleanText, activeLang);
    }
  };

  const handlePause = () => {
    if (audioPlayerRef.current && !audioPlayerRef.current.paused) {
      audioPlayerRef.current.pause();
      setIsPaused(true);
      setIsPlaying(false);
      return;
    }

    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }

    setIsPlaying(false);
    setIsPaused(false);
    setIsPreviewing(false);
    setCurrentCharIndex(0);
  };

  const handleLivePreview = (preset?: HumanVoicePreset) => {
    const targetPreset = preset || activePreset;
    const sampleText = targetPreset.sampleText;

    if (!('speechSynthesis' in window)) {
      playServerAudioFallback(sampleText, targetPreset.lang);
      return;
    }

    try {
      window.speechSynthesis.cancel();
    } catch (_) {}

    const utterance = new SpeechSynthesisUtterance(sampleText);

    let matchedVoice: SpeechSynthesisVoice | null = null;
    if (voices.length > 0) {
      matchedVoice = findBestVoiceForPreset(voices, targetPreset.lang, targetPreset.gender);
    }

    const activeLangPrefix = targetPreset.lang.toLowerCase().split('-')[0];
    const hasLocalVoice = voices.some(v => {
      const vLang = v.lang.toLowerCase();
      return vLang === targetPreset.lang.toLowerCase() || vLang.startsWith(activeLangPrefix);
    });

    if (!hasLocalVoice) {
      playServerAudioFallback(sampleText, targetPreset.lang);
      return;
    }

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    } else {
      utterance.lang = targetPreset.lang;
    }

    utterance.rate = targetPreset.rate;
    utterance.pitch = targetPreset.pitch;
    utterance.volume = volume;

    utterance.onstart = () => setIsPreviewing(true);
    utterance.onend = () => setIsPreviewing(false);
    utterance.onerror = (e: any) => {
      setIsPreviewing(false);
      if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
      playServerAudioFallback(sampleText, targetPreset.lang);
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      playServerAudioFallback(sampleText, targetPreset.lang);
    }
  };

  // Download Speech Audio (.mp3) File Generator with Genuine Human Voice & Accent
  const handleDownloadAudio = async () => {
    if (!text.trim()) {
      showNotice('Please enter text before downloading audio.');
      return;
    }

    setIsDownloading(true);
    showNotice(`Synthesizing real ${activePreset.accent} human voice MP3 audio...`);

    try {
      let cleanText = text.slice(0, MAX_CHARS);
      let langCode = activePreset.lang;

      if (voiceMode === 'browser' && selectedBrowserVoice) {
        langCode = selectedBrowserVoice.lang;
      }

      const detected = detectLanguageFromText(cleanText);
      const textLangPrefix = detected.langCode.toLowerCase().split('-')[0];
      const targetLangPrefix = langCode.toLowerCase().split('-')[0];
      if (autoTranslateEnabled && textLangPrefix !== targetLangPrefix) {
        showNotice(`Auto-translating text to match target voice language...`);
        const translated = await translateTextToLanguage(cleanText, langCode);
        cleanText = translated.slice(0, MAX_CHARS);
      }

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          lang: langCode,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS server error: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.audioBase64) {
        throw new Error('Failed to generate speech audio stream.');
      }

      const base64Clean = data.audioBase64.replace(/^data:audio\/(mp3|mpeg|wav);base64,/, '');
      const binaryString = atob(base64Clean);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });

      const langTag = langCode.replace(/[^a-z0-9]/gi, '_');
      const filename = `human_voice_${activePreset.id}_${langTag}_${Date.now()}.mp3`;

      const audioUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      setTimeout(() => URL.revokeObjectURL(audioUrl), 5000);

      onAddRecentFile({
        name: filename,
        size: `${(blob.size / 1024).toFixed(1)} KB`,
        type: 'audio/mp3',
        toolUsed: 'Text to Speech (TTS)',
      });

      showNotice(`Human voice audio downloaded successfully as ${filename}!`);
    } catch (err: any) {
      console.error('Audio download error:', err);
      showNotice('Failed to download audio file. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyText = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showNotice('Text copied to clipboard!');
  };

  const handlePasteText = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setText(prev => (prev ? `${prev}\n${clipText}` : clipText).slice(0, MAX_CHARS));
        const detected = detectLanguageFromText(clipText);
        showNotice(`Pasted text! Auto-detected language: ${detected.name}`);
      }
    } catch (err) {
      showNotice('Clipboard paste permission denied by browser.');
    }
  };

  const handleClearText = () => {
    handleStop();
    setText('');
    showNotice('Text area cleared.');
  };

  const showNotice = (msg: string) => {
    setNoticeMsg(msg);
    setTimeout(() => setNoticeMsg(null), 3500);
  };

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedDurationMinutes = Math.ceil(wordCount / (150 * rate));

  if (!speechSupported) {
    return (
      <div className="py-12 px-4 max-w-4xl mx-auto text-center space-y-4">
        <div className="h-16 w-16 bg-rose-100 dark:bg-rose-950/50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Web Speech API Unavailable</h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
          Your browser does not currently support SpeechSynthesis web audio. Please try Chrome, Edge, Safari, or Brave.
        </p>
        <button
          onClick={onBackToTools}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 cursor-pointer"
        >
          Return to Tools
        </button>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToTools}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Back to All Tools"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                Human Voice Text to Speech Workstation
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm">
                Real Human Accents
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Select US Male/Female, UK Male/Female, Indian English Male/Female, Hindi Male/Female, Japanese, Spanish, French, German, Chinese, Korean & Arabic voices with realistic regional accents and MP3 download.
            </p>
          </div>
        </div>

        {/* Action Status Badge */}
        <div className="flex items-center gap-2">
          {noticeMsg && (
            <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold animate-fade-in">
              {noticeMsg}
            </div>
          )}
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
            Voice Studio Engine
          </span>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Multilingual Text Editor Canvas (Col-span-7) */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 shadow-xl space-y-4 relative">
          
          {/* Editor Header Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-zinc-900">
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Multilingual Text Input</span>
              <span className="text-[10px] text-slate-400 font-mono">({wordCount} words)</span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 flex-wrap">
              
              <button
                type="button"
                onClick={() => setAutoDetectEnabled(!autoDetectEnabled)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer border ${
                  autoDetectEnabled 
                    ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                    : 'bg-slate-100 dark:bg-zinc-900 text-slate-500 border-slate-200 dark:border-zinc-800'
                }`}
                title="Toggle real-time automatic language & human voice detection"
              >
                <Globe className={`h-3 w-3 ${autoDetectEnabled ? 'text-purple-600 animate-spin-slow' : 'text-slate-400'}`} />
                Auto-Detect: {autoDetectEnabled ? 'ON' : 'OFF'}
              </button>

              <div className="relative group">
                <button
                  type="button"
                  className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Wand2 className="h-3 w-3 text-purple-500" />
                  Accent Presets
                </button>
                <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl p-1 z-20 hidden group-hover:block animate-fade-in max-h-64 overflow-y-auto">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">Select World Sample</div>
                  {SAMPLE_TEXTS.map((sample, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setText(sample.text);
                        showNotice(`Loaded sample: ${sample.label}`);
                      }}
                      className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-medium text-slate-700 dark:text-zinc-200 rounded-lg truncate cursor-pointer"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCopyText}
                className="px-2 py-1 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                title="Copy text"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-slate-500" />}
                {copied ? 'Copied' : 'Copy'}
              </button>

              <button
                onClick={handlePasteText}
                className="px-2 py-1 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                title="Paste from clipboard"
              >
                Paste
              </button>

              <button
                onClick={handleDownloadAudio}
                disabled={isDownloading || !text.trim()}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                title="Download Audio File (.mp3)"
              >
                {isDownloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                Download Audio (.mp3)
              </button>

              <button
                onClick={() => translateTextToLanguage(text, activePreset.lang)}
                disabled={isTranslating || !text.trim()}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                title={`Translate Text to Match Selected Voice (${activePreset.name})`}
              >
                {isTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                Translate to Voice
              </button>

              <button
                onClick={handleClearText}
                className="px-2 py-1 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                title="Clear text"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* REAL-TIME AUTO DETECTED LANGUAGE & ACCENT BANNER */}
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-blue-950/40 border border-purple-200/80 dark:border-purple-800/60 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-pulse" />
              <div className="text-xs">
                <span className="font-extrabold text-slate-900 dark:text-zinc-100">
                  Detected Language: <span className="text-purple-700 dark:text-purple-300 font-bold">{detectedLangInfo.name}</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 ml-2">
                  (Code: <code className="font-mono bg-white dark:bg-zinc-900 px-1 py-0.5 rounded border border-slate-200 dark:border-zinc-800">{detectedLangInfo.langCode}</code>)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-200 select-none" title="Automatically translate pasted text to the selected voice language when you play or download">
                <input
                  type="checkbox"
                  checked={autoTranslateEnabled}
                  onChange={(e) => setAutoTranslateEnabled(e.target.checked)}
                  className="rounded border-slate-300 dark:border-zinc-700 text-purple-600 focus:ring-purple-500/50 bg-white dark:bg-zinc-900 h-4 w-4 cursor-pointer"
                />
                <span className="flex items-center gap-1">
                  <Languages className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  Auto-Translate to Voice
                </span>
              </label>

              <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5 bg-white/90 dark:bg-zinc-900/90 px-2.5 py-1 rounded-lg border border-purple-300 dark:border-purple-800 shadow-xs">
                <span>{activePreset.flag}</span>
                <span>{activePreset.name}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                  activePreset.gender === 'female' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                }`}>
                  {activePreset.gender}
                </span>
              </span>
            </div>
          </div>

          {/* Text Area Input */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                  setText(e.target.value);
                }
              }}
              placeholder="Paste or type text in Japanese (日本語), Hindi (हिन्दी), US/UK English, Spanish, French, German, Chinese, Korean, Arabic or any world language up to 20,000 characters..."
              rows={12}
              className="w-full p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 text-slate-900 dark:text-zinc-100 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-y font-sans placeholder:text-slate-400"
            />

            {/* Character Limit Ring & Counter Bar */}
            <div className="flex items-center justify-between text-[11px] mt-2 px-1">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                <span>Est. Reading: ~{estimatedDurationMinutes} min</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      charCount > MAX_CHARS * 0.9 ? 'bg-rose-500' : 'bg-purple-600'
                    }`}
                    style={{ width: `${Math.min(100, (charCount / MAX_CHARS) * 100)}%` }}
                  />
                </div>
                <span className={`font-mono font-bold ${
                  charCount > MAX_CHARS * 0.9 ? 'text-rose-500' : 'text-slate-500 dark:text-zinc-400'
                }`}>
                  {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts Hint Bar */}
          <div className="bg-slate-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-slate-200/60 dark:border-zinc-850 text-[11px] text-slate-500 dark:text-zinc-400 flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> Keyboard Shortcuts:
            </span>
            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded shadow-2xs">Ctrl/Cmd+Enter</kbd> Play/Pause</span>
              <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded shadow-2xs">Esc</kbd> Stop</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Voice Studio & Playback Deck (Col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main Playback Control Deck Card */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-purple-500/30 rounded-2xl p-6 text-white shadow-2xl space-y-5 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/20 blur-3xl rounded-full pointer-events-none" />

            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-purple-400 animate-pulse" />
                <h2 className="font-display font-bold text-base">Audio Playback Deck</h2>
              </div>
              <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
                {isPlaying ? 'Speaking...' : isPaused ? 'Paused' : 'Ready'}
              </span>
            </div>

            {/* Speaking Equalizer Animation Waveform */}
            <div className="h-12 bg-black/40 rounded-xl border border-white/10 flex items-center justify-center gap-1 px-4 overflow-hidden">
              {isPlaying ? (
                <div className="flex items-end justify-center gap-1.5 h-8 w-full">
                  {[40, 80, 50, 90, 60, 100, 70, 40, 85, 60, 95, 50, 75, 40, 80].map((h, idx) => (
                    <div
                      key={idx}
                      className="w-1.5 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-full animate-bounce"
                      style={{
                        height: `${h}%`,
                        animationDuration: `${0.4 + (idx % 5) * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              ) : isPaused ? (
                <span className="text-xs font-semibold text-amber-400">Speech paused. Click Play to resume.</span>
              ) : (
                <span className="text-xs text-slate-400">Selected Voice: {activePreset.flag} {activePreset.name} ({activePreset.accent})</span>
              )}
            </div>

            {/* Primary Action Buttons: Play, Download, Stop */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                {isPlaying ? (
                  <button
                    onClick={handlePause}
                    className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 transition-transform active:scale-95"
                  >
                    <Pause className="h-5 w-5 fill-current" />
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={handlePlay}
                    className="flex-1 py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-purple-500/25 transition-transform active:scale-95"
                  >
                    <Play className="h-5 w-5 fill-current" />
                    {isPaused ? 'Resume Speech' : 'Play Speech'}
                  </button>
                )}

                <button
                  onClick={handleStop}
                  disabled={!isPlaying && !isPaused}
                  className="p-3.5 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white font-bold rounded-xl flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                  title="Stop Speech (Esc)"
                >
                  <Square className="h-5 w-5 fill-current text-rose-400" />
                </button>
              </div>

              {/* DOWNLOAD AUDIO BUTTON IN PLAYBACK DECK */}
              <button
                onClick={handleDownloadAudio}
                disabled={isDownloading || !text.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/30 transition-transform active:scale-95 disabled:opacity-50"
              >
                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isDownloading ? 'Generating Audio File...' : `Download Human Voice Audio (.mp3)`}
              </button>
            </div>
          </div>

          {/* Voice Studio Configuration & Accent Presets Card */}
          <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 shadow-xl space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-3">
              <h2 className="font-display font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Human Voice & Regional Accent Studio
              </h2>
            </div>

            {/* Voice Mode Selector Tabs: Human Presets vs Browser Voices */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setVoiceMode('presets')}
                className={`flex-1 py-2 text-xs font-extrabold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  voiceMode === 'presets'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Human Accent Presets ({HUMAN_VOICE_PRESETS.length})
              </button>
              <button
                type="button"
                onClick={() => setVoiceMode('browser')}
                className={`flex-1 py-2 text-xs font-extrabold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  voiceMode === 'browser'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                Browser Engine Voices ({voices.length})
              </button>
            </div>

            {/* Gender Filter Tabs */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Filter Voice Gender
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-zinc-900 rounded-xl">
                {(['all', 'female', 'male'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGenderFilter(g)}
                    className={`py-1.5 text-xs font-extrabold capitalize rounded-lg transition-all cursor-pointer ${
                      genderFilter === g
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    {g === 'all' ? 'All Genders' : `${g.toUpperCase()} Voices`}
                  </button>
                ))}
              </div>
            </div>

            {/* Language / Region Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Filter Language & Region</span>
                <Languages className="h-3.5 w-3.5 text-purple-500" />
              </label>
              <select
                value={selectedLang}
                onChange={(e) => {
                  setSelectedLang(e.target.value);
                  setAutoDetectEnabled(false);
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 text-xs font-semibold outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="all">All Global Regions & Accents</option>
                {availableLanguages.map((langCode) => {
                  const label = LANGUAGE_NAMES[langCode] || `Language (${langCode})`;
                  return (
                    <option key={langCode} value={langCode}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* MODE 1: HUMAN ACCENT PRESETS LIST & DROPDOWN */}
            {voiceMode === 'presets' ? (
              <div className="space-y-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Human Voice & Accent Preset ({filteredPresets.length} available)
                </label>

                {/* Dropdown Selector */}
                <select
                  value={selectedPresetId}
                  onChange={(e) => {
                    const preset = HUMAN_VOICE_PRESETS.find(p => p.id === e.target.value);
                    if (preset) handleSelectPreset(preset);
                  }}
                  className="w-full p-3 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 text-slate-900 dark:text-zinc-100 text-xs font-extrabold outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-xs"
                >
                  {filteredPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.flag} {preset.name} — {preset.accent} [{preset.gender.toUpperCase()}]
                    </option>
                  ))}
                </select>

                {/* Quick Interactive Cards for Presets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {filteredPresets.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-400/50'
                            : 'bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-purple-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 w-full mb-1">
                          <span className="text-xs font-bold flex items-center gap-1 truncate">
                            <span className="text-sm">{preset.flag}</span>
                            <span className="truncate">{preset.name}</span>
                          </span>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : preset.gender === 'female' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {preset.gender}
                          </span>
                        </div>

                        <div className={`text-[10px] truncate ${isSelected ? 'text-purple-100' : 'text-slate-500 dark:text-zinc-400'}`}>
                          {preset.accent}
                        </div>

                        {/* Sample Voice Preview Trigger */}
                        <div className="mt-2 pt-1 border-t border-current/10 flex items-center justify-between">
                          <span className={`text-[9px] font-mono ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                            {preset.lang}
                          </span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLivePreview(preset);
                            }}
                            className={`text-[10px] font-bold flex items-center gap-1 hover:underline ${
                              isSelected ? 'text-white' : 'text-purple-600 dark:text-purple-400'
                            }`}
                          >
                            <Volume2 className="h-3 w-3" /> Sample
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* MODE 2: BROWSER SYSTEM ENGINE VOICES */
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Browser Engine System Voices ({filteredBrowserVoices.length} available)
                </label>

                <select
                  value={selectedVoiceURI}
                  onChange={(e) => {
                    setSelectedVoiceURI(e.target.value);
                    setAutoDetectEnabled(false);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 text-xs font-semibold outline-none focus:border-purple-500 cursor-pointer"
                >
                  {filteredBrowserVoices.length === 0 ? (
                    <option value="">No voices match current filters</option>
                  ) : (
                    filteredBrowserVoices.map((voice) => {
                      const gender = detectVoiceGender(voice.name);
                      const langFriendly = LANGUAGE_NAMES[voice.lang] || voice.lang;
                      return (
                        <option key={voice.voiceURI} value={voice.voiceURI}>
                          {voice.name} — {langFriendly} {gender !== 'neutral' ? `[${gender.toUpperCase()}]` : ''} {voice.default ? '★ Default' : ''}
                        </option>
                      );
                    })
                  )}
                </select>

                <button
                  type="button"
                  onClick={() => handleLivePreview()}
                  disabled={isPreviewing || filteredBrowserVoices.length === 0}
                  className="w-full py-2 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-purple-500/20"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  {isPreviewing ? 'Playing Voice Sample...' : 'Live Voice Preview'}
                </button>
              </div>
            )}

            {/* Speech Rate / Speed Control */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-zinc-900">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-700 dark:text-zinc-300">Speech Speed (Rate)</label>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md">
                  {rate.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <button type="button" onClick={() => setRate(0.75)} className="hover:text-purple-600">0.75x</button>
                <button type="button" onClick={() => setRate(1.0)} className="hover:text-purple-600 font-bold text-slate-600 dark:text-zinc-300">1.0x Normal</button>
                <button type="button" onClick={() => setRate(1.25)} className="hover:text-purple-600">1.25x</button>
                <button type="button" onClick={() => setRate(1.5)} className="hover:text-purple-600">1.5x Fast</button>
              </div>
            </div>

            {/* Pitch Control */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-700 dark:text-zinc-300">Voice Pitch (Gender Resonant Tone)</label>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md">
                  {pitch.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.02"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <button type="button" onClick={() => setPitch(0.86)} className="hover:text-purple-600">0.86 Deep Male</button>
                <button type="button" onClick={() => setPitch(1.0)} className="hover:text-purple-600 font-bold text-slate-600 dark:text-zinc-300">1.0 Neutral</button>
                <button type="button" onClick={() => setPitch(1.12)} className="hover:text-purple-600">1.12 Bright Female</button>
              </div>
            </div>

            {/* Volume Control */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-700 dark:text-zinc-300">Audio Volume</label>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
