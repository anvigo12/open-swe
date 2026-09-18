import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { SettingsRow, SettingsSection } from "@/components/AppShell"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  api,
  type WorkspaceOption,
  type WorkspaceRefreshStatus,
  type WorkspaceRefreshStep,
  type WorkspaceSettingsView,
} from "@/lib/api"
import { formatRelativeTime } from "@/lib/utils"

const REFRESH_LABEL: Record<WorkspaceRefreshStatus, string> = {
  never: "Never refreshed",
  refreshing: "Refreshing…",
  success: "Refreshed",
  failed: "Refresh failed",
}

// A nightly rebuild from the base image and an hourly update of the current
// snapshot read differently to a person deciding whether to trust the image.
function refreshLabel(
  status: WorkspaceRefreshStatus,
  kind: WorkspaceOption["refresh_kind"]
): string {
  if (status === "success" && kind === "update") return "Updated"
  if (status === "success" && kind === "full") return "Rebuilt"
  if (status === "refreshing" && kind === "update") return "Updating…"
  if (status === "refreshing" && kind === "full") return "Rebuilding…"
  return REFRESH_LABEL[status]
}

const REFRESH_CLASS: Record<WorkspaceRefreshStatus, string> = {
  never: "text-muted-foreground",
  refreshing: "text-muted-foreground",
  success: "text-muted-foreground",
  failed: "text-destructive",
}

function refreshedAt(timestamp: string | null | undefined): string | null {
  if (!timestamp) return null
  const parsed = Date.parse(timestamp)
  return Number.isNaN(parsed) ? null : formatRelativeTime(parsed)
}

const STEP_MARK: Record<WorkspaceRefreshStep["status"], string> = {
  running: "…",
  success: "✓",
  failed: "✕",
}

const STEP_CLASS: Record<WorkspaceRefreshStep["status"], string> = {
  running: "border-border text-foreground",
  success: "border-border text-muted-foreground",
  failed: "border-destructive/40 text-destructive",
}

// A rebuild runs for minutes to an hour; which stage it reached is the only
// thing that separates slow from wedged while it is still going.
function RefreshSteps({ steps }: { steps: Array<WorkspaceRefreshStep> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {steps.map((step) => (
        <span
          key={step.label}
          className={`rounded-full border px-2 py-0.5 text-[11px] ${STEP_CLASS[step.status]}`}
        >
          {STEP_MARK[step.status]} {step.label}
          {step.exit_code ? ` (exit ${step.exit_code})` : ""}
        </span>
      ))}
    </div>
  )
}

type IdentityMode = "inherit" | "shown" | "hidden"

function identityMode(override: boolean | null | undefined): IdentityMode {
  if (override === true) return "shown"
  if (override === false) return "hidden"
  return "inherit"
}

function identityModeValue(mode: IdentityMode): boolean | null {
  if (mode === "shown") return true
  if (mode === "hidden") return false
  return null
}

function WorkspaceModelIdentityRow({ slug }: { slug: string }) {
  const qc = useQueryClient()
  const queryKey = ["workspace-settings", slug] as const
  const settings = useQuery({
    queryKey,
    queryFn: () => api.getWorkspaceSettings(slug),
  })
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: (mode: IdentityMode) =>
      api.saveWorkspaceSettings(slug, {
        show_model_identity: identityModeValue(mode),
      }),
    onSuccess: (saved: WorkspaceSettingsView) => {
      qc.setQueryData(queryKey, saved)
      qc.invalidateQueries({ queryKey: ["modelIdentity"] })
      setError(null)
    },
    onError: (e: Error) => setError(e.message),
  })

  const mode = identityMode(settings.data?.overrides.show_model_identity)

  return (
    <>
      <SettingsRow
        label="Show model identity"
        description={`Inherit follows the instance default (currently ${settings.data?.effective.show_model_identity === false ? "hidden" : "shown"}). Hidden workspaces show an anonymous auto selection; a manual model pick is always shown.`}
        control={
          <Select
            value={mode}
            onValueChange={(next) => save.mutate(next as IdentityMode)}
            disabled={!settings.data || save.isPending}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inherit">Inherit instance</SelectItem>
              <SelectItem value="shown">Shown</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </>
  )
}

function WorkspaceRow({
  workspace,
  isDefault,
  isAdmin,
}: {
  workspace: WorkspaceOption
  isDefault: boolean
  isAdmin: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const status = workspace.refresh_status ?? "never"
  const when = refreshedAt(workspace.refresh_finished_at)
  const log = workspace.refresh_log_excerpt
  const steps = workspace.refresh_steps ?? []
  const detail = [
    isDefault ? "Default workspace" : null,
    workspace.has_snapshot ? "Snapshot ready" : "No snapshot",
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="flex flex-col gap-2 px-4 py-3.5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="flex flex-col gap-1">
          <span className="text-sm/none font-medium text-foreground">
            {workspace.name}
          </span>
          <span className="text-xs/relaxed text-muted-foreground">
            {detail}
          </span>
        </div>
        <span className="flex items-center gap-3 sm:shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {expanded ? "Hide settings" : "Settings"}
            </button>
          )}
          <span className={`text-xs ${REFRESH_CLASS[status]}`}>
            {refreshLabel(status, workspace.refresh_kind)}
            {status !== "refreshing" && when ? ` ${when}` : ""}
          </span>
        </span>
      </div>
      {isAdmin && expanded && (
        <div className="rounded-md border border-border">
          <WorkspaceModelIdentityRow slug={workspace.slug} />
        </div>
      )}
      {steps.length > 0 && <RefreshSteps steps={steps} />}
      {workspace.refresh_error && (
        <p className="text-xs/relaxed text-destructive">
          {workspace.refresh_error}
        </p>
      )}
      {/* The API omits the log for non-admins; this guard is defence in depth
          for a `bash -x` trace that can carry expanded credentials. */}
      {isAdmin && log && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">Refresh log</summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
            {log}
          </pre>
        </details>
      )}
    </div>
  )
}

export function WorkspacesSection({ isAdmin }: { isAdmin: boolean }) {
  const workspaces = useQuery({
    queryKey: ["workspace-options"],
    queryFn: api.listWorkspaceOptions,
    staleTime: 60_000,
    refetchInterval: 5000,
  })
  const options = workspaces.data

  return (
    <SettingsSection
      title="Workspaces"
      description={
        isAdmin
          ? "Each workspace is rebuilt nightly from its setup script and, while in use, updated hourly by its update script. To create or edit one, start a new agent thread, open the + menu, enable admin mode, and ask Open SWE to make the change."
          : "Each workspace is rebuilt nightly from its setup script and, while in use, updated hourly by its update script. To create or edit one, ask a workspace admin to start an admin thread and ask Open SWE to make the change."
      }
    >
      {workspaces.isLoading ? (
        <div className="px-4 py-3.5">
          <Skeleton className="h-8 w-full" />
        </div>
      ) : workspaces.isError ? (
        <p className="px-4 py-3.5 text-xs text-destructive">
          Could not load workspaces.
        </p>
      ) : !options || options.workspaces.length === 0 ? (
        <p className="px-4 py-3.5 text-xs text-muted-foreground">
          No workspaces are configured.
        </p>
      ) : (
        options.workspaces.map((workspace) => (
          <WorkspaceRow
            key={workspace.slug}
            workspace={workspace}
            isDefault={workspace.slug === options.default_slug}
            isAdmin={isAdmin}
          />
        ))
      )}
    </SettingsSection>
  )
}
