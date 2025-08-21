import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Settings } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useRoles } from "../hooks/useRoles";

export function AdminButton() {
  const auth = useAuth();
  const roles = useRoles();

  // Debug logging
  console.log('🔥 AdminButton Full Debug:', {
    auth,
    roles
  });

  // Show debug info  
  return (
    <div className="border border-red-500 p-2 max-w-md">
      <div className="text-xs text-red-500 mb-1">
        Auth: {auth?.isAuthenticated ? 'YES' : 'NO'} | User ID: {auth?.user?.id || 'NONE'}
      </div>
      <div className="text-xs text-red-500 mb-1">
        Roles: {JSON.stringify(roles?.userRoles || [])} | Loading: {roles?.loading ? 'YES' : 'NO'}
      </div>
      {auth?.isAuthenticated && roles?.userRoles?.length > 0 && (
        <Link to="/admin/dashboard">
          <Button 
            variant="outline"
            className="bg-[#20b2aa] border-[#20b2aa] text-white hover:bg-[#20b2aa]/90 hover:border-[#20b2aa]/90 text-xs"
          >
            <Settings className="w-3 h-3 mr-1" />
            gosat's ({roles.userRoles.join(', ')})
          </Button>
        </Link>
      )}
    </div>
  );
}