import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export const usePincodeLookup = () => {
  const [loading, setLoading] = useState(false);

  const lookup = useCallback(async (pincode) => {
    if (pincode.length !== 6) return null;

    setLoading(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();
      
      if (data[0].Status === "Success") {
        const postOffice = data[0].PostOffice[0];
        toast.success(`Location detected: ${postOffice.District}, ${postOffice.State}`);
        return {
          state: postOffice.State,
          city: postOffice.District || postOffice.Block
        };
      } else {
        toast.error("Invalid Pincode");
        return null;
      }
    } catch (err) {
      console.error("Pincode API failed:", err);
      toast.error("Failed to lookup pincode");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { lookup, loading };
};
