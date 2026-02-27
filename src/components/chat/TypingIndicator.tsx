const TypingIndicator = ({ usernames }: { usernames: string[] }) => {
  if (usernames.length === 0) return null;

  const label = usernames.length === 1
    ? `${usernames[0]} is typing`
    : `${usernames.slice(0, 2).join(' and ')} are typing`;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5">
      {/* three bouncing yellow dots */}
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#FFFC00] inline-block"
            style={{
              animation: 'typingBounce 1s infinite',
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
      <span className="text-white/40 text-xs">{label}</span>

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default TypingIndicator;