from datetime import datetime
from bson import ObjectId

class Photo:
    def __init__(self, filename, tags, photo_id=None, fivemerr_data=None):
        self.id = photo_id or str(ObjectId())
        self.filename = filename
        self.tags = tags
        self.created_at = datetime.utcnow()
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
        return {
            '_id': self.id,
            'filename': self.filename,
            'tags': self.tags,
            'created_at': self.created_at,
            'url': self.fivemerr_data.get('url'),
            'fivemerr_id': self.fivemerr_data.get('id'),
            'size': self.fivemerr_data.get('size')
        }
    
    @staticmethod
    def from_dict(data):
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