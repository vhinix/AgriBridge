import { NavLink } from 'react-router-dom';

import { Brand, NAV_ITEMS, NavIcon } from './Sidebar';

// Below the shell breakpoint the design collapses the sidebar into a sticky
// green bar: same brand, same nav, icons only, scrolling horizontally.
export default function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex flex-col gap-4 bg-primaryDark p-4 md:hidden">
      <Brand className="px-1" />

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            aria-label={item.label}
            className={({ isActive }) =>
              [
                'flex flex-none items-center gap-3 rounded-xl p-3 text-left text-sm font-semibold transition-colors duration-150',
                isActive
                  ? 'bg-bg text-primaryDark'
                  : 'text-[#DCEBDD] hover:bg-white/[0.12]',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <NavIcon
                src={item.icon}
                className={`flex h-5 w-5 flex-none ${
                  isActive ? 'text-primaryDark' : 'text-[#C7DDC8]'
                }`}
              />
            )}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
