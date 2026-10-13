# Music Mash Frontend

A premium, production-ready React frontend for the Music Mash platform - Learn. Perform. Improve.

## 🎨 Design Philosophy

Music Mash features a modern, music-inspired UI that combines the best elements of premium SaaS platforms like Spotify, Apple Music, and Discord. The design emphasizes:

- **Glassmorphism**: Frosted glass effects with backdrop blur
- **Gradient lighting**: Smooth color transitions and glowing elements
- **Micro interactions**: Subtle animations and hover effects
- **Dark mode by default**: Eye-friendly dark theme throughout
- **Premium shadows**: Depth and dimensionality
- **Smooth transitions**: Framer Motion-powered animations

## 🚀 Tech Stack

- **React 19** - Latest React with concurrent features
- **Vite** - Lightning-fast build tool
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Production-ready animations
- **React Hook Form** - Form management
- **Axios** - HTTP client
- **TanStack Query** - Server state management
- **Recharts** - Data visualization
- **React Icons** - Icon library
- **React Hot Toast** - Toast notifications
- **Lottie React** - Animation library

## 🎨 Color Palette

```css
Primary: #7C3AED (Purple)
Secondary: #A855F7 (Light Purple)
Accent: #22D3EE (Cyan)
Background: #07070A (Dark)
Surface: #111217 (Dark Gray)
Card: #18181B (Card Background)
Text: #F8FAFC (White)
Muted: #9CA3AF (Gray)
Success: #10B981 (Green)
Error: #EF4444 (Red)
```

## 📁 Project Structure

```
music-mash-frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   └── Input.jsx
│   │   ├── layout/          # Layout components
│   │   │   └── Navbar.jsx
│   │   └── animations/      # Animation components
│   │       └── LoadingScreen.jsx
│   ├── pages/               # Page components
│   │   ├── LandingPage.jsx
│   │   ├── NotFoundPage.jsx
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx
│   │   │   └── RegisterPage.jsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.jsx
│   │   ├── profile/
│   │   │   └── ProfilePage.jsx
│   │   ├── upload/
│   │   │   └── UploadPage.jsx
│   │   ├── ai/
│   │   │   └── AIAnalysisPage.jsx
│   │   ├── judge/
│   │   │   └── JudgeDashboard.jsx
│   │   ├── competition/
│   │   │   └── CompetitionPage.jsx
│   │   └── leaderboard/
│   │       └── LeaderboardPage.jsx
│   ├── context/             # React Context
│   │   └── AuthContext.jsx
│   ├── services/            # API services
│   │   └── api.js
│   ├── hooks/               # Custom hooks
│   ├── utils/               # Utility functions
│   ├── assets/              # Static assets
│   ├── styles/              # Global styles
│   │   └── index.css
│   ├── App.jsx              # Main app component
│   └── main.jsx             # Entry point
├── public/                  # Static files
├── index.html               # HTML template
├── package.json             # Dependencies
├── tailwind.config.js       # Tailwind configuration
├── vite.config.js           # Vite configuration
├── postcss.config.js        # PostCSS configuration
└── .env                     # Environment variables
```

## 🛠️ Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

1. Clone the repository:
```bash
cd music-mash-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:8081
```

### API Proxy

The Vite dev server proxies API requests to the Spring Boot backend:

```javascript
// vite.config.js
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:8081',
      changeOrigin: true,
    },
  },
}
```

## 📱 Pages

### Landing Page
- Hero section with animated background
- How it works timeline
- Feature cards with hover effects
- Call-to-action sections

### Authentication
- Login page with form validation
- Registration page with role selection
- JWT token management
- Auto-login after registration

### Dashboard
- Welcome section with user stats
- Performance statistics
- Recent activity feed
- Quick action cards

### Profile
- User profile with avatar
- Skill level indicators
- Progress bars for different skills
- Achievement badges

### Upload
- Drag & drop file upload
- Audio and video support
- Upload progress animation
- Performance details form

