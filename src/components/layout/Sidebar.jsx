import { NavLink } from 'react-router-dom';

// Canonical nav definition for the whole shell. TopBar imports this so the
// desktop rail and the narrow-screen bar can never drift apart.
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '/icons/dashboard.svg' },
  { to: '/alerts', label: 'Alerts', icon: '/icons/bell.svg' },
  { to: '/farmers', label: 'Farmers', icon: '/icons/users.svg' },
  { to: '/diagnosis', label: 'Crop diagnosis', icon: '/icons/leaf.svg' },
  { to: '/resources', label: 'Resources', icon: '/icons/box.svg' },
  { to: '/training', label: 'Training hub', icon: '/icons/book.svg' },
  { to: '/analytics', label: 'Analytics', icon: '/icons/chart.svg' },
  { to: '/profile', label: 'Profile', icon: '/icons/settings.svg' },
];

// The icon SVGs are authored with stroke="currentColor", but this Vite setup has
// no SVGR plugin, so they resolve to plain URLs and an <img> would always paint
// black. Masking the shape and filling it with currentColor keeps the design's
// per-state icon colour without inlining or adding a plugin.
export function NavIcon({ src, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        backgroundColor: 'currentColor',
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  );
}

export function Brand({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="/logo/agribridge-mark-white.svg"
        alt=""
        className="block h-7 w-7 flex-none"
      />
      <span className="font-display text-xl font-semibold tracking-[-0.01em] text-white">
        AgriBridge
      </span>
    </div>
  );
}

export default function Sidebar({ officerName, officerRegion }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] flex-none flex-col gap-8 bg-primaryDark p-[32px_16px] md:flex">
      <Brand className="px-2" />

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-semibold transition-colors duration-150',
                isActive
                  ? 'bg-bg text-primaryDark'
                  : 'text-[#DCEBDD] hover:bg-white/[0.12]',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <NavIcon
                  src={item.icon}
                  className={`flex h-5 w-5 flex-none ${
                    isActive ? 'text-primaryDark' : 'text-[#C7DDC8]'
                  }`}
                />
                <span className="flex-1 whitespace-nowrap">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* TODO: replace with the signed-in officer from AuthProvider once auth lands. */}
      <div className="mt-auto rounded-2xl bg-white/10 p-4">
        <div className="mb-2 text-[11px] uppercase tracking-[.08em] text-[#BFDCC0]">
          Signed in as
        </div>
        <div className="text-sm font-semibold text-white">{officerName}</div>
        <div className="mt-1 text-xs text-[#BFDCC0]">{officerRegion}</div>
      </div>
    </aside>
  );
}
