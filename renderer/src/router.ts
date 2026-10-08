import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';

export function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  return useMemo(() => ({ push: (path: string) => {
    if (path !== location.pathname + location.search + location.hash) void navigate(path);
  } }), [navigate, location.pathname, location.search, location.hash]);
}
