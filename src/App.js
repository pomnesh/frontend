import { View, AppRoot } from '@vkontakte/vkui';
import bridge from '@vkontakte/vk-bridge';
import { useState, useEffect } from 'react';
import MainPage from './pages/MainPage.tsx';
 
export default function App() {
  const [vkUser, setVkUser] = useState(null);
  
  useEffect(() => {
    async function fetchUser() {
      const user = await bridge.send('VKWebAppGetUserInfo');
      setVkUser(user);
    }
    fetchUser();
  }, []);

  return (  
    <MainPage />
  );
}