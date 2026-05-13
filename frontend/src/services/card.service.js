import apiClient from './core/apiClient';

const cardService = {
  getSavedCards: async () => {
    const response = await apiClient.get('/user/cards');
    return response.data;
  },

  saveCard: async (cardData) => {
    const response = await apiClient.post('/user/cards', cardData);
    return response.data;
  },
};

export default cardService;
