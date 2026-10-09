import React from 'react';
import { Link } from 'react-router-dom';
import { RegisterForm } from './RegisterForm';
import { Briefcase } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 items-center pb-6">
          <div className="flex items-center justify-center mb-4">
            <Briefcase className="h-10 w-10 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl text-center">Create an account</CardTitle>
          <p className="text-sm text-gray-500 text-center">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </p>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}
