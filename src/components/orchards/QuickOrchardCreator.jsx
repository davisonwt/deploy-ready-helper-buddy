import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Sprout, 
  Gift, 
  Calculator,
  Upload,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Heart,
  CheckCircle
} from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

const QUICK_ORCHARD_TYPES = [
  {
    value: 'standard',
    title: 'Standard Orchard',
    description: 'For goals over $100 USDC',
    icon: Sprout,
    color: 'bg-green-50 border-green-200',
    features: ['Flexible pocket pricing', 'Community support', 'Growth tracking']
  },
  {
    value: 'full_value',
    title: 'Full Value Orchard',
    description: 'For goals $1-100 USDC',
    icon: Gift,
    color: 'bg-purple-50 border-purple-200',
    features: ['Fixed pocket count', 'Quick funding', 'Simple setup']
  }
];

const POPULAR_CATEGORIES = [
  "The Gift of Education & Training",
  "The Gift of Technology & Hardware (Consumer Electronics)",
  "The Gift of Health & Medical",
  "The Gift of Business Solutions",
  "The Gift of Social Impact",
  "The Gift of Community Development"
];

export function QuickOrchardCreator({ onCreateOrchard, onClose }) {
  const [step, setStep] = useState(1); // 1: Type, 2: Details, 3: Pricing, 4: Review
  const [orchardType, setOrchardType] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    seed_value: '',
    pocket_price: '150',
    number_of_pockets: '1',
    location: '',
    why_needed: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const { currency } = useCurrency();

  useEffect(() => {
    if (currency) {
      setFormData(prev => ({ ...prev, currency }));
    }
  }, [currency]);

  const handleTypeSelect = (type) => {
    setOrchardType(type);
    setStep(2);
  };

  const calculateTotal = () => {
    const seedValue = parseFloat(formData.seed_value) || 0;
    if (orchardType?.value === 'full_value') {
      const pockets = parseInt(formData.number_of_pockets) || 1;
      return (seedValue * 1.105 * pockets).toFixed(2);
    }
    return (seedValue * 1.105).toFixed(2);
  };

  const calculatePockets = () => {
    const seedValue = parseFloat(formData.seed_value) || 0;
    if (orchardType?.value === 'full_value') {
      return parseInt(formData.number_of_pockets) || 1;
    }
    const total = seedValue * 1.105;
    const pocketPrice = parseFloat(formData.pocket_price) || 150;
    return Math.floor(total / pocketPrice);
  };

  const handleCreateOrchard = async () => {
    setIsCreating(true);
    try {
      const orchardData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        orchard_type: orchardType.value,
        seed_value: parseFloat(formData.seed_value),
        pocket_price: orchardType.value === 'full_value' 
          ? parseFloat(formData.seed_value) * 1.105 / parseInt(formData.number_of_pockets)
          : parseFloat(formData.pocket_price),
        intended_pockets: orchardType.value === 'full_value' 
          ? parseInt(formData.number_of_pockets) 
          : 1,
        location: formData.location?.trim() || "",
        why_needed: formData.why_needed?.trim() || "",
        currency: "USDC"
      };

      await onCreateOrchard(orchardData);
    } catch (error) {
      console.error('Error creating orchard:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Step 1: Choose Orchard Type
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Create Your Orchard 🌱</h1>
            <p className="text-xl text-gray-600">Choose the perfect type for your goal</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {QUICK_ORCHARD_TYPES.map((type) => {
              const IconComponent = type.icon;
              return (
                <Card 
                  key={type.value}
                  className={`${type.color} cursor-pointer hover:scale-105 transition-all duration-300 hover:shadow-xl`}
                  onClick={() => handleTypeSelect(type)}
                >
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
                      <IconComponent className="h-10 w-10 text-gray-700" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">{type.title}</CardTitle>
                    <p className="text-gray-600 text-lg">{type.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-6">
                      {type.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full" size="lg">
                      Choose {type.title}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center">
            <Button onClick={onClose} variant="outline" size="lg">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Basic Details
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
              <orchardType.icon className="h-10 w-10 text-gray-700" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{orchardType.title}</h1>
            <p className="text-gray-600">Tell us about your goal</p>
          </div>

          <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
            <CardContent className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  What are you trying to achieve? *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., New laptop for coding bootcamp"
                  className="text-lg py-3"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category
                </label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {POPULAR_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Why do you need this? *
                </label>
                <Textarea
                  value={formData.why_needed}
                  onChange={(e) => setFormData(prev => ({ ...prev, why_needed: e.target.value }))}
                  placeholder="Briefly explain why this is important to you..."
                  rows={3}
                  maxLength={300}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Location (Optional)
                </label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="City, Country"
                  maxLength={100}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 mt-8">
            <Button onClick={() => setStep(1)} variant="outline" size="lg" className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button 
              onClick={() => setStep(3)} 
              disabled={!formData.title.trim() || !formData.why_needed.trim()}
              size="lg" 
              className="flex-1"
            >
              Next: Pricing
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Pricing
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
              <Calculator className="h-10 w-10 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Set Your Goal</h1>
            <p className="text-gray-600">How much do you need to raise?</p>
          </div>

          <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
            <CardContent className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Goal Amount (USDC) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="number"
                    value={formData.seed_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, seed_value: e.target.value }))}
                    placeholder={orchardType.value === 'standard' ? "150" : "50"}
                    className="pl-10 text-lg py-3 text-center"
                    min={orchardType.value === 'standard' ? "101" : "1"}
                    max={orchardType.value === 'standard' ? "10000" : "100"}
                    step="1"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {orchardType.value === 'standard' 
                    ? "Minimum $101 USDC for Standard Orchards"
                    : "Between $1-100 USDC for Full Value Orchards"
                  }
                </p>
              </div>

              {orchardType.value === 'standard' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Pocket Price (USDC)
                  </label>
                  <Select 
                    value={formData.pocket_price} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, pocket_price: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">$50 per pocket</SelectItem>
                      <SelectItem value="100">$100 per pocket</SelectItem>
                      <SelectItem value="150">$150 per pocket</SelectItem>
                      <SelectItem value="200">$200 per pocket</SelectItem>
                      <SelectItem value="250">$250 per pocket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {orchardType.value === 'full_value' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Number of Pockets
                  </label>
                  <Select 
                    value={formData.number_of_pockets} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, number_of_pockets: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10].map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} pocket{num > 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Price Breakdown */}
              {formData.seed_value && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Summary:</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Goal Amount:</span>
                      <span>${formData.seed_value} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fees (10.5%):</span>
                      <span>${(parseFloat(formData.seed_value) * 0.105).toFixed(2)} USDC</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total to Raise:</span>
                      <span>${calculateTotal()} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Number of Pockets:</span>
                      <span>{calculatePockets()}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4 mt-8">
            <Button onClick={() => setStep(2)} variant="outline" size="lg" className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button 
              onClick={() => setStep(4)} 
              disabled={!formData.seed_value || parseFloat(formData.seed_value) <= 0}
              size="lg" 
              className="flex-1"
            >
              Review & Create
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Review & Create
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Heart className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ready to Launch! 🚀</h1>
          <p className="text-gray-600">Review your orchard before going live</p>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm shadow-xl mb-6">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{formData.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Type:</span>
                <p>{orchardType.title}</p>
              </div>
              <div>
                <span className="font-semibold">Category:</span>
                <p>{formData.category || 'Not specified'}</p>
              </div>
              <div>
                <span className="font-semibold">Goal:</span>
                <p>${formData.seed_value} USDC</p>
              </div>
              <div>
                <span className="font-semibold">Total to Raise:</span>
                <p>${calculateTotal()} USDC</p>
              </div>
              <div>
                <span className="font-semibold">Pockets:</span>
                <p>{calculatePockets()}</p>
              </div>
              <div>
                <span className="font-semibold">Location:</span>
                <p>{formData.location || 'Not specified'}</p>
              </div>
            </div>
            
            {formData.why_needed && (
              <div>
                <span className="font-semibold text-sm">Why needed:</span>
                <p className="text-sm text-gray-600 mt-1">{formData.why_needed}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button onClick={() => setStep(3)} variant="outline" size="lg" className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button 
            onClick={handleCreateOrchard} 
            disabled={isCreating}
            size="lg" 
            className="flex-1"
          >
            {isCreating ? (
              <>Creating...</>
            ) : (
              <>
                Create Orchard
                <Sparkles className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}