### AI Analysis
- Circular progress indicators
- Score breakdown cards
- Feedback sections
- Improvement suggestions
- Futuristic design

### Judge Dashboard
- Performance queue
- Audio/video player
- Score sliders
- Feedback editor
- Approve/Reject actions

### Competition
- Competition cards with prizes
- Countdown timers
- Participant counts
- Registration buttons

### Leaderboard
- Top 3 podium display
- Animated rankings
- Score comparisons
- User avatars

## 🎨 Components

### Button
Multiple variants: primary, secondary, accent, outline, ghost, danger
Multiple sizes: sm, md, lg, xl
Hover animations with scale effect

### Card
Variants: default, glass, gradient, elevated
Hover effects with scale and shadow
Framer Motion animations

### Input
Variants: default, filled, outline
Icon support
Focus states with ring effect

### Loading Screen
Animated equalizer bars
Pulsing text
Music-themed design

## 🔐 Authentication

JWT-based authentication with:
- Automatic token storage in localStorage
- Token refresh on API calls
- Protected routes with authentication check
- Auto-logout on token expiration

## 🎭 Animations

Framer Motion animations throughout:
- Page transitions
- Card hover effects
- Button interactions
- Loading states
- Form submissions
- List item animations

## 📊 Charts

Recharts integration for:
- Skill progress visualization
- Performance statistics
- Improvement tracking
- Score comparisons

## 🔔 Notifications

React Hot Toast for:
- Success messages
- Error alerts
- Loading states
- Form validation feedback

## 🌐 API Integration

Axios-based API service with:
- Request interceptors for token injection
- Response interceptors for error handling
- Automatic logout on 401 errors
- Base URL configuration

## 📱 Responsive Design

Fully responsive across:
- Mobile (320px+)
- Tablet (768px+)
- Desktop (1024px+)
- Large screens (1440px+)

## 🚀 Build

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 🔧 Customization

### Colors
Modify `tailwind.config.js` to customize the color palette:

```javascript
colors: {
  primary: '#YOUR_COLOR',
  secondary: '#YOUR_COLOR',
  // ... other colors
}
```

### Fonts
Fonts are loaded via Google Fonts in `index.html`:
- Poppins (body text)
- Inter (UI text)
- Space Grotesk (headings)

### Animations
Adjust animations in `tailwind.config.js`:

```javascript
animation: {
  'custom': 'custom 1s ease-in-out infinite',
},
keyframes: {
  custom: {
    '0%, 100%': { /* styles */ },
    '50%': { /* styles */ },
  },
}
```

## 🐛 Troubleshooting

### Tailwind CSS Not Working
Ensure PostCSS is configured correctly and dependencies are installed:
```bash
npm install -D tailwindcss postcss autoprefixer
```

### API Connection Issues
Check that the Spring Boot backend is running on port 8081
Verify the `VITE_API_URL` in `.env` file

### Build Errors
Clear the Vite cache:
```bash
rm -rf node_modules/.vite
npm run dev
```

## 📝 Features Implemented

- ✅ Premium dark theme design
- ✅ Glassmorphism effects
- ✅ Framer Motion animations
- ✅ JWT authentication
- ✅ Protected routes
- ✅ Drag & drop upload
- ✅ AI analysis visualization
- ✅ Judge dashboard
- ✅ Competition system
- ✅ Leaderboard with podium
- ✅ Responsive design
- ✅ Toast notifications
- ✅ Loading states
- ✅ Error pages
- ✅ API integration

## 🎯 Future Enhancements

- Real-time notifications with WebSocket
- Advanced charts and analytics
- Social features (follow, comments)
- Live streaming support
- Mobile app version
- PWA capabilities
- Advanced animations with Lottie
- Voice commands
- Accessibility improvements

## 📄 License

Proprietary - Music Mash Platform

## 👥 Support

For issues and questions, contact the development team.
