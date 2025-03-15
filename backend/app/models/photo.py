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
        self.fivemerr_data = fivemerr_data or {}
        
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
        
        # Include storage info if available (new format)
        if self.storage:
            result['storage'] = self.storage
            # For backward compatibility
            if self.storage.get('service') != 'cloudinary':  # Only add these for non-cloudinary services
                result['url'] = self.storage.get('url')
                result['fivemerr_id'] = self.storage.get('id')
                result['size'] = self.storage.get('size')
        # Fallback to legacy format if no storage info
        elif self.fivemerr_data:
            result['url'] = self.fivemerr_data.get('url')
            result['fivemerr_id'] = self.fivemerr_data.get('id')
            result['size'] = self.fivemerr_data.get('size')
            
        return result
    
    @staticmethod
    def from_dict(data):
        # Check if using new storage format
        if 'storage' in data:
            return Photo(
                filename=data['filename'],
                tags=data['tags'],
                photo_id=str(data['_id']),
                storage=data['storage']
            )
        # Otherwise use legacy format
        else:
            return Photo(
                filename=data['filename'],
                tags=data['tags'],
                photo_id=str(data['_id']),
                fivemerr_data={
                    'url': data.get('url'),
                    'id': data.get('fivemerr_id'),
                    'size': data.get('size')
                }
            )