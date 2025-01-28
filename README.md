# IPLC Intervention Plan Generator

A web-based tool for generating speech therapy intervention plans. This application runs entirely in the browser using TensorFlow.js for semantic search and text generation.

## Features

- Semantic goal search using Universal Sentence Encoder
- AI-powered summary generation using T5 Small
- PDF and DOCX export options
- Runs entirely in the browser (no server required)
- IndexedDB for local data storage

## Deployment

This application is hosted on GitHub Pages and can be accessed at:
https://pdarleyjr.github.io/IPLC-IP

The deployment is configured to use the `gh-pages` branch. The site automatically updates when changes are pushed to this branch.

To deploy updates:
1. Make changes to the code
2. Commit and push to the main branch
3. Switch to gh-pages branch: `git checkout gh-pages`
4. Merge changes from main: `git merge main`
5. Push to deploy: `git push origin gh-pages`

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
