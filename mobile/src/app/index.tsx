import { Redirect } from 'expo-router';
import { useAuth } from '@/store/auth';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return <Redirect href={isAuthenticated ? '/(app)/dashboard' : '/(auth)/login'} />;
}
