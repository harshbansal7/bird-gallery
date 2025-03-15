from flask import current_app
import logging
import requests
from io import BytesIO
from app import mongo
from app.services.cloudinary_service import CloudinaryService

def migrate_photo_storage_format():
    """
    Migration utility to convert photos from the old format to the new consistent storage format.
    This ensures all photos use the same structure regardless of the service used (Fivemerr or Cloudinary).
    """
    try:
        # Query for photos with old format (having url, fivemerr_id, and size at the root level)
        old_format_photos = mongo.db.photos.find({
            'url': {'$exists': True},
            'storage': {'$exists': False}
        })
        
        update_count = 0
        for photo in old_format_photos:
            # Create new storage structure
            storage = {
                'service': 'fivemerr',  # Default to fivemerr for legacy data
                'url': photo.get('url'),
                'id': photo.get('fivemerr_id'),
                'size': photo.get('size')
            }
            
            # Update document with new structure
            result = mongo.db.photos.update_one(
                {'_id': photo['_id']},
                {
                    '$set': {'storage': storage},
                    '$unset': {'url': "", 'fivemerr_id': "", 'size': ""}
                }
            )
            
            if result.modified_count > 0:
                update_count += 1
        
        current_app.logger.info(f"Migration complete: Updated {update_count} photos to new storage format")
        return update_count
        
    except Exception as e:
        current_app.logger.error(f"Migration error: {str(e)}")
        raise e

def migrate_fivemerr_to_cloudinary():
    """
    Migration utility to move images from Fivemerr to Cloudinary.
    This will:
    1. Find all photos using Fivemerr
    2. Download each image from Fivemerr
    3. Upload to Cloudinary
    4. Update the storage object while preserving the old URL
    """
    try:
        # Initialize Cloudinary
        CloudinaryService.initialize()
        
        # Find all photos using Fivemerr
        fivemerr_photos = mongo.db.photos.find({
            '$or': [
                {'storage.service': 'fivemerr'},
                # Also check for old format photos
                {
                    'url': {'$exists': True},
                    'storage': {'$exists': False}
                }
            ]
        })
        
        update_count = 0
        error_count = 0
        
        for photo in fivemerr_photos:
            try:
                # Get the Fivemerr URL (either from storage or root level)
                fivemerr_url = photo.get('storage', {}).get('url') or photo.get('url')
                
                if not fivemerr_url:
                    current_app.logger.error(f"No URL found for photo {photo['_id']}")
                    error_count += 1
                    continue

                # Download image from Fivemerr
                response = requests.get(fivemerr_url)
                if response.status_code != 200:
                    current_app.logger.error(f"Failed to download image for photo {photo['_id']}")
                    error_count += 1
                    continue

                # Upload to Cloudinary
                file_data = BytesIO(response.content)
                upload_response = CloudinaryService.upload_image(file_data)

                # Prepare new storage object
                new_storage = {
                    'service': 'cloudinary',
                    'url': upload_response['url'],
                    'id': upload_response['id'],
                    'size': upload_response['size'],
                    'old_url': fivemerr_url  # Preserve the old Fivemerr URL
                }

                # Update the document
                result = mongo.db.photos.update_one(
                    {'_id': photo['_id']},
                    {
                        '$set': {'storage': new_storage},
                        # Remove old fields if they exist
                        '$unset': {'url': "", 'fivemerr_id': "", 'size': ""}
                    }
                )

                if result.modified_count > 0:
                    update_count += 1
                    current_app.logger.info(f"Migrated photo {photo['_id']} to Cloudinary")

            except Exception as e:
                current_app.logger.error(f"Error migrating photo {photo['_id']}: {str(e)}")
                error_count += 1
                continue

        current_app.logger.info(f"Migration complete: Successfully migrated {update_count} photos to Cloudinary")
        if error_count > 0:
            current_app.logger.warning(f"Failed to migrate {error_count} photos")
        
        return {
            'success_count': update_count,
            'error_count': error_count
        }

    except Exception as e:
        current_app.logger.error(f"Migration error: {str(e)}")
        raise e

def run_migrations():
    """
    Run all database migrations
    """
    current_app.logger.info("Starting database migrations...")
    
    # Migration 1: Update photo storage format
    migrate_count = migrate_photo_storage_format()
    current_app.logger.info(f"Migration 1: Updated {migrate_count} photos to new storage format")
    
    # Migration 2: Move images from Fivemerr to Cloudinary
    migrate_result = migrate_fivemerr_to_cloudinary()
    current_app.logger.info(f"Migration 2: Successfully migrated {migrate_result['success_count']} photos to Cloudinary with {migrate_result['error_count']} errors")
    
    # Add future migrations here
    
    current_app.logger.info("All database migrations completed successfully")