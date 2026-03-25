export type Role = 'Admin' | 'Creator' | 'Approver Level 1' | 'Approver Level 2';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
};

export type Client = {
  id: string;
  name: string;
  address: string;
  contactPerson: string;
  telPoBox: string;
  email: string;
  trn: string;
};

export type FieldType = 'text' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'signature' | 'textarea' | 'static-text' | 'table' | 'system-date' | 'system-serial' | 'image' | 'client';

export type TemplateField = {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // For dropdown or table columns
  placeholder?: string;
  content?: string; // For static-text
  x?: number;
  y?: number;
  w?: number | string;
  h?: number | string;
  rows?: number; // For table
  cols?: number; // For table
  colWidths?: string[]; // For table column widths
  rowHeights?: string[]; // For table row heights
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  color?: string;
};

export type TemplateType = 'document';

export type Template = {
  id: string;
  name: string;
  description: string;
  prefix: string; // e.g., DOC
  type: TemplateType;
  department?: string;
  fields: TemplateField[];
  headerContent: string;
  footerContent: string;
  bodyContent: string; // Rich text or HTML with placeholders
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

export type DocumentStatus = 'Draft' | 'Submitted' | 'Approved Level 1' | 'Approved Level 2' | 'Final Approved' | 'Rejected';

export type ApprovalLog = {
  id: string;
  userId: string;
  action: 'Submitted' | 'Approved' | 'Rejected';
  comments?: string;
  timestamp: string;
  level: number;
};

export type Document = {
  id: string;
  templateId: string;
  templateType: TemplateType;
  serialNumber: string;
  title: string;
  department?: string;
  data: Record<string, any>;
  status: DocumentStatus;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  logs: ApprovalLog[];
};
