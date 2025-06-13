import React, { useState, useEffect, useRef, useCallback } from 'react';
import "./MainPage.css";
import { createMainPageHandlers, VkData } from './MainPage.handlers.ts';
import { apiClient } from '../api/apiClient.ts';
import Hls from 'hls.js';

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
    url?: string;
    width?: number;
    height?: number;
    id: number;
    ownerId: number;
    accessKey: string;
    title?: string;
    description?: string;
    duration?: number;
    photoUrl?: string | null;
    artist?: string;
    ext?: string;
    size?: number;
  };
  messageId: number | null;
  fromId: number | null;
  date: number | null;
  isForwarded: boolean;
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
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [selectedType, setSelectedType] = useState<number>(0);
  const [includeForwards, setIncludeForwards] = useState(false);

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
    let url = `https://pomnesh-backend.hps-2.ru/api/v1/vk/getAttachments?peerId=${peerId}&count=${count}`;
    if (includeForwards) {
      url += `&includeForwards=true`;
    } else {
      url += `&includeForwards=false`;
    }
    if (startFrom) {
      url += `&startFrom=${encodeURIComponent(startFrom)}`;
    }
    if (selectedType !== null) {
      url += `&types=${selectedType}`;
    }
    try {
      const response = await apiClient.request(url, { method: 'GET' });
      if (response?.payload?.items) {
        preloadImages(response.payload.items);
        setAttachments(prev => {
          if (!startFrom) {
            return response.payload.items;
          }
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
  }, [hasMoreAttachments, selectedType, includeForwards]);

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
  }, [selectedChatId, loadAttachments, selectedType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedAttachment) {
          setSelectedAttachment(null);
        } else {
          setSelectedChatId(null);
          setAttachments([]);
          setNextFrom(null);
          setHasMoreAttachments(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedAttachment]);

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

  const handleAttachmentClick = (attachment: Attachment) => {
    if (attachment.type === 'video' && attachment.attachmentInfo) {
      const videoUrl = `https://vk.com/video${attachment.attachmentInfo.ownerId}_${attachment.attachmentInfo.id}?hash=${attachment.attachmentInfo.accessKey}`;
      window.open(videoUrl, '_blank');
      return;
    }
    setSelectedAttachment(attachment);
  };

  const handleCloseAttachment = () => {
    setSelectedAttachment(null);
  };

  const attachmentTypes = [
    { id: 0, label: 'Фото' },
    { id: 1, label: 'Видео' },
    { id: 2, label: 'Аудио' },
    { id: 4, label: 'Документы' }
  ];

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'photo': return 'Фото';
      case 'video': return 'Видео';
      case 'audio': return 'Аудио';
      case 'audio_message': return 'Голосовые';
      case 'doc': return 'Документы';
      default: return type;
    }
  };

  const renderAttachment = (att: Attachment, i: number) => {
    switch (att.type) {
      case 'photo':
        return att.attachmentInfo?.url ? (
          <div 
            className="masonry-item" 
            key={att.id || i}
            data-attachment-id={att.attachmentInfo.id}
            data-owner-id={att.attachmentInfo.ownerId}
            data-access-key={att.attachmentInfo.accessKey}
            data-message-id={att.messageId}
            data-from-id={att.fromId}
            data-date={att.date}
            data-is-forwarded={att.isForwarded}
            data-width={att.attachmentInfo.width}
            data-height={att.attachmentInfo.height}
            onClick={() => handleAttachmentClick(att)}
          >
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
        ) : null;

      case 'video':
        return (
          <div 
            className="masonry-item video-item" 
            key={att.id || i}
            onClick={() => handleAttachmentClick(att)}
          >
            <div className="video-preview">
              <div className="video-duration">
                {Math.floor(att.attachmentInfo?.duration || 0 / 60)}:{(att.attachmentInfo?.duration || 0 % 60).toString().padStart(2, '0')}
              </div>
              <div className="video-play-icon">▶</div>
            </div>
            <div className="video-info">
              <div className="video-title">{att.attachmentInfo?.title || 'Без названия'}</div>
              {att.attachmentInfo?.description && (
                <div className="video-description">{att.attachmentInfo.description}</div>
              )}
            </div>
          </div>
        );

      case 'audio':
        return (
          <div 
            className="masonry-item audio-item" 
            key={att.id || i}
            onClick={() => handleAttachmentClick(att)}
          >
            <div className="audio-neutral-preview">
              <span className="audio-neutral-icon">🎵</span>
            </div>
            <div className="audio-title">
              {att.attachmentInfo?.artist ? `${att.attachmentInfo.artist} — ` : ''}
              {att.attachmentInfo?.title || 'Без названия'}
            </div>
          </div>
        );

      case 'audio_message':
        return (
          <div 
            className="masonry-item audio-message-item" 
            key={att.id || i}
            onClick={() => handleAttachmentClick(att)}
          >
            <div className="audio-message-info">
              <div className="audio-message-duration">
                {Math.floor(att.attachmentInfo?.duration || 0 / 60)}:{(att.attachmentInfo?.duration || 0 % 60).toString().padStart(2, '0')}
              </div>
              <div className="audio-message-play-icon">▶</div>
            </div>
          </div>
        );

      case 'doc':
        return (
          <div 
            className="masonry-item doc-item" 
            key={att.id || i}
            onClick={() => handleAttachmentClick(att)}
          >
            <div className="doc-neutral-preview">
              <span className="doc-neutral-icon">📄</span>
            </div>
            <div className="doc-title">{att.attachmentInfo?.title || 'Без названия'}</div>
            <div className="doc-meta">
              {att.attachmentInfo?.ext && <span className="doc-ext">.{att.attachmentInfo.ext}</span>}
              {att.attachmentInfo?.size !== undefined && <span className="doc-size">{(att.attachmentInfo.size > 1024*1024 ? (att.attachmentInfo.size/1024/1024).toFixed(2)+' МБ' : (att.attachmentInfo.size/1024).toFixed(1)+' КБ')}</span>}
            </div>
          </div>
        );

      default:
        return null;
    }
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
            {isLoading ? 'Загрузка...' : 'Настройки'}
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
          {selectedChatId && (
            <div className="attachments-filters">
              {attachmentTypes.map(type => (
                <button
                  key={type.id}
                  className={`filter-button ${selectedType === type.id ? 'active' : ''}`}
                  onClick={() => setSelectedType(type.id)}
                >
                  {type.label}
                </button>
              ))}
              <div className="include-forwards-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={includeForwards}
                    onChange={e => setIncludeForwards(e.target.checked)}
                  />
                  <span>Включать пересланные</span>
                </label>
              </div>
            </div>
          )}
          <div
            style={needScroll ? {maxHeight:'80vh', overflowY:'auto'} : {overflowY:'auto'}}
            ref={attachmentsRef}
            onScroll={handleAttachmentsScroll}
          >
            <div className="masonry-grid">
              {attachments.length === 0 && !loadingAttachments && (
                <div style={{color:'#aaa',textAlign:'center',width:'100%'}}>Нет вложений</div>
              )}
              {attachments.map((att, i) => renderAttachment(att, i))}
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
      {selectedAttachment && (
        <div className="attachment-modal-overlay" onClick={handleCloseAttachment}>
          <div className="attachment-modal" onClick={e => e.stopPropagation()}>
            <button className="attachment-modal-close" onClick={handleCloseAttachment}>×</button>
            <div className="attachment-modal-content">
              {selectedAttachment.type === 'photo' && selectedAttachment.attachmentInfo?.url && (
                <div className="attachment-modal-image-container">
                  <img 
                    src={selectedAttachment.attachmentInfo.url} 
                    alt="full size" 
                    className="attachment-modal-image"
                  />
                </div>
              )}
              {selectedAttachment.type === 'audio' && (
                <div className="attachment-modal-image-container">
                  <div className="audio-neutral-preview" style={{marginBottom: 0}}>
                    <span className="audio-neutral-icon">🎵</span>
                  </div>
                </div>
              )}
              {selectedAttachment.type === 'doc' && (
                <div className="attachment-modal-image-container">
                  <div className="doc-neutral-preview" style={{marginBottom: 0}}>
                    <span className="doc-neutral-icon">📄</span>
                  </div>
                </div>
              )}
              <div className="attachment-modal-info">
                <h3>Информация</h3>
                <div className="info-grid">
                  {selectedAttachment.type === 'audio' ? (
                    <div className="info-item">
                      <span className="info-label">Трек</span>
                      <span className="info-value">
                        {selectedAttachment.attachmentInfo?.artist ? `${selectedAttachment.attachmentInfo.artist} — ` : ''}
                        {selectedAttachment.attachmentInfo?.title || 'Без названия'}
                      </span>
                    </div>
                  ) : selectedAttachment.type === 'doc' ? (
                    <>
                      <div className="info-item">
                        <span className="info-label">Файл</span>
                        <span className="info-value">{selectedAttachment.attachmentInfo?.title || 'Без названия'}</span>
                      </div>
                      {selectedAttachment.attachmentInfo?.ext && (
                        <div className="info-item">
                          <span className="info-label">Расширение</span>
                          <span className="info-value">.{selectedAttachment.attachmentInfo.ext}</span>
                        </div>
                      )}
                      {selectedAttachment.attachmentInfo?.size !== undefined && (
                        <div className="info-item">
                          <span className="info-label">Размер</span>
                          <span className="info-value">{selectedAttachment.attachmentInfo.size > 1024*1024 ? (selectedAttachment.attachmentInfo.size/1024/1024).toFixed(2)+' МБ' : (selectedAttachment.attachmentInfo.size/1024).toFixed(1)+' КБ'}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="info-item">
                      <span className="info-label">Размеры</span>
                      <span className="info-value">{selectedAttachment.attachmentInfo?.width} × {selectedAttachment.attachmentInfo?.height}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="info-label">ID владельца</span>
                    <span className="info-value">{selectedAttachment.attachmentInfo?.ownerId}</span>
                  </div>
                  {selectedAttachment.messageId && (
                    <div className="info-item">
                      <span className="info-label">ID сообщения</span>
                      <span className="info-value">{selectedAttachment.messageId}</span>
                    </div>
                  )}
                  {selectedAttachment.fromId && (
                    <div className="info-item">
                      <span className="info-label">ID отправителя</span>
                      <span className="info-value">{selectedAttachment.fromId}</span>
                    </div>
                  )}
                  {selectedAttachment.date && (
                    <div className="info-item">
                      <span className="info-label">Дата</span>
                      <span className="info-value">
                        {new Date(selectedAttachment.date * 1000).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>
                <div className="info-item" style={{justifyContent: 'center', display: 'flex'}}>
                  <span className="info-label">&nbsp;</span>
                  <span className="info-value">
                    <a className="doc-download" href={selectedAttachment.attachmentInfo?.url} target="_blank" rel="noopener noreferrer">Скачать</a>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (audioRef.current && Hls.isSupported() && url.endsWith('.m3u8')) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(audioRef.current);
      return () => {
        hls.destroy();
      };
    }
  }, [url]);
  // Safari поддерживает m3u8 нативно
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isM3u8 = url.endsWith('.m3u8');
  const audioSrc = (!isM3u8) ? url : (isSafari ? url : undefined);
  return (
    <>
      <button
        className="audio-play-icon"
        onClick={() => {
          if (audioRef.current) {
            if (audioRef.current.paused) {
              audioRef.current.play();
              setPlaying(true);
            } else {
              audioRef.current.pause();
              setPlaying(false);
            }
          }
        }}
        title={playing ? 'Пауза' : 'Слушать'}
      >{playing ? '❚❚' : '▶'}</button>
      <audio
        ref={audioRef}
        src={audioSrc}
        style={{ display: 'none' }}
        preload="none"
      />
    </>
  );
}