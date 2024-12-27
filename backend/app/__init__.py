from flask import Flask
from flask_pymongo import PyMongo
from app.config import Config
from flask_cors import CORS

mongo = PyMongo()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Disable strict slashes to handle URLs with or without trailing slash
    app.url_map.strict_slashes = False
    
    # Initialize MongoDB
    mongo.init_app(app)
    
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
    
    app.register_blueprint(photo_bp, url_prefix='/api/photos')
    app.register_blueprint(tag_bp, url_prefix='/api/tags')
    
    # Configure CORS for all routes under /api
    CORS(app, resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",  # Local development
                "https://bird-gallery-ochre.vercel.app"  # Production frontend
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type"]
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
    
    return app 