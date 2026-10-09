import React from 'react';
import { Link } from 'react-router-dom';
import { LoginForm } from './LoginForm';
import { Briefcase } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 items-center pb-6">
          <div className="flex items-center justify-center mb-4">
            <Briefcase className="h-10 w-10 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl text-center">Sign in to DealPilot AI</CardTitle>
          <p className="text-sm text-gray-500 text-center">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign up
            </Link>
          </p>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
