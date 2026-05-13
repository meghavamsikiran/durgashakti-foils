import { useState, useCallback, useEffect } from 'react';
import cardService from '../services/card.service';
import { toast } from 'sonner';

export const useSavedCards = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cardService.getSavedCards();
      setCards(data || []);
    } catch (err) {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  const saveCard = async (cardData) => {
    try {
      await cardService.saveCard(cardData);
      toast.success('Card saved securely');
      fetchCards();
      return true;
    } catch (err) {
      return false;
    }
  };

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return { cards, loading, fetchCards, saveCard };
};
