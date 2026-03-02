import { useState } from 'react';
import {
  X, Crown, UserMinus, UserPlus,
  LogOut, Users, Search
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useGroupManagement } from '@/hooks/useGroupManagement';
import { useAuthStore } from '@/store/auth.store';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';

// GroupInfoPanel is a slide-in side panel showing group details
// It is opened by clicking the group name in the conversation header
// On desktop it occupies the right third of the chat area
// On mobile it is a full-screen overlay
//
// It shows:
//   - Group name and member count
//   - Member list with role badges
//   - Add member input (admin only)
//   - Remove member button per member (admin only)
//   - Leave group button (all members)

interface GroupInfoPanelProps {
  groupId:  string;
  onClose:  () => void;
  onLeft:   () => void;  // called after successfully leaving the group
}

const GroupInfoPanel = ({ groupId, onClose, onLeft }: GroupInfoPanelProps) => {
  const { user: me }       = useAuthStore();
  const [addUsername, setAddUsername] = useState('');

  const {
    group, isLoading, isAdmin,
    addMember, removeMember, leaveGroup,
    isAddingMember, isRemovingMember, isLeaving,
  } = useGroupManagement(groupId, onLeft);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUsername.trim()) return;
    addMember(addUsername.trim(), {
      onSuccess: () => setAddUsername(''),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0A0A0A] border-l border-white/[0.06]">
        <Spinner size="md" />
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] border-l border-white/[0.06] w-full md:w-72 lg:w-80 shrink-0">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#FFFC00]" />
          <h3 className="text-white font-bold text-sm">Group Info</h3>
        </div>
        <button
          onClick={onClose}
          title="Close group info"
          className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-white/50" />
        </button>
      </div>

      {/* ── Group identity ───────────────────────────────────────── */}
      <div className="flex flex-col items-center px-5 py-6 border-b border-white/[0.06]">
        <div className="w-16 h-16 rounded-2xl bg-[#FFFC00] flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(255,252,0,0.2)]">
          <span className="text-black font-black text-2xl">
            {group.name[0].toUpperCase()}
          </span>
        </div>
        <h2 className="text-white font-black text-lg text-center">{group.name}</h2>
        <p className="text-white/30 text-xs mt-1">
          {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
        </p>
      </div>

      {/* ── Add member (admin only) ───────────────────────────────── */}
      {isAdmin && (
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <form onSubmit={handleAddMember} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
              <input
                type="text"
                value={addUsername}
                onChange={e => setAddUsername(e.target.value)}
                placeholder="Add by username..."
                className="w-full bg-white/[0.06] border border-white/[0.06] rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#FFFC00]/40 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={!addUsername.trim() || isAddingMember}
              title="Add member"
              className="px-3 py-2 rounded-xl bg-[#FFFC00] text-black font-bold text-xs hover:bg-yellow-300 transition-colors disabled:opacity-40"
            >
              {isAddingMember ? '...' : <UserPlus className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}

      {/* ── Member list ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <p className="text-white/25 text-[10px] font-bold uppercase tracking-wider px-2 mb-2">
          Members
        </p>
        <div className="flex flex-col gap-0.5">
          {group.members.map(member => {
            const isMe      = member.userId === me?.id;
            const isMemberAdmin = member.role === 'admin';

            return (
              <div
                key={member.userId}
                className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group"
              >
                <Avatar
                  src={member.avatarUrl}
                  username={member.username}
                  size="sm"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-sm font-medium truncate">
                      {member.username}
                    </span>
                    {isMe && (
                      <span className="text-[9px] text-white/30 font-bold uppercase bg-white/[0.06] px-1.5 py-0.5 rounded-full shrink-0">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {isMemberAdmin && (
                      <Crown className="w-3 h-3 text-[#FFFC00]" />
                    )}
                    <span className={cn(
                      'text-xs',
                      isMemberAdmin ? 'text-[#FFFC00]/70' : 'text-white/25'
                    )}>
                      {isMemberAdmin ? 'Admin' : 'Member'}
                    </span>
                  </div>
                </div>

                {/* remove button — admin only, not for self or other admins */}
                {isAdmin && !isMe && !isMemberAdmin && (
                  <button
                    onClick={() => removeMember(member.userId)}
                    disabled={isRemovingMember}
                    title="Remove from group"
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 text-white/30 transition-all disabled:opacity-30 shrink-0"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Leave group ───────────────────────────────────────────── */}
      <div className="px-4 py-4 border-t border-white/[0.06]">
        <button
          onClick={() => leaveGroup()}
          disabled={isLeaving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-sm hover:bg-red-500/20 transition-all disabled:opacity-40"
        >
          <LogOut className="w-4 h-4" />
          {isLeaving ? 'Leaving...' : 'Leave Group'}
        </button>
      </div>
    </div>
  );
};

export default GroupInfoPanel;