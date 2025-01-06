from flask import Flask
from flask_pymongo import PyMongo
from app.config import Config
from flask_cors import CORS
import logging
from logging.handlers import RotatingFileHandler
import os

mongo = PyMongo()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize MongoDB
    mongo.init_app(app)
    
    # Initialize Firebase with app context
    from app.middleware.auth import init_firebase
    init_firebase(app)
    
    # Disable strict slashes to handle URLs with or without trailing slash
    app.url_map.strict_slashes = False
    
    # Create indexes for efficient searching
    with app.app_context():
        # Index for tag fields
        mongo.db.photos.create_index([
            ('tags.bird_name', 1),
            ('tags.city', 1),
            ('tags.location', 1),
            ('tags.motion', 1),
            ('tags.catch', 1),
            ('tags.date', 1)
        ])
        # Index for creation date
        mongo.db.photos.create_index('created_at')
    
    # Register blueprints
    from app.routes.photo_routes import photo_bp
    from app.routes.tag_routes import tag_bp
    from app.routes.auth_routes import auth_bp
    
    app.register_blueprint(photo_bp, url_prefix='/api/photos')
    app.register_blueprint(tag_bp, url_prefix='/api/tags')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    # Configure CORS for all routes under /api
    CORS(app, resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",  # Local development
                "https://bird-gallery-ochre.vercel.app"  # Production frontend
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Initialize default tags with display names if not exists
    with app.app_context():
        default_tags = [
            {'name': 'date_clicked', 'display_name': 'Date & Time Clicked', 'values': []},
            {'name': 'date_uploaded', 'display_name': 'Date & Time Uploaded', 'values': []}
        ]
        
        for tag in default_tags:
            mongo.db.tags.update_one(
                {'name': tag['name']},
                {'$setOnInsert': tag},
                upsert=True
            )
    
    # Configure logging
    if not os.path.exists('logs'):
        os.mkdir('logs')
    
    file_handler = RotatingFileHandler(
        'logs/bird_gallery.log', 
        maxBytes=10240, 
        backupCount=10
    )
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('Bird Gallery startup')
    
    return app 