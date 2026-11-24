import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import { authOptions } from '../../lib/auth';
import AdminLoginGate from '../../components/AdminLoginGate';

const AdminPanel = dynamic(() => import('../../components/AdminPanel'), { ssr: false });

export const metadata = { title: 'Admin — Leisureville Sigiriya' };

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) return <AdminLoginGate />;
  if (!session.user?.isAdmin) return <AdminLoginGate unauthorized />;

  return <AdminPanel user={session.user} />;
}
