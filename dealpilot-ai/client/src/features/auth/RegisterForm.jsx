import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export function RegisterForm() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    try {
      setError('');
      setSuccess('');
      await apiClient.post('/auth/register', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        role: 'founder'
      });
      setSuccess('Registration successful! Please check your email to verify your account.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to register. Please try again.';
      setError(errMsg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-sm text-green-700 bg-green-50 rounded-md">
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="First Name"
          error={errors.firstName?.message}
          {...register('firstName')}
        />
        <Input
          label="Last Name"
          error={errors.lastName?.message}
          {...register('lastName')}
        />
      </div>

      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />
      
      <Input
        label="Password"
        type="password"
        error={errors.password?.message}
        {...register('password')}
      />

      <Input
        label="Confirm Password"
        type="password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        Create account
      </Button>
    </form>
  );
}
