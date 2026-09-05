/**
 * 29 Supported Languages Configuration for PDF Toolkit Pro & Online PDF Editor:
 * 1. العربية (Arabic - ar) - RTL
 * 2. Bahasa Indonesia (Indonesian - id)
 * 3. Deutsch (German - de)
 * 4. Dansk (Danish - da)
 * 5. Český (Czech - cs)
 * 6. English (English - en)
 * 7. Español (Spanish - es)
 * 8. Ελληνικά (Greek - el)
 * 9. Français (French - fr)
 * 10. Italiano (Italian - it)
 * 11. 日本語 (Japanese - ja)
 * 12. 한국어 (Korean - ko)
 * 13. 简体中文 (Simplified Chinese - zh-CN)
 * 14. 繁體中文 (Traditional Chinese - zh-TW)
 * 15. हिन्दी (Hindi - hi)
 * 16. עברית (Hebrew - he) - RTL
 * 17. Magyar (Hungarian - hu)
 * 18. Nederlands (Dutch - nl)
 * 19. Norsk (Norwegian - no)
 * 20. Polski (Polish - pl)
 * 21. Português (Portuguese - pt)
 * 22. Română (Romanian - ro)
 * 23. Русский (Russian - ru)
 * 24. Suomi (Finnish - fi)
 * 25. Svenska (Swedish - sv)
 * 26. ภาษาไทย (Thai - th)
 * 27. Tiếng Việt (Vietnamese - vi)
 * 28. Türkçe (Turkish - tr)
 * 29. Українська (Ukrainian - uk)
 */

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  isRtl?: boolean;
  script: 'latin' | 'arabic' | 'hebrew' | 'devanagari' | 'cjk-sc' | 'cjk-tc' | 'cjk-jp' | 'cjk-kr' | 'thai' | 'cyrillic' | 'greek' | 'vietnamese' | 'latin_extended';
  fontFamily: string;
  tesseractCode: string;
  quickChars?: string[];
  placeholderSample: string;
}

