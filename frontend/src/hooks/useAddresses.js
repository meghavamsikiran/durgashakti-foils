import { useState, useCallback, useEffect } from 'react';
import addressService from '../services/address.service';
import { toast } from 'sonner';

export const useAddresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await addressService.getAddresses();
      setAddresses(data || []);
    } catch (err) {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  const addAddress = async (addressData) => {
    try {
      await addressService.addAddress(addressData);
      toast.success('Address saved successfully');
      fetchAddresses();
      return true;
    } catch (err) {
      return false;
    }
  };

  const updateAddress = async (id, addressData) => {
    try {
      await addressService.updateAddress(id, addressData);
      toast.success('Address updated successfully');
      fetchAddresses();
      return true;
    } catch (err) {
      return false;
    }
  };

  const deleteAddress = async (id) => {
    try {
      await addressService.deleteAddress(id);
      toast.success('Address removed');
      fetchAddresses();
      return true;
    } catch (err) {
      return false;
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  return { addresses, loading, fetchAddresses, addAddress, updateAddress, deleteAddress };
};
