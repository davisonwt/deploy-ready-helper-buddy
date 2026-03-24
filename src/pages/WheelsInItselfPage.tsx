import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function WheelsInItselfPage() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to the unified calendar feed — wheel view is now integrated
    navigate('/enochian-calendar-design', { replace: true });
  }, [navigate]);

  return null;
}
