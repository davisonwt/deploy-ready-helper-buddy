import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Settings, ChevronDown, Radio, Sprout, Wallet, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function AdminButton() {
  const auth = useAuth();
  const [userRoles, setUserRoles] = useState<string[]>([]);
  // Plain useState toggle instead of Radix's DropdownMenu -- reported
  // live, 2026-09-15: the button rendered (roles fetched fine, teal
  // "gosat's (...)" text visible) but tapping it did NOTHING, no dropdown,
  // no navigation. Radix's own DropdownMenuContent already renders via a
  // Portal (see ui/dropdown-menu.tsx), so it wasn't the same
  // clipped-by-ancestor-overflow bug as the phone-portrait spotlight
  // popup -- with no live admin credential available to inspect the
  // actual DOM/click behavior directly, the safest fix is to stop relying
  // on Radix's context/portal wiring here at all and use the same
  // plain-state fixed-panel pattern already proven working elsewhere in
  // this codebase (PortraitQueueSheet, PortraitTileActionsSheet) --
  // nothing for a version/context mismatch to silently break.
  //
  // `position: fixed`, coordinates computed from the trigger's own
  // getBoundingClientRect(), not `absolute` relative to this component's
  // own wrapper -- this renders inside StallSideNav, which mounts inside a
  // slide-in mobile drawer (StallDrawer) elsewhere in the app. An
  // `absolute` panel can still be clipped by ANY ancestor with
  // overflow:hidden between it and the viewport (the exact bug class just
  // fixed for the phone-portrait spotlight popup); `fixed` cannot be
  // clipped by ancestor overflow at all, so this can't repeat that failure
  // regardless of which page/drawer renders this button. Also portaled to
  // document.body, belt-and-suspenders on top of `fixed` alone.
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // TEMPORARY diagnostic instrumentation (2026-09-15) -- reported live:
  // clicking this button does nothing, no dropdown, no error visible to
  // the user. Console-only, no behavior change; remove once the root
  // cause is confirmed from real console output.
  useEffect(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const topEl = document.elementFromPoint(cx, cy);
    console.error('[AdminButton DIAG] trigger mounted', {
      rect: { top: r.top, left: r.left, width: r.width, height: r.height },
      elementAtCenter: topEl ? { tag: topEl.tagName, className: (topEl as HTMLElement).className, id: topEl.id } : null,
      isTriggerItself: topEl === triggerRef.current,
      userRoles,
    });
  }, [userRoles]);

  useEffect(() => {
    if (!open) return;
    console.error('[AdminButton DIAG] open effect running (open=true)');
    // Root cause, confirmed live 2026-09-15: this positioned itself via
    // `right: window.innerWidth - trigger.right`, i.e. relative to the
    // trigger's distance from the RIGHT edge -- correct for a
    // top-right-corner trigger, but this button lives in StallSideNav,
    // the LEFT-hand nav column (x near 0). For a trigger there, that
    // math produces a huge `right` value, pushing the 256px (w-64) panel
    // off the LEFT edge of the viewport entirely -- state (`open`,
    // `menuPos`) was correct the whole time; the panel was just rendered
    // off-screen. Position from the trigger's own LEFT edge instead,
    // clamped to stay inside the viewport regardless of which side of
    // the screen the trigger ends up on.
    const MENU_WIDTH = 256; // w-64
    const VIEWPORT_MARGIN = 8;
    const updatePos = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const left = Math.max(
        VIEWPORT_MARGIN,
        Math.min(r.left, window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN)
      );
      const next = { top: r.bottom + 4, left };
      console.error('[AdminButton DIAG] computed menuPos', { ...next, triggerRect: { top: r.top, left: r.left, right: r.right, bottom: r.bottom }, viewportWidth: window.innerWidth });
      setMenuPos(next);
    };
    updatePos();
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [open]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!auth?.user?.id) { setUserRoles([]); return; }
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', auth.user.id);
        if (error) throw error;
        if (!isMounted) return;
        setUserRoles((data || []).map((r: { role: string }) => r.role));
      } catch (e) {
        console.error('AdminButton: roles fetch failed', e);
        if (isMounted) setUserRoles([]);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [auth?.user?.id]);

  if (!(auth?.isAuthenticated && userRoles.length > 0)) return null;

  const items = [
    { to: '/admin/dashboard', icon: Settings, label: 'Admin Dashboard & Wallet Settings' },
    { to: '/admin/radio', icon: Radio, label: 'AOD Station Radio Management' },
    { to: '/admin/treasury', icon: Wallet, label: 'Treasury' },
    { to: '/admin/seeds', icon: Sprout, label: 'Seeds Management' },
  ];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onPointerDown={() => console.error('[AdminButton DIAG] trigger onPointerDown fired')}
        onClick={() => {
          console.error('[AdminButton DIAG] trigger onClick fired', { openBefore: open });
          try {
            setOpen((v) => !v);
          } catch (e) {
            console.error('[AdminButton DIAG] setOpen threw', e);
          }
        }}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex items-center rounded-2xl border-2 border-[#20b2aa] bg-[#20b2aa] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#20b2aa]/90 hover:border-[#20b2aa]/90"
      >
        <Settings className="w-3 h-3 mr-1" />
        gosat's ({userRoles.join(', ')})
        <ChevronDown className="w-3 h-3 ml-1" />
      </button>
      {(() => { console.error('[AdminButton DIAG] render decision', { open, menuPos, willRenderMenu: !!(open && menuPos) }); return null; })()}
      {open && menuPos && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
          className="z-[1000] w-64 rounded-md border bg-white text-[#0A1931] shadow-lg"
        >
          <div className="flex items-center justify-between border-b px-2 py-1.5 sm:hidden">
            <span className="text-xs font-semibold">Gosat's</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close"><X className="w-4 h-4" /></button>
          </div>
          {items.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </Link>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
