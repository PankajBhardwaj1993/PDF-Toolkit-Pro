export type ToolCategory = 'pdf' | 'office' | 'image' | 'text' | 'signature' | 'ai' | 'utilities';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string; // lucide icon name
  popular?: boolean;
  slug?: string;
  hidden?: boolean;
  adminOnly?: boolean;
  disabled?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  subscription: 'free' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface RecentFile {
  id: string;
  name: string;
  size: string;
  type: string;
  toolUsed: string;
  date: string;
  status: 'completed' | 'processing' | 'failed';
  downloadUrl?: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'pending' | 'resolved';
  category: string;
  date: string;
  userEmail?: string;
  replies: Array<{
    sender: 'user' | 'support';
    message: string;
    date: string;
  }>;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
}

export interface Plan {
  id: string;
  name: string;
  price: string;
  period: 'month' | 'year';
  features: string[];
  popular?: boolean;
  color: string;
}

export interface SupportTicketFormData {
  subject: string;
  category: string;
  message: string;
}
