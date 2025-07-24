# ICorNet - Intelligent Corporate Network

## Overview

ICorNet is a full-stack corporate data analysis platform that combines React frontend with Python Flask backend, integrating Neo4j graph database for company data storage and n8n workflow automation for report generation. The application provides dashboard analytics, company analysis tools, and automated PDF report generation with a modern, responsive web interface.

## Recent Changes
- **January 24, 2025**: Successfully deployed with Docker Compose setup
- **Port Configuration**: App runs internally on port 5000, exposed externally on port 8000
- **Mock Data**: Added fallback mock data for development without external Neo4j connection
- **Authentication**: Fixed session handling and CORS configuration for proper login flow

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with vanilla JavaScript (no TypeScript)
- **Styling**: Tailwind CSS for utility-first styling
- **UI Components**: Custom components with Feather Icons
- **Build System**: Direct CDN imports with Babel for JSX compilation
- **State Management**: React hooks for local state, no external state management
- **Data Visualization**: Chart.js for dashboard charts and analytics

### Backend Architecture
- **Framework**: Python Flask with blueprint-based route organization
- **ORM**: SQLAlchemy for PostgreSQL database operations
- **Authentication**: Session-based authentication with Flask sessions
- **API Design**: RESTful API endpoints with JSON responses
- **Service Layer**: Separate services for Neo4j, n8n, and authentication logic

### Database Strategy
- **Primary Database**: PostgreSQL for user management, authentication, and report tracking
- **Graph Database**: External Neo4j instance for company data and relationships
- **Data Models**: Users, Reports tables in PostgreSQL with relationships

## Key Components

### Authentication System
- **Local Authentication**: Username/password with hashed storage
- **Role-based Access**: Admin and User roles (default: User)
- **Session Management**: Flask sessions with configurable timeout
- **Route Protection**: Decorators for authentication and authorization

### Dashboard Analytics
- **Real-time Stats**: Company counts and sector aggregations from Neo4j
- **Interactive Charts**: Pie charts for sector distribution using Chart.js
- **Report Tracking**: Daily report generation statistics
- **Responsive Layout**: Card-based layout with sidebar navigation

### SUK Analysis Module
- **Company Selection**: Dropdown with search/filter from Neo4j data
- **Dynamic Filtering**: Real-time search across company names and sectors
- **Report Generation**: Integration with n8n workflows for PDF creation
- **Status Tracking**: Monitor report generation progress and history

### Service Layer
- **Neo4j Service**: Graph database queries for company data and analytics
- **n8n Service**: Workflow automation API calls for report generation
- **Auth Service**: Centralized authentication and authorization logic

## Data Flow

### User Authentication Flow
1. User submits login credentials via React frontend
2. Flask backend validates against PostgreSQL user table
3. Session established with user ID, username, and role
4. Frontend receives user data and navigation permissions

### Dashboard Data Flow
1. Frontend requests dashboard statistics
2. Backend queries Neo4j for company counts and sectors
3. PostgreSQL queried for report statistics
4. Combined data returned as JSON for chart rendering

### Report Generation Flow
1. User selects company from Neo4j-populated dropdown
2. Report record created in PostgreSQL with pending status
3. n8n workflow triggered via HTTP API call
4. Workflow ID stored for status tracking
5. Generated PDF tracked through completion

## External Dependencies

### Neo4j Graph Database
- **Purpose**: Store company data with SUK nodes
- **Required Properties**: nome_azienda, settore, descrizione
- **Connection**: External instance via neo4j-driver
- **Fallback**: Mock data returned on connection failure

### n8n Workflow Engine
- **Purpose**: Automated PDF report generation
- **API Integration**: REST API calls with bearer token authentication
- **Workflow Parameters**: Company name, user ID, timestamp
- **Status Tracking**: Execution ID returned for monitoring

### External Libraries
- **Frontend**: React, Chart.js, Tailwind CSS via CDN
- **Backend**: Flask, SQLAlchemy, neo4j-driver, requests

## Deployment Strategy

### Containerization
- **Docker Compose**: Multi-container orchestration
- **PostgreSQL Container**: Database service with persistent volumes
- **Application Container**: Flask backend with React static files
- **Network Configuration**: Docker networks for service communication

### Environment Configuration
- **Database URL**: PostgreSQL connection string
- **Neo4j Credentials**: URI, username, password for graph database
- **n8n Integration**: Base URL, API key, workflow ID
- **Security**: Secret key for session management

### Production Considerations
- **HTTPS**: Session cookies configured for secure transmission
- **Logging**: Comprehensive error logging and monitoring
- **Error Handling**: Graceful degradation when external services unavailable
- **Resource Management**: Connection pooling and timeout configurations

The application follows a modular architecture with clear separation between presentation, business logic, and data layers, enabling maintainable code and flexible deployment options.