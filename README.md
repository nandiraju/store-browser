# 🌌 Gemini File Search Store Browser

A high-fidelity, professional web application designed to browse and manage your persistent **Gemini File Search API** (v1beta) stores. Built for developers who need a clean, visual interface to inspect their RAG (Retrieval-Augmented Generation) document stores on Google Cloud.

![App Screenshot](https://raw.githubusercontent.com/nandiraju/store-browser/main/public/screenshot.png) *(Note: Add a real screenshot later)*

## ✨ Features

- **🚀 Live RAG Inspector**: Instantly list all your `FileSearchStores` and their underlying documents.
- **💎 Premium UX**: A "white-based" minimalist aesthetic with glassmorphic accents, smooth animations, and a focus on clarity.
- **📄 Metadata deep-dive**: View document MIME types, creation times, and custom metadata pairs in a structured grid or table.
- **🌓 Dual Display Modes**: Toggle between a visual **Card View** and a data-dense **Table View**.
- **🔑 Secure Configuration**: Your Gemini API key is stored locally in your browser's `localStorage`—never sent to any server except Google's.
- **🌓 Dark Mode**: Built-in support for low-light environments with a single click.

## 🛠️ Technology Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Deployment**: [GitHub Pages](https://pages.github.com/)

## 🚀 Getting Started

### Prerequisites
- Node.js (v20 or higher)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey) (Ensure you have access to the `v1beta` models).

### Installation

1. **Clone the repository**
   ```bash
   git clone git@github.com:nandiraju/store-browser.git
   cd store-browser
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run locally**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 🌐 Deployment

The app is configured to deploy directly to GitHub Pages:

```bash
npm run deploy
```

Access the live demo at: [https://nandiraju.github.io/store-browser/](https://nandiraju.github.io/store-browser/)

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---
*Generated with ❤️ by Antigravity*
