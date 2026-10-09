import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Search, Sparkles } from 'lucide-react';
import { CopilotAnalysisModal } from '../copilot/CopilotAnalysisModal';

export function InvestorDirectoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  const { data: investorsData, isLoading } = useQuery({
    queryKey: ['investors', search, page],
    queryFn: async () => {
      const res = await apiClient.get('/investors', {
        params: { search, page, limit: 12 }
      });
      return res.data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: (investorId) => apiClient.post('/deals', { investorId, stage: 'shortlisted' }),
    onSuccess: () => {
      alert('Investor added to CRM!');
    },
    onError: (error) => {
      if (error.response?.status === 409) {
        alert('Investor is already in your CRM.');
      } else {
        alert('Failed to add to CRM.');
      }
    }
  });

  const handleAnalyze = (investor) => {
    setSelectedInvestor(investor);
    setIsCopilotOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investor Directory</h1>
          <p className="mt-1 text-sm text-gray-500">Discover and analyze potential investors.</p>
        </div>
        <div className="flex gap-2">
          <Input 
            placeholder="Search investors..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-64"
          />
          <Button variant="secondary">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center">Loading directory...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {investorsData?.data?.map((investor) => (
              <Card key={investor._id} className="flex flex-col">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{investor.name}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{investor.organization}</p>
                    </div>
                    {investor.isDemoData && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        Demo
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-900">Type: </span>
                      <span className="text-gray-600 capitalize">{investor.investorType}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Stages: </span>
                      <span className="text-gray-600">{investor.stages?.join(', ')}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Industries: </span>
                      <span className="text-gray-600">{investor.industries?.join(', ')}</span>
                    </div>
                    {investor.thesis && (
                      <div>
                        <span className="font-medium text-gray-900 line-clamp-2">Thesis: {investor.thesis}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 flex flex-col gap-2">
                    <Button 
                      variant="secondary" 
                      className="w-full"
                      onClick={() => saveMutation.mutate(investor._id)}
                      isLoading={saveMutation.isPending}
                    >
                      Add to CRM
                    </Button>
                    <Button 
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0"
                      onClick={() => handleAnalyze(investor)}
                    >
                      <Sparkles className="mr-2 h-4 w-4" /> Copilot Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Pagination basic UI */}
          {investorsData?.meta?.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button 
                variant="secondary" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm font-medium text-gray-700">
                Page {page} of {investorsData.meta.totalPages}
              </span>
              <Button 
                variant="secondary" 
                disabled={page === investorsData.meta.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {isCopilotOpen && selectedInvestor && (
        <CopilotAnalysisModal 
          investor={selectedInvestor} 
          onClose={() => setIsCopilotOpen(false)} 
        />
      )}
    </div>
  );
}
