# LinkedIn Automation Bot

A powerful LinkedIn Easy Apply automation tool with a modern React dashboard and Flask backend.

## 🚀 Features

- **Automated Applications**: Uses Selenium to find and apply to "Easy Apply" jobs.
- **Smart Form Filling**: Automatically handles common application questions.
- **Multi-Profile Support**: Manage multiple LinkedIn accounts and resumes.
- **Live Monitoring**: Track the bot's progress in real-time via the dashboard.
- **Modern UI**: Sleek, dark-themed dashboard built with React and Tailwind CSS.

## 🛠️ Setup Instructions

### 1. Backend (Local Machine)
The bot must run locally to control your Chrome browser.

```bash
# Install dependencies
pip install -r requirements.txt

# Start the API server
python server.py
```

### 2. Frontend (Dashboard)
The dashboard can be run locally or deployed to Vercel.

**Local Development:**
```bash
cd ui
npm install
npm run dev
```

**Deployment:**
The frontend is ready for deployment to Vercel. Ensure the `API_BASE` in `App.jsx` points to your local machine (default is `localhost:5000`).

## ⚠️ Disclaimer
This tool is for educational purposes. Use responsibly and in accordance with LinkedIn's Terms of Service.
