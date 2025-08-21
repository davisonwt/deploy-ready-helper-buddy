import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Settings } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useRoles } from "../hooks/useRoles";

export function AdminButton() {
  const { user } = useAuth();
  const { isAdminOrGosat, loading } = useRoles();

  // Don't show anything if not logged in or still loading
  if (!user || loading) {
    return null;
  }

  // Only show if user has admin or gosat role
  if (!isAdminOrGosat()) {
    return null;
  }

  return (
    <Link to="/admin/dashboard">
      <Button 
        variant="outline"
        className="bg-[#20b2aa] border-[#20b2aa] text-white hover:bg-[#20b2aa]/90 hover:border-[#20b2aa]/90"
      >
        <Settings className="w-4 h-4 mr-2" />
        gosat's
      </Button>
    </Link>
  );
}