-- Custom migration: active_tasks view.
--
-- Per docs/schema.md → "View patterns" → "Active-task filter (Q4)".
-- Active views (Today, Upcoming, Project picker, etc.) read from this view
-- so tasks under archived projects/areas are filtered out automatically.
-- Search and global views still query `tasks` directly so archived items
-- remain searchable.
--
-- Drizzle-kit doesn't author views; this file is hand-written and ordered
-- after 0000_gorgeous_dakota_north (which created the underlying tables).

CREATE OR REPLACE VIEW active_tasks AS
SELECT t.*
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN areas    a ON t.area_id    = a.id
WHERE t.archived_at IS NULL
  AND t.recurring_rule IS NULL
  AND (t.project_id IS NULL OR p.archived_at IS NULL)
  AND (t.area_id    IS NULL OR a.archived_at IS NULL);
