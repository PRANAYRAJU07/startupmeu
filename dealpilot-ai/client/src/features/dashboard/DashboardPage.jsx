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
                  
                  {computeMutation.isError && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                      {computeMutation.error?.response?.data?.error?.message || 
                       computeMutation.error?.response?.data?.message || 
                       'Failed to compute matches.'}
                    </div>
                  )}

                  {computeMutation.isSuccess && (
                    <div className="p-3 text-sm text-green-700 bg-green-50 rounded-md">
                      Matching complete!
                    </div>
                  )}

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
                  <div className="space-y-6">
                    {matchesData.slice(0, 5).map(match => {
                      const investor = match.investorId;
                      return (
                        <div key={match._id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold text-lg text-gray-900">{investor?.name}</h3>
                              <p className="text-sm text-gray-600">{investor?.organization}</p>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                match.totalScore >= 80 ? 'bg-green-100 text-green-800' : 
                                match.totalScore >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                Score: {match.totalScore}/100
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs mb-3 text-gray-600">
                            <div><span className="font-medium text-gray-900">Stage:</span> {investor?.stages?.join(', ') || 'N/A'}</div>
                            <div><span className="font-medium text-gray-900">Industry:</span> {investor?.industries?.join(', ') || 'N/A'}</div>
                            <div><span className="font-medium text-gray-900">Geography:</span> {investor?.geographies?.join(', ') || 'N/A'}</div>
                            <div>
                              <span className="font-medium text-gray-900">Tickets:</span> 
                              {investor?.minTicketSize ? `$${investor.minTicketSize.toLocaleString()}` : 'N/A'} - 
                              {investor?.maxTicketSize ? `$${investor.maxTicketSize.toLocaleString()}` : 'N/A'}
                            </div>
                          </div>

                          {investor?.thesis && (
                            <p className="text-xs text-gray-700 italic mb-3 border-l-2 border-indigo-200 pl-2">
                              "{investor.thesis}"
                            </p>
                          )}

                          <div className="space-y-2 mt-4 pt-3 border-t border-gray-100">
                            <h4 className="text-xs font-semibold text-gray-900">Match Breakdown:</h4>
                            <ul className="text-xs space-y-1">
                              {match.explanations?.map((exp, idx) => (
                                <li key={idx} className="flex gap-2">
                                  <span className="shrink-0">{exp.match === 'positive' ? '✅' : exp.match === 'partial' ? '⚠️' : exp.match === 'mismatch' ? '❌' : '❓'}</span>
                                  <span className="text-gray-600">{exp.explanation}</span>
                                </li>
                              ))}
                            </ul>
                            
                            {match.missingInfo && match.missingInfo.length > 0 && (
                              <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                                <span className="font-semibold">Missing Info:</span>
                                <ul className="list-disc pl-4 mt-1">
                                  {match.missingInfo.map((info, idx) => <li key={idx}>{info}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                            <Button 
                              variant="secondary" 
                              className="text-xs py-1 h-8"
                              onClick={() => {
                                // Simple mock alert for View Profile if we don't have a dedicated page
                                alert(`Viewing profile for ${investor.name}\n\nOrganization: ${investor.organization || 'N/A'}\nThesis: ${investor.thesis || 'N/A'}\nTicket: ${investor.minTicketSize} - ${investor.maxTicketSize}`);
                              }}
                            >
                              View Profile
                            </Button>

                            <Button 
                              variant="secondary" 
                              className="text-xs py-1 h-8"
                              onClick={async (e) => {
                                const btn = e.target;
                                btn.disabled = true;
                                btn.innerText = 'Saving...';
                                try {
                                  await apiClient.post('/saved-investors', { investorId: investor._id });
                                  btn.innerText = 'Saved';
                                } catch(err) {
                                  btn.innerText = 'Save Error';
                                }
                              }}
                            >
                              Save Investor
                            </Button>

                            <Button 
                              variant="secondary" 
                              className="text-xs py-1 h-8 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                              onClick={async (e) => {
                                const btn = e.target;
                                btn.disabled = true;
                                btn.innerText = 'Drafting...';
                                try {
                                  const res = await apiClient.post('/copilot/outreach-draft', {
                                    startupId: match.startupId,
                                    investorId: investor._id
                                  });
                                  const draft = res.data?.data?.body || 'Draft generated';
                                  alert(`[DRAFT OUTREACH]\n\n${draft}\n\n(Draft saved to clipboard!)`);
                                  navigator.clipboard.writeText(draft);
                                  btn.innerText = 'Draft Copied';
                                } catch(err) {
                                  btn.innerText = 'Draft Error';
                                }
                              }}
                            >
                              Draft Outreach
                            </Button>

                            <Button 
                              variant="secondary" 
                              className="text-xs py-1 h-8 bg-green-50 text-green-700 hover:bg-green-100"
                              onClick={() => {
                                if (investor.websiteUrl) {
                                  window.open(investor.websiteUrl, '_blank');
                                } else if (investor.contactEmail) {
                                  window.location.href = `mailto:${investor.contactEmail}`;
                                } else {
                                  alert('Contact details are unavailable for this investor. Please try drafting outreach and finding them on LinkedIn.');
                                }
                              }}
                            >
                              Contact
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : startup?.lastMatchRunAt ? (
                  <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-md border border-gray-100">
                    <p className="font-semibold text-gray-700 mb-1">No eligible investors found</p>
                    <p>We evaluated all available investors, but none met your profile's hard eligibility criteria (Stage, Geography, and Industry). Try broadening your search criteria or target raise.</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-md border border-gray-100">No matches found yet. Click 'Compute Matches Now' to run the engine.</p>
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
