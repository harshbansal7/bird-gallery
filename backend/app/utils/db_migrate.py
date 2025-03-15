from flask import current_app
import logging

def migrate_photo_storage_format():
    """
    Migration utility to convert photos from the old format to the new consistent storage format.
    This ensures all photos use the same structure regardless of the service used (Fivemerr or Cloudinary).
    """
    try:
        from app import mongo
        
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

def run_migrations():
    """
    Run all database migrations
    """
    current_app.logger.info("Starting database migrations...")
    
    # Migration 1: Update photo storage format
    migrate_count = migrate_photo_storage_format()
    current_app.logger.info(f"Migration 1: Updated {migrate_count} photos to new storage format")
    
    # Add future migrations here
    
    current_app.logger.info("All database migrations completed successfully")