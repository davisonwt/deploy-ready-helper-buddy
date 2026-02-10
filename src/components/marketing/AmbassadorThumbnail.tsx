import React, { useState, useEffect } from 'react';
import { getCurrentTheme } from '@/utils/dashboardThemes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function AmbassadorThumbnail() {
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme());
  const { user } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    currentRole: '',
    username: '',
    email: '',
    platforms: [] as string[],
    brandName: '',
    whyRepresent: '',
    honeypot: '' // Hidden field for bot detection
  });
  
  // Vetting state
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState({ num1: 0, num2: 0, answer: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  
  // Generate random CAPTCHA question
  useEffect(() => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaQuestion({ num1, num2, answer: num1 + num2 });
  }, []);
  
  // Check if user has already submitted (rate limiting)
  const checkPreviousSubmission = async () => {
    if (!user) return false;
    try {
      // Use type assertion since ambassador_applications may not be in generated types
      const { data, error } = await (supabase as any)
        .from('ambassador_applications')
        .select('id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking submissions:', error);
        return false;
      }
      
      if (data) {
        const submissionDate = new Date(data.created_at);
        const daysSince = (Date.now() - submissionDate.getTime()) / (1000 * 60 * 60 * 24);
        // Allow resubmission after 30 days
        return daysSince < 30;
      }
      return false;
    } catch (error) {
      console.error('Error checking submissions:', error);
      return false;
    }
  };
  
  // Generate and send email verification code
  const sendVerificationCode = async () => {
    if (!formData.email || !formData.email.includes('@')) {
      setSubmitError('Please enter a valid email address');
      return;
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    
    // In production, send email via Supabase Edge Function or email service
    // For now, we'll store it and show it (remove in production!)
    console.log('Verification code:', code);
    alert(`Verification code: ${code}\n\nIn production, this will be sent to your email.`);
    
    setSubmitError('');
  };
  
  // Verify email code
  const verifyEmailCode = () => {
    if (verificationCode === generatedCode) {
      setEmailVerified(true);
      setSubmitError('');
    } else {
      setSubmitError('Invalid verification code. Please try again.');
    }
  };
  
  // Validate form
  const validateForm = async () => {
    setSubmitError('');
    
    // Honeypot check (bots will fill this)
    if (formData.honeypot !== '') {
      setSubmitError('Bot detected. Submission rejected.');
      return false;
    }
    
    // Required fields
    if (!formData.fullName.trim()) {
      setSubmitError('Please enter your full name');
      return false;
    }
    
    if (!formData.currentRole) {
      setSubmitError('Please select your current s2g role');
      return false;
    }
    
    if (!formData.username.trim()) {
      setSubmitError('Please enter a desired username');
      return false;
    }
    
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setSubmitError('Please enter a valid email address');
      return false;
    }
    
    if (!emailVerified) {
      setSubmitError('Please verify your email address');
      return false;
    }
    
    if (formData.platforms.length === 0) {
      setSubmitError('Please select at least one platform');
      return false;
    }
    
    if (!formData.whyRepresent.trim() || formData.whyRepresent.trim().length < 50) {
      setSubmitError('Please provide a thoughtful answer (at least 50 characters) explaining why you want to represent s2g');
      return false;
    }
    
    // CAPTCHA check
    if (captchaAnswer !== captchaQuestion.answer.toString()) {
      setSubmitError('Please solve the math problem correctly');
      return false;
    }
    
    // Check for previous submission
    const hasRecentSubmission = await checkPreviousSubmission();
    if (hasRecentSubmission) {
      setSubmitError('You have already submitted an application recently. Please wait 30 days before submitting again.');
      return false;
    }
    
    return true;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!(await validateForm())) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // Store application in database - use type assertion for table not in types
      const { data, error } = await (supabase as any)
        .from('ambassador_applications')
        .insert({
          user_id: user?.id || null,
          full_name: formData.fullName,
          current_role: formData.currentRole,
          username: formData.username,
          email: formData.email,
          platforms: formData.platforms,
          brand_name: formData.brandName || null,
          why_represent: formData.whyRepresent,
          status: 'pending', // Requires manual review
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        // Create table if it doesn't exist (for development)
        console.error('Error submitting application:', error);
        setSubmitError('Error submitting application. Please try again later.');
        setIsSubmitting(false);
        return;
      }
      
      setSubmitSuccess(true);
      setIsSubmitting(false);
      
      // Reset form
      setFormData({
        fullName: '',
        currentRole: '',
        username: '',
        email: '',
        platforms: [],
        brandName: '',
        whyRepresent: '',
        honeypot: ''
      });
      setEmailVerified(false);
      setVerificationCode('');
      setCaptchaAnswer('');
      
      // Generate new CAPTCHA
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      setCaptchaQuestion({ num1, num2, answer: num1 + num2 });
      
    } catch (error) {
      console.error('Error submitting application:', error);
      setSubmitError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Update theme every 2 hours
  useEffect(() => {
    const themeInterval = setInterval(() => {
      setCurrentTheme(getCurrentTheme());
    }, 2 * 60 * 60 * 1000); // 2 hours
    return () => clearInterval(themeInterval);
  }, []);

  return (
    <div className="relative w-full aspect-video overflow-hidden" style={{ background: currentTheme.background }}>
      {/* Cosmic Space Background */}
      <div className="absolute inset-0">
        {/* Stars */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,215,0,0.3) 1px, transparent 1px), radial-gradient(circle at 60% 70%, rgba(255,215,0,0.2) 1px, transparent 1px), radial-gradient(circle at 80% 20%, rgba(255,215,0,0.25) 1px, transparent 1px), radial-gradient(circle at 40% 80%, rgba(255,215,0,0.2) 1px, transparent 1px)',
          backgroundSize: '30% 30%, 25% 25%, 35% 35%, 28% 28%',
          backgroundPosition: '0% 0%, 100% 100%, 50% 50%, 0% 100%',
        }} />
        
        {/* Glowing Golden Particles */}
        <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-amber-400 rounded-full blur-sm animate-pulse" style={{ boxShadow: '0 0 20px rgba(255,215,0,0.6)' }} />
        <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-amber-300 rounded-full blur-sm animate-pulse" style={{ animationDelay: '0.5s', boxShadow: '0 0 15px rgba(255,215,0,0.5)' }} />
        <div className="absolute bottom-1/3 left-1/2 w-1 h-1 bg-amber-500 rounded-full blur-sm animate-pulse" style={{ animationDelay: '1s', boxShadow: '0 0 10px rgba(255,215,0,0.4)' }} />
      </div>

      {/* Top-left Logo - Outside Center Card */}
      <div className="absolute top-6 left-6 z-20">
        <div className="flex flex-col items-start">
          <div className="text-4xl font-bold" style={{
            color: currentTheme.accent,
            textShadow: `0 0 20px ${currentTheme.accent}80, 0 0 40px ${currentTheme.accent}40, 0 0 60px ${currentTheme.accent}20`,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '3px',
            lineHeight: '1',
            fontWeight: '800'
          }}>
                s2g
          </div>
          <div className="text-sm font-semibold mt-1" style={{ 
            color: currentTheme.accentLight,
            textShadow: `0 0 15px ${currentTheme.accent}60, 0 0 30px ${currentTheme.accent}30`,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '2px',
            fontWeight: '600'
          }}>
            App
          </div>
        </div>
      </div>

      {/* Right Side Social Media Icons */}
      <div className="absolute top-1/2 right-6 transform -translate-y-1/2 z-30 flex flex-col gap-4 pointer-events-auto">
        {[
          { name: 'YouTube', icon: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
          { name: 'Instagram', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
          { name: 'Facebook', icon: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
          { name: 'Twitter', icon: 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z' },
          { name: 'TikTok', icon: 'M19.59 6.69a4.83 4.83 0 01-1.4-3.51V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.04-.1z' },
          { name: 'Telegram', icon: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z' },
          { name: 'WhatsApp', icon: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z' },
          { name: 'Discord', icon: 'M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z' },
        ].map((social) => (
          <a
            key={social.name}
            href="#"
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-110"
            style={{
              backgroundColor: currentTheme.secondaryButton,
              borderColor: currentTheme.cardBorder,
              borderWidth: '1px',
              color: currentTheme.accentLight,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.accent;
              e.currentTarget.style.color = currentTheme.textPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
              e.currentTarget.style.color = currentTheme.accentLight;
            }}
            title={social.name}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d={social.icon} />
            </svg>
          </a>
        ))}
      </div>

      {/* Center Card */}
      <div className="absolute inset-0 flex items-center justify-center z-10 px-8 py-8">
        <div className="backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-4xl w-full border overflow-y-auto" style={{
          backgroundColor: currentTheme.cardBg,
          borderColor: currentTheme.cardBorder,
          boxShadow: `0 25px 50px -12px ${currentTheme.shadow}, 0 0 0 1px ${currentTheme.cardBorder}`,
          paddingTop: '2rem',
          paddingBottom: '2rem',
          maxHeight: '90%'
        }}>
          {/* Title */}
          <h1 className="text-4xl font-bold mb-2 text-center pt-8" style={{
            color: currentTheme.textPrimary,
            textShadow: `0 2px 4px ${currentTheme.shadow}`
          }}>
            Become a s2g Ambassador
          </h1>
          
          {/* Subtitle */}
          <p className="text-sm text-center mb-6 font-light tracking-wide" style={{ color: currentTheme.textSecondary }}>
            Sowers • Growers • Bestowers • Whisperers • Guardians • Harvesters
          </p>

          {/* Application Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot Field - Hidden from humans, bots will fill */}
            <input
              type="text"
              name="website"
              value={formData.honeypot}
              onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />
            
            {/* Success Message */}
            {submitSuccess && (
              <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#10b98120', borderColor: '#10b981', borderWidth: '1px' }}>
                <p className="text-sm" style={{ color: '#10b981' }}>
                  ✓ Application submitted successfully! Your application is now pending manual review by the GoSat team. You will receive an email notification once your application has been reviewed.
                </p>
              </div>
            )}
            
            {/* Error Message */}
            {submitError && (
              <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#ef444420', borderColor: '#ef4444', borderWidth: '1px' }}>
                <p className="text-sm" style={{ color: '#ef4444' }}>{submitError}</p>
              </div>
            )}
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.textPrimary }}>
                Full Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.cardBorder,
                  color: currentTheme.textPrimary,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.accent;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.cardBorder;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            
            {/* Email with Verification */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.textPrimary }}>
                Email Address <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  required
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setEmailVerified(false);
                  }}
                  style={{
                    backgroundColor: currentTheme.cardBg,
                    borderColor: currentTheme.cardBorder,
                    color: currentTheme.textPrimary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = currentTheme.accent;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = currentTheme.cardBorder;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {!emailVerified && (
                  <button
                    type="button"
                    onClick={sendVerificationCode}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{
                      backgroundColor: currentTheme.primaryButton,
                      color: currentTheme.textPrimary,
                    }}
                  >
                    Send Code
                  </button>
                )}
              </div>
              
              {/* Email Verification Code Input */}
              {!emailVerified && generatedCode && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-4 py-2 border rounded-lg"
                    placeholder="Enter 6-digit verification code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    style={{
                      backgroundColor: currentTheme.cardBg,
                      borderColor: currentTheme.cardBorder,
                      color: currentTheme.textPrimary,
                    }}
                  />
                  <button
                    type="button"
                    onClick={verifyEmailCode}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{
                      backgroundColor: currentTheme.accent,
                      color: currentTheme.textPrimary,
                    }}
                  >
                    Verify
                  </button>
                </div>
              )}
              
              {emailVerified && (
                <p className="text-xs mt-1" style={{ color: '#10b981' }}>✓ Email verified</p>
              )}
            </div>

            {/* Current s2g Role */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.textPrimary }}>
                Current s2g Role <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select 
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                value={formData.currentRole}
                onChange={(e) => setFormData({ ...formData, currentRole: e.target.value })}
                style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.cardBorder,
                  color: currentTheme.textPrimary,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.accent;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.cardBorder;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="">Select your role</option>
                <option>Sower</option>
                <option>Grower</option>
                <option>Bestower</option>
                <option>Whisperer</option>
                <option>Guardian</option>
                <option>Harvester</option>
                <option>Other</option>
              </select>
            </div>

            {/* Desired Username */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.textPrimary }}>
                Desired Username <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="flex items-center">
                <span 
                  className="px-4 py-2 border border-r-0 rounded-l-lg font-mono"
                  style={{
                    backgroundColor: currentTheme.secondaryButton,
                    borderColor: currentTheme.cardBorder,
                    color: currentTheme.textPrimary,
                  }}
                >s2g@</span>
                <input 
                  type="text" 
                  required
                  className="flex-1 px-4 py-2 border rounded-r-lg focus:ring-2 focus:border-transparent"
                  placeholder="gosatqueen"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                  style={{
                    backgroundColor: currentTheme.cardBg,
                    borderColor: currentTheme.cardBorder,
                    color: currentTheme.textPrimary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = currentTheme.accent;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = currentTheme.cardBorder;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Platform Checkboxes */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: currentTheme.textPrimary }}>
                Platforms <span style={{ color: '#ef4444' }}>*</span> (Select at least one)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {['TikTok', 'YouTube', 'Instagram', 'Facebook', 'Twitter/X', 'Discord', 'Snapchat', 'Reddit', 'Telegram', 'WhatsApp'].map((platform) => (
                  <label key={platform} className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded"
                      checked={formData.platforms.includes(platform)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, platforms: [...formData.platforms, platform] });
                        } else {
                          setFormData({ ...formData, platforms: formData.platforms.filter(p => p !== platform) });
                        }
                      }}
                      style={{
                        accentColor: currentTheme.accent,
                        borderColor: currentTheme.cardBorder,
                      }}
                    />
                    <span className="text-xs" style={{ color: currentTheme.textPrimary }}>{platform}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Business/Ministry/Brand Name */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.textPrimary }}>
                Business / Ministry / Personal Brand Name <span className="font-normal" style={{ color: currentTheme.textSecondary }}>(optional)</span>
              </label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                placeholder="Enter your brand name"
                value={formData.brandName}
                onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.cardBorder,
                  color: currentTheme.textPrimary,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.accent;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.cardBorder;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Why I want to represent s2g */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.textPrimary }}>
                Why I want to represent s2g <span style={{ color: '#ef4444' }}>*</span>
                <span className="text-xs font-normal ml-1" style={{ color: currentTheme.textSecondary }}>
                  (Minimum 50 characters - be thoughtful and specific)
                </span>
              </label>
              <textarea 
                rows={4}
                required
                minLength={50}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent resize-none"
                placeholder="Tell us about your passion for the s2g community, your vision, and how you plan to represent us..."
                value={formData.whyRepresent}
                onChange={(e) => setFormData({ ...formData, whyRepresent: e.target.value })}
                style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.cardBorder,
                  color: currentTheme.textPrimary,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.accent;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.cardBorder;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <p className="text-xs mt-1" style={{ color: currentTheme.textSecondary }}>
                {formData.whyRepresent.length}/50 characters minimum
              </p>
            </div>
            
            {/* Human Verification CAPTCHA */}
            <div className="p-4 rounded-lg border" style={{ backgroundColor: currentTheme.secondaryButton, borderColor: currentTheme.cardBorder }}>
              <label className="block text-xs font-medium mb-2" style={{ color: currentTheme.textPrimary }}>
                Human Verification <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold" style={{ color: currentTheme.textPrimary }}>
                  {captchaQuestion.num1} + {captchaQuestion.num2} = ?
                </span>
                <input
                  type="text"
                  required
                  className="w-24 px-3 py-2 border rounded-lg"
                  placeholder="Answer"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value.replace(/\D/g, ''))}
                  style={{
                    backgroundColor: currentTheme.cardBg,
                    borderColor: currentTheme.cardBorder,
                    color: currentTheme.textPrimary,
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const num1 = Math.floor(Math.random() * 10) + 1;
                    const num2 = Math.floor(Math.random() * 10) + 1;
                    setCaptchaQuestion({ num1, num2, answer: num1 + num2 });
                    setCaptchaAnswer('');
                  }}
                  className="text-xs px-3 py-1 rounded"
                  style={{
                    backgroundColor: currentTheme.cardBg,
                    color: currentTheme.textPrimary,
                    borderColor: currentTheme.cardBorder,
                    borderWidth: '1px',
                  }}
                >
                  New Question
                </button>
              </div>
            </div>

            {/* Manual Review Notice */}
            <div className="p-4 rounded-lg border" style={{ backgroundColor: '#fbbf2420', borderColor: '#fbbf24', borderWidth: '1px' }}>
              <p className="text-xs" style={{ color: '#fbbf24' }}>
                ⚠️ <strong>Manual Review Process:</strong> All applications are manually reviewed by the GoSat team to ensure quality and authenticity. This process typically takes 3-5 business days. You will receive an email notification once your application has been reviewed.
              </p>
            </div>
            
            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isSubmitting || !emailVerified}
              className="w-full py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isSubmitting || !emailVerified ? currentTheme.secondaryButton : currentTheme.primaryButton,
                color: currentTheme.textPrimary,
                boxShadow: `0 10px 25px -5px ${currentTheme.shadow}`,
                paddingTop: '1rem',
                paddingBottom: '1rem',
                paddingLeft: '1.5rem',
                paddingRight: '1.5rem',
                minHeight: '3.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && emailVerified) {
                  e.currentTarget.style.background = currentTheme.primaryButtonHover;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting && emailVerified) {
                  e.currentTarget.style.background = currentTheme.primaryButton;
                }
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit for GoSat Approval'}
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Text */}
      <div className="absolute bottom-4 left-6 right-6 z-20">
        <p className="text-xs text-center font-light leading-relaxed" style={{
          color: currentTheme.textPrimary,
          textShadow: `0 0 10px ${currentTheme.shadow}`
        }}>
          After GoSat approval you will receive official logos, banners & brand kit • Every seed sown will automatically include a Share button that leads to s2gapp.com
        </p>
      </div>

      {/* Bottom-right Social Link */}
      <div className="absolute bottom-6 right-6 z-20">
        <a 
          href="https://s2gapp.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all hover:scale-105"
          style={{
            backgroundColor: currentTheme.secondaryButton,
            borderColor: currentTheme.cardBorder,
            borderWidth: '1px',
            color: currentTheme.accentLight,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = currentTheme.accent;
            e.currentTarget.style.color = currentTheme.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
            e.currentTarget.style.color = currentTheme.accentLight;
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="text-sm font-medium">s2gapp.com</span>
        </a>
      </div>
    </div>
  );
}

