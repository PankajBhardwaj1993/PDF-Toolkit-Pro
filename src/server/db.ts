import { BlogPost, Plan, SupportTicket, User, RecentFile } from '../types';

// Simple in-memory/JSON state manager for the Express server
export class Database {
  isDonationDisabled: boolean = false;

  users: User[] = [
    {
      id: 'usr_admin',
      email: 'admin@pdftoolkitpro.online',
      username: 'System Admin',
      role: 'admin',
      subscription: 'enterprise',
      createdAt: '2026-01-15T10:00:00Z',
    },
    {
      id: 'usr_premium',
      email: 'premium@example.com',
      username: 'Sarah Connor',
      role: 'user',
      subscription: 'pro',
      createdAt: '2026-03-10T14:30:00Z',
    },
    {
      id: 'usr_free',
      email: 'free@example.com',
      username: 'John Doe',
      role: 'user',
      subscription: 'free',
      createdAt: '2026-06-01T09:15:00Z',
    }
  ];

  recentFiles: RecentFile[] = [
    {
      id: 'f_001',
      name: 'annual_report_draft.pdf',
      size: '2.4 MB',
      type: 'application/pdf',
      toolUsed: 'Merge PDF',
      date: '2026-07-06T18:45:00Z',
      status: 'completed',
    },
    {
      id: 'f_002',
      name: 'invoice_receipt.jpg',
      size: '850 KB',
      type: 'image/jpeg',
      toolUsed: 'JPG to PDF',
      date: '2026-07-06T15:20:00Z',
      status: 'completed',
    },
    {
      id: 'f_003',
      name: 'lecture_notes.pdf',
      size: '12.1 MB',
      type: 'application/pdf',
      toolUsed: 'AI Document Summarizer',
      date: '2026-07-05T11:05:00Z',
      status: 'completed',
    }
  ];

  supportTickets: SupportTicket[] = [
    {
      id: 't_001',
      subject: 'Unable to process OCR on scanned Arabic text',
      message: 'I uploaded an Arabic document and the OCR tool produced gibberish. Does this support Arabic?',
      status: 'pending',
      category: 'AI Tools',
      date: '2026-07-05T08:00:00Z',
      replies: [
        {
          sender: 'user',
          message: 'I uploaded an Arabic document and the OCR tool produced gibberish. Does this support Arabic?',
          date: '2026-07-05T08:00:00Z',
        },
        {
          sender: 'support',
          message: 'Hi! Currently our OCR utilizes Gemini models which support multiple languages including Arabic. Could you please check the quality of your scan or select Arabic from the options? We are reviewing this for you.',
          date: '2026-07-05T12:00:00Z',
        }
      ]
    },
    {
      id: 't_002',
      subject: 'Stripe Payment Issue - Invoice request',
      message: 'My card was charged for the Pro annual plan but I have not received the PDF invoice.',
      status: 'resolved',
      category: 'Billing',
      date: '2026-07-04T10:15:00Z',
      replies: [
        {
          sender: 'user',
          message: 'My card was charged for the Pro annual plan but I have not received the PDF invoice.',
          date: '2026-07-04T10:15:00Z',
        },
        {
          sender: 'support',
          message: 'Hello! I have generated your tax invoice #INV-2026-9482. You can download it directly from your billing tab now. Let us know if you need anything else.',
          date: '2026-07-04T14:00:00Z',
        }
      ]
    }
  ];

  blogPosts: BlogPost[] = [
    {
      id: 'b_001',
      title: 'How AI & OCR are Revolutionizing Free Business Document Workspaces',
      excerpt: 'Learn how optical character recognition and AI models are transforming physical paperwork into structured, editable databases securely in seconds.',
      content: `Optical Character Recognition (OCR) has advanced immensely from legacy matrix-matching engines. Today, utilizing deep neural networks and advanced AI vision models on platforms like **[PDF Toolkit Pro](/)**, you can translate images into live editable content instantly.

Our custom **[Online PDF Editor](/tools/online_pdf_editor)** leverages state-of-the-art AI parsing to let you upload scanned templates and annotate, erase, or type dynamic content on top of your static forms without installing external programs.

### Why You Should Move to an AI Document Workspace:
1. **Zero Transcription Error:** Hand-typed spreadsheet entries are prone to human mistakes. Instead, use our highly accurate **[PDF to Excel Converter](/tools/pdf_to_excel)** to mine tabular information directly from financial scans with zero friction.
2. **Seamless Text Conversion:** Convert scanned image pages into perfect text blocks in seconds using our professional **[PDF to Word Converter](/tools/pdf_to_word)**, so you can edit document drafts quickly.
3. **Advanced Content Polishing:** Once you extract your text, run it through our **[AI Grammar & Polish](/tools/ai_grammar)** engine to fix syntactic mistakes, correct spelling errors, and automatically align the text to a professional corporate tone.
4. **Natural Audio Production:** Need to audit your text hand-free or produce professional voiceovers? Paste your polished paragraphs directly into our browser-native **[Text to Speech (TTS)](/tools/text_to_speech)** tool to export crystal-clear audio files instantly.

By combining browser-native operations with top-tier AI enhancements on **[pdftoolkitpro.online](/)**, your critical company documents stay 100% private while processing at extreme server speeds.`,
      category: 'AI Technology',
      author: 'Dr. Michael Chen',
      date: '2026-06-28',
      readTime: '5 min read',
      image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500&auto=format&fit=crop&q=60',
    },
    {
      id: 'b_002',
      title: 'Step-by-Step Guide: How to Electronically Sign and Protect PDF Files Safely',
      excerpt: 'Understand compliance guidelines (eIDAS & ESIGN Act) and learn how to lock your files with AES-256 password protection.',
      content: `In modern digital operations, signing contracts, invoices, and legal non-disclosure agreements safely online is absolutely critical. But digital security goes far beyond simply pasting a flat signature image onto a document canvas.

To make sure your files are legally compliant and secure, you must follow best practices for encryption and e-signatures. On **[PDF Toolkit Pro](/)**, we provide standard tools that ensure 100% safe, fast, and secure local file processing.

### Best Practices for Document Integrity:
- **Draw Clean Overlays:** Use our free **[Draw Transparent Signature](/tools/draw_signature)** tool to draft or type your custom signature on a clean, pixel-perfect transparent canvas, then export it as a high-resolution PNG file to reuse across any corporate document.
- **Direct E-Signing:** Upload contracts directly to our **[Sign PDF Document](/tools/sign_pdf)** workstation to easily scale, move, and position signature overlays onto any target page. This tool completely flattens the file, preventing downstream tampering.
- **Apply Strong AES-256 Encryption:** After signing, ensure unauthorized parties cannot open or modify your file. Utilize our **[Protect PDF](/tools/protect_pdf)** tool to encrypt your files with high-strength cryptographic keys and restrict reading or printing rights.
- **Unlock Security Safely:** Received a secured archive that you are authorized to edit? Decrypt and remove those passwords quickly using our **[Unlock PDF](/tools/unlock_pdf)** utility to enable instant printing, copying, and text edits.
- **Watermark Your Intellectual Property:** Before sharing sensitive drafts, stamp transparent, persistent labels like "CONFIDENTIAL", "DRAFT", or your company name on headers or footers with our custom **[Add Watermark](/tools/watermark)** tool.

All of these features run in your client browser, meaning your secret passwords and personal signature graphics never get uploaded to external cloud storage databases.`,
      category: 'Legal & Security',
      author: 'Elena Rostova',
      date: '2026-07-02',
      readTime: '4 min read',
      image: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=500&auto=format&fit=crop&q=60',
    },
    {
      id: 'b_003',
      title: 'Ultimate PDF Optimization Guide: How to Merge, Split, and Compress PDF Online',
      excerpt: 'Dramatically reduce document size and clean up page hierarchies without losing graphics quality using our premium browser utilities.',
      content: `Managing a chaotic set of reports, spreadsheets, and scanned receipts can quickly slow down business efficiency. Huge document archives are hard to email, store, or share with external clients. 

To boost productivity and maintain a highly organized file library, learn to optimize your PDF hierarchy on **[PDF Toolkit Pro](/)** using these simple browser-native utilities.

### Step-by-Step Optimization Process:

#### Step 1: Combine Diverse Assets
Instead of emailing a dozen separate documents, combine them into one structured PDF file. Our fast **[Merge PDF](/tools/merge_pdf)** workspace lets you combine multiple PDF archives, spreadsheets, and Word documents in any order inside your browser in a single click. You can also turn any set of pictures into a clean multi-page document using our **[Image to PDF Converter](/tools/image_to_pdf)**.

#### Step 2: Extract Relevant Pages
Don't send a 200-page file when the client only needs to review pages 5 to 10. Use **[Split PDF](/tools/split_pdf)** to split documents, or leverage **[Extract PDF Pages](/tools/extract_pdf)** to pull specific high-resolution pages out into a lightweight new file. If you have unnecessary pages, easily remove them in seconds with our **[Delete PDF Pages](/tools/delete_pdf)** utility.

#### Step 3: Shrink the Footprint
Reduce massive files to a fraction of their size before emailing. Run your merged file through our browser-native **[Compress PDF](/tools/compress_pdf)** optimizer. It intelligently scales down heavy vector layouts and compresses images so you can easily attach your documents to emails while keeping excellent, high-fidelity resolution.

Optimizing files on **[pdftoolkitpro.online](/)** is entirely free, carries no watermarks, requires no signups, and provides maximum performance with full local security. Try our comprehensive workspace tools today!`,
      category: 'Tutorials',
      author: 'Marcus Aurel',
      date: '2026-07-04',
      readTime: '6 min read',
      image: 'https://images.unsplash.com/photo-1542435503-956c469947f6?w=500&auto=format&fit=crop&q=60',
    }
  ];

