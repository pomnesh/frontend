import React, { useState } from 'react';
import "./MainPage.css";

import { endpoints } from "../api/endpoints.tsx";

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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(endpoints.login, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      if (response.status === 401) {
        setError('Неправильный пароль');
        return;
      }

      const data = await response.json();
      console.log('Ответ сервера:', data);

      if (response.status === 200 && data.payload?.token) {
        document.cookie = `bearer_token=${data.payload.token}; path=/; max-age=604800; secure; samesite=strict`;
        setShowModal(false);
      }
    } catch (error) {
      console.error('Ошибка при запросе:', error);
    } finally {
      setIsLoading(false);
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
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? 'Загрузка...' : 'Продолжить'}
            </button>
          </div>
        </div>
      )}
      <header className="site-header">
        <h1>VK Attachments Viewer</h1>
        <button className="connect-btn">Connect VK</button>
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