import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Heart, Users, Target, TrendingUp, Gift } from 'lucide-react';
import PaymentModal from './PaymentModal';

const BestowalUI = ({ orchard, onBestow }) => {
  const [selectedPockets, setSelectedPockets] = useState([]);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Map real orchard data to expected format
  const orchardData = orchard ? {
    title: orchard.title || "Orchard Project",
    description: orchard.description || "Help support this orchard",
    target: orchard.seed_value || orchard.original_seed_value || 0,
    current: (orchard.filled_pockets || 0) * (orchard.pocket_price || 0),
    supporters: orchard.supporters || 0,
    pockets: orchard.total_pockets || 0,
    filledPockets: orchard.filled_pockets || 0,
    pocketValue: orchard.pocket_price || 0
  } : {
    title: "Community Garden Project",
    description: "Help us grow fresh vegetables for local families",
    target: 10000,
    current: 6500,
    supporters: 45,
    pockets: 100,
    filledPockets: 65,
    pocketValue: 100
  };

  const progress = (orchardData.current / orchardData.target) * 100;
  const remainingPockets = orchardData.pockets - orchardData.filledPockets;

  // Generate pocket grid
  const pockets = Array.from({ length: orchardData.pockets }, (_, i) => ({
    id: i + 1,
    filled: i < orchardData.filledPockets,
    value: orchardData.pocketValue
  }));

  const handlePocketSelect = (pocketId) => {
    const pocket = pockets.find(p => p.id === pocketId);
    if (pocket.filled) return;

    setSelectedPockets(prev => {
      if (prev.includes(pocketId)) {
        return prev.filter(id => id !== pocketId);
      } else {
        return [...prev, pocketId];
      }
    });
  };

  const handleAmountSelect = (amount) => {
    setSelectedAmount(amount);
    setSelectedPockets([]);
  };

  const handleBestow = () => {
    const amount = selectedAmount || (selectedPockets.length * orchardData.pocketValue);
    if (amount > 0) {
      setShowPaymentModal(true);
    }
  };

  const handlePaymentComplete = () => {
    setShowPaymentModal(false);
    setSelectedPockets([]);
    setSelectedAmount(null);
    onBestow?.(totalAmount, currency, selectedPockets);
  };

  const totalAmount = selectedAmount || (selectedPockets.length * orchardData.pocketValue);

  return (
    <div className="bestowal-ui">
      {/* Orchard Header */}
      <div className="orchard-header">
        <h2 className="text-2xl font-bold text-foreground mb-2">{orchardData.title}</h2>
        <p className="text-muted-foreground">{orchardData.description}</p>
      </div>

      {/* Orchard Stats */}
      <div className="orchard-stats">
        <Card className="stat-card border-success/20">
          <CardContent className="p-3 text-center">
            <Target className="h-5 w-5 text-success mx-auto mb-1" />
            <div className="font-bold text-foreground">${orchardData.target.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Target</div>
          </CardContent>
        </Card>
        
        <Card className="stat-card border-info/20">
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-5 w-5 text-info mx-auto mb-1" />
            <div className="font-bold text-foreground">${orchardData.current.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Raised</div>
          </CardContent>
        </Card>
        
        <Card className="stat-card border-warning/20">
          <CardContent className="p-3 text-center">
            <Users className="h-5 w-5 text-warning mx-auto mb-1" />
            <div className="font-bold text-foreground">{orchardData.supporters}</div>
            <div className="text-xs text-muted-foreground">Supporters</div>
          </CardContent>
        </Card>
        
        <Card className="stat-card border-harvest/20">
          <CardContent className="p-3 text-center">
            <Gift className="h-5 w-5 text-harvest mx-auto mb-1" />
            <div className="font-bold text-foreground">{remainingPockets}</div>
            <div className="text-xs text-muted-foreground">Available</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <Progress value={progress} className="h-3" />
        <div className="flex justify-between text-sm text-muted-foreground mt-1">
          <span>{progress.toFixed(1)}% funded</span>
          <span>${(orchardData.target - orchardData.current).toLocaleString()} to go</span>
        </div>
      </div>

      {/* Pocket Info */}
      <div className="pocket-info">
        <h3 className="font-semibold text-info mb-2">How Pockets Work</h3>
        <p className="text-sm text-muted-foreground">
          Each pocket represents ${orchardData.pocketValue} towards this orchard. 
          Select available pockets to make your bestowal, or choose a custom amount below.
        </p>
      </div>

      {/* Note: Pocket grid is handled by AnimatedOrchardGrid component */}

      {/* Quick Amount Selection */}
      <div className="amount-grid">
        {[100, 250, 500, 1000].map((amount) => (
          <button
            key={amount}
            className={`amount-btn ${selectedAmount === amount ? 'active' : ''}`}
            onClick={() => handleAmountSelect(amount)}
          >
            ${amount}
          </button>
        ))}
      </div>

      {/* Payment Options */}
      <div className="payment-options">
        {totalAmount > 0 && (
          <div className="mb-4 p-4 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-success">
              <Heart className="h-5 w-5" />
              <span className="font-semibold">
                Your Bestowal: ${totalAmount} {currency}
              </span>
            </div>
            {selectedPockets.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedPockets.length} pocket{selectedPockets.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        )}
        
        <Button
          onClick={handleBestow}
          disabled={totalAmount === 0}
          className="w-full bg-success hover:bg-success/90 text-success-foreground"
          size="lg"
        >
          <Gift className="h-5 w-5 mr-2" />
          Bestow ${totalAmount || 0}
        </Button>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={totalAmount}
        currency={currency}
        orchardId={orchard?.id}
        pocketsCount={selectedPockets.length}
        pocketNumbers={selectedPockets}
        orchardTitle={orchardData.title}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
};

export default BestowalUI;