# Pose Detection Game

A real-time pose detection game built with React, TypeScript, TensorFlow.js, and Phaser 3. Players interact with the game using their body movements detected through their camera.

## Features

- 🎮 Interactive gameplay using pose detection
- 📱 Real-time camera feed processing
- 🧠 TensorFlow.js for machine learning inference
- 🎯 Phaser 3 for game mechanics and physics
- ⚡ Vite for fast development and building
- 🔧 TypeScript for type safety
- 🧪 Comprehensive testing with Jest and Cypress
- 🐳 Docker support for easy deployment

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Modern web browser with camera access
- Git

### Installation

1. **Clone and navigate to the project:**
   ```bash
   git clone <repository-url>
   cd pose-detection-game
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

### Camera Permissions

The game requires camera access to detect your poses. Make sure to:
- Allow camera permissions when prompted
- Ensure good lighting for better detection
- Position yourself so your full body is visible

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run test:e2e` - Open Cypress for E2E testing
- `npm run test:e2e:headless` - Run E2E tests headlessly
- `npm run lint` - Check code quality
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Project Structure

```
pose-detection-game/
├── src/                    # Source code
│   ├── components/         # React components
│   ├── game/              # Phaser game logic
│   ├── hooks/             # Custom React hooks
│   ├── services/          # External services (TensorFlow)
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── main.tsx           # Application entry point
├── tests/                 # Unit tests
├── cypress/               # E2E tests
├── public/                # Static assets
└── dist/                  # Production build output
```

### Technology Stack

- **Frontend:** React 18 + TypeScript
- **Game Engine:** Phaser 3
- **ML Framework:** TensorFlow.js
- **Build Tool:** Vite
- **Testing:** Jest + Cypress + Testing Library
- **Code Quality:** ESLint + Prettier
- **Deployment:** Docker + Nginx

## Docker Deployment

### Build and run with Docker:

```bash
# Build the Docker image
npm run docker:build

# Run the container
npm run docker:run
```

The application will be available at `http://localhost:3000`

### Manual Docker commands:

```bash
# Build
docker build -t pose-detection-game .

# Run
docker run -p 3000:3000 pose-detection-game
```

## Testing

### Unit Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### E2E Testing
```bash
# Open Cypress Test Runner
npm run test:e2e

# Run E2E tests headlessly
npm run test:e2e:headless
```

## Game Mechanics

The game uses pose detection to track player movements and translate them into game actions:

1. **Pose Detection:** TensorFlow.js processes camera feed in real-time
2. **Game Logic:** Phaser 3 handles game mechanics, physics, and rendering
3. **Interaction:** Player movements control game elements
4. **Scoring:** Points awarded based on accuracy and timing

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Use meaningful commit messages
- Ensure code passes linting and formatting
- Update documentation as needed

## Performance Optimization

- **Lazy Loading:** Components and models loaded on demand
- **Code Splitting:** Vendor libraries separated for better caching
- **Asset Optimization:** Images and assets optimized for web
- **Bundle Analysis:** Use `npm run build` to analyze bundle size

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

**Note:** Camera access required for pose detection functionality.

## Troubleshooting

### Common Issues

1. **Camera not detected:**
   - Check browser permissions
   - Ensure camera is not used by other applications
   - Try refreshing the page

2. **Poor pose detection:**
   - Improve lighting conditions
   - Ensure full body is visible in frame
   - Check camera resolution settings

3. **Performance issues:**
   - Close other browser tabs
   - Check system requirements
   - Reduce model complexity in settings

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review existing issues for solutions

---

Built with ❤️ using modern web technologies