import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, UserPlus, Search,
  Bell, MessageCircle
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useFriends } from '@/hooks/useFriends';
import { usersApi } from '@/api/users.api';
import FriendCard from '@/components/friends/FriendCard';
import FriendRequestCard from '@/components/friends/FriendRequestCard';
import SearchResultCard from '@/components/friends/SearchResultCard';
import Spinner from '@/components/ui/Spinner';
import { PendingRequest } from '@/types/friendship.types';

type Tab = 'friends' | 'requests' | 'search';

const FriendsPage = () => {
  const [activeTab, setActiveTab]           = useState<Tab>('friends');
  const [searchQuery, setSearchQuery]       = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const {
    friends, pendingRequests, pendingCount,
    isLoadingFriends, isLoadingPending,
    sendRequest, acceptRequest, rejectRequest, removeFriend,
    isSending, isAccepting, isRejecting, isRemoving,
  } = useFriends();

  // debounce — waits 400ms after last keystroke before firing the query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchData, isLoading: isSearching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn:  () => usersApi.search(debouncedQuery),
    enabled:  debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const friendUsernames = new Set(friends.map(f => f.user.username));

  const tabs = [
    {
      id:    'friends'  as Tab,
      label: 'Friends',
      icon:  Users,
      count: friends.length,
      desc:  'Your accepted friends',
    },
    {
      id:    'requests' as Tab,
      label: 'Requests',
      icon:  Bell,
      count: pendingCount,
      desc:  'Incoming friend requests',
    },
    {
      id:    'search'   as Tab,
      label: 'Discover',
      icon:  Search,
      count: 0,
      desc:  'Find new people',
    },
  ];

  return (
    // full-height layout that fills the content area given by AppLayout
    <div className="flex h-screen bg-black overflow-hidden">

      {/* ── LEFT PANEL — tab selector ──────────────────────────────── */}
      {/* on mobile: full width stacked header                         */}
      {/* on desktop: fixed-width left column                          */}
      <div className="w-full md:w-72 lg:w-80 shrink-0 flex flex-col border-r border-white/[0.06] md:h-full">

        {/* page title */}
        <div className="px-6 pt-8 pb-5">
          <h1 className="text-white text-2xl font-black tracking-tight">Friends</h1>
          <p className="text-white/30 text-sm mt-1">
            {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
          </p>
        </div>

        {/* tab list — vertical on desktop, easy to scan */}
        <nav className="flex-1 px-3 flex flex-col gap-1">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'search') {
                    setTimeout(() =>
                      document.getElementById('friend-search-input')?.focus()
                    , 100);
                  }
                }}
                className={cn(
                  'relative w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all text-left',
                  isActive
                    ? 'bg-[#FFFC00]/10 text-[#FFFC00]'
                    : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
                )}
              >
                {/* active left-edge indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#FFFC00] rounded-r-full" />
                )}

                {/* icon */}
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative',
                  isActive ? 'bg-[#FFFC00]/15' : 'bg-white/[0.04]'
                )}>
                  <tab.icon className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} />
                  {tab.count > 0 && (
                    <span className={cn(
                      'absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-black flex items-center justify-center',
                      tab.id === 'requests' ? 'bg-red-500 text-white' : 'bg-[#FFFC00] text-black'
                    )}>
                      {tab.count > 9 ? '9+' : tab.count}
                    </span>
                  )}
                </div>

                {/* label + description */}
                <div className="min-w-0">
                  <p className={cn(
                    'text-sm font-bold leading-tight',
                    isActive ? 'text-[#FFFC00]' : 'text-white/70'
                  )}>
                    {tab.label}
                  </p>
                  <p className="text-xs text-white/25 mt-0.5 leading-tight">
                    {tab.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* quick stats at bottom of left panel */}
        <div className="px-6 py-6 border-t border-white/[0.06]">
          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-white font-black text-xl">{friends.length}</span>
              <span className="text-white/30 text-xs">Friends</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center gap-0.5">
              <span className={cn(
                'font-black text-xl',
                pendingCount > 0 ? 'text-red-400' : 'text-white'
              )}>
                {pendingCount}
              </span>
              <span className="text-white/30 text-xs">Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — content ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* content area header */}
        <div className="px-6 pt-8 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-black text-lg">
                {tabs.find(t => t.id === activeTab)?.label}
              </h2>
              <p className="text-white/30 text-xs mt-0.5">
                {tabs.find(t => t.id === activeTab)?.desc}
              </p>
            </div>

            {/* search bar — always visible in header for Discover tab */}
            {activeTab === 'search' && (
              <div className="relative w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  id="friend-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by username..."
                  autoFocus
                  className="w-full bg-white/[0.06] border border-white/[0.06] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#FFFC00]/40 transition-colors"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Spinner size="sm" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">

          {/* ── FRIENDS TAB ───────────────────────────────────────── */}
          {activeTab === 'friends' && (
            <div>
              {isLoadingFriends ? (
                <div className="flex justify-center py-16">
                  <Spinner size="md" />
                </div>
              ) : friends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-5">
                  <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                    <Users className="w-10 h-10 text-white/15" />
                  </div>
                  <div className="text-center max-w-xs">
                    <p className="text-white font-bold text-lg">No friends yet</p>
                    <p className="text-white/30 text-sm mt-1.5 leading-relaxed">
                      Switch to Discover to search for people and send friend requests
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('search')}
                    className="px-6 py-3 rounded-full bg-[#FFFC00] text-black font-bold text-sm hover:bg-yellow-300 active:scale-95 transition-all"
                  >
                    Find Friends
                  </button>
                </div>
              ) : (
                // responsive grid — 1 col on small, 2 cols on large
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-1">
                  {friends.map(friendship => (
                    <FriendCard
                      key={friendship.id}
                      friendship={friendship}
                      onRemove={removeFriend}
                      isRemoving={isRemoving}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── REQUESTS TAB ──────────────────────────────────────── */}
          {activeTab === 'requests' && (
            <div>
              {isLoadingPending ? (
                <div className="flex justify-center py-16">
                  <Spinner size="md" />
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-5">
                  <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                    <UserPlus className="w-10 h-10 text-white/15" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-lg">No pending requests</p>
                    <p className="text-white/30 text-sm mt-1.5">
                      Friend requests you receive will appear here
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {pendingRequests.map((friendships: PendingRequest) => (
                    <FriendRequestCard
                      key={friendships.id}
                      request={friendships}
                      onAccept={acceptRequest}
                      onReject={rejectRequest}
                      isAccepting={isAccepting}
                      isRejecting={isRejecting}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SEARCH / DISCOVER TAB ─────────────────────────────── */}
          {activeTab === 'search' && (
            <div>
              {debouncedQuery.length < 2 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                    <Search className="w-10 h-10 text-white/15" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-lg">Search for people</p>
                    <p className="text-white/30 text-sm mt-1.5">
                      Type at least 2 characters to start searching
                    </p>
                  </div>
                </div>
              ) : isSearching ? (
                <div className="flex justify-center py-16">
                  <Spinner size="md" />
                </div>
              ) : !searchData?.users.length ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <p className="text-white font-bold text-lg">No results found</p>
                  <p className="text-white/30 text-sm">
                    Try searching with a different username
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-1">
                  {searchData.users.map(user => (
                    <SearchResultCard
                      key={user.id}
                      user={user}
                      isFriend={friendUsernames.has(user.username)}
                      hasSentRequest={false}
                      onAddFriend={sendRequest}
                      isSending={isSending}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;