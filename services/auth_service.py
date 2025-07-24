from functools import wraps
from flask import session, jsonify
from models import User
import logging

class AuthService:
    def __init__(self):
        pass
    
    def get_current_user(self):
        """Get the currently logged in user"""
        if 'user_id' not in session:
            return None
        
        try:
            user = User.query.get(session['user_id'])
            return user
        except Exception as e:
            logging.error(f"Error getting current user: {str(e)}")
            return None
    
    def is_authenticated(self):
        """Check if user is authenticated"""
        return 'user_id' in session and self.get_current_user() is not None
    
    def is_admin(self):
        """Check if current user is admin"""
        user = self.get_current_user()
        return user and user.role == 'admin'
    
    def require_auth(self, f):
        """Decorator to require authentication"""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not self.is_authenticated():
                return jsonify({'error': 'Authentication required'}), 401
            return f(*args, **kwargs)
        return decorated_function
    
    def require_admin(self, f):
        """Decorator to require admin role"""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not self.is_authenticated():
                return jsonify({'error': 'Authentication required'}), 401
            
            if not self.is_admin():
                return jsonify({'error': 'Admin access required'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    
    def create_session(self, user):
        """Create a new user session"""
        try:
            session['user_id'] = user.id
            session['username'] = user.username
            session['role'] = user.role
            session.permanent = True
            return True
        except Exception as e:
            logging.error(f"Error creating session: {str(e)}")
            return False
    
    def destroy_session(self):
        """Destroy current user session"""
        try:
            session.clear()
            return True
        except Exception as e:
            logging.error(f"Error destroying session: {str(e)}")
            return False