export const SUPPORTED_LANGUAGES_LIST: SupportedLanguage[] = [
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    dir: 'rtl',
    isRtl: true,
    script: 'arabic',
    fontFamily: '"Noto Sans Arabic", "Cairo", "Amiri", "Segoe UI", Arial, sans-serif',
    tesseractCode: 'ara',
    quickChars: ['،', '؟', '؛', 'ء', 'آ', 'أ', 'ؤ', 'إ', 'ئ', 'ا', 'ب', 'ة', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ى', 'ي', 'ً', 'ٌ', 'ٍ', 'َ', 'ُ', 'ِ', 'ّ', 'ْ'],
    placeholderSample: 'مرحباً بك في محرر PDF الاحترافي'
  },
  {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    flag: '🇮🇩',
    dir: 'ltr',
    script: 'latin',
    fontFamily: 'Helvetica, Arial, sans-serif',
    tesseractCode: 'ind',
    quickChars: ['Rp', '–', '—', '"', '"', '…'],
    placeholderSample: 'Edit teks PDF secara mudah dan cepat'
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    dir: 'ltr',
    script: 'latin',
    fontFamily: 'Helvetica, Arial, sans-serif',
    tesseractCode: 'deu',
    quickChars: ['ä', 'ö', 'ü', 'Ä', 'Ö', 'Ü', 'ß', '€', '„', '“', '»', '«'],
    placeholderSample: 'PDF-Dokumente professionell bearbeiten'
  },
  {
    code: 'da',
    name: 'Danish',
    nativeName: 'Dansk',
    flag: '🇩🇰',
    dir: 'ltr',
    script: 'latin',
    fontFamily: 'Helvetica, Arial, sans-serif',
    tesseractCode: 'dan',
    quickChars: ['æ', 'ø', 'å', 'Æ', 'Ø', 'Å', '€', '»', '«'],
    placeholderSample: 'Rediger og tilpas dine PDF-filer nemt'
  },
  {
    code: 'cs',
    name: 'Czech',
    nativeName: 'Český',
    flag: '🇨🇿',
    dir: 'ltr',
    script: 'latin',
    fontFamily: 'Helvetica, Arial, sans-serif',
    tesseractCode: 'ces',
    quickChars: ['č', 'ď', 'ě', 'ň', 'ř', 'š', 'ť', 'ž', 'á', 'é', 'í', 'ó', 'ú', 'ů', 'ý', 'Č', 'Ď', 'Ň', 'Ř', 'Š', 'Ť', 'Ž', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Ů', 'Ý'],
    placeholderSample: 'Upravujte své PDF dokumenty online'
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    dir: 'ltr',
    script: 'latin',
    fontFamily: 'Helvetica, Arial, sans-serif',
    tesseractCode: 'eng',
    quickChars: ['$', '€', '£', '¥', '—', '“', '”', '’', '•', '©', '®', '™'],
    placeholderSample: 'Edit PDF text and annotations with precision'
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    dir: 'ltr',
    script: 'latin',
    fontFamily: 'Helvetica, Arial, sans-serif',
    tesseractCode: 'spa',
    quickChars: ['ñ', 'Ñ', 'á', 'é', 'í', 'ó', 'ú', 'ü', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Ü', '¿', '¡', '€'],
    placeholderSample: 'Edita tus documentos PDF con total libertad'
  },
  {
    code: 'el',
    name: 'Greek',
    nativeName: 'Ελληνικά',
    flag: '🇬🇷',
    dir: 'ltr',
    script: 'greek',
    fontFamily: '"FreeSans", "Noto Sans", Arial, sans-serif',
    tesseractCode: 'ell',
    quickChars: ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'ς', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω', 'ά', 'έ', 'ή', 'ί', 'ό', 'ύ', 'ώ', '€'],
    placeholderSample: 'Επεξεργαστείτε τα έγγραφα PDF σας εύκολα'
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    dir: 'ltr',
    script: 'latin',
    fontFamily: 'Helvetica, Arial, sans-serif',
    tesseractCode: 'fra',
    quickChars: ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'ù', 'û', 'ü', 'œ', 'æ', 'É', 'È', 'Ê', 'À', 'Â', 'Ç', 'Î', 'Ï', 'Ô', 'Ù', 'Û', 'Ü', 'Œ', 'Æ', '€', '«', '»'],
    placeholderSample: 'Éditez vos documents PDF en toute simplicité'
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    dir: 'ltr',
    script: 'latin',
    fontFamily: 'Helvetica, Arial, sans-serif',
    tesseractCode: 'ita',
    quickChars: ['à', 'è', 'é', 'ì', 'ò', 'ù', 'À', 'È', 'É', 'Ì', 'Ò', 'Ù', '€', '«', '»'],
    placeholderSample: 'Modifica i tuoi file PDF online'
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    dir: 'ltr',
    script: 'cjk-jp',
    fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif',
    tesseractCode: 'jpn',
    quickChars: ['、', '。', '「', '」', '・', '〜', '¥', 'あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と', 'な', 'に', 'ぬ', 'ね', 'の', 'は', 'ひ', 'ふ', 'へ', 'ほ', 'ま', 'み', 'む', 'め', 'も', 'や', 'ゆ', 'よ', 'ら', 'り', 'る', 'れ', 'ろ', 'わ', 'を', 'ん'],
    placeholderSample: 'PDFのテキストを簡単かつ綺麗に編集'
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷',
    dir: 'ltr',
    script: 'cjk-kr',
    fontFamily: '"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
    tesseractCode: 'kor',
    quickChars: ['₩', '·', '…', '「', '」', '『', '』', 'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ', 'ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ'],
    placeholderSample: 'PDF 문서를 손쉽게 편집하세요'
  },
  {
    code: 'zh-CN',
    name: 'Simplified Chinese',
    nativeName: '简体中文',
    flag: '🇨🇳',
    dir: 'ltr',
    script: 'cjk-sc',
    fontFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    tesseractCode: 'chi_sim',
    quickChars: ['，', '。', '！', '？', '：', '；', '“', '”', '‘', '’', '【', '】', '《', '》', '（', '）', '、', '¥', '—', '…'],
    placeholderSample: '在线精确编辑 PDF 文本和排版'
  },
  {
    code: 'zh-TW',
    name: 'Traditional Chinese',
    nativeName: '繁體中文',
    flag: '🇹🇼',
    dir: 'ltr',
    script: 'cjk-tc',
    fontFamily: '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
    tesseractCode: 'chi_tra',
    quickChars: ['，', '。', '！', '？', '：', '；', '「', '」', '『', '』', '【', '】', '《', '》', '（', '）', '、', 'NT$', '—', '…'],
    placeholderSample: '快速編輯 PDF 文件內容'
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    dir: 'ltr',
    script: 'devanagari',
    fontFamily: '"Noto Sans Devanagari", "Mangal", "Arial Unicode MS", sans-serif',
    tesseractCode: 'hin',
    quickChars: ['₹', '।', '॥', 'अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ', 'क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज', 'झ', 'ञ', 'ट', 'ठ', 'ड', 'ढ', 'ण', 'त', 'थ', 'द', 'ध', 'न', 'प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'श', 'ष', 'स', 'ह', '़', 'ा', 'ि', 'ी', 'ु', 'ू', 'ृ', 'े', 'ै', 'ो', 'ौ', 'ं', 'ः', '्'],
    placeholderSample: 'पीडीएफ टेक्स्ट को आसानी से संपादित करें (हिन्दी समर्थन)'
  },
  {
    code: 'he',
    name: 'Hebrew',
    nativeName: 'עברית',
    flag: '🇮🇱',
    dir: 'rtl',
    isRtl: true,
    script: 'hebrew',
    fontFamily: '"Noto Sans Hebrew", "Arial", sans-serif',
    tesseractCode: 'heb',
    quickChars: ['₪', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ך', 'ל', 'מ', 'ם', 'נ', 'ן', 'ס', 'ע', 'פ', 'ף', 'צ', 'ץ', 'ק', 'ר', 'ש', 'ת', '״', '׳'],
    placeholderSample: 'ערוך מסמכי PDF בעברית בקלות ובמהירות'
  },
  {
    code: 'hu',
    name: 'Hungarian',
    nativeName: 'Magyar',
    flag: '🇭🇺',
    dir: 'ltr',
    script: 'latin',
    fontFamily: 'Helvetica, Arial, sans-serif',
    tesseractCode: 'hun',
    quickChars: ['á', 'é', 'í', 'ó', 'ö', 'ő', 'ú', 'ü', 'ű', 'Á', 'É', 'Í', 'Ó', 'Ö', 'Ő', 'Ú', 'Ü', 'Ű', '€', 'Ft'],
    placeholderSample: 'Szerkessze PDF-dokumentumait könnyedén'
  },
  {
    code: 'nl',
    name: 'Dutch',
    nativeName: 'Nederlands',
    flag: '🇳🇱',
    dir: 'ltr',
    script: 'latin',
    fontFamily: 'Helvetica, Arial, sans-serif',
    tesseractCode: 'nld',
    quickChars: ['ë', 'ï', 'é', 'è', 'ĳ', 'ĳ', '€', '„', '”'],
    placeholderSample: 'Bewerk eenvoudig en snel PDF-bestanden'
  },
  {
    code: 'no',
    name: 'Norwegian',
    nativeName: 'Norsk',
    flag: '🇳🇴',
    dir: 'ltr',
    script: 'latin',
    fontFamily: 'Helvetica, Arial, sans-serif',
    tesseractCode: 'nor',
    quickChars: ['æ', 'ø', 'å', 'Æ', 'Ø', 'Å', 'kr', '«', '»'],
    placeholderSample: 'Rediger dine PDF-dokumenter enkelt på nett'
  },
  {
    code: 'pl',
    name: 'Polish',
    nativeName: 'Polski',
    flag: '🇵🇱',
    dir: 'ltr',
    script: 'latin',
    fontFamily: 'Helvetica, Arial, sans-serif',
    tesseractCode: 'pol',
    quickChars: ['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż', 'Ą', 'Ć', 'Ę', 'Ł', 'Ń', 'Ó', 'Ś', 'Ź', 'Ż', 'zł', '„', '”'],
    placeholderSample: 'Edytuj dokumenty PDF z pełną dokładnością'
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇵🇹',
    dir: 'ltr',
    script: 'latin',
    fontFamily: 'Helvetica, Arial, sans-serif',
    tesseractCode: 'por',
    quickChars: ['ã', 'õ', 'á', 'é', 'í', 'ó', 'ú', 'â', 'ê', 'ô', 'ç', 'Ã', 'Õ', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Â', 'Ê', 'Ô', 'Ç', '€', 'R$', '«', '»'],
    placeholderSample: 'Edite seus documentos PDF com rapidez e qualidade'
  },
  {
    code: 'ro',
    name: 'Romanian',
    nativeName: 'Română',
    flag: '🇷🇴',
    dir: 'ltr',
    script: 'latin',
    fontFamily: 'Helvetica, Arial, sans-serif',
    tesseractCode: 'ron',
    quickChars: ['ă', 'â', 'î', 'ș', 'ț', 'Ă', 'Â', 'Î', 'Ș', 'Ț', 'lei', '„', '”', '«', '»'],
    placeholderSample: 'Editează documentele PDF online cu ușurință'
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
    dir: 'ltr',
    script: 'cyrillic',
    fontFamily: '"FreeSans", "Noto Sans", Arial, sans-serif',
    tesseractCode: 'rus',
    quickChars: ['а', 'б', 'в', 'г', 'д', 'е', 'ё', 'ж', 'з', 'и', 'й', 'к', 'л', 'м', 'н', 'о', 'п', 'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ъ', 'ы', 'ь', 'э', 'ю', 'я', 'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'Й', 'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь', 'Э', 'Ю', 'Я', '₽', '«', '»'],
    placeholderSample: 'Профессиональное редактирование текста в PDF'
  },
  {
    code: 'fi',
    name: 'Finnish',
    nativeName: 'Suomi',
    flag: '🇫🇮',
    dir: 'ltr',
    script: 'latin',
    fontFamily: 'Helvetica, Arial, sans-serif',
    tesseractCode: 'fin',
    quickChars: ['ä', 'ö', 'å', 'Ä', 'Ö', 'Å', '€', '”'],
    placeholderSample: 'Muokkaa PDF-asiakirjoja vaivattomasti verkossa'
  },
  {
    code: 'sv',
    name: 'Swedish',
    nativeName: 'Svenska',
    flag: '🇸🇪',
    dir: 'ltr',
    script: 'latin',
    fontFamily: 'Helvetica, Arial, sans-serif',
    tesseractCode: 'swe',
    quickChars: ['å', 'ä', 'ö', 'Å', 'Ä', 'Ö', 'kr', '”', '’'],
    placeholderSample: 'Redigera dina PDF-dokument snabbt och enkelt'
  },
  {
    code: 'th',
    name: 'Thai',
    nativeName: 'ภาษาไทย',
    flag: '🇹🇭',
    dir: 'ltr',
    script: 'thai',
    fontFamily: '"Noto Sans Thai", "Sarabun", "Tahoma", sans-serif',
    tesseractCode: 'tha',
    quickChars: ['฿', 'ก', 'ข', 'ฃ', 'ค', 'ฅ', 'ฆ', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ', 'ท', 'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม', 'ย', 'ร', 'ฤ', 'ล', 'ฦ', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ', 'ฯ', 'ะ', 'ั', 'า', 'ำ', 'ิ', 'ี', 'ึ', 'ื', 'ุ', 'ู', 'ฺ', '฿', 'เ', 'แ', 'โ', 'ใ', 'ไ', 'ๅ', 'ๆ', '็', '่', '้', '๊', '๋', '์'],
    placeholderSample: 'แก้ไขข้อความและจัดหน้า PDF ภาษาไทยได้อย่างแม่นยำ'
  },
  {
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    flag: '🇻🇳',
    dir: 'ltr',
    script: 'vietnamese',
    fontFamily: '"Noto Sans", "Roboto", "Segoe UI", Arial, sans-serif',
    tesseractCode: 'vie',
    quickChars: ['₫', 'à', 'á', 'ả', 'ã', 'ạ', 'ă', 'ằ', 'ắ', 'ẳ', 'ẵ', 'ặ', 'â', 'ầ', 'ấ', 'ẩ', 'ẫ', 'ậ', 'đ', 'è', 'é', 'ẻ', 'ẽ', 'ẹ', 'ê', 'ề', 'ế', 'ể', 'ễ', 'ệ', 'ì', 'í', 'ỉ', 'ĩ', 'ị', 'ò', 'ó', 'ỏ', 'õ', 'ọ', 'ô', 'ồ', 'ố', 'ổ', 'ỗ', 'ộ', 'ơ', 'ờ', 'ớ', 'ở', 'ỡ', 'ợ', 'ù', 'ú', 'ủ', 'ũ', 'ụ', 'ư', 'ừ', 'ứ', 'ử', 'ữ', 'ự', 'ỳ', 'ý', 'ỷ', 'ỹ', 'ỵ', 'Đ'],
    placeholderSample: 'Chỉnh sửa tài liệu PDF tiếng Việt chuẩn xác'
  },
  {
    code: 'tr',
    name: 'Turkish',
    nativeName: 'Türkçe',
    flag: '🇹🇷',
    dir: 'ltr',
    script: 'latin',
    fontFamily: 'Helvetica, Arial, sans-serif',
    tesseractCode: 'tur',
    quickChars: ['ç', 'ğ', 'ı', 'İ', 'ö', 'ş', 'ü', 'Ç', 'Ğ', 'I', 'Ö', 'Ş', 'Ü', '₺', '“', '”'],
    placeholderSample: 'PDF belgelerinizi çevrimiçi olarak kolayca düzenleyin'
  },
  {
    code: 'uk',
    name: 'Ukrainian',
    nativeName: 'Українська',
    flag: '🇺🇦',
    dir: 'ltr',
    script: 'cyrillic',
    fontFamily: '"FreeSans", "Noto Sans", Arial, sans-serif',
    tesseractCode: 'ukr',
    quickChars: ['а', 'б', 'в', 'г', 'ґ', 'д', 'е', 'є', 'ж', 'з', 'и', 'і', 'ї', 'й', 'к', 'л', 'м', 'н', 'о', 'п', 'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ь', 'ю', 'я', 'А', 'Б', 'В', 'Г', 'Ґ', 'Д', 'Е', 'Є', 'Ж', 'З', 'И', 'І', 'Ї', 'Й', 'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ь', 'Ю', 'Я', '₴', '«', '»'],
    placeholderSample: 'Редагуйте текст та анотації в PDF онлайн'
  }
];

/**
 * Detect script type and RTL direction based on text input
 */
export function detectScriptAndDirection(text: string): {
  isRtl: boolean;
  script: SupportedLanguage['script'];
  languageCode: string;
} {
  if (!text) return { isRtl: false, script: 'latin', languageCode: 'en' };

  // Arabic characters range
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) {
    return { isRtl: true, script: 'arabic', languageCode: 'ar' };
  }

  // Hebrew characters range
  if (/[\u0590-\u05FF\uFB1D-\uFB4F]/.test(text)) {
    return { isRtl: true, script: 'hebrew', languageCode: 'he' };
  }

  // Devanagari (Hindi)
  if (/[\u0900-\u097F\uA8E0-\uA8FF]/.test(text) || text.includes('₹')) {
    return { isRtl: false, script: 'devanagari', languageCode: 'hi' };
  }

  // Thai
  if (/[\u0E00-\u0E7F]/.test(text)) {
    return { isRtl: false, script: 'thai', languageCode: 'th' };
  }

  // Korean Hangul
  if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text)) {
    return { isRtl: false, script: 'cjk-kr', languageCode: 'ko' };
  }

  // Japanese (Hiragana / Katakana)
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
    return { isRtl: false, script: 'cjk-jp', languageCode: 'ja' };
  }

  // Chinese (CJK Ideographs)
  if (/[\u4E00-\u9FFF\u3400-\u4DBF]/.test(text)) {
    return { isRtl: false, script: 'cjk-sc', languageCode: 'zh-CN' };
  }

  // Cyrillic (Russian, Ukrainian)
  if (/[\u0400-\u04FF\u0500-\u052F]/.test(text)) {
    if (/[єіїґЄІЇҐ]/.test(text)) {
      return { isRtl: false, script: 'cyrillic', languageCode: 'uk' };
    }
    return { isRtl: false, script: 'cyrillic', languageCode: 'ru' };
  }

  // Greek
  if (/[\u0370-\u03FF\u1F00-\u1FFF]/.test(text)) {
    return { isRtl: false, script: 'greek', languageCode: 'el' };
  }

  // Vietnamese specific characters
  if (/[\u1EA0-\u1EF9\u0102\u0103\u0110\u0111\u0168\u0169\u01A0\u01A1\u01AF\u01B0]/.test(text)) {
    return { isRtl: false, script: 'vietnamese', languageCode: 'vi' };
  }

  return { isRtl: false, script: 'latin', languageCode: 'en' };
}
