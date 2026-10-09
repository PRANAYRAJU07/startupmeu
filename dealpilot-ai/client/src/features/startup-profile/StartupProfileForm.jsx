import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

const profileSchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  industry: z.string().min(1, 'Industry is required'),
  stage: z.string().min(1, 'Stage is required'),
  targetRaiseAmount: z.number({ coerce: true }).min(0, 'Target raise amount must be a positive number'),
  businessModel: z.string().min(1, 'Business model is required'),
  headquartersCountry: z.string().min(1, 'Headquarters is required'),
  description: z.string().optional(),
});

export function StartupProfileForm() {
  const queryClient = useQueryClient();
  
  const { data: startup, isLoading } = useQuery({
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

  const mutation = useMutation({
    mutationFn: (data) => {
      if (startup) {
        return apiClient.put('/startups/me', data);
      }
      return apiClient.post('/startups/me', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['startup']);
    }
  });

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema),
    values: startup || {
      name: '',
      industry: 'saas',
      stage: 'seed',
      targetRaiseAmount: 1000000,
      businessModel: 'b2b',
      headquartersCountry: 'United States',
      description: ''
    }
  });

  if (isLoading) return <div>Loading profile...</div>;

  const onSubmit = (data) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {mutation.isError && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {mutation.error.response?.data?.message || 'An error occurred'}
        </div>
      )}
      {mutation.isSuccess && (
        <div className="p-3 text-sm text-green-700 bg-green-50 rounded-md">
          Profile saved successfully.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input label="Company Name" error={errors.name?.message} {...register('name')} />
        <Input label="Headquarters Country" error={errors.headquartersCountry?.message} {...register('headquartersCountry')} />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
          <select {...register('industry')} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="saas">SaaS</option>
            <option value="fintech">Fintech</option>
            <option value="healthtech">Healthtech</option>
            <option value="ecommerce">E-commerce</option>
            <option value="deeptech">Deeptech</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
          <select {...register('stage')} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="pre-seed">Pre-Seed</option>
            <option value="seed">Seed</option>
            <option value="series-a">Series A</option>
            <option value="series-b">Series B</option>
            <option value="growth">Growth</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Target Raise Amount ($)" type="number" error={errors.targetRaiseAmount?.message} {...register('targetRaiseAmount')} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Model</label>
          <select {...register('businessModel')} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="b2b">B2B</option>
            <option value="b2c">B2C</option>
            <option value="b2b2c">B2B2C</option>
            <option value="marketplace">Marketplace</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          {...register('description')}
          rows={4}
          className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <Button type="submit" isLoading={mutation.isPending}>
        {startup ? 'Update Profile' : 'Complete Profile'}
      </Button>
    </form>
  );
}
