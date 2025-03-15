import cloudinary
import cloudinary.uploader
from flask import current_app

class CloudinaryService:
    @staticmethod
    def initialize():
        """
        Initialize Cloudinary with configuration from the app
        """
        cloudinary.config(
            cloud_name=current_app.config['CLOUDINARY_CLOUD_NAME'],
            api_key=current_app.config['CLOUDINARY_API_KEY'],
            api_secret=current_app.config['CLOUDINARY_API_SECRET'],
            secure=True
        )

    @staticmethod
    def upload_image(file_data):
        """
        Upload image to Cloudinary
        """
        try:
            # Make sure Cloudinary is initialized
            CloudinaryService.initialize()
            
            # Upload to cloudinary
            result = cloudinary.uploader.upload(
                file_data,
                folder=current_app.config.get('CLOUDINARY_FOLDER', 'bird_gallery')
            )
            
            # Return formatted response similar to Fivemerr for compatibility
            return {
                'url': result['secure_url'],
                'id': result['public_id'],
                'size': result.get('bytes', 0)
            }
            
        except Exception as e:
            current_app.logger.error(f"Cloudinary upload error: {str(e)}")
            raise Exception("Failed to upload image to Cloudinary")
    
    @staticmethod
    def delete_image(public_id):
        """
        Delete image from Cloudinary
        """
        try:
            # Make sure Cloudinary is initialized
            CloudinaryService.initialize()
            
            # Delete from cloudinary
            result = cloudinary.uploader.destroy(public_id)
            
            if result.get('result') != 'ok':
                raise Exception(f"Cloudinary deletion failed: {result.get('result')}")
                
            return True
            
        except Exception as e:
            current_app.logger.error(f"Cloudinary delete error: {str(e)}")
            raise Exception("Failed to delete image from Cloudinary")