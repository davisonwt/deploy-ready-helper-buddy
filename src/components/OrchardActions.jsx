import { Button } from './ui/button'
import { Sparkles } from 'lucide-react'
import { useCurrency } from '../hooks/useCurrency'

export function OrchardActions({ 
  selectedPockets, 
  orchard, 
  onBestow, 
  onSelectAll, 
  onClearSelection 
}) {
  const { formatAmount } = useCurrency()
  
  // Debug logging for pocket values
  console.log('🔍 OrchardActions Debug:', {
    title: orchard.title,
    total_pockets: orchard.total_pockets,
    intended_pockets: orchard.intended_pockets,
    filled_pockets: orchard.filled_pockets,
    actualPockets: (orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets || 0,
    availablePockets: ((orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets || 0) - (orchard.filled_pockets || 0),
    selectedPockets: selectedPockets.length
  })

  return (
    <div className="mt-8 text-center">
      <p className="text-green-700 mb-6 text-lg">
        Select pockets to support this orchard. Your contribution helps dreams grow! ✨
      </p>
      
      {selectedPockets.length > 0 && (
        <div className="bg-rose-50 p-6 rounded-xl mb-6 border border-rose-200">
          <h4 className="font-semibold text-rose-800 mb-3 text-lg">Your Selection ✨</h4>
          <p className="text-rose-700 mb-2">
            <strong>Selected Pockets:</strong> {selectedPockets.sort((a, b) => a - b).join(", ")}
          </p>
          <p className="text-rose-700 text-xl font-bold">
            <strong>Total Amount:</strong> {formatAmount(selectedPockets.length * (orchard.pocket_price || 0))}
          </p>
        </div>
      )}
      
      <div className="flex gap-4 justify-center flex-wrap">
        <Button
          onClick={onBestow}
          disabled={selectedPockets.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6"
        >
          <Sparkles className="h-5 w-5 mr-2" />
          Support Orchard ({selectedPockets.length} pockets)
        </Button>
        
        <Button
          onClick={onSelectAll}
          variant="outline"
          className="border-green-600 text-green-600 hover:bg-green-50"
        >
          Select All Available ({((orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets || 0) - (orchard.filled_pockets || 0)} pockets)
        </Button>
        
        {selectedPockets.length > 0 && (
          <Button
            variant="outline"
            onClick={onClearSelection}
            className="border-gray-400 text-gray-600 hover:bg-gray-50"
          >
            Clear Selection
          </Button>
        )}
      </div>
    </div>
  )
}