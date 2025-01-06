from flask import Blueprint, request, jsonify
from app import mongo
from app.models.tag import Tag
from app.middleware.auth import require_auth, require_admin

tag_bp = Blueprint('tags', __name__)

@tag_bp.route('/', methods=['POST'])
@require_auth
@require_admin  # Only admins can create tags
def create_tag():
    data = request.get_json()
    
    if not data or 'name' not in data:
        return jsonify({'error': 'Name is required'}), 400
    
    # Convert display name to storage name
    tag_name = data['name'].lower().replace(' ', '_')
    
    # Check if tag already exists
    existing_tag = mongo.db.tags.find_one({'name': tag_name})
    if existing_tag:
        return jsonify({'error': 'Tag already exists'}), 400
    
    tag = Tag(name=tag_name, values=data.get('values', []))
    mongo.db.tags.insert_one(tag.to_dict())
    
    return jsonify({'message': 'Tag created successfully'}), 201

@tag_bp.route('/', methods=['GET'])
def get_tags():
    # Debug logging
    tags = list(mongo.db.tags.find({
        'name': {'$nin': ['date_clicked', 'date_uploaded']}
    }))
    # print(f"Retrieved tags: {tags}")
    return jsonify([Tag.from_dict(tag).to_dict() for tag in tags]), 200

@tag_bp.route('/<tag_name>/values', methods=['POST'])
@require_auth
@require_admin  # Only admins can add tag values
def add_tag_value(tag_name):
    data = request.get_json()
    
    if not data or 'value' not in data:
        return jsonify({'error': 'Value is required'}), 400
    
    value = data['value'].strip()
    parent_info = data.get('parent_info')  # This will be None if not provided
    
    if not value:
        return jsonify({'error': 'Value cannot be empty'}), 400
    
    # First check if the tag exists
    tag = mongo.db.tags.find_one({'name': tag_name})
    if not tag:
        return jsonify({'error': f'Tag "{tag_name}" not found'}), 404
    
    # Check if value already exists
    existing_value = any(
        (v['value'] if isinstance(v, dict) else v) == value 
        for v in tag.get('values', [])
    )
    if existing_value:
        return jsonify({'error': 'Value already exists'}), 400
    
    # If parent_info is provided, verify parent values exist
    if parent_info:
        for parent_tag, parent_value in parent_info.items():
            parent = mongo.db.tags.find_one({'name': parent_tag})
            if not parent:
                return jsonify({'error': f'Parent tag "{parent_tag}" not found'}), 404
            
            parent_values = [
                v['value'] if isinstance(v, dict) else v 
                for v in parent.get('values', [])
            ]
            if parent_value not in parent_values:
                return jsonify({'error': f'Parent value "{parent_value}" not found in tag "{parent_tag}"'}), 404
    
    # Create the new value object
    new_value = {'value': value}
    if parent_info:  # Only add parent_info if it exists
        new_value['parent_info'] = parent_info
    
    result = mongo.db.tags.update_one(
        {'name': tag_name},
        {'$addToSet': {'values': new_value}}
    )
    
    return jsonify({'message': 'Value added successfully'}), 200

@tag_bp.route('/<tag_name>/values/filtered', methods=['POST'])
def get_filtered_values(tag_name):
    """Get values filtered by parent values"""
    data = request.get_json()
    parent_filters = data.get('parent_filters', {})
    
    tag = mongo.db.tags.find_one({'name': tag_name})
    if not tag:
        return jsonify({'error': 'Tag not found'}), 404
    
    values = tag.get('values', [])
    
    if parent_filters:
        filtered_values = [
            v['value'] for v in values
            if isinstance(v, dict) and
            all(v.get('parent_info', {}).get(p_tag) == p_value 
                for p_tag, p_value in parent_filters.items())
        ]
    else:
        filtered_values = [v['value'] if isinstance(v, str) else v['value'] 
                         for v in values]
    
    return jsonify(filtered_values), 200

@tag_bp.route('/<tag_name>', methods=['DELETE'])
@require_auth
@require_admin  # Only admins can delete tags
def delete_tag(tag_name):
    # Don't allow deletion of system tags
    if tag_name in ['date_clicked', 'date_uploaded']:
        return jsonify({'error': 'Cannot delete system tags'}), 400
    
    result = mongo.db.tags.delete_one({'name': tag_name})
    
    if result.deleted_count == 0:
        return jsonify({'error': 'Tag not found'}), 404
    
    return jsonify({'message': 'Tag deleted successfully'}), 200

@tag_bp.route('/<tag_name>/values', methods=['DELETE'])
@require_auth
@require_admin  # Only admins can delete tag values
def delete_tag_value(tag_name):
    data = request.get_json()
    
    if not data or 'value' not in data:
        return jsonify({'error': 'Value is required'}), 400
    
    value_to_delete = data['value'].strip()
    
    # First find the tag
    tag = mongo.db.tags.find_one({'name': tag_name})
    if not tag:
        return jsonify({'error': 'Tag not found'}), 404

    # Try both formats one at a time
    # First try removing string format
    result = mongo.db.tags.update_one(
        {'name': tag_name},
        {'$pull': {'values': value_to_delete}}
    )
    
    if result.modified_count == 0:
        # If string format didn't work, try object format
        result = mongo.db.tags.update_one(
            {'name': tag_name},
            {'$pull': {'values': {'value': value_to_delete}}}
        )
    
    if result.matched_count == 0:
        return jsonify({'error': 'Tag not found'}), 404
    
    if result.modified_count == 0:
        return jsonify({'error': 'Value not found'}), 404
    
    return jsonify({'message': 'Value deleted successfully'}), 200 