  plans: Plan[] = [
    {
      id: 'p_free',
      name: 'Basic Suite',
      price: '$0',
      period: 'month',
      features: [
        'Access to 25+ PDF, Image, and Text tools',
        'Max 5 file conversions per day',
        'Up to 10MB per file upload limit',
        'Standard processing speeds',
        'Ad-supported experience',
      ],
      color: 'border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-slate-100',
    },
    {
      id: 'p_pro',
      name: 'Pro Member',
      price: '$9',
      period: 'month',
      features: [
        'Unrestricted, unlimited conversions',
        'Generous 2GB file upload size limits',
        'Gemini AI suite (OCR, Summarizer, Translation)',
        'Sign, password protect, and secure PDFs',
        'Ad-free workspace with ultra-fast servers',
        'Priority 24/7 Email and chat support',
      ],
      popular: true,
      color: 'border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/30',
    },
    {
      id: 'p_enterprise',
      name: 'Enterprise API',
      price: '$49',
      period: 'month',
      features: [
        'All Pro Member benefits included',
        'Full REST API access with custom API keys',
        'Team management dashboard (up to 20 seats)',
        'Custom watermark and brand integrations',
        '99.9% uptime SLA and dedicated account managers',
        'Custom billing and invoicing terms',
      ],
      color: 'border-purple-500 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/20',
    }
  ];

  analytics = {
    totalFilesProcessed: 28,
    activeUsers: 3,
    premiumSubscribers: 2,
    monthlyRevenue: 58,
    platformUptime: '99.98%',
    toolStats: [
      { name: 'Merge PDF', count: 5 },
      { name: 'Split PDF', count: 2 },
      { name: 'Rotate PDF', count: 3 },
      { name: 'Delete PDF Pages', count: 0 },
      { name: 'Extract PDF Pages', count: 1 },
      { name: 'Add Page Numbers', count: 0 },
      { name: 'Add Watermark', count: 2 },
      { name: 'Protect PDF', count: 1 },
      { name: 'Compress PDF', count: 4 },
      { name: 'Sign PDF', count: 1 },
      { name: 'Draw Signature', count: 2 },
      { name: 'Image Utilities', count: 0 },
      { name: 'AI Document OCR', count: 3 },
      { name: 'AI Summarizer', count: 4 },
      { name: 'AI Table Extractor', count: 1 },
      { name: 'Online PDF Editor', count: 2 }
    ],
    userGrowth: [
      { month: 'Jan', users: 1200 },
      { month: 'Feb', users: 1900 },
      { month: 'Mar', users: 2800 },
      { month: 'Apr', users: 4100 },
      { month: 'May', users: 5900 },
      { month: 'Jun', users: 8421 },
    ],
    revenueGrowth: [
      { month: 'Jan', rev: 450 },
      { month: 'Feb', rev: 900 },
      { month: 'Mar', rev: 1400 },
      { month: 'Apr', rev: 1950 },
      { month: 'May', rev: 2500 },
      { month: 'Jun', rev: 3078 },
    ]
  };

  addFile(file: RecentFile) {
    this.recentFiles.unshift(file);
    if (this.recentFiles.length > 20) {
      this.recentFiles.pop();
    }
    this.analytics.totalFilesProcessed += 1;
    
    // Dynamically increment the count for toolUsed
    const toolName = file.toolUsed || 'Unknown Tool';
    const existing = this.analytics.toolStats.find(t => t.name.toLowerCase() === toolName.toLowerCase());
    if (existing) {
      existing.count += 1;
    } else {
      this.analytics.toolStats.push({ name: toolName, count: 1 });
    }
  }

  addTicket(ticket: SupportTicket) {
    this.supportTickets.unshift(ticket);
  }

  addTicketReply(ticketId: string, reply: { sender: 'user' | 'support'; message: string; date: string }) {
    const ticket = this.supportTickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.replies.push(reply);
      ticket.status = reply.sender === 'user' ? 'pending' : 'resolved';
    }
  }

  addBlog(blog: BlogPost) {
    this.blogPosts.unshift(blog);
  }

  deleteBlog(blogId: string) {
    this.blogPosts = this.blogPosts.filter(b => b.id !== blogId);
  }
}

export const db = new Database();
