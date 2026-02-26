/**
 * Pre-built Database Templates
 *
 * Provides a curated set of templates for common database use cases.
 * Templates define column schemas, default views, and sample rows
 * that can be applied to new table DataSources.
 *
 * @module kernel/datasource/templates
 */

import { DataManagerEvents } from '@sn/types';
import type { DatabaseTemplate, TableColumn, CellValue } from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase';

import type { DataSourceResult, DataSourceError } from './datasource';

function fail(code: DataSourceError['code'], message: string): DataSourceResult<never> {
  return { success: false, error: { code, message } };
}

// =============================================================================
// Template Definitions
// =============================================================================

const TEMPLATES: DatabaseTemplate[] = [
  {
    id: 'project-tracker',
    name: 'Project Tracker',
    description: 'Track projects with status, priority, assignee, and due dates.',
    icon: 'clipboard',
    category: 'project_management',
    columns: [
      { id: 'title', name: 'Task', type: 'text', order: 0, config: { required: true } },
      {
        id: 'status',
        name: 'Status',
        type: 'select',
        order: 1,
        config: {
          selectOptions: [
            { id: 'not-started', name: 'Not Started', color: 'gray' },
            { id: 'in-progress', name: 'In Progress', color: 'blue' },
            { id: 'review', name: 'In Review', color: 'yellow' },
            { id: 'done', name: 'Done', color: 'green' },
          ],
          defaultValue: 'Not Started',
        },
      },
      {
        id: 'priority',
        name: 'Priority',
        type: 'select',
        order: 2,
        config: {
          selectOptions: [
            { id: 'low', name: 'Low', color: 'green' },
            { id: 'medium', name: 'Medium', color: 'yellow' },
            { id: 'high', name: 'High', color: 'orange' },
            { id: 'urgent', name: 'Urgent', color: 'red' },
          ],
        },
      },
      { id: 'assignee', name: 'Assignee', type: 'text', order: 3 },
      { id: 'due-date', name: 'Due Date', type: 'date', order: 4 },
      { id: 'description', name: 'Description', type: 'text', order: 5 },
    ],
    views: [
      {
        id: 'all-tasks',
        name: 'All Tasks',
        type: 'table',
        visibleColumns: ['title', 'status', 'priority', 'assignee', 'due-date'],
      },
      {
        id: 'board-view',
        name: 'Board',
        type: 'board',
        groupBy: 'status',
        visibleColumns: ['title', 'priority', 'assignee', 'due-date'],
      },
    ],
    sampleRows: [
      { title: 'Design homepage wireframe', status: 'In Progress', priority: 'High', assignee: 'Alice' },
      { title: 'Set up CI/CD pipeline', status: 'Done', priority: 'Medium', assignee: 'Bob' },
      { title: 'Write API documentation', status: 'Not Started', priority: 'Low', assignee: '' },
    ],
  },

  {
    id: 'bug-tracker',
    name: 'Bug Tracker',
    description: 'Track bugs with severity, reproduction steps, and resolution status.',
    icon: 'bug',
    category: 'engineering',
    columns: [
      { id: 'title', name: 'Bug Title', type: 'text', order: 0, config: { required: true } },
      {
        id: 'severity',
        name: 'Severity',
        type: 'select',
        order: 1,
        config: {
          selectOptions: [
            { id: 'critical', name: 'Critical', color: 'red' },
            { id: 'major', name: 'Major', color: 'orange' },
            { id: 'minor', name: 'Minor', color: 'yellow' },
            { id: 'trivial', name: 'Trivial', color: 'gray' },
          ],
        },
      },
      {
        id: 'status',
        name: 'Status',
        type: 'select',
        order: 2,
        config: {
          selectOptions: [
            { id: 'open', name: 'Open', color: 'red' },
            { id: 'investigating', name: 'Investigating', color: 'yellow' },
            { id: 'fix-in-progress', name: 'Fix in Progress', color: 'blue' },
            { id: 'resolved', name: 'Resolved', color: 'green' },
            { id: 'closed', name: 'Closed', color: 'gray' },
          ],
        },
      },
      { id: 'reporter', name: 'Reporter', type: 'text', order: 3 },
      { id: 'assignee', name: 'Assignee', type: 'text', order: 4 },
      { id: 'steps', name: 'Steps to Reproduce', type: 'text', order: 5 },
      { id: 'environment', name: 'Environment', type: 'text', order: 6 },
      { id: 'reported-date', name: 'Reported', type: 'date', order: 7 },
    ],
    views: [
      {
        id: 'open-bugs',
        name: 'Open Bugs',
        type: 'table',
        filters: [
          { columnId: 'status', operator: 'not_equals', value: 'Closed' },
          { columnId: 'status', operator: 'not_equals', value: 'Resolved' },
        ],
        sorts: [{ columnId: 'severity', direction: 'asc' }],
      },
      {
        id: 'board-view',
        name: 'Board',
        type: 'board',
        groupBy: 'status',
      },
    ],
  },

  {
    id: 'content-calendar',
    name: 'Content Calendar',
    description: 'Plan and schedule content across channels with status tracking.',
    icon: 'calendar',
    category: 'marketing',
    columns: [
      { id: 'title', name: 'Content Title', type: 'text', order: 0, config: { required: true } },
      {
        id: 'type',
        name: 'Content Type',
        type: 'select',
        order: 1,
        config: {
          selectOptions: [
            { id: 'blog', name: 'Blog Post', color: 'blue' },
            { id: 'social', name: 'Social Media', color: 'purple' },
            { id: 'newsletter', name: 'Newsletter', color: 'green' },
            { id: 'video', name: 'Video', color: 'red' },
            { id: 'podcast', name: 'Podcast', color: 'orange' },
          ],
        },
      },
      {
        id: 'status',
        name: 'Status',
        type: 'select',
        order: 2,
        config: {
          selectOptions: [
            { id: 'idea', name: 'Idea', color: 'gray' },
            { id: 'drafting', name: 'Drafting', color: 'yellow' },
            { id: 'review', name: 'In Review', color: 'blue' },
            { id: 'scheduled', name: 'Scheduled', color: 'purple' },
            { id: 'published', name: 'Published', color: 'green' },
          ],
        },
      },
      {
        id: 'channel',
        name: 'Channel',
        type: 'multi_select',
        order: 3,
        config: {
          selectOptions: [
            { id: 'website', name: 'Website' },
            { id: 'twitter', name: 'Twitter' },
            { id: 'linkedin', name: 'LinkedIn' },
            { id: 'instagram', name: 'Instagram' },
            { id: 'youtube', name: 'YouTube' },
          ],
        },
      },
      { id: 'author', name: 'Author', type: 'text', order: 4 },
      { id: 'publish-date', name: 'Publish Date', type: 'date', order: 5 },
      { id: 'notes', name: 'Notes', type: 'text', order: 6 },
    ],
    views: [
      {
        id: 'calendar',
        name: 'Calendar',
        type: 'calendar',
        calendarDateColumn: 'publish-date',
      },
      {
        id: 'board',
        name: 'Pipeline',
        type: 'board',
        groupBy: 'status',
      },
    ],
  },

  {
    id: 'crm-contacts',
    name: 'CRM Contacts',
    description: 'Manage contacts, companies, and deal stages.',
    icon: 'users',
    category: 'sales',
    columns: [
      { id: 'name', name: 'Name', type: 'text', order: 0, config: { required: true } },
      { id: 'email', name: 'Email', type: 'email', order: 1 },
      { id: 'phone', name: 'Phone', type: 'phone', order: 2 },
      { id: 'company', name: 'Company', type: 'text', order: 3 },
      {
        id: 'stage',
        name: 'Stage',
        type: 'select',
        order: 4,
        config: {
          selectOptions: [
            { id: 'lead', name: 'Lead', color: 'gray' },
            { id: 'contacted', name: 'Contacted', color: 'blue' },
            { id: 'qualified', name: 'Qualified', color: 'yellow' },
            { id: 'proposal', name: 'Proposal', color: 'orange' },
            { id: 'negotiation', name: 'Negotiation', color: 'purple' },
            { id: 'closed-won', name: 'Closed Won', color: 'green' },
            { id: 'closed-lost', name: 'Closed Lost', color: 'red' },
          ],
        },
      },
      { id: 'deal-value', name: 'Deal Value', type: 'number', order: 5, config: { numberFormat: 'currency', currencyCode: 'USD' } },
      { id: 'last-contact', name: 'Last Contact', type: 'date', order: 6 },
      { id: 'notes', name: 'Notes', type: 'text', order: 7 },
    ],
    views: [
      {
        id: 'all-contacts',
        name: 'All Contacts',
        type: 'table',
      },
      {
        id: 'pipeline',
        name: 'Pipeline',
        type: 'board',
        groupBy: 'stage',
      },
    ],
  },

  {
    id: 'inventory',
    name: 'Inventory Tracker',
    description: 'Track stock levels, reorder points, and product details.',
    icon: 'package',
    category: 'other',
    columns: [
      { id: 'name', name: 'Product Name', type: 'text', order: 0, config: { required: true } },
      { id: 'sku', name: 'SKU', type: 'text', order: 1 },
      {
        id: 'category',
        name: 'Category',
        type: 'select',
        order: 2,
        config: {
          selectOptions: [
            { id: 'electronics', name: 'Electronics', color: 'blue' },
            { id: 'clothing', name: 'Clothing', color: 'purple' },
            { id: 'food', name: 'Food & Beverage', color: 'green' },
            { id: 'office', name: 'Office Supplies', color: 'yellow' },
            { id: 'other', name: 'Other', color: 'gray' },
          ],
        },
      },
      { id: 'quantity', name: 'Quantity', type: 'number', order: 3 },
      { id: 'reorder-point', name: 'Reorder Point', type: 'number', order: 4 },
      { id: 'unit-price', name: 'Unit Price', type: 'number', order: 5, config: { numberFormat: 'currency', currencyCode: 'USD' } },
      { id: 'supplier', name: 'Supplier', type: 'text', order: 6 },
      { id: 'in-stock', name: 'In Stock', type: 'checkbox', order: 7, config: { defaultValue: true } },
    ],
  },

  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Record meeting agendas, attendees, action items, and follow-ups.',
    icon: 'file-text',
    category: 'personal',
    columns: [
      { id: 'title', name: 'Meeting Title', type: 'text', order: 0, config: { required: true } },
      { id: 'date', name: 'Date', type: 'date', order: 1, config: { dateIncludeTime: true } },
      { id: 'attendees', name: 'Attendees', type: 'text', order: 2 },
      { id: 'agenda', name: 'Agenda', type: 'text', order: 3 },
      { id: 'notes', name: 'Notes', type: 'text', order: 4 },
      { id: 'action-items', name: 'Action Items', type: 'text', order: 5 },
      { id: 'follow-up', name: 'Follow-up Date', type: 'date', order: 6 },
      { id: 'completed', name: 'Completed', type: 'checkbox', order: 7 },
    ],
    views: [
      {
        id: 'upcoming',
        name: 'Upcoming',
        type: 'table',
        sorts: [{ columnId: 'date', direction: 'asc' }],
      },
      {
        id: 'calendar',
        name: 'Calendar',
        type: 'calendar',
        calendarDateColumn: 'date',
      },
    ],
  },
];

