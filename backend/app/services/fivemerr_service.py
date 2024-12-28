import requests
from flask import current_app
import mimetypes

class FivemerrService:
    @staticmethod
    def upload_image(file_data):
        """
        Upload image to Fivemerr CDN
        """
        try:
            # Get file mime type
            mime_type = mimetypes.guess_type(file_data.filename)[0]
            
            # Prepare the files payload
            files = {
                'file': (file_data.filename, file_data, mime_type)
            }
            
            # Prepare headers
            headers = {
                'Authorization': current_app.config['FIVEMERR_API_KEY']
            }
            
            # Make the request to Fivemerr
            response = requests.post(
                current_app.config['FIVEMERR_API_URL'],
                files=files,
                headers=headers
            )
            
            # Raise exception for bad responses
            response.raise_for_status()
            
            # Return the response data
            return response.json()
            
        except requests.exceptions.RequestException as e:
            current_app.logger.error(f"Fivemerr upload error: {str(e)}")
            raise Exception("Failed to upload image to Fivemerr") 

    @staticmethod
    def delete_image(image_id):
        """
        Delete image from Fivemerr CDN
        """
        try:
            # Prepare headers
            headers = {
                'Authorization': current_app.config['FIVEMERR_API_KEY']
            }
            
            # Make the delete request to Fivemerr
            response = requests.delete(
                f"{current_app.config['FIVEMERR_API_URL']}/{image_id}",
                headers=headers
            )
            
            # Raise exception for bad responses
            response.raise_for_status()
            
            return True
            
        except requests.exceptions.RequestException as e:
            current_app.logger.error(f"Fivemerr delete error: {str(e)}")
            raise Exception("Failed to delete image from Fivemerr") 