import apiClient from './core/apiClient';

const notificationService = {
  getNotifications: async () => {
    const response = await apiClient.get('/user/notifications');
    return response.data;
  },

  markAsRead: async () => {
    const response = await apiClient.put('/user/notifications/read-all');
    return response.data;
  },
};

export default notificationService;
