import apiClient from './core/apiClient';

const notificationService = {
  getNotifications: async () => {
    const response = await apiClient.cachedGet('/user/notifications', { ttl: 10000, silent: true });
    return response.data;
  },

  markAsRead: async () => {
    const response = await apiClient.put('/user/notifications/read-all', {}, { silent: true });
    apiClient.invalidateCache('/user/notifications');
    return response.data;
  },
};

export default notificationService;
