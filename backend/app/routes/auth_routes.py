from flask import Blueprint, jsonify, request
from app import mongo
from app.middleware.auth import require_auth

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_current_user():
    """Get current user's info including role"""
    return jsonify({
        'email': request.user['email'],
        'role': request.user['role'],
        'isAdmin': request.user['role'] == 'admin'
    }), 200 