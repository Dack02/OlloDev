"use client";

import { Input } from "@/components/ui/input";
import type { Project, ProjectHealth, ProjectStatus, Priority } from "@/stores/project-store";

export const PROJECT_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

export interface ProjectFormValues {
  name: string;
  description: string;
  color: string;
  status: ProjectStatus;
  priority: Priority;
  health: ProjectHealth;
  client_name: string;
  project_url: string;
  repository_url: string;
  start_date: string;
  target_date: string;
  key_outcome: string;
}

export const emptyProjectFormValues: ProjectFormValues = {
  name: "",
  description: "",
  color: PROJECT_COLORS[0],
  status: "planning",
  priority: "medium",
  health: "on_track",
  client_name: "",
  project_url: "",
  repository_url: "",
  start_date: "",
  target_date: "",
  key_outcome: "",
};

export function projectToFormValues(project: Project): ProjectFormValues {
  return {
    name: project.name,
    description: project.description ?? "",
    color: project.color,
    status: project.status,
    priority: project.priority,
    health: project.health,
    client_name: project.client_name ?? "",
    project_url: project.project_url ?? "",
    repository_url: project.repository_url ?? "",
    start_date: project.start_date ?? "",
    target_date: project.target_date ?? "",
    key_outcome: project.key_outcome ?? "",
  };
}

export function toProjectPayload(values: ProjectFormValues) {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    color: values.color,
    status: values.status,
    priority: values.priority,
    health: values.health,
    client_name: values.client_name.trim(),
    project_url: values.project_url.trim(),
    repository_url: values.repository_url.trim(),
    start_date: values.start_date,
    target_date: values.target_date,
    key_outcome: values.key_outcome.trim(),
  };
}

interface ProjectFormFieldsProps {
  values: ProjectFormValues;
  onChange: <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => void;
  disabled?: boolean;
}

export function ProjectFormFields({
  values,
  onChange,
  disabled = false,
}: ProjectFormFieldsProps) {
  return (
    <div className="flex flex-col gap-3 mt-1">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-primary">Name</label>
        <Input
          value={values.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="e.g. Auth Redesign"
          required
          disabled={disabled}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-primary">Description</label>
        <textarea
          className="min-h-[80px] w-full rounded-lg border border-border-subtle bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent resize-none"
          value={values.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="What is this project about?"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-primary">Status</label>
          <select
            className="h-8 rounded-lg border border-border-subtle bg-surface-primary px-2.5 text-sm text-text-primary focus:outline-none"
            value={values.status}
            onChange={(e) => onChange("status", e.target.value as ProjectStatus)}
            disabled={disabled}
          >
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-primary">Priority</label>
          <select
            className="h-8 rounded-lg border border-border-subtle bg-surface-primary px-2.5 text-sm text-text-primary focus:outline-none"
            value={values.priority}
            onChange={(e) => onChange("priority", e.target.value as Priority)}
            disabled={disabled}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-primary">Health</label>
          <select
            className="h-8 rounded-lg border border-border-subtle bg-surface-primary px-2.5 text-sm text-text-primary focus:outline-none"
            value={values.health}
            onChange={(e) => onChange("health", e.target.value as ProjectHealth)}
            disabled={disabled}
          >
            <option value="on_track">On track</option>
            <option value="at_risk">At risk</option>
            <option value="off_track">Off track</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-primary">Client / owner</label>
          <Input
            value={values.client_name}
            onChange={(e) => onChange("client_name", e.target.value)}
            placeholder="Internal, Acme, Product Team"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-primary">Start date</label>
          <Input
            type="date"
            value={values.start_date}
            onChange={(e) => onChange("start_date", e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-primary">Target date</label>
          <Input
            type="date"
            value={values.target_date}
            onChange={(e) => onChange("target_date", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-primary">Project URL</label>
        <Input
          type="url"
          value={values.project_url}
          onChange={(e) => onChange("project_url", e.target.value)}
          placeholder="https://..."
          disabled={disabled}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-primary">Repository URL</label>
        <Input
          type="url"
          value={values.repository_url}
          onChange={(e) => onChange("repository_url", e.target.value)}
          placeholder="https://github.com/..."
          disabled={disabled}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-primary">Key outcome</label>
        <textarea
          className="min-h-[72px] w-full rounded-lg border border-border-subtle bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent resize-none"
          value={values.key_outcome}
          onChange={(e) => onChange("key_outcome", e.target.value)}
          placeholder="What success looks like"
          disabled={disabled}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-primary">Color</label>
        <div className="flex items-center gap-2">
          {PROJECT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange("color", color)}
              className={`size-6 rounded-full transition-all ${
                values.color === color
                  ? "ring-2 ring-offset-2 ring-offset-surface-primary ring-accent scale-110"
                  : "hover:scale-105"
              }`}
              style={{ backgroundColor: color }}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
