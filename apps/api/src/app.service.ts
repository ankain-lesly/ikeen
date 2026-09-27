import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ikeen Platform • One code, every user</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: linear-gradient(135deg, #222 0%, #0A0A23 100%);
          color: #fff;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          text-align: center;
          max-width: 650px;
          padding: 2.5rem 1.5rem;
        }
        .logo {
          width: 68px;
          height: 68px;
          margin: 0 auto 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        h1 {
          font-size: 2.6rem;
          font-weight: 800;
          margin-bottom: 0.8rem;
          background: linear-gradient(90deg, #23F6A9 20%, #2EE6F7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-fill-color: transparent;
        }
        p {
          font-size: 1.175rem;
          color: #C8C9DF;
          margin-bottom: 2.2rem;
          line-height: 1.65;
        }
        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1.2rem;
          margin-top: 2.1rem;
        }
        .feature {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(36, 220, 254, 0.17);
          border-radius: 10px;
          padding: 1.2rem 0.8rem;
          backdrop-filter: blur(10px);
        }
        .feature h3 {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 0.35rem;
          letter-spacing: 0.01em;
          color: #23F6A9;
        }
        .feature a {
          font-size: 1.05rem;
          color: #2EE6F7;
          margin: 0;
          text-decoration: none;
          transition: color 0.15s;
        }
        .feature a:hover {
          color: #23F6A9;
          text-decoration: underline;
        }
        .tagline {
          margin-top: 0.5rem;
          font-size: 1rem;
          color: #86ffe7;
          font-style: italic;
          letter-spacing: 0.02em;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <span class="logo">
          <!-- Simple ikeen logo (stylized "i") SVG -->
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                <stop stop-color="#23F6A9"/>
                <stop offset="1" stop-color="#2EE6F7"/>
              </linearGradient>
            </defs>
            <circle cx="28" cy="28" r="28" fill="#14143C"/>
            <rect x="24" y="13" width="8" height="30" rx="4" fill="url(#grad)"/>
            <rect x="24" y="40" width="8" height="8" rx="4" fill="url(#grad)"/>
          </svg>
        </span>
        <h1>Welcome to ikeen</h1>
        <div class="tagline">One code, every user.</div>
        <p>
          Personal brainstorming and agentic notes-taking app.<br>
          Capture, organize, and connect your thoughts seamlessly across all your devices.
        </p>
   
        <div class="features">
          <div class="feature">
            <h3>Docs</h3>
            <a href="https://github.com/ankain-lesly/ikeen" target="_blank" rel="noreferrer">ikeen GitHub</a>
          </div>
          <div class="feature">
            <h3>Mobile App</h3>
            <a href="https://expo.dev/@ankain-lesly/ikeen" target="_blank" rel="noreferrer">Expo Project</a>
          </div>
          <div class="feature">
            <h3>Web</h3>
            <a href="https://app.ikeen.dev" target="_blank" rel="noreferrer">ikeen.dev</a>
          </div>
          <div class="feature">
            <h3>Guide</h3>
            <a href="https://github.com/ankain-lesly/ikeen/blob/main/README.md" target="_blank" rel="noreferrer">Project README</a>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
  }
}
