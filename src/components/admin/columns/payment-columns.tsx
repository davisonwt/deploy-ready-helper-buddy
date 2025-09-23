import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface PaymentData {
  id: string;
  sender_address: string;
  recipient_address: string;
  amount: number;
  token_symbol: string;
  confirmation_status: string;
  transaction_signature: string;
  memo: string;
  created_at: string;
  block_time: string;
}

const formatAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
};

const copyToClipboard = async (text: string, description: string) => {
  try {
    await navigator.clipboard.writeText(text);
    // Note: toast will need to be handled by parent component
    console.log(`${description} copied to clipboard`);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
  }
};

const openSolscan = (signature: string) => {
  const url = `https://solscan.io/tx/${signature}`;
  window.open(url, '_blank');
};

export const paymentColumns: ColumnDef<PaymentData>[] = [
  {
    accessorKey: 'created_at',
    header: 'Date',
    cell: ({ row }) => {
      const date = new Date(row.original.created_at);
      return (
        <div className="text-sm">
          {format(date, 'MMM dd, yyyy')}
          <div className="text-xs text-muted-foreground">
            {format(date, 'HH:mm')}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'sender_address',
    header: 'From',
    cell: ({ row }) => {
      const address = row.original.sender_address;
      return (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">
            {formatAddress(address)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => copyToClipboard(address, "Sender address")}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      );
    },
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
      const amount = parseFloat(row.original.amount.toString());
      const symbol = row.original.token_symbol;
      return (
        <div className="font-mono text-sm">
          {amount.toLocaleString(undefined, { 
            maximumFractionDigits: 6 
          })} {symbol}
        </div>
      );
    },
  },
  {
    accessorKey: 'token_symbol',
    header: 'Token',
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.original.token_symbol}
      </Badge>
    ),
  },
  {
    accessorKey: 'confirmation_status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.confirmation_status;
      const variant = status === 'confirmed' ? 'default' : 
                    status === 'pending' ? 'secondary' : 'destructive';
      return (
        <Badge variant={variant}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'memo',
    header: 'Memo',
    cell: ({ row }) => {
      const memo = row.original.memo;
      return (
        <div className="max-w-[150px] truncate text-sm">
          {memo || '-'}
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const signature = row.original.transaction_signature;
      
      return (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => openSolscan(signature)}
            title="View on Solscan"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => copyToClipboard(signature, "Transaction signature")}
            title="Copy transaction signature"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      );
    },
  },
];