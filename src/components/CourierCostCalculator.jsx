import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Truck, Calculator, MapPin, Package, AlertCircle } from "lucide-react"

export default function CourierCostCalculator({ onCourierCostChange, initialCost = 0 }) {
  const [courierMethod, setCourierMethod] = useState("manual")
  const [manualCost, setManualCost] = useState(initialCost.toString())
  const [domesticCarrier, setDomesticCarrier] = useState("")
  const [internationalCarrier, setInternationalCarrier] = useState("")
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [deliveryZone, setDeliveryZone] = useState("")
  const [packageWeight, setPackageWeight] = useState("")
  const [packageSize, setPackageSize] = useState("")

  // Domestic courier partners (example rates)
  const domesticCarriers = [
    { name: "FedEx", baseRate: 15, perKg: 2.5, zones: { local: 1.0, national: 1.5 } },
    { name: "UPS", baseRate: 12, perKg: 2.8, zones: { local: 1.0, national: 1.4 } },
    { name: "PostNet", baseRate: 10, perKg: 2.0, zones: { local: 0.8, national: 1.3 } },
    { name: "The Courier Guy", baseRate: 8, perKg: 1.8, zones: { local: 0.9, national: 1.2 } }
  ]

  // International courier partners (example rates)
  const internationalCarriers = [
    { name: "DHL Express", baseRate: 45, perKg: 8.5, zones: { africa: 1.2, worldwide: 2.0 } },
    { name: "FedEx International", baseRate: 50, perKg: 9.0, zones: { africa: 1.3, worldwide: 2.2 } },
    { name: "UPS Worldwide", baseRate: 48, perKg: 8.8, zones: { africa: 1.25, worldwide: 2.1 } }
  ]

  const deliveryZones = [
    { value: "local", label: "Local (Same City)", type: "domestic" },
    { value: "national", label: "National (Same Country)", type: "domestic" },
    { value: "africa", label: "Africa", type: "international" },
    { value: "worldwide", label: "Worldwide", type: "international" }
  ]

  const packageSizes = [
    { value: "small", label: "Small (< 30cm)", multiplier: 1.0 },
    { value: "medium", label: "Medium (30-60cm)", multiplier: 1.2 },
    { value: "large", label: "Large (60-100cm)", multiplier: 1.5 },
    { value: "extra_large", label: "Extra Large (> 100cm)", multiplier: 2.0 }
  ]

  useEffect(() => {
    if (courierMethod === "manual") {
      const cost = parseFloat(manualCost) || 0
      setEstimatedCost(cost)
      onCourierCostChange(cost)
    } else {
      calculateEstimatedCost()
    }
  }, [courierMethod, manualCost, domesticCarrier, internationalCarrier, deliveryZone, packageWeight, packageSize])

  const calculateEstimatedCost = () => {
    if (!deliveryZone || !packageWeight || !packageSize) {
      setEstimatedCost(0)
      onCourierCostChange(0)
      return
    }

    const zone = deliveryZones.find(z => z.value === deliveryZone)
    const isDomestic = zone?.type === "domestic"
    const carriers = isDomestic ? domesticCarriers : internationalCarriers
    const selectedCarrierName = isDomestic ? domesticCarrier : internationalCarrier
    
    if (!selectedCarrierName) {
      setEstimatedCost(0)
      onCourierCostChange(0)
      return
    }

    const carrier = carriers.find(c => c.name === selectedCarrierName)
    const sizeInfo = packageSizes.find(s => s.value === packageSize)
    
    if (!carrier || !sizeInfo) {
      setEstimatedCost(0)
      onCourierCostChange(0)
      return
    }

    const weight = parseFloat(packageWeight) || 1
    const baseRate = carrier.baseRate
    const weightCost = carrier.perKg * weight
    const zoneMultiplier = carrier.zones[deliveryZone] || 1
    const sizeMultiplier = sizeInfo.multiplier

    const totalCost = (baseRate + weightCost) * zoneMultiplier * sizeMultiplier
    const roundedCost = Math.round(totalCost * 100) / 100

    setEstimatedCost(roundedCost)
    onCourierCostChange(roundedCost)
  }

  const getCurrentCarriers = () => {
    if (!deliveryZone) return []
    const zone = deliveryZones.find(z => z.value === deliveryZone)
    return zone?.type === "domestic" ? domesticCarriers : internationalCarriers
  }

  const getSelectedCarrier = () => {
    if (!deliveryZone) return ""
    const zone = deliveryZones.find(z => z.value === deliveryZone)
    return zone?.type === "domestic" ? domesticCarrier : internationalCarrier
  }

  const setSelectedCarrier = (carrierName) => {
    if (!deliveryZone) return
    const zone = deliveryZones.find(z => z.value === deliveryZone)
    if (zone?.type === "domestic") {
      setDomesticCarrier(carrierName)
    } else {
      setInternationalCarrier(carrierName)
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center text-foreground">
          <Truck className="h-5 w-5 mr-2 text-primary" />
          Courier Cost Calculator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Add courier/shipping costs to your orchard calculation
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Method Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Calculation Method</label>
          <Select value={courierMethod} onValueChange={setCourierMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual Entry (Custom Quote)</SelectItem>
              <SelectItem value="estimated">Estimated (Partner Rates)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {courierMethod === "manual" ? (
          // Manual Cost Entry
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Courier Cost (USDC)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={manualCost}
              onChange={(e) => setManualCost(e.target.value)}
              placeholder="Enter courier cost from your quote"
              className="border-border"
            />
            <p className="text-xs text-muted-foreground">
              Enter the exact cost from your courier company quote
            </p>
          </div>
        ) : (
          // Estimated Cost Calculation
          <div className="space-y-4">
            {/* Delivery Zone */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                <MapPin className="h-4 w-4 inline mr-1" />
                Delivery Zone
              </label>
              <Select value={deliveryZone} onValueChange={setDeliveryZone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery zone" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryZones.map((zone) => (
                    <SelectItem key={zone.value} value={zone.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{zone.label}</span>
                        <Badge variant="outline" className="ml-2">
                          {zone.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Courier Selection */}
            {deliveryZone && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Courier Partner</label>
                <Select value={getSelectedCarrier()} onValueChange={setSelectedCarrier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select courier partner" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCurrentCarriers().map((carrier) => (
                      <SelectItem key={carrier.name} value={carrier.name}>
                        <div className="flex items-center justify-between w-full">
                          <span>{carrier.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            Base: ${carrier.baseRate}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Package Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Weight (kg)</label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={packageWeight}
                  onChange={(e) => setPackageWeight(e.target.value)}
                  placeholder="Package weight"
                  className="border-border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  <Package className="h-4 w-4 inline mr-1" />
                  Size
                </label>
                <Select value={packageSize} onValueChange={setPackageSize}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {packageSizes.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cost Breakdown */}
            {getSelectedCarrier() && packageWeight && packageSize && deliveryZone && (
              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center">
                  <Calculator className="h-4 w-4 mr-1" />
                  Cost Breakdown
                </h4>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Carrier:</span>
                    <span>{getSelectedCarrier()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Zone:</span>
                    <span>{deliveryZones.find(z => z.value === deliveryZone)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Weight:</span>
                    <span>{packageWeight} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span>{packageSizes.find(s => s.value === packageSize)?.label}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Warning for estimates */}
            <div className="flex items-start space-x-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-700 dark:text-amber-300">
                <p className="font-medium">Estimate Only</p>
                <p>These are estimated rates. Actual costs may vary. Contact courier partners for exact quotes.</p>
              </div>
            </div>
          </div>
        )}

        {/* Final Cost Display */}
        {estimatedCost > 0 && (
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Courier Cost:</span>
              <span className="text-lg font-bold text-primary">{estimatedCost.toFixed(2)} USDC</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This cost will be added to your orchard's total seed value
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}