import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, User } from 'lucide-react';

interface ReferralCircleListProps {
  members: any[];
  myReferrer: any;
  theme: any;
}

export function ReferralCircleList({ members, myReferrer, theme }: ReferralCircleListProps) {
  return (
    <div className="space-y-4">
      {/* My Referrer */}
      {myReferrer && (
        <Card className="border shadow-lg" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: theme.textPrimary }}>
              🌊 Your Ripple Origin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: theme.primaryButton }}>
                {myReferrer.profile?.avatar_url ? (
                  <img src={myReferrer.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="h-5 w-5" style={{ color: theme.textPrimary }} />
                )}
              </div>
              <div>
                <div className="font-semibold" style={{ color: theme.textPrimary }}>
                  {myReferrer.profile?.first_name || 'Sower'} {myReferrer.profile?.last_name || ''}
                </div>
                <div className="text-xs" style={{ color: theme.textSecondary }}>
                  Joined {new Date(myReferrer.referred_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Circle Members */}
      <Card className="border shadow-lg" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2" style={{ color: theme.textPrimary }}>
            <Users className="h-5 w-5" style={{ color: theme.accent }} />
            My Tribe ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🌊</div>
              <p className="font-medium" style={{ color: theme.textPrimary }}>No ripples yet</p>
              <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                Send your first ripple to start building your tribe!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: theme.secondaryButton }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: theme.primaryButton }}>
                    {member.profile?.avatar_url ? (
                      <img src={member.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="h-4 w-4" style={{ color: theme.textPrimary }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: theme.textPrimary }}>
                      {member.profile?.first_name || 'Sower'} {member.profile?.last_name || ''}
                    </div>
                    <div className="text-xs" style={{ color: theme.textSecondary }}>
                      Joined {new Date(member.referred_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
