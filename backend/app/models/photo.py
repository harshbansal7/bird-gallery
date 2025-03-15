from datetime import datetime
from bson import ObjectId

class Photo:
    def __init__(self, filename, tags, photo_id=None, fivemerr_data=None, storage=None):
        self.id = photo_id or str(ObjectId())
        self.filename = filename
        self.tags = tags
        self.created_at = datetime.utcnow()
        
        # Support both the new storage format and legacy fivemerr_data format
        self.storage = storage or {}
        
        # Convert legacy fivemerr_data to storage format if provided
        if fivemerr_data and not self.storage:
            self.storage = {
                'service': 'fivemerr',
                'url': fivemerr_data.get('url'),
                'id': fivemerr_data.get('id'),
                'size': fivemerr_data.get('size')
            }
        
        # Ensure dates are properly formatted with time
        if 'date_clicked' in self.tags:
            try:
                # Parse the datetime string (YYYY-MM-DDTHH:mm)
                datetime.strptime(self.tags['date_clicked'], '%Y-%m-%dT%H:%M')
            except ValueError:
                self.tags['date_clicked'] = datetime.utcnow().strftime('%Y-%m-%dT%H:%M')
                
        if 'date_uploaded' not in self.tags:
            self.tags['date_uploaded'] = datetime.utcnow().strftime('%Y-%m-%dT%H:%M')
    
    def to_dict(self):
        result = {
            '_id': self.id,
            'filename': self.filename,
            'tags': self.tags,
            'created_at': self.created_at
        }
        
        # Always include storage info in the consistent format
        if self.storage:
            result['storage'] = self.storage
            
        return result
    
    @staticmethod
    def from_dict(data):
        # Handle data coming from the database in different formats
        
        # Case 1: New format with 'storage' field
        if 'storage' in data:
            return Photo(
                filename=data['filename'],
                tags=data['tags'],
                photo_id=str(data['_id']),
                storage=data['storage']
            )
            
        # Case 2: Legacy format with separate fields
        else:
            # Create a storage object from legacy fields
            storage = {
                'service': 'fivemerr',  # Default to fivemerr for legacy data
                'url': data.get('url'),
                'id': data.get('fivemerr_id'),
                'size': data.get('size')
            }
            
            return Photo(
                filename=data['filename'],
                tags=data['tags'],
                photo_id=str(data['_id']),
                storage=storage
            )