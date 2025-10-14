import React from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Settings, ChevronDown, Radio, Sprout } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function AdminButton() {
  const auth = useAuth();
  const [userRoles, setUserRoles] = React.useState([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    let isMounted = true
    const load = async () => {
      if (!auth?.user?.id) { setUserRoles([]); return }
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', auth.user.id)
        if (error) throw error
        if (!isMounted) return
        setUserRoles((data || []).map(r => r.role))
      } catch (e) {
        console.error('AdminButton: roles fetch failed', e)
        if (isMounted) setUserRoles([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [auth?.user?.id])

  // Debug logging
  console.log('🔥 AdminButton Full Debug:', {
    'auth.user.id': auth?.user?.id,
    'auth.isAuthenticated': auth?.isAuthenticated,
    'roles.userRoles': userRoles,
    'roles.loading': loading
  });

  // Show debug info  
  return (
    <div className="border border-red-500 p-2 max-w-md">
      <div className="text-xs text-red-500 mb-1">
        Auth: {auth?.isAuthenticated ? 'YES' : 'NO'} | User ID: {auth?.user?.id || 'NONE'}
      </div>
      <div className="text-xs text-red-500 mb-1">
        Roles: {JSON.stringify(userRoles || [])} | Loading: {loading ? 'YES' : 'NO'}
      </div>
      <div className="flex gap-2 items-center">
        {auth?.isAuthenticated && (userRoles?.length > 0) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline"
                className="bg-[#20b2aa] border-[#20b2aa] text-white hover:bg-[#20b2aa]/90 hover:border-[#20b2aa]/90 text-xs"
              >
                <Settings className="w-3 h-3 mr-1" />
                gosat's ({userRoles.join(', ')})
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background border shadow-lg z-50">
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/admin/radio" className="flex items-center w-full px-2 py-1.5">
                  <Radio className="w-4 h-4 mr-2" />
                  AOD Station Radio Management
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/admin/seeds" className="flex items-center w-full px-2 py-1.5">
                  <Sprout className="w-4 h-4 mr-2" />
                  Seeds Management
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {auth?.isAuthenticated && (
          <Button 
            onClick={auth.logout}
            variant="outline"
            size="sm"
            className="text-xs border-red-500 text-red-500 hover:bg-red-50"
          >
            Reset Session
          </Button>
        )}
      </div>
    </div>
  );
}