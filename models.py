from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    role = db.Column(db.String(20), default='user')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship with reports
    reports = db.relationship('Report', backref='user', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Report(db.Model):
    __tablename__ = 'reports'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    company_name = db.Column(db.String(255), nullable=False)
    report_type = db.Column(db.String(50), default='suk')  # 'suk' or 'federterziario'
    status = db.Column(db.String(50), default='pending')
    file_name = db.Column(db.String(255))
    file_path = db.Column(db.String(500))
    workflow_id = db.Column(db.String(100))
    tag = db.Column(db.String(100))  # Tag field for report categorization
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'company_name': self.company_name,
            'report_type': self.report_type,
            'status': self.status,
            'file_name': self.file_name,
            'file_path': self.file_path,
            'workflow_id': self.workflow_id,
            'tag': self.tag,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Session(db.Model):
    __tablename__ = 'sessions'

    id = db.Column(db.String(255), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    data = db.Column(db.Text)
    expires_at = db.Column(db.DateTime)

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(20), nullable=False)  # 'user' or 'assistant'
    user_id = db.Column(db.String(100), nullable=False, default='anonymous')
    chat_type = db.Column(db.String(20), nullable=False, default='SUK')  # 'SUK' or 'STARTUP'
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Note: Removed foreign key relationship to support anonymous users

    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'message_type': self.message_type,
            'user_id': self.user_id
        }