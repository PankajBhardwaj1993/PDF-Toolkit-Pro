export interface ToolStep {
  step: number;
  title: string;
  description: string;
}

export interface ToolFeature {
  title: string;
  description: string;
}

export interface ToolUseCase {
  title: string;
  description: string;
}

export interface ToolFAQ {
  question: string;
  answer: string;
}

export interface ToolRelatedLink {
  id: string;
  title: string;
  anchor: string;
}

export interface ToolSeoContent {
  id: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  h1: string;
  intro: string;
  whatIsTitle: string;
  whatIsContent: string[];
  howToTitle: string;
  howToSteps: ToolStep[];
  featuresTitle: string;
  features: ToolFeature[];
  useCasesTitle: string;
  useCases: ToolUseCase[];
  tipsTitle: string;
  tips: string[];
  securityTitle: string;
  securityContent: string;
  faqs: ToolFAQ[];
  relatedTools: ToolRelatedLink[];
}
