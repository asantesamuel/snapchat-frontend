import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  bottomText?: string;
  bottomLinkText?: string;
  bottomLinkTo?: string;
}

const AuthLayout = ({
  children,
  title,
  subtitle,
  bottomText,
  bottomLinkText,
  bottomLinkTo,
}: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* subtle dot grid background — classic Snapchat texture */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* top yellow accent bar */}
      <div className="h-1 w-full bg-[#FFFC00]" />

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 relative">

        {/* logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative">
            {/* Snapchat ghost silhouette using CSS */}
            {/* <div className="w-16 h-16 bg-[#FFFC00] rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(255,252,0,0.3)]">
              <svg viewBox="0 0 100 100" className="w-10 h-10" fill="black">
                <path d="M50 10C33 10 22 22 22 38c0 5 1 9 3 13l-4 2c-1 0.5-1.5 2-0.5 3l1 2c0.5 1 2 1.5 3 1l2-1c2 3 5 5 8 6-1 2-4 3-8 4-1 0.3-2 1.5-1.5 2.5 0.5 2 4 3 9 4 0.5 1 1 3 2 4 0.5 1 1.5 1 2.5 0.8 1-0.2 3-0.8 6-0.8s5 0.6 6 0.8c1 0.2 2-0.2 2.5-0.8 1-1 1.5-3 2-4 5-1 8.5-2 9-4 0.5-1-0.5-2.2-1.5-2.5-4-1-7-2-8-4 3-1 6-3 8-6l2 1c1 0.5 2.5 0 3-1l1-2c1-1 0.5-2.5-0.5-3l-4-2c2-4 3-8 3-13C78 22 67 10 50 10z"/>
              </svg>
            </div> */}
            <div className="absolute -inset-1 rounded-2xl bg-[#FFFC00]/20 blur-xl -z-10" />
          </div>
          <span className="text-white font-black text-2xl tracking-tight">Snapchat</span>
        </div>

        {/* card */}
        <div className="w-full max-w-sm">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-8 backdrop-blur-sm">
            <div className="mb-6">
              <h1 className="text-white text-2xl font-black tracking-tight">{title}</h1>
              {subtitle && (
                <p className="text-white/50 text-sm mt-1">{subtitle}</p>
              )}
            </div>
            {children}
          </div>

          {/* bottom link */}
          {bottomText && bottomLinkText && bottomLinkTo && (
            <p className="text-center text-white/40 text-sm mt-6">
              {bottomText}{' '}
              <Link
                to={bottomLinkTo}
                className="text-[#FFFC00] font-semibold hover:underline transition-colors"
              >
                {bottomLinkText}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;