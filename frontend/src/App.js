import React from 'react';
import LogInteractionForm from './components/LogInteractionForm';
import ChatInterface from './components/ChatInterface';
import './styles/App.css';

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo">
            <span className="logo-icon">⚕</span>
            <span className="logo-text">LifeSync <span className="logo-crm">CRM</span></span>
          </div>
          <nav className="header-nav">
            <span className="nav-item active">HCP Module</span>
            <span className="nav-item">Dashboard</span>
            <span className="nav-item">Reports</span>
          </nav>
        </div>
        <div className="header-right">
          <div className="header-badge">AI-Powered</div>
          <div className="user-avatar">MR</div>
        </div>
      </header>

      <div className="page-title-bar">
        <div className="page-title-content">
          <h1 className="page-title">Log HCP Interaction</h1>
          <p className="page-subtitle">
            Use the form or chat with AI to record your healthcare professional interaction
          </p>
        </div>
      </div>

      <main className="main-split">
        <section className="split-left">
          <LogInteractionForm />
        </section>
        <section className="split-right">
          <ChatInterface />
        </section>
      </main>
    </div>
  );
}
