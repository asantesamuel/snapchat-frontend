import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, MessageSquare } from 'lucide-react';
import { useChatStore } from '@/store/chat.store';
import { messagesApi } from '@/api/messages.api';
import ConversationItem from './ConversationItem';
import Spinner from '@/components/ui/Spinner';

interface ConversationListProps {
  activeId: string | null;
  onSelect: (id: string, isGroup: boolean, name: string) => void;
  onNewGroup: () => void;
}

const ConversationList = ({ activeId, onSelect, onNewGroup }: ConversationListProps) => {
  const [search, setSearch] = useState('');
  const { setConversations, conversations } = useChatStore();

  const { isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const data = await messagesApi.getConversations();
      setConversations(data);
      return data;
    },
    refetchInterval: 30000, // refresh every 30s as a fallback
  });

  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-black border-r border-white/[0.06]">
      {/* header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white text-xl font-black tracking-tight">Chats</h1>
          <button
            onClick={onNewGroup}
            className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors"
            title="New group chat"
          >
            <Plus className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-white/[0.06] border border-white/[0.06] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#FFFC00]/40 transition-colors"
          />
        </div>
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-white/20" />
            </div>
            <p className="text-white/30 text-sm text-center">
              {search ? 'No conversations match your search' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          filtered.map(conv => (
            <ConversationItem
              key={conv.conversationId}
              conversation={conv}
              isActive={activeId === conv.conversationId}
              onClick={() => onSelect(
                conv.conversationId,
                conv.isGroup,
                conv.name,
              )}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;