import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Calculator, ArrowRight, DollarSign } from "lucide-react"

export default function CurrencyCalculator({ onUseAmount }) {
  const [selectedCurrency, setSelectedCurrency] = useState("USD")
  const [amount, setAmount] = useState("")
  const [usdcValue, setUsdcValue] = useState(0)

  // Approximate exchange rates (to USDC/USD)
  const exchangeRates = {
    USD: 1.0,
    EUR: 1.08,
    GBP: 1.26,
    CAD: 0.74,
    AUD: 0.66,
    JPY: 0.0067,
    ZAR: 0.055,
    CNY: 0.14,
    INR: 0.012,
    BRL: 0.20,
    MXN: 0.059,
    CHF: 1.10,
    SGD: 0.74,
    NZD: 0.61,
    SEK: 0.094,
    NOK: 0.093,
    DKK: 0.145,
    PLN: 0.25,
    CZK: 0.044,
    HUF: 0.0027,
    TRY: 0.031,
    RUB: 0.011,
    KRW: 0.00075,
    THB: 0.028,
    VND: 0.000041,
    IDR: 0.000065,
    MYR: 0.21,
    PHP: 0.018,
    HKD: 0.13,
    TWD: 0.031,
    ILS: 0.27,
    AED: 0.27,
    SAR: 0.27,
    EGP: 0.020,
    NGN: 0.0013,
    KES: 0.0078,
    GHS: 0.082,
    UGX: 0.00027,
    TZS: 0.00043,
    ETB: 0.018,
    MAD: 0.099,
    DZD: 0.0075,
    TND: 0.32,
    XOF: 0.0016,
    XAF: 0.0016,
    CFA: 0.0016
  }

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
    { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
    { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
    { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿' },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
    { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$' },
    { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR' },
    { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
    { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
    { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
    { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br' },
    { code: 'MAD', name: 'Moroccan Dirham', symbol: 'MAD' },
    { code: 'DZD', name: 'Algerian Dinar', symbol: 'DA' },
    { code: 'TND', name: 'Tunisian Dinar', symbol: 'DT' },
    { code: 'XOF', name: 'West African CFA', symbol: 'CFA' },
    { code: 'XAF', name: 'Central African CFA', symbol: 'CFA' }
  ]

  useEffect(() => {
    if (amount && selectedCurrency) {
      const numAmount = parseFloat(amount) || 0
      const rate = exchangeRates[selectedCurrency] || 1
      const calculatedUsdc = numAmount * rate
      setUsdcValue(calculatedUsdc)
    } else {
      setUsdcValue(0)
    }
  }, [amount, selectedCurrency])

  const handleUseAmount = () => {
    if (usdcValue > 0 && onUseAmount) {
      onUseAmount(usdcValue.toFixed(2))
    }
  }

  const selectedCurrencyData = currencies.find(c => c.code === selectedCurrency)

  return (
    <Card className="bg-blue-50/80 backdrop-blur-sm border-blue-200 shadow-lg">
      <CardHeader>
        <CardTitle className="text-blue-800 flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Currency Calculator
        </CardTitle>
        <p className="text-sm text-blue-600">
          Convert your local currency to USDC for the seed value
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-2">
              Your Currency
            </label>
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto z-50">
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.name} ({currency.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-2">
              Amount ({selectedCurrencyData?.symbol || selectedCurrency})
            </label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              step="0.01"
            />
          </div>
        </div>

        {amount && (
          <div className="bg-white p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-800">
                  {selectedCurrencyData?.symbol}{parseFloat(amount || 0).toFixed(2)} {selectedCurrency}
                </div>
                <div className="text-sm text-gray-600">Your Amount</div>
              </div>
              
              <ArrowRight className="h-5 w-5 text-blue-500" />
              
              <div className="text-center">
                <div className="text-lg font-semibold text-green-800">
                  {usdcValue.toFixed(2)} USDC
                </div>
                <div className="text-sm text-gray-600">Equivalent</div>
              </div>
            </div>
            
            {usdcValue > 0 && (
              <div className="mt-4 flex justify-center">
                <Button 
                  onClick={handleUseAmount}
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Use {usdcValue.toFixed(2)} USDC as Seed Value
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="font-medium text-yellow-800 mb-1">⚠️ Disclaimer:</p>
          <p>Exchange rates are approximate and for estimation purposes only. 
          Actual rates may vary. Please verify current exchange rates before finalizing your seed value.</p>
        </div>
      </CardContent>
    </Card>
  )
}