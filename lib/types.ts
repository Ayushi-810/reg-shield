export interface ActionItem {
  id: string;
  task: string;
  owner: "Compliance" | "Product" | "Ops";
  timeline: string;
}

export interface Circular {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  fetchedAt: string;
  rawText: string;
  summary: string | null;
  whyItMatters: string | null;
  actionItems: ActionItem[];
  relevance: "HIGH" | "MEDIUM" | "LOW" | "NOT_RELEVANT" | null;
  analysed: boolean;
  reviewed: boolean;
  reviewedAt: string | null;
}

export type RelevanceKey = "HIGH" | "MEDIUM" | "LOW" | "NOT_RELEVANT";

export interface GroupedCirculars {
  HIGH: Circular[];
  MEDIUM: Circular[];
  LOW: Circular[];
  NOT_RELEVANT: Circular[];
}
