/**
 * AI Agent Widget Event Constants
 *
 * @module runtime/widgets/ai-agent
 * @layer L3
 */

export const AI_AGENT_EVENTS = {
  emits: {
    READY: 'ai-agent.ready',
    MESSAGE_SENT: 'ai-agent.message.sent',
    RESPONSE_RECEIVED: 'ai-agent.response.received',
    ACTION_TAKEN: 'ai-agent.action.taken',
    ERROR: 'ai-agent.error',
  },
  subscribes: {
    SEND_MESSAGE: 'ai-agent.send.message',
    CANVAS_EVENT: 'ai-agent.canvas.event',
    CLEAR_HISTORY: 'ai-agent.clear.history',
  },
} as const;
