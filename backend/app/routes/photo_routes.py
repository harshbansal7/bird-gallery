import os
from flask import Blueprint, current_app, request, jsonify, Response
from werkzeug.utils import secure_filename
from app import mongo
from app.models.photo import Photo
from app.utils.file_handler import allowed_file
from app.services.fivemerr_service import FivemerrService
from app.services.cloudinary_service import CloudinaryService
from app.middleware.auth import require_auth, require_admin
import requests
from io import BytesIO
from PIL import Image, ImageOps
import hashlib
import time
import functools
import os.path
from pathlib import Path
import threading
import mimetypes

photo_bp = Blueprint('photos', __name__)

# Create a simple in-memory cache for recently accessed images
_image_cache = {}
_cache_lock = threading.Lock()
_MAX_CACHE_SIZE = 50  # Maximum number of items in cache

# Cache directory for storing optimized images on disk
CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'cache')
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR, exist_ok=True)

# Function to manage the in-memory cache
def manage_cache():
    with _cache_lock:
        if len(_image_cache) > _MAX_CACHE_SIZE:
            # Remove oldest items (based on access time)
            items = sorted(_image_cache.items(), key=lambda x: x[1]['last_access'])
            # Keep only the most recent half
            for key, _ in items[:len(items)//2]:
                del _image_cache[key]

@photo_bp.route('/', methods=['POST'])
@require_auth
@require_admin  # Only admins can upload
def upload_photo():
    if 'photo' not in request.files:
        return jsonify({'error': 'No photo provided'}), 400
    
    file = request.files['photo']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400
    
    try:
        # Determine which service to use (default from config or from request)
        service = request.form.get('service', current_app.config['DEFAULT_IMAGE_SERVICE'])
        
        # Upload to selected service
        if service == 'cloudinary':
            upload_response = CloudinaryService.upload_image(file)
            storage_service = 'cloudinary'
        else:
            upload_response = FivemerrService.upload_image(file)
            storage_service = 'fivemerr'
        
        tags = request.form.to_dict()
        # Remove service parameter from tags
        if 'service' in tags:
            del tags['service']
        
        # Create a new photo document with consistent storage format
        # Both services return the same format: {'url': url, 'id': id, 'size': size}
        photo = Photo(
            filename=secure_filename(file.filename), 
            tags=tags,
            storage={
                'service': storage_service,
                'url': upload_response['url'],
                'id': upload_response['id'],
                'size': upload_response['size']
            }
        )
        
        # Save to MongoDB
        mongo.db.photos.insert_one(photo.to_dict())
        
        return jsonify({
            'message': 'Photo uploaded successfully',
            'photo_id': photo.id,
            'url': upload_response['url'],
            'service': storage_service
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Upload error: {str(e)}")
        return jsonify({'error': 'Failed to upload photo'}), 500

@photo_bp.route('/', methods=['GET'])
def get_photos():
    photos = list(mongo.db.photos.find())
    return jsonify([Photo.from_dict(photo).to_dict() for photo in photos]), 200 

@photo_bp.route('/search', methods=['POST'])
def search_photos():
    """
    Search photos with multiple tag filters
    Example request body:
    {
        "filters": {
            "bird_name": ["Sparrow", "Eagle"],  # OR condition within same tag
            "city": ["New York"],
            "motion": ["still"]
        },
        "date_range": {                         # Optional date filter
            "start": "2024-01-01",
            "end": "2024-12-31"
        }
    }
    """
    search_criteria = request.get_json()
    
    if not search_criteria:
        return jsonify({'error': 'No search criteria provided'}), 400

    pipeline = []
    match_conditions = []
    
    # Handle tag-based filters
    if 'filters' in search_criteria:
        for tag_name, values in search_criteria['filters'].items():
            if values:
                match_conditions.append({
                    f'tags.{tag_name}': {
                        '$regex': f'^{values[0]}',
                        '$options': 'i'
                    }
                })
    
    # Handle date ranges for both date fields
    if 'date_ranges' in search_criteria:
        for field, date_range in search_criteria['date_ranges'].items():
            date_conditions = {}
            
            if 'start' in date_range and date_range['start']:
                date_conditions['$gte'] = date_range['start']
            if 'end' in date_range and date_range['end']:
                date_conditions['$lte'] = date_range['end']
                
            if date_conditions:
                match_conditions.append({
                    f'tags.{field}': date_conditions
                })
    
    # Add match stage if we have any conditions
    if match_conditions:
        pipeline.append({
            '$match': {'$and': match_conditions}
        })
    
    # Add sorting by date
    pipeline.append({
        '$sort': {'created_at': -1}
    })
    
    try:
        photos = list(mongo.db.photos.aggregate(pipeline))
        return jsonify([Photo.from_dict(photo).to_dict() for photo in photos]), 200
    except Exception as e:
        return jsonify({'error': f'Search failed: {str(e)}'}), 500

@photo_bp.route('/stats', methods=['GET'])
def get_photo_stats():
    """
    Get statistics about photos for each tag value
    Returns counts of photos for each tag value
    """
    try:
        # Get all tags first
        tags = list(mongo.db.tags.find())
        
        stats = {}
        for tag in tags:
            tag_name = tag['name']
            # Count photos for each value of this tag
            pipeline = [
                {
                    '$group': {
                        '_id': f'$tags.{tag_name}',
                        'count': {'$sum': 1}
                    }
                },
                {
                    '$match': {
                        '_id': {'$ne': None}
                    }
                }
            ]
            
            value_counts = list(mongo.db.photos.aggregate(pipeline))
            stats[tag_name] = {
                item['_id']: item['count'] 
                for item in value_counts
            }
        
        return jsonify(stats), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to get stats: {str(e)}'}), 500 

@photo_bp.route('/<photo_id>', methods=['DELETE'])
@require_auth
@require_admin  # Only admins can delete
def delete_photo(photo_id):
    try:
        # Find the photo first
        photo = mongo.db.photos.find_one({'_id': photo_id})
        if not photo:
            return jsonify({'error': 'Photo not found'}), 404

        # Delete from appropriate storage service
        if 'storage' in photo:
            storage_service = photo['storage'].get('service', 'fivemerr')
            storage_id = photo['storage'].get('id')
            
            if storage_id:
                try:
                    if storage_service == 'cloudinary':
                        CloudinaryService.delete_image(storage_id)
                    else:
                        FivemerrService.delete_image(storage_id)
                except Exception as e:
                    current_app.logger.error(f"Failed to delete from {storage_service}: {str(e)}")
                    # Continue with database deletion even if service deletion fails
        # For backward compatibility with old data structure
        elif 'fivemerr_data' in photo and 'id' in photo['fivemerr_data']:
            try:
                FivemerrService.delete_image(photo['fivemerr_data']['id'])
            except Exception as e:
                current_app.logger.error(f"Failed to delete from Fivemerr: {str(e)}")
                
        # Delete from database
        result = mongo.db.photos.delete_one({'_id': photo_id})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Failed to delete photo'}), 500
            
        return jsonify({'message': 'Photo deleted successfully'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Delete error: {str(e)}")
        return jsonify({'error': 'Failed to delete photo'}), 500 

@photo_bp.route('/<photo_id>', methods=['PUT'])
@require_auth
@require_admin  # Only admins can edit
def update_photo(photo_id):
    try:
        # Get the update data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No update data provided'}), 400

        # Find the photo first
        photo = mongo.db.photos.find_one({'_id': photo_id})
        if not photo:
            return jsonify({'error': 'Photo not found'}), 404

        # Update the tags
        result = mongo.db.photos.update_one(
            {'_id': photo_id},
            {'$set': {'tags': data}}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'Photo not found'}), 404
            
        return jsonify({'message': 'Photo updated successfully'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Update error: {str(e)}")
        return jsonify({'error': 'Failed to update photo'}), 500