/**
 * DataSource Bridge Handler
 *
 * Host-side handler for DataSource operations from widgets.
 * Enforces permission checks before proxying to kernel DataSource API.
 *
 * @module runtime/bridge
 * @layer L3
 */

import type { CellValue } from '@sn/types';

import {
  createDataSource,
  readDataSource,
  updateDataSource,
  deleteDataSource,
  listDataSources,
  queryTableRows,
  addRow,
  updateRow,
  deleteRow,
} from '../../kernel/datasource';
import { useAuthStore } from '../../kernel/stores/auth/auth.store';
import { useWidgetStore } from '../../kernel/stores/widget/widget.store';

import type { WidgetBridge } from './bridge';
import type { WidgetMessage } from './message-types';

/**
 * Checks whether a widget has the 'datasource' permission.
 */
function hasDataSourcePermission(widgetId: string): boolean {
  const entry = useWidgetStore.getState().registry[widgetId];
  return entry?.manifest?.permissions?.includes('datasource') ?? false;
}

/**
 * Checks whether a widget has the 'datasource-write' permission.
 */
function hasDataSourceWritePermission(widgetId: string): boolean {
  const entry = useWidgetStore.getState().registry[widgetId];
  const permissions = entry?.manifest?.permissions ?? [];
  return permissions.includes('datasource-write') && permissions.includes('datasource');
}

/**
 * Gets the current user ID for DataSource ACL enforcement.
 * Falls back to 'anonymous' if no auth session.
 */
function getCurrentUserId(): string {
  return useAuthStore.getState().user?.id ?? 'anonymous';
}

interface HandlerContext {
  widgetId: string;
  instanceId?: string;
  bridge: WidgetBridge;
}

/**
 * Handles a DataSource message from a widget iframe.
 * Returns true if the message was handled, false otherwise.
 */
