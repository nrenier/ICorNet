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

    # Relationships
    reports = db.relationship('Report', backref='user', lazy=True)
    chat_messages = db.relationship('ChatMessage', backref='user', lazy=True)
    chat_history = db.relationship('ChatHistory', backref='user', lazy=True)

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
    company_name = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), nullable=False, default='pending')
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    report_data = db.Column(db.Text)  # JSON string containing the report data

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message_type = db.Column(db.String(20), nullable=False)  # 'user' or 'assistant'
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'message_type': self.message_type,
            'content': self.content,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

class ChatHistory(db.Model):
    __tablename__ = 'chat_history'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    session_id = db.Column(db.String(100), nullable=False)
    question = db.Column(db.Text, nullable=False)
    response = db.Column(db.Text, nullable=False)
    prodotti_soluzioni_esistenti = db.Column(db.Text)  # JSON string
    potenziali_fornitori = db.Column(db.Text)  # JSON string
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'question': self.question,
            'response': self.response,
            'prodotti_soluzioni_esistenti': self.prodotti_soluzioni_esistenti,
            'potenziali_fornitori': self.potenziali_fornitori,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

class Session(db.Model):
    __tablename__ = 'sessions'

    id = db.Column(db.String(255), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    data = db.Column(db.Text)
    expires_at = db.Column(db.DateTime)