import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthProvider.jsx";

const PublicRoute = () => {
  const { user, isLoading } = useAuth();

  if(isLoading) return <div className="spinner-parent" ><img src='./spinner.png' className="spinner"/></div>;

  if (user) {
    return (
      <Navigate
        to={
          user.role === "admin"
            ? "/admin/home"
            : "/warehouse"
        }
        replace
      />
    );
  }

  return <Outlet />;
}

export default PublicRoute