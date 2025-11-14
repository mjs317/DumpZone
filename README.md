# Dump Zone

A minimal brain dump app for quickly jotting down ideas throughout the day. Each day starts fresh, and your previous day's dump is automatically saved at midnight.

## Features

- Clean, minimal interface
- Rich text formatting (colors, alignment, lists)
- Daily auto-save at midnight
- History viewing
- Optional Notion integration

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Notion Integration

To connect Notion:
1. Create a Notion integration at https://www.notion.so/my-integrations
2. Copy your integration token (starts with `secret_`)
3. Create a new database in Notion (or use an existing one)
4. Add the following properties to your database:
   - **Title** (Title type) - This will store "Dump Zone - YYYY-MM-DD"
   - **Date** (Date type) - This will store the date of the dump
5. Share your database with your integration:
   - Click the "..." menu in the top right of your database
   - Select "Connections" → "Add connections"
   - Choose your integration
6. Copy your database ID from the URL (the part after the last `/` and before the `?`)
7. Enter both the token and database ID in the Settings page

Your daily dumps will automatically sync to Notion at midnight each day.

