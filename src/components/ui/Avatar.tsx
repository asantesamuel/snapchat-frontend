import { cn } from '@/utils/cn';

interface AvatarProps {
  src?: string | null;
  username?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  ring?: boolean;
}

const sizes = {
  xs: 'h-7 w-7 text-xs',
  sm: 'h-9 w-9 text-sm',
  md: 'h-11 w-11 text-base',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-3xl',
};

const Avatar = ({ src, username, size = 'md', className, ring }: AvatarProps) => {
  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : '?';

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-[#FFFC00]',
        ring && 'ring-2 ring-[#FFFC00] ring-offset-2 ring-offset-black',
        sizes[size],
        className
      )}
    >
      {src ? (
        <img src={src} alt={username || 'avatar'} className="h-full w-full object-cover" />
      ) : (
        <span className="font-black text-black">{initials}</span>
      )}
    </div>
  );
};

export default Avatar;