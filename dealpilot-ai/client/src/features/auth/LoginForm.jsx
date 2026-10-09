import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from './AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Link, useNavigate } from 'react-router-dom';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    try {
      setError('');
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to login. Please check your credentials.';
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
      
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />
      
      <div>
        <Input
          label="Password"
          type="password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="mt-1 flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            Forgot your password?
          </Link>
        </div>
      </div>

      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        Sign in
      </Button>
    </form>
  );
}
