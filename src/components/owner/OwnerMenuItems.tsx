import { useNavigate } from 'react-router-dom';
import { Pencil, Sprout, Package, TreePine } from 'lucide-react';

export interface OwnerMenuItem {
  label: string;
  path: string;
  icon: typeof Pencil;
}

/**
 * The 4-item Owner Menu (Flow v2 step 5, docs/FLOW-V2-MAP.md): Edit stall
 * (the wizard, absorbs /my-products, /my-s2g-library, /profile, seller
 * settings), Sow a seed (/sow + every /sow/* leaf), Bulk upload seeds
 * (/dashboard/sower/upload + every /bulk/* page), My orchards (its own
 * item, NOT folded into Edit stall). Every target is already a live route
 * -- this is new UI chrome in front of working destinations, not a
 * rebuild of any of them.
 *
 * Two real trigger points share this same list: the stall interior's
 * header tap (owner only) and the Cockpit bottom bar's "Plant Seed"
 * button -- each wraps this differently (a small dropdown vs. a Popover),
 * so this component is presentation-only: it renders the 4 buttons and
 * lets the caller supply their own item styling/container.
 */
export const OWNER_MENU_ITEMS: OwnerMenuItem[] = [
  { label: 'Edit stall', path: '/stall/build', icon: Pencil },
  { label: 'Sow a seed', path: '/sow', icon: Sprout },
  { label: 'Bulk upload seeds', path: '/dashboard/sower/upload', icon: Package },
  { label: 'My orchards', path: '/my-orchards', icon: TreePine },
];

interface Props {
  /** Called once, after navigating -- lets the caller close its own menu/popover. */
  onNavigate?: () => void;
  className?: string;
  itemClassName?: string;
}

export default function OwnerMenuItems({ onNavigate, className, itemClassName }: Props) {
  const navigate = useNavigate();
  return (
    <div className={className}>
      {OWNER_MENU_ITEMS.map(({ label, path, icon: Icon }) => (
        <button
          key={path}
          type="button"
          onClick={() => { navigate(path); onNavigate?.(); }}
          className={itemClassName}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
