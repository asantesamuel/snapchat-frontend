import { useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import ConversationList from '@/components/chat/ConversationList';
import ConversationPage from './ConversationPage';
import CreateGroupModal from '@/components/chat/CreateGroupModal';
import { MessageSquareDashed, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';

interface ActiveConversation {
  id:       string;
  isGroup:  boolean;
  name:     string;
  avatarUrl?: string | null;
}

const ChatPage = () => {
  const navigate = useNavigate();
  useSocket();

  const [active, setActive]                = useState<ActiveConversation | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const handleSelect = (
    id:        string,
    isGroup:   boolean,
    name:      string,
    avatarUrl?: string | null
  ) => {
    setActive({ id, isGroup, name, avatarUrl });
  };

  const handleGroupCreated = (groupId: string, name: string) => {
    setShowGroupModal(false);
    setActive({ id: groupId, isGroup: true, name });
  };

  return (
    <div className="flex h-screen bg-black overflow-hidden">

      {/* conversation list sidebar */}
      <div className={cn(
        'w-full md:w-80 lg:w-96 shrink-0 flex flex-col border-r border-white/[0.06]',
        active ? 'hidden md:flex' : 'flex'
      )}>
        <ConversationList
          activeId={active?.id || null}
          onSelect={handleSelect}
          onNewGroup={() => setShowGroupModal(true)}
        />
      </div>

      {/* main panel */}
      <div className={cn(
        'flex-1 flex flex-col overflow-hidden',
        !active ? 'hidden md:flex' : 'flex'
      )}>
        {active ? (
          <ConversationPage
            conversationId={active.id}
            isGroup={active.isGroup}
            name={active.name}
            avatarUrl={active.avatarUrl}
            onBack={() => setActive(null)}
          />
        ) : (
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
            <button
              onClick={() => navigate('/camera')}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FFFC00]/10 hover:bg-[#FFFC00]/20 transition-colors"
            >
              <Camera className="w-4 h-4 text-[#FFFC00]" />
              <span className="text-[#FFFC00] text-sm font-semibold">Open Camera</span>
            </button>
          </div>
        )}
      </div>

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