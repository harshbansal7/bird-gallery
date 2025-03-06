import os
from flask import Blueprint, current_app, request, jsonify, Response
from werkzeug.utils import secure_filename
from app import mongo
from app.models.photo import Photo
from app.utils.file_handler import allowed_file
from app.services.fivemerr_service import FivemerrService
from app.middleware.auth import require_auth, require_admin
import requests
from io import BytesIO
from PIL import Image

photo_bp = Blueprint('photos', __name__)

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
        # Upload to Fivemerr
        fivemerr_response = FivemerrService.upload_image(file)
        
        tags = request.form.to_dict()
        
        # Create a new photo document with Fivemerr data
        photo = Photo(
            filename=secure_filename(file.filename), 
            tags=tags,
            fivemerr_data={
                'url': fivemerr_response['url'],
                'id': fivemerr_response['id'],
                'size': fivemerr_response['size']
            }
        )
        
        # Save to MongoDB
        mongo.db.photos.insert_one(photo.to_dict())
        
        return jsonify({
            'message': 'Photo uploaded successfully',
            'photo_id': photo.id,
            'url': fivemerr_response['url']
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

        # Delete from Fivemerr first
        if 'fivemerr_id' in photo:
            try:
                FivemerrService.delete_image(photo['fivemerr_id'])
            except Exception as e:
                current_app.logger.error(f"Failed to delete from Fivemerr: {str(e)}")
                # Continue with database deletion even if Fivemerr fails

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

@photo_bp.route('/optimize', methods=['GET'])
def get_optimized_image():
    """
    Serve optimized images with resizing and quality adjustments
    Required query parameters:
    - url: Original image URL
    Optional query parameters:
    - width: Desired width (default: original)
    - height: Desired height (default: preserve aspect ratio)
    - quality: JPEG quality 1-100 (default: 85)
    - format: Output format (jpg, png, webp) (default: jpg)
    """
    try:
        # Get parameters
        image_url = request.args.get('url')
        if not image_url:
            return jsonify({'error': 'Image URL is required'}), 400
        
        width = request.args.get('width', type=int)
        height = request.args.get('height', type=int)
        quality = request.args.get('quality', 85, type=int)
        output_format = request.args.get('format', 'jpg').lower()
        
        # Validate params
        if quality < 1 or quality > 100:
            quality = 85
            
        if output_format not in ['jpg', 'jpeg', 'png', 'webp']:
            output_format = 'jpg'
            
        # Map format strings to PIL format
        format_mapping = {
            'jpg': 'JPEG',
            'jpeg': 'JPEG',
            'png': 'PNG',
            'webp': 'WEBP'
        }
        pil_format = format_mapping[output_format]
        
        # Fetch the original image
        response = requests.get(image_url, stream=True)
        response.raise_for_status()
        
        # Process the image with PIL
        img = Image.open(BytesIO(response.content))
        
        # Resize if width or height provided
        if width or height:
            # Calculate new dimensions, preserving aspect ratio if only one dimension provided
            orig_width, orig_height = img.size
            
            if width and not height:
                # Preserve aspect ratio
                height = int(orig_height * (width / orig_width))
            elif height and not width:
                # Preserve aspect ratio
                width = int(orig_width * (height / orig_height))
                
            # Perform the resize
            img = img.resize((width, height), Image.LANCZOS)
        
        # Save the optimized image to a BytesIO object
        output = BytesIO()
        img.save(output, format=pil_format, quality=quality, optimize=True)
        output.seek(0)
        
        # Set appropriate content type
        content_types = {
            'JPEG': 'image/jpeg',
            'PNG': 'image/png',
            'WEBP': 'image/webp'
        }
        
        # Set cache control headers for browser caching
        response_headers = {
            'Content-Type': content_types[pil_format],
            'Cache-Control': 'public, max-age=31536000',  # 1 year
            'Vary': 'Accept-Encoding'
        }
        
        return Response(output.getvalue(), headers=response_headers)
        
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Failed to fetch image: {str(e)}")
        return jsonify({'error': 'Failed to fetch image'}), 502
    except Exception as e:
        current_app.logger.error(f"Image optimization error: {str(e)}")
        return jsonify({'error': 'Failed to optimize image'}), 500