export function handleDataSourceMessage(
  message: WidgetMessage,
  ctx: HandlerContext,
): boolean {
  const { widgetId, bridge } = ctx;

  switch (message.type) {
    case 'DS_CREATE': {
      if (!hasDataSourceWritePermission(widgetId)) {
        bridge.send({
          type: 'DS_RESPONSE',
          requestId: message.requestId,
          result: null,
          error: 'Permission denied: widget lacks datasource-write permission',
        });
        return true;
      }
      const callerId = getCurrentUserId();
      createDataSource(
        {
          type: message.dsType as 'doc' | 'table' | 'note' | 'folder' | 'file' | 'custom',
          ownerId: callerId,
          scope: message.scope as 'canvas' | 'user' | 'shared' | 'public',
          schema: message.schema,
          metadata: message.metadata as { name?: string; description?: string; icon?: string; color?: string; tags?: string[]; custom?: Record<string, unknown> },
        },
        callerId,
      )
        .then((result) => {
          if (result.success) {
            bridge.send({ type: 'DS_RESPONSE', requestId: message.requestId, result: result.data });
          } else {
            bridge.send({ type: 'DS_RESPONSE', requestId: message.requestId, result: null, error: result.error.message });
          }
        })
        .catch((err: unknown) => {
          bridge.send({
            type: 'DS_RESPONSE',
            requestId: message.requestId,
            result: null,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      return true;
    }

    case 'DS_READ': {
      if (!hasDataSourcePermission(widgetId)) {
        bridge.send({
          type: 'DS_RESPONSE',
          requestId: message.requestId,
          result: null,
          error: 'Permission denied: widget lacks datasource permission',
        });
        return true;
      }
      const callerId = getCurrentUserId();
      readDataSource(message.dataSourceId, callerId)
        .then((result) => {
          if (result.success) {
            bridge.send({ type: 'DS_RESPONSE', requestId: message.requestId, result: result.data });
          } else {
            bridge.send({ type: 'DS_RESPONSE', requestId: message.requestId, result: null, error: result.error.message });
          }
        })
        .catch((err: unknown) => {
          bridge.send({
            type: 'DS_RESPONSE',
            requestId: message.requestId,
            result: null,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      return true;
    }

    case 'DS_UPDATE': {
      if (!hasDataSourceWritePermission(widgetId)) {
        bridge.send({
          type: 'DS_RESPONSE',
          requestId: message.requestId,
          result: null,
          error: 'Permission denied: widget lacks datasource-write permission',
        });
        return true;
      }
      const callerId = getCurrentUserId();
      updateDataSource(
        message.dataSourceId,
        { ...message.updates, lastSeenRevision: message.lastSeenRevision },
        callerId,
      )
        .then((result) => {
          if (result.success) {
            bridge.send({ type: 'DS_RESPONSE', requestId: message.requestId, result: result.data });
          } else {
            bridge.send({ type: 'DS_RESPONSE', requestId: message.requestId, result: null, error: result.error.message });
          }
        })
        .catch((err: unknown) => {
          bridge.send({
            type: 'DS_RESPONSE',
            requestId: message.requestId,
            result: null,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      return true;
    }

    case 'DS_DELETE': {
      if (!hasDataSourceWritePermission(widgetId)) {
        bridge.send({
          type: 'DS_RESPONSE',
          requestId: message.requestId,
          result: null,
          error: 'Permission denied: widget lacks datasource-write permission',
        });
        return true;
      }
      const callerId = getCurrentUserId();
      deleteDataSource(message.dataSourceId, callerId)
        .then((result) => {
          if (result.success) {
            bridge.send({ type: 'DS_RESPONSE', requestId: message.requestId, result: null });
          } else {
            bridge.send({ type: 'DS_RESPONSE', requestId: message.requestId, result: null, error: result.error.message });
          }
        })
        .catch((err: unknown) => {
          bridge.send({
            type: 'DS_RESPONSE',
            requestId: message.requestId,
            result: null,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      return true;
    }

    case 'DS_LIST': {
      if (!hasDataSourcePermission(widgetId)) {
        bridge.send({
          type: 'DS_RESPONSE',
          requestId: message.requestId,
          result: null,
          error: 'Permission denied: widget lacks datasource permission',
        });
        return true;
      }
      const callerId = getCurrentUserId();
      listDataSources(callerId, {
        scope: message.scope as 'canvas' | 'user' | 'shared' | 'public' | undefined,
        type: message.dsType as 'doc' | 'table' | 'note' | 'folder' | 'file' | 'custom' | undefined,
      })
        .then((result) => {
          if (result.success) {
            bridge.send({ type: 'DS_RESPONSE', requestId: message.requestId, result: result.data });
          } else {
            bridge.send({ type: 'DS_RESPONSE', requestId: message.requestId, result: null, error: result.error.message });
          }
        })
        .catch((err: unknown) => {
          bridge.send({
            type: 'DS_RESPONSE',
            requestId: message.requestId,
            result: null,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      return true;
    }

    case 'DS_TABLE_GET_ROWS': {
      if (!hasDataSourcePermission(widgetId)) {
        bridge.send({
          type: 'DS_RESPONSE',
          requestId: message.requestId,
          result: null,
          error: 'Permission denied: widget lacks datasource permission',
        });
        return true;
      }
      const callerId = getCurrentUserId();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryTableRows(message.dataSourceId, callerId, message.options as any)
        .then((result) => {
          if (result.success) {
            bridge.send({ type: 'DS_RESPONSE', requestId: message.requestId, result: result.data });
          } else {
            bridge.send({ type: 'DS_RESPONSE', requestId: message.requestId, result: null, error: result.error.message });
          }
        })
        .catch((err: unknown) => {
          bridge.send({
            type: 'DS_RESPONSE',
            requestId: message.requestId,
            result: null,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      return true;
    }

    case 'DS_TABLE_ADD_ROW': {
      if (!hasDataSourceWritePermission(widgetId)) {
        bridge.send({
          type: 'DS_RESPONSE',
          requestId: message.requestId,
          result: null,
          error: 'Permission denied: widget lacks datasource-write permission',
        });
        return true;
      }
      const callerId = getCurrentUserId();
      addRow(message.dataSourceId, message.row as Record<string, CellValue>, callerId)
        .then((result) => {
          if (result.success) {
            bridge.send({ type: 'DS_RESPONSE', requestId: message.requestId, result: result.data });
          } else {
            bridge.send({ type: 'DS_RESPONSE', requestId: message.requestId, result: null, error: result.error.message });
          }
        })
        .catch((err: unknown) => {
          bridge.send({
            type: 'DS_RESPONSE',
            requestId: message.requestId,
            result: null,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      return true;
    }

    case 'DS_TABLE_UPDATE_ROW': {
      if (!hasDataSourceWritePermission(widgetId)) {
        bridge.send({
          type: 'DS_RESPONSE',
          requestId: message.requestId,
          result: null,
          error: 'Permission denied: widget lacks datasource-write permission',
        });
        return true;
      }
      const callerId = getCurrentUserId();
      updateRow(message.dataSourceId, message.rowId, message.updates as Record<string, CellValue>, callerId)
        .then((result) => {
          if (result.success) {
            bridge.send({ type: 'DS_RESPONSE', requestId: message.requestId, result: result.data });
          } else {
            bridge.send({ type: 'DS_RESPONSE', requestId: message.requestId, result: null, error: result.error.message });
          }
        })
        .catch((err: unknown) => {
          bridge.send({
            type: 'DS_RESPONSE',
            requestId: message.requestId,
            result: null,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      return true;
    }

    case 'DS_TABLE_DELETE_ROW': {
      if (!hasDataSourceWritePermission(widgetId)) {
        bridge.send({
          type: 'DS_RESPONSE',
          requestId: message.requestId,
          result: null,
          error: 'Permission denied: widget lacks datasource-write permission',
        });
        return true;
      }
      const callerId = getCurrentUserId();
      deleteRow(message.dataSourceId, message.rowId, callerId)
        .then((result) => {
          if (result.success) {
            bridge.send({ type: 'DS_RESPONSE', requestId: message.requestId, result: null });
          } else {
            bridge.send({ type: 'DS_RESPONSE', requestId: message.requestId, result: null, error: result.error.message });
          }
        })
        .catch((err: unknown) => {
          bridge.send({
            type: 'DS_RESPONSE',
            requestId: message.requestId,
            result: null,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      return true;
    }

    default:
      return false;
  }
}
