# Photo Gallery Application

## Overview

This is a Flask-based photo management web application designed for mobile-first usage. The application features a modern, light-themed interface optimized for product photo documentation. Users can upload photos through drag-and-drop interface or camera capture, with automatic image optimization and metadata storage.

## System Architecture

The application follows a traditional Flask MVC (Model-View-Controller) architecture:

- **Frontend**: Bootstrap-based responsive UI with custom CSS and JavaScript
- **Backend**: Flask web framework with SQLAlchemy ORM
- **Database**: SQLite (default) with configurable database support via environment variables
- **File Storage**: Local filesystem storage in an `uploads` directory
- **Image Processing**: PIL (Python Imaging Library) for image optimization

## Key Components

### Backend Components

1. **app.py**: Main application factory and configuration
   - Configures Flask app with security settings and proxy fixes
   - Sets up database connection with SQLAlchemy ORM
   - Manages file upload settings (16MB max, PNG/JPG/JPEG/GIF file types)
   - Creates upload directory structure automatically

2. **models.py**: Data models using SQLAlchemy ORM
   - `Photo` model with metadata (filename, original_filename, file_size, mime_type, upload_date)
   - JSON serialization methods for API responses
   - Timestamp tracking with UTC datetime

3. **routes.py**: HTTP request handlers and business logic
   - File upload endpoint with validation and processing
   - Gallery view with photo listing and pagination
   - File serving for uploaded images with security
   - Utility functions for file handling and size formatting

4. **main.py**: Application entry point for development server

### Frontend Components

1. **Templates**: Jinja2 HTML templates with Bootstrap styling
   - `index.html`: Upload interface with drag-and-drop and camera capture
   - `gallery.html`: Photo gallery grid view with responsive design
   - Russian language interface

2. **Static Assets**:
   - `custom.css`: Mobile-first responsive design with photo sections
   - `upload.js`: JavaScript for drag-and-drop functionality, camera integration, and file handling

## Data Flow

1. **Photo Upload Process**:
   - User selects photo via file input or camera capture
   - Frontend validates file type and size
   - File is uploaded via AJAX to `/upload` endpoint
   - Backend processes image with PIL optimization
   - Photo metadata is stored in database
   - Unique filename is generated to prevent conflicts

2. **Photo Display Process**:
   - Gallery page queries all photos from database
   - Photos are displayed in responsive grid layout
   - Images are served from uploads directory
   - File sizes are formatted for human readability

## External Dependencies

### Python Packages
- Flask: Web framework
- Flask-SQLAlchemy: Database ORM
- Pillow (PIL): Image processing
- Werkzeug: Security utilities

### Frontend Libraries
- Bootstrap 5.3.0: UI framework
- Font Awesome 6.0.0: Icons
- Native JavaScript: Camera API and file handling

## Deployment Strategy

- **Development**: Flask development server with debug mode
- **Production**: Configurable via environment variables
- **Database**: SQLite for development, configurable for production
- **File Storage**: Local filesystem (uploads directory)
- **Session Management**: Secret key from environment or default

### Environment Variables
- `SESSION_SECRET`: Application secret key
- `DATABASE_URL`: Database connection string

## Changelog
- July 04, 2025. Initial setup
- July 04, 2025. UI improvements: reduced photo card gaps to 4px, section margins to mb-2, modal redesign with bottom positioning and rounded top corners only, full-screen camera with circular shutter button, removed toast notifications

## User Preferences

Preferred communication style: Simple, everyday language.