
export enum ViewType {
  LANDING = 'landing',
  UPLOAD = 'upload',
  CHAT = 'chat',
  VAULT = 'vault'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  files?: { name: string, type: string }[];
  timestamp: Date;
  isRetrieved?: boolean;
}

export interface VaultEntry {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  size: string;
  status: 'cloud_done' | 'cloud_upload' | 'cloud_off';
}

export type QuestionType = 'TN4LC' | 'ĐS' | 'TLN' | 'TL';
export type CognitiveLevel = 'NB' | 'TH' | 'VD' | 'VDC';

export interface Topic {
  id: string;
  name: string;
  subject: string;
  questionType: QuestionType;
  quantity: number;
  levels: {
    remember: number;
    understand: number;
    apply: number;
    highApply: number;
  };
}

export interface DocumentChunk {
  id: string;
  fileId: string;
  content: string;
  metadata: {
    topic: string;
    keywords: string[];
    sentiment?: string;
  };
}

export interface UploadedFile {
  id: string;
  name: string;
  size: string;
  progress: number;
  status: 'processing' | 'completed' | 'error';
  type: 'pdf' | 'docx' | 'pptx' | 'img';
  chunks?: DocumentChunk[];
}
