import os
from flask import Blueprint, current_app, request, jsonify
from werkzeug.utils import secure_filename
from app import mongo
from app.models.photo import Photo
from app.utils.file_handler import allowed_file
from app.services.fivemerr_service import FivemerrService

photo_bp = Blueprint('photos', __name__)

@photo_bp.route('/', methods=['POST'])
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