// =============================================================================
// Public API
// =============================================================================

/**
 * Get all available database templates.
 */
export function getTemplates(): DatabaseTemplate[] {
  return TEMPLATES;
}

/**
 * Get templates filtered by category.
 */
export function getTemplatesByCategory(category: string): DatabaseTemplate[] {
  return TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get a single template by ID.
 */
export function getTemplate(templateId: string): DatabaseTemplate | undefined {
  return TEMPLATES.find((t) => t.id === templateId);
}

/**
 * Apply a template to create a new table DataSource.
 * Creates the DataSource with the template's columns, views, and optional sample rows.
 */
export async function applyTemplate(
  templateId: string,
  callerId: string,
  options?: {
    name?: string;
    scope?: 'canvas' | 'user' | 'shared' | 'public';
    canvasId?: string;
    includeSampleRows?: boolean;
  },
): Promise<DataSourceResult<{ dataSourceId: string }>> {
  const template = getTemplate(templateId);
  if (!template) {
    return fail('NOT_FOUND', `Template '${templateId}' not found.`);
  }

  const scope = options?.scope ?? 'user';
  const name = options?.name ?? template.name;
  const includeSamples = options?.includeSampleRows ?? false;

  const tableSchema = {
    columns: template.columns,
    views: template.views ?? [
      {
        id: crypto.randomUUID(),
        name: 'Default',
        type: 'table' as const,
        visibleColumns: template.columns.map((c: TableColumn) => c.id),
      },
    ],
    primaryColumnId: template.columns[0]?.id,
  };

  const now = new Date().toISOString();
  const content = includeSamples && template.sampleRows?.length
    ? {
        rows: template.sampleRows.map((cells: Record<string, CellValue>) => ({
          id: crypto.randomUUID(),
          cells,
          createdAt: now,
          updatedAt: now,
        })),
      }
    : { rows: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await (supabase.from('data_sources') as any)
    .insert({
      type: 'table',
      owner_id: callerId,
      scope,
      canvas_id: options?.canvasId ?? null,
      schema: tableSchema,
      content,
      metadata: {
        name,
        description: template.description,
        icon: template.icon,
        custom: { templateId: template.id },
      },
      revision: 0,
    })
    .select('id')
    .single()) as { data: { id: string } | null; error: { message: string } | null };

  if (error || !data) {
    return fail('UNKNOWN', error?.message ?? 'Failed to create DataSource from template.');
  }

  bus.emit(DataManagerEvents.TEMPLATE_APPLIED, {
    templateId,
    dataSourceId: data.id,
  });

  return { success: true, data: { dataSourceId: data.id } };
}
