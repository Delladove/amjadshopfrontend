import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from "../context/AuthProvider.jsx";

const ProtectedRoute = ({ allowedRoles }) => {
   const { user, isLoading } = useAuth();

   if(isLoading) return <div className="spinner-parent" ><img src='./spinner.png' className="spinner"/></div>;

  // Check if user is logged in, and if their role matches the page requirements
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute