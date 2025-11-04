import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import CrowdfundingCard from './CrowdfundingCard'

const FeaturedOrchards = () => {
  const navigate = useNavigate()
  
  const mockData = [
    {
      id: '1',
      headerColor: '#FF6347', // Tomato red
      title: 'emergency medical fund',
      subtitle: 'the gift of healthcare',
      user: 'john d.',
      location: 'cape town',
      progress: 85,
      raised: 12800,
      needed: 15000,
      filledPockets: 85,
      totalPockets: 100
    },
    {
      id: '2',
      headerColor: '#FFD700', // Gold
      title: 'business equipment',
      subtitle: 'the gift of business',
      user: 'sarah k.',
      location: 'durban',
      progress: 45,
      raised: 6750,
      needed: 15000,
      filledPockets: 45,
      totalPockets: 100
    },
    {
      id: '3',
      headerColor: '#4169E1', // Royal blue
      title: 'educational fund',
      subtitle: 'the gift of education',
      user: 'michael r.',
      location: 'johannesburg',
      progress: 70,
      raised: 10500,
      needed: 15000,
      filledPockets: 70,
      totalPockets: 100
    }
  ]

  const handleSupport = (id) => {
    console.log(`Supporting orchard ${id}`)
    // Navigate to orchard detail page using React Router
    navigate(`/animated-orchard/${id}`)
  }

  const handleViewAll = () => {
    navigate('/browse-orchards')
  }

  return (
    <div className="space-y-6">
      {/* Top bar with transparent background for better readability */}
      <div className="bg-card/20 backdrop-blur-sm rounded-2xl p-6 border border-border/30 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary-foreground font-playfair drop-shadow-lg">
            featured orchards
          </h2>
          <button
            onClick={handleViewAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-card/20 border border-border/30 rounded-lg hover:bg-card/30 transition-colors backdrop-blur-sm drop-shadow-sm"
          >
            view all
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mockData.map((card) => (
          <CrowdfundingCard
            key={card.id}
            cardData={card}
            onSupport={handleSupport}
          />
        ))}
      </div>
    </div>
  )
}

export default FeaturedOrchards