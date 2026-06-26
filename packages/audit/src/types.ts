export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type IssueType = "overlap" | "geometry" | "contrast";

export interface AuditIssue {
  type: IssueType;
  message: string;
  rect?: Rect;
}

export interface AuditResult {
  ok: boolean;
  issues: AuditIssue[];
  svg: string;
}

export interface AuditOptions {
  checks?: IssueType[];
  tolerance?: number;
  minContrast?: number;
}

// Minimal structural interface — compatible with playwright.Page and @playwright/test.Page
export interface AuditPage {
  evaluate<T>(fn: () => T | Promise<T>): Promise<T>;
  evaluate<T, A>(fn: (arg: A) => T | Promise<T>, arg: A): Promise<T>;
}
