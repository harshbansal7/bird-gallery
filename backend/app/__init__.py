from flask import Flask
from flask_pymongo import PyMongo
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

mongo = PyMongo()

def create_app():
    app = Flask(__name__)
    
    # CORS configuration - allow localhost and ngrok domains
    CORS(app, 
         resources={r"/api/*": {
             "origins": [
                 "http://localhost:5173",
                 "https://*.ngrok-free.app",  # Allow all ngrok subdomains
             ],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True
         }}
    )
    
    # MongoDB configuration
    app.config["MONGO_URI"] = os.getenv("MONGO_URI")
    mongo.init_app(app)
    
    # Register blueprints
    from app.routes import photo_routes, tag_routes
    app.register_blueprint(photo_routes.photo_bp, url_prefix='/api/photos')
    app.register_blueprint(tag_routes.tag_bp, url_prefix='/api/tags')
    
    return app 