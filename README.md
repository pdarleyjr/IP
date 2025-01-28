# IPLC Intervention Plan Generator

A web-based tool for generating speech therapy intervention plans. This application runs entirely in the browser using TensorFlow.js for semantic search and text generation.

## Features

- Semantic goal search using Universal Sentence Encoder
- AI-powered summary generation using T5 Small
- PDF and DOCX export options
- Runs entirely in the browser (no server required)
- IndexedDB for local data storage

## Deployment

This application is designed to be hosted on GitHub Pages. To deploy:

1. Push your changes to the main branch
2. Go to your repository settings
3. Under "GitHub Pages", select the main branch as the source
4. The site will be available at `https://<username>.github.io/<repository>`

## Development

To run locally:

1. Clone the repository
2. Open index.html in a web browser
   - Note: For local development, use a simple HTTP server to avoid CORS issues
   - Example: Use Python's built-in server: `python -m http.server 8000`
   - Or use VS Code's Live Server extension

## Architecture

The application uses:
- TensorFlow.js for machine learning models
- Universal Sentence Encoder for semantic search
- T5 Small for summary generation
- IndexedDB for local data storage
- Pure JavaScript (no framework dependencies)

## Model Loading

The application uses lazy loading for the T5 model:
- Universal Sentence Encoder loads on startup for search functionality
- T5 model only loads when generating summaries
- All models are loaded from CDN for optimal performance

## Data Storage

Goals data is stored in IndexedDB:
- Initial data loaded from goals.json
- Selected goals stored locally
- No server-side storage required
