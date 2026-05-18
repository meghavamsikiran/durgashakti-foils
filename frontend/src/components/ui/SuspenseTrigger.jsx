import React, { useEffect } from 'react';
import { setLoading } from '../../services/core/loadingState';

const SuspenseTrigger = () => {
  useEffect(() => {
    setLoading(true);
    return () => setLoading(false);
  }, []);

  return null;
};

export default SuspenseTrigger;
