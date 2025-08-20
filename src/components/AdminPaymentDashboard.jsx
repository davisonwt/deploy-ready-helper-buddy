import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SecureInput } from '@/components/ui/secure-input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet, 
  TrendingUp, 
  Users, 
  DollarSign, 
  RefreshCw, 
  Settings,
  Copy,
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';
import { useOrganizationWallet } from '@/hooks/useOrganizationWallet';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export function AdminPaymentDashboard() {
  const {
    organizationWallet,
    payments,
    loading,
    fetchPayments,
    updateWalletAddress
  } = useOrganizationWallet();
  
  const { toast } = useToast();
  const { user } = useAuth();
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterToken, setFilterToken] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    if (organizationWallet) {
      setNewWalletAddress(organizationWallet.wallet_address);
    }
  }, [organizationWallet]);

  const handleUpdateWallet = async () => {
    if (newWalletAddress !== organizationWallet.wallet_address) {
      await updateWalletAddress(newWalletAddress);
      setIsEditing(false);
    }
  };

  const copyToClipboard = async (text, description = "copied to clipboard") => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${description}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const openSolscan = (signature) => {
    const url = `https://solscan.io/tx/${signature}`;
    window.open(url, '_blank');
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = searchTerm === '' || 
      payment.sender_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transaction_signature.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.memo && payment.memo.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesToken = filterToken === 'all' || payment.token_symbol === filterToken;
    const matchesStatus = filterStatus === 'all' || payment.confirmation_status === filterStatus;
    
    return matchesSearch && matchesToken && matchesStatus;
  });

  const getTotalAmount = (tokenSymbol) => {
    return payments
      .filter(p => p.token_symbol === tokenSymbol && p.confirmation_status === 'confirmed')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);
  };

  const getUniqueTokens = () => {
    return [...new Set(payments.map(p => p.token_symbol))];
  };

  const formatAmount = (amount, symbol) => {
    const num = parseFloat(amount);
    return `${num.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${symbol}`;
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage organization payments</p>
        </div>
        <Button onClick={() => fetchPayments()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{payments.length}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Senders</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(payments.map(p => p.sender_address)).size}
                </div>
                <p className="text-xs text-muted-foreground">Different wallets</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {payments.filter(p => p.confirmation_status === 'confirmed').length}
                </div>
                <p className="text-xs text-muted-foreground">Successful payments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {payments.filter(p => p.confirmation_status === 'pending').length}
                </div>
                <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
              </CardContent>
            </Card>
          </div>

          {/* Token Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Token Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {getUniqueTokens().map(token => (
                  <div key={token} className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {formatAmount(getTotalAmount(token), '')}
                    </div>
                    <div className="text-lg font-medium text-muted-foreground">
                      {token}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {payments.filter(p => p.token_symbol === token && p.confirmation_status === 'confirmed').length} payments
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <SecureInput
                      placeholder="Search by address, signature, or memo"
                      sanitizeType="text"
                      maxLength={100}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      rateLimitKey="admin_search"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Token</label>
                  <Select value={filterToken} onValueChange={setFilterToken}>
                    <SelectTrigger>
                      <SelectValue placeholder="All tokens" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tokens</SelectItem>
                      {getUniqueTokens().map(token => (
                        <SelectItem key={token} value={token}>{token}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History ({filteredPayments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Token</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Memo</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {new Date(payment.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {formatAddress(payment.sender_address)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(payment.sender_address, "Sender address copied")}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatAmount(payment.amount, '')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{payment.token_symbol}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            payment.confirmation_status === 'confirmed' ? 'default' :
                            payment.confirmation_status === 'pending' ? 'secondary' : 'destructive'
                          }>
                            {payment.confirmation_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {payment.memo || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openSolscan(payment.transaction_signature)}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(payment.transaction_signature, "Transaction signature copied")}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* Wallet Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Wallet Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Organization Wallet Address</label>
                <div className="flex gap-2">
                  <SecureInput
                    value={newWalletAddress}
                    sanitizeType="text"
                    maxLength={100}
                    onChange={(e) => setNewWalletAddress(e.target.value)}
                    disabled={!isEditing}
                    className="font-mono"
                    rateLimitKey="wallet_address"
                  />
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Button onClick={handleUpdateWallet}>Save</Button>
                      <Button variant="outline" onClick={() => {
                        setIsEditing(false);
                        setNewWalletAddress(organizationWallet.wallet_address);
                      }}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      Edit
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  This is the wallet address where payments will be received. Only change this if you need to use a different wallet.
                </p>
              </div>

              {organizationWallet && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium">Wallet Name</label>
                    <p className="text-sm text-muted-foreground">{organizationWallet.wallet_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <p className="text-sm text-muted-foreground">
                      <Badge variant={organizationWallet.is_active ? 'default' : 'secondary'}>
                        {organizationWallet.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Supported Tokens</label>
                    <div className="flex flex-wrap gap-1">
                      {organizationWallet.supported_tokens.map(token => (
                        <Badge key={token} variant="outline" className="text-xs">
                          {token}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Created</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(organizationWallet.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}