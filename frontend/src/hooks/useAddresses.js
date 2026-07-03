import { useState, useCallback, useEffect } from 'react';
import addressService from '../services/address.service';
import { toast } from 'sonner';

export const useAddresses = () => {
  const [addresses, setAddresses] = useState(() => {
    const cached = addressService.getCached ? addressService.getCached() : null;
    return cached || [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = addressService.getCached ? addressService.getCached() : null;
    return !cached;
  });

  const fetchAddresses = useCallback(async () => {
    const cached = addressService.getCached ? addressService.getCached() : null;
    if (!cached || cached.length === 0) {
      setLoading(true);
    }
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
      const newAddr = await addressService.addAddress(addressData);
      toast.success('Address saved successfully');
      setAddresses(prev => [newAddr, ...prev.filter(a => !newAddr.isDefault || !a.isDefault)]);
      fetchAddresses();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add address');
      return false;
    }
  };

  const updateAddress = async (id, addressData) => {
    try {
      const updatedAddr = await addressService.updateAddress(id, addressData);
      toast.success('Address updated successfully');
      setAddresses(prev => prev.map(a => a.id === id ? updatedAddr : (updatedAddr.isDefault ? { ...a, isDefault: false } : a)));
      fetchAddresses();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update address');
      return false;
    }
  };

  const deleteAddress = async (id) => {
    try {
      await addressService.deleteAddress(id);
      toast.success('Address removed');
      setAddresses(prev => prev.filter(addr => addr.id !== id));
      fetchAddresses();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove address');
      return false;
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  return { addresses, loading, fetchAddresses, addAddress, updateAddress, deleteAddress };
};
