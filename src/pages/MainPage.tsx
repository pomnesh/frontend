import React, { useState, useEffect, useRef, useCallback } from 'react';
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

interface Attachment {
  id: number;
  type: string;
  url?: string;
  title?: string;
  attachmentInfo?: {
    url: string;
  };
}

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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [nextFrom, setNextFrom] = useState<string | null>(null);
  const [hasMoreAttachments, setHasMoreAttachments] = useState(true);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const attachmentsRef = useRef<HTMLDivElement>(null);

  const loadChats = useCallback(async (newOffset: number) => {
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
  }, []);

  const preloadImages = (items: Attachment[]) => {
    items.forEach(item => {
      if (item.type === 'photo' && item.attachmentInfo?.url) {
        const img = new Image();
        img.src = item.attachmentInfo.url;
      }
    });
  };

  const loadAttachments = useCallback(async (peerId: number, startFrom: string | null) => {
    if (loadingAttachments || !hasMoreAttachments) return;
    setLoadingAttachments(true);
    const count = 100;
    let url = `https://pomnesh-backend.hps-2.ru/api/v1/vk/getAttachments?peerId=${peerId}&count=${count}&includeForwards=true`;
    if (startFrom) {
      url += `&startFrom=${encodeURIComponent(startFrom)}`;
    }
    try {
      const response = await apiClient.request(url, { method: 'GET' });
      if (response?.payload?.items) {
        preloadImages(response.payload.items);
        
        setAttachments(prev => {
          if (!startFrom) return response.payload.items;
          return [...prev, ...response.payload.items];
        });

        if (response.payload.nextFrom) {
          setNextFrom(response.payload.nextFrom);
          setHasMoreAttachments(true);
        } else {
          setNextFrom(null);
          setHasMoreAttachments(false);
        }
      } else {
        if (!startFrom) setAttachments([]);
        setHasMoreAttachments(false);
      }
    } catch (error) {
      if (!startFrom) setAttachments([]);
      setHasMoreAttachments(false);
    } finally {
      setLoadingAttachments(false);
    }
  }, [hasMoreAttachments]);

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
  }, [loadChats]);

  useEffect(() => {
    if (selectedChatId) {
      setAttachments([]);
      setNextFrom(null);
      setHasMoreAttachments(true);
      loadAttachments(selectedChatId, null);
    } else {
      setAttachments([]);
      setNextFrom(null);
      setHasMoreAttachments(true);
    }
  }, [selectedChatId, loadAttachments]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
      if (!loadingChats && chats.length < totalChats) {
        loadChats(offset);
      }
    }
  };

  const handleAttachmentsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const scrollPosition = el.scrollTop + el.clientHeight;
    const scrollHeight = el.scrollHeight;
    const threshold = scrollHeight * 0.7;

    if (scrollPosition >= threshold) {
      if (!loadingAttachments && hasMoreAttachments && selectedChatId) {
        loadAttachments(selectedChatId, nextFrom);
      }
    }
  };

  const photoCount = attachments.filter(att => att.type === 'photo' && att.attachmentInfo?.url).length;
  const needScroll = photoCount > 12;

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

  const handleLoginSuccess = async () => {
    setShowModal(false);
    setChats([]);
    setOffset(0);
    setTotalChats(0);
    await loadChats(0);
  };

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
              onClick={async () => {
                await handlers.handleSubmit(username, password);
                await handleLoginSuccess();
              }}
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
        <div className="header-buttons">
          <button 
            className="connect-btn" 
            onClick={handlers.handleVkModalOpen}
            disabled={isLoading}
          >
            {isLoading ? 'Загрузка...' : 'Connect VK'}
          </button>
          <button 
            className="logout-btn" 
            onClick={handlers.handleLogout}
            disabled={isLoading}
          >
            Выйти
          </button>
        </div>
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
          {loadingChats && (
            <div className="loading-indicator">
              Загрузка
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
            </div>
          )}
        </aside>
        <main className="main">
          <div className="header">
            <h1>
              {selectedChatId ? chats.find(c => c.id === selectedChatId)?.name || '' : ''}
            </h1>
          </div>
          <div
            style={needScroll ? {maxHeight:'80vh', overflowY:'auto'} : {overflowY:'auto'}}
            ref={attachmentsRef}
            onScroll={handleAttachmentsScroll}
          >
            <div className="masonry-grid">
              {attachments.filter(att => att.type === 'photo' && att.attachmentInfo?.url).length === 0 && !loadingAttachments && (
                <div style={{color:'#aaa',textAlign:'center',width:'100%'}}>Нет фотографий</div>
              )}
              {attachments.map((att, i) => (
                att.type === 'photo' && att.attachmentInfo?.url ? (
                  <div className="masonry-item" key={att.id || i}>
                    <img 
                      src={att.attachmentInfo.url} 
                      alt="preview" 
                      className="loading"
                      onLoad={(e) => {
                        e.currentTarget.classList.remove('loading');
                        e.currentTarget.classList.add('loaded');
                      }}
                    />
                  </div>
                ) : null
              ))}
              {loadingAttachments && (
                <div className="loading-indicator">
                  Загрузка
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}