import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data) => {
    try {
      setError('');
      await apiClient.post('/auth/forgot-password', data);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 items-center pb-6">
          <CardTitle className="text-2xl text-center">Reset your password</CardTitle>
          <p className="text-sm text-gray-500 text-center">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center">
              <div className="p-3 text-sm text-green-700 bg-green-50 rounded-md mb-4">
                If an account exists for that email, we have sent password reset instructions.
              </div>
              <Link to="/login" className="text-indigo-600 font-medium hover:text-indigo-500">
                Return to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {error}
                </div>
              )}
              <Input
                label="Email address"
                type="email"
                error={errors.email?.message}
                {...register('email')}
              />
              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Send reset link
              </Button>
              <div className="text-center mt-4">
                <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
