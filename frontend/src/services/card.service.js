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

  updateCard: async (id, cardData) => {
    const response = await apiClient.put(`/user/cards/${id}`, cardData);
    return response.data;
  },

  deleteCard: async (id) => {
    const response = await apiClient.delete(`/user/cards/${id}`);
    return response.data;
  },
};

export default cardService;
