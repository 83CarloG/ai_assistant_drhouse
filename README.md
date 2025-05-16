# AI Assistant Dr. House

An AI assistant with Dr. House personality and medical knowledge, built using a Lucid-based architecture.

## Project Structure

```
ai_assistant_drhouse/
├── src/
│   ├── features/         # Business features
│   │   └── medicalQueryDetection.js
│   ├── operations/       # Complex operations
│   │   ├── buildSystemInstruction.js
│   │   └── chatHistory.js
│   ├── jobs/            # Single tasks
│   │   └── enhancePromptWithHistory.js
│   ├── services/        # Service layer
│   │   └── getResponseFromAi.js
│   └── scripts/         # Utility scripts
├── drivers/             # External system connections
│   └── http.js
├── fixtures/            # Test data and static files
└── server/             # Server configuration
```

## Setup

1. Install dependencies:
   ```bash
   yarn install
   ```

2. Create a `.env` file from .env.example:
   ```bash
   cp .env.example .env
   ```

3. Start Redis server:
   ```bash
   docker-compose up -d
   ```

4. Run the application:
   ```bash
   yarn dev
   ```

## Architecture

The project follows a Lucid-based architecture with the following components:

- **Features**: Core business logic and domain-specific functionality
- **Operations**: Complex operations that coordinate multiple jobs
- **Jobs**: Single, focused tasks
- **Services**: Entry points for business logic
- **Drivers**: External system connections

## Development

- Use `yarn dev` for development with hot reload
- Use `yarn start` for production
- Use `yarn load-data` to load initial data

## License

MIT