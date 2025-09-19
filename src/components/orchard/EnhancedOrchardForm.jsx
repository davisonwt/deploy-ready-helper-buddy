import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useOrchards } from '@/hooks/useOrchards';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// Enhanced validation schema
const orchardSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-\.,'&]+$/, 'Title contains invalid characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be less than 1000 characters'),
  category: z.string().min(1, 'Category is required'),
  seed_value: z.string()
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Seed value must be a positive number'),
  pocket_price: z.string()
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Pocket price must be a positive number'),
  location: z.string().max(100, 'Location must be less than 100 characters').optional()
});

const EnhancedOrchardForm = ({ editing = false }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    seed_value: '',
    pocket_price: '150',
    location: '',
    orchard_type: 'standard'
  });
  
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [duplicateCheck, setDuplicateCheck] = useState({ checking: false, hasDuplicate: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  
  const { id } = useParams();
  const { user } = useAuth();
  const { createOrchard, updateOrchard, fetchOrchardById } = useOrchards();
  const navigate = useNavigate();
  const { toast } = useToast();

  const categories = [
    "The Gift of Accessories", 
    "The Gift of Adventure Packages",
    "The Gift of Appliances",
    "The Gift of Art",
    "The Gift of Books & Literature",
    "The Gift of Business Solutions",
    "The Gift of Clothing & Fashion",
    "The Gift of Computers & Technology",
    "The Gift of Education & Training",
    "The Gift of Entertainment",
    "The Gift of Everything Bee's",
    "The Gift of Food & Beverages",
    "The Gift of Furniture & Home Decor",
    "The Gift of Gifts & Special Items",
    "The Gift of Health & Medical",
    "The Gift of Industrial & Scientific",
    "The Gift of Music",
    "The Gift of Personal Care",
    "The Gift of Security",
    "The Gift of Services",
    "The Gift of Social Impact",
    "The Gift of Software",
    "The Gift of Sports & Recreation",
    "The Gift of Technology & Hardware (Consumer Electronics)",
    "The Gift of Tools & Equipment",
    "The Gift of Transportation",
    "The Gift of Travel & Tourism"
  ];

  // Load existing orchard data if editing
  useEffect(() => {
    if (editing && id) {
      loadOrchardData();
    }
  }, [editing, id]);

  // Real-time validation
  useEffect(() => {
    if (submitAttempted) {
      validateForm();
    }
  }, [formData, submitAttempted]);

  // Duplicate title check with debouncing
  useEffect(() => {
    if (formData.title && formData.title.length > 3) {
      const timeoutId = setTimeout(() => {
        checkForDuplicateTitle();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.title]);

  const loadOrchardData = async () => {
    try {
      setLoading(true);
      const result = await fetchOrchardById(id);
      
      if (result.success) {
        const orchard = result.data;
        setFormData({
          title: orchard.title || '',
          description: orchard.description || '',
          category: orchard.category || '',
          seed_value: orchard.original_seed_value?.toString() || '',
          pocket_price: orchard.pocket_price?.toString() || '150',
          location: orchard.location || '',
          orchard_type: orchard.orchard_type || 'standard'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to load orchard data'
        });
        navigate('/my-orchards');
      }
    } catch (error) {
      console.error('Error loading orchard:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load orchard data'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkForDuplicateTitle = async () => {
    if (!formData.title || formData.title.length < 4) return;
    
    setDuplicateCheck({ checking: true, hasDuplicate: false });
    
    try {
      let query = supabase
        .from('orchards')
        .select('id, title')
        .eq('user_id', user.id)
        .ilike('title', formData.title.trim());
      
      // If editing, exclude current orchard
      if (editing && id) {
        query = query.neq('id', id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const hasDuplicate = data && data.length > 0;
      setDuplicateCheck({ checking: false, hasDuplicate });
      
      if (hasDuplicate) {
        setValidationErrors(prev => ({
          ...prev,
          title: 'You already have an orchard with this title'
        }));
      } else {
        setValidationErrors(prev => {
          const { title, ...rest } = prev;
          return rest;
        });
      }
    } catch (error) {
      console.error('Error checking for duplicate title:', error);
      setDuplicateCheck({ checking: false, hasDuplicate: false });
    }
  };

  const validateForm = () => {
    try {
      orchardSchema.parse(formData);
      
      // Additional business logic validation
      const seedValue = parseFloat(formData.seed_value);
      const pocketPrice = parseFloat(formData.pocket_price);
      
      const errors = {};
      
      if (formData.orchard_type === 'standard' && seedValue <= 100) {
        errors.seed_value = 'Seed value must be over 100 USDC for Standard Orchard';
      }
      
      if (pocketPrice <= 0) {
        errors.pocket_price = 'Pocket price must be greater than 0';
      }
      
      setValidationErrors(errors);
      return Object.keys(errors).length === 0 && !duplicateCheck.hasDuplicate;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = {};
        error.errors.forEach(err => {
          errors[err.path[0]] = err.message;
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    if (!validateForm() || duplicateCheck.hasDuplicate) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fix the errors before submitting'
      });
      return;
    }

    setLoading(true);

    try {
      // Calculate financial breakdown
      const originalSeedValue = parseFloat(formData.seed_value);
      const pocketPrice = parseFloat(formData.pocket_price);
      const tithing = originalSeedValue * 0.1; // 10%
      const processingFee = originalSeedValue * 0.005; // 0.5%
      const finalSeedValue = originalSeedValue + tithing + processingFee;

      const orchardData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        orchard_type: formData.orchard_type,
        seed_value: finalSeedValue,
        original_seed_value: originalSeedValue,
        pocket_price: pocketPrice,
        tithing_amount: tithing,
        payment_processing_fee: processingFee,
        location: formData.location?.trim() || '',
        currency: 'USDC',
        status: 'active'
      };

      let result;
      if (editing) {
        result = await updateOrchard(id, orchardData);
      } else {
        result = await createOrchard(orchardData);
      }

      if (result.success) {
        toast({
          title: 'Success!',
          description: `Orchard ${editing ? 'updated' : 'created'} successfully`
        });
        
        if (editing) {
          navigate('/my-orchards');
        } else {
          navigate(`/orchard/${result.data.id}`);
        }
      } else {
        throw new Error(result.error || `Failed to ${editing ? 'update' : 'create'} orchard`);
      }
    } catch (error) {
      console.error('Orchard submission error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || `Failed to ${editing ? 'update' : 'create'} orchard`
      });
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (fieldName) => validationErrors[fieldName];
  const hasFieldError = (fieldName) => !!getFieldError(fieldName);

  if (loading && editing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading orchard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {editing ? 'Edit Orchard' : 'Create New Orchard'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Title <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter orchard title"
                  className={hasFieldError('title') || duplicateCheck.hasDuplicate ? 'border-red-500' : ''}
                />
                {duplicateCheck.checking && (
                  <div className="absolute right-3 top-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
                {!duplicateCheck.checking && formData.title && !hasFieldError('title') && !duplicateCheck.hasDuplicate && (
                  <div className="absolute right-3 top-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>
              {(hasFieldError('title') || duplicateCheck.hasDuplicate) && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {getFieldError('title') || (duplicateCheck.hasDuplicate && 'You already have an orchard with this title')}
                </p>
              )}
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your orchard..."
                rows={4}
                className={hasFieldError('description') ? 'border-red-500' : ''}
              />
              {hasFieldError('description') && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {getFieldError('description')}
                </p>
              )}
              <p className="text-sm text-gray-500">
                {formData.description.length}/1000 characters
              </p>
            </div>

            {/* Category Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Category <span className="text-red-500">*</span>
              </label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger className={hasFieldError('category') ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFieldError('category') && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {getFieldError('category')}
                </p>
              )}
            </div>

            {/* Financial Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Seed Value (USDC) <span className="text-red-500">*</span>
                </label>
                <Input
                  name="seed_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.seed_value}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={hasFieldError('seed_value') ? 'border-red-500' : ''}
                />
                {hasFieldError('seed_value') && (
                  <p className="text-sm text-red-500 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    {getFieldError('seed_value')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Pocket Price (USDC) <span className="text-red-500">*</span>
                </label>
                <Input
                  name="pocket_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pocket_price}
                  onChange={handleChange}
                  placeholder="150.00"
                  className={hasFieldError('pocket_price') ? 'border-red-500' : ''}
                />
                {hasFieldError('pocket_price') && (
                  <p className="text-sm text-red-500 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    {getFieldError('pocket_price')}
                  </p>
                )}
              </div>
            </div>

            {/* Location Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Input
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Enter location (optional)"
                className={hasFieldError('location') ? 'border-red-500' : ''}
              />
              {hasFieldError('location') && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {getFieldError('location')}
                </p>
              )}
            </div>

            {/* Financial Summary */}
            {formData.seed_value && !isNaN(parseFloat(formData.seed_value)) && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">Financial Breakdown:</div>
                    <div>Original Seed Value: {parseFloat(formData.seed_value).toFixed(2)} USDC</div>
                    <div>Tithing (10%): {(parseFloat(formData.seed_value) * 0.1).toFixed(2)} USDC</div>
                    <div>Processing Fee (0.5%): {(parseFloat(formData.seed_value) * 0.005).toFixed(2)} USDC</div>
                    <div className="font-medium border-t pt-1">
                      Total Required: {(parseFloat(formData.seed_value) * 1.105).toFixed(2)} USDC
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || duplicateCheck.checking || duplicateCheck.hasDuplicate}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Update Orchard' : 'Create Orchard'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedOrchardForm;