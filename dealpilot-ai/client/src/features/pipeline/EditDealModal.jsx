import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/Button';
import { X, Trash2 } from 'lucide-react';

const STAGES = [
  'shortlisted', 'contacted', 'meeting-scheduled', 'in-discussion',
  'due-diligence', 'committed', 'closed-won', 'closed-lost',
];

export function EditDealModal({ deal, onClose }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(deal.notes || '');
  const [stage, setStage] = useState(deal.stage);
  const [committedAmount, setCommittedAmount] = useState(deal.committedAmount || 0);

  const updateMutation = useMutation({
    mutationFn: (data) => apiClient.patch(`/deals/${deal._id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['deals']);
      queryClient.invalidateQueries(['analytics-funnel']);
      onClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/deals/${deal._id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['deals']);
      queryClient.invalidateQueries(['analytics-funnel']);
      onClose();
    }
  });

  const handleSave = () => {
    updateMutation.mutate({
      stage,
      notes,
      committedAmount: Number(committedAmount)
    });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this deal?')) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Edit Deal: {deal.investorId?.name || deal.investorName}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {updateMutation.isError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded border border-red-100">
              {updateMutation.error?.response?.data?.error?.message || 'Failed to update deal.'}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              {STAGES.map(s => (
                <option key={s} value={s}>{s.replace('-', ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Committed Amount ($)</label>
            <input
              type="number"
              min="0"
              value={committedAmount}
              onChange={(e) => setCommittedAmount(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Next Action</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Record meetings, questions, next steps..."
            />
          </div>
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button 
            variant="ghost" 
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleDelete}
            isLoading={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
          
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} isLoading={updateMutation.isPending}>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
