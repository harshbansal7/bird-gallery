from functools import wraps
from flask import jsonify
from firebase_admin.auth import InvalidIdTokenError, ExpiredIdTokenError

def handle_auth_errors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except InvalidIdTokenError:
            return jsonify({'error': 'Invalid authentication token'}), 401
        except ExpiredIdTokenError:
            return jsonify({'error': 'Authentication token has expired'}), 401
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    return decorated_function 