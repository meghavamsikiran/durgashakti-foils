import React, { useState } from 'react';
import './landing/styles/landing-v2.css';
import FoilRollCanvasReact from './landing/components/FoilRollCanvasReact';

export default function LandingPageV2() {
  const [activeVariant, setActiveVariant] = useState(1);

  return (
    <div className="landing-page-v2">
      {/* Background Lighting */}
      <div className="studio-bg"></div>
      <div className="warm-glow-left"></div>
      <div className="cool-glow-right"></div>

      {/* Glassmorphism Navigation Header */}
      <header>
        <div className="nav-container">
          <a href="#" className="brand-logo">
            <img src="/logo-durga.webp" alt="DurgaShakti Foils" />
            <span>DurgaShakti Foils</span>
          </a>

          <ul className="nav-links">
            <li><a href="#" className="active">Home</a></li>
            <li><a href="#products">Products</a></li>
            <li><a href="#why-hotwrap">Why HOT WRAP</a></li>
            <li><a href="#quality">Quality</a></li>
            <li><a href="#uses">Uses</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>

          <a href="#contact" className="btn-enquire">
            Enquire Now
          </a>
        </div>
      </header>

      {/* Three.js Interactive 3D Canvas */}
      <FoilRollCanvasReact activeVariant={activeVariant} />

      {/* Hero Grid */}
      <main className="hero-grid">
        {/* Left Column */}
        <div className="hero-left">
          <div className="hero-tagline">DurgaShakti Foils • HOT WRAP</div>
          <h1 className="display-title">
            Wrap
            <span className="highlight">Freshness</span>
          </h1>
          <p className="hero-copy">
            Food-grade aluminium foil designed to keep your food hot, fresh and protected.
          </p>
          <a href="#products" className="btn-cta">
            <span>Explore HOT WRAP</span>
            <div className="icon-circle">➔</div>
          </a>
          <div className="quality-badge">
            <div className="badge-icon">✓</div>
            <div className="badge-text">FOOD GRADE • PREMIUM ALUMINIUM FOIL</div>
          </div>
        </div>

        {/* Center Column */}
        <div></div>

        {/* Right Column - Vertical Auto-Scrolling Gallery */}
        <div className="hero-right" style={{ justifyContent: 'center', height: '100%' }}>
          <div className="scrolling-gallery-wrapper">
            <div className="scrolling-gallery-mask">
              <div className="scrolling-gallery-track">
                {/* Product images for the scroll - repeated twice for infinite effect */}
                {[...Array(2)].map((_, groupIndex) => (
                  <React.Fragment key={groupIndex}>
                    <div className="gallery-item">
                      <img src="/images/gallery/gallery-1.jpg" alt="DurgaShakti Foils Product 1" />
                    </div>
                    <div className="gallery-item">
                      <img src="/images/gallery/gallery-2.jpg" alt="DurgaShakti Foils Product 2" />
                    </div>
                    <div className="gallery-item">
                      <img src="/images/gallery/gallery-3.jpg" alt="DurgaShakti Foils Product 3" />
                    </div>
                    <div className="gallery-item">
                      <img src="/images/gallery/gallery-4.jpg" alt="DurgaShakti Foils Product 4" />
                    </div>
                    <div className="gallery-item">
                      <img src="/images/gallery/gallery-5.jpg" alt="DurgaShakti Foils Product 5" />
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
