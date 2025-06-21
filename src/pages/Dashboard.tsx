
import { useAuth } from '../contexts/AuthContext';
import AdminDashboard from './dashboard/AdminDashboard';
import UserDashboard from './dashboard/UserDashboard';

const Dashboard = () => {
  const { isAdmin } = useAuth();

  return isAdmin() ? <AdminDashboard /> : <UserDashboard />;
};

export default Dashboard;
