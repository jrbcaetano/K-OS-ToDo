/**
 * agentSuggestions(entityRef) — generate proactive next-step suggestions for
 * a Task / Area / Person detail page. Shown in the design's "agent
 * suggestions" cards.
 *
 * Stub for scaffolding — implement during the AI feature pass. Use Sonnet
 * with prompt caching of the system prompt + entity catalogue.
 */

export type EntityKind = 'task' | 'project' | 'area' | 'person';

export interface AgentSuggestionsInput {
  workspaceId: string;
  entityKind: EntityKind;
  entityId: string;
}

export interface AgentSuggestionsOutput {
  bullets: string[];
  /** Optional structured proposals the user can accept with one click. */
  proposals?: Array<
    | { kind: 'set_status'; taskId: string; status: string }
    | { kind: 'set_due'; taskId: string; dueAt: string }
    | { kind: 'add_to_project'; taskId: string; projectId: string }
    | { kind: 'create_subtask'; parentTaskId: string; title: string }
  >;
}

export async function agentSuggestions(
  _input: AgentSuggestionsInput,
): Promise<AgentSuggestionsOutput> {
  throw new Error('agentSuggestions: not implemented');
}
