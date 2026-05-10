-- Agent API keys per [[0020 - agent-native-architecture-agents-external-to-platform]].
--
-- One row per issued key, workspace-scoped. The raw token is sent to the
-- agent operator once at creation time and never persisted; only the
-- SHA-256 hash sits here. `revoked_at` is the kill switch.

CREATE TABLE IF NOT EXISTS agent_keys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key_hash        text NOT NULL UNIQUE,
  label           text NOT NULL,
  created_by      uuid NOT NULL REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_used_at    timestamptz,
  revoked_at      timestamptz
);

CREATE INDEX IF NOT EXISTS agent_keys_workspace
  ON agent_keys (workspace_id)
  WHERE revoked_at IS NULL;
