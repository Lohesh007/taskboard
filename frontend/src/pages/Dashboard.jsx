import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/workspaces');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}