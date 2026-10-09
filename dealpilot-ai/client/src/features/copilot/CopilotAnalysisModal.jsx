import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/Button';
import { X, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export function CopilotAnalysisModal({ investor, onClose }) {
  const queryClient = useQueryClient();
  const [pitchText, setPitchText] = useState('');

  const { data: startup } = useQuery({
    queryKey: ['startup'],
    queryFn: async () => {
      const res = await apiClient.get('/startups/me');
      return res.data.data;
    }
  });

  const analyzeMutation = useMutation({
    mutationFn: (data) => apiClient.post('/copilot/analyze', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['analyses']);
    }
  });

  const handleAnalyze = () => {
    analyzeMutation.mutate({
      startupId: startup?._id,
      pitchText: pitchText || 'Our startup is revolutionizing this space.',
      goals: 'Evaluate fit with ' + investor.name,
    });
  };

  const draftMutation = useMutation({
    mutationFn: () => apiClient.post('/copilot/outreach-draft', {
      startupId: startup?._id,
      investorId: investor._id,
    })
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-4 sm:p-0">
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-lg bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-indigo-600" />
            AI Copilot Analysis: {investor.name}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {!analyzeMutation.isSuccess ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Provide your latest pitch or executive summary to get a tailored AI analysis of your fit with {investor.name}.
              </p>
              <textarea
                value={pitchText}
                onChange={(e) => setPitchText(e.target.value)}
                placeholder="Paste your pitch deck summary here..."
                rows={6}
                className="w-full rounded-md border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {analyzeMutation.isError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100">
                  {analyzeMutation.error?.response?.data?.error?.message || analyzeMutation.error.message || 'An error occurred during analysis.'}
                </div>
              )}
              <Button 
                onClick={handleAnalyze} 
                className="w-full"
                isLoading={analyzeMutation.isPending}
              >
                Analyze Pitch
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-md bg-indigo-50 p-4 border border-indigo-100">
                <h4 className="font-medium text-indigo-900 mb-2">Executive Summary</h4>
                <p className="text-sm text-indigo-800">
                  {analyzeMutation.data?.data?.output?.executiveSummary}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="flex items-center font-medium text-gray-900 mb-2">
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Strengths
                  </h4>
                  <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                    {analyzeMutation.data?.data?.output?.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="flex items-center font-medium text-gray-900 mb-2">
                    <AlertCircle className="mr-2 h-4 w-4 text-amber-600" /> Weaknesses
                  </h4>
                  <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                    {analyzeMutation.data?.data?.output?.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                <ul className="list-decimal pl-5 text-sm text-gray-600 space-y-1">
                  {analyzeMutation.data?.data?.output?.prioritizedRecommendations?.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <Button 
                  onClick={() => draftMutation.mutate()} 
                  variant="secondary"
                  isLoading={draftMutation.isPending}
                >
                  Generate Outreach Draft
                </Button>

                {draftMutation.isError && (
                  <div className="mt-4 p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100">
                    {draftMutation.error?.response?.data?.error?.message || draftMutation.error.message || 'An error occurred during draft generation.'}
                  </div>
                )}

                {draftMutation.isSuccess && (
                  <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50 text-sm whitespace-pre-wrap">
                    <p className="font-semibold border-b pb-2 mb-2">{draftMutation.data?.data?.subject}</p>
                    <p>{draftMutation.data?.data?.body}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
