import React, { useState, useEffect, useRef } from 'react';
import "./MainPage.css";
import { createMainPageHandlers, VkData } from './MainPage.handlers.ts';
import { apiClient } from '../api/apiClient.ts';

interface Chat {
  id: number;
  name: string;
  photoUrl: string;
  type: string;
  lastMessage: string;
  unreadCount: number;
  isGroupChat: boolean;
}

const filters = ["All", "Photos", "Videos", "Docs", "Audio", "Links"];
const cards = ["🌄", "🎥", "📄", "🎵", "🔗", "🎵"];
const PAGE_SIZE = 20;

export default function MainPage() {
  const [showModal, setShowModal] = useState(true);
  const [showVkModal, setShowVkModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [vkData, setVkData] = useState<VkData>({
    vkToken: '',
    vkUserId: ''
  });
  const [chats, setChats] = useState<Chat[]>([]);
  const [totalChats, setTotalChats] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loadingChats, setLoadingChats] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);

  useEffect(() => {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    if (cookies.bearer_token && cookies.refresh_token) {
      setShowModal(false);
      setChats([]);
      setOffset(0);
      setTotalChats(0);
      loadChats(0);
    }
  }, []);

  const loadChats = async (newOffset: number) => {
    if (loadingChats) return;
    setLoadingChats(true);
    try {
      const response = await apiClient.getUserChats(newOffset, PAGE_SIZE);
      if (response?.payload?.items) {
        setChats(prev => newOffset === 0 ? response.payload.items : [...prev, ...response.payload.items]);
        setTotalChats(response.payload.totalCount);
        setOffset(newOffset + response.payload.items.length);
      }
    } catch (error) {
      console.error('Ошибка при загрузке диалогов:', error);
    } finally {
      setLoadingChats(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
      if (!loadingChats && chats.length < totalChats) {
        loadChats(offset);
      }
    }
  };

  const handlers = createMainPageHandlers(
    setShowModal,
    setShowVkModal,
    setUsername,
    setPassword,
    setIsLoading,
    setError,
    setVkData,
    vkData
  );

  return (
    <div className="app-wrapper">
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Добро пожаловать!</h2>
            <input
              type="text"
              placeholder="Имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
            {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
            <button 
              onClick={() => handlers.handleSubmit(username, password)}
              disabled={isLoading}
            >
              {isLoading ? 'Загрузка...' : 'Продолжить'}
            </button>
          </div>
        </div>
      )}
      {showVkModal && (
        <div className="modal-overlay" onClick={handlers.handleVkModalClose}>
          <div className="modal">
            <h2>Настройки VK</h2>
            <div className="input-group">
              <label>ID пользователя VK</label>
              <input
                type="text"
                name="vkUserId"
                placeholder="VK id"
                value={vkData.vkUserId}
                onChange={handlers.handleVkDataChange}
                disabled={isLoading}
              />
            </div>
            <div className="input-group">
              <label>Токен доступа VK</label>
              <input
                type="text"
                name="vkToken"
                placeholder="VK Access Token"
                value={vkData.vkToken}
                onChange={handlers.handleVkDataChange}
                disabled={isLoading}
              />
            </div>
            {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
            <button 
              onClick={() => handlers.handleVkDataSubmit(vkData)}
              disabled={isLoading}
            >
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}
      <header className="site-header">
        <h1>VK Attachments Viewer</h1>
        <button 
          className="connect-btn" 
          onClick={handlers.handleVkModalOpen}
          disabled={isLoading}
        >
          {isLoading ? 'Загрузка...' : 'Connect VK'}
        </button>
      </header>
      <div className="app">
        <aside className="sidebar" ref={sidebarRef} onScroll={handleScroll} style={{overflowY: 'auto', maxHeight: '100vh'}}>
          <h2>Dialogs</h2>
          <div className="dialogs-header">
            <span className="total-chats">Всего диалогов: {totalChats}</span>
          </div>
          {chats.map((chat) => (
            <div 
              className={`dialog${selectedChatId === chat.id ? ' dialog-selected' : ''}`}
              key={chat.id}
              onClick={() => setSelectedChatId(chat.id)}
            >
              <img src={chat.photoUrl} alt={chat.name} className="dialog-avatar" />
              <div className="dialog-info">
                <span className="dialog-name">{chat.name}</span>
              </div>
            </div>
          ))}
          {loadingChats && <div style={{textAlign: 'center', padding: 10}}>Загрузка...</div>}
        </aside>
        <main className="main">
          <div className="header">
            <h1>
              Ivan Petrov
              <br />
              <span style={{ fontSize: 14, color: "#777" }}>
                Viewing attachments
              </span>
            </h1>
          </div>
          <div className="filters">
            {filters.map((filter, idx) => (
              <button key={idx} className={idx === 0 ? "active" : ""}>
                {filter}
              </button>
            ))}
          </div>
          <div className="grid">
            {cards.map((icon, i) => (
              <div className="card" key={i}>
                <span>{icon}</span>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}