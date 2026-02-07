import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, RefreshCw, Shield, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PasswordResetRequest {
  id: string;
  email: string;
  status: string;
  requested_at: string;
  expires_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export default function PasswordResetApprovalPanel() {
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("password_reset_requests")
        .select("*")
        .order("requested_at", { ascending: false });

      if (error) throw error;
      setRequests((data as PasswordResetRequest[]) || []);
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load password reset requests"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (requestId: string, action: "approve" | "reject") => {
    setActionLoading(requestId);
    try {
      const { data, error } = await supabase.functions.invoke("password-reset-approve", {
        body: { requestId, action }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: action === "approve" ? "Approved" : "Rejected",
        description: action === "approve" 
          ? "Password has been updated successfully" 
          : "Password reset request has been rejected"
      });

      fetchRequests();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to process request"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "expired":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const processedRequests = requests.filter(r => r.status !== "pending");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Password Reset Requests</CardTitle>
          {pendingRequests.length > 0 && (
            <Badge variant="destructive">{pendingRequests.length} pending</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <Alert>
            <AlertDescription>No password reset requests found.</AlertDescription>
          </Alert>
        ) : (
          <>
            {pendingRequests.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Pending Requests</h4>
                {pendingRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4 bg-yellow-50/50">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{request.email}</span>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Requested {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
                          {" • "}
                          Expires {formatDistanceToNow(new Date(request.expires_at), { addSuffix: true })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => handleAction(request.id, "reject")}
                          disabled={actionLoading === request.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleAction(request.id, "approve")}
                          disabled={actionLoading === request.id}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {processedRequests.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">History</h4>
                {processedRequests.slice(0, 10).map((request) => (
                  <div key={request.id} className="border rounded-lg p-3 bg-muted/30">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{request.email}</span>
                        {getStatusBadge(request.status)}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {request.reviewed_at 
                          ? `Processed ${formatDistanceToNow(new Date(request.reviewed_at), { addSuffix: true })}`
                          : `Requested ${formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}`
                        }
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
