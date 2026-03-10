import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Users, MoreVertical, Info } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useConversation } from "@/hooks/useConversation";
import MessageBubble from "@/components/chat/MessageBubble";
import MediaMessageBubble from "@/components/chat/MediaMessageBubble";
import MessageInput from "@/components/chat/MessageInput";
import TypingIndicator from "@/components/chat/TypingIndicator";
import GroupInfoPanel from "@/components/chat/GroupInfoPanel";
import Avatar from "@/components/ui/Avatar";
import { MessageType } from "@/types/message.types";
import { cn } from "@/utils/cn";

// ConversationPage is the main chat view
// Props received from ChatPage:
//   conversationId — for DMs: the OTHER user's UUID
//                  — for groups: the group UUID
//   isGroup        — determines event names and API endpoints
//   name           — display name (username or group name)
//   avatarUrl      — avatar for the header
//   onBack         — mobile back button callback

interface ConversationPageProps {
  conversationId: string;
  isGroup: boolean;
  name: string;
  avatarUrl?: string | null;
  onBack?: () => void;
}

const ConversationPage = ({
  conversationId,
  isGroup,
  name,
  avatarUrl,
  onBack,
}: ConversationPageProps) => {
  const { user } = useAuthStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);



  const {
    messages,
    sendMessage,
    markSeen,
    saveEphemeral,
    onTyping,
    typingUsernames,
    isAnyoneTyping,
  } = useConversation(conversationId, isGroup);

  // ── Auto-scroll to newest message ───────────────────────────────
  // runs whenever the messages array grows or typing indicator appears
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isAnyoneTyping]);

  // ── Handle send from MessageInput ────────────────────────────────
  // MessageInput calls this with the composed text and ephemeral flag
  // useConversation.sendMessage handles the socket emit
  const handleSend = (content: string, isEphemeral: boolean) => {
    sendMessage(content, isEphemeral, MessageType.TEXT);
  };
  
  return (
    <div className="flex h-full bg-black overflow-hidden">
      {/* ── Main conversation column ─────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-black/95 backdrop-blur-sm shrink-0">
          {/* back button — mobile only */}
          {onBack && (
            <button
              onClick={onBack}
              title="Go back"
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/[0.06] transition-colors md:hidden shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-white/50" />
            </button>
          )}

          {/* avatar + name */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {isGroup ? (
              <div className="w-9 h-9 rounded-xl bg-[#FFFC00] flex items-center justify-center shrink-0">
                <span className="text-black font-black text-sm">
                  {name[0].toUpperCase()}
                </span>
              </div>
            ) : (
              <Avatar src={avatarUrl} username={name} size="sm" ring />
            )}

            <div className="min-w-0 flex-1">
              <button
                onClick={() => isGroup && setShowGroupInfo((v) => !v)}
                className={cn(
                  "text-white font-bold text-sm truncate block text-left w-full",
                  isGroup &&
                    "hover:text-[#FFFC00] transition-colors cursor-pointer",
                )}
              >
                {name}
              </button>
              <p className="text-white/30 text-xs">
                {isAnyoneTyping
                  ? `${typingUsernames[0]} is typing...`
                  : isGroup
                    ? "Group chat"
                    : "Online"}
              </p>
            </div>
          </div>

          {/* right action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {isGroup && (
              <button
                onClick={() => setShowGroupInfo((v) => !v)}
                title="Group info"
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                  showGroupInfo
                    ? "bg-[#FFFC00]/10 text-[#FFFC00]"
                    : "hover:bg-white/[0.06] text-white/40",
                )}
              >
                <Info className="w-4 h-4" />
              </button>
            )}
            <button
              title="More options"
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/[0.06] transition-colors text-white/40"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Messages area ─────────────────────────────────────── */}
        {/* flex-col with overflow-y-auto — messages fill from top     */}
        {/* the bottomRef div at the end is the scroll target          */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col">
          {messages.length === 0 ? (
            // empty state — shown before any messages are sent
            <div className="flex flex-col items-center justify-center flex-1 gap-3 py-16">
              {isGroup ? (
                <div className="w-16 h-16 rounded-2xl bg-[#FFFC00]/10 flex items-center justify-center">
                  <Users className="w-8 h-8 text-[#FFFC00]/60" />
                </div>
              ) : (
                <Avatar src={avatarUrl} username={name} size="lg" ring />
              )}
              <div className="text-center">
                <p className="text-white font-bold">
                  {isGroup ? `Welcome to ${name}` : `Chat with ${name}`}
                </p>
                <p className="text-white/30 text-sm mt-1">
                  {isGroup
                    ? "Send the first message to get the conversation started"
                    : `Send ${name} a message or a snap`}
                </p>
              </div>
            </div>
          ) : (
            // message list
            // grouped so consecutive messages from the same sender
            // do not repeat the avatar on every bubble
            <div className="flex flex-col gap-0.5">
              {/** dedupe messages by id before rendering */}
              {Array.from(new Map(messages.map(m => [m.id, m])).values()).map((message, index, arr) => {
                const isMine = message.senderId === user?.id;
                const prevMessage = arr[index - 1];
                // only show avatar for the FIRST message in a consecutive
                // run from the same sender — reduces visual noise
                const showAvatar =
                  isGroup &&
                  !isMine &&
                  prevMessage?.senderId !== message.senderId;

                // route to MediaMessageBubble for image/video/audio
                // route to MessageBubble for text
                const isMedia = message.messageType !== MessageType.TEXT;

                return isMedia ? (
                  <MediaMessageBubble
                    key={message.id}
                    message={message}
                    isMine={isMine}
                    onSeen={markSeen}
                    onSaveEphemeral={saveEphemeral}
                    showAvatar={showAvatar}
                    senderUsername={message.senderUsername}
                  />
                ) : (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isMine={isMine}
                    onSeen={markSeen}
                    showAvatar={showAvatar}
                    senderUsername={message.senderUsername}
                    senderAvatar={message.senderAvatar}
                  />
                );
              })}

              {/* typing indicator — shown below all messages */}
              {isAnyoneTyping && (
                <TypingIndicator usernames={typingUsernames} />
              )}

              {/* invisible scroll anchor */}
              <div ref={bottomRef} className="h-px shrink-0" />
            </div>
          )}
        </div>

        {/* ── Message input ─────────────────────────────────────── */}
        <MessageInput
          onSend={handleSend}
          onTyping={onTyping}
          onMediaSent={(fileUrl, mediaId, messageType, isEphemeral) => {
            // media messages use the file URL as content
            // the mediaId links to the media record on the backend
            sendMessage(fileUrl, isEphemeral, messageType, mediaId);
          }}
        />
      </div>

      {/* ── Group info side panel ─────────────────────────────────── */}
      {/* slides in from the right when showGroupInfo is true          */}
      {/* on mobile it is fixed/full-screen overlay                    */}
      {isGroup && showGroupInfo && (
        <>
          {/* mobile overlay backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-30 md:hidden"
            onClick={() => setShowGroupInfo(false)}
          />
          {/* panel */}
          <div
            className={cn(
              "md:relative fixed inset-y-0 right-0 z-40",
              "md:z-auto md:flex",
            )}
          >
            <GroupInfoPanel
              groupId={conversationId}
              onClose={() => setShowGroupInfo(false)}
              onLeft={() => {
                setShowGroupInfo(false);
                onBack?.();
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ConversationPage;
