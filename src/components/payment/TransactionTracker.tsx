import { useState, useEffect } from 'react';
import { connection } from '@/lib/solana';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const TransactionTracker = ({ signature }: { signature: string }) => {
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'failed'>('pending');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!signature) return;

    const checkTx = async () => {
      try {
        const tx = await connection.getTransaction(signature, { commitment: 'confirmed' });
        if (tx) {
          if (tx.meta?.err) {
            setStatus('failed');
            setError('Transaction failed');
          } else {
            setStatus('confirmed');
          }
        }
      } catch (err) {
        setError('Error checking tx');
      }
    };

    checkTx();
    const interval = setInterval(checkTx, 5000);

    return () => clearInterval(interval);
  }, [signature]);

  return (
    <Card className="w-full max-w-md mx-auto mt-4">
      <CardHeader>
        <CardTitle>Transaction Status</CardTitle>
      </CardHeader>
      <CardContent>
        <Badge variant={status === 'confirmed' ? 'default' : status === 'failed' ? 'destructive' : 'secondary'}>
          {status === 'confirmed' ? <CheckCircle2 className="mr-1" /> : status === 'failed' ? <AlertCircle className="mr-1" /> : null}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
};

export default TransactionTracker;