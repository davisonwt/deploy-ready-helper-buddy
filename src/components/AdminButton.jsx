import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Settings } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useRoles } from "../hooks/useRoles";

export function AdminButton() {
  const { user, isAuthenticated } = useAuth();
  const { userRoles, loading, isAdmin, isGosat, isAdminOrGosat } = useRoles();

  // Debug logging
  console.log('🔥 AdminButton Debug:', {
    user: !!user,
    isAuthenticated,
    userRoles,
    loading,
    isAdmin: isAdmin(),
    isGosat: isGosat(),
    isAdminOrGosat: isAdminOrGosat()
  });

  // Always show button for debugging - we'll see what's happening
  return (
    <div className="border border-red-500 p-2">
      <div className="text-xs text-red-500 mb-1">
        Auth: {isAuthenticated ? 'YES' : 'NO'} | Roles: {JSON.stringify(userRoles)} | Loading: {loading ? 'YES' : 'NO'}
      </div>
      {isAuthenticated && userRoles.length > 0 && (
        <Link to="/admin/dashboard">
          <Button 
            variant="outline"
            className="bg-[#20b2aa] border-[#20b2aa] text-white hover:bg-[#20b2aa]/90 hover:border-[#20b2aa]/90"
          >
            <Settings className="w-4 h-4 mr-2" />
            gosat's ({userRoles.join(', ')})
          </Button>
        </Link>
      )}
    </div>
  );
}