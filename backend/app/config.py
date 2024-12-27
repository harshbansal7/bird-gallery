import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'default-secret-key')
    MONGO_URI = os.getenv('MONGO_URI')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    FIVEMERR_API_KEY = os.getenv('FIVEMERR_API_KEY')
    FIVEMERR_API_URL = 'https://api.fivemerr.com/v1/media/images' 