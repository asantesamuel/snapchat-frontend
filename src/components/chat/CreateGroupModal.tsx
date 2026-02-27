import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Search, Check, Users } from "lucide-react";
import toast from "react-hot-toast";
import { groupsApi } from "@/api/groups.api";
import { friendshipsApi } from "@/api/friendships.api";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated: (groupId: string, name: string) => void;
}

const CreateGroupModal = ({ onClose, onCreated }: CreateGroupModalProps) => {
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: friendsData } = useQuery({
    queryKey: ["friends"],
    queryFn: () => friendshipsApi.list(),
  });

  const friends = friendsData?.friendships || [];

  const filtered = friends.filter((f) =>
    f.user.username.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleFriend = (username: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  };

  const { mutate: createGroup, isPending } = useMutation({
    mutationFn: () =>
      groupsApi.create({
        name: groupName.trim(),
        memberUsernames: Array.from(selected),
      }),
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(`Group "${group.name}" created!`);
      onCreated(group.id, group.name);
    },
    onError: (err: unknown) => {
      //const message = (err as any)?.response?.data?.message || (err as Error)?.message || 'Failed to create group';
      const message =
        (err as unknown as { response: { data: { message: string } } })
          ?.response?.data?.message ||
        (err as Error)?.message ||
        "Failed to create group";
      toast.error(message);
    },
  });

  const canCreate = groupName.trim().length >= 2 && selected.size >= 1;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-3xl w-full max-w-sm overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#FFFC00]" />
            <h2 className="text-white font-black text-lg">New Group</h2>
          </div>
          <button
            onClick={onClose}
            title="Close modal"
            className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-4">
          {/* group name */}
          <Input
            label="Group Name"
            placeholder="My Squad..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />

          {/* friend search */}
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">
              Add Members ({selected.size} selected)
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search friends..."
                className="w-full bg-white/[0.06] border border-white/[0.06] rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#FFFC00]/40 transition-colors"
              />
            </div>

            <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
              {filtered.length === 0 ? (
                <p className="text-white/25 text-sm text-center py-4">
                  {friends.length === 0
                    ? "Add some friends first"
                    : "No friends found"}
                </p>
              ) : (
                filtered.map((f) => {
                  const isSelected = selected.has(f.user.username);
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleFriend(f.user.username)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
                    >
                      <Avatar
                        src={f.user.avatarUrl}
                        username={f.user.username}
                        size="sm"
                      />
                      <span className="text-white text-sm flex-1 text-left">
                        {f.user.username}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-[#FFFC00] border-[#FFFC00]"
                            : "border-white/20"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-black" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <Button
            size="lg"
            disabled={!canCreate}
            loading={isPending}
            onClick={() => createGroup()}
          >
            Create Group
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
