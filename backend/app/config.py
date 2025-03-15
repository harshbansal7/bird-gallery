import os
from dotenv import load_dotenv
import json

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'default-secret-key')
    MONGO_URI = os.getenv('MONGO_URI')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    FIVEMERR_API_KEY = os.getenv('FIVEMERR_API_KEY')
    FIVEMERR_API_URL = 'https://api.fivemerr.com/v1/media/images'
    FIREBASE_CONFIG = json.loads(os.getenv('FIREBASE_CONFIG'))
    
    # Cloudinary settings
    CLOUDINARY_CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME')
    CLOUDINARY_API_KEY = os.getenv('CLOUDINARY_API_KEY')
    CLOUDINARY_API_SECRET = os.getenv('CLOUDINARY_API_SECRET')
    CLOUDINARY_FOLDER = os.getenv('CLOUDINARY_FOLDER', 'bird_gallery')
    
    # Default image service (can be 'fivemerr' or 'cloudinary')
    DEFAULT_IMAGE_SERVICE = os.getenv('DEFAULT_IMAGE_SERVICE', 'cloudinary')