import React from 'react';
import { apiClient } from '../api/apiClient.ts';

export interface VkData {
  vkToken: string;
  vkUserId: string;
}

export interface MainPageHandlers {
  handleSubmit: (username: string, password: string) => Promise<void>;
  handleVkModalClose: (e: React.MouseEvent) => void;
  handleVkDataChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleVkDataSubmit: (vkData: VkData) => Promise<void>;
  handleVkModalOpen: () => Promise<void>;
}

export const createMainPageHandlers = (
  setShowModal: (show: boolean) => void,
  setShowVkModal: (show: boolean) => void,
  setUsername: (username: string) => void,
  setPassword: (password: string) => void,
  setIsLoading: (loading: boolean) => void,
  setError: (error: string) => void,
  setVkData: (data: VkData) => void,
  vkData: VkData
): MainPageHandlers => {
  const handleSubmit = async (username: string, password: string) => {
    if (!username.trim() || !password.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const data = await apiClient.login(username, password);
      
      if (data.error) {
        setError('Неправильный пароль');
        return;
      }

      setShowModal(false);
    } catch (error) {
      console.error('Ошибка при запросе:', error);
      setError('Произошла ошибка при входе');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVkModalClose = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowVkModal(false);
    }
  };

  const handleVkDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVkData({
      ...vkData,
      [name]: value
    });
  };

  const handleVkDataSubmit = async (vkData: VkData) => {
    try {
      setIsLoading(true);
      const response = await apiClient.updateUser(vkData);
      if (response === null) {
        setShowVkModal(false);
        return;
      }
      setShowVkModal(false);
    } catch (error) {
      console.error('Ошибка при обновлении данных:', error);
      setError(error instanceof Error ? error.message : 'Ошибка при обновлении данных');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVkModalOpen = async () => {
    try {
      setIsLoading(true);
      const userData = await apiClient.getMe();
      console.log(userData);
      setVkData({
        vkToken: userData.payload.vkToken || '',
        vkUserId: userData.payload.vkId || '',
      });
      setShowVkModal(true);
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      setError('Ошибка при загрузке данных');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleSubmit,
    handleVkModalClose,
    handleVkDataChange,
    handleVkDataSubmit,
    handleVkModalOpen
  };
}; 