import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { brand } from '../brand/brand'
import { useCopy } from '../lib/useSite'
import { Mark } from './Mark'
import { NavPeek } from './NavPeek'
import type { PlanKind } from './PlanArt'
import { RadioControl } from './Radio'
import { Sheet } from './Sheet'

/** Nav links with a little show behind them on hover. */
const PEEKS: Record<string, PlanKind> = { '/tickets': 'tickets', '/birthdays': 'birthdays', '/booths': 'booths' }

export function SiteHeader() {
  const { pathname } = useLocation()
  const { hours, venue } = useCopy()
  // Which link's card is showing: a link's path, "pill" for Get tickets, or none.
  const [peek, setPeek] = useState<string | null>(null)
  const peekProps = (key: string) => ({
    onMouseEnter: () => setPeek(key),
    onMouseLeave: () => setPeek((current) => (current === key ? null : current)),
    onFocus: () => setPeek(key),
    onBlur: () => setPeek((current) => (current === key ? null : current)),
  })
  // The menu remembers the page it was opened on, so any navigation (a link, the back button) closes it.
  const [menuPath, setMenuPath] = useState<string | null>(null)
  const menuOpen = menuPath === pathname
  const setMenuOpen = (open: boolean) => setMenuPath(open ? pathname : null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header className="site-header" data-scrolled={scrolled || undefined}>
        <Link to="/" className="header-logo" aria-label={`${brand.name}, home`} viewTransition>
          <Mark name="logo" />
        </Link>
        <nav className="site-nav" aria-label="Main">
          {brand.nav.map((item) => {
            const kind = PEEKS[item.to]
            const link = (
              <NavLink key={item.to} to={item.to} className="nav-link" viewTransition>
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && <Mark name="oval" className="nav-circle" />}
                  </>
                )}
              </NavLink>
            )
            if (!kind) return link
            return (
              <span key={item.to} className="nav-item" {...peekProps(item.to)}>
                {link}
                <NavPeek kind={kind} active={peek === item.to} />
              </span>
            )
          })}
          <span className="nav-item" {...peekProps('pill')}>
            <Link to="/tickets" className="pill" viewTransition>
              Get tickets
            </Link>
            <NavPeek kind="tickets" active={peek === 'pill'} />
          </span>
        </nav>
        {/* In the header, so it keeps playing as you move between pages. */}
        <RadioControl />
        <button
          type="button"
          className="pill menu-button"
          aria-expanded={menuOpen}
          aria-controls="menu"
          onClick={() => setMenuOpen(true)}
        >
          Menu
        </button>
      </header>

      <Sheet id="menu" open={menuOpen} onClose={() => setMenuOpen(false)} labelledBy="menu-title" side="full">
        <div className="sheet-header">
          <h2 id="menu-title" className="visually-hidden">
            Menu
          </h2>
          <Mark name="logo" className="sheet-logo" />
          <button type="button" className="pill" onClick={() => setMenuOpen(false)}>
            Close
          </button>
        </div>
        <nav aria-label="Menu" className="menu-nav">
          {[{ label: 'Home', to: '/' }, ...brand.nav, ...brand.moreNav].map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className="menu-link" viewTransition>
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && <Mark name="oval" className="menu-circle" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="menu-foot">
          <Link to="/tickets" className="button button--solid" viewTransition>
            Get tickets
          </Link>
          <p className="mono">
            {hours.days} · {hours.time} · {venue.host}, {venue.street}, {venue.locality}
          </p>
        </div>
      </Sheet>
    </>
  )
}
