import { useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import ConversationList from "@/components/chat/ConversationList";
import ConversationPage from "./ConversationPage";
import CreateGroupModal from "@/components/chat/CreateGroupModal";
import { MessageSquareDashed, Camera, Users, MessageCircle } from "lucide-react";
import { cn } from "@/utils/cn";
import { useNavigate } from "react-router-dom";

interface ActiveConversation {
  id: string;
  isGroup: boolean;
  name: string;
  avatarUrl?: string | null;
}

const ChatPage = () => {
  const navigate = useNavigate();
  useSocket();

  const [active, setActive]                = useState<ActiveConversation | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const handleSelect = (id: string, isGroup: boolean, name: string) => {
    setActive({ id, isGroup, name, avatarUrl: null });
  };

  const handleGroupCreated = (groupId: string, name: string) => {
    setShowGroupModal(false);
    setActive({ id: groupId, isGroup: true, name });
  };

  return (
    <div className="flex h-screen bg-black overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          "w-full md:w-80 lg:w-96 shrink-0 flex flex-col border-r border-white/[0.06]",
          active ? "hidden md:flex" : "flex",
        )}
      >
        {/* conversation list fills all available vertical space */}
        <div className="flex-1 overflow-hidden">
          <ConversationList
            activeId={active?.id || null}
            onSelect={handleSelect}
            onNewGroup={() => setShowGroupModal(true)}
          />
        </div>

        {/* ── Bottom action bar — camera lives here ──────────────────── */}
        <div className="shrink-0 border-t border-white/[0.06] px-4 py-3 flex items-center justify-around bg-black">

          {/* Chats tab — shows active yellow state */}
          <button
            className="flex flex-col items-center gap-1"
            title="Chats"
          >
            <div className="w-9 h-9 rounded-2xl bg-[#FFFC00]/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-[#FFFC00]" />
            </div>
            <span className="text-[10px] text-[#FFFC00] font-bold">Chats</span>
          </button>

          {/* Camera — centre prominent button, navigates to /camera */}
          <button
            onClick={() => navigate("/camera")}
            className="flex flex-col items-center gap-1 group"
            title="Open camera"
          >
            <div className="w-12 h-12 rounded-full bg-[#FFFC00] flex items-center justify-center shadow-[0_0_20px_rgba(255,252,0,0.35)] group-hover:bg-yellow-300 group-active:scale-90 transition-all">
              <Camera className="w-6 h-6 text-black" />
            </div>
            <span className="text-[10px] text-white/40 font-medium group-hover:text-white/70 transition-colors">
              Camera
            </span>
          </button>

          {/* New Group shortcut */}
          <button
            onClick={() => setShowGroupModal(true)}
            className="flex flex-col items-center gap-1 group"
            title="New group"
          >
            <div className="w-9 h-9 rounded-2xl bg-white/[0.06] flex items-center justify-center group-hover:bg-white/10 transition-colors">
              <Users className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" />
            </div>
            <span className="text-[10px] text-white/40 font-medium group-hover:text-white/70 transition-colors">
              Group
            </span>
          </button>

        </div>
      </div>

      {/* ── Main panel ──────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex-1 flex flex-col",
          !active ? "hidden md:flex" : "flex",
        )}
      >
        {active ? (
          <ConversationPage
            conversationId={active.id}
            isGroup={active.isGroup}
            name={active.name}
            avatarUrl={active.avatarUrl}
            onBack={() => setActive(null)}
          />
        ) : (
          // empty state shown on desktop when no conversation is open
          <div className="flex flex-col items-center justify-center flex-1 gap-4">
            <div className="w-20 h-20 rounded-3xl bg-[#FFFC00]/10 flex items-center justify-center">
              <MessageSquareDashed className="w-10 h-10 text-[#FFFC00]/60" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">Your Messages</p>
              <p className="text-white/30 text-sm mt-1">
                Select a conversation or start a new one
              </p>
            </div>
            {/* secondary camera shortcut on the empty state panel */}
            <button
              onClick={() => navigate("/camera")}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FFFC00]/10 hover:bg-[#FFFC00]/20 transition-colors group"
            >
              <Camera className="w-4 h-4 text-[#FFFC00]" />
              <span className="text-[#FFFC00] text-sm font-semibold">Open Camera</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Create group modal ───────────────────────────────────────── */}
      {showGroupModal && (
        <CreateGroupModal
          onClose={() => setShowGroupModal(false)}
          onCreated={handleGroupCreated}
        />
      )}

    </div>
  );
};

export default ChatPage;