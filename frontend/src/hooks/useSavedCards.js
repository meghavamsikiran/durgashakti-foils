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
      const saved = await cardService.saveCard(cardData);
      setCards(prev => [...prev, saved]);
      toast.success('Card saved securely');
      return true;
    } catch (err) {
      return false;
    }
  };

  const updateCard = async (id, cardData) => {
    try {
      const updated = await cardService.updateCard(id, cardData);
      setCards(prev => prev.map(card => card.id === id ? updated : card));
      toast.success('Card updated');
      return true;
    } catch (err) {
      return false;
    }
  };

  const deleteCard = async (id) => {
    try {
      await cardService.deleteCard(id);
      setCards(prev => prev.filter(card => card.id !== id));
      toast.success('Card removed');
      return true;
    } catch (err) {
      return false;
    }
  };

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return { cards, loading, fetchCards, saveCard, updateCard, deleteCard };
};
