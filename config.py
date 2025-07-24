import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'your_secret_key_for_sessions')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/analytics_db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Session configuration
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = False  # Allow JavaScript access for development
    SESSION_COOKIE_SAMESITE = None  # Allow cross-origin cookies
    
    # Neo4j configuration
    NEO4J_URI = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
    NEO4J_USERNAME = os.getenv('NEO4J_USERNAME', 'neo4j')
    NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD', 'password')
    
    # n8n configuration
    N8N_BASE_URL = os.getenv('N8N_BASE_URL', 'http://localhost:5678')
    N8N_API_KEY = os.getenv('N8N_API_KEY', 'default_key')
    N8N_WORKFLOW_ID = os.getenv('N8N_WORKFLOW_ID', 'default_workflow')
    
    # Application configuration
    DEBUG = os.getenv('DEBUG', 'true').lower() == 'true'
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
