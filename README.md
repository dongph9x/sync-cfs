## Quick Start

### Prerequisites
- Node.js 20+
- MySQL 8.0+
- Discord Bot Token
- AWS S3 account (optional for image uploads)

### Setup
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd discord-forum
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your `.env` file with the required credentials.
4. Initialize the database:
   ```bash
   mysql -u root -p forum < init-db.sql
   ```
5. Start the bot:
   ```bash
   npm run dev
   ```

### Web App
1. Navigate to the `web-app` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the static site:
   ```bash
   npm run build
   ```
4. Deploy the `dist/` folder to your preferred hosting platform.
