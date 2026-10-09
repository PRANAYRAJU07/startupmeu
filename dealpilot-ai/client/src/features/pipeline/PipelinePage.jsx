import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Download, Target, Edit3 } from 'lucide-react';
import { EditDealModal } from './EditDealModal';

const STAGES = [
  'shortlisted', 'contacted', 'meeting-scheduled', 'in-discussion',
  'due-diligence', 'committed', 'closed-won', 'closed-lost',
];

export function PipelinePage() {
  const queryClient = useQueryClient();
  const [selectedDeal, setSelectedDeal] = useState(null);

  const { data: dealsData, isLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const res = await apiClient.get('/deals');
      return res.data.data;
    }
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['analytics-funnel'],
    queryFn: async () => {
      const res = await apiClient.get('/analytics/funnel');
      return res.data.data;
    }
  });

  const updateDealMutation = useMutation({
    mutationFn: ({ id, stage }) => apiClient.patch(`/deals/${id}`, { stage }),
    onSuccess: () => {
      queryClient.invalidateQueries(['deals']);
      queryClient.invalidateQueries(['analytics-funnel']);
    }
  });

  const handleExport = async () => {
    try {
      const res = await apiClient.get('/analytics/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'dealpilot-pipeline.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const getDealsByStage = (stage) => {
    return dealsData?.filter(d => d.stage === stage) || [];
  };

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 overflow-hidden">
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Pipeline</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your fundraising process.</p>
        </div>
        <div className="flex gap-4 items-center">
          {analyticsData && (
            <div className="text-sm">
              <span className="font-semibold text-gray-900">Total Deals: </span>
              {analyticsData.summary.totalDeals}
              <span className="mx-2 text-gray-300">|</span>
              <span className="font-semibold text-gray-900">Committed: </span>
              ${analyticsData.summary.totalCommitted.toLocaleString()}
            </div>
          )}
          <Button variant="secondary" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">Loading pipeline...</div>
      ) : (
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const stageDeals = getDealsByStage(stage);
            return (
              <div key={stage} className="flex flex-col w-80 shrink-0 bg-gray-50 rounded-lg border border-gray-200">
                <div className="p-3 border-b border-gray-200 bg-gray-100/50 rounded-t-lg flex justify-between items-center">
                  <h3 className="font-semibold text-sm text-gray-700 capitalize">{stage.replace('-', ' ')}</h3>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                    {stageDeals.length}
                  </span>
                </div>
                
                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                  {stageDeals.map(deal => (
                    <Card key={deal._id} className="cursor-move hover:border-indigo-300 transition-colors">
                      <CardContent className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-sm text-gray-900 line-clamp-2">
                            {deal.investorId?.name || deal.investorName || 'Unknown Investor'}
                          </p>
                          {deal.committedAmount > 0 && (
                            <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                              ${deal.committedAmount.toLocaleString()}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                           <select 
                             className="text-xs border-0 bg-transparent text-gray-500 cursor-pointer focus:ring-0 p-0"
                             value={deal.stage}
                             onChange={(e) => updateDealMutation.mutate({ id: deal._id, stage: e.target.value })}
                             disabled={updateDealMutation.isPending}
                           >
                             {STAGES.map(s => (
                               <option key={s} value={s}>{s.replace('-', ' ')}</option>
                             ))}
                           </select>

                           <button 
                             className="text-gray-400 hover:text-indigo-600 p-1 rounded transition-colors"
                             onClick={() => setSelectedDeal(deal)}
                             title="Edit Deal Details"
                           >
                             <Edit3 className="h-4 w-4" />
                           </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {stageDeals.length === 0 && (
                    <div className="h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
                      <Target className="h-5 w-5 mb-1 opacity-50" />
                      <p className="text-xs">No deals</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedDeal && (
        <EditDealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
      )}
    </div>
  );
}
