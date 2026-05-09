/**
 * parseCapture(text) — extract structured task fields from a free-form
 * Quick Capture string. Runs silently after a capture; suggested fields are
 * stored in `tasks.ai_parsed` and shown to the user during Inbox triage. The
 * suggestions never auto-apply — accepting them is an explicit user action.
 *
 * Stub for scaffolding — implement during the AI feature pass. Use the
 * Haiku model with prompt caching of the workspace's entity catalogue
 * (people, projects, areas, contexts) so suggestions can resolve names.
 */

export interface ParseCaptureInput {
  text: string;
  workspaceCatalogue: {
    people: Array<{ id: string; name: string }>;
    projects: Array<{ id: string; name: string }>;
    areas: Array<{ id: string; name: string }>;
    contexts: Array<{ id: string; label: string; slug: string }>;
  };
}

export interface ParseCaptureOutput {
  suggestedTitle?: string;
  suggestedFields?: {
    contextId?: string;
    projectId?: string;
    areaId?: string;
    personId?: string;
    dueAt?: string;
    scheduledAt?: string;
  };
}

export async function parseCapture(
  _input: ParseCaptureInput,
): Promise<ParseCaptureOutput> {
  throw new Error('parseCapture: not implemented');
}
