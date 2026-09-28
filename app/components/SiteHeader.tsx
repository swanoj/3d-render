import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { brand } from '../brand/brand'
import { Mark } from './Mark'
import { Sheet } from './Sheet'

export function SiteHeader() {
  const { pathname } = useLocation()
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
          {brand.nav.map((item) => (
            <NavLink key={item.to} to={item.to} className="nav-link" viewTransition>
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && <Mark name="oval" className="nav-circle" />}
                </>
              )}
            </NavLink>
          ))}
          <a href="#list" className="pill">
            Get on the list
          </a>
        </nav>
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
          {[{ label: 'Home', to: '/' }, ...brand.nav].map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className="menu-link" viewTransition>
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && <Mark name="circle" className="menu-circle" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <p className="menu-foot mono">
          {brand.venue.name} · {brand.venue.street}, {brand.venue.locality}
        </p>
      </Sheet>
    </>
  )
}
