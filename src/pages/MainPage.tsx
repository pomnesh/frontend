import React, { useState, useEffect } from 'react';
import "./MainPage.css";
import { createMainPageHandlers, VkData } from './MainPage.handlers.ts';

const dialogs = [
  { name: "Ivan Petrov", message: "Last message preview here..." },
  { name: "Daria Smirnova", message: "Photo attached!" },
  { name: "VK Team", message: "Welcome to VK!" },
  { name: "Svetlana Ivanova", message: "Check out this document" },
];

const filters = ["All", "Photos", "Videos", "Docs", "Audio", "Links"];
const cards = ["🌄", "🎥", "📄", "🎵", "🔗", "🎵"];

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

  useEffect(() => {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    if (cookies.bearer_token && cookies.refresh_token) {
      setShowModal(false);
    }
  }, []);

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
        <aside className="sidebar">
          <h2>Dialogs</h2>
          <input type="text" placeholder="Search dialogs..." />
          {dialogs.map((d, i) => (
            <div className="dialog" key={i}>
              <span>{d.name}</span>
            </div>
          ))}
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