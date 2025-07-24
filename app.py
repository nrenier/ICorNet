from flask import Flask, jsonify, request, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime
import logging

from config import Config
from models import db, User, Report
from services.neo4j_service import Neo4jService
from services.n8n_service import N8nService
from services.auth_service import AuthService

# Import routes
from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.reports import reports_bp

def create_app():
    app = Flask(__name__, static_folder='static', static_url_path='')
    app.config.from_object(Config)
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, supports_credentials=True, origins=["http://localhost:3000", "http://localhost:5000", "http://127.0.0.1:5000", "*"])
    
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Initialize services
    neo4j_service = Neo4jService(
        uri=os.getenv('NEO4J_URI', 'bolt://localhost:7687'),
        username=os.getenv('NEO4J_USERNAME', 'neo4j'),
        password=os.getenv('NEO4J_PASSWORD', 'password')
    )
    
    n8n_service = N8nService(
        base_url=os.getenv('N8N_BASE_URL', 'http://localhost:5678'),
        api_key=os.getenv('N8N_API_KEY', 'default_key'),
        workflow_id=os.getenv('N8N_WORKFLOW_ID', 'default_workflow')
    )
    
    auth_service = AuthService()
    
    # Make services available to routes
    app.neo4j_service = neo4j_service
    app.n8n_service = n8n_service
    app.auth_service = auth_service
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    
    @app.route('/')
    def index():
        return send_from_directory('static', 'index.html')
    
    @app.route('/api/health')
    def health_check():
        return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})
    
    @app.errorhandler(404)
    def not_found(error):
        return send_from_directory('static', 'index.html')
    
    # Create tables and admin user
    with app.app_context():
        db.create_all()
        create_admin_user()
    
    return app

def create_admin_user():
    """Create default admin user if it doesn't exist"""
    admin_user = User.query.filter_by(username='admin').first()
    if not admin_user:
        admin_user = User(
            username='admin',
            email='admin@icornet.com',
            password_hash=generate_password_hash('admin123'),
            first_name='Admin',
            last_name='User',
            role='admin'
        )
        db.session.add(admin_user)
        db.session.commit()
        print("Admin user created: admin/admin123")

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
