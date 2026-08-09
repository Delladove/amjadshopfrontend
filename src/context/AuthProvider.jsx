
import { createContext, useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { loginApi } from "../api/misc"; 

const AuthContext = createContext(null);



export const AuthProvider = ({ children }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['authUser'], // The unique label for this user cache
    queryFn: loginApi.me,    // Runs your fetch call to /api/login/me
    retry: false,            // Don't retry pinging backend if 401 is thrown
    staleTime: Infinity,     // Keeps the memory alive while tab is open
  });



  // Since a 401 status throws an error, "data" will only exist on a successful 200 log in.

  // If data exists, your user object is safe to pull out.

  const user = data?.authenticated ? data.user : null;

  return (

    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>

  );

};


export const useAuth = () => useContext(AuthContext);
