from functools import wraps
from flask import request, jsonify, current_app
import firebase_admin
from firebase_admin import credentials, auth
from app import mongo
from .error_handler import handle_auth_errors

_firebase_app = None

def init_firebase(app):
    global _firebase_app
    if not _firebase_app:
        with app.app_context():
            cred = credentials.Certificate(app.config['FIREBASE_CONFIG'])
            _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app

@handle_auth_errors
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'No authorization token provided'}), 401

        try:
            token = auth_header.split('Bearer ')[1]
            decoded_token = auth.verify_id_token(token)
            
            user = mongo.db.users.find_one({'email': decoded_token['email']})
            if not user:
                user = {
                    'email': decoded_token['email'],
                    'role': 'viewer',
                    'user_id': decoded_token['uid']
                }
                mongo.db.users.insert_one(user)
            
            request.user = user
            return f(*args, **kwargs)
        except Exception as e:
            raise e
            
    return decorated_function

@handle_auth_errors
def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(request, 'user') or request.user.get('role') != 'admin':
            return jsonify({
                'error': 'Admin access required',
                'message': 'You do not have permission to perform this action'
            }), 403
        return f(*args, **kwargs)
    return decorated_function 