// single source of truth for all event name strings
// using these constants everywhere prevents hard-to-find
// typos like 'sendMessage' vs 'send_message'

export const SOCKET_EVENTS = {
  // client → server
  JOIN_CONVERSATION:    'join_conversation',
  JOIN_GROUP:           'join_group',
  SEND_MESSAGE:         'send_direct_message',
  SEND_GROUP_MESSAGE:   'send_group_message',
  TYPING_START:         'typing_start',
  TYPING_STOP:          'typing_stop',
  MESSAGE_SEEN:         'message_seen',
  SAVE_EPHEMERAL:       'save_ephemeral_message',
  LEAVE_CONVERSATION:   'leave_conversation',

  // server → client
  NEW_MESSAGE:          'new_direct_message',
  NEW_MESSAGE_NOTIF:    'new_message_notification',
  NEW_GROUP_MESSAGE:    'new_group_message',
  USER_TYPING:          'user_typing',
  USER_STOPPED_TYPING:  'user_stopped_typing',
  MESSAGE_READ:         'message_read',
  MESSAGE_DELETED:      'message_deleted',
  MESSAGE_SAVED:        'message_saved',
  ERROR:                'error',
} as const;