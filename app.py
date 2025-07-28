import os
from flask import Flask, jsonify, request, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.middleware.proxy_fix import ProxyFix
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime
import logging
from sqlalchemy import text

# Import models and db from models module
from models import db, User, Report
from services.neo4j_service import Neo4jService
from services.n8n_service import N8nService
from services.auth_service import AuthService

# Import routes
from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.reports import reports_bp
from routes.suk_chat import suk_chat_bp

def create_app():
    app = Flask(__name__, static_folder='static', static_url_path='')

    # Configure app
    app.secret_key = os.environ.get("SESSION_SECRET")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Add proxy fix for Replit
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

    # Initialize extensions
    db.init_app(app)
    # Configure CORS for Replit environment - more secure than wildcard
    allowed_origins = [
        "https://*.replit.app",
        "https://*.repl.co", 
        "http://localhost:3000",
        "http://localhost:5000"
    ]
    if os.environ.get("REPL_SLUG"):
        # Add Replit-specific domains
        repl_slug = os.environ.get("REPL_SLUG")
        repl_owner = os.environ.get("REPL_OWNER", "")
        allowed_origins.extend([
            f"https://{repl_slug}--{repl_owner}.repl.co",
            f"https://{repl_slug}.{repl_owner}.repl.co"
        ])

    CORS(app, supports_credentials=True, origins=allowed_origins)

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

    # Make services available to routes via app config
    app.config['neo4j_service'] = neo4j_service
    app.config['n8n_service'] = n8n_service
    app.config['auth_service'] = auth_service
    app.config['N8N_REPORT_WEBHOOK_URL'] = os.getenv('N8N_REPORT_WEBHOOK_URL', 'http://host.docker.internal:5678/webhook/baf08e2e-8b5b-414e-bde2-109cec9b60ab')

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(suk_chat_bp, url_prefix='/api/suk-chat')

    @app.route('/')
    def index():
        return send_from_directory('static', 'index.html')

    @app.route('/images/<path:filename>')
    def serve_images(filename):
        return send_from_directory('static/images', filename)

    @app.route('/js/<path:filename>')
    def serve_js(filename):
        return send_from_directory('static/js', filename)

    @app.route('/css/<path:filename>')
    def serve_css(filename):
        return send_from_directory('static/css', filename)

    @app.route('/api/health')
    def health_check():
        return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

    @app.errorhandler(404)
    def not_found(error):
        return send_from_directory('static', 'index.html')

    # Create tables and run migrations
    with app.app_context():
        db.create_all()
        run_database_migrations()
        create_admin_user()

    return app

def run_database_migrations():
    """Run database migrations to update schema"""
    try:
        # Add report_type column if it doesn't exist
        db.engine.execute(text("""
            ALTER TABLE reports 
            ADD COLUMN IF NOT EXISTS report_type VARCHAR(50) DEFAULT 'suk'
        """))

        # Update existing records
        db.engine.execute(text("""
            UPDATE reports 
            SET report_type = 'suk' 
            WHERE report_type IS NULL
        """))

        # Create performance indexes
        db.engine.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_reports_user_id_type 
            ON reports(user_id, report_type)
        """))

        db.engine.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_reports_created_at 
            ON reports(created_at DESC)
        """))

        logging.info("Database migrations completed successfully")

    except Exception as e:
        logging.error(f"Database migration error: {str(e)}")

def create_admin_user():
    """Create default admin user if it doesn't exist"""
    admin_user = User.query.filter_by(username='admin').first()
    if not admin_user:
        admin_user = User()
        admin_user.username = 'admin'
        admin_user.email = 'admin@icornet.com'
        admin_user.password_hash = generate_password_hash('admin123')
        admin_user.first_name = 'Admin'
        admin_user.last_name = 'User'
        admin_user.role = 'admin'

        db.session.add(admin_user)
        db.session.commit()
        print("Admin user created: admin/admin123")

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)