import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { StartupProfileForm } from '../startup-profile/StartupProfileForm';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Target, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: startup, isLoading: isLoadingStartup } = useQuery({
    queryKey: ['startup'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/startups/me');
        return res.data.data;
      } catch (err) {
        if (err.response?.status === 404) return null;
        throw err;
      }
    }
  });

  const { data: matchesData, isLoading: isLoadingMatches } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      const res = await apiClient.get('/matches');
      return res.data.data;
    },
    enabled: !!startup,
  });

  const computeMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post('/matches/compute');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['matches']);
    }
  });

  if (isLoadingStartup) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your startup profile and discover investor matches.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Startup Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <StartupProfileForm />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="mr-2 h-5 w-5 text-indigo-600" />
                Matching Engine
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!startup ? (
                <p className="text-sm text-gray-500 mb-4">
                  Complete your profile first to compute investor matches.
                </p>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Find investors whose thesis aligns with your industry, stage, and geography.
                  </p>
                  <Button 
                    className="w-full" 
                    onClick={() => computeMutation.mutate()}
                    isLoading={computeMutation.isPending}
                  >
                    Compute Matches Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {startup && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="mr-2 h-5 w-5 text-green-600" />
                  Top Matches
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingMatches ? (
                  <p className="text-sm text-gray-500">Loading matches...</p>
                ) : matchesData && matchesData.length > 0 ? (
                  <ul className="space-y-3">
                    {matchesData.slice(0, 5).map(match => (
                      <li key={match._id} className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{match.investorId?.name}</p>
                          <p className="text-xs text-gray-500">Score: {match.totalScore}/100</p>
                        </div>
                        <Link to={`/investors`} className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
                          View
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No matches found yet. Run the matching engine.</p>
                )}
                
                {matchesData && matchesData.length > 0 && (
                  <div className="mt-4 pt-2 border-t border-gray-100">
                     <Link to="/investors" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                       View all matches &rarr;
                     </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
