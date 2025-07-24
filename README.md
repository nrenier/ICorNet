# ICorNet - Intelligent Corporate Network

ICorNet is a full-stack corporate data analysis platform that integrates Neo4j for graph database operations and n8n for workflow automation. The application provides dashboard analytics, company data visualization, and automated PDF report generation.

## Features

- **Authentication System**: Local user authentication with admin and user roles
- **Dashboard Analytics**: Real-time statistics from Neo4j database with interactive charts
- **SUK Analysis**: Company selection and automated report generation via n8n workflows
- **Report Management**: Track report status and download generated PDFs
- **Responsive Design**: Modern UI built with Tailwind CSS and shadcn/ui components

## Tech Stack

### Frontend
- React 18 (JavaScript, no TypeScript)
- Tailwind CSS for styling
- Chart.js for data visualization
- Feather Icons for UI icons
- Vanilla JavaScript with Babel for JSX compilation

### Backend
- Python 3.9+
- Flask web framework
- SQLAlchemy ORM
- PostgreSQL database
- Neo4j graph database integration
- n8n workflow automation integration

### Infrastructure
- Docker Compose for orchestration
- PostgreSQL container
- External Neo4j database
- External n8n workflow engine

## Prerequisites

Before running ICorNet, ensure you have:

1. **Docker and Docker Compose** installed
2. **Neo4j database** running and accessible with:
   - URI accessible from the application
   - Database containing SUK nodes with properties: `nome_azienda`, `settore`, `descrizione`
3. **n8n workflow engine** running and accessible with:
   - API access enabled
   - Workflow configured for PDF report generation
   - API key for authentication

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd icornet
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your actual configuration values
   ```

3. **Start the application**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Open your browser to `http://localhost:8000`
   - Login with default admin credentials: `admin` / `admin123`

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@postgres:5432/analytics_db` |
| `NEO4J_URI` | Neo4j database URI | `bolt://host.docker.internal:7687` |
| `NEO4J_USERNAME` | Neo4j username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j password | `password` |
| `N8N_BASE_URL` | n8n base URL | `http://host.docker.internal:5678` |
| `N8N_API_KEY` | n8n API key | `default_key` |
| `N8N_WORKFLOW_ID` | n8n workflow ID for reports | `default_workflow` |
| `SECRET_KEY` | Flask session secret key | `your_secret_key_for_sessions` |

### Neo4j Database Schema

Your Neo4j database should contain nodes with the `:SUK` label and these properties:
- `nome_azienda`: Company name (string)
- `settore`: Industry sector (string)
- `descrizione`: Company description (string, optional)

Example Cypher query to verify data:
```cypher
MATCH (n:SUK) 
WHERE n.nome_azienda IS NOT NULL
RETURN n.nome_azienda, n.settore, n.descrizione
LIMIT 10
