import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useMarketingStats } from '@/hooks/useMarketingStats';
import { formatCurrency } from '@/utils/formatters';
import { TrendingUp, TrendingDown, Share2, Download, Sparkles } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#f59e0b', '#f97316', '#eab308', '#84cc16', '#10b981'];

export function MarketingAnalyticsTab() {
  const { stats, loading } = useMarketingStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-amber-300/60">
        No marketing data available. Start tracking events to see your analytics!
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today's Funnel */}
      <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10">
        <CardHeader>
          <CardTitle className="text-amber-300 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Today's Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-white">Impressions</span>
                <span className="text-amber-300 font-mono">{stats.funnel.impressions}</span>
              </div>
              <Progress value={100} className="h-2 bg-amber-900/30" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-white">Views</span>
                <span className="text-amber-300 font-mono">{stats.funnel.views}</span>
              </div>
              <Progress 
                value={stats.funnel.impressions > 0 ? (stats.funnel.views / stats.funnel.impressions) * 100 : 0} 
                className="h-2 bg-amber-900/30" 
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-white">Bestowals Started</span>
                <span className="text-amber-300 font-mono">{stats.funnel.bestowals}</span>
              </div>
              <Progress 
                value={stats.funnel.views > 0 ? (stats.funnel.bestowals / stats.funnel.views) * 100 : 0} 
                className="h-2 bg-amber-900/30" 
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-white">Purchases</span>
                <span className="text-amber-300 font-mono">{stats.funnel.purchases}</span>
              </div>
              <Progress 
                value={stats.funnel.bestowals > 0 ? (stats.funnel.purchases / stats.funnel.bestowals) * 100 : 0} 
                className="h-2 bg-amber-900/30" 
              />
            </div>
            <div className="pt-4 border-t border-amber-500/20 flex justify-between items-center">
              <div>
                <div className="text-sm text-amber-300/80">Conversion Rate</div>
                <div className="text-2xl font-bold text-white">{stats.funnel.conversionRate.toFixed(2)}%</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-amber-300/80">Revenue</div>
                <div className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.funnel.revenue)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10">
        <CardHeader>
          <CardTitle className="text-amber-300 flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Top Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.topProducts.map((product, i) => (
              <div key={product.productId} className="flex items-center justify-between p-3 rounded-xl bg-amber-900/20">
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{product.productName}</div>
                  <div className="text-sm text-amber-300/80">{formatCurrency(product.revenue)}</div>
                </div>
                <div className="flex items-center gap-3">
                  {product.changePercent >= 0 ? (
                    <span className="text-emerald-400 text-sm font-semibold flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      +{product.changePercent.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-red-400 text-sm font-semibold flex items-center gap-1">
                      <TrendingDown className="h-4 w-4" />
                      {product.changePercent.toFixed(1)}%
                    </span>
                  )}
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                    Promote
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Attribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10">
          <CardHeader>
            <CardTitle className="text-amber-300">Revenue by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.attribution.bySource}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ source, percentage }) => `${source}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {stats.attribution.bySource.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1c120c', 
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: '0.75rem'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10">
          <CardHeader>
            <CardTitle className="text-amber-300">Top Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.attribution.topCampaigns.map((campaign, i) => (
                <div key={i} className="p-3 rounded-xl bg-amber-900/20">
                  <div className="flex justify-between mb-1">
                    <span className="text-white font-medium">{campaign.campaign}</span>
                    <span className="text-amber-300 font-mono">{formatCurrency(campaign.revenue)}</span>
                  </div>
                  <div className="text-xs text-amber-300/60">CTR: {campaign.ctr.toFixed(2)}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audience Snapshot */}
      <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10">
        <CardHeader>
          <CardTitle className="text-amber-300">Audience Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-amber-300 mb-3">Age Distribution</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.audience.age}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ range, count }) => `${range}: ${count}`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.audience.age.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1c120c', 
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      borderRadius: '0.75rem'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 className="text-amber-300 mb-3">Top Countries</h4>
              <div className="space-y-2">
                {stats.audience.country.map((c, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-white">{c.country}</span>
                    <span className="text-amber-300">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hourly Heat-map */}
      <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10">
        <CardHeader>
          <CardTitle className="text-amber-300">Hourly Revenue Heat-map</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.hourlyRevenue}>
              <XAxis dataKey="hour" stroke="#f59e0b" />
              <YAxis stroke="#f59e0b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1c120c', 
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '0.75rem'
                }}
              />
              <Bar dataKey="revenue" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Real-time Events */}
      <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10">
        <CardHeader>
          <CardTitle className="text-amber-300">Real-time Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {stats.recentEvents.map((event, i) => (
              <div key={i} className="p-3 rounded-xl bg-amber-900/20 animate-fade-in">
                <div className="text-sm text-white">
                  {event.event === 'bestowal_complete' && event.amount ? (
                    <>Someone in <span className="text-amber-400">{event.location}</span> just bestowed <span className="text-emerald-400">{formatCurrency(event.amount)}</span></>
                  ) : (
                    <>{event.event} from {event.location}</>
                  )}
                </div>
                <div className="text-xs text-amber-300/60 mt-1">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export & Share */}
      <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Export & Share</h3>
              <p className="text-amber-300/80">Generate PDF report or share your funnel stats</p>
            </div>
            <div className="flex gap-3">
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF Report
              </Button>
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Funnel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

